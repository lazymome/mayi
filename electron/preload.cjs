const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('tapnowDesktop', {
  getEnv: () => ipcRenderer.invoke('tapnow:desktop:get-env'),
  localServerStatus: () => ipcRenderer.invoke('tapnow:desktop:localserver-status'),
  ensureLocalServer: () => ipcRenderer.invoke('tapnow:desktop:ensure-localserver'),
  selectDirectory: () => ipcRenderer.invoke('tapnow:desktop:select-directory'),
  openPath: (targetPath) => ipcRenderer.invoke('tapnow:desktop:open-path', targetPath),
  project: {
    open: () => ipcRenderer.invoke('tapnow:project:open-dialog'),
    save: (payload) => ipcRenderer.invoke('tapnow:project:save', payload),
    saveAs: (payload) => ipcRenderer.invoke('tapnow:project:save-as-dialog', payload),
  },
})
