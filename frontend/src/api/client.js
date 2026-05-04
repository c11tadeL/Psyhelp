import axios from 'axios'

const TOKEN_KEY = 'psyhelp_access'
const REFRESH_KEY = 'psyhelp_refresh'

export const tokenStorage = {
  getAccess: () => localStorage.getItem(TOKEN_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_KEY),
  set: ({ access_token, refresh_token }) => {
    if (access_token) localStorage.setItem(TOKEN_KEY, access_token)
    if (refresh_token) localStorage.setItem(REFRESH_KEY, refresh_token)
  },
  clear: () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_KEY)
  },
}

export const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = tokenStorage.getAccess()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let refreshPromise = null
let onAuthFail = null

export const setAuthFailHandler = (handler) => {
  onAuthFail = handler
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    const status = error.response?.status

    if (status !== 401 || original._retry || original.url?.includes('/auth/')) {
      return Promise.reject(error)
    }

    original._retry = true

    if (!refreshPromise) {
      const refresh = tokenStorage.getRefresh()
      if (!refresh) {
        onAuthFail?.()
        return Promise.reject(error)
      }
      refreshPromise = axios
        .post('/api/auth/refresh', { refresh_token: refresh })
        .then((res) => {
          tokenStorage.set({ access_token: res.data.access_token })
          return res.data.access_token
        })
        .catch((err) => {
          tokenStorage.clear()
          onAuthFail?.()
          throw err
        })
        .finally(() => {
          refreshPromise = null
        })
    }

    try {
      const newToken = await refreshPromise
      original.headers.Authorization = `Bearer ${newToken}`
      return api(original)
    } catch {
      return Promise.reject(error)
    }
  }
)
