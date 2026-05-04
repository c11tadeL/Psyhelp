import { create } from 'zustand'

let toastId = 0

export const useToastStore = create((set, get) => ({
  toasts: [],
  push: (toast) => {
    const id = ++toastId
    const item = { id, type: 'info', duration: 4000, ...toast }
    set({ toasts: [...get().toasts, item] })
    if (item.duration > 0) {
      setTimeout(() => get().remove(id), item.duration)
    }
    return id
  },
  remove: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}))

export const toast = {
  success: (message) => useToastStore.getState().push({ type: 'success', message }),
  error: (message) => useToastStore.getState().push({ type: 'error', message }),
  info: (message) => useToastStore.getState().push({ type: 'info', message }),
}
