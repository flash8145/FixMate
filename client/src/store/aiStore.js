import { create } from 'zustand'

export const useAiStore = create((set) => ({
  isOpen: false,
  initialPrompt: '',
  pinnedLocation: null, // { lat, lng, label, city, line }
  focusedWorker: null, // { workerId, lat, lng, categoryId, worker, openDrawer: boolean }
  setPinnedLocation: (loc) => set({ pinnedLocation: loc }),
  setFocusedWorker: (fw) => set({ focusedWorker: fw }),
  clearFocusedWorker: () => set({ focusedWorker: null }),
  openWithPrompt: (prompt) => set({ isOpen: true, initialPrompt: prompt }),
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
  clearInitialPrompt: () => set({ initialPrompt: '' }),
}))
