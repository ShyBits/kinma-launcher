const { app, BrowserWindow, Menu, ipcMain, dialog, shell, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');
const isDev = require('electron-is-dev');
const Store = require('electron-store');
const { autoUpdater } = require('electron-updater');

const store = new Store();
const settingsStore = new Store({ name: 'settings' });

let mainWindow;
let authWindow;
let accountSwitcherWindow; // Track account switcher window
let pendingMainWindowShow = false; // Flag to show main window after account switcher closes

function getZoomLimits() {
  const [width, height] = mainWindow.getSize();
  const area = width * height;
  
  const baseArea = 960000;
  const ratio = area / baseArea;
  
  const maxZoom = Math.min(ratio * 0.8, 6.0);
  const minZoom = 1.0;
  
  return { minZoom, maxZoom };
}

function createMainWindow() {
  // Don't create if main window already exists and is not destroyed
  if (mainWindow && !mainWindow.isDestroyed()) {
    return;
  }
  
  // Always check for authenticated user before creating main window
  const authUser = settingsStore.get('authUser');
  if (!authUser || !authUser.id) {
    console.log('Cannot create main window - no authenticated user');
    // Create auth window instead if it doesn't exist
    if (!authWindow || authWindow.isDestroyed()) {
      createAuthWindow();
    }
    return;
  }
  
  mainWindow = new BrowserWindow({
    width: 1350,
    height: 800,
    minWidth: 1280,
    minHeight: 720,
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
    // Don't auto-show if we're waiting for account switcher to close
    // Also check if user is still authenticated
    const authUser = settingsStore.get('authUser');
    if (!pendingMainWindowShow && authUser && authUser.id) {
      mainWindow.show();
    } else if (!authUser || !authUser.id) {
      // User is not authenticated - close the window
      console.log('Main window ready but no authenticated user - closing window');
      mainWindow.close();
      mainWindow = null;
      if (!authWindow || authWindow.isDestroyed()) {
        createAuthWindow();
      }
    }
  });

  // Set 16:9 aspect ratio for minimum size constraint
  try {
    mainWindow.setAspectRatio(16/9);
  } catch (_) {}

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

function createAuthWindow() {
  // Don't create if auth window already exists and is not destroyed
  if (authWindow && !authWindow.isDestroyed()) {
    authWindow.focus();
    return;
  }
  
  authWindow = new BrowserWindow({
    width: 600,
    height: 220,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
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

  authWindow.loadURL(startUrl);

  authWindow.once('ready-to-show', () => {
    authWindow.center();
    authWindow.show();
    try { authWindow.setAspectRatio(1/1.5); } catch (_) {}
  });

  // Ensure the renderer is on the /auth route (works in dev and prod)
  authWindow.webContents.once('did-finish-load', () => {
    const navigateToAuth = `
      try {
        if (window.location.pathname !== '/auth') {
          window.history.pushState({}, '', '/auth');
          window.dispatchEvent(new Event('popstate'));
        }
      } catch (e) {}
    `;
    authWindow.webContents.executeJavaScript(navigateToAuth).catch(() => {});
  });

  if (isDev) {
    authWindow.webContents.openDevTools({ mode: 'detach' });
  }
}

app.whenReady().then(async () => {
  const forceAuth = process.env.KINMA_FORCE_AUTH === '1';
  if (forceAuth) {
    createAuthWindow();
    return;
  }
  
  // Check for existing auth user
  let existingUser = settingsStore.get('authUser');
  
  // Only create main window if user is authenticated
  // Otherwise, always show auth window
  if (existingUser && existingUser.id) {
    createMainWindow();
  } else {
    createAuthWindow();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    // Check if user is authenticated before creating main window
    const authUser = settingsStore.get('authUser');
    if (authUser && authUser.id) {
      if (!mainWindow || mainWindow.isDestroyed()) {
        createMainWindow();
      }
    } else {
      // No authenticated user - show auth window instead
      if (!authWindow || authWindow.isDestroyed()) {
        createAuthWindow();
      }
    }
  }
});

ipcMain.handle('get-games', (event) => {
  try {
    // Get current auth user
    const authUser = settingsStore.get('authUser');
    if (!authUser || !authUser.id) {
      return [];
    }
    
    // Get games for this specific user
    const userGamesKey = `games_${authUser.id}`;
    const userGames = store.get(userGamesKey, []);
    
    return userGames;
  } catch (error) {
    console.error('Error getting games:', error);
    return [];
  }
});

ipcMain.handle('save-games', (event, games) => {
  try {
    // Get current auth user
    const authUser = settingsStore.get('authUser');
    if (!authUser || !authUser.id) {
      return false;
    }
    
    // Save games for this specific user
    const userGamesKey = `games_${authUser.id}`;
    store.set(userGamesKey, games);
    
    return true;
  } catch (error) {
    console.error('Error saving games:', error);
    return false;
  }
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

ipcMain.handle('minimize-window', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender) || BrowserWindow.getFocusedWindow() || mainWindow || authWindow;
  try { win && win.minimize(); } catch (_) {}
});

ipcMain.handle('maximize-window', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender) || BrowserWindow.getFocusedWindow() || mainWindow || authWindow;
  if (!win) return;
  if (win === authWindow) return; // lock auth window size/aspect
  try {
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  } catch (_) {}
});

ipcMain.handle('close-window', async (event) => {
  // Close the window that sent the message
  const senderWindow = BrowserWindow.fromWebContents(event.sender);
  if (!senderWindow || senderWindow.isDestroyed()) {
    return;
  }

  // Check if this is the account switcher window
  let isAccountSwitcher = false;
  try {
    const url = senderWindow.webContents.getURL();
    if (url.includes('/account-switcher')) {
      isAccountSwitcher = true;
    }
  } catch (e) {
    // Ignore error
  }

  // If closing account switcher, login with last account and show main window
  if (isAccountSwitcher) {
    try {
      console.log('Account switcher window closing - logging in with last account');
      
      // Get last logged-in user directly
      let lastUser = null;
      try {
        const usersFile = path.join(app.getPath('userData'), 'users.json');
        if (fs.existsSync(usersFile)) {
          const fileContent = fs.readFileSync(usersFile, 'utf8');
          const users = JSON.parse(fileContent);
          
          if (Array.isArray(users) && users.length > 0) {
            const usersWithLoginTime = users.filter(u => u.lastLoginTime);
            if (usersWithLoginTime.length > 0) {
              usersWithLoginTime.sort((a, b) => {
                const timeA = new Date(a.lastLoginTime).getTime();
                const timeB = new Date(b.lastLoginTime).getTime();
                return timeB - timeA; // Descending order (most recent first)
              });
              lastUser = usersWithLoginTime[0];
            } else {
              lastUser = users[0];
            }
          }
        }
      } catch (error) {
        console.error('Error getting last logged-in user:', error);
      }
      
      if (lastUser) {
        console.log('Last logged-in user:', lastUser.email || lastUser.username);
        
        // Set auth user in Electron store
        const authUserData = {
          id: lastUser.id,
          email: lastUser.email,
          name: lastUser.name || lastUser.username || lastUser.email?.split('@')[0] || 'User'
        };
        settingsStore.set('authUser', authUserData);
        
        // Ensure main window exists and is shown (only if user is authenticated)
        if (!mainWindow || mainWindow.isDestroyed()) {
          createMainWindow();
        } else {
          if (!mainWindow.isVisible()) {
            mainWindow.show();
          }
          mainWindow.focus();
          
          // Update localStorage in main window and dispatch user-changed event
          const updateScript = `
            try {
              localStorage.setItem('authUser', JSON.stringify(${JSON.stringify(authUserData)}));
              window.dispatchEvent(new Event('user-changed'));
            } catch (e) {
              console.error('Error updating auth user:', e);
            }
          `;
          mainWindow.webContents.executeJavaScript(updateScript).catch(err => {
            console.error('Error executing update script:', err);
          });
        }
      } else {
        console.log('No last logged-in user found - showing auth window');
        // No user available - close main window and show auth window
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.close();
          mainWindow = null;
        }
        if (!authWindow || authWindow.isDestroyed()) {
          createAuthWindow();
        }
      }
    } catch (error) {
      console.error('Error handling account switcher close:', error);
      // Check if user is authenticated before showing main window
      const authUser = settingsStore.get('authUser');
      if (authUser && authUser.id) {
        if (!mainWindow || mainWindow.isDestroyed()) {
          createMainWindow();
        } else {
          if (!mainWindow.isVisible()) {
            mainWindow.show();
          }
          mainWindow.focus();
        }
      } else {
        // No authenticated user - show auth window instead
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.close();
          mainWindow = null;
        }
        if (!authWindow || authWindow.isDestroyed()) {
          createAuthWindow();
        }
      }
    }
  }

  // Close the window
  senderWindow.close();
});

