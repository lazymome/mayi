import { useEffect, useState } from 'react'

import LocalImageManager from '../../features/canvas/services/localImageManager'

const ASSET_BUNDLE_META_KEY = 'tapnow_asset_bundle_meta'

const getAssetBundleFallbackById = (id) => {
  if (!id || typeof localStorage === 'undefined') return ''
  try {
    const raw = localStorage.getItem(ASSET_BUNDLE_META_KEY)
    const meta = raw ? JSON.parse(raw) : null
    return meta?.idToOriginal?.[id] || ''
  } catch (e) {
    return ''
  }
}

export default function ResolvedVideo({ src, className, onError, onLoadedMetadata, ...props }) {
  const [resolvedSrc, setResolvedSrc] = useState('')

  useEffect(() => {
    let active = true
    setResolvedSrc('')
    if (!src) {
      return () => {
        active = false
      }
    }
    if (LocalImageManager.isImageId(src)) {
      ;(async () => {
        const dataUrl = await LocalImageManager.getImage(src)
        if (!active) return
        if (dataUrl) {
          setResolvedSrc(dataUrl)
        } else {
          const fallback = getAssetBundleFallbackById(src)
          setResolvedSrc(fallback || '')
        }
      })()
      return () => {
        active = false
      }
    }
    setResolvedSrc(src)
    return () => {
      active = false
    }
  }, [src])

  if (!resolvedSrc) return null

  return (
    <video
      src={resolvedSrc}
      className={className}
      onError={onError}
      onLoadedMetadata={onLoadedMetadata}
      {...props}
    />
  )
}
