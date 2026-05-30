const DEFAULT_LOCAL_SERVER_URL = 'http://127.0.0.1:9527'

const getLocalServerUrl = async () => {
  try {
    const env = await window.tapnowDesktop?.getEnv?.()
    return env?.localServerUrl || DEFAULT_LOCAL_SERVER_URL
  } catch {
    return DEFAULT_LOCAL_SERVER_URL
  }
}

const postJson = async (path, body) => {
  const baseUrl = await getLocalServerUrl()
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok || data.ok === false || data.success === false) {
    throw new Error(data.error || `Request failed: ${response.status}`)
  }
  return data
}

export const scanAssetDirectory = ({ directory, recursive = true, generateThumbnails = true } = {}) => (
  postJson('/media/assets/scan', { directory, recursive, generateThumbnails })
)

export const createMediaJob = ({ type, payload } = {}) => (
  postJson('/media/jobs', { type, payload })
)

export const getMediaFileUrl = (filePath) => (
  filePath ? `${DEFAULT_LOCAL_SERVER_URL}/media/file?path=${encodeURIComponent(filePath)}` : ''
)
