import { memo, useEffect, useState } from 'react'

import i18n from '../../../i18n'
import LazyBase64Image from '../../../components/media/LazyBase64Image'

const t = i18n.t.bind(i18n)

const HistoryMjImageCell = memo(
  ({
    item,
    idx,
    imgUrl,
    displayImgUrl,
    theme,
    canDrag,
    lightboxItem,
    onImageClick,
    onImageContextMenu,
    onCacheMissing,
    handleDragStart,
  }) => {
    const [isLoaded, setIsLoaded] = useState(false)
    const [loadFailed, setLoadFailed] = useState(false)

    useEffect(() => {
      setIsLoaded(false)
      setLoadFailed(false)
    }, [displayImgUrl])

    const isActive = item.selectedMjImageIndex === idx && lightboxItem && lightboxItem.id === item.id
    const placeholderClass = theme === 'dark' ? 'text-zinc-500' : 'text-[#616161]'

    return (
      <div
        onClick={(e) => onImageClick && onImageClick(e, item, imgUrl, idx)}
        onContextMenu={(e) => onImageContextMenu && onImageContextMenu(e, item, imgUrl, idx)}
        onDragStart={(e) => {
          if (!canDrag) return
          e.stopPropagation()
          handleDragStart(e, imgUrl)
        }}
        draggable={canDrag}
        className={`relative w-full h-full cursor-pointer border-2 transition-all overflow-hidden ${
          isActive ? 'border-blue-500 scale-95' : 'border-transparent hover:border-blue-500/50'
        }`}
      >
        <LazyBase64Image
          src={displayImgUrl}
          loading="lazy"
          className="w-full h-full object-contain"
          alt=""
          onLoad={() => {
            setIsLoaded(true)
            setLoadFailed(false)
          }}
          onError={(e) => {
            setIsLoaded(false)
            setLoadFailed(true)
            console.error(`图片 ${idx + 1} 加载失败`)
            onCacheMissing && onCacheMissing(item.id, displayImgUrl)
            e.target.style.display = 'none'
          }}
        />
        {!isLoaded && (
          <div
            className={`absolute inset-0 flex items-center justify-center text-[12px] ${
              loadFailed ? 'text-red-400' : placeholderClass
            } pointer-events-none select-none`}
            style={{
              fontFamily: '"Microsoft YaHei","微软雅黑","KaiTi","楷体",serif',
            }}
          >
            {loadFailed ? t('加载失败') : `${t('图片')}${idx + 1}`}
          </div>
        )}
        {isActive && (
          <div className="absolute top-1 right-1 w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center z-10">
            <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        )}
      </div>
    )
  }
)

export default HistoryMjImageCell
