const { app, BrowserWindow, Menu, ipcMain, dialog, shell, globalShortcut, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const electronIsDev = require('electron-is-dev');
const Store = require('electron-store');

// Allow forcing production mode via environment variable
// Set ELECTRON_IS_DEV=0 to force production mode (use build folder)
const isDev = process.env.ELECTRON_IS_DEV !== '0' && electronIsDev;
const { autoUpdater } = require('electron-updater');
const { getDatabaseManager } = require(path.join(__dirname, '../src/utils/DatabaseManager'));

const store = new Store();
const settingsStore = new Store({ name: 'settings' });

// Initialize database manager
let dbManager = null;

let mainWindow;
let authWindow;
let accountSwitcherWindow; // Track account switcher window
let adminWindow; // Track admin window
let popOutWindows = new Map(); // Track all pop-out windows (key: unique ID, value: window object)
let popOutWindowCounter = 0; // Counter for unique window IDs
let windowNumberCounter = 0; // Counter for window numbers (1, 2, 3, ...)
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
  
  // IMPORTANT: Check if admin window exists - if so, don't create main window
  // This prevents main window from being created when admin window is open
  if (adminWindow && !adminWindow.isDestroyed()) {
    console.log('⚠️ Admin window exists - not creating main window');
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
  
  // Assign window number 1 to main window
  mainWindow.windowNumber = 1;
  windowNumberCounter = 1;

  const startUrl = isDev 
    ? 'http://localhost:3000' 
    : `file://${path.join(__dirname, '../build/index.html')}`;
  
  mainWindow.loadURL(startUrl);
  
  // Close all pop-out windows when main window closes
  mainWindow.on('close', () => {
    popOutWindows.forEach((window) => {
      if (window && !window.isDestroyed()) {
        window.close();
      }
    });
    popOutWindows.clear();
    windowNumberCounter = 0; // Reset counter when main window closes
  });

  mainWindow.once('ready-to-show', () => {
    // Don't auto-show if we're waiting for account switcher to close
    // Also check if user is still authenticated
    const authUser = settingsStore.get('authUser');
    if (!pendingMainWindowShow && authUser && authUser.id) {
      mainWindow.show();
      // Broadcast initial window number
      setTimeout(() => {
        broadcastWindowNumbers();
      }, 500);
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
    const navigateToAuth = isDev ? `
      try {
        if (window.location.pathname !== '/auth') {
          window.history.pushState({}, '', '/auth');
          window.dispatchEvent(new Event('popstate'));
        }
      } catch (e) {}
    ` : `
      try {
        if (window.location.hash !== '#/auth') {
          window.location.hash = '/auth';
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
  if (!user) {
    console.log('isAdminUser: No user provided');
    return false;
  }
  
  console.log('isAdminUser: Checking user:', { id: user.id, email: user.email, username: user.username, name: user.name });
  
  // Check email
  const emailMatch = user.email && user.email.toLowerCase() === ADMIN_CREDENTIALS.email.toLowerCase();
  
  // Check username
  const usernameMatch = (user.username && user.username.toLowerCase() === ADMIN_CREDENTIALS.username.toLowerCase()) ||
                       (user.name && user.name.toLowerCase() === ADMIN_CREDENTIALS.username.toLowerCase());
  
  console.log('isAdminUser: Email match:', emailMatch, 'Username match:', usernameMatch);
  
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
      // Try multiple ways to find the user
      const userData = users.find(u => 
        u.id === user.id || 
        u.email === user.email || 
        (user.email && u.email && u.email.toLowerCase() === user.email.toLowerCase()) ||
        (user.id && u.id && u.id.toLowerCase() === user.id.toLowerCase())
      );
      
      console.log('isAdminUser: Found userData:', userData ? { id: userData.id, email: userData.email, username: userData.username } : 'null');
      
      if (userData) {
        const passwordMatch = userData.password === ADMIN_CREDENTIALS.password;
        console.log('isAdminUser: Password match:', passwordMatch);
        const isAdmin = emailMatch && usernameMatch && passwordMatch;
        console.log('isAdminUser: Final result:', isAdmin);
        return isAdmin;
      } else {
        console.log('isAdminUser: User data not found in users.json');
      }
    } else {
      console.log('isAdminUser: users.json file not found at:', usersFile);
    }
  } catch (error) {
    console.error('Error checking admin credentials:', error);
  }
  
  console.log('isAdminUser: Returning false');
  return false;
}

function createAdminWindow() {
  // Don't create if admin window already exists and is not destroyed
  if (adminWindow && !adminWindow.isDestroyed()) {
    adminWindow.focus();
    return { success: true };
  }
  
  // Get admin user from users.json
  let authUser = null;
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
      // Find logged in admin user
      authUser = users.find(u => 
        u.isLoggedIn && 
        u.email && u.email.toLowerCase() === ADMIN_CREDENTIALS.email.toLowerCase()
      );
    }
  } catch (error) {
    console.error('Error getting admin user:', error);
  }
  
  // Also check settingsStore as fallback
  if (!authUser) {
    authUser = settingsStore.get('authUser');
  }
  
  if (!authUser || !isAdminUser(authUser)) {
    console.log('Cannot create admin window - user is not admin');
    return { success: false, error: 'Unauthorized: Admin access required' };
  }
  
  // Create the admin window
  adminWindow = new BrowserWindow({
    width: 1200,
    height: 800,
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
    icon: path.join(__dirname, 'assets/icon.png'),
    parent: null // Make it independent
  });

  // Set the URL with hash route
  const startUrl = isDev 
    ? 'http://localhost:3000#/admin-window' 
    : `file://${path.join(__dirname, '../build/index.html')}#/admin-window`;

  console.log('Creating admin window with URL:', startUrl);
  adminWindow.loadURL(startUrl);

  // Show window when ready
  adminWindow.once('ready-to-show', () => {
    if (adminWindow && !adminWindow.isDestroyed()) {
      adminWindow.center();
      adminWindow.show();
      adminWindow.focus();
      console.log('Admin window shown');
    }
  });

  // Ensure route is correct after load
  adminWindow.webContents.once('did-finish-load', () => {
    adminWindow.webContents.executeJavaScript(`
      if (window.location.hash !== '#/admin-window') {
        window.location.hash = '/admin-window';
      }
    `).catch(() => {});
  });

  // Handle window close
  adminWindow.on('closed', () => {
    adminWindow = null;
  });

  if (isDev) {
    adminWindow.webContents.openDevTools({ mode: 'detach' });
  }
  
  return { success: true };
}

// Helper function to convert ISO datetime string to MySQL datetime format
function convertToMySQLDateTime(isoString) {
  if (!isoString) return null;
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return null;
    // Convert to MySQL datetime format: YYYY-MM-DD HH:MM:SS
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  } catch (error) {
    console.error('Error converting datetime:', error);
    return null;
  }
}

// Helper function to get users from database
async function getUsersFromDatabase() {
  try {
    if (!dbManager) {
      dbManager = getDatabaseManager();
      const initialized = await dbManager.initialize();
      if (!initialized) {
        console.warn('Database initialization failed, falling back to file');
        return getUsersFromFile();
      }
    }
    const users = await dbManager.query('SELECT * FROM users ORDER BY createdAt DESC');
    // Ensure we always return an array
    return Array.isArray(users) ? users : [];
  } catch (error) {
    console.error('Error reading users from database:', error);
    // Fallback to file if database fails
    const fileUsers = getUsersFromFile();
    return Array.isArray(fileUsers) ? fileUsers : [];
  }
}

// Helper function to save users to database
async function saveUsersToDatabase(users) {
  try {
    if (!dbManager) {
      dbManager = getDatabaseManager();
      await dbManager.initialize();
    }
    
    // Save each user to database
    for (const user of users) {
    const existing = await dbManager.query('SELECT id FROM users WHERE id = ?', [user.id]);
    
    if (existing && Array.isArray(existing) && existing.length > 0) {
        // Update existing user
        await dbManager.query(
          `UPDATE users SET username = ?, email = ?, password = ?, name = ?, fullName = ?, 
           phone = ?, dateOfBirth = ?, gender = ?, address = ?, city = ?, zipCode = ?, 
           country = ?, acceptTerms = ?, devIntent = ?, lastLoginTime = ?, isLoggedIn = ?, 
           stayLoggedIn = ?, hiddenInSwitcher = ? WHERE id = ?`,
          [
            user.username, user.email, user.password, user.name, user.fullName,
            user.phone || null, convertToMySQLDateTime(user.dateOfBirth), user.gender || 'none',
            user.address || null, user.city || null, user.zipCode || null,
            user.country || null, user.acceptTerms || false, user.devIntent || false,
            convertToMySQLDateTime(user.lastLoginTime), user.isLoggedIn || false,
            user.stayLoggedIn !== undefined ? user.stayLoggedIn : true,
            user.hiddenInSwitcher || false, user.id
          ]
        );
      } else {
        // Insert new user
        await dbManager.query(
          `INSERT INTO users (id, username, email, password, name, fullName, phone, dateOfBirth, 
           gender, address, city, zipCode, country, acceptTerms, devIntent, createdAt, 
           lastLoginTime, isLoggedIn, stayLoggedIn, hiddenInSwitcher) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            user.id, user.username, user.email, user.password, user.name, user.fullName,
            user.phone || null, convertToMySQLDateTime(user.dateOfBirth), user.gender || 'none',
            user.address || null, user.city || null, user.zipCode || null,
            user.country || null, user.acceptTerms || false, user.devIntent || false,
            convertToMySQLDateTime(user.createdAt) || convertToMySQLDateTime(new Date().toISOString()), convertToMySQLDateTime(user.lastLoginTime),
            user.isLoggedIn || false, user.stayLoggedIn !== undefined ? user.stayLoggedIn : true,
            user.hiddenInSwitcher || false
          ]
        );
      }
    }
    return true;
  } catch (error) {
    console.error('Error saving users to database:', error);
    // Fallback to file if database fails
    return saveUsersToFile(users);
  }
}

// Fallback: Helper function to get users from file (for migration/backup)
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

// Fallback: Helper function to save users to file (for migration/backup)
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

// Migration function to transfer existing data from localStorage/users.json to database
async function migrateDataToDatabase() {
  try {
    if (!dbManager) {
      dbManager = getDatabaseManager();
      await dbManager.initialize();
    }

    console.log('🔄 Starting data migration...');

    // 1. Migrate users from users.json
    try {
      const fileUsers = getUsersFromFile();
      if (fileUsers && fileUsers.length > 0) {
        console.log(`📦 Migrating ${fileUsers.length} users from users.json...`);
        for (const user of fileUsers) {
          const [existing] = await dbManager.query('SELECT id FROM users WHERE id = ?', [user.id]);
          if (!existing) {
            await dbManager.query(
              `INSERT INTO users (id, username, email, password, name, fullName, phone, dateOfBirth, 
               gender, address, city, zipCode, country, acceptTerms, devIntent, createdAt, 
               lastLoginTime, isLoggedIn, stayLoggedIn, hiddenInSwitcher) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                user.id, user.username, user.email, user.password, user.name, user.fullName,
                user.phone || null, convertToMySQLDateTime(user.dateOfBirth), user.gender || 'none',
                user.address || null, user.city || null, user.zipCode || null,
                user.country || null, user.acceptTerms || false, user.devIntent || false,
                convertToMySQLDateTime(user.createdAt) || convertToMySQLDateTime(new Date().toISOString()), 
                convertToMySQLDateTime(user.lastLoginTime),
                user.isLoggedIn || false, user.stayLoggedIn !== undefined ? user.stayLoggedIn : true,
                user.hiddenInSwitcher || false
              ]
            );
            console.log(`  ✓ Migrated user: ${user.email || user.username}`);
          }
        }
        console.log(`✅ Migrated ${fileUsers.length} users to database`);
      }
    } catch (error) {
      console.error('Error migrating users:', error);
    }

    // 2. Migrate games from localStorage (for each user)
    try {
      // Get all users from database
      const dbUsers = await dbManager.query('SELECT id FROM users');
      
      for (const dbUser of dbUsers) {
        const userId = dbUser.id;
        
        // Try to get games from localStorage (scoped by user)
        // Note: This requires access to localStorage, which is only available in renderer process
        // We'll handle this through IPC or by reading from a file if games are stored there
        
        // Check for customGames in localStorage format (would need IPC to access)
        // For now, we'll note that games migration happens when UserDataManager is used
        console.log(`  ℹ Games for user ${userId} will be migrated on first access`);
      }
    } catch (error) {
      console.error('Error migrating games:', error);
    }

    // 3. Migrate settings from localStorage
    // Settings migration will happen automatically when UserDataManager is used
    console.log('  ℹ Settings will be migrated on first access');

    // 4. Migrate ratings from localStorage
    // Ratings migration will happen automatically when accessed
    console.log('  ℹ Ratings will be migrated on first access');

    console.log('✅ Data migration completed');
  } catch (error) {
    console.error('Error during data migration:', error);
  }
}

