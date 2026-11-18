export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/$/, '')

async function request(path, options = {}) {
  const token = localStorage.getItem('campusfix_token')
  const headers = new Headers(options.headers || {})

  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers })
  } catch {
    throw new Error('Cannot connect to the CampusFix server. Check that the Flask backend is running.')
  }

  let data = null
  const contentType = response.headers.get('content-type')
  if (contentType?.includes('application/json')) {
    data = await response.json().catch(() => null)
  }

  if (!response.ok) {
    const message = data?.message || data?.error || `Request failed (${response.status}).`
    throw new Error(message)
  }

  return data
}

export function loginStudent(payload) {
  return request('/api/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function registerStudent(payload) {
  return request('/api/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function submitComplaint(payload) {
  return request('/api/complaints', {
    method: 'POST',
    body: payload,
  })
}

export function getComplaints() {
  return request('/api/complaints')
}