ipcMain.handle('resize-window', (event, width, height) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return;
  try {
    const w = parseInt(width, 10);
    const h = parseInt(height, 10);
    win.setSize(w, h);
    // Ensure window is opaque and has proper background
    win.setOpacity(1);
    win.setBackgroundColor('#0a0a0a'); // Dark background color
  } catch (e) {
    console.error('Error resizing window:', e);
  }
});

ipcMain.handle('get-window-size', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return { width: 600, height: 800 };
  try {
    const [width, height] = win.getSize();
    return { width, height };
  } catch (e) {
    return { width: 600, height: 800 };
  }
});

// Check if main window is open and visible
ipcMain.handle('is-main-window-ready', () => {
  try {
    if (!mainWindow || mainWindow.isDestroyed()) {
      console.log('Main window check: not created or destroyed');
      return { ready: false, visible: false };
    }
    
    const isVisible = mainWindow.isVisible();
    const isReady = !mainWindow.webContents.isLoading();
    
    console.log(`Main window check: exists=${true}, visible=${isVisible}, ready=${isReady}`);
    
    if (isVisible && isReady) {
      return { ready: true, visible: true };
    }
    if (!mainWindow.isDestroyed()) {
      return { ready: isReady, visible: isVisible };
    }
    return { ready: false, visible: false };
  } catch (e) {
    console.error('Error checking main window:', e);
    return { ready: false, visible: false };
  }
});

ipcMain.handle('center-window', () => {
  try {
    BrowserWindow.getFocusedWindow()?.center();
  } catch (e) {}
});

// Auth bridge
ipcMain.handle('set-auth-user', (event, user) => {
  try { settingsStore.set('authUser', user); } catch (_) {}
  return true;
});

ipcMain.handle('get-auth-user', () => {
  try { return settingsStore.get('authUser') || null; } catch (_) { return null; }
});

// Get the last logged-in user from all users
ipcMain.handle('get-last-logged-in-user', async () => {
  try {
    const appPath = isDev 
      ? __dirname
      : path.join(app.getAppPath());
    
    let projectRoot = appPath;
    if (isDev) {
      projectRoot = path.resolve(appPath, '..');
    } else {
      projectRoot = path.join(appPath, '..');
    }
    
    const usersPath = path.join(projectRoot, 'user');
    const usersFile = path.join(usersPath, 'users.json');
    
    // Check if users file exists
    if (!fs.existsSync(usersFile)) {
      return { success: false, user: null };
    }
    
    // Read and parse users file
    const fileContent = fs.readFileSync(usersFile, 'utf8');
    const users = JSON.parse(fileContent);
    
    if (!Array.isArray(users) || users.length === 0) {
      return { success: false, user: null };
    }
    
    // Find user with most recent lastLoginTime
    const usersWithLoginTime = users.filter(u => u.lastLoginTime);
    if (usersWithLoginTime.length === 0) {
      // If no users have login time, return the first user
      return { success: true, user: users[0] };
    }
    
    // Sort by lastLoginTime (most recent first)
    usersWithLoginTime.sort((a, b) => {
      const timeA = new Date(a.lastLoginTime).getTime();
      const timeB = new Date(b.lastLoginTime).getTime();
      return timeB - timeA; // Descending order (most recent first)
    });
    
    return { success: true, user: usersWithLoginTime[0] };
  } catch (error) {
    console.error('Error getting last logged-in user:', error);
    return { success: false, user: null };
  }
});

