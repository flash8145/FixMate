import OpenAI from 'openai'
import { env } from '../../config/env.js'
import { AI_TOOLS_DEFINITIONS, executeTool } from './ai.tools.js'

const openai = new OpenAI({
  apiKey: env.NVIDIA_API_KEY,
  baseURL: env.NVIDIA_BASE_URL,
})

const SYSTEM_PROMPT = `You are FixMate's intelligent AI Concierge.
FixMate is a hyperlocal blue-collar service marketplace connecting customers with verified nearby service professionals (painters, plumbers, electricians, carpenters, AC technicians).

YOUR RESPONSIBILITIES:
1. Help users discover, compare, and book the best and most affordable service professionals nearby using natural language.
2. Parse time and date expressions (e.g., "12pm 27th oct") into valid ISO-8601 strings based on CURRENT_DATETIME provided below.
3. Guide users on how to use FixMate:
   - Privacy-first: Phone numbers and direct WhatsApp links are revealed once the worker accepts the booking.
   - Pricing: Upfront transparent price range (±15%) based on base rates, visit fee, travel distance, and night/urgency fees.
   - 100% Free UPI & Cash Settlement: Payment is direct peer-to-peer (0% MDR, no gateway commission). Customers scan a dynamic scannable QR code or tap one-click deep links (Google Pay, PhonePe, Paytm, BHIM) on their booking card in "My Bookings" once the final bill is set.
   - Reviews: Customers leave 1-5 star reviews after payment confirmation.

WORKFLOW WHEN A USER ASKS TO FIND & BOOK A WORKER (e.g. "find painter near me and book best and affordable painter for me and set work time and date 12pm 27th oct"):
1. Call "search_workers" with the category (e.g. "painter") and sortBy="best_rated" or "affordable".
2. From the results, pick the top recommended worker matching the user's constraints.
3. Call "get_pricing_estimate" for that worker, category, and scheduled date/time to retrieve upfront estimate.
4. Present the selected worker clearly to the customer with:
   - Worker name, rating (★), visit charge & base rate
   - Distance in km
   - Upfront estimated price range (e.g., ₹450 – ₹580)
   - Appointment date & time
5. Ask for the customer's confirmation, or if they explicitly ordered to book directly, create the booking or present the confirmation card so they can confirm with 1 click.

Always be polite, concise, professional, and helpful. Use friendly Markdown with emojis.
`

