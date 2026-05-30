import CanvasWorkspace from '../features/canvas/CanvasWorkspace.jsx'
import AssetLibrary from '../features/assets/AssetLibrary.jsx'
import VideoStudio from '../features/video/VideoStudio.jsx'
import DesktopSettings from '../features/settings/DesktopSettings.jsx'
import { WORKSPACE_MODES } from './workspaceStore.js'

export const workspaceRoutes = {
  [WORKSPACE_MODES.CANVAS]: CanvasWorkspace,
  [WORKSPACE_MODES.VIDEO]: VideoStudio,
  [WORKSPACE_MODES.ASSETS]: AssetLibrary,
  [WORKSPACE_MODES.SETTINGS]: DesktopSettings,
}

export const resolveWorkspaceComponent = (workspaceId) => (
  workspaceRoutes[workspaceId] || workspaceRoutes[WORKSPACE_MODES.CANVAS]
)
