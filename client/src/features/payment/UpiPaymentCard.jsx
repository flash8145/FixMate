import { useState, useEffect } from 'react'
import QRCode from 'qrcode'
import {
  QrCode,
  Smartphone,
  Copy,
  Check,
  ExternalLink,
  Banknote,
  Loader2,
  CheckCircle2,
  Sparkles,
} from 'lucide-react'

export default function UpiPaymentCard({
  booking,
  onConfirmPayment,
  isConfirming = false,
}) {
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [copiedField, setCopiedField] = useState('')
  const [paymentMode, setPaymentMode] = useState('upi') // 'upi' | 'cash'

  const amount = Number(booking.final?.amount || booking.estimate?.min || 0)
  const payeeName = booking.workerId?.userId?.name || 'FixMate Technician'
  const rawPhone = (booking.workerPhone || booking.workerId?.userId?.phone || '').replace(/\D/g, '').slice(-10)
  // If UPI ID is blank, use pure mobile number without '@upi'
  const upiId = booking.workerUpiId || booking.workerId?.upiId || rawPhone || 'fixmate'
  const transactionNote = `FixMate Booking ${booking.code}`

  // Standard NPCI UPI URI Specification
  const standardUpiUrl =
    booking.upiUrl ||
    `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(
      payeeName,
    )}&am=${amount}&cu=INR&tn=${encodeURIComponent(transactionNote)}`

  // Direct app launcher URIs for mobile devices
  const gpayUrl = `gpay://upi/pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(
    payeeName,
  )}&am=${amount}&cu=INR&tn=${encodeURIComponent(transactionNote)}`
  const phonePeUrl = `phonepe://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(
    payeeName,
  )}&am=${amount}&cu=INR&tn=${encodeURIComponent(transactionNote)}`
  const paytmUrl = `paytmmp://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(
    payeeName,
  )}&am=${amount}&cu=INR&tn=${encodeURIComponent(transactionNote)}`

  // Generate Scannable QR Code Client-side
  useEffect(() => {
    if (!standardUpiUrl) return
    QRCode.toDataURL(standardUpiUrl, {
      width: 280,
      margin: 1,
      color: {
        dark: '#1e293b',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Failed to generate UPI QR:', err))
  }, [standardUpiUrl])

  const copyToClipboard = (text, fieldName) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setCopiedField(fieldName)
        setTimeout(() => setCopiedField(''), 2500)
      })
    }
  }

  const handleConfirm = () => {
    onConfirmPayment(booking._id, paymentMode === 'cash' ? 'CASH' : 'UPI')
  }

  return (
    <div className="rounded-3xl border border-orange-200 bg-gradient-to-b from-orange-50/70 via-white to-orange-50/30 p-5 sm:p-6 shadow-sm space-y-5">
      {/* Top Header & Amount Display */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-orange-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-orange-500 text-white font-black text-xs shadow-xs">
              ₹
            </span>
            <p className="text-xs font-black uppercase tracking-wider text-slate-800">
              Final Bill Payment Due
            </p>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 tracking-tight">
              ₹{amount}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              for Booking #{booking.code}
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-0.5">
            Payee: <strong className="text-slate-900 font-bold">{payeeName}</strong>
          </p>
        </div>

        {/* Payment Method Switcher */}
        <div className="flex items-center rounded-2xl bg-orange-100/70 p-1 border border-orange-200/80 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setPaymentMode('upi')}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              paymentMode === 'upi'
                ? 'bg-white text-orange-950 shadow-xs'
                : 'text-orange-800 hover:text-orange-950'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>UPI / Apps</span>
          </button>
          <button
            type="button"
            onClick={() => setPaymentMode('cash')}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              paymentMode === 'cash'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-orange-800 hover:text-orange-950'
            }`}
          >
            <Banknote className="w-3.5 h-3.5" />
            <span>Cash</span>
          </button>
        </div>
      </div>

      {paymentMode === 'upi' ? (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
          {/* Left Column: Instant Dynamic QR Code */}
          <div className="md:col-span-5 flex flex-col items-center justify-center p-4 rounded-2xl bg-white border border-orange-100 shadow-xs">
            <div className="relative group">
              {qrDataUrl ? (
                <div className="p-2 rounded-2xl bg-white border border-slate-200 shadow-inner">
                  <img
                    src={qrDataUrl}
                    alt="UPI Payment QR Code"
                    className="h-44 w-44 sm:h-48 sm:w-48 object-contain rounded-xl"
                  />
                </div>
              ) : (
                <div className="flex h-48 w-48 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              )}

              <div className="mt-2.5 flex items-center justify-center gap-1.5 text-[11px] font-bold text-slate-700">
                <QrCode className="w-3.5 h-3.5 text-orange-600" />
                <span>Scan with Any UPI App</span>
              </div>
            </div>

            {/* Supported App Icons */}
            <div className="mt-2.5 flex items-center justify-center gap-2 text-[10px] font-bold text-slate-400">
              <span>GPay</span>
              <span>•</span>
              <span>PhonePe</span>
              <span>•</span>
              <span>Paytm</span>
              <span>•</span>
              <span>BHIM</span>
              <span>•</span>
              <span>Cred</span>
            </div>
          </div>

          {/* Right Column: Mobile 1-Tap Launchers & Copy UPI Details */}
          <div className="md:col-span-7 space-y-3.5">
            <div>
              <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-orange-600" />
                <span>Pay Directly on This Device</span>
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Tap below to open your installed payment app with ₹{amount} pre-filled:
              </p>
            </div>

            {/* Primary Action Button: Universal UPI Intent Launcher */}
            <a
              href={standardUpiUrl}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 px-4 py-3 text-xs sm:text-sm font-extrabold text-white shadow-lg shadow-orange-500/25 hover:from-orange-600 hover:to-amber-600 transition-all cursor-pointer active:scale-98"
            >
              <Sparkles className="w-4 h-4" />
              <span>Pay via UPI App (GPay / PhonePe / Paytm)</span>
              <ExternalLink className="w-4 h-4 ml-1 opacity-80" />
            </a>

            {/* Quick App Shortcut Chips */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <a
                href={gpayUrl}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2 text-xs font-bold text-slate-700 shadow-2xs hover:border-emerald-500 hover:bg-emerald-50/50 hover:text-emerald-700 transition-all"
                title="Launch Google Pay"
              >
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>GPay</span>
              </a>

              <a
                href={phonePeUrl}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2 text-xs font-bold text-slate-700 shadow-2xs hover:border-purple-500 hover:bg-purple-50/50 hover:text-purple-700 transition-all"
                title="Launch PhonePe"
              >
                <span className="h-2 w-2 rounded-full bg-purple-600" />
                <span>PhonePe</span>
              </a>

              <a
                href={paytmUrl}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2 text-xs font-bold text-slate-700 shadow-2xs hover:border-blue-500 hover:bg-blue-50/50 hover:text-blue-700 transition-all"
                title="Launch Paytm"
              >
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                <span>Paytm</span>
              </a>
            </div>

            {/* Manual UPI ID Box with One-Click Copy */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-3 shadow-2xs space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <span>Technician Payment Handle:</span>
                <span>Amount: ₹{amount}</span>
              </div>

              <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 border border-slate-100">
                <span className="font-mono text-xs font-black text-slate-900 truncate">
                  {upiId}
                </span>

                <button
                  type="button"
                  onClick={() => copyToClipboard(upiId, 'upiId')}
                  className="flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-[11px] font-bold text-orange-700 border border-orange-200 hover:bg-orange-50 transition-colors shrink-0 cursor-pointer shadow-2xs"
                >
                  {copiedField === 'upiId' ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span className="text-emerald-700 font-bold">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Cash Payment Mode */
        <div className="rounded-2xl bg-white border border-slate-200 p-5 text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <Banknote className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-extrabold text-slate-900">
            Pay ₹{amount} Directly in Cash
          </h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Please hand over the exact cash amount of <strong>₹{amount}</strong> directly to technician <strong>{payeeName}</strong> upon completion.
          </p>
        </div>
      )}

      {/* Confirmation & Completion CTA */}
      <div className="pt-3 border-t border-orange-100 flex items-center justify-end">
        <button
          onClick={handleConfirm}
          disabled={isConfirming}
          className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3 text-xs sm:text-sm font-black text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/25 transition-all cursor-pointer disabled:opacity-50 shrink-0"
        >
          {isConfirming ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Confirming…</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>✓ I Have Paid • Complete Booking</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