export async function runAiAssistant({ user, message, conversationHistory = [], customerLocation }) {
  const currentDateTime = new Date().toISOString()
  const locationSourceType = customerLocation?.source || (customerLocation?.isLiveGps ? 'gps' : 'profile')
  const isPinned = locationSourceType === 'pinned'
  const isGps = locationSourceType === 'gps'

  const userLat = customerLocation?.lat || user?.address?.location?.coordinates?.[1] || 18.5204
  const userLng = customerLocation?.lng || user?.address?.location?.coordinates?.[0] || 73.8567
  const activeCity = customerLocation?.city || (isPinned ? 'Pinned Area' : user?.address?.city) || 'Pune'
  const activeDisplayName = customerLocation?.displayName || customerLocation?.line || activeCity

  const profileCity = user?.address?.city || ''
  const profileLine = user?.address?.line || ''
  const hasProfileAddress = Boolean(profileCity || profileLine)

  const dynamicContext = `
[CURRENT CONTEXT]
- CURRENT_DATETIME: ${currentDateTime}
- Customer Name: ${user.name}
- Customer Phone: ${user.phone}

[LOCATION INFORMATION]
- CURRENT ACTIVE TARGET LOCATION: ${activeDisplayName} (City: ${activeCity})
- LOCATION SOURCE: ${isPinned ? 'PINNED ON MAP by customer' : isGps ? 'LIVE DEVICE GPS' : 'DEFAULT SAVED PROFILE ADDRESS'}
- ACTIVE SEARCH COORDINATES: Lat: ${userLat}, Lng: ${userLng}
${hasProfileAddress ? `- PERMANENT HOME PROFILE ADDRESS: ${profileLine ? profileLine + ', ' : ''}${profileCity}` : ''}

CRITICAL LOCATION RULES:
1. If the user asks "what location currently is", "where am I", or "what is my location", state clearly that their active location is ${activeDisplayName} (${activeCity}) [${isPinned ? 'Pinned on map' : isGps ? 'Live device GPS' : 'Saved Profile Address'}].
2. If they have pinned a location (e.g., Ahmedabad) that differs from their home address in profile (e.g., Sanand), explicitly clarify: "Your active pinned map location is ${activeDisplayName} (${activeCity}), while your permanent profile address is set to ${profileCity}."
3. When searching for workers or booking, ALWAYS use the active target location (${activeCity}, Lat: ${userLat}, Lng: ${userLng}).
`

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT + dynamicContext },
    ...conversationHistory.slice(-10),
    { role: 'user', content: message },
  ]

  let actionCard = null
  let iteration = 0
  const maxIterations = 5

  while (iteration < maxIterations) {
    iteration++

    let response
    try {
      response = await openai.chat.completions.create({
        model: env.NVIDIA_MODEL,
        messages,
        tools: AI_TOOLS_DEFINITIONS,
        tool_choice: 'auto',
        max_tokens: 1024,
        temperature: 0.2,
      })
    } catch (err) {
      console.error('NVIDIA AI Error:', err.message)
      throw new Error(`AI assistant error: ${err.message}`)
    }

    const choice = response.choices?.[0]
    if (!choice) {
      break
    }

    const assistantMsg = choice.message
    messages.push(assistantMsg)

    // If the model called tools, execute them
    if (assistantMsg.tool_calls && assistantMsg.tool_calls.length > 0) {
      for (const toolCall of assistantMsg.tool_calls) {
        const functionName = toolCall.function.name
        let args = {}
        try {
          args = JSON.parse(toolCall.function.arguments || '{}')
        } catch {
          args = {}
        }

        const toolResult = await executeTool(functionName, args, { user, customerLocation })

        // Extract actionCard metadata for UI widgets
        if (functionName === 'create_booking' && toolResult.success && toolResult.booking) {
          actionCard = {
            type: 'BOOKING_CREATED',
            booking: toolResult.booking,
          }
        } else if (functionName === 'get_pricing_estimate' && toolResult.success) {
          // If we calculated an estimate for a worker, track it for confirmation card
          actionCard = {
            type: 'CONFIRM_BOOKING',
            workerId: args.workerId,
            categoryId: args.categoryId,
            scheduledAt: args.scheduledAt,
            estimate: toolResult.estimate,
            urgency: args.urgency || 'NORMAL',
            worker: toolResult.worker || null,
            lat: toolResult.worker?.lat || null,
            lng: toolResult.worker?.lng || null,
          }
        } else if (functionName === 'search_workers' && toolResult.success && toolResult.workers?.length > 0) {
          if (!actionCard) {
            actionCard = {
              type: 'WORKERS_LIST',
              categoryName: toolResult.categoryName,
              categoryId: toolResult.categoryId,
              workers: toolResult.workers.slice(0, 3),
              workerId: toolResult.workers[0].workerId,
              lat: toolResult.workers[0].lat,
              lng: toolResult.workers[0].lng,
            }
          }
        }

        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult),
        })
      }
    } else {
      // Model responded with final text
      const finalContent = assistantMsg.content || ''
      return {
        reply: finalContent,
        actionCard,
        conversationHistory: messages.slice(1), // Exclude system message
      }
    }
  }

  // Fallback if loop ends
  const lastMsg = messages[messages.length - 1]
  return {
    reply: typeof lastMsg.content === 'string' ? lastMsg.content : 'I have processed your request.',
    actionCard,
    conversationHistory: messages.slice(1),
  }
}
