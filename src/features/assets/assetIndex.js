export const ASSET_TYPES = {
  IMAGE: 'image',
  VIDEO: 'video',
  AUDIO: 'audio',
  SUBTITLE: 'subtitle',
  PROJECT: 'project',
}

const EXTENSION_TYPE_MAP = {
  jpg: ASSET_TYPES.IMAGE,
  jpeg: ASSET_TYPES.IMAGE,
  png: ASSET_TYPES.IMAGE,
  webp: ASSET_TYPES.IMAGE,
  gif: ASSET_TYPES.IMAGE,
  mp4: ASSET_TYPES.VIDEO,
  mov: ASSET_TYPES.VIDEO,
  webm: ASSET_TYPES.VIDEO,
  mkv: ASSET_TYPES.VIDEO,
  mp3: ASSET_TYPES.AUDIO,
  wav: ASSET_TYPES.AUDIO,
  m4a: ASSET_TYPES.AUDIO,
  srt: ASSET_TYPES.SUBTITLE,
  vtt: ASSET_TYPES.SUBTITLE,
  ass: ASSET_TYPES.SUBTITLE,
}

export const inferAssetType = (filename = '') => {
  const extension = String(filename).split('.').pop()?.toLowerCase()
  return EXTENSION_TYPE_MAP[extension] || ASSET_TYPES.PROJECT
}

export const createAssetRecord = ({ path, name, type, hash, thumbnailPath = '', metadata = {}, size, mtime, id } = {}) => {
  const now = new Date().toISOString()
  const filename = name || String(path || '').split(/[\\/]/).pop() || 'Untitled Asset'
  return {
    id: id || `asset_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type: type || inferAssetType(filename),
    name: filename,
    path: path || '',
    hash: hash || '',
    thumbnailPath,
    createdAt: now,
    updatedAt: now,
    metadata: {
      ...(size != null ? { size } : {}),
      ...(mtime != null ? { mtime } : {}),
      ...metadata,
    },
  }
}

export const createEmptyAssetIndex = () => ({
  version: '1.0.0',
  updatedAt: new Date().toISOString(),
  assets: [],
})

export const addAssetToIndex = (index, asset) => {
  const next = index || createEmptyAssetIndex()
  const record = asset.id ? asset : createAssetRecord(asset)
  const existing = next.assets || []
  const deduped = record.hash
    ? existing.filter((item) => item.hash !== record.hash)
    : existing.filter((item) => item.path !== record.path)
  return {
    ...next,
    updatedAt: new Date().toISOString(),
    assets: [...deduped, record],
  }
}
