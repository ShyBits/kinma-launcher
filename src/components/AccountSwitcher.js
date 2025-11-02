import React, { useEffect, useState, useRef } from 'react';
import { Check, Plus, Loader2, User } from 'lucide-react';
import './AccountSwitcher.css';

const AccountSwitcher = ({ isOpen, onClose, onSwitchAccount, onAddAccount, variant = 'modal', onHeightChange }) => {
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
      
      if (api && api.getUsers) {
        const result = await api.getUsers();
        if (result && result.success && Array.isArray(result.users)) {
          const sorted = result.users.sort((a, b) => {
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
          setUsers(sorted);
        } else {
          setUsers([]);
        }
      } else {
        const stored = JSON.parse(localStorage.getItem('users') || '[]');
        setUsers(stored);
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

  const handleAccountClick = (user) => {
    if (isProcessing || isActiveUser(user)) {
      return;
    }

    setIsProcessing(true);
    setProcessingAccount(user.id);
    setSwitchingToUser(user); // Store the user being switched to
    onSwitchAccount?.(user);
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
    
    const updateHeight = () => {
      if (!bodyRef.current || !onHeightChange || !containerRef.current) return;
      
      const titleBarHeight = 32;
      const headerHeight = 80;
      const topPadding = 40;
      const bottomPadding = 40;
      
      // Calculate based on grid layout - 5 accounts per row max
      const cardHeight = 130; // 100px card + 30px for name/spacing
      const cardsPerRow = 5; // Fixed: max 5 per row
      const totalCards = users.length + 1; // users + add button
      const rows = Math.ceil(totalCards / cardsPerRow);
      const gridHeight = rows * cardHeight + (rows > 1 ? (rows - 1) * 15 : 0); // gap between rows (15px)
      
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
  }, [isOpen, users, loading, variant, onHeightChange]);

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

  return (
    <div className="account-switcher-page" ref={containerRef}>
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
            <h1 className="account-switcher-title">Select Account</h1>
          </div>
          
          <div className="account-switcher-body">
            {loading && initialLoad ? (
              <div className="account-switcher-loading">
                <div className="account-switcher-spinner"></div>
                <p>Loading accounts...</p>
              </div>
            ) : (
              <div className="account-switcher-grid">
                {users.map((user) => {
                  const isActive = isActiveUser(user);
                  const isProcessingThis = processingAccount === user.id;
                  const isDisabled = isProcessing || isActive;
                  
                  return (
                    <div
                      key={user.id}
                      className={`account-switcher-card ${isActive ? 'active' : ''} ${isProcessingThis ? 'processing' : ''} ${isDisabled ? 'disabled' : ''}`}
                      onClick={() => !isDisabled && handleAccountClick(user)}
                    >
                      <div className="account-switcher-card-avatar">
                        {getInitials(user)}
                        {isActive && (
                          <div className="account-switcher-check">
                            <Check size={14} strokeWidth={3} />
                          </div>
                        )}
                        {isProcessingThis && (
                          <div className="account-switcher-loader">
                            <Loader2 size={14} className="spinning" />
                          </div>
                        )}
                      </div>
                      <div className="account-switcher-card-name">
                        {user.name || user.username || user.email?.split('@')[0] || 'User'}
                      </div>
                    </div>
                  );
                })}
                
                <button
                  className="account-switcher-add-card"
                  onClick={onAddAccount}
                  disabled={isProcessing}
                  title="Add Account"
                >
                  <Plus size={28} strokeWidth={2} />
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default AccountSwitcher;
