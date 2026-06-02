const DB_NAME = 'tapnow_images_db'
const DB_VERSION = 1
const STORE_NAME = 'images'

let dbInstance = null
let dbInitPromise = null
const blobUrlCache = new Map()

const initDB = () => {
  if (dbInitPromise) return dbInitPromise

  dbInitPromise = new Promise((resolve) => {
    if (!window.indexedDB) {
      console.warn('[LocalImageManager] IndexedDB not supported, falling back to memory')
      resolve(null)
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = (event) => {
      console.error('[LocalImageManager] IndexedDB init failed:', event.target.error)
      resolve(null)
    }

    request.onsuccess = (event) => {
      dbInstance = event.target.result
      console.log('[LocalImageManager] IndexedDB initialized')
      resolve(dbInstance)
    }

    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('timestamp', 'timestamp', { unique: false })
        console.log('[LocalImageManager] Object store created')
      }
    }
  })

  return dbInitPromise
}

const generateId = () => `img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

const saveImage = async (data, existingId = null) => {
  const db = await initDB()
  if (!db) return null

  const id = existingId || generateId()

  return new Promise((resolve) => {
    try {
      let blob
      if (typeof data === 'string' && data.startsWith('data:')) {
        const parts = data.split(',')
        const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/png'
        const binaryStr = atob(parts[1])
        const bytes = new Uint8Array(binaryStr.length)
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i)
        }
        blob = new Blob([bytes], { type: mime })
      } else if (data instanceof Blob) {
        blob = data
      } else {
        console.warn('[LocalImageManager] Invalid data type for saveImage')
        resolve(null)
        return
      }

      const transaction = db.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const record = { id, blob, timestamp: Date.now(), size: blob.size }
      const request = store.put(record)

      request.onsuccess = () => resolve(id)
      request.onerror = (event) => {
        console.error('[LocalImageManager] Save failed:', event.target.error)
        resolve(null)
      }
    } catch (err) {
      console.error('[LocalImageManager] Save error:', err)
      resolve(null)
    }
  })
}

const getImage = async (id) => {
  if (blobUrlCache.has(id)) return blobUrlCache.get(id)

  const db = await initDB()
  if (!db) return null

  return new Promise((resolve) => {
    try {
      const transaction = db.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.get(id)

      request.onsuccess = () => {
        const record = request.result
        if (record && record.blob) {
          const reader = new FileReader()
          reader.onloadend = () => {
            const base64 = reader.result
            blobUrlCache.set(id, base64)
            resolve(base64)
          }
          reader.onerror = () => {
            console.error('[LocalImageManager] Failed to convert blob to base64')
            resolve(null)
          }
          reader.readAsDataURL(record.blob)
        } else {
          resolve(null)
        }
      }

      request.onerror = () => resolve(null)
    } catch (err) {
      console.error('[LocalImageManager] Get error:', err)
      resolve(null)
    }
  })
}

const deleteImage = async (id) => {
  const db = await initDB()
  if (!db) return false

  if (blobUrlCache.has(id)) {
    const url = blobUrlCache.get(id)
    if (url && url.startsWith('blob:')) URL.revokeObjectURL(url)
    blobUrlCache.delete(id)
  }

  return new Promise((resolve) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.delete(id)
    request.onsuccess = () => resolve(true)
    request.onerror = () => resolve(false)
  })
}

const getStats = async () => {
  const db = await initDB()
  if (!db) return { count: 0, totalSize: 0 }

  return new Promise((resolve) => {
    const transaction = db.transaction([STORE_NAME], 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.getAll()

    request.onsuccess = () => {
      const records = request.result || []
      const totalSize = records.reduce((sum, r) => sum + (r.size || 0), 0)
      resolve({ count: records.length, totalSize })
    }

    request.onerror = () => resolve({ count: 0, totalSize: 0 })
  })
}

const isImageId = (str) => typeof str === 'string' && str.startsWith('img_')

const LocalImageManager = { saveImage, getImage, deleteImage, getStats, isImageId, initDB }

if (typeof window !== 'undefined') {
  window.LocalImageManager = LocalImageManager
}

export default LocalImageManager
