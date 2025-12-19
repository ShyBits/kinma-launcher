import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Settings, Users, MessageSquare, ShoppingCart, Bell, User, Plus, Minus, CreditCard, Coins, Store, Globe, Menu,
  BarChart3, Package, FileText, Upload, TrendingUp, DollarSign, Download, Check, RefreshCw, AlertCircle, Info, Gift, X, ShoppingBag, Award, Building2, LogOut, ChevronRight, ChevronLeft
} from 'lucide-react';
import AuthModal from './AuthModal';
import { getUserData, saveUserData, getCurrentUserId } from '../utils/UserDataManager';
import { loadNotifications, saveNotifications, subscribeToNotifications, markNotificationAsRead as markRead, markAllNotificationsAsRead as markAllRead, deleteNotification as deleteNotif } from '../utils/NotificationManager';
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
  location,
  sidebarWidth = 260,
  isResizing = false
}) => {
  const [showBalanceMenu, setShowBalanceMenu] = useState(false);
  const [showTransactionMenu, setShowTransactionMenu] = useState(false);
  const [showCheckoutMenu, setShowCheckoutMenu] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState(0);
  const [cartItems, setCartItems] = useState([]);
  const [balanceMenuTab, setBalanceMenuTab] = useState('add-funds'); // 'add-funds' or 'cart'
  const [showCartBadge, setShowCartBadge] = useState(false);
  const balanceMenuRef = useRef(null);
  const transactionMenuRef = useRef(null);
  const checkoutMenuRef = useRef(null);
  const checkoutMenuJustOpenedRef = useRef(false);
  const checkoutMenuTimeoutRef = useRef(null);

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
  const profileMenuJustOpenedRef = useRef(false);
  const profileMenuTimeoutRef = useRef(null);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showQuickSwitchMenu, setShowQuickSwitchMenu] = useState(false);
  const quickSwitchMenuRef = useRef(null);
  const quickSwitchButtonRef = useRef(null);
  const quickSwitchHoverTimeoutRef = useRef(null);
  const [avatarError, setAvatarError] = useState(false);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const notificationDropdownRef = useRef(null);
  const notificationButtonRef = useRef(null);
  const notificationMenuJustOpenedRef = useRef(false);
  const notificationMenuTimeoutRef = useRef(null);
  const studioMenuJustOpenedRef = useRef(false);
  const studioMenuTimeoutRef = useRef(null);
  const balanceMenuJustOpenedRef = useRef(false);
  const balanceMenuTimeoutRef = useRef(null);
  const [isMenuToggleHovered, setIsMenuToggleHovered] = useState(false);
  
  // Get preview icon component
  const getPreviewIcon = (iconType) => {
    const previewIconMap = {
      award: Award,
      package: Package,
      shoppingBag: ShoppingBag
    };
    return previewIconMap[iconType] || null;
  };

  // Icon mapping
  const iconMap = {
    gift: Gift,
    users: Users,
    alertCircle: AlertCircle,
    messageSquare: MessageSquare,
    info: Info,
    bell: Bell,
    shoppingBag: ShoppingBag,
    package: Package,
    award: Award
  };

  const getIconComponent = (iconType) => {
    return iconMap[iconType] || Bell;
  };

  // Helper function to map notification data to components (must be defined before useState)
  const mapNotificationData = (notifications) => {
    return notifications.map(n => ({
      ...n,
      iconType: n.iconType || n.type || 'info',
      preview: n.preview ? {
        ...n.preview,
        icon: n.preview.iconType ? (() => {
          const previewIconMap = {
            award: Award,
            package: Package,
            shoppingBag: ShoppingBag
          };
          return previewIconMap[n.preview.iconType] || null;
        })() : null
      } : null
    }));
  };

  // Notification state - shared between dropdown and page
  const [notifications, setNotifications] = useState(() => {
    const loaded = loadNotifications();
    if (loaded.length > 0) {
      return mapNotificationData(loaded);
    }
    // Default notifications if none exist
    const defaultNotifications = [
      {
        id: 1,
        type: 'achievement',
        title: 'Achievement Unlocked!',
        message: 'You\'ve completed your first game session!',
        time: '2 minutes ago',
        timestamp: Date.now() - 120000,
        read: false,
        iconType: 'gift',
        preview: {
          type: 'badge',
          iconType: 'award',
          color: '#4ade80',
          label: 'Badge'
        },
        source: 'Achievement Unlocked'
      },
      {
        id: 2,
        type: 'friend',
        title: 'New Friend Request',
        message: 'GamerPro123 wants to be your friend',
        time: '15 minutes ago',
        timestamp: Date.now() - 900000,
        read: false,
        iconType: 'users'
      },
      {
        id: 3,
        type: 'update',
        title: 'Game Update Available',
        message: 'Pathline v2.1.0 is ready to download',
        time: '1 hour ago',
        timestamp: Date.now() - 3600000,
        read: true,
        iconType: 'alertCircle'
      },
      {
        id: 4,
        type: 'community',
        title: 'New Community Post',
        message: 'Someone replied to your post in the Community',
        time: '3 hours ago',
        timestamp: Date.now() - 10800000,
        read: true,
        iconType: 'messageSquare'
      },
      {
        id: 5,
        type: 'system',
        title: 'System Maintenance',
        message: 'Scheduled maintenance will occur tonight at 2 AM',
        time: '1 day ago',
        timestamp: Date.now() - 86400000,
        read: true,
        iconType: 'info'
      }
    ];
    saveNotifications(defaultNotifications);
    return mapNotificationData(defaultNotifications);
  });
  
  // Subscribe to notification changes from other components
  useEffect(() => {
    const unsubscribe = subscribeToNotifications((updatedNotifications) => {
      setNotifications(mapNotificationData(updatedNotifications));
    });

    return unsubscribe;
  }, []);
  
  // Check if we're in Game Studio
  const isGameStudio = location?.pathname === '/game-studio' || location?.pathname === '/game-studio-settings';
  
  // Check if user has game studio access
  const [hasGameStudioAccess, setHasGameStudioAccess] = useState(false);
  const [gameStudioEnabled, setGameStudioEnabled] = useState(false);
  
  useEffect(() => {
    const checkAccess = () => {
      try {
        const userId = getCurrentUserId();
        if (userId) {
          const hasDeveloperAccess = getUserData('developerAccess', false, userId);
          const hasStudioAccess = getUserData('gameStudioAccess', false, userId);
          const accessStatus = getUserData('developerAccessStatus', null, userId);
          
          // User has access only if explicitly granted (not pending)
          // Don't show switch button if status is pending
          const hasAccess = (hasDeveloperAccess || hasStudioAccess) && accessStatus !== 'pending';
          setHasGameStudioAccess(hasAccess);
          setGameStudioEnabled(hasAccess);
        } else {
          setHasGameStudioAccess(false);
          setGameStudioEnabled(false);
        }
      } catch (_) {
        setHasGameStudioAccess(false);
        setGameStudioEnabled(false);
      }
    };
    
    checkAccess();
    
    // Listen for user changes
    const handleUserChange = () => {
      checkAccess();
    };
    
    window.addEventListener('user-changed', handleUserChange);
    return () => {
      window.removeEventListener('user-changed', handleUserChange);
    };
  }, []);
  
  const handleGameStudioToggle = (enabled) => {
    const userId = getCurrentUserId();
    if (userId) {
      saveUserData('gameStudioAccess', enabled, userId);
      saveUserData('developerAccess', enabled, userId);
      if (enabled) {
        saveUserData('developerAccessStatus', 'approved', userId);
        // Navigate to Game Studio when enabled
        navigate('/game-studio');
      }
      setGameStudioEnabled(enabled);
      setHasGameStudioAccess(enabled);
      // Trigger user-changed event
      window.dispatchEvent(new CustomEvent('user-changed'));
    }
  };
  
  const handleAmountChange = (delta) => {
    setTopUpAmount(prev => Math.max(0, prev + delta));
  };
  
  const handlePresetAmount = (amount) => {
    setTopUpAmount(amount);
  };

  // Memoized handlers for balance menu
  const handleBalanceMenuEscape = useCallback((event) => {
    if (event.key === 'Escape' && showBalanceMenu) {
      setShowBalanceMenu(false);
    }
  }, [showBalanceMenu]);

  const handleBalanceMenuClickOutside = useCallback((event) => {
    // Don't close if menu was just opened (prevent immediate closure)
    if (balanceMenuJustOpenedRef.current) {
      return;
    }
    
    const target = event.target;
    const isBalanceButton = target.closest('.nav-balance');
    const isMenu = balanceMenuRef.current && balanceMenuRef.current.contains(target);
    
    if (!isBalanceButton && !isMenu && balanceMenuRef.current) {
      setShowBalanceMenu(false);
    }
  }, []);

  // Handle click outside and Escape key to close balance menu
  useEffect(() => {
    if (!showBalanceMenu) {
      balanceMenuJustOpenedRef.current = false;
      if (balanceMenuTimeoutRef.current) {
        clearTimeout(balanceMenuTimeoutRef.current);
        balanceMenuTimeoutRef.current = null;
      }
      return;
    }

    // Mark menu as just opened and set flag to prevent immediate closure
    balanceMenuJustOpenedRef.current = true;
    if (balanceMenuTimeoutRef.current) {
      clearTimeout(balanceMenuTimeoutRef.current);
    }
    balanceMenuTimeoutRef.current = setTimeout(() => {
      balanceMenuJustOpenedRef.current = false;
    }, 100); // 100ms delay before allowing click outside to close

    // Add event listeners with delay to prevent immediate closure
    const timeoutId = setTimeout(() => {
      document.addEventListener('keydown', handleBalanceMenuEscape);
      document.addEventListener('mousedown', handleBalanceMenuClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      if (balanceMenuTimeoutRef.current) {
        clearTimeout(balanceMenuTimeoutRef.current);
        balanceMenuTimeoutRef.current = null;
      }
      document.removeEventListener('keydown', handleBalanceMenuEscape);
      document.removeEventListener('mousedown', handleBalanceMenuClickOutside);
    };
  }, [showBalanceMenu, handleBalanceMenuEscape, handleBalanceMenuClickOutside]);

  // Memoized handlers for checkout menu
  const handleCheckoutMenuEscape = useCallback((event) => {
    if (event.key === 'Escape' && showCheckoutMenu) {
      setShowCheckoutMenu(false);
    }
  }, [showCheckoutMenu]);

  const handleCheckoutMenuClickOutside = useCallback((event) => {
    // Don't close if menu was just opened (prevent immediate closure)
    if (checkoutMenuJustOpenedRef.current) {
      return;
    }
    
    const target = event.target;
    const isCheckoutButton = target.closest('.checkout-btn');
    const isMenu = checkoutMenuRef.current && checkoutMenuRef.current.contains(target);
    
    if (!isCheckoutButton && !isMenu && checkoutMenuRef.current) {
      setShowCheckoutMenu(false);
    }
  }, []);

  // Handle click outside and Escape key to close checkout menu
  useEffect(() => {
    if (!showCheckoutMenu) {
      checkoutMenuJustOpenedRef.current = false;
      if (checkoutMenuTimeoutRef.current) {
        clearTimeout(checkoutMenuTimeoutRef.current);
        checkoutMenuTimeoutRef.current = null;
      }
      return;
    }

    // Mark menu as just opened and set flag to prevent immediate closure
    checkoutMenuJustOpenedRef.current = true;
    if (checkoutMenuTimeoutRef.current) {
      clearTimeout(checkoutMenuTimeoutRef.current);
    }
    checkoutMenuTimeoutRef.current = setTimeout(() => {
      checkoutMenuJustOpenedRef.current = false;
    }, 100); // 100ms delay before allowing click outside to close

    // Add event listeners with delay to prevent immediate closure
    const timeoutId = setTimeout(() => {
      document.addEventListener('keydown', handleCheckoutMenuEscape);
      document.addEventListener('mousedown', handleCheckoutMenuClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      if (checkoutMenuTimeoutRef.current) {
        clearTimeout(checkoutMenuTimeoutRef.current);
        checkoutMenuTimeoutRef.current = null;
      }
      document.removeEventListener('keydown', handleCheckoutMenuEscape);
      document.removeEventListener('mousedown', handleCheckoutMenuClickOutside);
    };
  }, [showCheckoutMenu, handleCheckoutMenuEscape, handleCheckoutMenuClickOutside]);

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

  // Notification handlers - these will sync with Notifications page
  const markNotificationAsRead = (id) => {
    setNotifications(prev => {
      const updated = markRead(id, prev);
      return mapNotificationData(updated);
    });
  };

  const markAllNotificationsAsRead = () => {
    setNotifications(prev => {
      const updated = markAllRead(prev);
      return mapNotificationData(updated);
    });
  };

  const deleteNotification = (id) => {
    setNotifications(prev => {
      const updated = deleteNotif(id, prev);
      return mapNotificationData(updated);
    });
  };

  const getNotificationColor = (type, priority) => {
    // Priority-based colors (if priority is set, use it)
    if (priority === 'error' || type === 'error') return '#ef4444'; // Red
    if (priority === 'warning' || type === 'warning') return '#f59e0b'; // Yellow
    if (priority === 'item' || type === 'item' || type === 'purchase' || type === 'inventory' || type === 'market') return '#3b82f6'; // Blue
    if (priority === 'success' || type === 'achievement' || type === 'success' || type === 'confirmation') return '#4ade80'; // Green
    
    // Type-based colors
    const colors = {
      error: '#ef4444', // Red - errors
      warning: '#f59e0b', // Yellow - warnings
      item: '#3b82f6', // Blue - item related
      purchase: '#3b82f6', // Blue - purchases
      inventory: '#3b82f6', // Blue - inventory
      market: '#3b82f6', // Blue - market
      achievement: '#4ade80', // Green - confirmations/achievements
      success: '#4ade80', // Green - success
      confirmation: '#4ade80', // Green - confirmations
      friend: '#3b82f6', // Blue - friend requests (item-related)
      update: '#6b7280', // Grey - updates (not so important)
      community: '#6b7280', // Grey - community (not so important)
      system: '#6b7280' // Grey - system (not so important)
    };
    return colors[type] || '#6b7280'; // Default to grey
  };

  // Helper function to convert hex to rgba
  const hexToRgba = (hex, alpha) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // Get background color for unread notifications
  const getNotificationBackgroundColor = (type, priority, hover = false) => {
    const color = getNotificationColor(type, priority);
    const opacity = hover ? 0.09 : 0.06;
    return hexToRgba(color, opacity);
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  
  // Get the highest priority color from unread notifications
  const getHighestPriorityColor = () => {
    const unreadNotifications = notifications.filter(n => !n.read);
    if (unreadNotifications.length === 0) return null;
    
    // Priority order: error (red) > warning (yellow) > item (blue) > success (green) > other (grey)
    for (const notification of unreadNotifications) {
      const color = getNotificationColor(notification.type, notification.priority);
      if (color === '#ef4444') return color; // Error (highest priority)
    }
    for (const notification of unreadNotifications) {
      const color = getNotificationColor(notification.type, notification.priority);
      if (color === '#f59e0b') return color; // Warning
    }
    for (const notification of unreadNotifications) {
      const color = getNotificationColor(notification.type, notification.priority);
      if (color === '#3b82f6') return color; // Item
    }
    for (const notification of unreadNotifications) {
      const color = getNotificationColor(notification.type, notification.priority);
      if (color === '#4ade80') return color; // Success
    }
    
    return '#ef4444'; // Default to red if there are unread notifications
  };
  
  const highestPriorityColor = unreadCount > 0 ? getHighestPriorityColor() : null;

  // Handle notification dropdown click
  const handleNotificationButtonClick = (e) => {
    e.stopPropagation();
    setShowNotificationDropdown(prev => !prev);
  };

  // Memoized handlers for notification dropdown
  const handleNotificationDropdownEscape = useCallback((event) => {
    if (event.key === 'Escape' && showNotificationDropdown) {
      setShowNotificationDropdown(false);
    }
  }, [showNotificationDropdown]);

  const handleNotificationDropdownClickOutside = useCallback((event) => {
    // Don't close if menu was just opened (prevent immediate closure)
    if (notificationMenuJustOpenedRef.current) {
      return;
    }
    
    const target = event.target;
    const isButton = notificationButtonRef.current && notificationButtonRef.current.contains(target);
    const isDropdown = notificationDropdownRef.current && notificationDropdownRef.current.contains(target);
    
    if (!isButton && !isDropdown) {
      setShowNotificationDropdown(false);
    }
  }, []);

  // Handle click outside notification dropdown
  useEffect(() => {
    if (!showNotificationDropdown) {
      notificationMenuJustOpenedRef.current = false;
      if (notificationMenuTimeoutRef.current) {
        clearTimeout(notificationMenuTimeoutRef.current);
        notificationMenuTimeoutRef.current = null;
      }
      return;
    }

    // Mark menu as just opened and set flag to prevent immediate closure
    notificationMenuJustOpenedRef.current = true;
    if (notificationMenuTimeoutRef.current) {
      clearTimeout(notificationMenuTimeoutRef.current);
    }
    notificationMenuTimeoutRef.current = setTimeout(() => {
      notificationMenuJustOpenedRef.current = false;
    }, 100); // 100ms delay before allowing click outside to close

    // Add event listeners with delay to prevent immediate closure
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleNotificationDropdownClickOutside);
      document.addEventListener('keydown', handleNotificationDropdownEscape);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      if (notificationMenuTimeoutRef.current) {
        clearTimeout(notificationMenuTimeoutRef.current);
        notificationMenuTimeoutRef.current = null;
      }
      document.removeEventListener('mousedown', handleNotificationDropdownClickOutside);
      document.removeEventListener('keydown', handleNotificationDropdownEscape);
    };
  }, [showNotificationDropdown, handleNotificationDropdownEscape, handleNotificationDropdownClickOutside]);

  // Create fake notification for testing
  const createFakeNotification = () => {
    const types = ['achievement', 'friend', 'update', 'community', 'system'];
    const icons = ['gift', 'users', 'alertCircle', 'messageSquare', 'info'];
    const randomType = types[Math.floor(Math.random() * types.length)];
    const randomIcon = icons[Math.floor(Math.random() * icons.length)];
    
    const titles = {
      achievement: ['Achievement Unlocked!', 'New Achievement Earned!', 'Milestone Reached!'],
      friend: ['New Friend Request', 'Friend Online', 'Friend Activity'],
      update: ['Game Update Available', 'New Version Released', 'Update Downloaded'],
      community: ['New Community Post', 'Reply to Your Comment', 'Community Activity'],
      system: ['System Notification', 'Maintenance Scheduled', 'System Update']
    };

    const messages = {
      achievement: [
        'You\'ve completed your first game session!',
        'Congratulations! You reached level 10',
        'Amazing work! You\'ve unlocked a new badge'
      ],
      friend: [
        'GamerPro123 wants to be your friend',
        'YourFriend2024 is now online',
        'FriendActivity shared a new achievement'
      ],
      update: [
        'Pathline v2.1.0 is ready to download',
        'A new update is available for your games',
        'Download complete! Restart to apply updates'
      ],
      community: [
        'Someone replied to your post in the Community',
        'New post in your favorite group',
        'Your comment received 5 likes!'
      ],
      system: [
        'Scheduled maintenance will occur tonight at 2 AM',
        'Your account has been verified',
        'New features are now available'
      ]
    };

    const randomTitle = titles[randomType][Math.floor(Math.random() * titles[randomType].length)];
    const randomMessage = messages[randomType][Math.floor(Math.random() * messages[randomType].length)];
    
    // Create preview based on type
    let preview = null;
    let sourceIcon = null;
    let source = null;
    
    if (randomType === 'achievement') {
      preview = {
        type: 'badge',
        icon: Award,
        color: '#4ade80',
        label: 'Badge'
      };
      source = 'Achievement Unlocked';
    } else if (randomType === 'friend' && Math.random() > 0.5) {
      // Random gift from friend
      preview = {
        type: 'item',
        icon: Package,
        color: '#3b82f6',
        label: 'Item'
      };
      sourceIcon = 'gift';
      source = 'Gift from Friend';
    } else if (randomType === 'update' && Math.random() > 0.5) {
      // Random purchase
      preview = {
        type: 'item',
        icon: ShoppingBag,
        color: '#f59e0b',
        label: 'Purchase'
      };
      sourceIcon = 'store';
      source = 'Store Purchase';
    }
    
    const newNotification = {
      id: Date.now(),
      type: randomType,
      title: randomTitle,
      message: randomMessage,
      time: 'just now',
      timestamp: Date.now(),
      read: false,
      iconType: randomIcon,
      preview: preview,
      sourceIcon: sourceIcon,
      source: source
    };

    setNotifications(prev => {
      const updated = [newNotification, ...prev];
      saveNotifications(updated);
      return mapNotificationData(updated);
    });
  };

  // Unified outside-click/Escape handling for Game Studio dropdowns
  const publishingWrapperRef = useRef(null);
  
  const handleStudioMenuEscape = useCallback((event) => {
    if (event.key === 'Escape' && openStudioMenu) {
      setOpenStudioMenu(null);
    }
  }, [openStudioMenu]);

  const handleStudioMenuClickOutside = useCallback((event) => {
    // Don't close if menu was just opened (prevent immediate closure)
    if (studioMenuJustOpenedRef.current) {
      return;
    }
    
    const target = event.target;
    const wrappers = [analyticsWrapperRef.current, publishingWrapperRef.current, contentWrapperRef.current, reportsWrapperRef.current];
    const clickedInside = wrappers.some((ref) => ref && ref.contains(target));
    if (!clickedInside) {
      setOpenStudioMenu(null);
    }
  }, []);
  
  useEffect(() => {
    if (!openStudioMenu) {
      studioMenuJustOpenedRef.current = false;
      if (studioMenuTimeoutRef.current) {
        clearTimeout(studioMenuTimeoutRef.current);
        studioMenuTimeoutRef.current = null;
      }
      return;
    }

    // Mark menu as just opened and set flag to prevent immediate closure
    studioMenuJustOpenedRef.current = true;
    if (studioMenuTimeoutRef.current) {
      clearTimeout(studioMenuTimeoutRef.current);
    }
    studioMenuTimeoutRef.current = setTimeout(() => {
      studioMenuJustOpenedRef.current = false;
    }, 100); // 100ms delay before allowing click outside to close

    // Add event listeners with delay to prevent immediate closure
    const timeoutId = setTimeout(() => {
      document.addEventListener('keydown', handleStudioMenuEscape);
      document.addEventListener('mousedown', handleStudioMenuClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      if (studioMenuTimeoutRef.current) {
        clearTimeout(studioMenuTimeoutRef.current);
        studioMenuTimeoutRef.current = null;
      }
      document.removeEventListener('keydown', handleStudioMenuEscape);
      document.removeEventListener('mousedown', handleStudioMenuClickOutside);
    };
  }, [openStudioMenu, handleStudioMenuEscape, handleStudioMenuClickOutside]);

  const handleNavigation = (pageId) => {
    setCurrentPage(pageId);
    const routeMap = {
      'home': isGameStudio ? '/game-studio' : '/store',
      'store': '/store',
      'market': '/market',
      'library': '/library',
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
    if (developerChosen && user.id) {
      // Save developer intent to user account
      saveUserData('developerIntent', 'pending', user.id);
      saveUserData('developerAccess', false, user.id); // Not yet granted
      saveUserData('gameStudioAccess', false, user.id); // Not yet granted
      navigate('/developer-onboarding');
    }
  };

  const handleLogout = async () => {
    try {
      // Call logout API - it will handle switching to another account or showing auth window
      const result = await (window.electronAPI?.logout?.());
      
      if (!result || !result.success) {
        console.error('Logout failed:', result?.error);
        // Fallback: clear local state and navigate to auth
        setAuthUser(null);
        try { localStorage.removeItem('authUser'); } catch (_) {}
        navigate('/auth');
        return;
      }
      
      // Wait a moment for the backend to process
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Check if we're still logged in (switched to another account)
      const updatedAuthUser = (() => {
        try { 
          const u = localStorage.getItem('authUser'); 
          return u ? JSON.parse(u) : null; 
        } catch (_) { 
          return null; 
        }
      })();
      
      if (result.switched && updatedAuthUser && updatedAuthUser.id) {
        // User was switched to another account
        setAuthUser(updatedAuthUser);
        // Dispatch user-changed event to reload user-specific data
        window.dispatchEvent(new Event('user-changed'));
        // Don't navigate - stay on current page
      } else {
        // No other account - user will be logged out and auth window shown
        setAuthUser(null);
        try { localStorage.removeItem('authUser'); } catch (_) {}
        // Navigate to auth page to ensure clean state
        navigate('/auth');
      }
    } catch (error) {
      console.error('Error during logout:', error);
      // Fallback: clear local state and navigate to auth
      setAuthUser(null);
      try { localStorage.removeItem('authUser'); } catch (_) {}
      navigate('/auth');
    }
  };

  // Load cart items from database when user changes or on mount
  useEffect(() => {
    const loadCartItems = async () => {
      const userId = await getCurrentUserId();
      if (!userId) {
        setCartItems([]);
        return;
      }

      try {
        const api = window.electronAPI;
        if (api?.dbGetCartItems) {
          const result = await api.dbGetCartItems(userId);
          if (result && result.success && Array.isArray(result.items)) {
            // Ensure all items are plain serializable objects
            const serializableItems = result.items.map(item => ({
              id: String(item.id || Date.now()),
              amount: parseFloat(item.amount || 0),
              timestamp: String(item.timestamp || new Date().toISOString()),
              itemType: String(item.itemType || 'funds'),
              itemData: item.itemData && typeof item.itemData === 'object' ? item.itemData : {}
            }));
            setCartItems(serializableItems);
          } else {
            setCartItems([]);
          }
        } else {
          // Fallback to localStorage if database API not available
          const stored = localStorage.getItem(`cartItems_${userId}`);
          if (stored) {
            try {
              setCartItems(JSON.parse(stored));
            } catch {
              setCartItems([]);
            }
          }
        }
      } catch (error) {
        console.error('Error loading cart items:', error);
        setCartItems([]);
      }
    };

    loadCartItems();
  }, [authUser?.id]); // Reload when user changes

  // Save cart items to database whenever they change
  useEffect(() => {
    const saveCartItems = async () => {
      const userId = await getCurrentUserId();
      if (!userId) {
        return;
      }

      try {
        const api = window.electronAPI;
        if (api?.dbSaveCartItems) {
          // Ensure all items are plain serializable objects before sending
          const serializableItems = cartItems.map(item => ({
            id: String(item.id || Date.now()),
            amount: parseFloat(item.amount || 0),
            timestamp: String(item.timestamp || new Date().toISOString()),
            itemType: String(item.itemType || 'funds'),
            itemData: item.itemData && typeof item.itemData === 'object' ? item.itemData : {}
          }));
          await api.dbSaveCartItems(userId, serializableItems);
        } else {
          // Fallback to localStorage if database API not available
          localStorage.setItem(`cartItems_${userId}`, JSON.stringify(cartItems));
        }
      } catch (error) {
        console.error('Error saving cart items:', error);
      }
    };

    // Only save if we have a user (avoid saving on initial empty state)
    if (authUser?.id) {
      saveCartItems();
    }
  }, [cartItems, authUser?.id]);

  // Update user level when user changes
  // IMPORTANT: Always delay updates to prevent menu closures during user changes
  useEffect(() => {
    const handleUserChanged = () => {
      // Always delay the update to prevent re-renders that close menus
      // This ensures menus stay open during login/account switching
      setTimeout(() => {
        const updatedAuthUser = (() => {
          try { const u = localStorage.getItem('authUser'); return u ? JSON.parse(u) : null; } catch (_) { return null; }
        })();
        if (updatedAuthUser) {
          // Only update if user actually changed to prevent unnecessary re-renders
          // Use functional update to preserve menu state during re-renders
          setAuthUser(prev => {
            if (prev?.id === updatedAuthUser.id && prev?.email === updatedAuthUser.email) {
              return prev; // No change, don't update - this prevents re-renders that close menus
            }
            return updatedAuthUser;
          });
          // Only update avatar error and level if user actually changed
          setAvatarError(false);
          const userStats = getUserData('userStats', null);
          setUserLevel(userStats?.level || 1);
        }
      }, 150); // Small delay to allow menus to stay open
    };

    window.addEventListener('user-changed', handleUserChanged);
    
    // Also check on mount
    if (authUser) {
      setAvatarError(false); // Reset avatar error on mount
      const userStats = getUserData('userStats', null);
      if (userStats?.level) {
        setUserLevel(userStats.level);
      }
    }

    return () => {
      window.removeEventListener('user-changed', handleUserChanged);
    };
  }, [authUser]); // Only depend on authUser, not menu states

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
              // Filter to only show logged-in users (green accounts) and exclude guest accounts
              // Handle both boolean true and numeric 1 (MySQL stores BOOLEAN as TINYINT)
              const loggedInUsers = result.users.filter(u => {
                // Only include users that are explicitly logged in (green accounts)
                const isLoggedIn = u.isLoggedIn === true || 
                                  u.isLoggedIn === 1 || 
                                  u.isLoggedIn === '1';
                if (!isLoggedIn) return false;
                
                // Exclude guest accounts
                const isGuest = u.isGuest === true || 
                               u.isGuest === 1 || 
                               u.isGuest === '1' ||
                               u.id?.toString().startsWith('guest_') || 
                               u.username?.toString().startsWith('guest_') || 
                               u.name === 'Guest';
                if (isGuest) return false;
                
                return true;
              });
              // Sort: current user first, then by lastLoginTime, then alphabetically
              const sorted = loggedInUsers.sort((a, b) => {
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
              // Filter to only show logged-in users (green accounts) and exclude guest accounts
              // Handle both boolean true and numeric 1 (MySQL stores BOOLEAN as TINYINT)
              const loggedInUsers = result.users.filter(u => {
                // Only include users that are explicitly logged in (green accounts)
                const isLoggedIn = u.isLoggedIn === true || 
                                  u.isLoggedIn === 1 || 
                                  u.isLoggedIn === '1';
                if (!isLoggedIn) return false;
                
                // Exclude guest accounts
                const isGuest = u.isGuest === true || 
                               u.isGuest === 1 || 
                               u.isGuest === '1' ||
                               u.id?.toString().startsWith('guest_') || 
                               u.username?.toString().startsWith('guest_') || 
                               u.name === 'Guest';
                if (isGuest) return false;
                
                return true;
              });
              // Sort: current user first, then by lastLoginTime, then alphabetically
              const sorted = loggedInUsers.sort((a, b) => {
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
          }
        }
      } catch (error) {
        console.error('Error updating last login time:', error);
      }

      // Step 3: Set auth user in localStorage
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

      // Step 4: Set auth user in Electron store
      try {
        await api?.setAuthUser?.(user);
      } catch (error) {
        console.error('Error setting Electron store:', error);
      }

      // Step 5: Call authSuccess to properly handle login
      try {
        await api?.authSuccess?.(user);
        
        // Dispatch user-changed event with a small delay to prevent menu closures
        // This allows menus to stay open during account switching
        setTimeout(() => {
          window.dispatchEvent(new Event('user-changed'));
        }, 100);
      } catch (error) {
        console.error('Error calling authSuccess:', error);
      }

      // Step 6: Wait a bit more then hide loading screen
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
      // Get current user and log them out if they don't have "keep me signed in" enabled
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
        
        // Update last login time for the new user
        const userIndex = users.findIndex(u => u.id === user.id);
        if (userIndex !== -1) {
          users[userIndex].lastLoginTime = new Date().toISOString();
          users[userIndex].isLoggedIn = true; // Mark as logged in
          // IMPORTANT: Clear hiddenInSwitcher flag when user logs in - account should be visible again
          users[userIndex].hiddenInSwitcher = false;
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
      
      // Dispatch user-changed event with a small delay to prevent menu closures
      // This allows menus to stay open during account switching
      setTimeout(() => {
        window.dispatchEvent(new Event('user-changed'));
      }, 100);
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

  // Memoized handlers for profile menu
  const handleProfileMenuEscape = useCallback((e) => {
    if (e.key === 'Escape' && showProfileMenu) {
      setShowProfileMenu(false);
    }
  }, [showProfileMenu]);

  const handleProfileMenuClickOutside = useCallback((e) => {
    // Don't close if menu was just opened (prevent immediate closure)
    if (profileMenuJustOpenedRef.current) {
      return;
    }
    
    if (profileMenuRef.current && !profileMenuRef.current.contains(e.target) &&
        profileButtonRef.current && !profileButtonRef.current.contains(e.target)) {
      setShowProfileMenu(false);
    }
  }, []);

  useEffect(() => {
    if (!showProfileMenu) {
      profileMenuJustOpenedRef.current = false;
      if (profileMenuTimeoutRef.current) {
        clearTimeout(profileMenuTimeoutRef.current);
        profileMenuTimeoutRef.current = null;
      }
      return;
    }

    // Mark menu as just opened and set flag to prevent immediate closure
    profileMenuJustOpenedRef.current = true;
    if (profileMenuTimeoutRef.current) {
      clearTimeout(profileMenuTimeoutRef.current);
    }
    profileMenuTimeoutRef.current = setTimeout(() => {
      profileMenuJustOpenedRef.current = false;
    }, 100); // 100ms delay before allowing click outside to close
    
    // Adjust menu position to center it below the button
    const adjustPosition = () => {
      if (profileMenuRef.current && profileButtonRef.current) {
        const menu = profileMenuRef.current;
        const button = profileButtonRef.current;
        const buttonRect = button.getBoundingClientRect();
        const menuRect = menu.getBoundingClientRect();
        const parentRect = button.parentElement.getBoundingClientRect();
        const windowWidth = window.innerWidth;
        const menuWidth = menuRect.width || 260; // fallback width
        
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
    
    // Add event listeners with delay to prevent immediate closure
    const timeoutId = setTimeout(() => {
      document.addEventListener('keydown', handleProfileMenuEscape);
      document.addEventListener('mousedown', handleProfileMenuClickOutside);
    }, 100);
    
    return () => {
      clearTimeout(timeoutId);
      if (profileMenuTimeoutRef.current) {
        clearTimeout(profileMenuTimeoutRef.current);
        profileMenuTimeoutRef.current = null;
      }
      document.removeEventListener('keydown', handleProfileMenuEscape);
      document.removeEventListener('mousedown', handleProfileMenuClickOutside);
    };
  }, [showProfileMenu, handleProfileMenuEscape, handleProfileMenuClickOutside]);

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
    <div 
      className="top-navigation"
      style={{ '--sidebar-width': `${sidebarWidth}px` }}
    >
      {/* Left Section - Menu Toggle Button (Fixed Position) */}
      {!isGameStudio && (
        <button 
          className="nav-menu-toggle"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (onToggleSidebar) {
              onToggleSidebar();
            }
          }}
          onMouseEnter={() => setIsMenuToggleHovered(true)}
          onMouseLeave={() => setIsMenuToggleHovered(false)}
          title="Toggle Sidebar"
        >
          {(() => {
            const isCollapsed = sidebarWidth === 0;
            if (isCollapsed && isMenuToggleHovered) {
              // Menu is closed, show "open" icon on hover
              return <ChevronRight size={18} />;
            } else if (!isCollapsed && isMenuToggleHovered) {
              // Menu is open, show "close" icon on hover (left arrow)
              return <ChevronLeft size={18} />;
            } else {
              // Default: show hamburger icon
              return <Menu size={18} />;
            }
          })()}
        </button>
      )}
      
      {/* Left Section - Home Button */}
      <div className="nav-left">
        <button 
          className="home-btn"
          onClick={() => handleNavigation('home')}
        >
        </button>
        
        {/* Main Navigation Links - Aligned with Content Area */}
        {!isGameStudio && (
          <div className={`nav-main-links ${isResizing ? 'resizing' : ''}`}>
            <button 
              className={`nav-item nav-item-with-text ${currentPage === 'store' ? 'active' : ''}`}
              onClick={() => handleNavigation('store')}
            >
              <Store size={18} />
              <span>Store</span>
            </button>
            
            <button 
              className={`nav-item nav-item-with-text ${currentPage === 'market' ? 'active' : ''}`}
              onClick={() => handleNavigation('market')}
            >
              <ShoppingCart size={18} />
              <span>Market</span>
            </button>
            
            <button 
              className={`nav-item nav-item-with-text ${currentPage === 'community' ? 'active' : ''}`}
              onClick={() => handleNavigation('community')}
            >
              <Globe size={18} />
              <span>Community</span>
            </button>
          </div>
        )}
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
            
            
            {/* Analytics Menu */}
            <div ref={analyticsWrapperRef} className="analytics-wrapper" style={{ position: 'relative' }}>
              <button 
                className={`nav-item nav-item-with-text ${openStudioMenu === 'analytics' ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowBalanceMenu(false);
                  setOpenStudioMenu(openStudioMenu === 'analytics' ? null : 'analytics');
                }}
              >
                <BarChart3 size={18} />
                <span>Analytics</span>
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
            
            <div ref={publishingWrapperRef} className="publishing-wrapper" style={{ position: 'relative' }}>
              <button 
                className={`nav-item nav-item-with-text ${openStudioMenu === 'publishing' ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowBalanceMenu(false);
                  setOpenStudioMenu(openStudioMenu === 'publishing' ? null : 'publishing');
                }}
              >
                <Upload size={18} />
                <span>Publishing</span>
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
            
            <div className="nav-separator" />
            
            {/* Content Menu */}
            <div ref={contentWrapperRef} className="content-wrapper" style={{ position: 'relative' }}>
              <button 
                className={`nav-item nav-item-with-text ${openStudioMenu === 'content' ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowBalanceMenu(false);
                  setOpenStudioMenu(openStudioMenu === 'content' ? null : 'content');
                }}
              >
                <Package size={18} />
                <span>Content</span>
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
            
            {/* Reports Menu */}
            <div ref={reportsWrapperRef} className="reports-wrapper" style={{ position: 'relative' }}>
              <button 
                className={`nav-item nav-item-with-text ${openStudioMenu === 'reports' ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowBalanceMenu(false);
                  setOpenStudioMenu(openStudioMenu === 'reports' ? null : 'reports');
                }}
              >
                <FileText size={18} />
                <span>Reports</span>
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
            
            <div className="nav-separator" />
            
            <button 
              className={`nav-item nav-item-with-text ${currentPage === 'settings' ? 'active' : ''}`}
              onClick={() => handleNavigation('settings')}
            >
              <Settings size={18} />
              <span>Settings</span>
            </button>
          </>
        ) : (
          /* Regular navigation - Right side items */
          <>
            
            {/* Notification Button */}
            {authUser && (
              <div 
                className="notification-wrapper" 
                style={{ position: 'relative' }}
              >
                <button
                  ref={notificationButtonRef}
                  className={`nav-item notification-button ${unreadCount > 0 ? 'has-notifications' : ''} ${showNotificationDropdown ? 'dropdown-open' : ''}`}
                  style={highestPriorityColor ? { '--notification-color': highestPriorityColor } : {}}
                  onClick={handleNotificationButtonClick}
                >
                  <Bell size={20} />
                  {unreadCount > 0 && (
                    <span className="notification-badge">{unreadCount}</span>
                  )}
                </button>

                {/* Notification Dropdown */}
                {showNotificationDropdown && (
                  <div
                    ref={notificationDropdownRef}
                    className="notification-dropdown"
                  >
                    <div className="notification-dropdown-header">
                      <div className="notification-dropdown-title">
                        <Bell size={18} />
                        <span>Notifications</span>
                        {unreadCount > 0 && (
                          <span className="notification-dropdown-badge">{unreadCount}</span>
                        )}
                      </div>
                      <div className="notification-dropdown-header-actions">
                        <button
                          className="notification-create-fake"
                          onClick={(e) => {
                            e.stopPropagation();
                            createFakeNotification();
                          }}
                          title="Create fake notification"
                        >
                          <Plus size={14} />
                        </button>
                        {unreadCount > 0 && (
                          <button
                            className="notification-mark-all-read"
                            onClick={(e) => {
                              e.stopPropagation();
                              markAllNotificationsAsRead();
                            }}
                            title="Mark all as read"
                          >
                            <Check size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="notification-dropdown-content">
                      {notifications.length === 0 ? (
                        <div className="notification-dropdown-empty">
                          <Bell size={32} />
                          <p>No notifications</p>
                        </div>
                      ) : (
                        <div className="notification-dropdown-list">
                          {notifications.map(notification => {
                            const IconComponent = getIconComponent(notification.iconType);
                            return (
                              <div
                                key={notification.id}
                                className={`notification-dropdown-item ${notification.read ? 'read' : 'unread'}`}
                                style={{ 
                                  '--notification-color': getNotificationColor(notification.type, notification.priority),
                                  ...(notification.read ? {} : { 
                                    background: getNotificationBackgroundColor(notification.type, notification.priority)
                                  })
                                }}
                                onMouseEnter={(e) => {
                                  if (!notification.read) {
                                    e.currentTarget.style.background = getNotificationBackgroundColor(notification.type, notification.priority, true);
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (!notification.read) {
                                    e.currentTarget.style.background = getNotificationBackgroundColor(notification.type, notification.priority, false);
                                  }
                                }}
                                onClick={() => {
                                  if (!notification.read) {
                                    markNotificationAsRead(notification.id);
                                  }
                                  setShowNotificationDropdown(false);
                                  // Navigate with notification ID as URL parameter
                                  const newPath = '/notifications?id=' + notification.id;
                                  window.history.pushState({ page: 'notifications' }, '', newPath);
                                  navigate(newPath);
                                }}
                              >
                                <div className="notification-dropdown-icon" style={{ '--notification-color': getNotificationColor(notification.type, notification.priority) }}>
                                  <IconComponent
                                    size={16}
                                    color={getNotificationColor(notification.type, notification.priority)}
                                  />
                                </div>
                                <div className="notification-dropdown-text">
                                  <div className="notification-dropdown-title-text">
                                    {notification.title}
                                  </div>
                                  <div className="notification-dropdown-message">
                                    {notification.message}
                                  </div>
                                  <div className="notification-dropdown-time">
                                    {notification.time}
                                  </div>
                                </div>
                                {!notification.read && (
                                  <div className="notification-dropdown-unread-indicator"></div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {notifications.length > 0 && (
                      <div className="notification-dropdown-footer">
                        <button
                          className="notification-dropdown-view-all"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowNotificationDropdown(false);
                            handleNavigation('notifications');
                          }}
                        >
                          View all notifications
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {/* Profile with Balance Inside */}
            {authUser ? (
              <div className="profile-with-balance-wrapper" style={{ position: 'relative' }}>
                <button 
                  ref={profileButtonRef}
                  className={`nav-item nav-item-profile ${showProfileMenu ? 'active' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowProfileMenu((v) => !v);
                  }}
                >
                  <div className="nav-profile-avatar">
                    {authUser?.avatar && !avatarError ? (
                      <img 
                        src={authUser.avatar} 
                        alt={userName}
                        onError={() => setAvatarError(true)}
                      />
                    ) : (
                      <span className="nav-profile-avatar-initials">
                        {getInitials(authUser)}
                      </span>
                    )}
                  </div>
                  <div className="nav-profile-info">
                    <span className="nav-user-name">{userName}</span>
                    <span className="nav-balance-inline">${userBalance.toFixed(2)}</span>
                  </div>
                </button>
                
                {/* Balance Menu */}
                {(showBalanceMenu || showCheckoutMenu) && (
                  <div ref={balanceMenuRef} className="balance-menu" style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '8px',
                    zIndex: 1001
                  }}>
                    <div className="balance-menu-tabs">
                      <button
                        className={`balance-tab ${balanceMenuTab === 'add-funds' ? 'active' : ''}`}
                        onClick={() => {
                          setBalanceMenuTab('add-funds');
                          setShowCheckoutMenu(false);
                        }}
                        title="Add Funds"
                      >
                        <Plus size={16} />
                        <span>Add Funds</span>
                      </button>
                      <button
                        className={`balance-tab ${balanceMenuTab === 'cart' ? 'active' : ''}`}
                        onClick={() => {
                          setBalanceMenuTab('cart');
                          setShowCheckoutMenu(false);
                        }}
                        title="Cart"
                      >
                        <ShoppingCart size={16} />
                        <span>Cart</span>
                        {cartItems.length > 0 && (
                          <span className="balance-tab-badge">{cartItems.length}</span>
                        )}
                      </button>
                    </div>
                    
                    {balanceMenuTab === 'add-funds' ? (
                      <>
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
                          <button 
                            className="cancel-btn" 
                            onClick={() => {
                              setShowBalanceMenu(false);
                              setShowCheckoutMenu(false);
                            }}
                            title="Cancel"
                          >
                            <X size={18} />
                          </button>
                          <button 
                            className="add-to-cart-btn" 
                            onClick={() => {
                              if (topUpAmount >= 5) {
                                // Add item to cart
                                const newItem = {
                                  id: Date.now(),
                                  amount: topUpAmount,
                                  timestamp: new Date().toISOString()
                                };
                                setCartItems(prev => [...prev, newItem]);
                                console.log('Added $' + topUpAmount + ' to cart');
                                // Reset amount after adding to cart
                                setTopUpAmount(0);
                              }
                            }}
                            disabled={topUpAmount < 5}
                            title="Add to Cart"
                          >
                            <Plus size={16} />
                            <ShoppingCart size={16} />
                            {cartItems.length > 0 && (
                              <span className="cart-badge">{cartItems.length}</span>
                            )}
                          </button>
                          <button 
                            className="checkout-btn" 
                            onClick={() => {
                              if (cartItems.length > 0) {
                                // Switch to cart tab
                                setBalanceMenuTab('cart');
                              }
                            }}
                            disabled={cartItems.length === 0}
                            title="Checkout"
                          >
                            <CreditCard size={18} />
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="balance-cart-section">
                        {cartItems.length > 0 ? (
                          <>
                            <div className="balance-cart-items-scrollable">
                              <h3>Items in Cart</h3>
                              {(() => {
                                // Group items by amount
                                const groupedItems = cartItems.reduce((acc, item) => {
                                  const key = item.amount.toFixed(2);
                                  if (!acc[key]) {
                                    acc[key] = { amount: item.amount, count: 0, ids: [] };
                                  }
                                  acc[key].count++;
                                  acc[key].ids.push(item.id);
                                  return acc;
                                }, {});
                                
                                return Object.values(groupedItems).map((group, index) => (
                                  <div key={index} className="balance-cart-item">
                                    <span className="balance-cart-item-amount">
                                      ${group.amount.toFixed(2)}
                                      {group.count > 1 && <span className="balance-cart-item-multiplier"> ×{group.count}</span>}
                                    </span>
                                    <button 
                                      className="balance-cart-item-remove"
                                      onClick={() => {
                                        setCartItems(prev => prev.filter(i => !group.ids.includes(i.id)));
                                      }}
                                      title="Remove"
                                    >
                                      <X size={14} />
                                    </button>
                                  </div>
                                ));
                              })()}
                            </div>
                            <div className="balance-cart-total">
                              <span>Total:</span>
                              <span className="balance-cart-total-amount">
                                ${cartItems.reduce((sum, item) => sum + item.amount, 0).toFixed(2)}
                              </span>
                            </div>
                            <div className="balance-cart-actions">
                              <button 
                                className="balance-cart-cancel-btn" 
                                onClick={() => {
                                  setBalanceMenuTab('add-funds');
                                }}
                                title="Back"
                              >
                                <X size={16} />
                              </button>
                              <button 
                                className="balance-cart-checkout-btn" 
                                onClick={async () => {
                                  if (cartItems.length > 0) {
                                    const total = cartItems.reduce((sum, item) => sum + item.amount, 0);
                                    console.log('Processing checkout for $' + total.toFixed(2));
                                    
                                    // Clear cart from database
                                    const userId = await getCurrentUserId();
                                    if (userId) {
                                      try {
                                        const api = window.electronAPI;
                                        if (api?.dbClearCart) {
                                          await api.dbClearCart(userId);
                                        }
                                      } catch (error) {
                                        console.error('Error clearing cart:', error);
                                      }
                                    }
                                    
                                    setCartItems([]);
                                    setShowBalanceMenu(false);
                                    setShowCheckoutMenu(false);
                                  }
                                }}
                                title="Complete Purchase"
                              >
                                <CreditCard size={16} />
                              </button>
                            </div>
                          </>
                        ) : (
                          <div className="balance-cart-empty">
                            <ShoppingCart size={32} />
                            <p>Your cart is empty</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                
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
                      width: '260px',
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
                        {availableUsers.length > 1 && (
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
                              <span className="profile-menu-quick-switch-count">{availableUsers.length}</span>
                              <RefreshCw size={36} className="profile-menu-quick-switch-icon" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="profile-menu-content">
                      {showQuickSwitchMenu && availableUsers.length > 1 && (
                        <div className="profile-menu-quick-switch-section">
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
                                      className="quick-switch-item"
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
                          <button 
                            className="quick-switch-manage-btn"
                            onClick={async () => { 
                              setShowProfileMenu(false);
                              setShowQuickSwitchMenu(false);
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
                      )}

                      <div className="profile-menu-items">
                        <button 
                          className="profile-menu-item"
                          onClick={() => { handleNavigation('library'); setShowProfileMenu(false); }}
                        >
                          <Package size={18} />
                          <span>Library</span>
                        </button>
                        
                        <button 
                          className="profile-menu-item"
                          onClick={() => { handleNavigation('friends'); setShowProfileMenu(false); }}
                        >
                          <Users size={18} />
                          <span>Friends</span>
                        </button>
                        
                        <button 
                          className="profile-menu-item"
                          onClick={() => { handleNavigation('notifications'); setShowProfileMenu(false); }}
                        >
                          <Bell size={18} />
                          <span>Notifications</span>
                        </button>
                        
                        <button 
                          className="profile-menu-item"
                          onClick={(e) => { 
                            e.stopPropagation();
                            setShowBalanceMenu(true);
                            setBalanceMenuTab('add-funds');
                            setShowProfileMenu(false);
                            setShowCheckoutMenu(false);
                          }}
                        >
                          <DollarSign size={18} />
                          <span>Add Funds</span>
                        </button>
                        
                        <button 
                          className="profile-menu-item"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowBalanceMenu(true);
                            setBalanceMenuTab('cart');
                            setShowProfileMenu(false);
                            setShowCheckoutMenu(false);
                          }}
                        >
                          <ShoppingCart size={18} />
                          <span>Cart</span>
                          {cartItems.length > 0 && (
                            <span className="profile-menu-cart-badge">{cartItems.length}</span>
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="profile-menu-bottom-actions">
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
