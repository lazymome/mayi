import { useCallback, useEffect, useRef, useState } from 'react'

// Keeps mask preview serialization out of the large canvas shell.
export default function MaskVisualFeedback({ canvasRef, isDrawing }) {
  const [maskUrl, setMaskUrl] = useState('')
  const objectUrlRef = useRef('')

  const updateMask = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (typeof canvas.toBlob === 'function') {
      canvas.toBlob((blob) => {
        if (!blob) return
        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
        const nextUrl = URL.createObjectURL(blob)
        objectUrlRef.current = nextUrl
        setMaskUrl(nextUrl)
      }, 'image/png')
      return
    }
    setMaskUrl(canvas.toDataURL())
  }, [canvasRef])

  useEffect(
    () => () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    },
    []
  )

  useEffect(() => {
    if (!canvasRef.current) return
    updateMask()
  }, [canvasRef, updateMask])

  useEffect(() => {
    if (!isDrawing) updateMask()
  }, [isDrawing, updateMask])

  if (!maskUrl) return null

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        background: 'rgba(255, 0, 0, 0.3)',
        mixBlendMode: 'multiply',
        WebkitMaskImage: `url(${maskUrl})`,
        maskImage: `url(${maskUrl})`,
        WebkitMaskSize: '100% 100%',
        maskSize: '100% 100%',
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
      }}
    />
  )
}
