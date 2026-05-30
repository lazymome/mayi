const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const path = require('path')
const fs = require('fs')
const { spawn } = require('child_process')

const LOCAL_SERVER_PORT = Number(process.env.TAPNOW_LOCAL_PORT || 9527)
const LOCAL_SERVER_URL = `http://127.0.0.1:${LOCAL_SERVER_PORT}`
const isDev = !app.isPackaged
const PROJECT_EXTENSION = '.tapnowproj'

let mainWindow = null
let localServerProcess = null

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const resolveLocalServerScript = () => {
  if (isDev) {
    return path.join(app.getAppPath(), 'localserver', 'tapnow-server-full.py')
  }
  return path.join(process.resourcesPath, 'localserver', 'tapnow-server-full.py')
}

const resolveLocalServerSidecar = () => {
  const executable = process.platform === 'win32' ? 'tapnow-localserver.exe' : 'tapnow-localserver'
  return path.join(process.resourcesPath, 'localserver-sidecar', executable)
}

const ensureProjectExtension = (targetPath) => {
  if (!targetPath || path.extname(targetPath).toLowerCase() === PROJECT_EXTENSION) return targetPath
  return `${targetPath}${PROJECT_EXTENSION}`
}

const pingLocalServer = async () => {
  try {
    const response = await fetch(`${LOCAL_SERVER_URL}/ping`, { signal: AbortSignal.timeout(1200) })
    if (!response.ok) return { ok: false, status: response.status }
    const data = await response.json().catch(() => null)
    return { ok: true, url: LOCAL_SERVER_URL, data }
  } catch (error) {
    return { ok: false, url: LOCAL_SERVER_URL, error: error.message }
  }
}

const ensureLocalServer = async () => {
  const existing = await pingLocalServer()
  if (existing.ok) return { ...existing, started: false }

  const userDataPath = app.getPath('userData')
  const logsPath = path.join(userDataPath, 'logs')
  fs.mkdirSync(logsPath, { recursive: true })

  const sidecarPath = resolveLocalServerSidecar()
  const shouldUseSidecar = app.isPackaged && fs.existsSync(sidecarPath)
  const scriptPath = resolveLocalServerScript()
  if (!shouldUseSidecar && !fs.existsSync(scriptPath)) {
    return { ok: false, started: false, error: `Local server script not found: ${scriptPath}` }
  }

  const pythonCommand = process.env.TAPNOW_PYTHON || (process.platform === 'win32' ? 'python' : 'python3')
  const command = shouldUseSidecar ? sidecarPath : pythonCommand
  const args = shouldUseSidecar ? ['--port', String(LOCAL_SERVER_PORT)] : [scriptPath, '--port', String(LOCAL_SERVER_PORT)]
  const cwd = shouldUseSidecar ? path.dirname(sidecarPath) : path.dirname(scriptPath)

  localServerProcess = spawn(command, args, {
    cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      TAPNOW_DESKTOP: '1',
      TAPNOW_USER_DATA_DIR: userDataPath,
      TAPNOW_LOG_DIR: logsPath,
    },
    windowsHide: true,
  })

  const logFile = fs.createWriteStream(path.join(logsPath, 'localserver.log'), { flags: 'a' })
  localServerProcess.stdout.pipe(logFile)
  localServerProcess.stderr.pipe(logFile)
  localServerProcess.on('exit', () => {
    localServerProcess = null
    logFile.end()
  })

  for (let i = 0; i < 20; i += 1) {
    await wait(300)
    const result = await pingLocalServer()
    if (result.ok) return { ...result, started: true }
  }

  return { ok: false, started: true, url: LOCAL_SERVER_URL, error: 'Local server did not become ready in time' }
}

const createWindow = async () => {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1180,
    minHeight: 760,
    title: 'Tapnow Studio',
    backgroundColor: '#09090b',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  if (isDev) {
    await mainWindow.loadURL(process.env.TAPNOW_DESKTOP_DEV_URL || 'http://127.0.0.1:5173')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    await mainWindow.loadFile(path.join(app.getAppPath(), 'dist', 'index.html'))
  }
}

ipcMain.handle('tapnow:desktop:get-env', async () => ({
  isDesktop: true,
  isPackaged: app.isPackaged,
  localServerUrl: LOCAL_SERVER_URL,
  userDataPath: app.getPath('userData'),
  cachePath: app.getPath('sessionData'),
}))

ipcMain.handle('tapnow:desktop:localserver-status', pingLocalServer)
ipcMain.handle('tapnow:desktop:ensure-localserver', ensureLocalServer)

ipcMain.handle('tapnow:desktop:select-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory'],
  })
  return { canceled: result.canceled, paths: result.filePaths }
})

ipcMain.handle('tapnow:desktop:open-path', async (_event, targetPath) => {
  if (!targetPath || typeof targetPath !== 'string') return { ok: false, error: 'Invalid path' }
  const error = await shell.openPath(targetPath)
  return { ok: !error, error }
})

ipcMain.handle('tapnow:project:open-dialog', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [{ name: 'Tapnow Project', extensions: ['tapnowproj'] }],
    })
    if (result.canceled || !result.filePaths?.[0]) return { canceled: true }
    const projectPath = result.filePaths[0]
    const content = await fs.promises.readFile(projectPath, 'utf-8')
    return { ok: true, path: projectPath, project: JSON.parse(content) }
  } catch (error) {
    return { ok: false, error: error.message }
  }
})

ipcMain.handle('tapnow:project:save', async (_event, payload = {}) => {
  try {
    const targetPath = ensureProjectExtension(payload.path)
    if (!targetPath || typeof payload.content !== 'string') return { ok: false, error: 'Invalid project save payload' }
    await fs.promises.mkdir(path.dirname(targetPath), { recursive: true })
    await fs.promises.writeFile(targetPath, payload.content, 'utf-8')
    return { ok: true, path: targetPath }
  } catch (error) {
    return { ok: false, error: error.message }
  }
})

ipcMain.handle('tapnow:project:save-as-dialog', async (_event, payload = {}) => {
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: payload.defaultPath || 'Untitled Tapnow Project.tapnowproj',
      filters: [{ name: 'Tapnow Project', extensions: ['tapnowproj'] }],
    })
    if (result.canceled || !result.filePath) return { canceled: true }
    const targetPath = ensureProjectExtension(result.filePath)
    await fs.promises.mkdir(path.dirname(targetPath), { recursive: true })
    await fs.promises.writeFile(targetPath, payload.content || '{}', 'utf-8')
    return { ok: true, path: targetPath }
  } catch (error) {
    return { ok: false, error: error.message }
  }
})

app.whenReady().then(async () => {
  await ensureLocalServer()
  await createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  if (localServerProcess && !localServerProcess.killed) {
    localServerProcess.kill()
  }
})
