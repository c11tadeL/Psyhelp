import { create } from 'zustand'
import { authApi, meApi } from '../api/endpoints'
import { tokenStorage, setAuthFailHandler } from '../api/client'

export const useAuthStore = create((set, get) => ({
  user: null,
  loading: true,

  init: async () => {
    setAuthFailHandler(() => {
      set({ user: null, loading: false })
    })

    if (!tokenStorage.getAccess()) {
      set({ loading: false })
      return
    }
    try {
      const user = await meApi.get()
      set({ user, loading: false })
    } catch {
      tokenStorage.clear()
      set({ user: null, loading: false })
    }
  },

  login: async (credentials) => {
    const { user } = await authApi.login(credentials)
    set({ user })
    return user
  },

  register: async (data) => {
    return authApi.register(data)
  },

  logout: async () => {
    try {
      await authApi.logout()
    } catch {}
    set({ user: null })
  },

  updateUser: (patch) => {
    set({ user: { ...get().user, ...patch } })
  },
}))

export const useIsAuthenticated = () => useAuthStore((s) => !!s.user)
export const useIsModerator = () =>
  useAuthStore((s) => s.user?.role === 'moderator')