ipcMain.handle('auth-success', (event, user) => {
  // Ensure we save the auth user in the correct format FIRST, before any window operations
  const authUserData = {
    id: user.id,
    email: user.email,
    name: user.name || user.username || user.email?.split('@')[0] || 'User'
  };
  
  try {
    settingsStore.set('authUser', authUserData);
    // Verify it was set correctly
    const verifyAuthUser = settingsStore.get('authUser');
    if (!verifyAuthUser || !verifyAuthUser.id) {
      console.error('Failed to set authUser in store');
      return;
    }
  } catch (error) {
    console.error('Error setting authUser:', error);
    return;
  }
  
  const senderWindow = BrowserWindow.fromWebContents(event.sender);
  
  // Check if this is coming from account switcher
  let isFromAccountSwitcher = false;
  if (senderWindow && !senderWindow.isDestroyed()) {
    try {
      const url = senderWindow.webContents.getURL();
      if (url.includes('/account-switcher')) {
        isFromAccountSwitcher = true;
      }
    } catch (e) {
      // Ignore error
    }
  }
  
  // Close auth window if it exists (either it's the sender or any auth window)
  if (authWindow && !authWindow.isDestroyed()) {
    if (authWindow === senderWindow) {
      authWindow.close();
      authWindow = null;
    } else {
      // Close any other auth window that might exist
      authWindow.close();
      authWindow = null;
    }
  }
  
  // Also close the sender window if it's an auth window or account switcher (but not main window)
  if (senderWindow && senderWindow !== mainWindow && !senderWindow.isDestroyed()) {
    // Check if it's an auth window by checking the URL
    try {
      const url = senderWindow.webContents.getURL();
      if (url.includes('/auth') || url.includes('addAccount=true')) {
        // Close auth windows
        senderWindow.close();
      }
    } catch (e) {
      // If we can't check URL, but it's not mainWindow, close it if it's likely an auth window
      if (senderWindow !== authWindow && senderWindow !== accountSwitcherWindow) {
        senderWindow.close();
      }
    }
  }
  
  // If coming from account switcher, store reference and set flag
  if (isFromAccountSwitcher && senderWindow && !senderWindow.isDestroyed()) {
    accountSwitcherWindow = senderWindow;
    pendingMainWindowShow = true;
    
    // Listen for account switcher window to close
    senderWindow.once('closed', () => {
      console.log('Account switcher window closed, showing main window');
      accountSwitcherWindow = null;
      pendingMainWindowShow = false;
      
      // Now show the main window
      if (mainWindow && !mainWindow.isDestroyed()) {
        if (!mainWindow.isVisible()) {
          mainWindow.show();
          console.log('Main window shown after account switcher closed');
        }
        mainWindow.focus();
      }
    });
  }
  
  // Get the authenticated user (should already be set above)
  const authUser = settingsStore.get('authUser');
  if (!authUser || !authUser.id) {
    console.error('Cannot show main window - authUser not properly set');
    return;
  }
  
  // Ensure main window exists (only create if it doesn't exist and user is authenticated)
  if (!mainWindow || mainWindow.isDestroyed()) {
    console.log('Creating main window...');
    createMainWindow();
  }
  
  // Handle showing the main window
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (isFromAccountSwitcher) {
      // If coming from account switcher, don't show main window yet - wait for account switcher to close
      console.log('Main window ready but hidden - waiting for account switcher to close');
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      }
    } else {
      // Normal flow - show window when ready
      let windowShown = false;
      
      const showMainWindow = () => {
        // authUser is already verified at the start of this handler
        // Just show the window if it exists
        if (mainWindow && !mainWindow.isDestroyed() && !windowShown) {
          if (!mainWindow.isVisible()) {
            mainWindow.show();
            console.log('Main window shown');
          }
          mainWindow.focus();
          windowShown = true;
        }
      };

      // Show when ready-to-show event fires (only if window was just created)
      if (!mainWindow.webContents || mainWindow.webContents.isLoading()) {
        mainWindow.once('ready-to-show', () => {
          console.log('Main window ready-to-show event fired');
          showMainWindow();
        });
      }
      
      // Also check if already ready
      if (mainWindow.webContents) {
        if (!mainWindow.webContents.isLoading()) {
          console.log('Main window already loaded, showing immediately');
          showMainWindow();
        } else {
          // Listen for when content finishes loading
          mainWindow.webContents.once('did-finish-load', () => {
            console.log('Main window did-finish-load event fired');
            setTimeout(showMainWindow, 100);
          });
        }
      }

      // Fallback to ensure window is shown
      setTimeout(() => {
        // authUser is already verified at the start of this handler
        // Just ensure window is shown if it exists
        if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
          console.log('Fallback: showing main window after timeout');
          mainWindow.show();
          mainWindow.focus();
        }
      }, 500);
    }
  }
});

