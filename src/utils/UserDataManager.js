/**
 * UserDataManager - Utility functions for managing per-user data
 * Now uses database for persistent storage instead of localStorage
 */

/**
 * Get the current authenticated user ID
 * @returns {Promise<string|null>} The current user ID or null
 */
export const getCurrentUserId = async () => {
  try {
    // Try Electron API first
    const api = window.electronAPI;
    if (api?.getAuthUser) {
      const authUser = await api.getAuthUser();
      if (authUser && authUser.id) {
        return authUser.id;
      }
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
 * Get user-specific data from database
 * @param {string} baseKey - The base key (e.g., 'customGames')
 * @param {any} defaultValue - Default value if not found
 * @param {string|null} userId - Optional user ID
 * @returns {Promise<any>} The stored data or default value
 */
export const getUserData = async (baseKey, defaultValue = null, userId = null) => {
  try {
    const currentUserId = userId || await getCurrentUserId();
    if (!currentUserId) {
      return defaultValue;
    }

    const api = window.electronAPI;
    if (!api) {
      // Fallback to localStorage if Electron API not available
      const scopedKey = `${baseKey}_${currentUserId}`;
      const stored = localStorage.getItem(scopedKey);
      if (stored) {
        return JSON.parse(stored);
      }
      return defaultValue;
    }

    // Use database based on baseKey
    switch (baseKey) {
      case 'customGames':
        const gamesResult = await api.dbGetGames(currentUserId);
        if (gamesResult.success && gamesResult.games) {
          // Check if we need to migrate from localStorage
          if (gamesResult.games.length === 0) {
            try {
              const scopedKey = `${baseKey}_${currentUserId}`;
              const localStorageData = localStorage.getItem(scopedKey);
              if (localStorageData) {
                const parsedGames = JSON.parse(localStorageData);
                if (Array.isArray(parsedGames) && parsedGames.length > 0) {
                  console.log(`🔄 Migrating ${parsedGames.length} games from localStorage for user ${currentUserId}`);
                  await api.dbMigrateGames(currentUserId, parsedGames);
                  // Reload games from database
                  const reloadResult = await api.dbGetGames(currentUserId);
                  if (reloadResult.success && reloadResult.games) {
                    return reloadResult.games;
                  }
                }
              }
            } catch (error) {
              console.error('Error migrating games from localStorage:', error);
            }
          }
          return gamesResult.games;
        }
        break;
      
      case 'launcherSettings':
        const settingsResult = await api.dbGetAllSettings(currentUserId);
        if (settingsResult.success && settingsResult.settings) {
          // Check if we need to migrate from localStorage
          if (Object.keys(settingsResult.settings).length === 0) {
            try {
              const localStorageData = localStorage.getItem('launcherSettings');
              if (localStorageData) {
                let parsedSettings;
                try {
                  parsedSettings = JSON.parse(localStorageData);
                } catch (parseError) {
                  console.error('Error parsing launcherSettings from localStorage:', parseError);
                  return defaultValue || {};
                }
                
                if (parsedSettings && typeof parsedSettings === 'object') {
                  console.log(`🔄 Migrating settings from localStorage for user ${currentUserId}`);
                  for (const [key, value] of Object.entries(parsedSettings)) {
                    try {
                      // Ensure each value is serializable
                      let serializableValue = value;
                      try {
                        serializableValue = JSON.parse(JSON.stringify(value));
                      } catch {
                        // If value can't be serialized, skip it
                        console.warn(`Skipping non-serializable setting: ${key}`);
                        continue;
                      }
                      await api.dbSaveSetting(currentUserId, key, serializableValue);
                    } catch (saveError) {
                      // If save fails, continue with other settings
                      console.warn(`Could not save setting ${key}:`, saveError?.message || 'Unknown error');
                    }
                  }
                  // Reload settings from database
                  const reloadResult = await api.dbGetAllSettings(currentUserId);
                  if (reloadResult.success && reloadResult.settings) {
                    return reloadResult.settings;
                  }
                }
              }
            } catch (error) {
              const errorMsg = error?.message || String(error) || 'Unknown error';
              console.error('Error migrating settings from localStorage:', errorMsg);
            }
          }
          return settingsResult.settings;
        }
        break;
      
      default:
        // For other keys, use settings table
        try {
          const settingResult = await api.dbGetSetting(currentUserId, baseKey);
          if (settingResult && settingResult.success && settingResult.value !== null) {
            // Ensure the value is serializable
            try {
              // Deep clone to ensure serializability
              const cloned = JSON.parse(JSON.stringify(settingResult.value));
              return cloned;
            } catch (cloneError) {
              // If cloning fails, return primitive value or null
              const value = settingResult.value;
              if (value === null || value === undefined) {
                return defaultValue;
              }
              // Return primitive types as-is, but clone objects
              if (typeof value === 'object') {
                try {
                  return JSON.parse(JSON.stringify(value));
                } catch {
                  return defaultValue;
                }
              }
              return value;
            }
          }
        } catch (error) {
          // Catch IPC serialization errors specifically
          // The error might be "An object could not be cloned" from Electron IPC
          // In this case, we should just return the default value without logging
          let errorString;
          try {
            errorString = String(error);
          } catch {
            // If we can't even stringify the error, it's definitely not serializable
            return defaultValue;
          }
          
          if (errorString.includes('could not be cloned') || 
              errorString.includes('Database not available') ||
              errorString.includes('ETIMEDOUT') ||
              errorString.includes('ECONNREFUSED')) {
            // Silently return default value for IPC/cloning/connection errors
            return defaultValue;
          }
          
          // Only log other errors, and do it safely
          try {
            const errorMsg = error?.message || errorString || 'Unknown error';
            // Use setTimeout to log asynchronously to avoid IPC serialization issues
            setTimeout(() => {
              try {
                console.error(`Error getting setting ${baseKey}:`, errorMsg);
              } catch {
                // If logging fails, ignore it
              }
            }, 0);
          } catch {
            // If we can't extract error message, just return default
          }
          return defaultValue;
        }
        // Try to migrate from localStorage if not found in database
        try {
          const scopedKey = `${baseKey}_${currentUserId}`;
          const localStorageData = localStorage.getItem(scopedKey);
          if (localStorageData) {
            let parsedData;
            try {
              parsedData = JSON.parse(localStorageData);
            } catch (parseError) {
              console.error(`Error parsing localStorage data for ${baseKey}:`, parseError);
              return defaultValue;
            }
            
            console.log(`🔄 Migrating ${baseKey} from localStorage for user ${currentUserId}`);
            // Ensure data is serializable before saving
            let serializable;
            try {
              // First attempt: try to serialize the data
              serializable = JSON.parse(JSON.stringify(parsedData));
            } catch (serializeError) {
              // If serialization fails, try to clean the data
              console.warn(`Data for ${baseKey} contains non-serializable content, cleaning...`);
              try {
                // Recursively clean the object to remove functions, undefined, etc.
                const cleanData = (obj) => {
                  if (obj === null || obj === undefined) return null;
                  if (typeof obj !== 'object') return obj;
                  if (Array.isArray(obj)) {
                    return obj.map(cleanData).filter(item => item !== undefined);
                  }
                  const cleaned = {};
                  for (const [key, value] of Object.entries(obj)) {
                    if (typeof value !== 'function' && value !== undefined) {
                      try {
                        cleaned[key] = cleanData(value);
                      } catch {
                        // Skip this property if it can't be cleaned
                      }
                    }
                  }
                  return cleaned;
                };
                serializable = cleanData(parsedData);
                // Try to serialize again after cleaning
                serializable = JSON.parse(JSON.stringify(serializable));
              } catch (cleanError) {
                console.error(`Could not serialize data for ${baseKey}, returning default value`);
                return defaultValue;
              }
            }
            
            // Try to save to database, but don't fail if it doesn't work
            try {
              await api.dbSaveSetting(currentUserId, baseKey, serializable);
            } catch (saveError) {
              // If save fails (e.g., database not available), just return the serializable data
              console.warn(`Could not save ${baseKey} to database, returning from localStorage`);
            }
            return serializable;
          }
        } catch (error) {
          // Only log error message, not the full error object
          const errorMsg = error?.message || String(error) || 'Unknown error';
          console.error(`Error migrating ${baseKey} from localStorage:`, errorMsg);
        }
        break;
    }
  } catch (error) {
    console.error(`Error getting user data for ${baseKey}:`, error);
  }
  return defaultValue;
};

/**
 * Save user-specific data to database
 * @param {string} baseKey - The base key (e.g., 'customGames')
 * @param {any} data - The data to save
 * @param {string|null} userId - Optional user ID
 * @returns {Promise<boolean>} Success status
 */
export const saveUserData = async (baseKey, data, userId = null) => {
  try {
    const currentUserId = userId || await getCurrentUserId();
    if (!currentUserId) {
      console.warn('Cannot save data: no user ID');
      return false;
    }

    const api = window.electronAPI;
    if (!api) {
      // Fallback to localStorage if Electron API not available
      const scopedKey = `${baseKey}_${currentUserId}`;
      localStorage.setItem(scopedKey, JSON.stringify(data));
      return true;
    }

    // Use database based on baseKey
    switch (baseKey) {
      case 'customGames':
        // Save each game individually
        if (Array.isArray(data)) {
          for (const game of data) {
            // Ensure game object is serializable (remove any functions, circular refs, etc.)
            const serializableGame = JSON.parse(JSON.stringify({
              ...game,
              userId: currentUserId
            }));
            await api.dbSaveGame(serializableGame);
          }
          return true;
        }
        break;
      
      case 'launcherSettings':
        // Save all settings
        if (typeof data === 'object') {
          for (const [key, value] of Object.entries(data)) {
            try {
              // Ensure each value is serializable before saving
              let serializableValue = value;
              try {
                serializableValue = JSON.parse(JSON.stringify(value));
              } catch {
                // If value can't be serialized, skip it
                console.warn(`Skipping non-serializable setting: ${key}`);
                continue;
              }
              await api.dbSaveSetting(currentUserId, key, serializableValue);
            } catch (saveError) {
              // If save fails, continue with other settings
              console.warn(`Could not save setting ${key}:`, saveError?.message || 'Unknown error');
            }
          }
          return true;
        }
        break;
      
      default:
        // For other keys, use settings table
        try {
          // Ensure data is serializable before saving
          let serializableData = data;
          try {
            serializableData = JSON.parse(JSON.stringify(data));
          } catch {
            console.warn(`Data for ${baseKey} is not serializable, attempting to clean...`);
            // Try to clean the data
            const cleanData = (obj) => {
              if (obj === null || obj === undefined) return null;
              if (typeof obj !== 'object') return obj;
              if (Array.isArray(obj)) {
                return obj.map(cleanData).filter(item => item !== undefined);
              }
              const cleaned = {};
              for (const [key, value] of Object.entries(obj)) {
                if (typeof value !== 'function' && value !== undefined) {
                  try {
                    cleaned[key] = cleanData(value);
                  } catch {
                    // Skip this property
                  }
                }
              }
              return cleaned;
            };
            serializableData = cleanData(data);
            serializableData = JSON.parse(JSON.stringify(serializableData));
          }
          await api.dbSaveSetting(currentUserId, baseKey, serializableData);
          return true;
        } catch (error) {
          console.error(`Error saving ${baseKey}:`, error?.message || 'Unknown error');
          return false;
        }
    }
  } catch (error) {
    console.error(`Error saving user data for ${baseKey}:`, error);
    return false;
  }
  return false;
};

/**
 * Remove user-specific data from database
 * @param {string} baseKey - The base key
 * @param {string|null} userId - Optional user ID
 * @returns {Promise<void>}
 */
export const removeUserData = async (baseKey, userId = null) => {
  try {
    const currentUserId = userId || await getCurrentUserId();
    if (!currentUserId) {
      return;
    }

    const api = window.electronAPI;
    if (!api) {
      // Fallback to localStorage
      const scopedKey = `${baseKey}_${currentUserId}`;
      localStorage.removeItem(scopedKey);
      return;
    }

    // For settings, delete from settings table
    if (baseKey !== 'customGames') {
      // Note: We don't have a delete setting handler, so we'll set it to null
      await api.dbSaveSetting(currentUserId, baseKey, null);
    }
  } catch (error) {
    console.error(`Error removing user data for ${baseKey}:`, error);
  }
};

/**
 * Get all published games from all users (for Store/marketplace)
 * @param {string} baseKey - The base key (e.g., 'customGames')
 * @returns {Promise<Array>} Array of all games from all users
 */
export const getAllUsersData = async (baseKey) => {
  try {
    const api = window.electronAPI;
    if (!api) {
      // Fallback to localStorage
      const allData = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(`${baseKey}_`)) {
          try {
            const stored = localStorage.getItem(key);
            if (stored) {
              const data = JSON.parse(stored);
              if (Array.isArray(data)) {
                allData.push(...data);
              } else if (data && typeof data === 'object') {
                allData.push(data);
              }
            }
          } catch (e) {
            console.error(`Error parsing data for key ${key}:`, e);
          }
        }
      }
      return allData;
    }

    if (baseKey === 'customGames') {
      const result = await api.dbGetAllGames();
      if (result.success && result.games) {
        return result.games;
      }
    }
  } catch (error) {
    console.error('Error getting all users data:', error);
  }
  return [];
};

/**
 * Get a user-scoped key for localStorage (for backward compatibility)
 * @param {string} baseKey - The base key (e.g., 'customGames')
 * @param {string|null} userId - Optional user ID, if not provided uses current user
 * @returns {Promise<string>} The scoped key (e.g., 'customGames_user123')
 */
export const getUserScopedKey = async (baseKey, userId = null) => {
  const currentUserId = userId || await getCurrentUserId();
  if (!currentUserId) {
    return baseKey;
  }
  return `${baseKey}_${currentUserId}`;
};

/**
 * Migrate old data to database (one-time migration)
 * @param {string} baseKey - The base key to migrate
 */
export const migrateOldData = async (baseKey) => {
  try {
    const oldData = localStorage.getItem(baseKey);
    if (!oldData) return; // No old data to migrate
    
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) return; // No user logged in, can't migrate
    
    const scopedKey = await getUserScopedKey(baseKey, currentUserId);
    const existingScopedData = localStorage.getItem(scopedKey);
    
    // Only migrate if scoped data doesn't exist
    if (!existingScopedData) {
      const parsedData = JSON.parse(oldData);
      await saveUserData(baseKey, parsedData, currentUserId);
      console.log(`Migrated ${baseKey} to database for user ${currentUserId}`);
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
