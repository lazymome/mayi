import { useEffect, useState } from 'react'

const desktopApi = () => window.tapnowDesktop || null

export default function DesktopSettings() {
  const [env, setEnv] = useState(null)
  const [serverStatus, setServerStatus] = useState(null)
  const [mediaStatus, setMediaStatus] = useState(null)
  const [selectedPath, setSelectedPath] = useState('')

  const refresh = async () => {
    const api = desktopApi()
    if (!api) {
      setEnv({ isDesktop: false })
      setServerStatus({ ok: false, error: '当前运行在浏览器模式，未检测到 Electron preload API。' })
      return
    }
    const nextEnv = await api.getEnv()
    setEnv(nextEnv)
    setServerStatus(await api.localServerStatus())
    try {
      const response = await fetch(`${nextEnv.localServerUrl}/media/status`)
      setMediaStatus(await response.json())
    } catch (error) {
      setMediaStatus({ ok: false, error: error.message })
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const ensureServer = async () => {
    const api = desktopApi()
    if (!api) return
    setServerStatus(await api.ensureLocalServer())
  }

  const pickDirectory = async () => {
    const api = desktopApi()
    if (!api) return
    const result = await api.selectDirectory()
    if (!result.canceled && result.paths?.[0]) setSelectedPath(result.paths[0])
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <header>
          <p className="text-xs uppercase tracking-[0.35em] text-blue-300">Desktop Settings</p>
          <h1 className="text-3xl font-semibold mt-2">桌面底座与本地服务</h1>
          <p className="text-sm text-zinc-400 mt-2">管理 Electron 环境、本地 Python sidecar、用户数据目录和项目路径。</p>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
            <h2 className="font-semibold">运行环境</h2>
            <pre className="mt-3 text-xs text-zinc-300 whitespace-pre-wrap">{JSON.stringify(env, null, 2)}</pre>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
            <h2 className="font-semibold">Localserver 状态</h2>
            <div className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs ${serverStatus?.ok ? 'bg-green-500/20 text-green-200' : 'bg-yellow-500/20 text-yellow-100'}`}>
              {serverStatus?.ok ? 'running' : 'not ready'}
            </div>
            <pre className="mt-3 text-xs text-zinc-300 whitespace-pre-wrap">{JSON.stringify(serverStatus, null, 2)}</pre>
            <div className="mt-4 flex gap-2">
              <button onClick={refresh} className="rounded-lg border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-800">刷新</button>
              <button onClick={ensureServer} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium hover:bg-blue-500">启动/确认服务</button>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
          <h2 className="font-semibold">Media / ffmpeg / sidecar 状态</h2>
          <div className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs ${mediaStatus?.ready ? 'bg-green-500/20 text-green-200' : 'bg-yellow-500/20 text-yellow-100'}`}>
            {mediaStatus?.ready ? 'ffmpeg ready' : 'ffmpeg not ready'}
          </div>
          <pre className="mt-3 text-xs text-zinc-300 whitespace-pre-wrap">{JSON.stringify(mediaStatus, null, 2)}</pre>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
          <h2 className="font-semibold">项目目录</h2>
          <p className="text-sm text-zinc-400 mt-2">后续 .tapnowproj、资产库、缓存和渲染输出都应归属到项目目录或用户数据目录。</p>
          <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
            <button onClick={pickDirectory} className="rounded-lg bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-950 hover:bg-white">选择目录</button>
            <span className="text-sm text-zinc-300 break-all">{selectedPath || '尚未选择'}</span>
          </div>
        </section>
      </div>
    </div>
  )
}