ipcMain.handle('logout', async () => {
  try {
    // Get current user from settingsStore first
    let currentAuthUser = settingsStore.get('authUser');
    
    // If not in settingsStore, try to get from main window's localStorage
    if (!currentAuthUser || !currentAuthUser.id) {
      if (mainWindow && !mainWindow.isDestroyed()) {
        try {
          const authUserFromLocalStorage = await mainWindow.webContents.executeJavaScript(
            'try { const authUser = localStorage.getItem("authUser"); return authUser ? JSON.parse(authUser) : null; } catch (e) { return null; }'
          );
          
          if (authUserFromLocalStorage && authUserFromLocalStorage.id) {
            currentAuthUser = authUserFromLocalStorage;
            console.log('Found auth user in localStorage:', currentAuthUser.name || currentAuthUser.email);
            // Also sync it to settingsStore for consistency
            settingsStore.set('authUser', currentAuthUser);
          }
        } catch (error) {
          console.error('Error reading authUser from localStorage:', error);
        }
      }
    }
    
    if (!currentAuthUser || !currentAuthUser.id) {
      console.log('No current user to logout');
      return;
    }
    
    console.log('Logging out from account:', currentAuthUser.name || currentAuthUser.email);
    
    // Mark current user as logged out in users.json (but don't delete the account)
    try {
      const appPath = isDev 
        ? __dirname
        : path.join(app.getAppPath());
      
      let projectRoot = appPath;
      if (isDev) {
        projectRoot = path.resolve(appPath, '..');
      } else {
        projectRoot = path.join(appPath, '..');
      }
      
      const usersPath = path.join(projectRoot, 'user');
      const usersFile = path.join(usersPath, 'users.json');
      
      if (fs.existsSync(usersFile)) {
        const fileContent = fs.readFileSync(usersFile, 'utf8');
        const users = JSON.parse(fileContent);
        
        const userIndex = users.findIndex(u => u.id === currentAuthUser.id);
        if (userIndex !== -1) {
          // Mark user as logged out, but keep the account
          users[userIndex].isLoggedIn = false;
          fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
          console.log('Marked user as logged out in users.json');
        }
      }
    } catch (error) {
      console.error('Error updating user login status:', error);
    }
    
    // Remove current auth user from both stores
    settingsStore.delete('authUser');
    
    // Clear localStorage in main window
    if (mainWindow && !mainWindow.isDestroyed()) {
      try {
        await mainWindow.webContents.executeJavaScript(`
          try {
            localStorage.removeItem('authUser');
            localStorage.removeItem('developerIntent');
          } catch (e) {
            console.error('Error clearing localStorage:', e);
          }
        `);
      } catch (error) {
        console.error('Error clearing localStorage:', error);
      }
    }
    
    // Try to find another logged-in account to switch to (excluding current user)
    let switchToUser = null;
    try {
      const appPath = isDev 
        ? __dirname
        : path.join(app.getAppPath());
      
      let projectRoot = appPath;
      if (isDev) {
        projectRoot = path.resolve(appPath, '..');
      } else {
        projectRoot = path.join(appPath, '..');
      }
      
      const usersPath = path.join(projectRoot, 'user');
      const usersFile = path.join(usersPath, 'users.json');
      
      if (fs.existsSync(usersFile)) {
        const fileContent = fs.readFileSync(usersFile, 'utf8');
        const users = JSON.parse(fileContent);
        
        if (Array.isArray(users) && users.length > 0) {
          // Filter out current user and only get logged-in users
          const otherLoggedInUsers = users.filter(u => {
            if (currentAuthUser && u.id === currentAuthUser.id) {
              return false; // Exclude current user
            }
            // Only include users that are logged in (isLoggedIn !== false)
            return u.isLoggedIn !== false;
          });
          
          if (otherLoggedInUsers.length > 0) {
            // Find the most recently logged-in user (excluding current)
            const usersWithLoginTime = otherLoggedInUsers.filter(u => u.lastLoginTime);
            if (usersWithLoginTime.length > 0) {
              // Sort by lastLoginTime (most recent first)
              usersWithLoginTime.sort((a, b) => {
                const timeA = new Date(a.lastLoginTime).getTime();
                const timeB = new Date(b.lastLoginTime).getTime();
                return timeB - timeA; // Descending order (most recent first)
              });
              switchToUser = usersWithLoginTime[0];
            } else {
              // No users with login time, use first available logged-in user
              switchToUser = otherLoggedInUsers[0];
            }
          }
        }
      }
    } catch (error) {
      console.error('Error finding another account to switch to:', error);
    }
    
    // If there's another account available, switch to it
    if (switchToUser) {
      console.log('Switching to another account:', switchToUser.name || switchToUser.username);
      
      // Set auth user for the new account
      const authUserData = {
        id: switchToUser.id,
        email: switchToUser.email,
        name: switchToUser.name || switchToUser.username || switchToUser.email?.split('@')[0] || 'User'
      };
      settingsStore.set('authUser', authUserData);
      
      // Update last login time for the switched account
      try {
        const appPath = isDev 
          ? __dirname
          : path.join(app.getAppPath());
        
        let projectRoot = appPath;
        if (isDev) {
          projectRoot = path.resolve(appPath, '..');
        } else {
          projectRoot = path.join(appPath, '..');
        }
        
        const usersPath = path.join(projectRoot, 'user');
        const usersFile = path.join(usersPath, 'users.json');
        
        if (fs.existsSync(usersFile)) {
          const fileContent = fs.readFileSync(usersFile, 'utf8');
          const users = JSON.parse(fileContent);
          
          const userIndex = users.findIndex(u => u.id === switchToUser.id);
          if (userIndex !== -1) {
            users[userIndex].lastLoginTime = new Date().toISOString();
            users[userIndex].isLoggedIn = true; // Mark as logged in
            fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
          }
        }
      } catch (error) {
        console.error('Error updating last login time:', error);
      }
      
      // Update localStorage in main window and dispatch user-changed event
      // Keep main window open - just switch the account
      if (mainWindow && !mainWindow.isDestroyed()) {
        const updateScript = `
          try {
            localStorage.setItem('authUser', JSON.stringify(${JSON.stringify(authUserData)}));
            window.dispatchEvent(new Event('user-changed'));
          } catch (e) {
            console.error('Error updating auth user:', e);
          }
        `;
        mainWindow.webContents.executeJavaScript(updateScript).catch(err => {
          console.error('Error executing update script:', err);
        });
        
        // Ensure main window stays visible and focused
        if (!mainWindow.isVisible()) {
          mainWindow.show();
        }
        mainWindow.focus();
      } else {
        // Main window doesn't exist, create it
        createMainWindow();
      }
    } else {
      // No other accounts available - close main window and open auth window
      console.log('No other accounts available - closing main window and opening auth window');
      
      if (mainWindow && !mainWindow.isDestroyed()) {
        // Close main window
        mainWindow.close();
        mainWindow = null;
        
        // Wait a bit for window to close, then open auth window
        setTimeout(() => {
          if (!authWindow || authWindow.isDestroyed()) {
            createAuthWindow();
          }
        }, 300);
      } else {
        // Main window doesn't exist, just create auth window
        if (!authWindow || authWindow.isDestroyed()) {
          createAuthWindow();
        }
      }
    }
  } catch (error) {
    console.error('Error during logout:', error);
    // Fallback: close main window and open auth window
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.close();
      mainWindow = null;
    }
    if (!authWindow || authWindow.isDestroyed()) {
      createAuthWindow();
    }
  }
});

