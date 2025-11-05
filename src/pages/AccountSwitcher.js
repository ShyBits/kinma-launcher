import React, { useEffect, useState } from 'react';
import AccountSwitcher from '../components/AccountSwitcher';

const AccountSwitcherPage = ({ navigate }) => {
  const [ready, setReady] = useState(false);
  const [windowHeight, setWindowHeight] = useState(600);
  const [windowWidth, setWindowWidth] = useState(600);

  useEffect(() => {
    const init = async () => {
      const api = window.electronAPI || window.electron;
      
      // Check if there's a pending account switch from quick switch menu
      const pendingSwitch = sessionStorage.getItem('pendingAccountSwitch');
      if (pendingSwitch) {
        try {
          const userToSwitch = JSON.parse(pendingSwitch);
          console.log('🔄 AccountSwitcherPage: Pending switch detected on init:', userToSwitch.name || userToSwitch.username);
          // DON'T remove it here - let the component read it first
          
          // Account switcher should ALWAYS be 700px wide
          let currentWidth = 700;
          let currentHeight = 450;
          
          try {
            if (api?.resizeWindow) {
              api.resizeWindow(currentWidth, currentHeight);
            }
            if (api?.centerWindow) {
              api.centerWindow();
            }
          } catch (_) {}
          
          setWindowWidth(currentWidth);
          setWindowHeight(currentHeight);
          setReady(true);
          
          // Component will detect pending switch and show loading screen
          // Then we'll trigger the switch handler after a delay
          
          return;
        } catch (error) {
          console.error('Error parsing pending account switch:', error);
          sessionStorage.removeItem('pendingAccountSwitch');
        }
      }
      
      // Account switcher should ALWAYS be 700px wide
      let currentWidth = 700;
      // Use calculated height based on accounts, not the app window height
      let currentHeight = 450; // Default initial height
      
      try {
        if (api?.resizeWindow) {
          api.resizeWindow(currentWidth, currentHeight);
        }
        if (api?.centerWindow) {
          api.centerWindow();
        }
      } catch (_) {}
      
      setWindowWidth(currentWidth);
      setWindowHeight(currentHeight);
      setReady(true);
    };
    init();
  }, [navigate]);

  const handleHeightChange = async (newHeight) => {
    setWindowHeight(newHeight);
    const api = window.electronAPI || window.electron;
    try {
      api?.resizeWindow && api.resizeWindow(600, newHeight);
    } catch (_) {}
  };

  const switchHandler = async (user) => {
    const api = window.electronAPI;
    try {
      console.log('🔄 Starting account switch for:', user.email || user.username);
      
      // Dispatch event to show loading screen FIRST with user data
      window.dispatchEvent(new CustomEvent('account-switcher-login-start', {
        detail: { user }
      }));
      
      // Wait a moment for loading screen to fully render and be visible
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Step 1: Get current user and log them out if they don't have "keep me signed in" enabled
      try {
        const result = await api?.getUsers?.();
        if (result && result.success && Array.isArray(result.users)) {
          const users = result.users;
          
          // Get current authenticated user
          const currentAuthUser = await api?.getAuthUser?.();
          if (currentAuthUser && currentAuthUser.id && currentAuthUser.id !== user.id) {
            const currentUserIndex = users.findIndex(u => u.id === currentAuthUser.id);
            if (currentUserIndex !== -1) {
              const currentUser = users[currentUserIndex];
              // If current user doesn't have "keep me signed in" enabled, log them out
              if (currentUser.stayLoggedIn !== true) {
                users[currentUserIndex].isLoggedIn = false;
                console.log('✅ Logged out previous user (stayLoggedIn not enabled)');
                await api?.saveUsers?.(users);
              }
            }
          }
          
          // Step 2: Update last login time for the new user
          const userIndex = users.findIndex(u => u.id === user.id);
          if (userIndex !== -1) {
            users[userIndex].lastLoginTime = new Date().toISOString();
            users[userIndex].isLoggedIn = true; // Mark as logged in
            await api?.saveUsers?.(users);
            console.log('✅ Updated last login time');
          }
        }
      } catch (error) {
        console.error('Error updating last login time:', error);
      }
      
      // Step 3: Set auth user in localStorage for immediate access
      try {
        const authUserData = { 
          id: user.id, 
          email: user.email, 
          name: user.name || user.username || user.email?.split('@')[0] || 'User' 
        };
        localStorage.setItem('authUser', JSON.stringify(authUserData));
        console.log('✅ Set auth user in localStorage');
      } catch (error) {
        console.error('Error setting localStorage:', error);
      }
      
      // Step 4: Set auth user in Electron store
      try {
        await api?.setAuthUser?.(user);
        console.log('✅ Set auth user in Electron store');
      } catch (error) {
        console.error('Error setting Electron store:', error);
      }
      
      // Step 5: Call authSuccess to properly handle login and window management
      try {
        await api?.authSuccess?.(user);
        console.log('✅ Called authSuccess');
        
        window.dispatchEvent(new Event('user-changed'));
        console.log('✅ Dispatched user-changed event');
      } catch (error) {
        console.error('Error calling authSuccess:', error);
        throw error;
      }
      
      // Step 6: Verify main window is ready and fully loaded before closing account switcher
      let checkCount = 0;
      const maxChecks = 75;
      let consecutiveReadyChecks = 0;
      const requiredConsecutiveChecks = 3;
      
      const verifyMainWindow = async () => {
        try {
          checkCount++;
          
          if (checkCount < 10) {
            setTimeout(verifyMainWindow, 200);
            return;
          }
          
          const currentAuthUser = await api?.getAuthUser?.();
          if (!currentAuthUser || currentAuthUser.id !== user.id) {
            if (checkCount > 35) {
              console.warn('⚠️ Auth user not set after timeout');
              window.dispatchEvent(new Event('account-switcher-login-complete'));
              setTimeout(() => {
                try {
                  api?.closeWindow?.();
                } catch (e) {}
              }, 500);
              return;
            }
            setTimeout(verifyMainWindow, 200);
            return;
          }

          const mainWindowStatus = await api?.isMainWindowReady?.();
          
          if (mainWindowStatus && mainWindowStatus.ready && mainWindowStatus.visible) {
            consecutiveReadyChecks++;
            
            if (consecutiveReadyChecks >= requiredConsecutiveChecks) {
              await new Promise(resolve => setTimeout(resolve, 300));
              
              console.log('✅ Main window confirmed ready and visible - login complete');
              
              window.dispatchEvent(new Event('account-switcher-login-complete'));
              
              setTimeout(() => {
                try {
                  api?.closeWindow?.();
                  console.log('✅ Account switcher window closed');
                } catch (error) {
                  console.error('Error closing window:', error);
                }
              }, 500);
              
              return;
            } else {
              setTimeout(verifyMainWindow, 200);
              return;
            }
          } else {
            consecutiveReadyChecks = 0;
          }

          if (checkCount >= maxChecks) {
            console.warn('⚠️ Main window not ready after maximum checks');
            window.dispatchEvent(new Event('account-switcher-login-complete'));
            setTimeout(() => {
              try {
                api?.closeWindow?.();
              } catch (e) {}
            }, 500);
            return;
          }

          setTimeout(verifyMainWindow, 200);
        } catch (error) {
          console.error('❌ Error checking window state:', error);
          if (checkCount < maxChecks) {
            setTimeout(verifyMainWindow, 200);
          } else {
            window.dispatchEvent(new Event('account-switcher-login-complete'));
            setTimeout(() => {
              try {
                api?.closeWindow?.();
              } catch (e) {}
            }, 500);
          }
        }
      };

      setTimeout(verifyMainWindow, 2000);
      
      console.log('✅ Login process initiated');
      
    } catch (error) {
      console.error('❌ Error switching account:', error);
      window.dispatchEvent(new Event('account-switcher-login-complete'));
      setTimeout(() => {
        try {
          const api = window.electronAPI;
          api?.closeWindow?.();
        } catch (e) {}
      }, 500);
    }
  };

  // Check for pending switch and trigger it
  useEffect(() => {
    if (ready) {
      const pendingSwitch = sessionStorage.getItem('pendingAccountSwitch');
      if (pendingSwitch) {
        try {
          const userToSwitch = JSON.parse(pendingSwitch);
          console.log('🔄 Pending switch detected for:', userToSwitch.name || userToSwitch.username);
          
          // Wait a bit longer to ensure AccountSwitcher component has initialized with the pending state
          // and is showing the loading screen, then trigger the switch
          setTimeout(() => {
            // Remove it only after we're sure AccountSwitcher has read it
            sessionStorage.removeItem('pendingAccountSwitch');
            console.log('🔄 Triggering switch handler for:', userToSwitch.name || userToSwitch.username);
            switchHandler(userToSwitch);
          }, 500);
        } catch (error) {
          console.error('Error handling pending switch:', error);
          sessionStorage.removeItem('pendingAccountSwitch');
        }
      }
    }
  }, [ready]);

  if (!ready) return null;
  
  return (
    <AccountSwitcher
      isOpen={true}
      onClose={() => navigate('/library')}
      onSwitchAccount={switchHandler}
      onAddAccount={async () => {
        const api = window.electronAPI || window.electron;
        try {
          const result = await api?.openAuthWindow?.();
          if (!result || !result.success) {
            // Fallback to navigation if window creation fails
            navigate('/auth');
          }
          // Note: openAuthWindow already handles closing the account switcher window
          // Don't call closeWindow() here as it may interfere
        } catch (error) {
          console.error('Error opening auth window:', error);
          // Fallback to navigation
          navigate('/auth');
        }
      }}
      variant="page"
      onHeightChange={handleHeightChange}
    />
  );
};

export default AccountSwitcherPage;
