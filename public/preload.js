const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getGames: () => ipcRenderer.invoke('get-games'),
  saveGames: (games) => ipcRenderer.invoke('save-games', games),
  selectGameExecutable: () => ipcRenderer.invoke('select-game-executable'),
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  resizeWindow: (width, height) => ipcRenderer.invoke('resize-window', width, height),
  centerWindow: () => ipcRenderer.invoke('center-window'),

  // Auth bridge
  setAuthUser: (user) => ipcRenderer.invoke('set-auth-user', user),
  getAuthUser: () => ipcRenderer.invoke('get-auth-user'),
  authSuccess: (user) => ipcRenderer.invoke('auth-success', user),
  logout: () => ipcRenderer.invoke('logout'),
  isForceAuth: () => ipcRenderer.invoke('is-force-auth'),
  oauthStart: (provider, params) => ipcRenderer.invoke('oauth-start', { provider, params }),
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
  
  // Game file operations
  saveGameFiles: (gameId, files) => ipcRenderer.invoke('save-game-files', gameId, files),
  getGameFolderPath: (gameId) => ipcRenderer.invoke('get-game-folder-path', gameId),
  deleteGameFolder: (gameId) => ipcRenderer.invoke('delete-game-folder', gameId),
  saveGameMetadata: (gameId, metadata) => ipcRenderer.invoke('save-game-metadata', gameId, metadata),
  saveGameExecutable: (gameId, fileData) => ipcRenderer.invoke('save-game-executable', gameId, fileData),
  getGameMetadata: (gameId) => ipcRenderer.invoke('get-game-metadata', gameId),
  fileToDataUrl: (filePath) => ipcRenderer.invoke('file-to-data-url', filePath),
  
  // User management
  saveUsers: (users) => ipcRenderer.invoke('save-users', users),
  getUsers: () => ipcRenderer.invoke('get-users'),
  clearAllUsers: () => ipcRenderer.invoke('clear-all-users'),
  
  onMenuAddGame: (callback) => {
    ipcRenderer.on('menu-add-game', callback);
  },
  
  removeMenuAddGameListener: () => {
    ipcRenderer.removeAllListeners('menu-add-game');
  }
});
