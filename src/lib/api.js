const defaultApiHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'localhost'
  : window.location.hostname
const defaultApiBasePath = import.meta.env.DEV ? '/PresenPro' : ''
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || `${window.location.protocol}//${defaultApiHost}${defaultApiBasePath}/backend/public/index.php`
const tokenKey = 'presenpro.auth.token'
const userKey = 'presenpro.auth.user'

function endpoint(path) {
  return `${API_BASE_URL}?route=${path}`
}

export function getStoredAuth() {
  const token = window.localStorage.getItem(tokenKey)
  const storedUser = window.localStorage.getItem(userKey)
  let user = null

  // Sesi lama bisa berisi string "undefined" atau JSON yang tidak lengkap.
  // Abaikan dan bersihkan agar error storage tidak membuat seluruh aplikasi blank.
  if (storedUser && storedUser !== 'undefined' && storedUser !== 'null') {
    try {
      user = JSON.parse(storedUser)
    } catch {
      window.localStorage.removeItem(userKey)
      window.localStorage.removeItem(tokenKey)
    }
  }

  return {
    token: user ? token : null,
    user,
  }
}

export function storeAuth({ token, user }) {
  window.localStorage.setItem(tokenKey, token)
  window.localStorage.setItem(userKey, JSON.stringify(user))
}

export function clearAuth() {
  window.localStorage.removeItem(tokenKey)
  window.localStorage.removeItem(userKey)
}

export async function apiFetch(path, options = {}) {
  const { token } = getStoredAuth()
  const headers = {
    Accept: 'application/json',
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(token ? { 'X-Auth-Token': token } : {}),
    ...options.headers,
  }

  const response = await fetch(endpoint(path), {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.message || 'Request gagal diproses.')
  }

  return data
}

export const authApi = {
  login: (payload) => apiFetch('/auth/login', { method: 'POST', body: payload }),
  register: (payload) => apiFetch('/auth/register', { method: 'POST', body: payload }),
  me: () => apiFetch('/auth/me'),
}

export const eventsApi = {
  list: () => apiFetch('/events'),
  create: (payload) => apiFetch('/events', { method: 'POST', body: payload }),
  detail: (id) => apiFetch(`/events/${id}`),
  update: (eventSlug, payload) => apiFetch(`/events/${eventSlug}`, { method: 'PATCH', body: payload }),
  remove: (eventSlug) => apiFetch(`/events/${eventSlug}`, { method: 'DELETE' }),
  createMeeting: (eventSlug, payload) => apiFetch(`/events/${eventSlug}/meetings`, { method: 'POST', body: payload }),
  updateMeeting: (eventSlug, meetingId, payload) => apiFetch(`/events/${eventSlug}/meetings/${meetingId}`, { method: 'PATCH', body: payload }),
  removeMeeting: (eventSlug, meetingId) => apiFetch(`/events/${eventSlug}/meetings/${meetingId}`, { method: 'DELETE' }),
  requestPermit: (eventSlug, meetingId, note) => apiFetch(`/events/${eventSlug}/meetings/${meetingId}/permit`, { method: 'POST', body: { note } }),
  meetingAttendance: (eventSlug, meetingId) => apiFetch(`/events/${eventSlug}/meetings/${meetingId}/attendance`),
  startMeetingSession: (eventSlug, meetingId) => apiFetch(`/events/${eventSlug}/meetings/${meetingId}/sessions/start`, { method: 'POST' }),
  endMeetingSession: (eventSlug, meetingId) => apiFetch(`/events/${eventSlug}/meetings/${meetingId}/sessions/end`, { method: 'POST' }),
  scanMeeting: (eventSlug, meetingId, qrPayload) => apiFetch(`/events/${eventSlug}/meetings/${meetingId}/scan`, { method: 'POST', body: { qrPayload } }),
  scanSelfMeeting: (eventSlug, meetingId) => apiFetch(`/events/${eventSlug}/meetings/${meetingId}/scan-self`, { method: 'POST' }),
}

export const dashboardApi = {
  get: () => apiFetch('/dashboard'),
}

export const membersApi = {
  list: () => apiFetch('/members'),
  search: (q) => apiFetch(`/members/search&q=${encodeURIComponent(q)}`),
  toggleStatus: (id) => apiFetch(`/members/${id}/toggle-status`, { method: 'PATCH' }),
  toggleApproval: (id, action) => apiFetch(`/members/${id}/toggle-approval`, { method: 'PATCH', body: { action } }),
  create: (data) => apiFetch('/members', { method: 'POST', body: data }),
}

export const usersApi = {
  list: () => apiFetch('/users'),
  create: (data) => apiFetch('/users', { method: 'POST', body: data }),
  toggleStatus: (id) => apiFetch(`/users/${id}/toggle-status`, { method: 'PATCH' }),
  toggleApproval: (id, action) => apiFetch(`/users/${id}/toggle-approval`, { method: 'PATCH', body: { action } }),
  changeRole: (id, role) => apiFetch(`/users/${id}/role`, { method: 'PATCH', body: { role } }),
  remove: (id) => apiFetch(`/users/${id}`, { method: 'DELETE' }),
  resetPassword: (id) => apiFetch(`/users/${id}/reset-password`, { method: 'PATCH' }),
  getProfile: () => apiFetch('/profile'),
  updateProfile: (data) => apiFetch('/profile', { method: 'PATCH', body: data }),
}

export const divisionTemplatesApi = {
  list: () => apiFetch('/division-templates'),
  create: (name) => apiFetch('/division-templates', { method: 'POST', body: { name } }),
  remove: (id) => apiFetch(`/division-templates/${id}`, { method: 'DELETE' }),
}

export const reportsApi = {
  attendance: ({ event, meeting } = {}) => {
    const params = new URLSearchParams()
    if (event) params.set('event', event)
    if (meeting) params.set('meeting', meeting)
    const qs = params.toString()
    return apiFetch(`/reports/attendance${qs ? '&' + qs : ''}`)
  },
}
