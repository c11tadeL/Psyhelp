import { api, tokenStorage } from './client'

export const authApi = {
  register: (data) => api.post('/auth/register', data).then((r) => r.data),
  login: (data) =>
    api.post('/auth/login', data).then((r) => {
      tokenStorage.set(r.data)
      return r.data
    }),
  logout: () => {
    const refresh = tokenStorage.getRefresh()
    tokenStorage.clear()
    if (refresh) return api.post('/auth/logout', { refresh_token: refresh })
  },
}

export const meApi = {
  get: () => api.get('/me').then((r) => r.data),
  update: (data) => api.patch('/me', data).then((r) => r.data),
  sessions: () => api.get('/me/sessions').then((r) => r.data),
  revokeSession: (id) => api.delete(`/me/sessions/${id}`),
}

export const categoriesApi = {
  list: () => api.get('/categories').then((r) => r.data),
}

export const postsApi = {
  list: (params) => api.get('/posts', { params }).then((r) => r.data),
  get: (id) => api.get(`/posts/${id}`).then((r) => r.data),
  create: (data) => api.post('/posts', data).then((r) => r.data),
  update: (id, data) => api.patch(`/posts/${id}`, data).then((r) => r.data),
  remove: (id) => api.delete(`/posts/${id}`),
  myList: () => api.get('/posts/me/list').then((r) => r.data),
}

export const commentsApi = {
  list: (postId) => api.get(`/posts/${postId}/comments`).then((r) => r.data),
  create: (postId, data) =>
    api.post(`/posts/${postId}/comments`, data).then((r) => r.data),
  remove: (postId, id) => api.delete(`/posts/${postId}/comments/${id}`),
}

export const diaryApi = {
  list: (params) => api.get('/me/diary', { params }).then((r) => r.data),
  analytics: (params) =>
    api.get('/me/diary/analytics', { params }).then((r) => r.data),
  upsert: (data) => api.put('/me/diary', data).then((r) => r.data),
  remove: (id) => api.delete(`/me/diary/${id}`),
}

export const chatApi = {
  conversations: () =>
    api.get('/me/chat/conversations').then((r) => r.data),
  messages: (conversationId) =>
    api.get(`/me/chat/${conversationId}`).then((r) => r.data),
  send: (data) => api.post('/me/chat', data).then((r) => r.data),
}

export const notificationsApi = {
  list: () => api.get('/me/notifications').then((r) => r.data),
  unreadCount: () =>
    api.get('/me/notifications/unread-count').then((r) => r.data),
  markRead: () => api.post('/me/notifications/mark-read').then((r) => r.data),
}

export const complaintsApi = {
  create: (data) => api.post('/complaints', data).then((r) => r.data),
  myList: () => api.get('/complaints/me').then((r) => r.data),
}

export const moderationApi = {
  dashboard: () => api.get('/moderation/dashboard').then((r) => r.data),
  complaints: (params) =>
    api.get('/moderation/complaints', { params }).then((r) => r.data),
  resolve: (id, data) =>
    api.post(`/moderation/complaints/${id}/resolve`, data).then((r) => r.data),
}
