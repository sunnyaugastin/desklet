const { app, BrowserWindow, dialog, ipcMain, Menu } = require('electron')
const path = require('path')
const fs = require('fs')
const ws = require('windows-shortcuts')
const os = require('os')

let mainWindow
let currentApp = null

const dataFile = path.join(__dirname, 'data', 'apps.json')

function ensureDataFile() {
  if (!fs.existsSync(path.dirname(dataFile))) {
    fs.mkdirSync(path.dirname(dataFile), { recursive: true })
  }
  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, JSON.stringify([]))
  }
}

function loadApps() {
  ensureDataFile()

  try {
    const raw = fs.readFileSync(dataFile, 'utf-8').trim()

    // If file is empty, reset it
    if (!raw) {
      fs.writeFileSync(dataFile, JSON.stringify([]))
      return []
    }

    return JSON.parse(raw)
  } catch (err) {
    // If JSON is corrupted, reset safely
    console.error('apps.json corrupted, resetting...', err)
    fs.writeFileSync(dataFile, JSON.stringify([]))
    return []
  }
}


function saveApps(apps) {
  fs.writeFileSync(dataFile, JSON.stringify(apps, null, 2))
}

function createWindow() {
  mainWindow = new BrowserWindow({
  width: 1200,
  height: 750,
  autoHideMenuBar: false,
  icon: path.join(__dirname, 'assets', 'default.ico'),
  webPreferences: {
    preload: path.join(__dirname, 'preload.js'),
    contextIsolation: true,
    nodeIntegration: false
  }
})

  openLauncher()
}

function openLauncher() {
  currentApp = null
  mainWindow.loadFile(path.join(__dirname, 'launcher/launcher.html'))
  Menu.setApplicationMenu(null)
}

function openApp(appObj) {
  currentApp = appObj

  const fileUrl = `file://${appObj.entry.replace(/\\/g, '/')}`
  mainWindow.loadURL(fileUrl)

  buildAppMenu()
}


function buildAppMenu() {
  const menu = Menu.buildFromTemplate([
    {
      label: 'Desklet',
      submenu: [
        {
          label: 'Save as Desktop App',
          click: () => saveAsDesktop()
        },
        {
          label: 'Rename App',
          click: () => renameApp()
        },
        {
          label: 'Change App Icon',
          click: () => changeIcon()
        },
        { type: 'separator' },
        {
          label: 'Back to Launcher',
          click: () => openLauncher()
        },
        {
          label: 'Close App',
          role: 'close'
        }
      ]
    }
  ])
  Menu.setApplicationMenu(menu)
}

/* -------- IPC -------- */

ipcMain.handle('get-apps', () => {
  return loadApps()
})

ipcMain.handle('open-app', (_, appId) => {
  const apps = loadApps()
  const appObj = apps.find(a => a.id === appId)
  if (appObj) openApp(appObj)
})

ipcMain.handle('add-app', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile', 'openDirectory']
  })
  if (result.canceled) return

  let target = result.filePaths[0]

  // If folder selected, try to find index.html
  if (fs.statSync(target).isDirectory()) {
    const indexPath = path.join(target, 'index.html')

    if (fs.existsSync(indexPath)) {
      target = indexPath
    } else {
      dialog.showErrorBox(
        'No index.html found',
        'The selected folder does not contain an index.html file.\n\nPlease select an HTML file directly or choose a folder with index.html.'
      )
      return
    }
  }

  // Validate HTML file
  if (!target.toLowerCase().endsWith('.html')) {
    dialog.showErrorBox(
      'Invalid selection',
      'Please select an HTML file or a folder containing index.html.'
    )
    return
  }

  const name = path.basename(path.dirname(target))
  const apps = loadApps()

  const appObj = {
    id: Date.now().toString(),
    name,
    entry: target,
    icon: null
  }

  apps.push(appObj)
  saveApps(apps)

  openApp(appObj)
})



function saveAsDesktop() {
  if (!currentApp) return

  const desktopPath = path.join(os.homedir(), 'Desktop')
  const shortcutPath = path.join(desktopPath, `${currentApp.name}.lnk`)

  const iconPath = currentApp.icon
    ? currentApp.icon
    : path.join(__dirname, 'assets', 'default.ico')

  ws.create(shortcutPath, {
    target: process.execPath,
    args: `"${currentApp.entry}"`,
    icon: iconPath,
    desc: `Desklet App - ${currentApp.name}`
  }, err => {
    if (err) {
      dialog.showErrorBox('Shortcut Error', err.message)
    } else {
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        message:
          'Desktop shortcut created.\n\nRight-click the shortcut to pin it to Taskbar or Start.\n\nIf the icon does not update, delete the old shortcut and create it again.',
        buttons: ['OK']
      })
    }
  })
}

async function renameApp() {
  if (!currentApp) return

  const result = await dialog.showMessageBox(mainWindow, {
    title: 'Rename App',
    message: 'Rename this app',
    buttons: ['Save', 'Cancel'],
    defaultId: 0,
    cancelId: 1,
    input: currentApp.name
  })

  if (result.response === 0 && result.checkboxChecked !== undefined) {
    const apps = loadApps()
    const app = apps.find(a => a.id === currentApp.id)
    if (app) {
      app.name = result.checkboxChecked
      saveApps(apps)
      currentApp.name = app.name
    }
  }
}

async function changeIcon() {
  if (!currentApp) return

  const result = await dialog.showOpenDialog({
    title: 'Choose App Icon',
    filters: [{ name: 'Icons', extensions: ['ico'] }],
    properties: ['openFile']
  })

  if (result.canceled) return

  const iconPath = result.filePaths[0]

  const apps = loadApps()
  const app = apps.find(a => a.id === currentApp.id)
  if (app) {
    app.icon = iconPath
    saveApps(apps)
    currentApp.icon = iconPath
  }

  dialog.showMessageBox({
    message:
      'App icon updated.\n\nIf a shortcut already exists, delete it and create a new one to refresh the icon.',
    buttons: ['OK']
  })
}



app.whenReady().then(createWindow)
