import { useEffect, useState } from 'react'

const desktopApi = () => window.tapnowDesktop || null

export default function DesktopSettings() {
  const [env, setEnv] = useState(null)
  const [serverStatus, setServerStatus] = useState(null)
  const [mediaStatus, setMediaStatus] = useState(null)
  const [selectedPath, setSelectedPath] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isEnsuringServer, setIsEnsuringServer] = useState(false)
  const [isPickingDirectory, setIsPickingDirectory] = useState(false)
  const [operationStatus, setOperationStatus] = useState('')

  const refresh = async () => {
    if (isRefreshing) return
    setIsRefreshing(true)
    setOperationStatus('正在检测桌面环境与本地服务...')
    const api = desktopApi()
    if (!api) {
      setEnv({ isDesktop: false })
      setServerStatus({ ok: false, error: '当前运行在浏览器模式，未检测到 Electron preload API。' })
      setMediaStatus({ ready: false, error: '浏览器模式无法访问本地媒体服务。' })
      setOperationStatus('当前为浏览器模式，部分桌面能力不可用。')
      setIsRefreshing(false)
      return
    }
    try {
      const nextEnv = await api.getEnv()
      setEnv(nextEnv)
      setServerStatus(await api.localServerStatus())
      const response = await fetch(`${nextEnv.localServerUrl}/media/status`)
      setMediaStatus(await response.json())
      setOperationStatus('检测完成')
    } catch (error) {
      setMediaStatus({ ok: false, ready: false, error: error.message })
      setOperationStatus(`检测失败：${error.message}`)
    } finally {
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const ensureServer = async () => {
    if (isEnsuringServer) return
    const api = desktopApi()
    if (!api) {
      setOperationStatus('当前环境未提供 Electron preload API。')
      return
    }
    setIsEnsuringServer(true)
    setOperationStatus('正在启动或确认本地服务...')
    try {
      const nextStatus = await api.ensureLocalServer()
      setServerStatus(nextStatus)
      setOperationStatus(nextStatus?.ok ? '本地服务已就绪' : '本地服务暂未就绪')
    } catch (error) {
      setOperationStatus(`启动服务失败：${error.message}`)
    } finally {
      setIsEnsuringServer(false)
    }
  }

  const pickDirectory = async () => {
    if (isPickingDirectory) return
    const api = desktopApi()
    if (!api) {
      setOperationStatus('当前环境未提供目录选择能力。')
      return
    }
    setIsPickingDirectory(true)
    setOperationStatus('正在选择项目目录...')
    try {
      const result = await api.selectDirectory()
      if (!result.canceled && result.paths?.[0]) {
        setSelectedPath(result.paths[0])
        setOperationStatus('已选择项目目录')
      } else {
        setOperationStatus('已取消选择目录')
      }
    } finally {
      setIsPickingDirectory(false)
    }
  }

  const buttonBase = 'rounded-lg px-3 py-2 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 disabled:cursor-not-allowed disabled:opacity-60'
  const serverLabel = isRefreshing && !serverStatus ? '检测中...' : serverStatus?.ok ? 'running' : 'not ready'
  const mediaLabel = isRefreshing && !mediaStatus ? '检测中...' : mediaStatus?.ready ? 'ffmpeg ready' : 'ffmpeg not ready'

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <header>
          <p className="text-xs uppercase tracking-[0.35em] text-blue-300">Desktop Settings</p>
          <h1 className="text-3xl font-semibold mt-2">桌面底座与本地服务</h1>
          <p className="text-sm text-zinc-400 mt-2">管理 Electron 环境、本地 Python sidecar、用户数据目录和项目路径。</p>
        </header>

        {operationStatus ? (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300" role={operationStatus.includes('失败') ? 'alert' : 'status'}>
            {operationStatus}
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
            <h2 className="font-semibold">运行环境</h2>
            <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words text-xs text-zinc-300">{env ? JSON.stringify(env, null, 2) : '检测中...'}</pre>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
            <h2 className="font-semibold">Localserver 状态</h2>
            <div className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs ${serverStatus?.ok ? 'bg-green-500/20 text-green-200' : 'bg-yellow-500/20 text-yellow-100'}`}>
              {serverLabel}
            </div>
            <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words text-xs text-zinc-300">{serverStatus ? JSON.stringify(serverStatus, null, 2) : '检测中...'}</pre>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <button disabled={isRefreshing || isEnsuringServer} onClick={refresh} className={`${buttonBase} border border-zinc-700 hover:bg-zinc-800`}>{isRefreshing ? '刷新中...' : '刷新'}</button>
              <button disabled={isRefreshing || isEnsuringServer} onClick={ensureServer} className={`${buttonBase} bg-blue-600 font-medium hover:bg-blue-500`}>{isEnsuringServer ? '启动中...' : '启动/确认服务'}</button>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
          <h2 className="font-semibold">Media / ffmpeg / sidecar 状态</h2>
          <div className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs ${mediaStatus?.ready ? 'bg-green-500/20 text-green-200' : 'bg-yellow-500/20 text-yellow-100'}`}>
            {mediaLabel}
          </div>
          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words text-xs text-zinc-300">{mediaStatus ? JSON.stringify(mediaStatus, null, 2) : '检测中...'}</pre>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
          <h2 className="font-semibold">项目目录</h2>
          <p className="text-sm text-zinc-400 mt-2">后续 .tapnowproj、资产库、缓存和渲染输出都应归属到项目目录或用户数据目录。</p>
          <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
            <button disabled={isPickingDirectory} onClick={pickDirectory} className={`${buttonBase} bg-zinc-100 font-medium text-zinc-950 hover:bg-white`}>{isPickingDirectory ? '选择中...' : '选择目录'}</button>
            <span className="text-sm text-zinc-300 break-all">{selectedPath || '尚未选择'}</span>
          </div>
        </section>
      </div>
    </div>
  )
}