ipcMain.handle('is-force-auth', () => {
  try { return process.env.KINMA_FORCE_AUTH === '1'; } catch (_) { return false; }
});

// OAuth (PKCE) flow in main process
function buildPkce() {
  const crypto = require('crypto');
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return { verifier, challenge };
}

function providerConfig(provider) {
  const cfg = settingsStore.get('oauthConfig') || {};
  if (provider === 'google') {
    return {
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      userUrl: 'https://openidconnect.googleapis.com/v1/userinfo',
      clientId: cfg.googleClientId,
      scope: 'openid email profile'
    };
  }
  if (provider === 'discord') {
    return {
      authUrl: 'https://discord.com/api/oauth2/authorize',
      tokenUrl: 'https://discord.com/api/oauth2/token',
      userUrl: 'https://discord.com/api/users/@me',
      clientId: cfg.discordClientId,
      scope: 'identify email'
    };
  }
  if (provider === 'github') {
    return {
      authUrl: 'https://github.com/login/oauth/authorize',
      tokenUrl: 'https://github.com/login/oauth/access_token',
      userUrl: 'https://api.github.com/user',
      clientId: cfg.githubClientId,
      scope: 'read:user user:email'
    };
  }
  if (provider === 'microsoft') {
    const base = 'https://login.microsoftonline.com/common/oauth2/v2.0';
    return {
      authUrl: `${base}/authorize`,
      tokenUrl: `${base}/token`,
      userUrl: 'https://graph.microsoft.com/oidc/userinfo',
      clientId: cfg.microsoftClientId,
      scope: 'openid email profile'
    };
  }
  throw new Error('Unknown provider');
}

