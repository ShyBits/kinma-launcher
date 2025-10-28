const { app, BrowserWindow, Menu, ipcMain, dialog, shell, globalShortcut } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const Store = require('electron-store');
const { autoUpdater } = require('electron-updater');

const store = new Store();
const settingsStore = new Store({ name: 'settings' });

let mainWindow;

function getZoomLimits() {
  const [width, height] = mainWindow.getSize();
  const area = width * height;
  
  const baseArea = 960000;
  const ratio = area / baseArea;
  
  const maxZoom = Math.min(ratio * 0.8, 6.0);
  const minZoom = 1.0;
  
  return { minZoom, maxZoom };
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1200,
    minHeight: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    frame: false,
    titleBarStyle: 'hidden',
    show: false,
    icon: path.join(__dirname, 'assets/icon.png')
  });

  const startUrl = isDev 
    ? 'http://localhost:3000' 
    : `file://${path.join(__dirname, '../build/index.html')}`;
  
  mainWindow.loadURL(startUrl);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Zoom functionality removed

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Add Game',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('menu-add-game');
          }
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
  
  // Zoom shortcuts removed
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.handle('get-games', () => {
  return store.get('games', []);
});

ipcMain.handle('save-games', (event, games) => {
  store.set('games', games);
  return true;
});

ipcMain.handle('select-game-executable', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Executable Files', extensions: ['exe', 'app', 'sh'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('minimize-window', () => {
  mainWindow.minimize();
});

ipcMain.handle('maximize-window', () => {
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});

ipcMain.handle('close-window', () => {
  mainWindow.close();
});

ipcMain.handle('launch-game', async (event, gamePath) => {
  const { spawn } = require('child_process');
  
  try {
    const gameProcess = spawn(gamePath, [], {
      detached: true,
      stdio: 'ignore'
    });
    
    gameProcess.unref();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-settings', () => {
  try {
    return settingsStore.store || {};
  } catch (error) {
    console.error('Failed to get settings:', error);
    return {};
  }
});

ipcMain.handle('save-settings', (event, settings) => {
  try {
    settingsStore.store = settings;
    return { success: true };
  } catch (error) {
    console.error('Failed to save settings:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('set-auto-launch', async (event, enabled) => {
  app.setLoginItemSettings({
    openAtLogin: enabled,
    openAsHidden: true
  });
  return true;
});

ipcMain.handle('set-minimize-to-tray', (event, enabled) => {
  settingsStore.set('minimizeToTray', enabled);
  return true;
});

ipcMain.handle('set-hardware-acceleration', (event, enabled) => {
  try {
    settingsStore.set('hardwareAcceleration', enabled);
    return { success: true, message: 'Setting saved. Restart required to apply changes.' };
  } catch (error) {
    console.error('Failed to set hardware acceleration:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('select-data-path', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select Data Directory'
  });
  
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('clear-cache', async () => {
  try {
    const { session } = require('electron');
    await session.defaultSession.clearCache();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-cache-size', async () => {
  try {
    const { session } = require('electron');
    const cacheSize = await session.defaultSession.getCacheSize();
    return { size: cacheSize };
  } catch (error) {
    return { size: 0 };
  }
});

ipcMain.handle('open-logs', () => {
  const logPath = path.join(app.getPath('logs'), 'main.log');
  shell.openPath(logPath);
  return true;
});

ipcMain.handle('check-for-updates', async () => {
  try {
    if (!isDev) {
      await autoUpdater.checkForUpdatesAndNotify();
    }
    return { success: true, message: 'Update check completed' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