// Helper function to find and auto-login user
async function findAutoLoginUser() {
  try {
    const users = await getUsersFromDatabase();
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
async function hasLoggedInAccounts() {
  try {
    const users = await getUsersFromDatabase();
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
async function hasAccountsInSwitcher() {
  try {
    const users = await getUsersFromDatabase();
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
  // Initialize database
  try {
    dbManager = getDatabaseManager();
    const initialized = await dbManager.initialize();
    if (initialized) {
      console.log('Database initialized');
      
      // Run migration if not already completed OR if no users exist in database
      try {
        const migrationCompleted = await dbManager.isMigrationCompleted();
        const dbUsers = await dbManager.query('SELECT COUNT(*) as count FROM users');
        const userCount = dbUsers && Array.isArray(dbUsers) && dbUsers.length > 0 ? dbUsers[0].count : 0;
        
        if (!migrationCompleted || userCount === 0) {
          console.log('Starting data migration from localStorage/users.json to database...');
          await migrateDataToDatabase();
          await dbManager.markMigrationCompleted();
          console.log('Data migration completed');
        } else {
          console.log('Migration already completed, skipping...');
        }
      } catch (migrationError) {
        console.error('Migration error (non-critical):', migrationError);
        // Continue even if migration fails
      }
    } else {
      console.warn('Database initialization failed, continuing with file-based storage');
    }
  } catch (error) {
    console.error('Failed to initialize database:', error);
    console.warn('Application will continue with file-based storage as fallback');
  }

  const forceAuth = process.env.KINMA_FORCE_AUTH === '1';
  if (forceAuth) {
    createAuthWindow();
    return;
  }
  
  // FIRST: Check if there's a user that should be auto-logged in (didn't log out)
  // This takes priority - if user didn't log out, auto-login them directly
  try {
    const autoLoginUser = await findAutoLoginUser();
    
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
  } catch (error) {
    console.error('Error finding auto-login user:', error);
    // Continue to next check
  }
  
  // SECOND: If no auto-login user, check if there are any accounts in the switcher (not removed)
  let hasAccounts = false;
  try {
    hasAccounts = await hasAccountsInSwitcher();
  } catch (error) {
    console.error('Error checking accounts in switcher:', error);
    // Continue to next check
  }
  
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

app.on('activate', async () => {
  // Close all pop-out windows on app activate (ensure clean state)
  popOutWindows.forEach((window, route) => {
    if (window && !window.isDestroyed()) {
      window.close();
    }
  });
  popOutWindows.clear();
  
  if (BrowserWindow.getAllWindows().length === 0) {
    // FIRST: Check if there's a user that should be auto-logged in (didn't log out)
    const autoLoginUser = await findAutoLoginUser();
    
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
    const hasAccounts = await hasAccountsInSwitcher();
    
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
                if (url && (url.includes('/auth') || url.includes('#/auth') || url.includes('addAccount=true'))) {
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
        senderWindow.close();
        return; // Just close the account switcher, don't open main window
      }
      
      // SECOND: Check if authUser exists in settingsStore
      // If it doesn't exist, don't try to open main window
      const authUser = settingsStore.get('authUser');
      if (!authUser || !authUser.id) {
        console.log('⚠️ No authUser in settingsStore - not opening main window');
        senderWindow.close();
        return; // Just close the account switcher, don't open main window
      }
      
      // THIRD: Only if auth window doesn't exist AND authUser exists, check for logged-in users
      console.log('⚠️ No auth window detected - checking for logged-in users');
      
      // Get users and find one that is actually logged in (isLoggedIn === true)
      let loggedInUser = null;
      try {
        const users = await getUsersFromDatabase();
          
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
        
        // Close account switcher window first
        senderWindow.close();
        
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
        senderWindow.close();
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

ipcMain.handle('auth-success', async (event, user) => {
  // IMPORTANT: If main window is already open and visible, and user is already authenticated,
  // don't do anything - this prevents interference with normal operation
  const currentAuthUser = settingsStore.get('authUser');
  if (mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible() && currentAuthUser && currentAuthUser.id === user.id) {
    console.log('⚠️ Main window already open and user already authenticated - skipping auth-success handler');
    // Still update user data (login time, etc.) but don't mess with windows
    try {
      if (!dbManager) {
        dbManager = getDatabaseManager();
        await dbManager.initialize();
      }
      await dbManager.query(
        'UPDATE users SET isLoggedIn = ?, lastLoginTime = ?, hiddenInSwitcher = ? WHERE id = ?',
        [true, convertToMySQLDateTime(new Date().toISOString()), false, user.id]
      );
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
    
    // Mark user as logged in in database
    try {
      if (!dbManager) {
        dbManager = getDatabaseManager();
        await dbManager.initialize();
      }
      const [existing] = await dbManager.query('SELECT id FROM users WHERE id = ?', [user.id]);
      if (existing) {
        await dbManager.query(
          'UPDATE users SET isLoggedIn = ?, lastLoginTime = ?, hiddenInSwitcher = ? WHERE id = ?',
          [true, convertToMySQLDateTime(new Date().toISOString()), false, user.id]
        );
        console.log('Marked user as logged in and made visible in switcher:', user.email || user.username);
      } else {
        // User doesn't exist in database - add them
        await dbManager.query(
          `INSERT INTO users (id, username, email, password, name, fullName, phone, dateOfBirth, 
           gender, address, city, zipCode, country, acceptTerms, devIntent, createdAt, 
           lastLoginTime, isLoggedIn, stayLoggedIn, hiddenInSwitcher) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            user.id, user.username || '', user.email || '', user.password || '',
            user.name || '', user.fullName || '', user.phone || null, convertToMySQLDateTime(user.dateOfBirth),
            user.gender || 'none', user.address || null, user.city || null, user.zipCode || null,
            user.country || null, user.acceptTerms || false, user.devIntent || false,
            convertToMySQLDateTime(new Date().toISOString()), convertToMySQLDateTime(new Date().toISOString()), true,
            user.stayLoggedIn !== undefined ? user.stayLoggedIn : true, false
          ]
        );
        console.log('Added new user and marked as logged in:', user.email || user.username);
      }
    } catch (error) {
      console.error('Error saving user to database:', error);
    }
  } catch (error) {
    console.error('Error setting authUser:', error);
    return;
  }
  
  // Check if sender window still exists before accessing it
  let senderWindow = null;
  try {
    senderWindow = BrowserWindow.fromWebContents(event.sender);
    if (!senderWindow || senderWindow.isDestroyed()) {
      senderWindow = null;
    }
  } catch (error) {
    // Window was destroyed, continue without it
    senderWindow = null;
  }
  
  // Check if this is coming from account switcher
  let isFromAccountSwitcher = false;
  if (senderWindow && !senderWindow.isDestroyed()) {
    try {
      const url = senderWindow.webContents.getURL();
      if (url.includes('/account-switcher') || url.includes('#/account-switcher')) {
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
    
    // Set isLoggedIn to false and clear stayLoggedIn when user logs out
    // This puts the account in "ghost mode" - visible but not logged in
    // User will need to log in again when clicking on the account
    try {
      if (!dbManager) {
        dbManager = getDatabaseManager();
        await dbManager.initialize();
      }
      // Set isLoggedIn to false and stayLoggedIn to false when logging out
      await dbManager.query(
        'UPDATE users SET isLoggedIn = ?, stayLoggedIn = ? WHERE id = ?',
        [false, false, currentAuthUser.id]
      );
      console.log('Account logged out - isLoggedIn set to false (ghost mode)');
    } catch (error) {
      console.error('Error updating user logout status:', error);
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

// Update state
let updateAvailable = false;
let updateInfo = null;
let updateDownloaded = false;

// Configure autoUpdater
if (!isDev) {
  autoUpdater.autoDownload = false;
  
  autoUpdater.on('checking-for-update', () => {
    console.log('Checking for update...');
  });
  
  autoUpdater.on('update-available', (info) => {
    console.log('Update available:', info.version);
    updateAvailable = true;
    updateInfo = info;
    // Notify renderer
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-available', info);
    }
  });
  
  autoUpdater.on('update-not-available', () => {
    console.log('Update not available');
    updateAvailable = false;
    updateInfo = null;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-not-available');
    }
  });
  
  autoUpdater.on('error', (err) => {
    console.error('Error in auto-updater:', err);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-error', err.message);
    }
  });
  
  autoUpdater.on('download-progress', (progressObj) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-download-progress', progressObj);
    }
  });
  
  autoUpdater.on('update-downloaded', (info) => {
    console.log('Update downloaded:', info.version);
    updateDownloaded = true;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-downloaded', info);
    }
  });
}

ipcMain.handle('check-for-updates', async () => {
  try {
    if (!isDev) {
      await autoUpdater.checkForUpdates();
    }
    return { success: true, message: 'Update check completed' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-app-version', async () => {
  return { version: app.getVersion() };
});

ipcMain.handle('get-update-status', async () => {
  return { 
    updateAvailable, 
    updateInfo,
    updateDownloaded 
  };
});

ipcMain.handle('download-update', async () => {
  try {
    if (!isDev && updateAvailable && !updateDownloaded) {
      await autoUpdater.downloadUpdate();
      return { success: true, message: 'Update download started' };
    }
    return { success: false, message: 'No update available or already downloaded' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('install-update', async () => {
  try {
    if (!isDev && updateDownloaded) {
      autoUpdater.quitAndInstall(false, true);
      return { success: true, message: 'Installing update...' };
    }
    return { success: false, message: 'No update to install' };
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

// Check if game folder exists
ipcMain.handle('game-folder-exists', async (event, gameId) => {
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
    return fs.existsSync(gamesPath);
  } catch (error) {
    console.error('Error checking game folder existence:', error);
    return false;
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

// Save users to database
ipcMain.handle('save-users', async (event, users) => {
  try {
    const success = await saveUsersToDatabase(users);
    if (success) {
      console.log('Users saved successfully to database');
      return { success: true };
    } else {
      return { success: false, error: 'Failed to save users' };
    }
  } catch (error) {
    console.error('Error saving users:', error);
    return { success: false, error: error.message };
  }
});

// Load users from database
ipcMain.handle('get-users', async () => {
  try {
    const users = await getUsersFromDatabase();
    console.log('Loaded', users.length, 'users from database');
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
      // Use hash routing for production (file:// protocol), pathname routing for dev (http:// protocol)
      const emailParam = email ? `&email=${encodeURIComponent(email)}` : '';
    const startUrl = isDev 
        ? `http://localhost:3000/auth?addAccount=true${emailParam}` 
        : `file://${path.join(__dirname, '../build/index.html')}#/auth?addAccount=true${emailParam}`;
    
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
    
    // IMPORTANT: Create account switcher window FIRST, then close current window
    // This prevents window-all-closed from triggering and opening auth window
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
    
    // NOW close the current window AFTER account switcher is created
    // This ensures there's always a window open, preventing window-all-closed from triggering
    if (currentWindow && !currentWindow.isDestroyed() && currentWindow !== accountSwitcherWindow) {
      // Wait a moment to ensure account switcher window is ready
      setTimeout(() => {
        if (currentWindow && !currentWindow.isDestroyed()) {
          currentWindow.close();
        }
      }, 100);
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

// Open pop-out window for Studio View menus
ipcMain.handle('open-pop-out-window', (event, route) => {
  console.log('🔲 Pop-out window requested for route:', route);
  try {
    const currentWindow = BrowserWindow.fromWebContents(event.sender);
    if (!currentWindow) {
      console.error('❌ Current window not found');
      return { success: false, error: 'Current window not found' };
    }
    console.log('✅ Current window found');
    
    // Generate unique ID for this window
    const windowId = `popout-${++popOutWindowCounter}-${Date.now()}`;
    
    // Assign next window number
    windowNumberCounter++;
    const windowNumber = windowNumberCounter;
    
    // Clean up destroyed windows
    for (const [id, window] of popOutWindows.entries()) {
      if (window.isDestroyed()) {
        popOutWindows.delete(id);
      }
    }
    
    // Get screen size for window positioning
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
    
    // Get minimum size from main window (1200x720) or use defaults
    const mainWindowMinWidth = mainWindow && !mainWindow.isDestroyed() ? 1200 : 1200;
    const mainWindowMinHeight = mainWindow && !mainWindow.isDestroyed() ? 720 : 720;
    
    // Use main window's minimum size for pop-out window
    const windowWidth = mainWindowMinWidth;
    const windowHeight = mainWindowMinHeight;
    
    // Position window to the right of main window
    const mainWindowBounds = currentWindow.getBounds();
    const windowX = mainWindowBounds.x + mainWindowBounds.width + 20;
    const windowY = mainWindowBounds.y;
    
    // Create pop-out window
    const popOutWindow = new BrowserWindow({
      width: windowWidth,
      height: windowHeight,
      minWidth: mainWindowMinWidth,
      minHeight: mainWindowMinHeight,
      x: windowX,
      y: windowY,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        preload: path.join(__dirname, 'preload.js')
      },
      frame: false,
      titleBarStyle: 'hidden',
      show: false,
      icon: path.join(__dirname, 'assets/icon.png'),
      parent: null // Independent window
    });
    
    // Store window reference with unique ID
    popOutWindow.windowId = windowId;
    popOutWindow.route = route;
    popOutWindow.windowNumber = windowNumber;
    popOutWindows.set(windowId, popOutWindow);
    
    // Notify all windows about their window numbers
    broadcastWindowNumbers();
    
    // Build URL with route
    const startUrl = isDev 
      ? `http://localhost:3000${route}` 
      : `file://${path.join(__dirname, '../build/index.html')}#${route}`;
    
    console.log('🔲 Loading pop-out window with URL:', startUrl);
    popOutWindow.loadURL(startUrl);
    
    // Show window when ready
    popOutWindow.once('ready-to-show', () => {
      console.log('🔲 Pop-out window ready to show');
      if (popOutWindow && !popOutWindow.isDestroyed()) {
        popOutWindow.show();
        popOutWindow.focus();
        console.log('✅ Pop-out window shown');
        // Notify window about its number
        setTimeout(() => {
          broadcastWindowNumbers();
        }, 100);
      }
    });
    
    // Ensure the renderer is on the correct route
    popOutWindow.webContents.once('did-finish-load', () => {
      console.log('🔲 Pop-out window finished loading, navigating to route:', route);
      // Notify window about its number after page loads
      setTimeout(() => {
        broadcastWindowNumbers();
      }, 300);
      const navigateToRoute = `
        try {
          const targetRoute = '${route}';
          console.log('🔲 Navigating to route:', targetRoute);
          console.log('🔲 Current pathname:', window.location.pathname);
          console.log('🔲 Current hash:', window.location.hash);
          
          if (window.location.pathname !== targetRoute && !window.location.hash.includes(targetRoute)) {
            if (window.location.protocol === 'file:') {
              // HashRouter mode
              window.location.hash = targetRoute;
            } else {
              // BrowserRouter mode
              window.history.pushState({}, '', targetRoute);
              window.dispatchEvent(new Event('popstate'));
            }
            console.log('✅ Navigation completed');
          } else {
            console.log('✅ Already on correct route');
          }
        } catch (e) {
          console.error('❌ Navigation error:', e);
        }
      `;
      popOutWindow.webContents.executeJavaScript(navigateToRoute);
    });
    
    // Handle navigation errors
    popOutWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      console.error('❌ Pop-out window failed to load:', errorCode, errorDescription);
    });
    
    // Close pop-out window when main window closes
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.once('closed', () => {
        // Close all pop-out windows when main window closes
        popOutWindows.forEach((window) => {
          if (window && !window.isDestroyed()) {
            window.close();
          }
        });
        popOutWindows.clear();
      });
    }
    
    // Clean up when pop-out window closes
    popOutWindow.on('closed', () => {
      popOutWindows.delete(windowId);
      // Window numbers don't change when a window closes, so no need to broadcast
    });
    
    if (isDev) {
      popOutWindow.webContents.openDevTools({ mode: 'detach' });
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error opening pop-out window:', error);
    return { success: false, error: error.message };
  }
});

// Get window number for a specific window
function getWindowNumber(webContents) {
  const window = BrowserWindow.fromWebContents(webContents);
  if (!window) return null;
  
  if (window === mainWindow) {
    return mainWindow.windowNumber || 1;
  }
  
  // Check pop-out windows
  for (const [id, popOutWindow] of popOutWindows.entries()) {
    if (popOutWindow === window) {
      return popOutWindow.windowNumber;
    }
  }
  
  return null;
}

// Get total window count
function getTotalWindowCount() {
  let count = 0;
  if (mainWindow && !mainWindow.isDestroyed()) {
    count++;
  }
  popOutWindows.forEach((window) => {
    if (window && !window.isDestroyed()) {
      count++;
    }
  });
  return count;
}

// Broadcast window numbers and total count to all windows
function broadcastWindowNumbers() {
  const totalCount = getTotalWindowCount();
  console.log('🔲 Broadcasting window numbers. Total count:', totalCount);
  
  // Send to main window
  if (mainWindow && !mainWindow.isDestroyed()) {
    const mainNumber = mainWindow.windowNumber || 1;
    console.log('🔲 Sending to main window - number:', mainNumber, 'total:', totalCount);
    mainWindow.webContents.send('window-number-changed', mainNumber);
    mainWindow.webContents.send('total-window-count-changed', totalCount);
  }
  // Send to all pop-out windows
  popOutWindows.forEach((window) => {
    if (window && !window.isDestroyed()) {
      console.log('🔲 Sending to pop-out window - number:', window.windowNumber, 'total:', totalCount);
      window.webContents.send('window-number-changed', window.windowNumber);
      window.webContents.send('total-window-count-changed', totalCount);
    }
  });
}

// Get window number IPC handler
ipcMain.handle('get-window-number', (event) => {
  return getWindowNumber(event.sender);
});

// Get total window count IPC handler
ipcMain.handle('get-total-window-count', () => {
  return getTotalWindowCount();
});

// Close pop-out window (by window ID or route)
ipcMain.handle('close-pop-out-window', (event, routeOrId) => {
  try {
    // Try to find by ID first
    if (popOutWindows.has(routeOrId)) {
      const window = popOutWindows.get(routeOrId);
      if (window && !window.isDestroyed()) {
        window.close();
      }
      popOutWindows.delete(routeOrId);
      return { success: true };
    }
    // Try to find by route (for backward compatibility)
    for (const [id, window] of popOutWindows.entries()) {
      if (window.route === routeOrId && !window.isDestroyed()) {
        window.close();
        popOutWindows.delete(id);
        return { success: true };
      }
    }
    return { success: false, error: 'Window not found' };
  } catch (error) {
    console.error('Error closing pop-out window:', error);
    return { success: false, error: error.message };
  }
});

// ==================== DATABASE IPC HANDLERS ====================

// Users handlers
ipcMain.handle('db-get-users', async () => {
  try {
    if (!dbManager) {
      dbManager = getDatabaseManager();
      const initialized = await dbManager.initialize();
      if (!initialized) {
        return { success: false, error: 'Database not available', users: [] };
      }
    }
    const users = await dbManager.query('SELECT * FROM users ORDER BY createdAt DESC');
    // Ensure all users are serializable and convert MySQL TINYINT(1) booleans to JavaScript booleans
    const serializableUsers = Array.isArray(users) ? users.map(user => {
      try {
        const serialized = JSON.parse(JSON.stringify(user));
        // Convert MySQL TINYINT(1) booleans to JavaScript booleans
        if (serialized.hiddenInSwitcher !== undefined) {
          serialized.hiddenInSwitcher = serialized.hiddenInSwitcher === 1 || serialized.hiddenInSwitcher === true || serialized.hiddenInSwitcher === '1';
        }
        if (serialized.isLoggedIn !== undefined) {
          serialized.isLoggedIn = serialized.isLoggedIn === 1 || serialized.isLoggedIn === true || serialized.isLoggedIn === '1';
        }
        if (serialized.stayLoggedIn !== undefined) {
          serialized.stayLoggedIn = serialized.stayLoggedIn === 1 || serialized.stayLoggedIn === true || serialized.stayLoggedIn === '1';
        }
        if (serialized.acceptTerms !== undefined) {
          serialized.acceptTerms = serialized.acceptTerms === 1 || serialized.acceptTerms === true || serialized.acceptTerms === '1';
        }
        if (serialized.devIntent !== undefined) {
          serialized.devIntent = serialized.devIntent === 1 || serialized.devIntent === true || serialized.devIntent === '1';
        }
        return serialized;
      } catch {
        return user;
      }
    }) : [];
    return { success: true, users: serializableUsers };
  } catch (error) {
    console.error('Error getting users from database:', error);
    return { success: false, error: String(error.message || 'Unknown error'), users: [] };
  }
});

ipcMain.handle('db-save-user', async (event, user) => {
  try {
    if (!dbManager) {
      dbManager = getDatabaseManager();
      const initialized = await dbManager.initialize();
      if (!initialized) {
        return { success: false, error: 'Database not available' };
      }
    }
    const existing = await dbManager.query('SELECT id FROM users WHERE id = ?', [user.id]);
    
    if (existing && Array.isArray(existing) && existing.length > 0) {
      // Update existing user
      await dbManager.query(
        `UPDATE users SET username = ?, email = ?, password = ?, name = ?, fullName = ?, 
         phone = ?, dateOfBirth = ?, gender = ?, address = ?, city = ?, zipCode = ?, 
         country = ?, acceptTerms = ?, devIntent = ?, lastLoginTime = ?, isLoggedIn = ?, 
         stayLoggedIn = ?, hiddenInSwitcher = ? WHERE id = ?`,
        [
          user.username, user.email, user.password, user.name, user.fullName,
          user.phone || null, convertToMySQLDateTime(user.dateOfBirth), user.gender || 'none',
          user.address || null, user.city || null, user.zipCode || null,
          user.country || null, user.acceptTerms || false, user.devIntent || false,
          convertToMySQLDateTime(user.lastLoginTime), user.isLoggedIn || false,
          user.stayLoggedIn !== undefined ? user.stayLoggedIn : true,
          user.hiddenInSwitcher === true || user.hiddenInSwitcher === 1 || user.hiddenInSwitcher === '1' ? 1 : 0, user.id
        ]
      );
    } else {
      // Insert new user
      await dbManager.query(
        `INSERT INTO users (id, username, email, password, name, fullName, phone, dateOfBirth, 
         gender, address, city, zipCode, country, acceptTerms, devIntent, createdAt, 
         lastLoginTime, isLoggedIn, stayLoggedIn, hiddenInSwitcher) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          user.id, user.username, user.email, user.password, user.name, user.fullName,
          user.phone || null, convertToMySQLDateTime(user.dateOfBirth), user.gender || 'none',
          user.address || null, user.city || null, user.zipCode || null,
          user.country || null, user.acceptTerms || false, user.devIntent || false,
          convertToMySQLDateTime(user.createdAt) || convertToMySQLDateTime(new Date().toISOString()), 
          convertToMySQLDateTime(user.lastLoginTime),
          user.isLoggedIn || false, user.stayLoggedIn !== undefined ? user.stayLoggedIn : true,
          user.hiddenInSwitcher === true || user.hiddenInSwitcher === 1 || user.hiddenInSwitcher === '1' ? 1 : 0
        ]
      );
    }
    return { success: true };
  } catch (error) {
    console.error('Error saving user to database:', error);
    return { success: false, error: String(error.message || 'Unknown error') };
  }
});

ipcMain.handle('db-delete-user', async (event, userId) => {
  try {
    if (!dbManager) {
      dbManager = getDatabaseManager();
      const initialized = await dbManager.initialize();
      if (!initialized) {
        return { success: false, error: 'Database not available' };
      }
    }
    await dbManager.query('DELETE FROM users WHERE id = ?', [userId]);
    return { success: true };
  } catch (error) {
    console.error('Error deleting user from database:', error);
    return { success: false, error: String(error.message || 'Unknown error') };
  }
});

// Games handlers
ipcMain.handle('db-get-games', async (event, userId) => {
  try {
    if (!dbManager) {
      dbManager = getDatabaseManager();
      const initialized = await dbManager.initialize();
      if (!initialized) {
        return { success: false, error: 'Database not available', games: [] };
      }
    }
    
    // Check if we need to migrate games from localStorage
    try {
      const migrationCheck = await dbManager.query(
        "SELECT value FROM settings WHERE userId = ? AND key_name = ?",
        [userId, 'games_migrated']
      );
      
      if (!migrationCheck || !Array.isArray(migrationCheck) || migrationCheck.length === 0 || migrationCheck[0].value !== 'true') {
        // Trigger migration from localStorage (will be handled by renderer)
        event.sender.send('migrate-localStorage-data', { userId, dataType: 'games' });
      }
    } catch (migrationError) {
      // Ignore migration check errors
      console.warn('Migration check failed:', migrationError);
    }
    
    const games = await dbManager.query(
      'SELECT * FROM games WHERE userId = ? ORDER BY createdAt DESC',
      [userId]
    );
    // Parse JSON fields and ensure serializability
    const parsedGames = [];
    if (Array.isArray(games)) {
      for (const game of games) {
        try {
          const screenshots = game.screenshots ? JSON.parse(game.screenshots) : [];
          const metadata = game.metadata ? JSON.parse(game.metadata) : {};
          // Ensure all data is serializable by deep cloning
          const serializableGame = JSON.parse(JSON.stringify({
            id: String(game.id || ''),
            gameId: String(game.gameId || ''),
            userId: String(game.userId || ''),
            name: String(game.name || ''),
            description: game.description ? String(game.description) : null,
            developer: game.developer ? String(game.developer) : null,
            version: game.version ? String(game.version) : null,
            status: String(game.status || 'public'),
            downloads: Number(game.downloads || 0),
            banner: game.banner ? String(game.banner) : null,
            logo: game.logo ? String(game.logo) : null,
            title: game.title ? String(game.title) : null,
            screenshots: Array.isArray(screenshots) ? screenshots : [],
            metadata: typeof metadata === 'object' && metadata !== null ? metadata : {},
            addedToLibraryAt: game.addedToLibraryAt ? String(game.addedToLibraryAt) : null,
            purchasedAt: game.purchasedAt ? String(game.purchasedAt) : null,
            createdAt: game.createdAt ? String(game.createdAt) : null,
            lastUpdated: game.lastUpdated ? String(game.lastUpdated) : null
          }));
          parsedGames.push(serializableGame);
        } catch (e) {
          // If parsing fails, return game with minimal safe data
          parsedGames.push({
            id: String(game.id || ''),
            gameId: String(game.gameId || ''),
            userId: String(game.userId || ''),
            name: String(game.name || ''),
            screenshots: [],
            metadata: {}
          });
        }
      }
    }
    return { success: true, games: parsedGames };
  } catch (error) {
    console.error('Error getting games from database:', error);
    return { success: false, error: String(error.message || 'Unknown error'), games: [] };
  }
});

// Handler to migrate games from localStorage to database
ipcMain.handle('db-migrate-games', async (event, userId, games) => {
  try {
    if (!dbManager) {
      dbManager = getDatabaseManager();
      await dbManager.initialize();
    }
    
    let migratedCount = 0;
    for (const game of games) {
      try {
        const gameId = game.id || game.gameId;
        if (!gameId) {
          console.warn('Skipping game without id:', game);
          continue;
        }
        
        const existing = await dbManager.query('SELECT id FROM games WHERE id = ?', [gameId]);
        // existing is an array, check if it has any results
        if (!existing || existing.length === 0) {
          const screenshots = Array.isArray(game.screenshots) ? JSON.stringify(game.screenshots) : (game.screenshots || '[]');
          const metadata = typeof game.metadata === 'object' ? JSON.stringify(game.metadata) : (game.metadata || '{}');
          
          await dbManager.query(
            `INSERT INTO games (id, gameId, userId, name, description, developer, version, status, 
             downloads, banner, logo, title, screenshots, metadata, addedToLibraryAt, purchasedAt) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              gameId, game.gameId || gameId, userId, game.name, game.description || null,
              game.developer || null, game.version || null, game.status || 'public',
              game.downloads || 0, game.banner || null, game.logo || null,
              game.title || null, screenshots, metadata,
              convertToMySQLDateTime(game.addedToLibraryAt), convertToMySQLDateTime(game.purchasedAt)
            ]
          );
          migratedCount++;
        } else {
          console.log(`Game ${gameId} already exists in database, skipping migration`);
        }
      } catch (error) {
        // If it's a duplicate entry error, just skip it
        if (error.code === 'ER_DUP_ENTRY') {
          console.log(`Game ${game.id || game.gameId} already exists, skipping`);
          continue;
        }
        // Otherwise, log the error but continue with other games
        console.error(`Error migrating game ${game.id || game.gameId}:`, error.message);
      }
    }
    
    // Mark migration as completed
    await dbManager.query(
      `INSERT INTO settings (userId, key_name, value) VALUES (?, 'games_migrated', 'true')
       ON DUPLICATE KEY UPDATE value = 'true'`,
      [userId]
    );
    
    console.log(`✅ Migrated ${migratedCount} games for user ${userId}`);
    return { success: true, migratedCount };
  } catch (error) {
    console.error('Error migrating games:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db-save-game', async (event, game) => {
  try {
    if (!dbManager) {
      dbManager = getDatabaseManager();
      const initialized = await dbManager.initialize();
      if (!initialized) {
        return { success: false, error: 'Database not available' };
      }
    }
    const existing = await dbManager.query('SELECT id FROM games WHERE id = ?', [game.id]);
    
    const screenshots = Array.isArray(game.screenshots) ? JSON.stringify(game.screenshots) : (game.screenshots || '[]');
    const metadata = typeof game.metadata === 'object' ? JSON.stringify(game.metadata) : (game.metadata || '{}');
    
    if (existing && Array.isArray(existing) && existing.length > 0) {
      // Update existing game
      await dbManager.query(
        `UPDATE games SET gameId = ?, name = ?, description = ?, developer = ?, version = ?, 
         status = ?, downloads = ?, banner = ?, logo = ?, title = ?, screenshots = ?, 
         metadata = ?, addedToLibraryAt = ?, purchasedAt = ? WHERE id = ?`,
        [
          game.gameId, game.name, game.description || null, game.developer || null,
          game.version || null, game.status || 'public', game.downloads || 0,
          game.banner || null, game.logo || null, game.title || null,
          screenshots, metadata, convertToMySQLDateTime(game.addedToLibraryAt), convertToMySQLDateTime(game.purchasedAt),
          game.id
        ]
      );
    } else {
      // Insert new game
      await dbManager.query(
        `INSERT INTO games (id, gameId, userId, name, description, developer, version, status, 
         downloads, banner, logo, title, screenshots, metadata, addedToLibraryAt, purchasedAt) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          game.id, game.gameId, game.userId, game.name, game.description || null,
          game.developer || null, game.version || null, game.status || 'public',
          game.downloads || 0, game.banner || null, game.logo || null,
          game.title || null, screenshots, metadata,
          convertToMySQLDateTime(game.addedToLibraryAt), convertToMySQLDateTime(game.purchasedAt)
        ]
      );
    }
    return { success: true };
  } catch (error) {
    console.error('Error saving game to database:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db-delete-game', async (event, gameId, userId) => {
  try {
    if (!dbManager) {
      dbManager = getDatabaseManager();
      const initialized = await dbManager.initialize();
      if (!initialized) {
        return { success: false, error: 'Database not available' };
      }
    }
    await dbManager.query('DELETE FROM games WHERE id = ? AND userId = ?', [gameId, userId]);
    return { success: true };
  } catch (error) {
    console.error('Error deleting game from database:', error);
    return { success: false, error: String(error.message || 'Unknown error') };
  }
});

ipcMain.handle('db-get-all-games', async () => {
  try {
    if (!dbManager) {
      dbManager = getDatabaseManager();
      const initialized = await dbManager.initialize();
      if (!initialized) {
        return { success: false, error: 'Database not available', games: [] };
      }
    }
    const games = await dbManager.query('SELECT * FROM games ORDER BY createdAt DESC');
    const parsedGames = [];
    if (Array.isArray(games)) {
      for (const game of games) {
        try {
          const screenshots = game.screenshots ? JSON.parse(game.screenshots) : [];
          const metadata = game.metadata ? JSON.parse(game.metadata) : {};
          // Ensure all data is serializable
          const serializableGame = JSON.parse(JSON.stringify({
            id: String(game.id || ''),
            gameId: String(game.gameId || ''),
            userId: String(game.userId || ''),
            name: String(game.name || ''),
            description: game.description ? String(game.description) : null,
            developer: game.developer ? String(game.developer) : null,
            version: game.version ? String(game.version) : null,
            status: String(game.status || 'public'),
            downloads: Number(game.downloads || 0),
            banner: game.banner ? String(game.banner) : null,
            logo: game.logo ? String(game.logo) : null,
            title: game.title ? String(game.title) : null,
            screenshots: Array.isArray(screenshots) ? screenshots : [],
            metadata: typeof metadata === 'object' && metadata !== null ? metadata : {},
            addedToLibraryAt: game.addedToLibraryAt ? String(game.addedToLibraryAt) : null,
            purchasedAt: game.purchasedAt ? String(game.purchasedAt) : null,
            createdAt: game.createdAt ? String(game.createdAt) : null,
            lastUpdated: game.lastUpdated ? String(game.lastUpdated) : null
          }));
          parsedGames.push(serializableGame);
        } catch (e) {
          // If parsing fails, return game with minimal safe data
          parsedGames.push({
            id: String(game.id || ''),
            gameId: String(game.gameId || ''),
            userId: String(game.userId || ''),
            name: String(game.name || ''),
            screenshots: [],
            metadata: {}
          });
        }
      }
    }
    return { success: true, games: parsedGames };
  } catch (error) {
    console.error('Error getting all games from database:', error);
    return { success: false, error: String(error.message || 'Unknown error'), games: [] };
  }
});

// Settings handlers
ipcMain.handle('db-get-setting', async (event, userId, key) => {
  try {
    if (!dbManager) {
      dbManager = getDatabaseManager();
      const initialized = await dbManager.initialize();
      if (!initialized) {
        return { success: false, error: 'Database not available', value: null };
      }
    }
    const result = await dbManager.query(
      'SELECT value FROM settings WHERE userId = ? AND key_name = ?',
      [userId, key]
    );
    if (result && Array.isArray(result) && result.length > 0 && result[0].value) {
      try {
        const parsed = JSON.parse(result[0].value);
        // Ensure the value is serializable
        const serializable = JSON.parse(JSON.stringify(parsed));
        return { success: true, value: serializable };
      } catch {
        // If it's not JSON, return as string
        return { success: true, value: String(result[0].value) };
      }
    }
    return { success: true, value: null };
  } catch (error) {
    console.error('Error getting setting from database:', error);
    // Return a safe, serializable error response
    return { success: false, error: String(error.message || 'Unknown error'), value: null };
  }
});

ipcMain.handle('db-save-setting', async (event, userId, key, value) => {
  try {
    if (!dbManager) {
      dbManager = getDatabaseManager();
      const initialized = await dbManager.initialize();
      if (!initialized) {
        return { success: false, error: 'Database not available' };
      }
    }
    // Ensure value is serializable before stringifying
    let valueStr;
    try {
      const serializable = JSON.parse(JSON.stringify(value));
      valueStr = typeof serializable === 'object' ? JSON.stringify(serializable) : String(serializable);
    } catch {
      valueStr = String(value);
    }
    await dbManager.query(
      `INSERT INTO settings (userId, key_name, value) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE value = ?, updatedAt = CURRENT_TIMESTAMP`,
      [userId, key, valueStr, valueStr]
    );
    return { success: true };
  } catch (error) {
    console.error('Error saving setting to database:', error);
    return { success: false, error: String(error.message || 'Unknown error') };
  }
});

ipcMain.handle('db-get-all-settings', async (event, userId) => {
  try {
    if (!dbManager) {
      dbManager = getDatabaseManager();
      const initialized = await dbManager.initialize();
      if (!initialized) {
        return { success: false, error: 'Database not available', settings: {} };
      }
    }
    const settings = await dbManager.query(
      'SELECT key_name, value FROM settings WHERE userId = ?',
      [userId]
    );
    const result = {};
    if (Array.isArray(settings)) {
      settings.forEach(setting => {
        try {
          if (setting.value) {
            const parsed = JSON.parse(setting.value);
            // Ensure the value is serializable
            result[setting.key_name] = JSON.parse(JSON.stringify(parsed));
          } else {
            result[setting.key_name] = null;
          }
        } catch {
          result[setting.key_name] = setting.value ? String(setting.value) : null;
        }
      });
    }
    return { success: true, settings: result };
  } catch (error) {
    console.error('Error getting all settings from database:', error);
    return { success: false, error: String(error.message || 'Unknown error'), settings: {} };
  }
});

// Ratings handlers
ipcMain.handle('db-get-rating', async (event, gameId, userId) => {
  try {
    if (!dbManager) {
      dbManager = getDatabaseManager();
      const initialized = await dbManager.initialize();
      if (!initialized) {
        return { success: false, error: 'Database not available', rating: null };
      }
    }
    const result = await dbManager.query(
      'SELECT * FROM ratings WHERE gameId = ? AND userId = ?',
      [gameId, userId]
    );
    const rating = (Array.isArray(result) && result.length > 0) ? result[0] : null;
    // Ensure rating is serializable
    const serializableRating = rating ? JSON.parse(JSON.stringify(rating)) : null;
    return { success: true, rating: serializableRating };
  } catch (error) {
    console.error('Error getting rating from database:', error);
    return { success: false, error: String(error.message || 'Unknown error'), rating: null };
  }
});

ipcMain.handle('db-save-rating', async (event, gameId, userId, rating, comment) => {
  try {
    if (!dbManager) {
      dbManager = getDatabaseManager();
      const initialized = await dbManager.initialize();
      if (!initialized) {
        return { success: false, error: 'Database not available' };
      }
    }
    await dbManager.query(
      `INSERT INTO ratings (gameId, userId, rating, comment) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE rating = ?, comment = ?, updatedAt = CURRENT_TIMESTAMP`,
      [gameId, userId, rating, comment || null, rating, comment || null]
    );
    return { success: true };
  } catch (error) {
    console.error('Error saving rating to database:', error);
    return { success: false, error: String(error.message || 'Unknown error') };
  }
});

ipcMain.handle('db-get-game-ratings', async (event, gameId) => {
  try {
    if (!dbManager) {
      dbManager = getDatabaseManager();
      const initialized = await dbManager.initialize();
      if (!initialized) {
        return { success: false, error: 'Database not available', ratings: [] };
      }
    }
    const ratings = await dbManager.query(
      'SELECT * FROM ratings WHERE gameId = ?',
      [gameId]
    );
    // Ensure all ratings are serializable
    const serializableRatings = Array.isArray(ratings) ? ratings.map(rating => {
      try {
        return JSON.parse(JSON.stringify(rating));
      } catch {
        return rating;
      }
    }) : [];
    return { success: true, ratings: serializableRatings };
  } catch (error) {
    console.error('Error getting game ratings from database:', error);
    return { success: false, error: String(error.message || 'Unknown error'), ratings: [] };
  }
});

// Playing games handlers
ipcMain.handle('db-save-playing-game', async (event, gameId, userId, startTime, endTime, duration) => {
  try {
    if (!dbManager) {
      dbManager = getDatabaseManager();
      const initialized = await dbManager.initialize();
      if (!initialized) {
        return { success: false, error: 'Database not available' };
      }
    }
    await dbManager.query(
      `INSERT INTO playing_games (gameId, userId, startTime, endTime, duration) 
       VALUES (?, ?, ?, ?, ?)`,
      [gameId, userId, convertToMySQLDateTime(startTime), convertToMySQLDateTime(endTime), duration || 0]
    );
    return { success: true };
  } catch (error) {
    console.error('Error saving playing game to database:', error);
    return { success: false, error: String(error.message || 'Unknown error') };
  }
});

ipcMain.handle('db-get-playing-games', async (event, userId) => {
  try {
    if (!dbManager) {
      dbManager = getDatabaseManager();
      const initialized = await dbManager.initialize();
      if (!initialized) {
        return { success: false, error: 'Database not available', games: [] };
      }
    }
    const games = await dbManager.query(
      'SELECT * FROM playing_games WHERE userId = ? AND endTime IS NULL ORDER BY startTime DESC',
      [userId]
    );
    // Ensure all games are serializable
    const serializableGames = Array.isArray(games) ? games.map(game => {
      try {
        return JSON.parse(JSON.stringify(game));
      } catch {
        return game;
      }
    }) : [];
    return { success: true, games: serializableGames };
  } catch (error) {
    console.error('Error getting playing games from database:', error);
    return { success: false, error: String(error.message || 'Unknown error'), games: [] };
  }
});

// Game states handlers
ipcMain.handle('db-get-game-state', async (event, gameId, userId) => {
  try {
    if (!dbManager) {
      dbManager = getDatabaseManager();
      const initialized = await dbManager.initialize();
      if (!initialized) {
        return { success: false, error: 'Database not available', state: null, status: null };
      }
    }
    const result = await dbManager.query(
      'SELECT * FROM game_states WHERE gameId = ? AND userId = ?',
      [gameId, userId]
    );
    if (result && Array.isArray(result) && result.length > 0) {
      const stateData = result[0];
      try {
        const state = stateData.state_data ? JSON.parse(stateData.state_data) : {};
        // Ensure state is serializable
        const serializableState = JSON.parse(JSON.stringify(state));
        return {
          success: true,
          state: serializableState,
          status: stateData.status ? String(stateData.status) : null
        };
      } catch {
        return {
          success: true,
          state: {},
          status: stateData.status ? String(stateData.status) : null
        };
      }
    }
    return { success: true, state: null, status: null };
  } catch (error) {
    console.error('Error getting game state from database:', error);
    return { success: false, error: String(error.message || 'Unknown error'), state: null, status: null };
  }
});

ipcMain.handle('db-save-game-state', async (event, gameId, userId, state, status) => {
  try {
    if (!dbManager) {
      dbManager = getDatabaseManager();
      const initialized = await dbManager.initialize();
      if (!initialized) {
        return { success: false, error: 'Database not available' };
      }
    }
    // Ensure state is serializable before stringifying
    let stateStr;
    try {
      const serializable = JSON.parse(JSON.stringify(state));
      stateStr = typeof serializable === 'object' ? JSON.stringify(serializable) : String(serializable);
    } catch {
      stateStr = String(state);
    }
    await dbManager.query(
      `INSERT INTO game_states (gameId, userId, state_data, status) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE state_data = ?, status = ?, updatedAt = CURRENT_TIMESTAMP`,
      [gameId, userId, stateStr, status || null, stateStr, status || null]
    );
    return { success: true };
  } catch (error) {
    console.error('Error saving game state to database:', error);
    return { success: false, error: String(error.message || 'Unknown error') };
  }
});

ipcMain.handle('db-delete-game-state', async (event, gameId, userId) => {
  try {
    if (!dbManager) {
      dbManager = getDatabaseManager();
      const initialized = await dbManager.initialize();
      if (!initialized) {
        return { success: false, error: 'Database not available' };
      }
    }
    await dbManager.query('DELETE FROM game_states WHERE gameId = ? AND userId = ?', [gameId, userId]);
    return { success: true };
  } catch (error) {
    console.error('Error deleting game state from database:', error);
    return { success: false, error: String(error.message || 'Unknown error') };
  }
});

// Inventory handlers
ipcMain.handle('db-get-inventory', async (event, userId) => {
  try {
    if (!dbManager) {
      dbManager = getDatabaseManager();
      const initialized = await dbManager.initialize();
      if (!initialized) {
        return { success: false, error: 'Database not available', items: [] };
      }
    }
    const items = await dbManager.query(
      'SELECT * FROM inventory WHERE userId = ? ORDER BY acquiredAt DESC',
      [userId]
    );
    const parsedItems = [];
    if (Array.isArray(items)) {
      for (const item of items) {
        try {
          const itemData = item.itemData ? JSON.parse(item.itemData) : {};
          // Ensure all data is serializable
          const serializableItem = JSON.parse(JSON.stringify({
            ...item,
            itemData: typeof itemData === 'object' && itemData !== null ? itemData : {}
          }));
          parsedItems.push(serializableItem);
        } catch {
          parsedItems.push({
            id: String(item.id || ''),
            userId: String(item.userId || ''),
            itemId: String(item.itemId || ''),
            itemType: String(item.itemType || ''),
            itemData: {},
            quantity: Number(item.quantity || 0)
          });
        }
      }
    }
    return { success: true, items: parsedItems };
  } catch (error) {
    console.error('Error getting inventory from database:', error);
    return { success: false, error: String(error.message || 'Unknown error'), items: [] };
  }
});

ipcMain.handle('db-save-inventory-item', async (event, userId, itemId, itemType, itemData, quantity) => {
  try {
    if (!dbManager) {
      dbManager = getDatabaseManager();
      const initialized = await dbManager.initialize();
      if (!initialized) {
        return { success: false, error: 'Database not available' };
      }
    }
    // Ensure itemData is serializable before stringifying
    let itemDataStr;
    try {
      const serializable = JSON.parse(JSON.stringify(itemData));
      itemDataStr = typeof serializable === 'object' ? JSON.stringify(serializable) : String(serializable);
    } catch {
      itemDataStr = String(itemData);
    }
    await dbManager.query(
      `INSERT INTO inventory (userId, itemId, itemType, itemData, quantity) 
       VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE quantity = quantity + ?`,
      [userId, itemId, itemType, itemDataStr, quantity || 1, quantity || 1]
    );
    return { success: true };
  } catch (error) {
    console.error('Error saving inventory item to database:', error);
    return { success: false, error: String(error.message || 'Unknown error') };
  }
});

// Developer access requests handlers
ipcMain.handle('db-get-developer-requests', async () => {
  try {
    if (!dbManager) {
      dbManager = getDatabaseManager();
      const initialized = await dbManager.initialize();
      if (!initialized) {
        return { success: false, error: 'Database not available', requests: [] };
      }
    }
    const requests = await dbManager.query(
      'SELECT * FROM developer_access_requests ORDER BY createdAt DESC'
    );
    // Ensure all requests are serializable
    const serializableRequests = Array.isArray(requests) ? requests.map(request => {
      try {
        return JSON.parse(JSON.stringify(request));
      } catch {
        return request;
      }
    }) : [];
    return { success: true, requests: serializableRequests };
  } catch (error) {
    console.error('Error getting developer requests from database:', error);
    return { success: false, error: String(error.message || 'Unknown error'), requests: [] };
  }
});

ipcMain.handle('db-save-developer-request', async (event, request) => {
  try {
    if (!dbManager) {
      dbManager = getDatabaseManager();
      const initialized = await dbManager.initialize();
      if (!initialized) {
        return { success: false, error: 'Database not available' };
      }
    }
    await dbManager.query(
      `INSERT INTO developer_access_requests (userId, username, email, reason, status) 
       VALUES (?, ?, ?, ?, ?)`,
      [request.userId, request.username, request.email, request.reason || null, request.status || 'pending']
    );
    return { success: true };
  } catch (error) {
    console.error('Error saving developer request to database:', error);
    return { success: false, error: String(error.message || 'Unknown error') };
  }
});

ipcMain.handle('db-update-developer-request', async (event, requestId, status) => {
  try {
    if (!dbManager) {
      dbManager = getDatabaseManager();
      await dbManager.initialize();
    }
    await dbManager.query(
      'UPDATE developer_access_requests SET status = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
      [status, requestId]
    );
    return { success: true };
  } catch (error) {
    console.error('Error updating developer request in database:', error);
    return { success: false, error: error.message };
  }
});

// Sidebar settings handlers
ipcMain.handle('db-get-sidebar-settings', async (event, userId) => {
  try {
    if (!dbManager) {
      dbManager = getDatabaseManager();
      await dbManager.initialize();
    }
    const [result] = await dbManager.query(
      'SELECT * FROM sidebar_settings WHERE userId = ?',
      [userId]
    );
    return { success: true, settings: result || { width: 260, manuallyResized: false, collapsed: false } };
  } catch (error) {
    console.error('Error getting sidebar settings from database:', error);
    return { success: false, error: error.message, settings: { width: 260, manuallyResized: false, collapsed: false } };
  }
});

ipcMain.handle('db-save-sidebar-settings', async (event, userId, settings) => {
  try {
    if (!dbManager) {
      dbManager = getDatabaseManager();
      await dbManager.initialize();
    }
    await dbManager.query(
      `INSERT INTO sidebar_settings (userId, width, manuallyResized, collapsed) 
       VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE width = ?, manuallyResized = ?, collapsed = ?`,
      [
        userId, settings.width || 260, settings.manuallyResized || false, settings.collapsed || false,
        settings.width || 260, settings.manuallyResized || false, settings.collapsed || false
      ]
    );
    return { success: true };
  } catch (error) {
    console.error('Error saving sidebar settings to database:', error);
    return { success: false, error: error.message };
  }
});

// Market settings handlers
ipcMain.handle('db-get-market-settings', async (event, userId) => {
  try {
    if (!dbManager) {
      dbManager = getDatabaseManager();
      await dbManager.initialize();
    }
    const [result] = await dbManager.query(
      'SELECT * FROM market_settings WHERE userId = ?',
      [userId]
    );
    return { success: true, settings: result || { rightSidebarWidth: 300, sidebarCollapsed: false } };
  } catch (error) {
    console.error('Error getting market settings from database:', error);
    return { success: false, error: error.message, settings: { rightSidebarWidth: 300, sidebarCollapsed: false } };
  }
});

ipcMain.handle('db-save-market-settings', async (event, userId, settings) => {
  try {
    if (!dbManager) {
      dbManager = getDatabaseManager();
      await dbManager.initialize();
    }
    await dbManager.query(
      `INSERT INTO market_settings (userId, rightSidebarWidth, sidebarCollapsed) 
       VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE rightSidebarWidth = ?, sidebarCollapsed = ?`,
      [
        userId, settings.rightSidebarWidth || 300, settings.sidebarCollapsed || false,
        settings.rightSidebarWidth || 300, settings.sidebarCollapsed || false
      ]
    );
    return { success: true };
  } catch (error) {
    console.error('Error saving market settings to database:', error);
    return { success: false, error: error.message };
  }
});

// Store settings handlers
ipcMain.handle('db-get-store-settings', async (event, userId) => {
  try {
    if (!dbManager) {
      dbManager = getDatabaseManager();
      await dbManager.initialize();
    }
    const [result] = await dbManager.query(
      'SELECT * FROM store_settings WHERE userId = ?',
      [userId]
    );
    return { success: true, settings: result || { activeFilter: 'grid', currency: 'USD' } };
  } catch (error) {
    console.error('Error getting store settings from database:', error);
    return { success: false, error: error.message, settings: { activeFilter: 'grid', currency: 'USD' } };
  }
});

ipcMain.handle('db-save-store-settings', async (event, userId, settings) => {
  try {
    if (!dbManager) {
      dbManager = getDatabaseManager();
      await dbManager.initialize();
    }
    await dbManager.query(
      `INSERT INTO store_settings (userId, activeFilter, currency) 
       VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE activeFilter = ?, currency = ?`,
      [
        userId, settings.activeFilter || 'grid', settings.currency || 'USD',
        settings.activeFilter || 'grid', settings.currency || 'USD'
      ]
    );
    return { success: true };
  } catch (error) {
    console.error('Error saving store settings to database:', error);
    return { success: false, error: error.message };
  }
});

// Library settings handlers
ipcMain.handle('db-get-library-settings', async (event, userId) => {
  try {
    if (!dbManager) {
      dbManager = getDatabaseManager();
      await dbManager.initialize();
    }
    const [result] = await dbManager.query(
      'SELECT * FROM library_settings WHERE userId = ?',
      [userId]
    );
    if (result && result.expandedFolders) {
      try {
        return { success: true, expandedFolders: JSON.parse(result.expandedFolders) };
      } catch {
        return { success: true, expandedFolders: [] };
      }
    }
    return { success: true, expandedFolders: [] };
  } catch (error) {
    console.error('Error getting library settings from database:', error);
    return { success: false, error: error.message, expandedFolders: [] };
  }
});

ipcMain.handle('db-save-library-settings', async (event, userId, expandedFolders) => {
  try {
    if (!dbManager) {
      dbManager = getDatabaseManager();
      await dbManager.initialize();
    }
    const foldersStr = Array.isArray(expandedFolders) ? JSON.stringify(expandedFolders) : '[]';
    await dbManager.query(
      `INSERT INTO library_settings (userId, expandedFolders) 
       VALUES (?, ?) ON DUPLICATE KEY UPDATE expandedFolders = ?`,
      [userId, foldersStr, foldersStr]
    );
    return { success: true };
  } catch (error) {
    console.error('Error saving library settings to database:', error);
    return { success: false, error: error.message };
  }
});

// Cart handlers
ipcMain.handle('db-get-cart-items', async (event, userId) => {
  try {
    if (!dbManager) {
      dbManager = getDatabaseManager();
      const initialized = await dbManager.initialize();
      if (!initialized) {
        return JSON.parse(JSON.stringify({ success: false, error: 'Database not available', items: [] }));
      }
    }
    const items = await dbManager.query(
      'SELECT * FROM cart_items WHERE userId = ? ORDER BY timestamp DESC',
      [userId]
    );
    const parsedItems = [];
    if (Array.isArray(items)) {
      for (const item of items) {
        try {
          // Convert timestamp to string if it's a Date object
          let timestamp = item.timestamp;
          if (timestamp instanceof Date) {
            timestamp = timestamp.toISOString();
          } else if (timestamp && typeof timestamp === 'object') {
            // Handle MySQL date objects
            try {
              const dateObj = new Date(timestamp);
              if (!isNaN(dateObj.getTime())) {
                timestamp = dateObj.toISOString();
              } else {
                timestamp = String(timestamp);
              }
            } catch {
              timestamp = String(timestamp || new Date().toISOString());
            }
          } else {
            timestamp = String(timestamp || new Date().toISOString());
          }
          
          // Parse itemData
          let itemData = {};
          if (item.itemData) {
            try {
              const parsed = typeof item.itemData === 'string' ? JSON.parse(item.itemData) : item.itemData;
              if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
                itemData = parsed;
              }
            } catch {
              itemData = {};
            }
          }
          
          // Create a plain serializable object
          const plainItem = {
            id: String(item.id || item.itemId || Date.now()),
            amount: parseFloat(item.amount || 0),
            timestamp: timestamp,
            itemType: String(item.itemType || 'funds'),
            itemData: itemData
          };
          
          // Ensure it's serializable by using JSON
          parsedItems.push(JSON.parse(JSON.stringify(plainItem)));
        } catch {
          parsedItems.push({
            id: String(item.id || item.itemId || Date.now()),
            amount: parseFloat(item.amount || 0),
            timestamp: new Date().toISOString(),
            itemType: String(item.itemType || 'funds'),
            itemData: {}
          });
        }
      }
    }
    // Return a serializable response
    return JSON.parse(JSON.stringify({ success: true, items: parsedItems }));
  } catch (error) {
    console.error('Error getting cart items from database:', error);
    return JSON.parse(JSON.stringify({ success: false, error: String(error.message || 'Unknown error'), items: [] }));
  }
});

ipcMain.handle('db-save-cart-items', async (event, userId, items) => {
  try {
    if (!dbManager) {
      dbManager = getDatabaseManager();
      const initialized = await dbManager.initialize();
      if (!initialized) {
        return JSON.parse(JSON.stringify({ success: false, error: 'Database not available' }));
      }
    }
    
    // First, delete all existing cart items for this user
    await dbManager.query('DELETE FROM cart_items WHERE userId = ?', [userId]);
    
    // Then insert all new items
    if (Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        // Ensure all values are primitives
        const itemId = String(item.id || Date.now());
        const itemType = String(item.itemType || 'funds');
        const itemAmount = parseFloat(item.amount || 0);
        
        // Convert timestamp to string if it's a Date object
        let itemTimestamp = item.timestamp;
        if (itemTimestamp instanceof Date) {
          itemTimestamp = itemTimestamp.toISOString();
        } else {
          itemTimestamp = String(itemTimestamp || new Date().toISOString());
        }
        
        // Serialize itemData
        let itemDataStr = '{}';
        if (item.itemData) {
          try {
            itemDataStr = JSON.stringify(item.itemData);
          } catch {
            itemDataStr = '{}';
          }
        }
        
        await dbManager.query(
          `INSERT INTO cart_items (userId, itemId, itemType, amount, itemData, timestamp) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [userId, itemId, itemType, itemAmount, itemDataStr, itemTimestamp]
        );
      }
    }
    return JSON.parse(JSON.stringify({ success: true }));
  } catch (error) {
    console.error('Error saving cart items to database:', error);
    return JSON.parse(JSON.stringify({ success: false, error: String(error.message || 'Unknown error') }));
  }
});

ipcMain.handle('db-clear-cart', async (event, userId) => {
  try {
    if (!dbManager) {
      dbManager = getDatabaseManager();
      const initialized = await dbManager.initialize();
      if (!initialized) {
        return JSON.parse(JSON.stringify({ success: false, error: 'Database not available' }));
      }
    }
    await dbManager.query('DELETE FROM cart_items WHERE userId = ?', [userId]);
    return JSON.parse(JSON.stringify({ success: true }));
  } catch (error) {
    console.error('Error clearing cart from database:', error);
    return JSON.parse(JSON.stringify({ success: false, error: String(error.message || 'Unknown error') }));
  }
});

// Reset migration status to force re-migration
ipcMain.handle('db-reset-migration', async () => {
  try {
    if (!dbManager) {
      dbManager = getDatabaseManager();
      await dbManager.initialize();
    }
    await dbManager.query(
      "DELETE FROM settings WHERE userId = 'system' AND key_name = 'migration_completed'"
    );
    console.log('✅ Migration status reset - migration will run on next app start');
    return { success: true };
  } catch (error) {
    console.error('Error resetting migration status:', error);
    return { success: false, error: error.message };
  }
});

// Password reset handlers
ipcMain.handle('request-password-reset', async (event, email) => {
  try {
    if (!dbManager) {
      dbManager = getDatabaseManager();
      const initialized = await dbManager.initialize();
      if (!initialized) {
        return { success: false, error: 'Database not available' };
      }
    }

    // Find user by email
    const users = await dbManager.query('SELECT id, email FROM users WHERE email = ?', [email.trim()]);
    if (!users || !Array.isArray(users) || users.length === 0) {
      // Don't reveal if email exists or not (security best practice)
      return { success: true, message: 'If an account with that email exists, a password reset link has been sent.' };
    }

    const user = users[0];
    const userId = user.id;

    // Generate reset token
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Token expires in 1 hour

    // Save token to database
    await dbManager.query(
      `INSERT INTO password_reset_tokens (userId, token, email, expiresAt, used) 
       VALUES (?, ?, ?, ?, FALSE)`,
      [userId, token, email.trim(), convertToMySQLDateTime(expiresAt.toISOString())]
    );

    // Generate reset URL
    // In a real app, this would be sent via email
    // For now, we'll log it to console and return it (for development/testing)
    const resetUrl = isDev 
      ? `http://localhost:3000/auth?resetToken=${token}`
      : `file://${path.join(__dirname, '../build/index.html')}/auth?resetToken=${token}`;

    console.log('🔐 Password reset link generated:');
    console.log(`   Email: ${email.trim()}`);
    console.log(`   Token: ${token}`);
    console.log(`   URL: ${resetUrl}`);
    console.log('   ⚠️ In production, this should be sent via email!');

    // TODO: Send email with reset link
    // For now, we'll simulate success
    return { 
      success: true, 
      message: 'If an account with that email exists, a password reset link has been sent.',
      resetUrl: resetUrl // Only for development/testing
    };
  } catch (error) {
    console.error('Error requesting password reset:', error);
    return { success: false, error: 'An error occurred. Please try again.' };
  }
});

ipcMain.handle('validate-password-reset-token', async (event, token) => {
  try {
    if (!dbManager) {
      dbManager = getDatabaseManager();
      const initialized = await dbManager.initialize();
      if (!initialized) {
        return { valid: false, error: 'Database not available' };
      }
    }

    // Check if token exists and is valid
    const tokens = await dbManager.query(
      'SELECT * FROM password_reset_tokens WHERE token = ? AND used = FALSE',
      [token]
    );

    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
      return { valid: false, error: 'Invalid or expired reset token.' };
    }

    const resetToken = tokens[0];
    const expiresAt = new Date(resetToken.expiresAt);
    const now = new Date();

    if (now > expiresAt) {
      // Mark token as used (expired)
      await dbManager.query('UPDATE password_reset_tokens SET used = TRUE WHERE token = ?', [token]);
      return { valid: false, error: 'This password reset link has expired.' };
    }

    return { valid: true, userId: resetToken.userId, email: resetToken.email };
  } catch (error) {
    console.error('Error validating password reset token:', error);
    return { valid: false, error: 'An error occurred while validating the reset link.' };
  }
});

ipcMain.handle('reset-password', async (event, token, newPassword) => {
  try {
    if (!dbManager) {
      dbManager = getDatabaseManager();
      const initialized = await dbManager.initialize();
      if (!initialized) {
        return { success: false, error: 'Database not available' };
      }
    }

    // Validate token first
    const validation = await ipcMain.emit('validate-password-reset-token', null, token);
    // Since emit doesn't work like that, we'll query directly
    const tokens = await dbManager.query(
      'SELECT * FROM password_reset_tokens WHERE token = ? AND used = FALSE',
      [token]
    );

    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
      return { success: false, error: 'Invalid or expired reset token.' };
    }

    const resetToken = tokens[0];
    const expiresAt = new Date(resetToken.expiresAt);
    const now = new Date();

    if (now > expiresAt) {
      await dbManager.query('UPDATE password_reset_tokens SET used = TRUE WHERE token = ?', [token]);
      return { success: false, error: 'This password reset link has expired.' };
    }

    const userId = resetToken.userId;

    // Check if new password is the same as previous password
    const previousPasswords = await dbManager.query(
      'SELECT password FROM previous_passwords WHERE userId = ? ORDER BY changedAt DESC LIMIT 1',
      [userId]
    );

    // Also check current password
    const currentUser = await dbManager.query('SELECT password FROM users WHERE id = ?', [userId]);
    if (currentUser && Array.isArray(currentUser) && currentUser.length > 0) {
      if (currentUser[0].password === newPassword) {
        return { success: false, error: 'The new password cannot be the same as your current password.' };
      }
    }

    // Check previous passwords
    if (previousPasswords && Array.isArray(previousPasswords) && previousPasswords.length > 0) {
      for (const prevPass of previousPasswords) {
        if (prevPass.password === newPassword) {
          return { success: false, error: 'The new password cannot be the same as a previously used password.' };
        }
      }
    }

    // Save current password to previous_passwords before updating
    if (currentUser && Array.isArray(currentUser) && currentUser.length > 0) {
      await dbManager.query(
        'INSERT INTO previous_passwords (userId, password) VALUES (?, ?)',
        [userId, currentUser[0].password]
      );
    }

    // Update user password
    await dbManager.query('UPDATE users SET password = ? WHERE id = ?', [newPassword, userId]);

    // Mark token as used
    await dbManager.query('UPDATE password_reset_tokens SET used = TRUE WHERE token = ?', [token]);

    console.log(`✅ Password reset successful for user ${userId}`);
    return { success: true, message: 'Password has been reset successfully.' };
  } catch (error) {
    console.error('Error resetting password:', error);
    return { success: false, error: 'An error occurred while resetting your password.' };
  }
});