ipcMain.handle('oauth-start', async (event, { provider, params }) => {
  try {
    const { authUrl, tokenUrl, userUrl, clientId, scope } = providerConfig(provider);
    const redirectUri = (params && params.redirectUri) || (settingsStore.get('oauthConfig') || {}).redirectUri;
    if (!clientId || !redirectUri) throw new Error('OAuth not configured');

    const { verifier, challenge } = buildPkce();
    const state = Math.random().toString(36).slice(2);
    const url = new URL(authUrl);
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', scope);
    url.searchParams.set('code_challenge', challenge);
    url.searchParams.set('code_challenge_method', 'S256');
    url.searchParams.set('state', state);

    const win = new BrowserWindow({
      width: 480, height: 720, show: true, modal: true, parent: authWindow || mainWindow,
      webPreferences: { nodeIntegration: false, contextIsolation: true }
    });

    const result = await new Promise((resolve, reject) => {
      const handler = async (e, navigationUrl) => {
        if (!navigationUrl.startsWith(redirectUri)) return;
        e.preventDefault();
        try { win.destroy(); } catch (_) {}
        const u = new URL(navigationUrl);
        if (u.searchParams.get('state') !== state) return reject(new Error('Invalid state'));
        const code = u.searchParams.get('code');
        if (!code) return reject(new Error('No code'));
        try {
          const params = new URLSearchParams({
            client_id: clientId,
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri,
            code_verifier: verifier
          });
          const tokenResp = await fetch(tokenUrl, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: params.toString() });
          const token = await tokenResp.json();
          if (!token.access_token) return reject(new Error('Token error'));
          const userResp = await fetch(userUrl, { headers: { Authorization: `Bearer ${token.access_token}` }});
          const profile = await userResp.json();
          resolve({ token, profile });
        } catch (err) {
          reject(err);
        }
      };
      win.webContents.on('will-redirect', handler);
      win.on('closed', () => reject(new Error('Window closed')));
      win.loadURL(url.toString());
    });

    // Normalize profile
    let user;
    if (provider === 'google') {
      user = { id: result.profile.sub, email: result.profile.email, name: result.profile.name, avatar: result.profile.picture };
    } else if (provider === 'discord') {
      const p = result.profile; const avatarUrl = p.avatar ? `https://cdn.discordapp.com/avatars/${p.id}/${p.avatar}.png` : null;
      user = { id: p.id, email: p.email, name: p.username, avatar: avatarUrl };
    } else if (provider === 'github') {
      const p = result.profile; // emails may require extra call; fallback
      user = { id: String(p.id), email: p.email || null, name: p.name || p.login, avatar: p.avatar_url };
    } else if (provider === 'microsoft') {
      const p = result.profile; // OIDC userinfo
      user = { id: p.sub, email: p.email || p.preferred_username, name: p.name, avatar: null };
    }
    return { success: true, user };
  } catch (e) {
    return { success: false, error: e.message };
  }
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

// Save game files
ipcMain.handle('save-game-files', async (event, gameId, files) => {
  try {
    // Use the app's base directory instead of user data
    const appPath = isDev 
      ? __dirname  // In development, this is the project folder
      : path.join(app.getAppPath());
    
    // Navigate to the project root
    let projectRoot = appPath;
    if (isDev) {
      // In development, go up from electron.js to get to project root
      projectRoot = path.resolve(appPath, '..');
    } else {
      // In production, look for games folder
      projectRoot = path.join(appPath, '..');
    }
    
    const gamesPath = path.join(projectRoot, 'games', gameId);
    const imgPath = path.join(gamesPath, 'IMG');
    
    // Create game folder and IMG subfolder if they don't exist
    if (!fs.existsSync(gamesPath)) {
      fs.mkdirSync(gamesPath, { recursive: true });
    }
    if (!fs.existsSync(imgPath)) {
      fs.mkdirSync(imgPath, { recursive: true });
    }
    
    const savedPaths = {};
    
    // Define which files are images (go to IMG folder) vs executable (go to root)
    const imageKeys = ['banner', 'logo', 'title', 'card'];
    const screenshotRegex = /^screenshot_\d+$/;
    
    // Save each file
    for (const [key, fileData] of Object.entries(files)) {
      // Determine if this is an image file
      const isImage = imageKeys.includes(key) || screenshotRegex.test(key);
      const targetFolder = isImage ? imgPath : gamesPath;
      
      // Get the extension from the original filename or default
      const ext = path.extname(fileData.name || '');
      const filename = `${key}${ext}`;
      const filePath = path.join(targetFolder, filename);
      
      // Delete old files with the same key but different extensions
      // Check in both the IMG folder and root folder to be safe
      const foldersToCheck = isImage ? [imgPath] : [gamesPath];
      foldersToCheck.forEach(folder => {
        if (fs.existsSync(folder)) {
          const existingFiles = fs.readdirSync(folder);
          existingFiles.forEach(file => {
            // Check if it's the same file type (banner, logo, etc.) but different extension
            const fileBase = file.substring(0, file.lastIndexOf('.'));
            if (fileBase === key && file !== filename) {
              try {
                fs.unlinkSync(path.join(folder, file));
              } catch (err) {
                console.warn(`Could not delete old file ${file}:`, err);
              }
            }
          });
        }
      });
      
      // If it's a data URL, convert to buffer
      let buffer;
      if (fileData.dataURL) {
        const base64Data = fileData.dataURL.split(',')[1];
        buffer = Buffer.from(base64Data, 'base64');
      } else if (fileData.buffer) {
        buffer = Buffer.from(fileData.buffer);
      } else {
        continue;
      }
      
      fs.writeFileSync(filePath, buffer);
      // Store the actual file path for use in Electron
      // Use relative path: IMG/... for images, ... for root files
      const relativePath = isImage ? `IMG/${filename}` : filename;
      savedPaths[key] = `file://${path.join(gamesPath, relativePath).replace(/\\/g, '/')}`;
    }
    
    return { success: true, paths: savedPaths };
  } catch (error) {
    console.error('Error saving game files:', error);
    return { success: false, error: error.message };
  }
});

// Save game metadata to JSON
ipcMain.handle('save-game-metadata', async (event, gameId, metadata) => {
  try {
    const appPath = isDev ? __dirname : path.join(app.getAppPath());
    
    let projectRoot = appPath;
    if (isDev) {
      projectRoot = path.resolve(appPath, '..');
    } else {
      projectRoot = path.join(appPath, '..');
    }
    
    const gamesPath = path.join(projectRoot, 'games', gameId);
    
    // Create game folder if it doesn't exist
    if (!fs.existsSync(gamesPath)) {
      fs.mkdirSync(gamesPath, { recursive: true });
    }
    
    // Save metadata to JSON file
    const metadataPath = path.join(gamesPath, 'metadata.json');
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    
    return { success: true };
  } catch (error) {
    console.error('Error saving game metadata:', error);
    return { success: false, error: error.message };
  }
});

// Get game folder path
ipcMain.handle('get-game-folder-path', async (event, gameId) => {
  try {
    // Use the app's base directory instead of user data
    const appPath = isDev 
      ? __dirname  // In development, this is the project folder
      : path.join(app.getAppPath());
    
    // Navigate to the project root
    let projectRoot = appPath;
    if (isDev) {
      // In development, go up from electron.js to get to project root
      projectRoot = path.resolve(appPath, '..');
    } else {
      // In production, look for games folder
      projectRoot = path.join(appPath, '..');
    }
    
    const gamesPath = path.join(projectRoot, 'games', gameId);
    return gamesPath;
  } catch (error) {
    console.error('Error getting game folder path:', error);
    return null;
  }
});

// Delete specific file from game folder
ipcMain.handle('delete-game-file', async (event, gameId, filename) => {
  try {
    const appPath = isDev ? __dirname : path.join(app.getAppPath());
    let projectRoot = appPath;
    if (isDev) {
      projectRoot = path.resolve(appPath, '..');
    } else {
      projectRoot = path.join(appPath, '..');
    }
    
    const gamesPath = path.join(projectRoot, 'games', gameId);
    const filePath = path.join(gamesPath, filename);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return { success: true };
    }
    return { success: true, message: 'File does not exist' };
  } catch (error) {
    console.error('Error deleting game file:', error);
    return { success: false, error: error.message };
  }
});

