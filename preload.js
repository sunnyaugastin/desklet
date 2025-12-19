const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('desklet', {
  // Launcher actions
  getApps: () => ipcRenderer.invoke('get-apps'),
  addApp: () => ipcRenderer.invoke('add-app'),
  openApp: (id) => ipcRenderer.invoke('open-app', id),

  // Navigation
  backToLauncher: () => ipcRenderer.invoke('back-to-launcher')
})
