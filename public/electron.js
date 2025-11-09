const { app, BrowserWindow, Menu, ipcMain, dialog, shell, globalShortcut, screen } = require('electron');
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
let adminWindow; // Track admin window
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
  
  // IMPORTANT: Check if auth window exists - if so, don't create main window
  // This prevents main window from being created when user is trying to log in
  if (authWindow && !authWindow.isDestroyed()) {
    console.log('⚠️ Auth window exists - not creating main window');
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
    width: 1200,
    height: 720,
    minWidth: 1200,
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

  // Set 15:9 aspect ratio for minimum size constraint
  try {
    mainWindow.setAspectRatio(15/9);
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
    if (authWindow && !authWindow.isDestroyed()) {
    authWindow.center();
    authWindow.show();
    try { authWindow.setAspectRatio(1/1.5); } catch (_) {}
    }
  });

  // Ensure the renderer is on the /auth route (works in dev and prod)
  authWindow.webContents.once('did-finish-load', () => {
    if (authWindow && !authWindow.isDestroyed()) {
    const navigateToAuth = `
      try {
        if (window.location.pathname !== '/auth') {
          window.history.pushState({}, '', '/auth');
          window.dispatchEvent(new Event('popstate'));
        }
      } catch (e) {}
    `;
    authWindow.webContents.executeJavaScript(navigateToAuth).catch(() => {});
    }
  });

  if (isDev) {
    if (authWindow && !authWindow.isDestroyed()) {
    authWindow.webContents.openDevTools({ mode: 'detach' });
    }
  }
}

// Admin credentials - customize these
const ADMIN_CREDENTIALS = {
  email: 'admin@kinma.app',
  username: 'admin',
  password: 'admin123' // Change this to your secure password
};

// Check if current user matches admin credentials
function isAdminUser(user) {
  if (!user) return false;
  
  // Check email
  const emailMatch = user.email && user.email.toLowerCase() === ADMIN_CREDENTIALS.email.toLowerCase();
  
  // Check username
  const usernameMatch = (user.username && user.username.toLowerCase() === ADMIN_CREDENTIALS.username.toLowerCase()) ||
                       (user.name && user.name.toLowerCase() === ADMIN_CREDENTIALS.username.toLowerCase());
  
  // Get password from users.json
  try {
    const appPath = isDev ? __dirname : path.join(app.getAppPath());
    let projectRoot = appPath;
    if (isDev) {
      projectRoot = path.resolve(appPath, '..');
    } else {
      projectRoot = path.join(appPath, '..');
    }
    
    const usersPath = path.join(projectRoot, 'user');
    const usersFile = path.join(usersPath, 'users.json');
    
    if (fs.existsSync(usersFile)) {
      const users = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
      const userData = users.find(u => u.id === user.id || u.email === user.email);
      
      if (userData) {
        const passwordMatch = userData.password === ADMIN_CREDENTIALS.password;
        return emailMatch && usernameMatch && passwordMatch;
      }
    }
  } catch (error) {
    console.error('Error checking admin credentials:', error);
  }
  
  return false;
}

