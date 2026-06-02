import { useState } from 'react'

export default function TagListEditor({
  label,
  values,
  onChange,
  placeholder,
  addLabel = '+',
  formatItem = (value) => value,
  disabled = false,
  inputDisabled = false,
  theme = 'dark',
  allowAll = false,
  allowAllLabel = '',
  onToggleAll = null,
  normalizeItem = (value) => value,
  maxItems = Infinity,
  allLabelPosition = 'right',
  headerLeft = null,
  headerRight = null,
}) {
  const [inputValue, setInputValue] = useState('')
  const list = Array.isArray(values) ? values : []
  const listDisabled = disabled || inputDisabled
  const maxCount = Number.isFinite(maxItems) ? maxItems : Infinity
  const isMaxed = list.length >= maxCount

  const addValues = () => {
    if (listDisabled || isMaxed) return
    const raw = inputValue.trim()
    if (!raw) return
    const parts = raw
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
    if (parts.length === 0) return
    const next = [...list]
    parts.forEach((part) => {
      const normalized = normalizeItem(part)
      if (next.length >= maxCount) return
      if (normalized && !next.includes(normalized)) next.push(normalized)
    })
    onChange(next)
    setInputValue('')
  }

  const removeValue = (value) => {
    if (listDisabled) return
    onChange(list.filter((item) => item !== value))
  }

  const allLabelNode = allowAllLabel ? (
    <label className={`flex items-center gap-1 text-[9px] ${theme === 'dark' ? 'text-zinc-500' : 'text-zinc-600'}`}>
      <input type="checkbox" checked={!!allowAll} onChange={(e) => onToggleAll && onToggleAll(e.target.checked)} disabled={disabled} />
      <span>{allowAllLabel}</span>
    </label>
  ) : null
  const hasRightHeader = (allLabelPosition !== 'left' && !!allLabelNode) || !!headerRight

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className={`text-[9px] font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-zinc-500' : 'text-zinc-600'}`}>
            {label}
          </label>
          {Number.isFinite(maxCount) && maxCount !== Infinity && (
            <span className={`text-[9px] ${theme === 'dark' ? 'text-zinc-600' : 'text-zinc-500'}`}>
              ({list.length}/{maxCount})
            </span>
          )}
          {headerLeft}
          {allLabelPosition === 'left' && allLabelNode}
        </div>
        {hasRightHeader && (
          <div className="flex items-center gap-2">
            {allLabelPosition !== 'left' && allLabelNode}
            {headerRight}
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-1 min-h-[18px]">
        {list.length > 0 ? (
          list.map((item) => (
            <span
              key={item}
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] ${
                theme === 'dark' ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-600'
              }`}
            >
              {formatItem(item)}
              {!listDisabled && (
                <button
                  onClick={() => removeValue(item)}
                  className={`${theme === 'dark' ? 'text-zinc-500 hover:text-red-400' : 'text-zinc-400 hover:text-red-500'}`}
                >
                  x
                </button>
              )}
            </span>
          ))
        ) : (
          <span className={`text-[9px] ${theme === 'dark' ? 'text-zinc-600' : 'text-zinc-400'}`}>未设置</span>
        )}
      </div>
      <div className="flex items-center gap-1">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addValues()
            }
          }}
          placeholder={placeholder}
          disabled={listDisabled}
          className={`flex-1 rounded px-2 py-1 text-[10px] outline-none border ${
            theme === 'dark' ? 'bg-zinc-900 border-zinc-800 text-zinc-300' : 'bg-white border-zinc-300 text-zinc-900'
          }`}
        />
        <button
          onClick={addValues}
          disabled={listDisabled || !inputValue.trim() || isMaxed}
          className={`px-2 py-1 rounded text-[10px] ${
            listDisabled || !inputValue.trim() || isMaxed
              ? theme === 'dark'
                ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
              : theme === 'dark'
                ? 'bg-zinc-700 text-zinc-200 hover:bg-zinc-600'
                : 'bg-zinc-200 text-zinc-700 hover:bg-zinc-300'
          }`}
        >
          {addLabel}
        </button>
      </div>
    </div>
  )
}