// Save game executable
ipcMain.handle('save-game-executable', async (event, gameId, fileData) => {
  try {
    const appPath = isDev ? __dirname : path.join(app.getAppPath());
    
    let projectRoot = appPath;
    if (isDev) {
      projectRoot = path.resolve(appPath, '..');
    } else {
      projectRoot = path.join(appPath, '..');
    }
    
    const gamesPath = path.join(projectRoot, 'games', gameId);
    
    // Create game folder if it doesn't exist
    if (!fs.existsSync(gamesPath)) {
      fs.mkdirSync(gamesPath, { recursive: true });
    }
    
    // Get the original filename or use default
    const originalName = fileData.name || 'game.exe';
    const ext = path.extname(originalName) || '.exe';
    const baseName = path.basename(originalName, ext) || 'game';
    const executableName = `${baseName}${ext}`;
    const executablePath = path.join(gamesPath, executableName);
    
    // Delete old executables in the root folder
    if (fs.existsSync(gamesPath)) {
      const existingFiles = fs.readdirSync(gamesPath);
      existingFiles.forEach(file => {
        // Check if it's an executable file (but not our new file)
        const fileExt = path.extname(file).toLowerCase();
        if ((fileExt === '.exe' || fileExt === '.app' || fileExt === '.deb' || fileExt === '.rpm' || fileExt === '.sh') && file !== executableName) {
          try {
            fs.unlinkSync(path.join(gamesPath, file));
          } catch (err) {
            console.warn(`Could not delete old executable ${file}:`, err);
          }
        }
      });
    }
    
    // Convert file data to buffer
    let buffer;
    if (fileData.buffer) {
      buffer = Buffer.from(fileData.buffer);
    } else if (fileData.dataURL) {
      const base64Data = fileData.dataURL.split(',')[1];
      buffer = Buffer.from(base64Data, 'base64');
    } else if (fileData.filePath && fs.existsSync(fileData.filePath)) {
      // If it's a file path, read the file
      buffer = fs.readFileSync(fileData.filePath);
    } else {
      return { success: false, error: 'No file data provided' };
    }
    
    fs.writeFileSync(executablePath, buffer);
    
    return { 
      success: true, 
      path: `file://${executablePath.replace(/\\/g, '/')}`,
      filename: executableName,
      size: buffer.length
    };
  } catch (error) {
    console.error('Error saving game executable:', error);
    return { success: false, error: error.message };
  }
});

// Get game metadata from JSON
ipcMain.handle('get-game-metadata', async (event, gameId) => {
  try {
    const appPath = isDev ? __dirname : path.join(app.getAppPath());
    
    let projectRoot = appPath;
    if (isDev) {
      projectRoot = path.resolve(appPath, '..');
    } else {
      projectRoot = path.join(appPath, '..');
    }
    
    const gamesPath = path.join(projectRoot, 'games', gameId);
    const metadataPath = path.join(gamesPath, 'metadata.json');
    
    if (fs.existsSync(metadataPath)) {
      const metadataContent = fs.readFileSync(metadataPath, 'utf8');
      return { success: true, metadata: JSON.parse(metadataContent) };
    }
    
    return { success: false, error: 'Metadata file not found' };
  } catch (error) {
    console.error('Error getting game metadata:', error);
    return { success: false, error: error.message };
  }
});

// Convert file:// URL to data URL for display
ipcMain.handle('file-to-data-url', async (event, filePath) => {
  try {
    // Remove file:// prefix if present
    let actualPath = filePath.replace(/^file:\/\//, '');
    
    // Decode URL encoding
    actualPath = decodeURIComponent(actualPath);
    
    // Normalize path separators
    actualPath = actualPath.replace(/\//g, path.sep);
    
    // Check if file exists
    if (!fs.existsSync(actualPath)) {
      return { success: false, error: 'File not found' };
    }
    
    // Read file as buffer
    const buffer = fs.readFileSync(actualPath);
    
    // Get file extension to determine MIME type
    const ext = path.extname(actualPath).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.bmp': 'image/bmp',
      '.svg': 'image/svg+xml'
    };
    
    const mimeType = mimeTypes[ext] || 'image/png';
    
    // Convert to base64 data URL
    const base64 = buffer.toString('base64');
    const dataURL = `data:${mimeType};base64,${base64}`;
    
    return { success: true, dataURL };
  } catch (error) {
    console.error('Error converting file to data URL:', error);
    return { success: false, error: error.message };
  }
});

// Delete game folder
ipcMain.handle('delete-game-folder', async (event, gameId) => {
  try {
    const appPath = isDev 
      ? __dirname  
      : path.join(app.getAppPath());
    
    let projectRoot = appPath;
    if (isDev) {
      projectRoot = path.resolve(appPath, '..');
    } else {
      projectRoot = path.join(appPath, '..');
    }
    
    const gamesPath = path.join(projectRoot, 'games', gameId);
    
    // Check if folder exists
    if (fs.existsSync(gamesPath)) {
      // Recursively delete all files and folders
      const deleteFolderRecursive = (folderPath) => {
        if (fs.existsSync(folderPath)) {
          fs.readdirSync(folderPath).forEach((file) => {
            const curPath = path.join(folderPath, file);
            if (fs.lstatSync(curPath).isDirectory()) {
              deleteFolderRecursive(curPath);
            } else {
              fs.unlinkSync(curPath);
            }
          });
          fs.rmdirSync(folderPath);
        }
      };
      
      deleteFolderRecursive(gamesPath);
      
      return { success: true };
    } else {
      return { success: true, message: 'Folder does not exist' };
    }
  } catch (error) {
    console.error('Error deleting game folder:', error);
    return { success: false, error: error.message };
  }
});

// Save users to file system
ipcMain.handle('save-users', async (event, users) => {
  try {
    // Use the app's base directory
    const appPath = isDev 
      ? __dirname  // In development, this is the public folder
      : path.join(app.getAppPath());
    
    // Navigate to the project root (same logic as games)
    let projectRoot = appPath;
    if (isDev) {
      // In development, go up from public/electron.js to get to project root
      projectRoot = path.resolve(appPath, '..');
    } else {
      // In production, go up from app path
      projectRoot = path.join(appPath, '..');
    }
    
    const usersPath = path.join(projectRoot, 'user');
    
    // Log the path for debugging
    console.log('Saving users to:', usersPath);
    
    // Create user folder if it doesn't exist
    if (!fs.existsSync(usersPath)) {
      fs.mkdirSync(usersPath, { recursive: true });
      console.log('Created user directory:', usersPath);
    }
    
    // Save users as JSON file
    const usersFile = path.join(usersPath, 'users.json');
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2), 'utf8');
    
    console.log('Users saved successfully to:', usersFile);
    return { success: true, path: usersFile };
  } catch (error) {
    console.error('Error saving users:', error);
    return { success: false, error: error.message };
  }
});

