import { useMemo, useState } from 'react'
import { addAssetToIndex, createAssetRecord, createEmptyAssetIndex, ASSET_TYPES } from './assetIndex.js'
import { useTapnowProject } from '../../domain/project/projectStore.jsx'
import { getMediaFileUrl, scanAssetDirectory } from '../media/mediaClient.js'

export default function AssetLibrary() {
  const { project, updateProject } = useTapnowProject()
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [scanStatus, setScanStatus] = useState('')

  const index = useMemo(() => ({ ...createEmptyAssetIndex(), assets: project.assets || [] }), [project.assets])

  const assets = useMemo(() => {
    const query = search.trim().toLowerCase()
    return index.assets.filter((asset) => {
      const typeMatches = filter === 'all' || asset.type === filter
      const queryMatches = !query || asset.name?.toLowerCase().includes(query) || asset.path?.toLowerCase().includes(query)
      return typeMatches && queryMatches
    })
  }, [filter, index.assets, search])

  const mergeAssets = (nextAssets) => {
    updateProject((current) => {
      const nextIndex = nextAssets.reduce(addAssetToIndex, { ...createEmptyAssetIndex(), assets: current.assets || [] })
      return { assets: nextIndex.assets }
    })
  }

  const addPlaceholderAsset = () => {
    mergeAssets([createAssetRecord({ name: `new-shot-${index.assets.length + 1}.mp4` })])
  }

  const scanDirectory = async () => {
    const api = window.tapnowDesktop
    if (!api?.selectDirectory) {
      setScanStatus('当前环境未提供目录选择能力。')
      return
    }
    const picked = await api.selectDirectory()
    if (picked.canceled || !picked.paths?.[0]) return
    setScanStatus('正在扫描本地目录...')
    try {
      const result = await scanAssetDirectory({ directory: picked.paths[0], recursive: true, generateThumbnails: true })
      mergeAssets(result.assets || [])
      setScanStatus(`扫描完成：${result.assets?.length || 0} 个资产`)
    } catch (error) {
      setScanStatus(`扫描失败：${error.message}`)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-blue-300">Asset Library</p>
            <h1 className="text-3xl font-semibold mt-2">统一资产库</h1>
            <p className="text-sm text-zinc-400 mt-2">为视频、画布、字幕和导出流程提供统一的本地素材索引。</p>
          </div>
          <button onClick={addPlaceholderAsset} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500">
            添加示例资产
          </button>
          <button onClick={scanDirectory} className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-white">
            扫描本地目录
          </button>
        </header>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            {['all', ...Object.values(ASSET_TYPES)].map((type) => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`rounded-full px-3 py-1 text-xs ${filter === type ? 'bg-zinc-100 text-zinc-950' : 'bg-zinc-900 text-zinc-300 border border-zinc-800'}`}
              >
                {type}
              </button>
            ))}
          </div>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索名称或路径" className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-blue-500" />
        </div>
        {scanStatus ? <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300">{scanStatus}</div> : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {assets.map((asset) => (
            <article key={asset.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
              {asset.thumbnailPath ? (
                <img src={getMediaFileUrl(asset.thumbnailPath)} alt="" className="h-32 w-full rounded-xl border border-zinc-800 object-cover" />
              ) : (
                <div className="h-32 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-950 border border-zinc-800 flex items-center justify-center text-xs uppercase tracking-[0.25em] text-zinc-500">
                  {asset.type}
                </div>
              )}
              <div className="mt-4">
                <h3 className="font-medium truncate">{asset.name}</h3>
                <p className="text-xs text-zinc-500 mt-1 truncate">{asset.path || '等待绑定本地文件路径'}</p>
                <p className="text-xs text-zinc-600 mt-1">{asset.metadata?.size ? `${Math.round(asset.metadata.size / 1024)} KB` : 'size unknown'}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  )
}
