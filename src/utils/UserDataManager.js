/**
 * UserDataManager - Utility functions for managing per-user data
 * Ensures each account has its own isolated data (games, settings, etc.)
 */

/**
 * Get the current authenticated user ID
 * @returns {string|null} The current user ID or null
 */
export const getCurrentUserId = () => {
  try {
    // Try Electron store first
    const api = window.electronAPI;
    if (api?.getAuthUser) {
      // This is async, but we'll use localStorage as fallback
    }
    
    // Fallback to localStorage
    const authUser = localStorage.getItem('authUser');
    if (authUser) {
      const user = JSON.parse(authUser);
      return user.id || null;
    }
  } catch (error) {
    console.error('Error getting current user ID:', error);
  }
  return null;
};

/**
 * Get a user-scoped key for localStorage
 * @param {string} baseKey - The base key (e.g., 'customGames')
 * @param {string|null} userId - Optional user ID, if not provided uses current user
 * @returns {string} The scoped key (e.g., 'customGames_user123')
 */
export const getUserScopedKey = (baseKey, userId = null) => {
  const currentUserId = userId || getCurrentUserId();
  if (!currentUserId) {
    // If no user, return base key (fallback for guest/anonymous)
    return baseKey;
  }
  return `${baseKey}_${currentUserId}`;
};

/**
 * Get user-specific data from localStorage
 * @param {string} baseKey - The base key (e.g., 'customGames')
 * @param {any} defaultValue - Default value if not found
 * @param {string|null} userId - Optional user ID
 * @returns {any} The stored data or default value
 */
export const getUserData = (baseKey, defaultValue = null, userId = null) => {
  try {
    const scopedKey = getUserScopedKey(baseKey, userId);
    const stored = localStorage.getItem(scopedKey);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error(`Error getting user data for ${baseKey}:`, error);
  }
  return defaultValue;
};

/**
 * Save user-specific data to localStorage
 * @param {string} baseKey - The base key (e.g., 'customGames')
 * @param {any} data - The data to save
 * @param {string|null} userId - Optional user ID
 * @returns {boolean} Success status
 */
export const saveUserData = (baseKey, data, userId = null) => {
  try {
    const scopedKey = getUserScopedKey(baseKey, userId);
    localStorage.setItem(scopedKey, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error(`Error saving user data for ${baseKey}:`, error);
    return false;
  }
};

/**
 * Remove user-specific data from localStorage
 * @param {string} baseKey - The base key
 * @param {string|null} userId - Optional user ID
 */
export const removeUserData = (baseKey, userId = null) => {
  try {
    const scopedKey = getUserScopedKey(baseKey, userId);
    localStorage.removeItem(scopedKey);
  } catch (error) {
    console.error(`Error removing user data for ${baseKey}:`, error);
  }
};

/**
 * Migrate old data to user-scoped keys (one-time migration)
 * @param {string} baseKey - The base key to migrate
 */
export const migrateOldData = async (baseKey) => {
  try {
    const oldData = localStorage.getItem(baseKey);
    if (!oldData) return; // No old data to migrate
    
    const currentUserId = getCurrentUserId();
    if (!currentUserId) return; // No user logged in, can't migrate
    
    const scopedKey = getUserScopedKey(baseKey, currentUserId);
    const existingScopedData = localStorage.getItem(scopedKey);
    
    // Only migrate if scoped data doesn't exist
    if (!existingScopedData) {
      localStorage.setItem(scopedKey, oldData);
      console.log(`Migrated ${baseKey} to ${scopedKey} for user ${currentUserId}`);
    }
  } catch (error) {
    console.error(`Error migrating ${baseKey}:`, error);
  }
};

/**
 * Get all user-specific keys for a base key (for admin/debugging)
 * @param {string} baseKey - The base key
 * @returns {Array<string>} Array of all scoped keys found
 */
export const getAllUserScopedKeys = (baseKey) => {
  const keys = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`${baseKey}_`)) {
        keys.push(key);
      }
    }
  } catch (error) {
    console.error('Error getting user scoped keys:', error);
  }
  return keys;
};

/**
 * Get all published games from all users (for Store/marketplace)
 * @param {string} baseKey - The base key (e.g., 'customGames')
 * @returns {Array} Array of all games from all users
 */
export const getAllUsersData = (baseKey) => {
  const allData = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`${baseKey}_`)) {
        try {
          const stored = localStorage.getItem(key);
          if (stored) {
            const data = JSON.parse(stored);
            if (Array.isArray(data)) {
              // Add all items from this user's array
              allData.push(...data);
            } else if (data && typeof data === 'object') {
              // If it's an object, add it as a single item
              allData.push(data);
            }
          }
        } catch (e) {
          console.error(`Error parsing data for key ${key}:`, e);
        }
      }
    }
  } catch (error) {
    console.error('Error getting all users data:', error);
  }
  return allData;
};

