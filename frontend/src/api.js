const base = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')

export async function api(path, { token, method = 'GET', body, signal } = {}) {
  let response
  try {
    response = await fetch(`${base}${path}`, {
      method, signal,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new Error('Cannot reach the server. Please try again.', { cause: error })
  }
  if (response.status === 204) return null
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(data.error || `Request failed (${response.status})`)
    error.status = response.status
    throw error
  }
  return data
}

export const warsawDate = value => new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Europe/Warsaw', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date(value))

export const warsawTime = value => new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Warsaw', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
}).format(new Date(value))

export const statusLabel = status => ({ active: 'Confirmed', cancelled: 'Cancelled', open: 'Available', closed: 'Closed' })[status] || status
