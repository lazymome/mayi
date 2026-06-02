import { useEffect, useRef, useState } from 'react'

import LocalImageManager from '../../features/canvas/services/localImageManager'
import { dataUrlToBlob, normalizeDataUrl } from '../../features/canvas/utils/dataUrl'

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

// Converts large data URLs and IndexedDB image ids into renderable image URLs.
export default function LazyBase64Image({ src, className, alt, onError, onLoad, ...props }) {
  const [blobUrl, setBlobUrl] = useState(null)
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)
  const blobUrlRef = useRef(null)

  useEffect(() => {
    let active = true
    if (blobUrlRef.current && blobUrlRef.current.startsWith('blob:')) {
      URL.revokeObjectURL(blobUrlRef.current)
    }
    blobUrlRef.current = null
    setError(false)
    setBlobUrl(null)

    if (!src || src.startsWith('blob:') || src.startsWith('http://') || src.startsWith('https://')) {
      if (active) {
        setBlobUrl(src)
        setLoading(false)
      }
      return () => {
        active = false
      }
    }

    if (LocalImageManager.isImageId(src)) {
      setLoading(true)
      const resolveFromIDB = async () => {
        try {
          const url = await LocalImageManager.getImage(src)
          if (!active) return
          if (url) {
            blobUrlRef.current = url
            setBlobUrl(url)
          } else {
            const fallback = getAssetBundleFallbackById(src)
            if (fallback) {
              blobUrlRef.current = fallback
              setBlobUrl(fallback)
            } else {
              console.warn(`[LazyBase64Image] Image not found in IDB: ${src}`)
              setError(true)
            }
          }
        } catch (err) {
          if (!active) return
          console.error('[LazyBase64Image] IDB resolve failed:', err)
          setError(true)
        }
        if (active) setLoading(false)
      }
      resolveFromIDB()
      return () => {
        active = false
      }
    }

    if (src.startsWith('data:')) {
      const normalized = normalizeDataUrl(src)
      const isFileProtocol = typeof window !== 'undefined' && window.location?.protocol === 'file:'
      if (isFileProtocol) {
        if (active) {
          blobUrlRef.current = normalized
          setBlobUrl(normalized)
          setLoading(false)
        }
        return () => {
          active = false
        }
      }
      const convertToBlobUrl = async () => {
        try {
          const blob = dataUrlToBlob(normalized)
          if (!active) return
          if (!blob) {
            setError(true)
            setBlobUrl(null)
            return
          }
          const url = URL.createObjectURL(blob)
          blobUrlRef.current = url
          setBlobUrl(url)
        } catch (err) {
          if (!active) return
          console.warn('Base64转Blob失败', err)
          setError(true)
          setBlobUrl(null)
        }
      }
      convertToBlobUrl()
    } else {
      setBlobUrl(src)
    }

    return () => {
      active = false
      if (blobUrlRef.current && blobUrlRef.current.startsWith('blob:')) {
        URL.revokeObjectURL(blobUrlRef.current)
        blobUrlRef.current = null
      }
    }
  }, [src])

  if (loading) return null
  if (error && !blobUrl) return null
  if (!blobUrl || LocalImageManager.isImageId(blobUrl)) return null

  return <img src={blobUrl} className={className} alt={alt} onError={onError} onLoad={onLoad} {...props} />
}
