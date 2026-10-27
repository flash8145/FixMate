import { create } from 'zustand'
import { api } from '../services/api.js'
import { useAiStore } from './aiStore.js'

export const useAuthStore = create((set) => ({
  user: null,
  token: sessionStorage.getItem('fixmate_token') || null,
  isBootstrapping: true,

  bootstrap: async () => {
    // Clear legacy localStorage token so every fresh browser start requires login
    localStorage.removeItem('fixmate_token')
    const token = sessionStorage.getItem('fixmate_token')
    if (!token) {
      set({ user: null, token: null, isBootstrapping: false })
      return
    }
    try {
      const res = await api.get('/auth/me')
      set({ user: res.data.data, token, isBootstrapping: false })
    } catch {
      sessionStorage.removeItem('fixmate_token')
      set({ user: null, token: null, isBootstrapping: false })
    }
  },

  login: async ({ identifier, phone, password }) => {
    const res = await api.post('/auth/login', {
      identifier: identifier || phone,
      password,
    })
    const { user, token } = res.data.data
    sessionStorage.setItem('fixmate_token', token)
    localStorage.removeItem('fixmate_token')
    set({ user, token })
    return user
  },

  register: async ({ name, phone, email, password, role }) => {
    const res = await api.post('/auth/register', {
      name,
      phone,
      email,
      password,
      role,
    })
    const { user, token } = res.data.data
    sessionStorage.setItem('fixmate_token', token)
    localStorage.removeItem('fixmate_token')
    set({ user, token })
    return user
  },

  updateUser: (updatedUser) => {
    set((state) => ({ user: { ...state.user, ...updatedUser } }))
  },

  logout: () => {
    sessionStorage.removeItem('fixmate_token')
    localStorage.removeItem('fixmate_token')
    try {
      Object.keys(sessionStorage).forEach((k) => {
        if (k.startsWith('fixmate_ai_chat')) {
          sessionStorage.removeItem(k)
        }
      })
    } catch {
      // ignore
    }
    useAiStore.getState().close()
    useAiStore.getState().setPinnedLocation(null)
    set({ user: null, token: null })
  },
}))
