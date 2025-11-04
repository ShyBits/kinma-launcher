import React, { useState, useEffect, useRef } from 'react';
import {
  Settings, Users, MessageSquare, ShoppingCart, Bell, User, Wallet, Plus, Minus, CreditCard, Coins, Store, Globe, Menu,
  BarChart3, Package, FileText, Upload, TrendingUp, DollarSign, Download, Check, RefreshCw
} from 'lucide-react';
import KinmaLogo from './KinmaLogo';
import AuthModal from './AuthModal';
import { getUserData } from '../utils/UserDataManager';
import './TopNavigation.css';

const CustomTooltip = ({ text, children }) => {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef(null);

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, 50); // Fast tooltip appearance
  };

  const handleMouseLeave = () => {
    clearTimeout(timeoutRef.current);
    setIsVisible(false);
  };

  useEffect(() => {
    return () => clearTimeout(timeoutRef.current);
  }, []);

  return (
    <div 
      className="tooltip-wrapper"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {isVisible && text && (
        <div className="custom-tooltip">{text}</div>
      )}
    </div>
  );
};

const TopNavigation = ({ 
  currentPage, 
  setCurrentPage, 
  navigate, 
  selectedGame,
  isGameInstalled, 
  isUpdating, 
  updateProgress, 
  onPlayGame, 
  onUpdateGame,
  onToggleSidebar,
  location 
}) => {
  const [showBalanceMenu, setShowBalanceMenu] = useState(false);
  const [showTransactionMenu, setShowTransactionMenu] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState(0);
  const balanceMenuRef = useRef(null);
  const transactionMenuRef = useRef(null);

  // Game Studio dropdown state: 'analytics' | 'content' | 'reports' | null
  const [openStudioMenu, setOpenStudioMenu] = useState(null);
  const analyticsWrapperRef = useRef(null);
  const contentWrapperRef = useRef(null);
  const reportsWrapperRef = useRef(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('credit');
  const [showPayPalConnect, setShowPayPalConnect] = useState(false);
  const [showCryptoConnect, setShowCryptoConnect] = useState(false);
  const [cardInfo, setCardInfo] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: ''
  });
  const [billingInfo, setBillingInfo] = useState({
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: ''
  });
  
  // User balance - you can manage this with state/context
  const userBalance = 1234.50;
  const [authUser, setAuthUser] = useState(() => {
    try { const u = localStorage.getItem('authUser'); return u ? JSON.parse(u) : null; } catch (_) { return null; }
  });
  const userName = authUser?.name || 'Guest';
  const [userLevel, setUserLevel] = useState(() => {
    if (authUser) {
      const userStats = getUserData('userStats', null);
      return userStats?.level || 1;
    }
    return 1;
  });
  const [showAuth, setShowAuth] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef(null);
  const profileButtonRef = useRef(null);
  const profileHeaderRef = useRef(null);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showQuickSwitchMenu, setShowQuickSwitchMenu] = useState(false);
  const quickSwitchMenuRef = useRef(null);
  const quickSwitchButtonRef = useRef(null);
  const quickSwitchHoverTimeoutRef = useRef(null);
  
  // Check if we're in Game Studio
  const isGameStudio = location?.pathname === '/game-studio' || location?.pathname === '/game-studio-settings';
  
  const handleAmountChange = (delta) => {
    setTopUpAmount(prev => Math.max(0, prev + delta));
  };
  
  const handlePresetAmount = (amount) => {
    setTopUpAmount(amount);
  };

  // Handle click outside and Escape key to close balance menu
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && showBalanceMenu) {
        setShowBalanceMenu(false);
      }
    };

    const handleClickOutside = (event) => {
      const target = event.target;
      const isBalanceButton = target.closest('.nav-balance');
      const isMenu = balanceMenuRef.current && balanceMenuRef.current.contains(target);
      
      if (!isBalanceButton && !isMenu && balanceMenuRef.current) {
        setShowBalanceMenu(false);
      }
    };

    if (showBalanceMenu) {
      document.addEventListener('keydown', handleEscape);
      // Use setTimeout to avoid immediate closure when opening
      const timeoutId = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 0);

      return () => {
        document.removeEventListener('keydown', handleEscape);
        clearTimeout(timeoutId);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showBalanceMenu]);

  // Handle Escape key and click outside for transaction menu
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && showTransactionMenu) {
        setShowTransactionMenu(false);
      }
    };

    const handleClickOutside = (event) => {
      const target = event.target;
      const isMenu = transactionMenuRef.current && transactionMenuRef.current.contains(target);
      
      if (!isMenu && transactionMenuRef.current) {
        setShowTransactionMenu(false);
      }
    };

    if (showTransactionMenu) {
      document.addEventListener('keydown', handleEscape);
      const timeoutId = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 0);

      return () => {
        document.removeEventListener('keydown', handleEscape);
        clearTimeout(timeoutId);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showTransactionMenu]);

  // Unified outside-click/Escape handling for Game Studio dropdowns
  const publishingWrapperRef = useRef(null);
  
  useEffect(() => {
    if (!openStudioMenu) return;

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setOpenStudioMenu(null);
      }
    };

    const handleClickOutside = (event) => {
      const target = event.target;
      const wrappers = [analyticsWrapperRef.current, publishingWrapperRef.current, contentWrapperRef.current, reportsWrapperRef.current];
      const clickedInside = wrappers.some((ref) => ref && ref.contains(target));
      if (!clickedInside) {
        setOpenStudioMenu(null);
      }
    };

    document.addEventListener('keydown', handleEscape);
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      document.removeEventListener('keydown', handleEscape);
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openStudioMenu]);

  const handleNavigation = (pageId) => {
    setCurrentPage(pageId);
    const routeMap = {
      'home': isGameStudio ? '/game-studio' : '/store',
      'store': '/store',
      'market': '/market',
      'notifications': '/notifications',
      'community': '/community',
      'profile': '/profile',
      'friends': '/friends',
      'settings': isGameStudio ? '/game-studio-settings' : '/settings'
    };
    const newPath = routeMap[pageId] || '/';
    
    // Push to history to enable back button functionality
    window.history.pushState({ page: pageId }, '', newPath);
    navigate(newPath);
  };

  const handleAuthenticated = ({ user, developerChosen }) => {
    setAuthUser(user);
    try { localStorage.setItem('authUser', JSON.stringify(user)); } catch (_) {}
    if (developerChosen) {
      try { localStorage.setItem('developerIntent', 'pending'); } catch (_) {}
      navigate('/developer-onboarding');
    }
  };

  const handleLogout = async () => {
    try { localStorage.removeItem('authUser'); } catch (_) {}
    try { localStorage.removeItem('developerIntent'); } catch (_) {}
    setAuthUser(null);
    try { await (window.electronAPI?.logout?.()); } catch (_) {}
  };

  // Update user level when user changes
  useEffect(() => {
    const handleUserChanged = () => {
      const updatedAuthUser = (() => {
        try { const u = localStorage.getItem('authUser'); return u ? JSON.parse(u) : null; } catch (_) { return null; }
      })();
      if (updatedAuthUser) {
        setAuthUser(updatedAuthUser);
        const userStats = getUserData('userStats', null);
        setUserLevel(userStats?.level || 1);
      }
    };

    window.addEventListener('user-changed', handleUserChanged);
    
    // Also check on mount
    if (authUser) {
      const userStats = getUserData('userStats', null);
      if (userStats?.level) {
        setUserLevel(userStats.level);
      }
    }

    return () => {
      window.removeEventListener('user-changed', handleUserChanged);
    };
  }, [authUser]);

  // Load available users when menu opens
  useEffect(() => {
    if (showProfileMenu && authUser) {
      setLoadingUsers(true);
      const loadUsers = async () => {
        try {
          const api = window.electronAPI || window.electron;
          if (api?.getUsers) {
            const result = await api.getUsers();
            if (result && result.success && Array.isArray(result.users)) {
              // Sort: current user first, then by lastLoginTime, then alphabetically
              const sorted = result.users.sort((a, b) => {
                if (a.id === authUser.id) return -1;
                if (b.id === authUser.id) return 1;
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
              setAvailableUsers(sorted);
            } else {
              setAvailableUsers([]);
            }
          } else {
            setAvailableUsers([]);
          }
        } catch (error) {
          console.error('Error loading users:', error);
          setAvailableUsers([]);
        } finally {
          setLoadingUsers(false);
        }
      };
      loadUsers();
    } else {
      setAvailableUsers([]);
    }
  }, [showProfileMenu, authUser]);

  // Load users for quick switch menu on hover
  useEffect(() => {
    if (showQuickSwitchMenu && authUser) {
      setLoadingUsers(true);
      const loadUsers = async () => {
        try {
          const api = window.electronAPI || window.electron;
          if (api?.getUsers) {
            const result = await api.getUsers();
            if (result && result.success && Array.isArray(result.users)) {
              // Sort: current user first, then by lastLoginTime, then alphabetically
              const sorted = result.users.sort((a, b) => {
                if (a.id === authUser.id) return -1;
                if (b.id === authUser.id) return 1;
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
              setAvailableUsers(sorted);
            } else {
              setAvailableUsers([]);
            }
          } else {
            setAvailableUsers([]);
          }
        } catch (error) {
          console.error('Error loading users:', error);
          setAvailableUsers([]);
        } finally {
          setLoadingUsers(false);
        }
      };
      loadUsers();
    }
  }, [showQuickSwitchMenu, authUser]);

  const handleQuickSwitchFromMenu = async (user) => {
    if (user.id === authUser?.id) {
      setShowQuickSwitchMenu(false);
      return;
    }

    setShowQuickSwitchMenu(false);
    const api = window.electronAPI || window.electron;
    try {
      // Dispatch event to show loading screen in main window
      window.dispatchEvent(new CustomEvent('main-window-account-switch-start', {
        detail: { user }
      }));

      // Wait a moment for loading screen to render
      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 1: Update last login time for this user
      try {
        const result = await api?.getUsers?.();
        if (result && result.success && Array.isArray(result.users)) {
          const users = result.users;
          const userIndex = users.findIndex(u => u.id === user.id);
          if (userIndex !== -1) {
            users[userIndex].lastLoginTime = new Date().toISOString();
            await api?.saveUsers?.(users);
          }
        }
      } catch (error) {
        console.error('Error updating last login time:', error);
      }

      // Step 2: Set auth user in localStorage
      try {
        const authUserData = { 
          id: user.id, 
          email: user.email, 
          name: user.name || user.username || user.email?.split('@')[0] || 'User' 
        };
        localStorage.setItem('authUser', JSON.stringify(authUserData));
        setAuthUser(authUserData);
      } catch (error) {
        console.error('Error setting localStorage:', error);
      }

      // Step 3: Set auth user in Electron store
      try {
        await api?.setAuthUser?.(user);
      } catch (error) {
        console.error('Error setting Electron store:', error);
      }

      // Step 4: Call authSuccess to properly handle login
      try {
        await api?.authSuccess?.(user);
        
        // Dispatch user-changed event
        window.dispatchEvent(new Event('user-changed'));
      } catch (error) {
        console.error('Error calling authSuccess:', error);
      }

      // Step 5: Wait a bit more then hide loading screen
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Dispatch completion event
      window.dispatchEvent(new Event('main-window-account-switch-complete'));
      
    } catch (error) {
      console.error('Error switching account:', error);
      window.dispatchEvent(new Event('main-window-account-switch-complete'));
    }
  };

  const handleQuickSwitch = async (user) => {
    if (user.id === authUser?.id) {
      setShowProfileMenu(false);
      return;
    }

    setShowProfileMenu(false);
    const api = window.electronAPI || window.electron;
    try {
      // Update last login time
      const result = await api?.getUsers?.();
      if (result && result.success && Array.isArray(result.users)) {
        const users = result.users;
        const userIndex = users.findIndex(u => u.id === user.id);
        if (userIndex !== -1) {
          users[userIndex].lastLoginTime = new Date().toISOString();
          await api?.saveUsers?.(users);
        }
      }

      // Set auth user
      const authUserData = { 
        id: user.id, 
        email: user.email, 
        name: user.name || user.username || user.email?.split('@')[0] || 'User' 
      };
      localStorage.setItem('authUser', JSON.stringify(authUserData));
      await api?.setAuthUser?.(user);
      await api?.authSuccess?.(user);
      
      // Dispatch user-changed event
      window.dispatchEvent(new Event('user-changed'));
      setAuthUser(authUserData);
    } catch (error) {
      console.error('Error switching account:', error);
    }
  };

  const getInitials = (user) => {
    const name = user.name || user.username || user.email || 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  useEffect(() => {
    if (!showProfileMenu) return;
    const onKey = (e) => { if (e.key === 'Escape') setShowProfileMenu(false); };
    const onClick = (e) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target) &&
          profileButtonRef.current && !profileButtonRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
    };
    
    // Adjust menu position to center it below the button
    const adjustPosition = () => {
      if (profileMenuRef.current && profileButtonRef.current) {
        const menu = profileMenuRef.current;
        const button = profileButtonRef.current;
        const buttonRect = button.getBoundingClientRect();
        const menuRect = menu.getBoundingClientRect();
        const parentRect = button.parentElement.getBoundingClientRect();
        const windowWidth = window.innerWidth;
        const menuWidth = menuRect.width || 250; // fallback width
        
        // Calculate button center relative to parent
        const buttonCenterInParent = buttonRect.left - parentRect.left + (buttonRect.width / 2);
        
        // Center menu below button
        const menuLeftInParent = buttonCenterInParent - (menuWidth / 2);
        
        // Check if menu would overflow on the right
        const menuRightEdge = buttonRect.left + (buttonRect.width / 2) + (menuWidth / 2);
        if (menuRightEdge > windowWidth) {
          // Menu would overflow right, align to right edge with padding
          menu.style.left = 'auto';
          menu.style.right = '0';
          menu.style.transform = 'none';
        } else {
          // Check if menu would overflow on the left
          const menuLeftEdge = buttonRect.left + (buttonRect.width / 2) - (menuWidth / 2);
          if (menuLeftEdge < 0) {
            // Menu would overflow left, align to left edge
            menu.style.left = '0';
            menu.style.right = 'auto';
            menu.style.transform = 'none';
          } else {
            // Center it perfectly below the button
            menu.style.left = `${menuLeftInParent}px`;
            menu.style.right = 'auto';
            menu.style.transform = 'none';
          }
        }
      }
    };
    
    // Use requestAnimationFrame to ensure menu is rendered
    requestAnimationFrame(() => {
      setTimeout(adjustPosition, 0);
    });
    
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [showProfileMenu]);

  // Quick switch menu handlers
  useEffect(() => {
    if (!showQuickSwitchMenu) return;
    
    const onClickOutside = (e) => {
      // Check if click was outside both button and profile menu
      if (quickSwitchButtonRef.current && profileMenuRef.current) {
        const button = quickSwitchButtonRef.current;
        const profileMenu = profileMenuRef.current;
        
        if (!button.contains(e.target) && !profileMenu.contains(e.target)) {
          setShowQuickSwitchMenu(false);
        }
      }
    };

    const onKey = (e) => { 
      if (e.key === 'Escape') setShowQuickSwitchMenu(false); 
    };

    // Small delay before adding click listener to avoid immediate close
    setTimeout(() => {
      document.addEventListener('mousedown', onClickOutside);
    }, 0);
    document.addEventListener('keydown', onKey);
    
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKey);
    };
  }, [showQuickSwitchMenu]);

  return (
    <>
    <div className="top-navigation">
      {/* Left Section - Home Button */}
      <div className="nav-left">
        <button 
          className="home-btn"
          onClick={() => handleNavigation('home')}
        >
          <div className="home-logo">
            <KinmaLogo />
          </div>
          {isGameStudio ? (
            <span>
              <span className="kinma-main">KINMA</span>
              <span className="kinma-subtitle"> studio view</span>
            </span>
          ) : (
            <span>KINMA</span>
          )}
        </button>
      </div>

      {/* Right Section - Smart Navigation Order */}
      <div className="nav-right">
        {isGameStudio ? (
          /* Game Studio specific navigation */
          <>
            {/* Revenue Display */}
            <div className="balance-wrapper">
              <CustomTooltip text={showBalanceMenu ? '' : 'Earnings'}>
                <div 
                  className={`nav-balance ${showBalanceMenu ? 'active' : ''}`} 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowBalanceMenu(!showBalanceMenu);
                  }}
                >
                  <DollarSign size={18} />
                  <span className="balance-amount">$12,450.50</span>
                </div>
              </CustomTooltip>
              
              {/* Balance Menu - Studio Earnings View */}
              {showBalanceMenu && (
                <div ref={balanceMenuRef} className="balance-menu">
                  <div className="balance-menu-header">
                    <h2>Earnings</h2>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Total revenue from your published games
                    </p>
                  </div>
                  
                  <div style={{ padding: '24px' }}>
                    <div style={{ marginBottom: '16px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>This Month</span>
                      <div style={{ fontSize: '24px', fontWeight: 700, color: '#10b981', marginTop: '4px' }}>
                        $2,450.50
                      </div>
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>All Time</span>
                      <div style={{ fontSize: '20px', fontWeight: 600, color: 'white', marginTop: '4px' }}>
                        $12,450.50
                      </div>
                    </div>
                    <div style={{ 
                      padding: '12px', 
                      background: 'rgba(255, 255, 255, 0.03)', 
                      borderRadius: '8px',
                      fontSize: '13px',
                      color: 'var(--text-secondary)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span>Active Games:</span>
                        <span style={{ color: 'white' }}>3</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Total Downloads:</span>
                        <span style={{ color: 'white' }}>1,801</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="balance-actions">
                    <button className="cancel-btn" onClick={() => setShowBalanceMenu(false)}>Close</button>
                    <button 
                      className="confirm-btn" 
                      onClick={() => {
                        // Handle view detailed earnings
                        setShowBalanceMenu(false);
                      }}
                    >View Details</button>
                  </div>
                </div>
              )}
            </div>
            
            <div className="nav-separator" />
            
            {/* Analytics Menu */}
            <CustomTooltip text={openStudioMenu === 'analytics' ? '' : 'Analytics'}>
              <div ref={analyticsWrapperRef} className="analytics-wrapper" style={{ position: 'relative' }}>
                <button 
                  className={`nav-item ${openStudioMenu === 'analytics' ? 'active' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowBalanceMenu(false);
                    setOpenStudioMenu(openStudioMenu === 'analytics' ? null : 'analytics');
                  }}
                >
                  <BarChart3 size={20} />
                </button>
                
                {openStudioMenu === 'analytics' && (
                  <div className="analytics-menu" style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '8px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    padding: '8px',
                    minWidth: '220px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                    zIndex: 1000
                  }}>
                    <div className="game-studio-menu-item" onClick={() => { 
                      setOpenStudioMenu(null);
                      navigate('/game-studio#performance-dashboard');
                    }}>
                      <BarChart3 size={18} />
                      <span>Performance Dashboard</span>
                    </div>
                    <div className="game-studio-menu-item" onClick={() => { 
                      setOpenStudioMenu(null);
                      navigate('/game-studio#player-statistics');
                    }}>
                      <TrendingUp size={18} />
                      <span>Player Statistics</span>
                    </div>
                    <div className="game-studio-menu-item" onClick={() => { 
                      setOpenStudioMenu(null);
                      navigate('/game-studio#engagement-metrics');
                    }}>
                      <Users size={18} />
                      <span>Engagement Metrics</span>
                    </div>
                    <div className="game-studio-menu-item" onClick={() => { 
                      setOpenStudioMenu(null);
                      navigate('/game-studio#revenue-analytics');
                    }}>
                      <DollarSign size={18} />
                      <span>Revenue Analytics</span>
                    </div>
                  </div>
                )}
              </div>
            </CustomTooltip>
            
            <CustomTooltip text={openStudioMenu === 'publishing' ? '' : 'Publishing'}>
              <div ref={publishingWrapperRef} className="publishing-wrapper" style={{ position: 'relative' }}>
                <button 
                  className={`nav-item ${openStudioMenu === 'publishing' ? 'active' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowBalanceMenu(false);
                    setOpenStudioMenu(openStudioMenu === 'publishing' ? null : 'publishing');
                  }}
                >
                  <Upload size={20} />
                </button>
                
                {openStudioMenu === 'publishing' && (
                  <div className="publishing-menu" style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '8px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    padding: '8px',
                    minWidth: '220px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                    zIndex: 1000
                  }}>
                    <div className="game-studio-menu-item" onClick={() => { 
                      setOpenStudioMenu(null);
                      window.dispatchEvent(new CustomEvent('studio-open-upload-modal'));
                    }}>
                      <Upload size={18} />
                      <span>New Game</span>
                    </div>
                    <div className="game-studio-menu-item" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                      <FileText size={18} />
                      <span>From Template</span>
                    </div>
                    <div className="game-studio-menu-item" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                      <Download size={18} />
                      <span>Import Game</span>
                    </div>
                  </div>
                )}
              </div>
            </CustomTooltip>
            
            <div className="nav-separator" />
            
            {/* Content Menu */}
            <CustomTooltip text={openStudioMenu === 'content' ? '' : 'Content'}>
              <div ref={contentWrapperRef} className="content-wrapper" style={{ position: 'relative' }}>
                <button 
                  className={`nav-item ${openStudioMenu === 'content' ? 'active' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowBalanceMenu(false);
                    setOpenStudioMenu(openStudioMenu === 'content' ? null : 'content');
                  }}
                >
                  <Package size={20} />
                </button>
                
                {openStudioMenu === 'content' && (
                  <div className="content-menu" style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '8px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    padding: '8px',
                    minWidth: '220px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                    zIndex: 1000
                  }}>
                    <div className="game-studio-menu-item" onClick={() => { 
                      setOpenStudioMenu(null);
                      navigate('/game-studio#all-content');
                    }}>
                      <Package size={18} />
                      <span>All Content</span>
                    </div>
                    <div className="game-studio-menu-item" onClick={() => { 
                      setOpenStudioMenu(null);
                      navigate('/game-studio#assets');
                    }}>
                      <FileText size={18} />
                      <span>Assets</span>
                    </div>
                    <div className="game-studio-menu-item" onClick={() => { 
                      setOpenStudioMenu(null);
                      navigate('/game-studio#add-content');
                    }}>
                      <Upload size={18} />
                      <span>Add New Content</span>
                    </div>
                    <div className="game-studio-menu-item" onClick={() => { 
                      setOpenStudioMenu(null);
                      navigate('/game-studio#content-settings');
                    }}>
                      <Settings size={18} />
                      <span>Content Settings</span>
                    </div>
                  </div>
                )}
              </div>
            </CustomTooltip>
            
            {/* Reports Menu */}
            <CustomTooltip text={openStudioMenu === 'reports' ? '' : 'Reports'}>
              <div ref={reportsWrapperRef} className="reports-wrapper" style={{ position: 'relative' }}>
                <button 
                  className={`nav-item ${openStudioMenu === 'reports' ? 'active' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowBalanceMenu(false);
                    setOpenStudioMenu(openStudioMenu === 'reports' ? null : 'reports');
                  }}
                >
                  <FileText size={20} />
                </button>
                
                {openStudioMenu === 'reports' && (
                  <div className="reports-menu" style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '8px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    padding: '8px',
                    minWidth: '220px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                    zIndex: 1000
                  }}>
                    <div className="game-studio-menu-item" onClick={() => { 
                      setOpenStudioMenu(null);
                      navigate('/game-studio#sales-reports');
                    }}>
                      <FileText size={18} />
                      <span>Sales Reports</span>
                    </div>
                    <div className="game-studio-menu-item" onClick={() => { 
                      setOpenStudioMenu(null);
                      navigate('/game-studio#analytics-reports');
                    }}>
                      <BarChart3 size={18} />
                      <span>Analytics Reports</span>
                    </div>
                    <div className="game-studio-menu-item" onClick={() => { 
                      setOpenStudioMenu(null);
                      navigate('/game-studio#user-reports');
                    }}>
                      <Users size={18} />
                      <span>User Reports</span>
                    </div>
                    <div className="game-studio-menu-item" onClick={() => { 
                      setOpenStudioMenu(null);
                      navigate('/game-studio#content-reports');
                    }}>
                      <Package size={18} />
                      <span>Content Reports</span>
                    </div>
                  </div>
                )}
              </div>
            </CustomTooltip>
            
            <div className="nav-separator" />
            
            <CustomTooltip text="Settings">
              <button 
                className={`nav-item ${currentPage === 'settings' ? 'active' : ''}`}
                onClick={() => handleNavigation('settings')}
              >
                <Settings size={20} />
              </button>
            </CustomTooltip>
          </>
        ) : (
          /* Regular navigation */
          <>
            <CustomTooltip text="Store">
              <button 
                className={`nav-item ${currentPage === 'store' ? 'active' : ''}`}
                onClick={() => handleNavigation('store')}
              >
                <Store size={20} />
              </button>
            </CustomTooltip>
            
            <CustomTooltip text="Market">
              <button 
                className={`nav-item ${currentPage === 'market' ? 'active' : ''}`}
                onClick={() => handleNavigation('market')}
              >
                <ShoppingCart size={20} />
              </button>
            </CustomTooltip>
            
            <CustomTooltip text="Community">
              <button 
                className={`nav-item ${currentPage === 'community' ? 'active' : ''}`}
                onClick={() => handleNavigation('community')}
              >
                <Globe size={20} />
              </button>
            </CustomTooltip>
            
            <div className="nav-separator" />
            
            {/* Balance & Profile */}
            <div className="balance-wrapper">
              <CustomTooltip text={showBalanceMenu ? '' : 'Balance'}>
                <div 
                  className={`nav-balance ${showBalanceMenu ? 'active' : ''}`} 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowBalanceMenu(!showBalanceMenu);
                  }}
                >
                  <Wallet size={18} />
                  <span className="balance-amount">${userBalance.toFixed(2)}</span>
                </div>
              </CustomTooltip>
              
              {/* Balance Menu */}
              {showBalanceMenu && (
                <div ref={balanceMenuRef} className="balance-menu">
                  <div className="balance-menu-header">
                    <h2>Add Funds</h2>
                  </div>
                  
                  <div className="balance-input-section">
                    <div className="balance-input-controls">
                      <button 
                        className="amount-btn" 
                        onClick={() => handleAmountChange(-5)}
                        disabled={topUpAmount === 0}
                      >
                        <Minus size={36} />
                      </button>
                      <div className="balance-input-display">
                        <span className="currency">$</span>
                        <input 
                          type="text" 
                          value={topUpAmount} 
                          onChange={(e) => {
                            const inputValue = e.target.value;
                            if (inputValue === '' || inputValue === '0') {
                              setTopUpAmount(0);
                            } else if (topUpAmount === 0 && inputValue.length > 1) {
                              const parsedValue = Math.min(parseInt(inputValue), 1000000);
                              setTopUpAmount(parsedValue);
                            } else {
                              const parsedValue = Math.min(parseFloat(inputValue) || 0, 1000000);
                              setTopUpAmount(Math.max(0, parsedValue));
                            }
                          }}
                          placeholder="0"
                          className="balance-amount-input"
                          inputMode="numeric"
                        />
                      </div>
                      <button 
                        className="amount-btn" 
                        onClick={() => handleAmountChange(5)}
                        disabled={topUpAmount >= 1000000}
                      >
                        <Plus size={36} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="balance-presets">
                    <button 
                      className="preset-btn" 
                      onClick={() => handlePresetAmount(10)}
                    >
                      $10
                    </button>
                    <button 
                      className="preset-btn" 
                      onClick={() => handlePresetAmount(25)}
                    >
                      $25
                    </button>
                    <button 
                      className="preset-btn" 
                      onClick={() => handlePresetAmount(50)}
                    >
                      $50
                    </button>
                    <button 
                      className="preset-btn" 
                      onClick={() => handlePresetAmount(100)}
                    >
                      $100
                    </button>
                  </div>
                  
                  <div className="balance-actions">
                    <button className="cancel-btn" onClick={() => setShowBalanceMenu(false)}>Cancel</button>
                    <button 
                      className="confirm-btn" 
                      onClick={() => {
                        if (topUpAmount >= 5) {
                          // Handle add funds logic here
                          setShowBalanceMenu(false);
                        }
                      }}
                      disabled={topUpAmount < 5}
                    >Add Funds</button>
                  </div>
                </div>
              )}
            </div>
            
            {authUser ? (
              <div style={{ position: 'relative' }}>
                <CustomTooltip text={`Profile - ${userName}`}>
                  <button 
                    ref={profileButtonRef}
                    className={`nav-item nav-item-with-user-info ${showProfileMenu ? 'active' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowProfileMenu((v) => !v);
                    }}
                  >
                    <User size={20} />
                    <span className="nav-user-name">{userName}</span>
                    <span className="nav-user-level">Lv {userLevel}</span>
                  </button>
                </CustomTooltip>
                {showProfileMenu && (
                  <div 
                    ref={profileMenuRef} 
                    className="profile-menu" 
                    style={{ 
                      position: 'absolute',
                      top: '100%',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      marginTop: '8px',
                      width: '320px',
                      zIndex: 1000
                    }}
                  >
                    <div 
                      ref={profileHeaderRef}
                      className="profile-menu-header"
                      onClick={() => {
                        handleNavigation('profile');
                        setShowProfileMenu(false);
                      }}
                    >
                      <div className="profile-menu-user-info">
                        <div className="profile-menu-avatar">
                          {getInitials(authUser)}
                        </div>
                        <div className="profile-menu-user-details">
                          <div className="profile-menu-name-row">
                            <h3>{userName}</h3>
                            <span className="profile-menu-level">Lv {userLevel}</span>
                          </div>
                          <p>{authUser?.email || ''}</p>
                        </div>
                        <div style={{ marginLeft: 'auto' }}>
                          <button
                            ref={quickSwitchButtonRef}
                            className="profile-menu-quick-switch-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowQuickSwitchMenu((prev) => !prev);
                            }}
                            title="Quick Switch Account"
                          >
                            <RefreshCw size={18} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {showQuickSwitchMenu && availableUsers.length > 1 && (
                      <div className="profile-menu-quick-switch-section">
                        <div className="quick-switch-header">
                          <span>Quick Switch</span>
                        </div>
                        <div className="quick-switch-accounts">
                          {loadingUsers ? (
                            <div className="quick-switch-loading">Loading accounts...</div>
                          ) : (
                            // Show only top 3 non-current accounts
                            availableUsers
                              .filter((u) => u.id !== authUser?.id)
                              .slice(0, 3)
                              .map((user) => {
                                const userInitials = getInitials(user);
                                const userDisplayName = user.name || user.username || user.email?.split('@')[0] || 'User';
                                
                                return (
                                  <button
                                    key={user.id}
                                    className={`quick-switch-item`}
                                    onClick={() => {
                                      handleQuickSwitchFromMenu(user);
                                      setShowQuickSwitchMenu(false);
                                    }}
                                  >
                                    <div className="quick-switch-avatar">{userInitials}</div>
                                    <div className="quick-switch-info">
                                      <span className="quick-switch-name">{userDisplayName}</span>
                                    </div>
                                  </button>
                                );
                              })
                          )}
                        </div>
                        {null}
                      </div>
                    )}

                    {showQuickSwitchMenu && <div className="profile-menu-divider"></div>}

                    <div className="profile-menu-manage-accounts">
                      <button 
                        className="profile-menu-action-btn"
                        onClick={async () => { 
                          setShowProfileMenu(false);
                          const api = window.electronAPI || window.electron;
                          try {
                            const result = await api?.openAccountSwitcherWindow?.();
                            if (!result || !result.success) {
                              navigate('/account-switcher');
                            }
                          } catch (error) {
                            console.error('Error opening account switcher window:', error);
                            navigate('/account-switcher');
                          }
                        }}
                      >
                        <Users size={16} />
                        <span>Manage Accounts</span>
                      </button>
                    </div>

                    <div className="profile-menu-divider"></div>

                    <div className="profile-menu-actions">
                      <button 
                        className="profile-menu-action-btn"
                        onClick={() => { handleNavigation('profile'); setShowProfileMenu(false); }}
                      >
                        <User size={16} />
                        <span>Open Profile</span>
                      </button>
                      <button 
                        className="profile-menu-action-btn"
                        onClick={() => { handleNavigation('notifications'); setShowProfileMenu(false); }}
                      >
                        <Bell size={16} />
                        <span>Notifications</span>
                      </button>
                      <button 
                        className="profile-menu-action-btn"
                        onClick={() => { handleNavigation('settings'); setShowProfileMenu(false); }}
                      >
                        <Settings size={16} />
                        <span>Settings</span>
                      </button>
                      <button 
                        className="profile-menu-action-btn danger"
                        onClick={() => { handleLogout(); setShowProfileMenu(false); }}
                      >
                        <span>Log out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <CustomTooltip text="Sign in / Register">
                <button 
                  className={`nav-item ${showAuth ? 'active' : ''}`}
                  onClick={() => setShowAuth(true)}
                >
                  <User size={20} />
                </button>
              </CustomTooltip>
            )}
          </>
        )}
      </div>

      {/* PayPal Connect Modal */}
      {showPayPalConnect && (
        <div className="modal-overlay" onMouseDown={(e) => {
          if (e.target === e.currentTarget) {
            setShowPayPalConnect(false);
          }
        }}>
          <div className="modal-content" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Connect PayPal</h3>
              <button className="modal-close" onClick={() => setShowPayPalConnect(false)}>×</button>
            </div>
            <div className="modal-body">
              <p>You will be redirected to PayPal to connect your account securely.</p>
              <button className="connect-btn-large" onClick={() => {
                // Handle PayPal connection
                setShowPayPalConnect(false);
              }}>
                Continue to PayPal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Crypto Connect Modal */}
      {showCryptoConnect && (
        <div className="modal-overlay" onMouseDown={(e) => {
          if (e.target === e.currentTarget) {
            setShowCryptoConnect(false);
          }
        }}>
          <div className="modal-content" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Connect Crypto Wallet</h3>
              <button className="modal-close" onClick={() => setShowCryptoConnect(false)}>×</button>
            </div>
            <div className="modal-body">
              <p>Scan the QR code with your crypto wallet app to connect.</p>
              <div className="crypto-qr-placeholder">
                <div className="qr-code">QR Code Placeholder</div>
              </div>
              <button className="connect-btn-large" onClick={() => {
                // Handle crypto wallet connection
                setShowCryptoConnect(false);
              }}>
                Connected
              </button>
            </div>
          </div>
        </div>
      )}

    </div>

    <AuthModal 
      isOpen={showAuth}
      onClose={() => setShowAuth(false)}
      onAuthenticated={handleAuthenticated}
      fullscreen
    />
    </>
  );
};

export default TopNavigation;