// Load users from file system
ipcMain.handle('get-users', async () => {
  try {
    // Use the app's base directory (same logic as save-users)
    const appPath = isDev 
      ? __dirname  // In development, this is the public folder
      : path.join(app.getAppPath());
    
    // Navigate to the project root
    let projectRoot = appPath;
    if (isDev) {
      // In development, go up from public/electron.js to get to project root
      projectRoot = path.resolve(appPath, '..');
    } else {
      // In production, go up from app path
      projectRoot = path.join(appPath, '..');
    }
    
    const usersPath = path.join(projectRoot, 'user');
    const usersFile = path.join(usersPath, 'users.json');
    
    // Log the path for debugging
    console.log('Loading users from:', usersFile);
    
    // Check if users file exists
    if (!fs.existsSync(usersFile)) {
      console.log('Users file does not exist, returning empty array');
      return { success: true, users: [] };
    }
    
    // Read and parse users file
    const fileContent = fs.readFileSync(usersFile, 'utf8');
    const users = JSON.parse(fileContent);
    
    console.log('Loaded', users.length, 'users from file');
    return { success: true, users: Array.isArray(users) ? users : [] };
  } catch (error) {
    console.error('Error loading users:', error);
    // Return empty array on error
    return { success: true, users: [] };
  }
});

// Delete all users from file system and cache
ipcMain.handle('clear-all-users', async () => {
  try {
    // Clear from file system
    const appPath = isDev 
      ? __dirname
      : path.join(app.getAppPath());
    
    let projectRoot = appPath;
    if (isDev) {
      projectRoot = path.resolve(appPath, '..');
    } else {
      projectRoot = path.join(appPath, '..');
    }
    
    const usersPath = path.join(projectRoot, 'user');
    const usersFile = path.join(usersPath, 'users.json');
    
    // Delete users.json file if it exists
    if (fs.existsSync(usersFile)) {
      fs.unlinkSync(usersFile);
      console.log('Deleted users.json file');
    }
    
    // Optionally delete the entire user folder (you can remove this if you want to keep the folder)
    // if (fs.existsSync(usersPath)) {
    //   fs.rmdirSync(usersPath);
    //   console.log('Deleted user folder');
    // }
    
    return { success: true };
  } catch (error) {
    console.error('Error clearing users:', error);
    return { success: false, error: error.message };
  }
});

// Open a new auth window with the same dimensions as the current window
ipcMain.handle('open-auth-window', (event) => {
  try {
    const currentWindow = BrowserWindow.fromWebContents(event.sender);
    if (!currentWindow) {
      return { success: false, error: 'Current window not found' };
    }
    
    // Get current window dimensions BEFORE closing
    const [width, height] = currentWindow.getSize();
    
    // Create new auth window with same dimensions BEFORE closing the old one
    const newAuthWindow = new BrowserWindow({
      width: width,
      height: height,
      resizable: false,
      maximizable: false,
      fullscreenable: false,
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
      ? 'http://localhost:3000#/auth?addAccount=true' 
      : `file://${path.join(__dirname, '../build/index.html')}#/auth?addAccount=true`;
    
    newAuthWindow.loadURL(startUrl);
    
    newAuthWindow.once('ready-to-show', () => {
      newAuthWindow.center();
      newAuthWindow.show();
      newAuthWindow.focus();
      
      // Close the old window after the new one is shown
      setTimeout(() => {
        if (currentWindow && !currentWindow.isDestroyed()) {
          currentWindow.close();
        }
      }, 100);
    });
    
    // Ensure the renderer is on the /auth route with addAccount parameter (works in dev and prod)
    newAuthWindow.webContents.once('did-finish-load', () => {
      const navigateToAuth = `
        try {
          if (window.location.pathname !== '/auth' || !window.location.search.includes('addAccount=true')) {
            window.history.pushState({}, '', '/auth?addAccount=true');
            window.dispatchEvent(new Event('popstate'));
          }
        } catch (e) {}
      `;
      newAuthWindow.webContents.executeJavaScript(navigateToAuth).catch(() => {});
    });
    
    if (isDev) {
      newAuthWindow.webContents.openDevTools({ mode: 'detach' });
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error opening auth window:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('open-account-switcher-window', (event) => {
  try {
    const currentWindow = BrowserWindow.fromWebContents(event.sender);
    if (!currentWindow) {
      return { success: false, error: 'Current window not found' };
    }
    
    // Get current window dimensions BEFORE closing
    const [width, height] = currentWindow.getSize();
    
    // Account switcher should always be 700px wide
    const accountSwitcherWidth = 700;
    
    // Create new account switcher window FIRST (before closing old one)
    accountSwitcherWindow = new BrowserWindow({
      width: accountSwitcherWidth,
      height: height,
      resizable: false, // User cannot resize, but app can resize programmatically
      maximizable: false,
      fullscreenable: false,
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
      ? 'http://localhost:3000/account-switcher' 
      : `file://${path.join(__dirname, '../build/index.html')}#/account-switcher`;
    
    accountSwitcherWindow.loadURL(startUrl);
    
    // Center the window
    accountSwitcherWindow.center();
    
    // Show window when ready, THEN close the old window
    accountSwitcherWindow.once('ready-to-show', () => {
      accountSwitcherWindow.show();
      accountSwitcherWindow.focus();
      
      // Close the old window AFTER the new one is shown
      setTimeout(() => {
        if (currentWindow && !currentWindow.isDestroyed()) {
          currentWindow.close();
        }
      }, 150);
    });
    
    // Ensure the renderer is on the /account-switcher route
    accountSwitcherWindow.webContents.once('did-finish-load', () => {
      const navigateToAccountSwitcher = `
        try {
          if (window.location.pathname !== '/account-switcher') {
            window.history.pushState({}, '', '/account-switcher');
            window.dispatchEvent(new Event('popstate'));
          }
        } catch (e) {}
      `;
      accountSwitcherWindow.webContents.executeJavaScript(navigateToAccountSwitcher);
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error opening account switcher window:', error);
    return { success: false, error: error.message };
  }
});
