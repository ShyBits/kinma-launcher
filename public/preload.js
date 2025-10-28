const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getGames: () => ipcRenderer.invoke('get-games'),
  saveGames: (games) => ipcRenderer.invoke('save-games', games),
  selectGameExecutable: () => ipcRenderer.invoke('select-game-executable'),
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  launchGame: (gamePath) => ipcRenderer.invoke('launch-game', gamePath),
  
  // Settings API
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  setAutoLaunch: (enabled) => ipcRenderer.invoke('set-auto-launch', enabled),
  setMinimizeToTray: (enabled) => ipcRenderer.invoke('set-minimize-to-tray', enabled),
  setHardwareAcceleration: (enabled) => ipcRenderer.invoke('set-hardware-acceleration', enabled),
  selectDataPath: () => ipcRenderer.invoke('select-data-path'),
  clearCache: () => ipcRenderer.invoke('clear-cache'),
  getCacheSize: () => ipcRenderer.invoke('get-cache-size'),
  openLogs: () => ipcRenderer.invoke('open-logs'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  
  onMenuAddGame: (callback) => {
    ipcRenderer.on('menu-add-game', callback);
  },
  
  removeMenuAddGameListener: () => {
    ipcRenderer.removeAllListeners('menu-add-game');
  }
});
