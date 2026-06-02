import { useMemo, useState } from 'react'
import { useTapnowProject } from '../../domain/project/projectStore.jsx'
import { createGenerationJob, JOB_TYPES } from '../generation/generationQueue.js'

export default function VideoStudio() {
  const { project, updateProject } = useTapnowProject()
  const [jobs, setJobs] = useState(() => [
    createGenerationJob({ type: JOB_TYPES.TEXT_TO_VIDEO, title: '镜头 1 文生视频', payload: { shotId: 'shot-1' } }),
  ])

  const totalDuration = useMemo(() => (
    project.storyboard.reduce((sum, shot) => sum + Number(shot.duration || 0), 0)
  ), [project.storyboard])

  const updateScript = (patch) => {
    updateProject((current) => ({ script: { ...current.script, ...patch } }))
  }

  const updateScene = (sceneId, patch) => {
    updateProject((current) => ({
      script: {
        ...current.script,
        scenes: (current.script.scenes || []).map((scene) => (scene.id === sceneId ? { ...scene, ...patch } : scene)),
      },
    }))
  }

  const addScene = () => {
    updateProject((current) => {
      const nextNumber = (current.script.scenes || []).length + 1
      return {
        script: {
          ...current.script,
          scenes: [
            ...(current.script.scenes || []),
            { id: `scene-${Date.now()}`, title: `新场景 ${nextNumber}`, summary: '' },
          ],
        },
      }
    })
  }

  const deleteScene = (sceneId) => {
    const affectedShots = project.storyboard.filter((shot) => shot.sceneId === sceneId).length
    const message = affectedShots
      ? `删除该场景会解除 ${affectedShots} 个镜头的场景绑定，确定继续吗？`
      : '确定删除该场景吗？'
    if (!window.confirm(message)) return
    updateProject((current) => ({
      script: {
        ...current.script,
        scenes: (current.script.scenes || []).filter((scene) => scene.id !== sceneId),
      },
      storyboard: current.storyboard.map((shot) => (shot.sceneId === sceneId ? { ...shot, sceneId: '' } : shot)),
    }))
  }

  const addShot = () => {
    updateProject((current) => {
      const nextNumber = current.storyboard.length + 1
      return {
        storyboard: [
          ...current.storyboard,
          {
            id: `shot-${Date.now()}`,
            sceneId: current.script.scenes?.[0]?.id || '',
            title: `新镜头 ${nextNumber}`,
            prompt: '',
            duration: 4,
            status: 'draft',
          },
        ],
      }
    })
  }

  const updateShot = (shotId, patch) => {
    updateProject((current) => ({
      storyboard: current.storyboard.map((shot) => (shot.id === shotId ? { ...shot, ...patch } : shot)),
    }))
  }

  const deleteShot = (shotId) => {
    if (!window.confirm('确定删除该镜头吗？')) return
    updateProject((current) => ({ storyboard: current.storyboard.filter((shot) => shot.id !== shotId) }))
  }

  const enqueueExport = () => {
    setJobs((current) => [
      ...current,
      createGenerationJob({ type: JOB_TYPES.EXPORT, title: '时间线导出任务', payload: { projectName: project.projectName } }),
    ])
  }

  return (
    <main className="bg-zinc-950 text-zinc-100 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6">
          <p className="text-xs uppercase tracking-[0.35em] text-blue-300">Video Studio</p>
          <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <label className="sr-only" htmlFor="video-project-name">项目名称</label>
              <input
                id="video-project-name"
                value={project.projectName}
                onChange={(event) => updateProject({ projectName: event.target.value })}
                className="w-full max-w-3xl rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-2xl font-semibold outline-none focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500 sm:text-3xl"
              />
              <label className="sr-only" htmlFor="video-script-title">剧本标题</label>
              <input
                id="video-script-title"
                value={project.script.title || ''}
                onChange={(event) => updateScript({ title: event.target.value })}
                placeholder="剧本标题"
                className="mt-3 w-full max-w-3xl rounded-lg border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-sm outline-none focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500"
              />
              <label className="sr-only" htmlFor="video-script-synopsis">剧本梗概</label>
              <textarea
                id="video-script-synopsis"
                value={project.script.synopsis || ''}
                onChange={(event) => updateScript({ synopsis: event.target.value })}
                placeholder="剧本梗概"
                rows={3}
                className="mt-3 w-full max-w-3xl rounded-lg border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500"
              />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <button onClick={addShot} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm transition hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950">添加镜头</button>
              <button onClick={enqueueExport} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium transition hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950">创建导出任务</button>
            </div>
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
            <h2 className="font-semibold">剧本与分镜</h2>
            <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-medium text-zinc-200">场景</h3>
                <button onClick={addScene} className="rounded-lg border border-zinc-700 px-3 py-1 text-xs transition hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950">添加场景</button>
              </div>
              <div className="mt-3 space-y-2">
                {(project.script.scenes || []).map((scene) => (
                  <div key={scene.id} className="grid gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 lg:grid-cols-[0.8fr_1fr_auto]">
                    <label className="sr-only" htmlFor={`scene-title-${scene.id}`}>场景标题</label>
                    <input id={`scene-title-${scene.id}`} value={scene.title || ''} onChange={(event) => updateScene(scene.id, { title: event.target.value })} className="rounded border border-zinc-800 bg-zinc-950 px-2 py-1 text-sm outline-none focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500" />
                    <label className="sr-only" htmlFor={`scene-summary-${scene.id}`}>场景摘要</label>
                    <input id={`scene-summary-${scene.id}`} value={scene.summary || ''} onChange={(event) => updateScene(scene.id, { summary: event.target.value })} placeholder="场景摘要" className="rounded border border-zinc-800 bg-zinc-950 px-2 py-1 text-sm outline-none focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500" />
                    <button onClick={() => deleteScene(scene.id)} aria-label={`删除场景 ${scene.title || scene.id}`} className="rounded border border-red-900/70 px-2 py-1 text-xs text-red-200 transition hover:bg-red-950/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950">删除</button>
                  </div>
                ))}
                {!project.script.scenes?.length ? (
                  <div className="rounded-lg border border-dashed border-zinc-800 bg-zinc-950/40 p-4 text-sm text-zinc-400" role="status">
                    暂无场景，点击“添加场景”开始编排剧本结构。
                  </div>
                ) : null}
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {project.storyboard.map((shot) => (
                <article key={shot.id} className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="grid flex-1 gap-2 lg:grid-cols-[1fr_120px_150px]">
                      <label className="sr-only" htmlFor={`shot-title-${shot.id}`}>镜头标题</label>
                      <input id={`shot-title-${shot.id}`} value={shot.title || ''} onChange={(event) => updateShot(shot.id, { title: event.target.value })} className="rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-sm font-medium outline-none focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500" />
                      <label className="sr-only" htmlFor={`shot-duration-${shot.id}`}>镜头时长，单位秒</label>
                      <input id={`shot-duration-${shot.id}`} aria-label="镜头时长，单位秒" type="number" min="0.1" step="0.1" value={shot.duration || 0} onChange={(event) => updateShot(shot.id, { duration: Math.max(0.1, Number(event.target.value) || 0.1) })} className="rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-sm outline-none focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500" />
                      <label className="sr-only" htmlFor={`shot-scene-${shot.id}`}>镜头绑定场景</label>
                      <select id={`shot-scene-${shot.id}`} value={shot.sceneId || ''} onChange={(event) => updateShot(shot.id, { sceneId: event.target.value })} className="rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-sm outline-none focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500">
                        <option value="">未绑定场景</option>
                        {(project.script.scenes || []).map((scene) => <option key={scene.id} value={scene.id}>{scene.title || scene.id}</option>)}
                      </select>
                    </div>
                    <span className="self-start rounded-full bg-zinc-800 px-2 py-1 text-[11px] text-zinc-300">{shot.id}</span>
                  </div>
                  <label className="sr-only" htmlFor={`shot-prompt-${shot.id}`}>镜头提示词</label>
                  <textarea id={`shot-prompt-${shot.id}`} value={shot.prompt || ''} onChange={(event) => updateShot(shot.id, { prompt: event.target.value })} placeholder="等待填写镜头提示词" rows={3} className="mt-3 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500" />
                  <div className="mt-3 flex flex-col gap-2 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
                    <span>{shot.duration}s · {shot.status}</span>
                    <button onClick={() => deleteShot(shot.id)} aria-label={`删除镜头 ${shot.title || shot.id}`} className="rounded border border-red-900/70 px-2 py-1 text-red-200 transition hover:bg-red-950/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950">删除镜头</button>
                  </div>
                </article>
              ))}
              {!project.storyboard.length ? (
                <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 p-6 text-center" role="status">
                  <h3 className="text-sm font-medium text-zinc-200">暂无镜头</h3>
                  <p className="mt-2 text-sm text-zinc-400">点击“添加镜头”创建第一个分镜。</p>
                </div>
              ) : null}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
              <h2 className="font-semibold">时间线 MVP</h2>
              <p className="mt-2 text-sm text-zinc-400">{project.timeline.width}x{project.timeline.height} · {project.timeline.fps}fps · 预计 {totalDuration}s</p>
              <div className="mt-4 space-y-2">
                {project.timeline.tracks.map((track) => (
                  <div key={track.id} className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3">
                    <div className="text-xs text-zinc-500">{track.type}</div>
                    <div className="mt-1 font-medium">{track.name}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
              <h2 className="font-semibold">任务队列</h2>
              <div className="mt-4 space-y-2">
                {jobs.map((job) => (
                  <div key={job.id} className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{job.title}</span>
                      <span className="rounded-full bg-yellow-500/20 px-2 py-1 text-[11px] text-yellow-100">{job.status}</span>
                    </div>
                    <div className="mt-1 text-xs text-zinc-500">{job.type}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
