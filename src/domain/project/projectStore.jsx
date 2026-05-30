import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { createEmptyTapnowProject, normalizeTapnowProject, serializeTapnowProject } from './tapnowProject.js'

const ProjectContext = createContext(null)

const desktopProjectApi = () => window.tapnowDesktop?.project || null


export function TapnowProjectProvider({ children }) {
  const [project, setProject] = useState(() => createEmptyTapnowProject())
  const [projectPath, setProjectPath] = useState('')
  const [dirty, setDirty] = useState(false)
  const [lastError, setLastError] = useState('')

  const replaceProject = useCallback((nextProject, nextPath = '') => {
    setProject(normalizeTapnowProject(nextProject))
    setProjectPath(nextPath || '')
    setDirty(false)
    setLastError('')
  }, [])

  const updateProject = useCallback((updater) => {
    setProject((current) => {
      const patch = typeof updater === 'function' ? updater(current) : updater
      const next = normalizeTapnowProject({ ...current, ...patch, updatedAt: new Date().toISOString() })
      return next
    })
    setDirty(true)
  }, [])

  const newProject = useCallback((overrides = {}) => {
    replaceProject(createEmptyTapnowProject(overrides), '')
  }, [replaceProject])

  const openProject = useCallback(async () => {
    const api = desktopProjectApi()
    if (!api?.open) {
      setLastError('当前环境未提供 Electron 项目文件打开能力。')
      return { ok: false, error: 'Desktop project API unavailable' }
    }
    const result = await api.open()
    if (result?.canceled) return result
    if (!result?.ok) {
      setLastError(result?.error || '打开项目失败')
      return result
    }
    replaceProject(result.project, result.path)
    return result
  }, [replaceProject])

  const saveProjectAs = useCallback(async () => {
    const api = desktopProjectApi()
    if (!api?.saveAs) {
      setLastError('当前环境未提供 Electron 项目另存为能力。')
      return { ok: false, error: 'Desktop project API unavailable' }
    }
    const result = await api.saveAs({ defaultPath: `${project.projectName || 'Untitled Tapnow Project'}.tapnowproj`, content: serializeTapnowProject(project) })
    if (result?.ok) {
      setDirty(false)
      setProjectPath(result.path || '')
      setLastError('')
    } else if (!result?.canceled) {
      setLastError(result?.error || '另存为项目失败')
    }
    return result
  }, [project])

  const saveProject = useCallback(async () => {
    const api = desktopProjectApi()
    if (!api?.save) {
      setLastError('当前环境未提供 Electron 项目文件保存能力。')
      return { ok: false, error: 'Desktop project API unavailable' }
    }
    if (!projectPath) {
      return saveProjectAs()
    }
    const result = await api.save({ path: projectPath, content: serializeTapnowProject(project) })
    if (result?.ok) {
      setDirty(false)
      setProjectPath(result.path || projectPath)
      setLastError('')
    } else {
      setLastError(result?.error || '保存项目失败')
    }
    return result
  }, [project, projectPath, saveProjectAs])

  const value = useMemo(() => ({
    project,
    projectPath,
    dirty,
    lastError,
    newProject,
    openProject,
    saveProject,
    saveProjectAs,
    updateProject,
    replaceProject,
  }), [dirty, lastError, newProject, openProject, project, projectPath, replaceProject, saveProject, saveProjectAs, updateProject])

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
}

export const useTapnowProject = () => {
  const context = useContext(ProjectContext)
  if (!context) throw new Error('useTapnowProject must be used within TapnowProjectProvider')
  return context
}
