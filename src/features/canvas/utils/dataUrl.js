export const normalizeBase64Payload = (value) => {
  if (!value) return ''
  let cleaned = value.replace(/\s+/g, '')
  if (/%[0-9A-Fa-f]{2}/.test(cleaned)) {
    try {
      cleaned = decodeURIComponent(cleaned)
    } catch (e) {
      // Keep original when decode fails.
    }
  }
  cleaned = cleaned.replace(/-/g, '+').replace(/_/g, '/')
  cleaned = cleaned.replace(/[^A-Za-z0-9+/=]/g, '')
  const pad = cleaned.length % 4
  if (pad) cleaned += '='.repeat(4 - pad)
  return cleaned
}

export const normalizeDataUrl = (value) => {
  if (!value || typeof value !== 'string') return value
  if (!value.startsWith('data:')) return value
  const cleaned = value.replace(/\s+/g, '')
  const match = cleaned.match(/^data:([^;,]+)(;base64)?,(.*)$/i)
  if (!match) return cleaned
  const mime = match[1] || 'application/octet-stream'
  const isBase64 = !!match[2]
  if (!isBase64) return cleaned
  const payload = normalizeBase64Payload(match[3] || '')
  if (!payload) return cleaned
  return `data:${mime};base64,${payload}`
}

export const dataUrlToBlob = (dataUrl) => {
  const normalized = normalizeDataUrl(dataUrl)
  const match = normalized.match(/^data:([^;,]+)(;base64)?,(.*)$/i)
  if (!match) return null
  const mime = match[1] || 'application/octet-stream'
  const isBase64 = !!match[2]
  let data = match[3] || ''
  if (!isBase64) {
    try {
      return new Blob([decodeURIComponent(data)], { type: mime })
    } catch (e) {
      return new Blob([data], { type: mime })
    }
  }
  data = normalizeBase64Payload(data)
  let binary = ''
  try {
    binary = atob(data)
  } catch (e) {
    return null
  }
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new Blob([bytes], { type: mime })
}
