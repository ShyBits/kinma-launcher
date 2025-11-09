import React, { useEffect, useState } from 'react';
import AuthModal from '../components/AuthModal';

// Function to clear all users (can be called from console: window.clearAllUsers())
const clearAllUsers = async () => {
  try {
    console.log('🗑️ Starting to clear all users...');
    
    // Clear from file system first
    const api = window.electronAPI;
    if (api && api.clearAllUsers) {
      const result = await api.clearAllUsers();
      console.log('File system clear result:', result);
    } else {
      console.warn('Electron API not available');
    }
    
    // Clear from localStorage - remove all user-related keys
    try {
      localStorage.removeItem('users');
      localStorage.removeItem('authUser');
      // Note: User-specific developer access is stored per user, so we don't need to clear it here
      // It will be loaded when the user logs in again
      
      // Also check and remove any other user-related keys
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.toLowerCase().includes('user') || key.toLowerCase().includes('auth'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => {
        try {
          localStorage.removeItem(key);
          console.log('Removed localStorage key:', key);
        } catch (e) {
          console.warn('Could not remove key:', key, e);
        }
      });
      
      console.log('✅ All users cleared from localStorage');
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
    
    // Verify that users are actually cleared
    if (api && api.getUsers) {
      const verifyResult = await api.getUsers();
      console.log('Verification - Users remaining:', verifyResult?.users?.length || 0);
      
      if (verifyResult?.users?.length > 0) {
        console.warn('⚠️ Warning: Some users still exist after clearing!', verifyResult.users);
      }
    }
    
    console.log('✅ All users cleared successfully');
    alert('All users have been cleared from file system and cache!\n\nPlease refresh the page.');
    
    // Reload the page to ensure fresh state
    window.location.reload();
  } catch (error) {
    console.error('Error clearing all users:', error);
    alert('Error clearing users: ' + error.message);
  }
};

// Expose function globally for easy access
if (typeof window !== 'undefined') {
  window.clearAllUsers = clearAllUsers;
}

const Auth = ({ navigate }) => {
  const [ready, setReady] = useState(false);
  const [windowHeight, setWindowHeight] = useState(925); // Default height
  const [windowWidth, setWindowWidth] = useState(600); // Default width
  
  useEffect(() => {
    const init = async () => {
      const api = window.electronAPI || window.electron;
      let forceAuth = false;
      try { forceAuth = await api?.isForceAuth?.(); } catch (_) {}
      
      // Check if this is an "add account" scenario (opened from account switcher)
      // Check both hash and search params (hash routing uses hash, regular routing uses search)
      const hash = window.location.hash || '';
      const hashParams = hash.includes('?') ? hash.split('?')[1] : '';
      const searchParams = window.location.search || '';
      const urlParams = hashParams 
        ? new URLSearchParams(hashParams)
        : new URLSearchParams(searchParams);
      const isAddAccount = urlParams.get('addAccount') === 'true';
      
      // Skip auto-login if this is an "add account" scenario
      if (!isAddAccount) {
        // Check for existing auth user - if authenticated, redirect to library
        try {
          const saved = await api?.getAuthUser?.();
          // Also check if user is actually logged in (not in intermediate state)
          if (saved && saved.id && !forceAuth) {
            // Verify user is actually logged in by checking users.json
            try {
              const usersResult = await api?.getUsers?.();
              if (usersResult && usersResult.success && Array.isArray(usersResult.users)) {
                const user = usersResult.users.find(u => u.id === saved.id);
                // Only redirect if user exists and is actually logged in
                if (user && user.isLoggedIn === true) {
                  navigate('/library');
                  return;
                } else {
                  // User exists but is not logged in - clear intermediate state
                  try {
                    localStorage.removeItem('authUser');
                    await api?.setAuthUser?.(null);
                  } catch (_) {}
                }
              } else {
                // No users found - clear intermediate state
                try {
                  localStorage.removeItem('authUser');
                  await api?.setAuthUser?.(null);
                } catch (_) {}
              }
            } catch (_) {
              // If we can't verify, still try to navigate (fallback)
              navigate('/library');
              return;
            }
          }
        } catch (_) {}
        
        // Check for users with "stay logged in" enabled and isLoggedIn: true
        if (!forceAuth) {
          try {
            const usersResult = await api?.getUsers?.();
            if (usersResult && usersResult.success && Array.isArray(usersResult.users)) {
              // Find users with stayLoggedIn: true and isLoggedIn: true
              const stayLoggedInUsers = usersResult.users.filter(u => 
                u.stayLoggedIn === true && 
                u.isLoggedIn === true
              );
              
              if (stayLoggedInUsers.length > 0) {
                // Sort by lastLoginTime (most recent first)
                stayLoggedInUsers.sort((a, b) => {
                  const timeA = a.lastLoginTime ? new Date(a.lastLoginTime).getTime() : 0;
                  const timeB = b.lastLoginTime ? new Date(b.lastLoginTime).getTime() : 0;
                  return timeB - timeA; // Descending order (most recent first)
                });
                
                // Auto-login with the most recently logged in user
                const autoLoginUser = stayLoggedInUsers[0];
                const authUserData = {
                  id: autoLoginUser.id,
                  email: autoLoginUser.email,
                  name: autoLoginUser.name || autoLoginUser.username || autoLoginUser.email?.split('@')[0] || 'User'
                };
                
                // Set auth user and navigate to library
                try {
                  await api?.setAuthUser?.(authUserData);
                  await api?.authSuccess?.(authUserData);
                  
                  // Update last login time
                  const userIndex = usersResult.users.findIndex(u => u.id === autoLoginUser.id);
                  if (userIndex !== -1) {
                    usersResult.users[userIndex].lastLoginTime = new Date().toISOString();
                    usersResult.users[userIndex].isLoggedIn = true;
                    // IMPORTANT: Clear hiddenInSwitcher flag when user logs in - account should be visible again
                    usersResult.users[userIndex].hiddenInSwitcher = false;
                    await api?.saveUsers?.(usersResult.users);
                  }
                  
                  // Set localStorage
                  try { 
                    localStorage.setItem('authUser', JSON.stringify(authUserData)); 
                  } catch (_) {}
                  
                  // Dispatch user-changed event
                  window.dispatchEvent(new Event('user-changed'));
                  
                  // Navigate to library
                  navigate('/library');
                  return;
                } catch (error) {
                  console.error('Error during auto-login:', error);
                  // Fall through to show auth window if auto-login fails
                }
              }
            }
          } catch (error) {
            console.error('Error checking for stay logged in users:', error);
            // Fall through to show auth window on error
          }
        }
        
        // If no auth user and no stay logged in users, show auth window
      }
      
      // Auth window should ALWAYS be 600px wide and use default height
      // AuthModal will calculate and update the height based on its content
      let currentWidth = 600; // Always 600px for auth window
      let currentHeight = 925; // Default height - AuthModal will update this
      
      // Resize window immediately to 600px width with default height
      // AuthModal will call onHeightChange to update to the correct height once it renders
      try {
        if (api?.resizeWindow) {
          api.resizeWindow(currentWidth, currentHeight);
        }
        if (api?.centerWindow) {
          api.centerWindow();
        }
      } catch (_) {}
      
      // Update state after resize
      setWindowWidth(currentWidth); // Always 600
      setWindowHeight(currentHeight);
      
      setReady(true);
    };
    init();
  }, [navigate]); // Remove windowHeight/windowWidth from dependencies to prevent loops

  // Update window height when modal height changes
  const handleHeightChange = async (newHeight) => {
    setWindowHeight(newHeight);
    const api = window.electronAPI || window.electron;
    try {
      // Always use 600px width for auth window
      api?.resizeWindow && api.resizeWindow(600, newHeight);
    } catch (_) {}
  };

  if (!ready) return null;
  return (
    <AuthModal
      isOpen={true}
      onClose={() => navigate('/library')}
      onAuthenticated={({ user, developerChosen }) => {
        const api = window.electronAPI;
        try {
          api?.setAuthUser && api.setAuthUser(user);
        } catch (_) {}
        try {
          api?.authSuccess && api.authSuccess(user);
          
          // Dispatch user-changed event so all components reload user-specific data
          window.dispatchEvent(new Event('user-changed'));
        } catch (_) {}
        if (developerChosen) navigate('/developer-onboarding');
        else navigate('/library');
      }}
      fullscreen
      variant="page"
      onHeightChange={handleHeightChange}
    />
  );
};

export default Auth;

