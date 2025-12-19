const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getGames: () => ipcRenderer.invoke('get-games'),
  saveGames: (games) => ipcRenderer.invoke('save-games', games),
  selectGameExecutable: () => ipcRenderer.invoke('select-game-executable'),
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  resizeWindow: (width, height) => ipcRenderer.invoke('resize-window', width, height),
  getWindowSize: () => ipcRenderer.invoke('get-window-size'),
  getScreenSize: () => ipcRenderer.invoke('get-screen-size'),
  centerWindow: () => ipcRenderer.invoke('center-window'),
  isMainWindowReady: () => ipcRenderer.invoke('is-main-window-ready'),

  // Auth bridge
  setAuthUser: (user) => ipcRenderer.invoke('set-auth-user', user),
  getAuthUser: () => ipcRenderer.invoke('get-auth-user'),
  getLastLoggedInUser: () => ipcRenderer.invoke('get-last-logged-in-user'),
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
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getUpdateStatus: () => ipcRenderer.invoke('get-update-status'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  
  onUpdateAvailable: (callback) => {
    ipcRenderer.on('update-available', (event, info) => callback(info));
  },
  onUpdateNotAvailable: (callback) => {
    ipcRenderer.on('update-not-available', callback);
  },
  onUpdateError: (callback) => {
    ipcRenderer.on('update-error', (event, error) => callback(error));
  },
  onUpdateDownloadProgress: (callback) => {
    ipcRenderer.on('update-download-progress', (event, progress) => callback(progress));
  },
  onUpdateDownloaded: (callback) => {
    ipcRenderer.on('update-downloaded', (event, info) => callback(info));
  },
  
  removeUpdateListeners: () => {
    ipcRenderer.removeAllListeners('update-available');
    ipcRenderer.removeAllListeners('update-not-available');
    ipcRenderer.removeAllListeners('update-error');
    ipcRenderer.removeAllListeners('update-download-progress');
    ipcRenderer.removeAllListeners('update-downloaded');
  },
  
  // Game file operations
  saveGameFiles: (gameId, files) => ipcRenderer.invoke('save-game-files', gameId, files),
  getGameFolderPath: (gameId) => ipcRenderer.invoke('get-game-folder-path', gameId),
  gameFolderExists: (gameId) => ipcRenderer.invoke('game-folder-exists', gameId),
  deleteGameFolder: (gameId) => ipcRenderer.invoke('delete-game-folder', gameId),
  saveGameMetadata: (gameId, metadata) => ipcRenderer.invoke('save-game-metadata', gameId, metadata),
  saveGameExecutable: (gameId, fileData) => ipcRenderer.invoke('save-game-executable', gameId, fileData),
  getGameMetadata: (gameId) => ipcRenderer.invoke('get-game-metadata', gameId),
  fileToDataUrl: (filePath) => ipcRenderer.invoke('file-to-data-url', filePath),
  
  // User management
  saveUsers: (users) => ipcRenderer.invoke('save-users', users),
  getUsers: () => ipcRenderer.invoke('get-users'),
  clearAllUsers: () => ipcRenderer.invoke('clear-all-users'),
  openAuthWindow: (email) => ipcRenderer.invoke('open-auth-window', email),
  openAccountSwitcherWindow: () => ipcRenderer.invoke('open-account-switcher-window'),
  openAdminWindow: () => ipcRenderer.invoke('open-admin-window'),
  
  // Database API - Users
  dbGetUsers: () => ipcRenderer.invoke('db-get-users'),
  dbSaveUser: (user) => ipcRenderer.invoke('db-save-user', user),
  dbDeleteUser: (userId) => ipcRenderer.invoke('db-delete-user', userId),
  
  // Database API - Games
  dbGetGames: (userId) => ipcRenderer.invoke('db-get-games', userId),
  dbSaveGame: (game) => ipcRenderer.invoke('db-save-game', game),
  dbDeleteGame: (gameId, userId) => ipcRenderer.invoke('db-delete-game', gameId, userId),
  dbGetAllGames: () => ipcRenderer.invoke('db-get-all-games'),
  dbMigrateGames: (userId, games) => ipcRenderer.invoke('db-migrate-games', userId, games),
  
  // Database API - Settings
  dbGetSetting: (userId, key) => ipcRenderer.invoke('db-get-setting', userId, key),
  dbSaveSetting: (userId, key, value) => ipcRenderer.invoke('db-save-setting', userId, key, value),
  dbGetAllSettings: (userId) => ipcRenderer.invoke('db-get-all-settings', userId),
  
  // Database API - Ratings
  dbGetRating: (gameId, userId) => ipcRenderer.invoke('db-get-rating', gameId, userId),
  dbSaveRating: (gameId, userId, rating, comment) => ipcRenderer.invoke('db-save-rating', gameId, userId, rating, comment),
  dbGetGameRatings: (gameId) => ipcRenderer.invoke('db-get-game-ratings', gameId),
  
  // Database API - Playing Games
  dbSavePlayingGame: (gameId, userId, startTime, endTime, duration) => ipcRenderer.invoke('db-save-playing-game', gameId, userId, startTime, endTime, duration),
  dbGetPlayingGames: (userId) => ipcRenderer.invoke('db-get-playing-games', userId),
  
  // Database API - Game States
  dbGetGameState: (gameId, userId) => ipcRenderer.invoke('db-get-game-state', gameId, userId),
  dbSaveGameState: (gameId, userId, state, status) => ipcRenderer.invoke('db-save-game-state', gameId, userId, state, status),
  dbDeleteGameState: (gameId, userId) => ipcRenderer.invoke('db-delete-game-state', gameId, userId),
  
  // Database API - Inventory
  dbGetInventory: (userId) => ipcRenderer.invoke('db-get-inventory', userId),
  dbSaveInventoryItem: (userId, itemId, itemType, itemData, quantity) => ipcRenderer.invoke('db-save-inventory-item', userId, itemId, itemType, itemData, quantity),
  
  // Database API - Developer Requests
  dbGetDeveloperRequests: () => ipcRenderer.invoke('db-get-developer-requests'),
  dbSaveDeveloperRequest: (request) => ipcRenderer.invoke('db-save-developer-request', request),
  dbUpdateDeveloperRequest: (requestId, status) => ipcRenderer.invoke('db-update-developer-request', requestId, status),
  
  // Database API - Sidebar Settings
  dbGetSidebarSettings: (userId) => ipcRenderer.invoke('db-get-sidebar-settings', userId),
  dbSaveSidebarSettings: (userId, settings) => ipcRenderer.invoke('db-save-sidebar-settings', userId, settings),
  
  // Database API - Market Settings
  dbGetMarketSettings: (userId) => ipcRenderer.invoke('db-get-market-settings', userId),
  dbSaveMarketSettings: (userId, settings) => ipcRenderer.invoke('db-save-market-settings', userId, settings),
  
  // Database API - Store Settings
  dbGetStoreSettings: (userId) => ipcRenderer.invoke('db-get-store-settings', userId),
  dbSaveStoreSettings: (userId, settings) => ipcRenderer.invoke('db-save-store-settings', userId, settings),
  
  // Database API - Library Settings
  dbGetLibrarySettings: (userId) => ipcRenderer.invoke('db-get-library-settings', userId),
  dbSaveLibrarySettings: (userId, expandedFolders) => ipcRenderer.invoke('db-save-library-settings', userId, expandedFolders),
  
  // Database API - Cart
  dbGetCartItems: (userId) => ipcRenderer.invoke('db-get-cart-items', userId),
  dbSaveCartItems: (userId, items) => ipcRenderer.invoke('db-save-cart-items', userId, items),
  dbClearCart: (userId) => ipcRenderer.invoke('db-clear-cart', userId),
  
  dbResetMigration: () => ipcRenderer.invoke('db-reset-migration'),
  
  // Password reset API
  requestPasswordReset: (email) => ipcRenderer.invoke('request-password-reset', email),
  validatePasswordResetToken: (token) => ipcRenderer.invoke('validate-password-reset-token', token),
  resetPassword: (token, newPassword) => ipcRenderer.invoke('reset-password', token, newPassword),
  
  onMenuAddGame: (callback) => {
    ipcRenderer.on('menu-add-game', callback);
  },
  
  removeMenuAddGameListener: () => {
    ipcRenderer.removeAllListeners('menu-add-game');
  }
});
