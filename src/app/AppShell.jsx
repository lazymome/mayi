import { useEffect, useMemo, useState } from 'react'
import { resolveWorkspaceComponent } from './routes.jsx'
import { getInitialWorkspace, persistWorkspace, WORKSPACES, WORKSPACE_MODES } from './workspaceStore.js'
import { useTapnowProject } from '../domain/project/projectStore.jsx'

export default function AppShell() {
  const [workspace, setWorkspace] = useState(getInitialWorkspace)
  const [projectOperation, setProjectOperation] = useState(null)
  const [projectStatus, setProjectStatus] = useState('')
  const { dirty, lastError, newProject, openProject, saveProject, saveProjectAs, project, projectPath } = useTapnowProject()
  const ActiveWorkspace = useMemo(() => resolveWorkspaceComponent(workspace), [workspace])
  const isCanvas = workspace === WORKSPACE_MODES.CANVAS
  const isProjectBusy = Boolean(projectOperation)

  useEffect(() => {
    persistWorkspace(workspace)
  }, [workspace])

  const runProjectOperation = async (operation, action, successMessage) => {
    if (isProjectBusy) return
    setProjectOperation(operation)
    setProjectStatus('')
    try {
      await Promise.resolve(action())
      setProjectStatus(successMessage)
    } catch (error) {
      setProjectStatus(error?.message ? `操作失败：${error.message}` : '操作失败')
    } finally {
      setProjectOperation(null)
    }
  }

  const buttonBase = 'rounded-full border border-zinc-800 px-3 py-1 text-zinc-300 transition hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent'

  const workspaceNav = (
    <nav className="flex flex-wrap gap-2" aria-label="工作区导航">
      {WORKSPACES.map((item) => (
        <button
          key={item.id}
          onClick={() => setWorkspace(item.id)}
          className={`rounded-full px-3 py-1.5 text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 ${workspace === item.id ? 'bg-zinc-100 text-zinc-950' : 'border border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800'}`}
          aria-current={workspace === item.id ? 'page' : undefined}
          aria-pressed={workspace === item.id}
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
      <button disabled={isProjectBusy} onClick={() => runProjectOperation('new', newProject, '已新建项目')} className={buttonBase}>{projectOperation === 'new' ? '新建中...' : '新建'}</button>
      <button disabled={isProjectBusy} onClick={() => runProjectOperation('open', openProject, '已打开项目')} className={buttonBase}>{projectOperation === 'open' ? '打开中...' : '打开'}</button>
      <button disabled={isProjectBusy} onClick={() => runProjectOperation('save', saveProject, '已保存项目')} className={buttonBase}>{projectOperation === 'save' ? '保存中...' : '保存'}</button>
      <button disabled={isProjectBusy} onClick={() => runProjectOperation('saveAs', saveProjectAs, '已另存为新项目')} className={buttonBase}>{projectOperation === 'saveAs' ? '另存中...' : '另存为'}</button>
      {projectStatus ? <span className="max-w-[280px] truncate text-green-300" role="status" title={projectStatus}>{projectStatus}</span> : null}
      {lastError ? <span className="max-w-[280px] truncate text-yellow-300" role="alert" title={lastError}>{lastError}</span> : null}
    </div>
  )

  if (isCanvas) {
    return (
      <div className="relative min-h-screen bg-zinc-950">
        <div className="fixed inset-x-3 bottom-3 z-50 rounded-2xl border border-zinc-800 bg-zinc-950/90 p-2 shadow-2xl backdrop-blur md:inset-x-auto md:bottom-auto md:right-4 md:top-4">
          <div className="flex flex-col gap-2 md:items-end">
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
