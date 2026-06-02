export const PANORAMA_ASPECT_OPTIONS = ['16:9', '9:16', '1:1', '2.35:1']
export const PANORAMA_FOCAL_PRESETS = [14, 24, 35, 50, 85]

export const getDefaultPanoramaCamera = () => ({
  yaw: 0,
  pitch: 0,
  fov: 65,
  focalLength: 28,
  aspectRatio: '16:9',
  width: 1280,
  height: 720,
})

export const normalizePanoramaCamera = (camera = {}) => {
  const defaults = getDefaultPanoramaCamera()
  const next = { ...defaults, ...(camera || {}) }
  next.yaw = Number.isFinite(Number(next.yaw)) ? Number(next.yaw) : defaults.yaw
  next.pitch = Number.isFinite(Number(next.pitch))
    ? Math.max(-85, Math.min(85, Number(next.pitch)))
    : defaults.pitch
  next.fov = Number.isFinite(Number(next.fov))
    ? Math.max(20, Math.min(120, Number(next.fov)))
    : defaults.fov
  next.focalLength = Number.isFinite(Number(next.focalLength))
    ? Math.max(8, Math.min(200, Number(next.focalLength)))
    : defaults.focalLength
  next.aspectRatio = PANORAMA_ASPECT_OPTIONS.includes(next.aspectRatio)
    ? next.aspectRatio
    : defaults.aspectRatio
  next.width = Number.isFinite(Number(next.width))
    ? Math.max(320, Math.min(4096, Math.round(Number(next.width))))
    : defaults.width
  next.height = Number.isFinite(Number(next.height))
    ? Math.max(320, Math.min(4096, Math.round(Number(next.height))))
    : defaults.height
  return next
}

export const getPanoramaAspectValue = (ratio = '16:9') => {
  if (ratio === '2.35:1') return 2.35
  const [w, h] = String(ratio).split(':').map(Number)
  return w && h ? w / h : 16 / 9
}

export const getPanoramaCameraSize = (camera = {}) => {
  const normalized = normalizePanoramaCamera(camera)
  const aspect = getPanoramaAspectValue(normalized.aspectRatio)
  let width = normalized.width
  let height = Math.round(width / aspect)
  if (height < 320) {
    height = 320
    width = Math.round(height * aspect)
  }
  return { width, height }
}

export const focalLengthToFov = (focalLength) => {
  const focal = Number(focalLength) || 28
  return Math.round((2 * Math.atan(36 / (2 * focal)) * 180) / Math.PI)
}

export const createPanoramaBackground = (url, name = '') => ({
  id: `pano_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  name: name || `全景背景 ${new Date().toLocaleTimeString()}`,
  imageUrl: url,
  projection: 'equirectangular',
  source: 'uploaded',
  createdAt: Date.now(),
})

export const getShotPanoramaStage = (shot = {}) => {
  const stage = shot.stage || {}

  return {
    backgroundId: '',
    backgroundUrl: '',
    captureUrl: '',
    captureUpdatedAt: null,
    ...stage,
    camera: normalizePanoramaCamera(stage.camera || shot.cameraParams),
    redraw: {
      status: 'idle',
      outputImages: [],
      outputUrl: '',
      ...(stage.redraw || {}),
    },
  }
}

export const getPanoramaPreviewStyle = (imageUrl, camera = {}) => {
  const normalized = normalizePanoramaCamera(camera)
  const cropW = Math.max(12, Math.min(85, normalized.fov))
  const cropH = Math.max(12, Math.min(85, normalized.fov * 0.56))
  const x = (((normalized.yaw % 360) + 360) % 360) / 360
  const y = (90 - normalized.pitch) / 180
  return {
    backgroundImage: imageUrl ? `url(${imageUrl})` : undefined,
    backgroundSize: `${10000 / cropW}% ${10000 / cropH}%`,
    backgroundPosition: `${Math.max(0, Math.min(100, x * 100))}% ${Math.max(
      0,
      Math.min(100, y * 100)
    )}%`,
  }
}

export const renderEquirectangularFrame = async (imageUrl, camera = {}) => {
  const normalized = normalizePanoramaCamera(camera)
  const { width, height } = getPanoramaCameraSize(normalized)
  const image = await new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('全景背景加载失败'))
    img.src = imageUrl
  })
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('无法创建截图画布')

  const yawCenter = ((((normalized.yaw % 360) + 360) % 360) / 360) * image.width
  const pitchCenter = ((90 - normalized.pitch) / 180) * image.height
  const cropW = Math.max(1, (normalized.fov / 360) * image.width)
  const cropH = Math.max(1, (normalized.fov / 180) * image.height)
  const sx = yawCenter - cropW / 2
  const sy = Math.max(0, Math.min(image.height - cropH, pitchCenter - cropH / 2))

  const drawPart = (sourceX, sourceW, destX, destW) => {
    ctx.drawImage(image, sourceX, sy, sourceW, cropH, destX, 0, destW, height)
  }

  if (sx < 0) {
    const leftW = -sx
    const rightW = cropW - leftW
    drawPart(image.width - leftW, leftW, 0, (leftW / cropW) * width)
    drawPart(0, rightW, (leftW / cropW) * width, (rightW / cropW) * width)
  } else if (sx + cropW > image.width) {
    const rightW = image.width - sx
    const leftW = cropW - rightW
    drawPart(sx, rightW, 0, (rightW / cropW) * width)
    drawPart(0, leftW, (rightW / cropW) * width, (leftW / cropW) * width)
  } else {
    drawPart(sx, cropW, 0, width)
  }

  return canvas.toDataURL('image/png')
}
