import React, { useEffect, useState, useRef } from 'react';
import { Check, Plus, Loader2, User, X, Check as CheckIcon } from 'lucide-react';
import './AccountSwitcher.css';

const AccountSwitcher = ({ isOpen, onClose, onSwitchAccount, onAddAccount, variant = 'modal', onHeightChange, windowWidth, windowHeight }) => {
  const [currentWindowWidth, setCurrentWindowWidth] = useState(windowWidth || 700);
  const [currentWindowHeight, setCurrentWindowHeight] = useState(windowHeight || 450);
  
  // Update window dimensions when props change or window resizes
  useEffect(() => {
    if (windowWidth) setCurrentWindowWidth(windowWidth);
    if (windowHeight) setCurrentWindowHeight(windowHeight);
  }, [windowWidth, windowHeight]);
  
  // Listen for window resize events
  useEffect(() => {
    if (variant !== 'page') return;
    
    const handleResize = async () => {
      try {
        const api = window.electronAPI || window.electron;
        if (api?.getWindowSize) {
          const size = await api.getWindowSize();
          if (size && size.width && size.height) {
            setCurrentWindowWidth(size.width);
            setCurrentWindowHeight(size.height);
          }
        }
      } catch (error) {
        console.error('Error getting window size:', error);
      }
    };
    
    // Check size on mount and periodically
    handleResize();
    const interval = setInterval(handleResize, 100);
    
    return () => clearInterval(interval);
  }, [variant]);
  
  // Check for pending switch immediately on mount to initialize state
  const getPendingSwitchState = () => {
    try {
      const pendingSwitch = sessionStorage.getItem('pendingAccountSwitch');
      if (pendingSwitch) {
        const userToSwitch = JSON.parse(pendingSwitch);
        return {
          showLoading: true,
          switchingTo: userToSwitch,
          processing: true,
          processingAccountId: userToSwitch.id
        };
      }
    } catch (error) {
      console.error('Error parsing pending switch:', error);
    }
    return {
      showLoading: false,
      switchingTo: null,
      processing: false,
      processingAccountId: null
    };
  };

  const pendingState = getPendingSwitchState();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [processingAccount, setProcessingAccount] = useState(pendingState.processingAccountId);
  const [isProcessing, setIsProcessing] = useState(pendingState.processing);
  const [showLoadingScreen, setShowLoadingScreen] = useState(pendingState.showLoading);
  const [switchingToUser, setSwitchingToUser] = useState(pendingState.switchingTo);
  const [confirmingRemove, setConfirmingRemove] = useState(null);
  const containerRef = useRef(null);
  const bodyRef = useRef(null);

  // Debug: Log initial state
  console.log('🔍 AccountSwitcher initial state:', {
    showLoadingScreen: pendingState.showLoading,
    switchingTo: pendingState.switchingTo?.name || pendingState.switchingTo?.username,
    pendingFromStorage: sessionStorage.getItem('pendingAccountSwitch')
  });

  const loadCurrentUser = async () => {
    try {
      const api = window.electronAPI;
      if (api?.getAuthUser) {
        const authUser = await api.getAuthUser();
        setCurrentUser(authUser);
        return authUser;
      } else {
        const stored = localStorage.getItem('authUser');
        if (stored) {
          const user = JSON.parse(stored);
          setCurrentUser(user);
          return user;
        }
      }
    } catch (error) {
      console.error('Error loading current user:', error);
    }
    return null;
  };

  const loadUsers = async (authUser = null, showLoading = false) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      const api = window.electronAPI;
      const currentAuthUser = authUser || currentUser;
      
      // Try database methods first
      if (api && api.dbGetUsers) {
        const result = await api.dbGetUsers();
        if (result && result.success && Array.isArray(result.users)) {
          // Show all users (both logged in and not logged in) - they'll be handled differently when clicked
          // Filter out users that are hidden from the account switcher
          // Handle both boolean true and numeric 1 (MySQL stores BOOLEAN as TINYINT)
          // Also filter out guest accounts (dummy accounts that only allow viewing)
          const loggedInUsers = result.users.filter(u => {
            const isHidden = u.hiddenInSwitcher === true || u.hiddenInSwitcher === 1 || u.hiddenInSwitcher === '1';
            const isGuest = u.isGuest === true || 
                           u.id?.toString().startsWith('guest_') || 
                           u.username?.toString().startsWith('guest_') || 
                           u.name === 'Guest';
            return !isHidden && !isGuest;
          });
          console.log('📋 Loaded users from database:', result.users.length, 'total,', loggedInUsers.length, 'visible (after filtering hiddenInSwitcher and guest accounts)');
          const sorted = loggedInUsers.sort((a, b) => {
            if (currentAuthUser) {
              if (a.id === currentAuthUser.id) return -1;
              if (b.id === currentAuthUser.id) return 1;
            }
            if (a.lastLoginTime && b.lastLoginTime) {
              const timeA = new Date(a.lastLoginTime).getTime();
              const timeB = new Date(b.lastLoginTime).getTime();
              if (timeA !== timeB) return timeB - timeA;
            } else if (a.lastLoginTime) return -1;
            else if (b.lastLoginTime) return 1;
            const nameA = (a.name || a.email || a.username || '').toLowerCase();
            const nameB = (b.name || b.email || b.username || '').toLowerCase();
            return nameA.localeCompare(nameB);
          });
          // Limit to 10 accounts
          setUsers(sorted.slice(0, 10));
        } else {
          setUsers([]);
        }
      } else if (api && api.getUsers) {
        // Fallback to old file-based methods
        const result = await api.getUsers();
        if (result && result.success && Array.isArray(result.users)) {
          // Filter out hidden users and guest accounts
          const loggedInUsers = result.users.filter(u => {
            const isHidden = u.hiddenInSwitcher === true;
            const isGuest = u.isGuest === true || 
                           u.id?.toString().startsWith('guest_') || 
                           u.username?.toString().startsWith('guest_') || 
                           u.name === 'Guest';
            return !isHidden && !isGuest;
          });
          const sorted = loggedInUsers.sort((a, b) => {
            if (currentAuthUser) {
              if (a.id === currentAuthUser.id) return -1;
              if (b.id === currentAuthUser.id) return 1;
            }
            if (a.lastLoginTime && b.lastLoginTime) {
              const timeA = new Date(a.lastLoginTime).getTime();
              const timeB = new Date(b.lastLoginTime).getTime();
              if (timeA !== timeB) return timeB - timeA;
            } else if (a.lastLoginTime) return -1;
            else if (b.lastLoginTime) return 1;
            const nameA = (a.name || a.email || a.username || '').toLowerCase();
            const nameB = (b.name || b.email || b.username || '').toLowerCase();
            return nameA.localeCompare(nameB);
          });
          setUsers(sorted.slice(0, 10));
        } else {
          setUsers([]);
        }
      } else {
        // Final fallback to localStorage
        const stored = JSON.parse(localStorage.getItem('users') || '[]');
        // Filter out hidden users and guest accounts
        const visibleUsers = stored.filter(u => {
          const isHidden = u.hiddenInSwitcher === true;
          const isGuest = u.isGuest === true || 
                         u.id?.toString().startsWith('guest_') || 
                         u.username?.toString().startsWith('guest_') || 
                         u.name === 'Guest';
          return !isHidden && !isGuest;
        });
        setUsers(visibleUsers.slice(0, 10));
      }
    } catch (error) {
      console.error('Error loading users:', error);
      setUsers([]);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
      setInitialLoad(false);
    }
  };

  // Sync state if pending switch is detected
  useEffect(() => {
    if (isOpen) {
      try {
        const pending = sessionStorage.getItem('pendingAccountSwitch');
        if (pending && !showLoadingScreen) {
          const userToSwitch = JSON.parse(pending);
          setSwitchingToUser(userToSwitch);
          setShowLoadingScreen(true);
          setIsProcessing(true);
          setProcessingAccount(userToSwitch.id);
        }
      } catch (error) {
        console.error('Error parsing pending switch:', error);
      }
    }
  }, [isOpen, showLoadingScreen]);

  useEffect(() => {
    if (isOpen) {
      // First check for pending switch - priority check
      const pending = checkPendingSwitch();
      if (pending) {
        console.log('🔄 useEffect: Found pending switch, setting loading screen immediately');
        setSwitchingToUser(pending);
        setShowLoadingScreen(true);
        setIsProcessing(true);
        setProcessingAccount(pending.id);
        return; // Skip normal initialization - don't load users or anything else
      }

      // If we already have a pending switch (loaded in initial state), skip normal initialization
      if (showLoadingScreen && switchingToUser) {
        // Already showing loading screen, don't do anything else
        // Make sure we keep the loading state
        setIsProcessing(true);
        setProcessingAccount(switchingToUser.id);
        return;
      }
      
      // Only initialize normally if there's no pending switch
      setInitialLoad(true);
      const initialize = async () => {
        const authUser = await loadCurrentUser();
        await loadUsers(authUser, true);
        setIsProcessing(false);
        setProcessingAccount(null);
      };
      initialize();
    } else {
      setInitialLoad(true);
      setLoading(true);
    }
  }, [isOpen, showLoadingScreen, switchingToUser]);

  const getInitials = (user) => {
    const name = user.name || user.username || user.email || 'User';
    const parts = name.split(' ');
    if (parts.length > 1) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const handleAccountClick = async (user) => {
    if (isProcessing) {
      return;
    }

    // Check if user is logged in (green) - if so, log in directly without auth window
    try {
      const api = window.electronAPI;
      const result = await api?.getUsers?.();
      if (result && result.success && Array.isArray(result.users)) {
        const userData = result.users.find(u => u.id === user.id);
        
        // If user is logged in (green), switch directly - skip auth window
        // Handle both boolean true and numeric 1 (MySQL stores BOOLEAN as TINYINT)
        const isLoggedIn = userData.isLoggedIn === true || 
                          userData.isLoggedIn === 1 || 
                          userData.isLoggedIn === '1';
        
        if (userData && isLoggedIn) {
          console.log('✅ User is logged in (green) - switching directly without auth window');
          console.log('📋 UserData isLoggedIn value:', userData.isLoggedIn, 'type:', typeof userData.isLoggedIn);
          setIsProcessing(true);
          setProcessingAccount(user.id);
          setSwitchingToUser(user);
          onSwitchAccount?.(user);
          return;
        } else {
          // User is not logged in (ghost mode) - open auth window
          console.log('⚠️ User is not logged in (ghost mode) - opening auth window');
          const email = user.email || user.username || '';
          const authResult = await api?.openAuthWindow?.(email);
          if (!authResult || !authResult.success) {
            // Fallback: navigate to auth
            if (window.location) {
              window.location.hash = email 
                ? `/auth?addAccount=true&email=${encodeURIComponent(email)}`
                : '/auth?addAccount=true';
            }
          }
          return;
        }
      }
    } catch (error) {
      console.error('Error checking user login status:', error);
      // On error, open auth window as fallback
      const api = window.electronAPI;
      const email = user.email || user.username || '';
      const authResult = await api?.openAuthWindow?.(email);
      if (!authResult || !authResult.success) {
        if (window.location) {
          window.location.hash = email 
            ? `/auth?addAccount=true&email=${encodeURIComponent(email)}`
            : '/auth?addAccount=true';
        }
      }
      return;
    }
    
    // Fallback: if we can't determine status, open auth window to be safe
    console.log('⚠️ Could not determine login status - opening auth window as fallback');
    const api = window.electronAPI;
    const email = user.email || user.username || '';
    const authResult = await api?.openAuthWindow?.(email);
    if (!authResult || !authResult.success) {
      if (window.location) {
        window.location.hash = email 
          ? `/auth?addAccount=true&email=${encodeURIComponent(email)}`
          : '/auth?addAccount=true';
      }
    }
  };

  const handleRemoveAccount = async (user, e) => {
    e.stopPropagation(); // Prevent triggering account click
    
    if (isProcessing || isActiveUser(user)) {
      return;
    }

    // Show confirmation inside the card
    if (confirmingRemove === user.id) {
      // Already confirming - proceed with removal
      await confirmRemoveAccount(user);
    } else {
      // Start confirmation
      setConfirmingRemove(user.id);
    }
  };

  const confirmRemoveAccount = async (user) => {
    try {
      console.log('🗑️ Confirming removal of account:', user.id, user.email || user.username);
      const api = window.electronAPI;
      
      if (api && api.dbGetUsers && api.dbSaveUser) {
        // Use database methods
        const result = await api.dbGetUsers();
        console.log('📊 Database getUsers result:', result);
        
        if (result && result.success && Array.isArray(result.users)) {
          const users = result.users;
          const userToRemove = users.find(u => u.id === user.id);
          console.log('👤 User to remove found:', userToRemove ? 'Yes' : 'No');
          
          if (userToRemove) {
            // IMPORTANT: Only when explicitly confirming removal should we:
            // 1. Mark user as hidden in switcher (removes from account switcher)
            // 2. Log them out (terminate session)
            // This is the ONLY place where hiddenInSwitcher should be set to true
            const updatedUser = {
              ...userToRemove,
              hiddenInSwitcher: true,
              isLoggedIn: false // Also log them out when removing
            };
            
            console.log('💾 Saving updated user to database:', updatedUser.id, 'hiddenInSwitcher:', updatedUser.hiddenInSwitcher);
            const saveResult = await api.dbSaveUser(updatedUser);
            console.log('💾 Save result:', saveResult);
            
            if (saveResult && saveResult.success) {
              console.log('✅ Account removed from switcher and logged out');
              
              // Force a fresh reload from database to ensure we get the updated data
              // Add a small delay to ensure database write is committed
              await new Promise(resolve => setTimeout(resolve, 100));
              
              // Reload users to update the display
              const reloadedAuthUser = await loadCurrentUser();
              await loadUsers(reloadedAuthUser, false);
              
              console.log('🔄 Users reloaded after removal');
            } else {
              console.error('❌ Failed to save user to database:', saveResult?.error);
            }
          } else {
            console.warn('⚠️ User not found in database users list');
          }
        } else {
          console.error('❌ Invalid result from dbGetUsers:', result);
        }
      } else if (api && api.getUsers && api.saveUsers) {
        // Fallback to old file-based methods if database methods not available
        console.log('📁 Using file-based methods (fallback)');
        const result = await api.getUsers();
        if (result && result.success && Array.isArray(result.users)) {
          const users = result.users;
          const userIndex = users.findIndex(u => u.id === user.id);
          
          if (userIndex !== -1) {
            users[userIndex].hiddenInSwitcher = true;
            users[userIndex].isLoggedIn = false;
            await api.saveUsers(users);
            console.log('✅ Account removed from switcher and logged out (using file-based method)');
            
            // Reload users to update the display
            await loadUsers(currentUser, false);
          }
        }
      } else {
        console.error('❌ No API methods available for removing account');
      }
    } catch (error) {
      console.error('❌ Error removing account from switcher:', error);
    } finally {
      setConfirmingRemove(null);
    }
  };

  const cancelRemoveAccount = (e) => {
    e?.stopPropagation();
    setConfirmingRemove(null);
  };

  useEffect(() => {
    const handleLoginStart = (event) => {
      // Get user data from event detail if available
      const userData = event.detail?.user;
      if (userData) {
        setSwitchingToUser(userData);
      }
      setShowLoadingScreen(true);
    };
    
    const handleLoginComplete = () => {
      // Don't hide loading screen - keep it visible until window closes
      // Just reset processing state but keep loading screen showing
      setIsProcessing(false);
      setProcessingAccount(null);
      // Keep showLoadingScreen true and switchingToUser set until window closes
    };
    
    window.addEventListener('account-switcher-login-start', handleLoginStart);
    window.addEventListener('account-switcher-login-complete', handleLoginComplete);
    return () => {
      window.removeEventListener('account-switcher-login-start', handleLoginStart);
      window.removeEventListener('account-switcher-login-complete', handleLoginComplete);
    };
  }, []);

  const isActiveUser = (user) => {
    return currentUser && user.id === currentUser.id;
  };

  useEffect(() => {
    if (!isOpen || variant !== 'page' || !bodyRef.current || !containerRef.current) return;
    
    const updateHeight = async () => {
      if (!bodyRef.current || !onHeightChange || !containerRef.current) return;
      
      const titleBarHeight = 32;
      const headerHeight = 60;
      const topPadding = 12;
      const bottomPadding = 24;
      
      // Calculate based on grid layout - 5 accounts per row max
      const cardsPerRow = 5; // Fixed: max 5 per row
      const maxUsers = 10;
      const visibleUsers = Math.min(users.length, maxUsers);
      const showAddButton = visibleUsers < maxUsers; // Only show add button if less than 10 users
      const totalCards = visibleUsers + (showAddButton ? 1 : 0); // users + add button (if shown)
      const rows = Math.ceil(totalCards / cardsPerRow);
      
      // Get current window width to calculate responsive sizes
      let width = currentWindowWidth || windowWidth || 700;
      try {
        const api = window.electronAPI || window.electron;
        if (api?.getWindowSize) {
          const size = await api.getWindowSize();
          if (size && size.width) {
            width = size.width;
          }
        }
      } catch (_) {}
      
      // Calculate responsive card size based on width
      const baseWidth = 700;
      const baseCardSize = 120;
      const widthScale = width / baseWidth;
      const cardSize = Math.round(baseCardSize * widthScale);
      
      // Calculate card height (card size + name text + spacing)
      const cardHeight = cardSize + 30; // card size + name text height + spacing
      const gap = Math.round(width * 0.025); // gap between rows
      const gridHeight = rows * cardHeight + (rows > 1 ? (rows - 1) * gap : 0);
      
      const totalHeight = titleBarHeight + headerHeight + topPadding + gridHeight + bottomPadding;
      const minHeight = 400;
      const maxHeight = 800;
      const windowHeight = Math.max(minHeight, Math.min(maxHeight, totalHeight));
      
      onHeightChange(windowHeight);
    };

    const timeout1 = setTimeout(updateHeight, 50);
    const timeout2 = setTimeout(updateHeight, 200);
    const timeout3 = setTimeout(updateHeight, 500);

    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
      clearTimeout(timeout3);
    };
  }, [isOpen, users, loading, variant, onHeightChange, currentWindowWidth, windowWidth]);

  if (!isOpen) return null;

  // Hide TitleBar when loading screen is active
  useEffect(() => {
    if (showLoadingScreen) {
      document.body.classList.add('account-switcher-loading-active');
      // Hide TitleBar directly
      const titleBar = document.querySelector('.title-bar');
      if (titleBar) {
        titleBar.style.display = 'none';
      }
    } else {
      document.body.classList.remove('account-switcher-loading-active');
      // Show TitleBar again
      const titleBar = document.querySelector('.title-bar');
      if (titleBar) {
        titleBar.style.display = '';
      }
    }
    
    return () => {
      document.body.classList.remove('account-switcher-loading-active');
      const titleBar = document.querySelector('.title-bar');
      if (titleBar) {
        titleBar.style.display = '';
      }
    };
  }, [showLoadingScreen]);

  // Check for pending switch on every render to ensure loading screen shows immediately
  const checkPendingSwitch = () => {
    try {
      const pending = sessionStorage.getItem('pendingAccountSwitch');
      if (pending) {
        return JSON.parse(pending);
      }
    } catch (error) {
      console.error('Error parsing pending switch:', error);
    }
    return null;
  };

  // Force update state if pending switch detected - check on mount and when isOpen changes
  useEffect(() => {
    const pending = checkPendingSwitch();
    if (pending) {
      console.log('🔄 Detected pending switch in AccountSwitcher:', pending.name || pending.username);
      setSwitchingToUser(pending);
      setShowLoadingScreen(true);
      setIsProcessing(true);
      setProcessingAccount(pending.id);
    }
  }, [isOpen]); // Run when isOpen changes or on mount

  // Always check for pending switch on render - ensure it's detected immediately
  const pendingUser = checkPendingSwitch();
  const shouldShowLoading = showLoadingScreen || (pendingUser !== null);
  const userToDisplay = switchingToUser || pendingUser;
  
  // Sync state immediately if pending user exists but state isn't updated
  useEffect(() => {
    if (pendingUser && !showLoadingScreen && isOpen) {
      setSwitchingToUser(pendingUser);
      setShowLoadingScreen(true);
      setIsProcessing(true);
      setProcessingAccount(pendingUser.id);
    }
  }, [pendingUser, showLoadingScreen, isOpen]);

  // Log for debugging
  useEffect(() => {
    if (isOpen) {
      console.log('🔍 AccountSwitcher state:', {
        showLoadingScreen,
        switchingToUser: switchingToUser?.name || switchingToUser?.username,
        pendingUser: pendingUser?.name || pendingUser?.username,
        shouldShowLoading
      });
    }
  }, [isOpen, showLoadingScreen, switchingToUser, pendingUser, shouldShowLoading]);

  // Calculate responsive sizes based on window dimensions
  const calculateSizes = () => {
    const width = currentWindowWidth || windowWidth || 700;
    const height = currentWindowHeight || windowHeight || 450;
    
    if (!width || !height) {
      return {
        cardSize: 120,
        fontSize: 42,
        nameFontSize: 18,
        gap: 18
      };
    }
    
    // Base sizes for 700x600 window (25% of 1920x1080)
    const baseWidth = 700;
    const baseHeight = 600;
    const baseCardSize = 120;
    const baseFontSize = 42;
    const baseNameFontSize = 18;
    
    // Calculate scale factor (use width as primary, but consider both)
    const widthScale = width / baseWidth;
    const heightScale = height / baseHeight;
    const scale = Math.min(widthScale, heightScale); // Use smaller scale to prevent overflow
    
    // Gap is based on window width (2.5% of window width)
    const gap = Math.round(width * 0.025);
    
    return {
      cardSize: Math.round(baseCardSize * scale),
      fontSize: Math.round(baseFontSize * scale),
      nameFontSize: Math.round(baseNameFontSize * scale),
      gap: gap
    };
  };
  
  const sizes = calculateSizes();

  return (
    <div className="account-switcher-page" ref={containerRef} style={{
      '--card-size': `${sizes.cardSize}px`,
      '--card-font-size': `${sizes.fontSize}px`,
      '--card-name-font-size': `${sizes.nameFontSize}px`,
      '--card-gap': `${sizes.gap}px`
    }}>
        {shouldShowLoading ? (
        <div className="account-switcher-loading-screen">
          <div className="account-switcher-loading-circle">
            {userToDisplay && (
              <div className="account-switcher-loading-circle-content">
                <div className="account-switcher-loading-circle-content-inner">
                  <div className="account-switcher-loading-avatar">
                    {getInitials(userToDisplay)}
                  </div>
                  <h2 className="account-switcher-loading-name">
                    {userToDisplay.name || userToDisplay.username || userToDisplay.email?.split('@')[0] || 'User'}
                  </h2>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="account-switcher-header" ref={bodyRef}>
            <h1 className="account-switcher-title">SELECT ACCOUNT</h1>
          </div>
          
          <div className="account-switcher-body">
            {loading && initialLoad ? (
              <div className="account-switcher-loading">
                <div className="account-switcher-spinner"></div>
                <p>Loading accounts...</p>
              </div>
            ) : (
              <div className="account-switcher-grid">
                {users.slice(0, 10).map((user) => {
                  const isActive = isActiveUser(user);
                  const isProcessingThis = processingAccount === user.id;
                  const isDisabled = isProcessing || isActive;
                  const isConfirming = confirmingRemove === user.id;
                  const isLoggedIn = user.isLoggedIn === true; // Check if user is logged in
                  
                  return (
                    <div
                      key={user.id}
                      className={`account-switcher-card ${isActive ? 'active' : ''} ${isProcessingThis ? 'processing' : ''} ${isDisabled ? 'disabled' : ''} ${isConfirming ? 'confirming' : ''} ${isLoggedIn ? 'logged-in' : ''}`}
                      onClick={() => !isDisabled && !isConfirming && handleAccountClick(user)}
                    >
                      {isConfirming ? (
                        <>
                          <div className="account-switcher-card-avatar confirming-avatar" style={{ color: 'rgba(59, 130, 246, 0.3)' }}>
                            <span style={{ fontSize: `var(--card-font-size, ${sizes.fontSize}px)`, fontWeight: 500, position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1 }}>
                              {getInitials(user)}
                            </span>
                            <div className="account-switcher-confirm-buttons-inline">
                              <button
                                className="account-switcher-confirm-btn-inline account-switcher-confirm-btn-yes"
                                onClick={async (e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  console.log('✅ Yes button clicked for user:', user.id);
                                  await confirmRemoveAccount(user);
                                }}
                                title="Confirm removal"
                              >
                                <CheckIcon size={Math.round(sizes.cardSize * 0.14)} strokeWidth={2.5} />
                              </button>
                              <button
                                className="account-switcher-confirm-btn-inline account-switcher-confirm-btn-no"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  cancelRemoveAccount(e);
                                }}
                                title="Cancel"
                              >
                                <X size={Math.round(sizes.cardSize * 0.14)} strokeWidth={2.5} />
                              </button>
                            </div>
                          </div>
                          <div className="account-switcher-confirm-text">
                            <span className="account-switcher-confirm-text-base">Remove?</span>
                            <span className="account-switcher-confirm-text-yes"> YES!</span>
                            <span className="account-switcher-confirm-text-no"> NO!</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="account-switcher-card-avatar">
                            {getInitials(user)}
                            {isActive && (
                              <div className="account-switcher-check">
                                <Check size={Math.round(sizes.cardSize * 0.14)} strokeWidth={3} />
                              </div>
                            )}
                            {isProcessingThis && (
                              <div className="account-switcher-loader">
                                <Loader2 size={Math.round(sizes.cardSize * 0.14)} className="spinning" />
                              </div>
                            )}
                            {!isActive && !isProcessingThis && (
                              <button
                                className="account-switcher-remove-btn"
                                onClick={(e) => handleRemoveAccount(user, e)}
                                title="Remove from account switcher"
                              >
                                <X size={Math.round(sizes.cardSize * 0.11)} strokeWidth={2.8} />
                              </button>
                            )}
                          </div>
                          <div className="account-switcher-card-name">
                            {user.name || user.username || user.email?.split('@')[0] || 'User'}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
                
                {users.length < 10 && (
                  <button
                    className="account-switcher-add-card"
                    onClick={onAddAccount}
                    disabled={isProcessing}
                    title="Add Account"
                  >
                    <Plus size={Math.round(sizes.cardSize * 0.28)} strokeWidth={2} />
                  </button>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default AccountSwitcher;