function createAdminWindow() {
  // Don't create if admin window already exists and is not destroyed
  if (adminWindow && !adminWindow.isDestroyed()) {
    adminWindow.focus();
    return { success: true };
  }
  
  // Check if current user is admin
  const authUser = settingsStore.get('authUser');
  if (!authUser || !isAdminUser(authUser)) {
    console.log('Cannot create admin window - user is not admin');
    return { success: false, error: 'Unauthorized: Admin access required' };
  }
  
  adminWindow = new BrowserWindow({
    width: 1000,
    height: 600,
    minWidth: 1000,
    minHeight: 600,
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
    ? 'http://localhost:3000#/admin-window' 
    : `file://${path.join(__dirname, '../build/index.html')}#/admin-window`;

  adminWindow.loadURL(startUrl);

  adminWindow.once('ready-to-show', () => {
    // Verify user is still admin before showing
    if (adminWindow && !adminWindow.isDestroyed()) {
      const authUser = settingsStore.get('authUser');
      if (authUser && isAdminUser(authUser)) {
        adminWindow.center();
        adminWindow.show();
        adminWindow.focus();
      } else {
        console.log('Admin window ready but user is no longer admin - closing window');
        adminWindow.close();
        adminWindow = null;
      }
    }
  });

  // Ensure the renderer is on the /admin-window route
  adminWindow.webContents.once('did-finish-load', () => {
    const navigateToAdmin = `
      try {
        if (window.location.hash !== '#/admin-window') {
          window.location.hash = '/admin-window';
          window.dispatchEvent(new Event('hashchange'));
        }
      } catch (e) {}
    `;
    adminWindow.webContents.executeJavaScript(navigateToAdmin).catch(() => {});
  });

  if (isDev) {
    adminWindow.webContents.openDevTools({ mode: 'detach' });
  }
  
  return { success: true };
}

// Helper function to get users from file
function getUsersFromFile() {
  try {
    const appPath = isDev ? __dirname : path.join(app.getAppPath());
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
      return JSON.parse(fileContent);
    }
  } catch (error) {
    console.error('Error reading users file:', error);
  }
  return [];
}

// Helper function to save users to file
function saveUsersToFile(users) {
  try {
    const appPath = isDev ? __dirname : path.join(app.getAppPath());
    let projectRoot = appPath;
    if (isDev) {
      projectRoot = path.resolve(appPath, '..');
    } else {
      projectRoot = path.join(appPath, '..');
    }
    
    const usersPath = path.join(projectRoot, 'user');
    const usersFile = path.join(usersPath, 'users.json');
    
    if (!fs.existsSync(usersPath)) {
      fs.mkdirSync(usersPath, { recursive: true });
    }
    
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error saving users file:', error);
    return false;
  }
}

// Helper function to find and auto-login user
function findAutoLoginUser() {
  try {
    const users = getUsersFromFile();
    if (!Array.isArray(users) || users.length === 0) {
      return null;
    }
    
    // Find users with stayLoggedIn: true and isLoggedIn: true
    const stayLoggedInUsers = users.filter(u => 
      u.stayLoggedIn === true && 
      u.isLoggedIn === true
    );
    
    if (stayLoggedInUsers.length === 0) {
      return null;
    }
    
    // Sort by lastLoginTime (most recent first)
    stayLoggedInUsers.sort((a, b) => {
      const timeA = a.lastLoginTime ? new Date(a.lastLoginTime).getTime() : 0;
      const timeB = b.lastLoginTime ? new Date(b.lastLoginTime).getTime() : 0;
      return timeB - timeA; // Descending order (most recent first)
    });
    
    return stayLoggedInUsers[0];
  } catch (error) {
    console.error('Error finding auto-login user:', error);
    return null;
  }
}

// Helper function to check if there are any logged-in accounts
function hasLoggedInAccounts() {
  try {
    const users = getUsersFromFile();
    if (!Array.isArray(users) || users.length === 0) {
      return false;
    }
    
    // Check if there are any users with isLoggedIn: true
    const loggedInUsers = users.filter(u => u.isLoggedIn === true);
    return loggedInUsers.length > 0;
  } catch (error) {
    console.error('Error checking for logged-in accounts:', error);
    return false;
  }
}

// Helper function to check if there are any accounts that haven't been removed from switcher
function hasAccountsInSwitcher() {
  try {
    const users = getUsersFromFile();
    if (!Array.isArray(users) || users.length === 0) {
      return false;
    }
    
    // Check if there are any users that haven't been hidden from switcher
    const visibleAccounts = users.filter(u => u.hiddenInSwitcher !== true);
    return visibleAccounts.length > 0;
  } catch (error) {
    console.error('Error checking for accounts in switcher:', error);
    return false;
  }
}

app.whenReady().then(async () => {
  const forceAuth = process.env.KINMA_FORCE_AUTH === '1';
  if (forceAuth) {
    createAuthWindow();
    return;
  }
  
  // FIRST: Check if there's a user that should be auto-logged in (didn't log out)
  // This takes priority - if user didn't log out, auto-login them directly
  const autoLoginUser = findAutoLoginUser();
  
  if (autoLoginUser) {
    // User didn't log out - auto-login them directly to main window
    const authUserData = {
      id: autoLoginUser.id,
      email: autoLoginUser.email,
      name: autoLoginUser.name || autoLoginUser.username || autoLoginUser.email?.split('@')[0] || 'User'
    };
    settingsStore.set('authUser', authUserData);
    console.log('✅ Auto-logging in with user (didn\'t log out):', authUserData.name || authUserData.email);
    createMainWindow();
    return;
  }
  
  // SECOND: If no auto-login user, check if there are any accounts in the switcher (not removed)
  const hasAccounts = hasAccountsInSwitcher();
  
  if (hasAccounts) {
    // There are accounts in the switcher - open account switcher window
    console.log('Found accounts in switcher - opening account switcher');
    
    // Clear authUser from settingsStore to prevent main window from being created
    // The user will select an account from the account switcher
    settingsStore.delete('authUser');
    
    // Ensure main window is not created
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.close();
      mainWindow = null;
    }
    
    // Create account switcher window - 30% of screen size in 14:9 format (narrower than 16:9)
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
    // Calculate width based on 30% of screen width, then calculate height for 14:9
    const accountSwitcherWidth = Math.round(screenWidth * 0.30);
    const accountSwitcherHeight = Math.round(accountSwitcherWidth * (9 / 14));
    
    accountSwitcherWindow = new BrowserWindow({
      width: accountSwitcherWidth,
      height: accountSwitcherHeight,
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
      ? 'http://localhost:3000/account-switcher' 
      : `file://${path.join(__dirname, '../build/index.html')}#/account-switcher`;
    
    accountSwitcherWindow.loadURL(startUrl);
    
    accountSwitcherWindow.once('ready-to-show', () => {
      if (accountSwitcherWindow && !accountSwitcherWindow.isDestroyed()) {
        accountSwitcherWindow.center();
        accountSwitcherWindow.show();
        accountSwitcherWindow.focus();
      }
    });
    
    if (isDev) {
      accountSwitcherWindow.webContents.openDevTools({ mode: 'detach' });
    }
  } else {
    // No accounts in switcher and no auto-login user - show auth window
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
    // FIRST: Check if there's a user that should be auto-logged in (didn't log out)
    const autoLoginUser = findAutoLoginUser();
    
    if (autoLoginUser) {
      // User didn't log out - auto-login them directly to main window
      const authUserData = {
        id: autoLoginUser.id,
        email: autoLoginUser.email,
        name: autoLoginUser.name || autoLoginUser.username || autoLoginUser.email?.split('@')[0] || 'User'
      };
      settingsStore.set('authUser', authUserData);
      console.log('✅ Auto-logging in with user (didn\'t log out):', authUserData.name || authUserData.email);
      createMainWindow();
      return;
    }
    
    // SECOND: If no auto-login user, check if there are any accounts in the switcher (not removed)
    const hasAccounts = hasAccountsInSwitcher();
    
    if (hasAccounts) {
      // There are accounts in the switcher - open account switcher window
      // Clear authUser to prevent main window from being created
      settingsStore.delete('authUser');
      
      // Ensure main window is not created
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.close();
        mainWindow = null;
      }
      
      if (!accountSwitcherWindow || accountSwitcherWindow.isDestroyed()) {
        // Account switcher window - 30% of screen size in 14:9 format
        const primaryDisplay = screen.getPrimaryDisplay();
        const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
        // Calculate width based on 30% of screen width, then calculate height for 14:9
        const accountSwitcherWidth = Math.round(screenWidth * 0.30);
        const accountSwitcherHeight = Math.round(accountSwitcherWidth * (9 / 14));
        
        accountSwitcherWindow = new BrowserWindow({
          width: accountSwitcherWidth,
          height: accountSwitcherHeight,
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
          ? 'http://localhost:3000/account-switcher' 
          : `file://${path.join(__dirname, '../build/index.html')}#/account-switcher`;
        
        accountSwitcherWindow.loadURL(startUrl);
        
        accountSwitcherWindow.once('ready-to-show', () => {
          if (accountSwitcherWindow && !accountSwitcherWindow.isDestroyed()) {
            accountSwitcherWindow.center();
            accountSwitcherWindow.show();
            accountSwitcherWindow.focus();
          }
        });
        
        if (isDev) {
          accountSwitcherWindow.webContents.openDevTools({ mode: 'detach' });
        }
      }
    } else {
      // No accounts in switcher and no auto-login user - show auth window
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

  // If closing account switcher, only auto-login if there's a user that is actually logged in
  // BUT ONLY if no auth window is being opened (check if auth window exists and is visible)
  if (isAccountSwitcher) {
    try {
      console.log('🔄 Account switcher window closing - determining next action');
      
      // FIRST: Check if auth window exists - if so, don't do anything
      // This is the most important check - if auth window exists, user is trying to log in
      let authWindowExists = false;
      try {
        // Check the global authWindow variable FIRST (fastest check)
        if (authWindow && !authWindow.isDestroyed()) {
          authWindowExists = true;
          console.log('✅ Auth window variable exists - skipping auto-login');
        }
        
        // Also check all BrowserWindow instances to see if any auth window exists
        if (!authWindowExists) {
          const allWindows = BrowserWindow.getAllWindows();
          for (const win of allWindows) {
            if (win && !win.isDestroyed() && win !== senderWindow) {
              try {
                const url = win.webContents.getURL();
                if (url && (url.includes('/auth') || url.includes('addAccount=true'))) {
                  authWindowExists = true;
                  console.log('✅ Auth window detected in open windows - skipping auto-login');
                  break;
                }
              } catch (e) {
                // Ignore error checking URL
              }
            }
          }
        }
      } catch (e) {
        console.error('Error checking for auth window:', e);
      }
      
      // If auth window exists, don't auto-login - just close account switcher
      if (authWindowExists) {
        console.log('✅ Auth window is open - NOT opening main window');
        console.log('✅ Account switcher will close, auth window will remain open');
        // IMPORTANT: Don't open main window - just close the account switcher
        // The auth window should handle the login flow
        return; // Just close the account switcher, don't open main window
      }
      
      // SECOND: Check if authUser exists in settingsStore
      // If it doesn't exist, don't try to open main window
      const authUser = settingsStore.get('authUser');
      if (!authUser || !authUser.id) {
        console.log('⚠️ No authUser in settingsStore - not opening main window');
        return; // Just close the account switcher, don't open main window
      }
      
      // THIRD: Only if auth window doesn't exist AND authUser exists, check for logged-in users
      console.log('⚠️ No auth window detected - checking for logged-in users');
      
      // Get users and find one that is actually logged in (isLoggedIn === true)
      let loggedInUser = null;
      try {
        const users = getUsersFromFile();
          
          if (Array.isArray(users) && users.length > 0) {
          // Filter for users that are actually logged in
          const loggedInUsers = users.filter(u => u.isLoggedIn === true);
          
          if (loggedInUsers.length > 0) {
            // Sort by last login time (most recent first)
            const usersWithLoginTime = loggedInUsers.filter(u => u.lastLoginTime);
            if (usersWithLoginTime.length > 0) {
              usersWithLoginTime.sort((a, b) => {
                const timeA = new Date(a.lastLoginTime).getTime();
                const timeB = new Date(b.lastLoginTime).getTime();
                return timeB - timeA; // Descending order (most recent first)
              });
              loggedInUser = usersWithLoginTime[0];
            } else {
              loggedInUser = loggedInUsers[0];
            }
          }
        }
      } catch (error) {
        console.error('Error getting logged-in user:', error);
      }
      
      if (loggedInUser && loggedInUser.isLoggedIn === true) {
        console.log('Found logged-in user:', loggedInUser.email || loggedInUser.username);
        
        // Set auth user in Electron store
        const authUserData = {
          id: loggedInUser.id,
          email: loggedInUser.email,
          name: loggedInUser.name || loggedInUser.username || loggedInUser.email?.split('@')[0] || 'User'
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
        console.log('No logged-in user found - not opening main window');
        // No logged-in user - don't open main window or auth window
        // The auth window should already be open if user clicked on a logged-out account
        // Just close the account switcher
      }
    } catch (error) {
      console.error('Error handling account switcher close:', error);
      // Don't auto-login on error - let user choose
        }
      } else {
    // For other windows, just close them
  senderWindow.close();
  }
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

ipcMain.handle('get-screen-size', () => {
  try {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    return { width, height, success: true };
  } catch (e) {
    return { width: 1920, height: 1080, success: false };
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
  // IMPORTANT: If main window is already open and visible, and user is already authenticated,
  // don't do anything - this prevents interference with normal operation
  const currentAuthUser = settingsStore.get('authUser');
  if (mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible() && currentAuthUser && currentAuthUser.id === user.id) {
    console.log('⚠️ Main window already open and user already authenticated - skipping auth-success handler');
    // Still update user data (login time, etc.) but don't mess with windows
    try {
      const users = getUsersFromFile();
      const userIndex = users.findIndex(u => u.id === user.id);
      if (userIndex !== -1) {
        users[userIndex].isLoggedIn = true;
        users[userIndex].lastLoginTime = new Date().toISOString();
        users[userIndex].hiddenInSwitcher = false;
        saveUsersToFile(users);
      }
    } catch (error) {
      console.error('Error updating user data:', error);
    }
    return; // Exit early - don't interfere with main window
  }
  
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
    
    // Mark user as logged in in users.json
    const users = getUsersFromFile();
    const userIndex = users.findIndex(u => u.id === user.id);
    if (userIndex !== -1) {
      users[userIndex].isLoggedIn = true;
      users[userIndex].lastLoginTime = new Date().toISOString();
      // IMPORTANT: Clear hiddenInSwitcher flag when user logs in - account should be visible again
      users[userIndex].hiddenInSwitcher = false;
      saveUsersToFile(users);
      console.log('Marked user as logged in and made visible in switcher:', user.email || user.username);
    } else {
      // User doesn't exist in users.json - add them
      const newUser = {
        ...user,
        isLoggedIn: true,
        lastLoginTime: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        hiddenInSwitcher: false // New users should be visible
      };
      users.push(newUser);
      saveUsersToFile(users);
      console.log('Added new user and marked as logged in:', user.email || user.username);
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
  
  // Get the authenticated user (should already be set above)
  const authUser = settingsStore.get('authUser');
  if (!authUser || !authUser.id) {
    console.error('Cannot show main window - authUser not properly set');
    return;
  }
  
  // Function to open main window after all other windows are closed
  const openMainWindowAfterClose = () => {
    // IMPORTANT: Don't create or modify main window if it's already open and visible
    // This prevents interference with normal operation
    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible()) {
      console.log('⚠️ Main window already open and visible - skipping window operations');
      return; // Don't do anything - let the main window work normally
  }
  
  // Ensure main window exists (only create if it doesn't exist and user is authenticated)
  if (!mainWindow || mainWindow.isDestroyed()) {
    console.log('Creating main window...');
    createMainWindow();
  }
  };
  
  // Handle showing the main window if it already exists
  // This ensures the main window is shown properly without interfering with normal operation
  const showMainWindowIfExists = () => {
    // Only show the main window if it exists and is not visible
    // Don't interfere with the main window if it's already visible and working
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
            mainWindow.show();
      mainWindow.focus();
            console.log('Main window shown');
          }
    // If main window is already visible, don't do anything - let it work normally
  };
  
  // Close all windows first, then open main window after they're fully closed
  let windowsToClose = [];
  
  // Collect all windows that need to be closed
  // IMPORTANT: Never close the main window - only close auth/account switcher windows
  if (authWindow && !authWindow.isDestroyed() && authWindow !== mainWindow) {
    windowsToClose.push(authWindow);
  }
  
  if (accountSwitcherWindow && !accountSwitcherWindow.isDestroyed() && accountSwitcherWindow !== mainWindow) {
    windowsToClose.push(accountSwitcherWindow);
  }
  
  if (senderWindow && senderWindow !== mainWindow && !senderWindow.isDestroyed()) {
    // Check if sender is an auth or account switcher window
    // IMPORTANT: Never close the main window - only close auth/account switcher windows
    try {
      const url = senderWindow.webContents.getURL();
      if (url.includes('/auth') || url.includes('addAccount=true') || url.includes('/account-switcher')) {
        if (!windowsToClose.includes(senderWindow) && senderWindow !== mainWindow) {
          windowsToClose.push(senderWindow);
        }
      }
    } catch (e) {
      // If we can't check URL, only add it if it's definitely not mainWindow
      // Don't add it if we're unsure - better to leave it open than close the main window
      // Only add if we can verify it's not the main window
    }
  }
  
  // Close all windows, then open main window after the last one closes
  if (windowsToClose.length > 0) {
    let closedCount = 0;
    const totalWindows = windowsToClose.length;
    
    windowsToClose.forEach((win) => {
      if (win === authWindow) {
        authWindow = null;
      }
      if (win === accountSwitcherWindow) {
        accountSwitcherWindow = null;
      }
      
      win.once('closed', () => {
        closedCount++;
        if (closedCount === totalWindows) {
          // All windows closed, now open main window
          console.log('✅ All windows closed - opening main window');
          openMainWindowAfterClose();
          // Show the main window if it already exists
          showMainWindowIfExists();
        }
      });
      win.close();
    });
  } else {
    // No windows to close, open main window immediately
    openMainWindowAfterClose();
    // Show the main window if it already exists
    showMainWindowIfExists();
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
            '(function() { try { const authUser = localStorage.getItem("authUser"); return authUser ? JSON.parse(authUser) : null; } catch (e) { return null; } })()'
          );
          
          if (authUserFromLocalStorage && authUserFromLocalStorage.id) {
            currentAuthUser = authUserFromLocalStorage;
            settingsStore.set('authUser', currentAuthUser);
          }
        } catch (error) {
          console.error('Error reading authUser from localStorage:', error);
        }
      }
    }
    
    if (!currentAuthUser || !currentAuthUser.id) {
      console.log('No current user to logout');
      // Still show auth window if no user
      if (!authWindow || authWindow.isDestroyed()) {
        createAuthWindow();
      }
      return { success: true };
    }
    
    console.log('Logging out from account:', currentAuthUser.name || currentAuthUser.email);
    
    // Mark current user as logged out (temporary session termination)
    // IMPORTANT: Only set isLoggedIn: false, NEVER set hiddenInSwitcher: true
    // Accounts should remain visible in the account switcher until explicitly removed
    const users = getUsersFromFile();
        const userIndex = users.findIndex(u => u.id === currentAuthUser.id);
        if (userIndex !== -1) {
          users[userIndex].isLoggedIn = false;
      // IMPORTANT: Do NOT set hiddenInSwitcher: true here - account should remain visible
      saveUsersToFile(users);
      console.log('Marked user as logged out (temporary session termination)');
    }
    
    // Clear auth user from settingsStore
    settingsStore.delete('authUser');
    
    // Clear localStorage in main window
    if (mainWindow && !mainWindow.isDestroyed()) {
      try {
        await mainWindow.webContents.executeJavaScript(`
          (function() {
          try {
            localStorage.removeItem('authUser');
              window.dispatchEvent(new Event('user-changed'));
          } catch (e) {
            console.error('Error clearing localStorage:', e);
          }
          })();
        `);
      } catch (error) {
        console.error('Error clearing localStorage:', error);
      }
    }
    
    // Close main window FIRST, then open account switcher after it's fully closed
    const openAccountSwitcher = () => {
      console.log('Opening account switcher window');
    
    // Create account switcher window - 30% of screen size in 14:9 format (narrower than 16:9)
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
    // Calculate width based on 30% of screen width, then calculate height for 14:9
    const accountSwitcherWidth = Math.round(screenWidth * 0.30);
    const accountSwitcherHeight = Math.round(accountSwitcherWidth * (9 / 14));
    
    // Close existing account switcher if it exists
    if (accountSwitcherWindow && !accountSwitcherWindow.isDestroyed()) {
      accountSwitcherWindow.close();
      accountSwitcherWindow = null;
    }
    
    accountSwitcherWindow = new BrowserWindow({
      width: accountSwitcherWidth,
      height: accountSwitcherHeight,
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
      ? 'http://localhost:3000/account-switcher' 
      : `file://${path.join(__dirname, '../build/index.html')}#/account-switcher`;
    
    accountSwitcherWindow.loadURL(startUrl);
    
    accountSwitcherWindow.once('ready-to-show', () => {
      if (accountSwitcherWindow && !accountSwitcherWindow.isDestroyed()) {
        accountSwitcherWindow.center();
        accountSwitcherWindow.show();
        accountSwitcherWindow.focus();
      }
    });
    
    if (isDev) {
      accountSwitcherWindow.webContents.openDevTools({ mode: 'detach' });
    }
    };
    
    // Close main window first, wait for it to fully close, then open account switcher
      if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.once('closed', () => {
        mainWindow = null;
        openAccountSwitcher();
      });
      mainWindow.close();
      } else {
      // No main window to close, open account switcher immediately
      openAccountSwitcher();
        }
    
    return { success: true, switched: false };
  } catch (error) {
    console.error('Error during logout:', error);
    // Fallback: show auth window
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.close();
      mainWindow = null;
    }
    if (!authWindow || authWindow.isDestroyed()) {
      createAuthWindow();
    }
    return { success: false, error: error.message };
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

// Open a new auth window - completely separate from other windows
ipcMain.handle('open-auth-window', (event, email = '') => {
  try {
    const currentWindow = BrowserWindow.fromWebContents(event.sender);
    if (!currentWindow) {
      return { success: false, error: 'Current window not found' };
    }
    
    console.log('🔐 Opening auth window for logged-out account');
    console.log('📧 Email parameter received:', email);
    
    // IMPORTANT: Clear authUser from settingsStore FIRST to prevent main window from being created
    // This ensures that when the account switcher closes, it won't try to open main window
    settingsStore.delete('authUser');
    console.log('✅ Cleared authUser from settingsStore');
    
    // IMPORTANT: Close main window if it exists - we don't want it open when opening auth
    if (mainWindow && !mainWindow.isDestroyed()) {
      console.log('⚠️ Closing main window - opening auth window instead');
      mainWindow.close();
      mainWindow = null;
    }
    
    // Use standard auth window dimensions (not account switcher dimensions)
    const authWindowWidth = 600;
    const authWindowHeight = 800;
    
    // Close existing auth window if it exists
    if (authWindow && !authWindow.isDestroyed()) {
      authWindow.close();
      authWindow = null;
    }
    
    // Create auth window AFTER current window is fully closed
    const createAuthWindowAfterClose = () => {
      // Create new auth window with standard auth dimensions
    const newAuthWindow = new BrowserWindow({
        width: authWindowWidth,
        height: authWindowHeight,
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
    
      // Store reference in global authWindow variable IMMEDIATELY
      // This allows the close-window handler to detect the auth window
      authWindow = newAuthWindow;
      console.log('✅ Auth window created and stored in global variable');
      
      // Build URL with email parameter if provided
      // IMPORTANT: Use pathname routing (not hash) since app uses BrowserRouter
      const emailParam = email ? `&email=${encodeURIComponent(email)}` : '';
    const startUrl = isDev 
        ? `http://localhost:3000/auth?addAccount=true${emailParam}` 
        : `file://${path.join(__dirname, '../build/index.html')}/auth?addAccount=true${emailParam}`;
    
      console.log('🔐 Loading auth window with URL:', startUrl);
      console.log('📧 Email param in URL:', emailParam);
      console.log('📧 Full email value:', email);
    newAuthWindow.loadURL(startUrl);
    
    newAuthWindow.once('ready-to-show', () => {
        if (newAuthWindow && !newAuthWindow.isDestroyed()) {
      newAuthWindow.center();
      newAuthWindow.show();
      newAuthWindow.focus();
          console.log('✅ Auth window shown and focused');
        }
    });
    
    // Ensure the renderer is on the /auth route with addAccount parameter (works in dev and prod)
    newAuthWindow.webContents.once('did-finish-load', () => {
        if (newAuthWindow && !newAuthWindow.isDestroyed()) {
          const emailParam = email ? '&email=' + encodeURIComponent(email) : '';
          const targetPath = '/auth?addAccount=true' + emailParam;
          
      const navigateToAuth = `
            (function() {
              try {
                console.log('[Auth Window] Page loaded - checking current route');
                const currentPath = window.location.pathname || '';
                const currentSearch = window.location.search || '';
                console.log('[Auth Window] Current path:', currentPath);
                console.log('[Auth Window] Current search:', currentSearch);
                
                // Always force navigation to /auth route to ensure we're on the right page
                const targetPath = '${targetPath}';
                console.log('[Auth Window] Target path:', targetPath);
                
                if (!currentPath.includes('/auth') || !currentSearch.includes('addAccount=true')) {
                  console.log('[Auth Window] Not on /auth route - navigating now');
                  window.location.href = targetPath;
                  
                  // Verify navigation worked
                  setTimeout(function() {
                    const newPath = window.location.pathname || '';
                    const newSearch = window.location.search || '';
                    if (!newPath.includes('/auth') || !newSearch.includes('addAccount=true')) {
                      console.log('[Auth Window] Navigation failed - retrying');
                      window.location.href = targetPath;
                      
                      // Final retry with reload if needed
                      setTimeout(function() {
                        const finalPath = window.location.pathname || '';
                        if (!finalPath.includes('/auth')) {
                          console.log('[Auth Window] Final retry - reloading page');
                          window.location.href = targetPath;
                          setTimeout(function() {
                            if (!window.location.pathname.includes('/auth')) {
                              window.location.reload();
                            }
                          }, 100);
                        } else {
                          console.log('[Auth Window] Successfully navigated to /auth');
                        }
                      }, 200);
                    } else {
                      console.log('[Auth Window] Successfully navigated to /auth');
                    }
                  }, 100);
                } else {
                  console.log('[Auth Window] Already on /auth route');
                }
              } catch (e) {
                console.error('[Auth Window] Error navigating to auth:', e);
              }
            })();
          `;
          
          // Execute immediately after page loads
          newAuthWindow.webContents.executeJavaScript(navigateToAuth).catch((err) => {
            console.error('[Auth Window] Error executing navigation script:', err);
          });
          
          // Also listen for navigation events to prevent redirects
          newAuthWindow.webContents.on('did-navigate-in-page', (event, url) => {
            console.log('[Auth Window] Navigated in page to:', url);
            if (!url.includes('/auth') && !url.includes('addAccount=true')) {
              console.log('[Auth Window] Detected navigation away from /auth - redirecting back');
              const emailParam = email ? '&email=' + encodeURIComponent(email) : '';
              const targetPath = '/auth?addAccount=true' + emailParam;
              newAuthWindow.webContents.executeJavaScript('window.location.href = "' + targetPath + '";').catch(() => {});
            }
          });
        }
      });
      
      // Also prevent navigation away from /auth route
      newAuthWindow.webContents.on('will-navigate', (event, navigationUrl) => {
        // Only allow navigation to /auth route or same origin
        if (!navigationUrl.includes('/auth') && !navigationUrl.includes('addAccount=true') && !navigationUrl.includes('localhost:3000')) {
          event.preventDefault();
          // Force back to auth route
          const emailParam = email ? '&email=' + encodeURIComponent(email) : '';
          newAuthWindow.webContents.executeJavaScript(`
            window.location.hash = '/auth?addAccount=true${emailParam}';
          `).catch(() => {});
        }
    });
    
    if (isDev) {
      newAuthWindow.webContents.openDevTools({ mode: 'detach' });
      }
    };
    
    // Close current window first, wait for it to fully close, then open auth window
    if (currentWindow && !currentWindow.isDestroyed()) {
      try {
        const url = currentWindow.webContents.getURL();
        if (url.includes('/account-switcher')) {
          currentWindow.once('closed', () => {
            console.log('✅ Account switcher closed - opening auth window');
            createAuthWindowAfterClose();
          });
          currentWindow.close();
        } else {
          // Not account switcher, close immediately and open auth window
          currentWindow.close();
          createAuthWindowAfterClose();
        }
      } catch (e) {
        console.error('Error checking current window URL:', e);
        // Fallback: close and open immediately
        if (currentWindow && !currentWindow.isDestroyed()) {
          currentWindow.close();
        }
        createAuthWindowAfterClose();
      }
    } else {
      // No current window to close, open auth window immediately
      createAuthWindowAfterClose();
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
    
    // Account switcher window - 30% of screen size in 14:9 format
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
    const accountSwitcherWidth = Math.round(screenWidth * 0.30);
    const accountSwitcherHeight = Math.round(accountSwitcherWidth * (9 / 14));
    
    // Create account switcher window AFTER current window is fully closed
    const createAccountSwitcherAfterClose = () => {
    accountSwitcherWindow = new BrowserWindow({
      width: accountSwitcherWidth,
        height: accountSwitcherHeight,
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
    
      // Show window when ready
      accountSwitcherWindow.once('ready-to-show', () => {
        if (accountSwitcherWindow && !accountSwitcherWindow.isDestroyed()) {
    // Center the window
    accountSwitcherWindow.center();
      accountSwitcherWindow.show();
      accountSwitcherWindow.focus();
        }
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
      
      if (isDev) {
        accountSwitcherWindow.webContents.openDevTools({ mode: 'detach' });
      }
    };
    
    // Close current window first, wait for it to fully close, then open account switcher
    if (currentWindow && !currentWindow.isDestroyed()) {
      currentWindow.once('closed', () => {
        console.log('✅ Current window closed - opening account switcher');
        createAccountSwitcherAfterClose();
      });
      currentWindow.close();
    } else {
      // No current window to close, open account switcher immediately
      createAccountSwitcherAfterClose();
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error opening account switcher window:', error);
    return { success: false, error: error.message };
  }
});

// Open admin window - only if user matches admin credentials
ipcMain.handle('open-admin-window', (event) => {
  try {
    const result = createAdminWindow();
    return result;
  } catch (error) {
    console.error('Error opening admin window:', error);
    return { success: false, error: error.message };
  }
});
