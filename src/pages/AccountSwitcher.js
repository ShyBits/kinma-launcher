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
          
          // Account switcher should be 30% of screen size in 14:9 format (narrower than 16:9)
          let currentWidth = 700; // Default fallback
          let currentHeight = 450; // Default fallback (700 * 9/14)
          
          try {
            // Get screen size and calculate 30% width, then height for 14:9
            if (api?.getScreenSize) {
              const screenSize = await api.getScreenSize();
              if (screenSize && screenSize.success) {
                currentWidth = Math.round(screenSize.width * 0.30);
                currentHeight = Math.round(currentWidth * (9 / 14));
              }
            }
            
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
      
      // Account switcher should be 30% of screen size in 14:9 format (narrower than 16:9)
      let currentWidth = 700; // Default fallback
      let currentHeight = 450; // Default fallback (700 * 9/14)
      
      try {
        // Get screen size and calculate 30% width, then height for 14:9
        if (api?.getScreenSize) {
          const screenSize = await api.getScreenSize();
          if (screenSize && screenSize.success) {
            currentWidth = Math.round(screenSize.width * 0.30);
            currentHeight = Math.round(currentWidth * (9 / 14));
          }
        }
        
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
      // Get screen size to maintain 30% width, but use calculated height
      let width = 700; // Default fallback
      if (api?.getScreenSize) {
        const screenSize = await api.getScreenSize();
        if (screenSize && screenSize.success) {
          width = Math.round(screenSize.width * 0.30);
        }
      }
      // Use the calculated height from the component (based on number of rows)
      api?.resizeWindow && api.resizeWindow(width, newHeight);
    } catch (_) {}
  };

  const switchHandler = async (user) => {
    const api = window.electronAPI;
    try {
      console.log('🔄 Starting account switch for user:', user);
      console.log('🔄 User properties:', { id: user.id, email: user.email, username: user.username, name: user.name });
      
      // Check if user is logged in - MUST check before proceeding
      // Default to false (not logged in) - only set to true if explicitly logged in
      let userIsLoggedIn = false;
      let userData = null;
      try {
        const result = await api?.getUsers?.();
        if (result && result.success && Array.isArray(result.users)) {
          const users = result.users;
          userData = users.find(u => u.id === user.id);
          console.log('📋 Found userData:', userData);
          console.log('📋 userData.isLoggedIn:', userData?.isLoggedIn, 'type:', typeof userData?.isLoggedIn);
          
          // Check if user is actively logged in (isLoggedIn === true, 1, or "1")
          // Handle both boolean true and numeric 1 (MySQL stores BOOLEAN as TINYINT)
          const isLoggedIn = userData && (
            userData.isLoggedIn === true || 
            userData.isLoggedIn === 1 || 
            userData.isLoggedIn === '1'
          );
          
          console.log('📋 isLoggedIn check result:', isLoggedIn);
          
          if (userData && isLoggedIn) {
            userIsLoggedIn = true;
            console.log('✅ User is logged in (green) - switching directly without auth window');
            console.log('✅ Proceeding with direct login - NO auth window will be opened');
          } else {
            // User is logged out, status unclear, or isLoggedIn is not true
            // Default to opening auth window as escape route
            console.log('⚠️ User login status unclear or logged out - opening auth window (escape route)');
            // Use email first, then username, then userData email as fallback
            // Try all possible sources: user object, userData from file, and all variations
            const email = user.email || user.username || user.name || userData?.email || userData?.username || userData?.name || '';
            console.log('📧 Extracted email for auth window:', email);
            console.log('📧 Email sources:', {
              'user.email': user.email,
              'user.username': user.username,
              'user.name': user.name,
              'userData?.email': userData?.email,
              'userData?.username': userData?.username,
              'userData?.name': userData?.name
            });
            
            // Open auth window with email/username pre-filled
            // IMPORTANT: Don't close account switcher here - let openAuthWindow handle it
            if (!api || !api.openAuthWindow) {
              console.error('❌ Electron API not available or openAuthWindow not found');
              // Fallback: navigate to auth with email in URL
              window.location.hash = email 
                ? `/auth?addAccount=true&email=${encodeURIComponent(email)}`
                : '/auth?addAccount=true';
              return;
            }
            
            try {
              const authResult = await api.openAuthWindow(email);
            if (!authResult || !authResult.success) {
              console.error('Failed to open auth window, using fallback');
                // Fallback: navigate to auth with email in URL
                window.location.hash = email 
                  ? `/auth?addAccount=true&email=${encodeURIComponent(email)}`
                  : '/auth?addAccount=true';
              }
            } catch (error) {
              console.error('❌ Error opening auth window:', error);
              // Fallback: navigate to auth with email in URL
              window.location.hash = email 
                ? `/auth?addAccount=true&email=${encodeURIComponent(email)}`
                : '/auth?addAccount=true';
            }
            // IMPORTANT: Return early - do NOT proceed with account switch
            // The auth window will handle closing the account switcher
            return;
          }
        } else {
          // No user data found or invalid response - open auth window as escape route
          console.log('⚠️ User data not found or invalid - opening auth window (escape route)');
          // Use email first, then username as fallback
          const email = user.email || user.username || '';
          console.log('📧 Extracted email for auth window:', email, 'from user:', { email: user.email, username: user.username });
          // Note: openAuthWindow will close the account switcher window automatically
          const authResult = await api?.openAuthWindow?.(email);
          if (!authResult || !authResult.success) {
            window.location.hash = email 
              ? `/auth?addAccount=true&email=${encodeURIComponent(email)}`
              : '/auth?addAccount=true';
          }
          // Don't call closeWindow() here - openAuthWindow handles closing the account switcher
          return;
        }
      } catch (error) {
        console.error('❌ Error checking user login status:', error);
        // On error, default to opening auth window as escape route
        console.log('⚠️ Error occurred - opening auth window (escape route)');
        // Use email first, then username as fallback
        const email = user.email || user.username || '';
        console.log('📧 Extracted email for auth window:', email, 'from user:', { email: user.email, username: user.username });
        // Note: openAuthWindow will close the account switcher window automatically
        const authResult = await api?.openAuthWindow?.(email);
        if (!authResult || !authResult.success) {
          window.location.hash = email 
            ? `/auth?addAccount=true&email=${encodeURIComponent(email)}`
            : '/auth?addAccount=true';
        }
        // Don't call closeWindow() here - openAuthWindow handles closing the account switcher
        return;
      }
      
      // Only proceed with account switch if user is explicitly logged in
      // If not logged in, we should have already returned above, but double-check as safety
      if (!userIsLoggedIn) {
        console.log('⚠️ User is not logged in - aborting account switch and opening auth window (escape route)');
        // Final safety check - open auth window if somehow we got here
        const email = user.email || user.username || '';
        console.log('📧 Extracted email for auth window:', email, 'from user:', { email: user.email, username: user.username });
        const authResult = await api?.openAuthWindow?.(email);
        if (!authResult || !authResult.success) {
          window.location.hash = email 
            ? `/auth?addAccount=true&email=${encodeURIComponent(email)}`
            : '/auth?addAccount=true';
        }
        return;
      }
      
      // Dispatch event to show loading screen FIRST with user data
      window.dispatchEvent(new CustomEvent('account-switcher-login-start', {
        detail: { user }
      }));
      
      // Wait a moment for loading screen to fully render and be visible
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Step 1: Get current user and log them out temporarily (session terminates)
      // IMPORTANT: Only set isLoggedIn: false, NEVER set hiddenInSwitcher: true
      // Accounts should remain visible in the account switcher until explicitly removed
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
              // Only log out the previous user if they don't have "stayLoggedIn" enabled
              // This allows multiple accounts to be logged in simultaneously for quick login
              if (currentUser.stayLoggedIn !== true) {
                users[currentUserIndex].isLoggedIn = false;
                console.log('✅ Logged out previous user (stayLoggedIn not enabled)');
              } else {
                // Keep previous user logged in for quick login
                console.log('✅ Keeping previous user logged in (stayLoggedIn enabled)');
              }
              // IMPORTANT: Do NOT set hiddenInSwitcher: true here - account should remain visible
              await api?.saveUsers?.(users);
            }
          }
          
          // Step 2: Update last login time for the new user
          const userIndex = users.findIndex(u => u.id === user.id);
          if (userIndex !== -1) {
            users[userIndex].lastLoginTime = new Date().toISOString();
            users[userIndex].isLoggedIn = true; // Mark as logged in
            // IMPORTANT: Clear hiddenInSwitcher flag when user logs in - account should be visible again
            users[userIndex].hiddenInSwitcher = false;
            await api?.saveUsers?.(users);
            console.log('✅ Updated last login time and made account visible');
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
      // The account switcher window will be closed automatically by authSuccess handler
      try {
        await api?.authSuccess?.(user);
        console.log('✅ Called authSuccess');
        
        window.dispatchEvent(new Event('user-changed'));
        console.log('✅ Dispatched user-changed event');
      } catch (error) {
        console.error('Error calling authSuccess:', error);
        throw error;
      }
      
      // Step 6: Account switcher window is closed by authSuccess handler
      // No need to verify or close manually - electron.js handles it automatically
      
      console.log('✅ Login process initiated - account switcher will close automatically');
      
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
        if (!api || !api.openAuthWindow) {
          console.error('❌ Electron API not available or openAuthWindow not found');
          // Fallback: navigate to auth route
          if (window.location) {
            window.location.hash = '/auth?addAccount=true';
          }
          return;
        }
        
        try {
          console.log('➕ Add account button clicked - opening auth window');
          
          // Open auth window with empty email (new account)
          // Note: openAuthWindow will close the account switcher window automatically
          const result = await api.openAuthWindow('');
          
          if (!result || !result.success) {
            console.error('❌ Failed to open auth window, result:', result);
            // Fallback: navigate to auth route
            if (window.location) {
              window.location.hash = '/auth?addAccount=true';
            }
          } else {
            console.log('✅ Auth window opened successfully');
            // Don't call closeWindow() here - openAuthWindow handles closing the account switcher
          }
        } catch (error) {
          console.error('❌ Error opening auth window:', error);
          // Fallback: navigate to auth route
          if (window.location) {
            window.location.hash = '/auth?addAccount=true';
          }
        }
      }}
      variant="page"
      onHeightChange={handleHeightChange}
      windowWidth={windowWidth}
      windowHeight={windowHeight}
    />
  );
};

export default AccountSwitcherPage;
