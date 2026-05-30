import { useEffect, useMemo, useState } from 'react'
import { resolveWorkspaceComponent } from './routes.jsx'
import { getInitialWorkspace, persistWorkspace, WORKSPACES, WORKSPACE_MODES } from './workspaceStore.js'
import { useTapnowProject } from '../domain/project/projectStore.jsx'

export default function AppShell() {
  const [workspace, setWorkspace] = useState(getInitialWorkspace)
  const { dirty, lastError, newProject, openProject, saveProject, saveProjectAs, project, projectPath } = useTapnowProject()
  const ActiveWorkspace = useMemo(() => resolveWorkspaceComponent(workspace), [workspace])
  const isCanvas = workspace === WORKSPACE_MODES.CANVAS

  useEffect(() => {
    persistWorkspace(workspace)
  }, [workspace])

  const workspaceNav = (
    <nav className="flex flex-wrap gap-2">
      {WORKSPACES.map((item) => (
        <button
          key={item.id}
          onClick={() => setWorkspace(item.id)}
          className={`rounded-full px-3 py-1.5 text-xs transition ${workspace === item.id ? 'bg-zinc-100 text-zinc-950' : 'border border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800'}`}
          title={item.description}
        >
          {item.label}
        </button>
      ))}
    </nav>
  )

  const projectActions = (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="max-w-[260px] truncate text-zinc-500" title={projectPath || project.projectName}>
        {dirty ? '* ' : ''}{projectPath || project.projectName || 'Untitled Tapnow Project'}
      </span>
      <button onClick={() => newProject()} className="rounded-full border border-zinc-800 px-3 py-1 text-zinc-300 hover:bg-zinc-800">新建</button>
      <button onClick={openProject} className="rounded-full border border-zinc-800 px-3 py-1 text-zinc-300 hover:bg-zinc-800">打开</button>
      <button onClick={saveProject} className="rounded-full border border-zinc-800 px-3 py-1 text-zinc-300 hover:bg-zinc-800">保存</button>
      <button onClick={saveProjectAs} className="rounded-full border border-zinc-800 px-3 py-1 text-zinc-300 hover:bg-zinc-800">另存为</button>
      {lastError ? <span className="max-w-[280px] truncate text-yellow-300" title={lastError}>{lastError}</span> : null}
    </div>
  )

  if (isCanvas) {
    return (
      <div className="relative min-h-screen bg-zinc-950">
        <div className="fixed right-4 top-4 z-[10000] rounded-2xl border border-zinc-800 bg-zinc-950/90 p-2 shadow-2xl backdrop-blur">
          <div className="flex flex-col gap-2">
            {workspaceNav}
            {projectActions}
          </div>
        </div>
        <ActiveWorkspace />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.35em] text-zinc-500">Tapnow Studio</div>
            <div className="mt-1 text-lg font-semibold">AIGC 视频创作工作台</div>
          </div>
          <div className="flex flex-col items-start gap-2 md:items-end">
            {workspaceNav}
            {projectActions}
          </div>
        </div>
      </header>
      <ActiveWorkspace />
    </div>
  )
}
