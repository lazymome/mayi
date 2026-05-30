export const WORKSPACE_MODES = {
  CANVAS: 'canvas',
  VIDEO: 'video',
  ASSETS: 'assets',
  SETTINGS: 'settings',
}

export const WORKSPACES = [
  { id: WORKSPACE_MODES.CANVAS, label: '画布', description: '现有生成画布和节点工作流' },
  { id: WORKSPACE_MODES.VIDEO, label: '视频工作台', description: '剧本、分镜、时间线、字幕和导出' },
  { id: WORKSPACE_MODES.ASSETS, label: '资产库', description: '图片、视频、音频、字幕和缩略图索引' },
  { id: WORKSPACE_MODES.SETTINGS, label: '桌面设置', description: '本地服务、项目路径和缓存目录' },
]

export const getInitialWorkspace = () => {
  try {
    const stored = localStorage.getItem('tapnow_workspace_mode')
    if (WORKSPACES.some((workspace) => workspace.id === stored)) return stored
  } catch {
    // Ignore storage failures and fall back to the existing canvas-first behavior.
  }
  return WORKSPACE_MODES.CANVAS
}

export const persistWorkspace = (workspaceId) => {
  try {
    localStorage.setItem('tapnow_workspace_mode', workspaceId)
  } catch {
    // Non-critical preference only.
  }
}
