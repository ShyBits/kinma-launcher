import React, { useState, useEffect, useRef, useMemo } from 'react';
import { BrowserRouter, HashRouter, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import TitleBar from './components/TitleBar';
import TopNavigation from './components/TopNavigation';
import SideBar from './components/SideBar';
import Home from './pages/Home';
import Library from './pages/Library';
import GameStudio from './pages/GameStudio';
import StudioCalendar from './pages/StudioCalendar';
import StudioAnalytics from './pages/StudioAnalytics';
import StudioTeam from './pages/StudioTeam';
import Store from './pages/Store';
import Friends from './pages/Friends';
import Market from './pages/Market';
import Community from './pages/Community';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Notifications from './pages/Notifications';
import GameStudioSettings from './pages/GameStudioSettings';
import Game from './pages/Game';
import DeveloperOnboarding from './pages/DeveloperOnboarding';
import Auth from './pages/Auth';
import AccountSwitcherPage from './pages/AccountSwitcher';
import Admin from './pages/Admin';
import AdminWindow from './pages/AdminWindow';
import GamePromo from './pages/GamePromo';
import oauthExample from './config/oauth.config.example.js';
import './components/AccountSwitcher.css';

const AppContent = () => {
  const [currentPage, setCurrentPage] = useState('home');
  const [isGameInstalled, setIsGameInstalled] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateProgress, setUpdateProgress] = useState(0);
  const [selectedGame, setSelectedGame] = useState('the-finals');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    try {
      const saved = localStorage.getItem('sidebarWidth');
      return saved ? parseInt(saved, 10) : 260;
    } catch (_) {
      return 260;
    }
  });
  
  // Window width for responsive sidebar sizing
  const [windowWidth, setWindowWidth] = useState(() => {
    return typeof window !== 'undefined' ? window.innerWidth : 1120;
  });
  
  // Track if user has manually resized the sidebar
  const [hasManuallyResized, setHasManuallyResized] = useState(() => {
    try {
      return localStorage.getItem('sidebarManuallyResized') === 'true';
    } catch (_) {
      return false;
    }
  });
  
  // Calculate responsive sidebar width based on window size
  // Scales between 15-25% of window width, clamped between 200px and 400px
  const responsiveSidebarWidth = useMemo(() => {
    const minWidth = 200;
    const maxWidth = 400;
    // Scale from 15% (at 1120px) to 25% (at larger windows)
    const scaleFactor = Math.min(0.25, Math.max(0.15, 0.15 + (windowWidth - 1120) * 0.0001));
    const calculatedWidth = windowWidth * scaleFactor;
    return Math.max(minWidth, Math.min(maxWidth, calculatedWidth));
  }, [windowWidth]);
  
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef(null);
  const sidebarRef = useRef(null);
  
  // Track window size changes
  useEffect(() => {
    const updateWindowSize = () => {
      setWindowWidth(window.innerWidth);
    };
    
    updateWindowSize();
    window.addEventListener('resize', updateWindowSize);
    return () => {
      window.removeEventListener('resize', updateWindowSize);
    };
  }, []);
  
  // Auto-adjust sidebar width based on window size
  useEffect(() => {
    if (!isResizing && responsiveSidebarWidth) {
      setSidebarWidth(prevWidth => {
        // Fixed min/max values for better performance
        const minWidth = 200;
        const maxWidth = 400;
        
        // If user hasn't manually resized, adjust to responsive width instantly
        if (!hasManuallyResized) {
          const newWidth = responsiveSidebarWidth;
          if (Math.abs(prevWidth - newWidth) > 0.1) {
            // Update localStorage asynchronously to avoid blocking
            setTimeout(() => {
              try {
                localStorage.setItem('sidebarWidth', newWidth.toString());
              } catch (_) {}
            }, 0);
            return newWidth;
          }
        } else {
          // If manually resized, clamp to fixed max if it exceeds it instantly
          if (prevWidth > maxWidth) {
            const clampedWidth = maxWidth;
            // Update localStorage asynchronously to avoid blocking
            setTimeout(() => {
              try {
                localStorage.setItem('sidebarWidth', clampedWidth.toString());
              } catch (_) {}
            }, 0);
            return clampedWidth;
          }
        }
        return prevWidth;
      });
    }
  }, [windowWidth, responsiveSidebarWidth, isResizing, hasManuallyResized]);
  const [isAccountSwitching, setIsAccountSwitching] = useState(false);
  const [switchingToUser, setSwitchingToUser] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    checkGameStatus();
  }, []);

  // Load OAuth config into electron store once (so main can read it)
  useEffect(() => {
    try {
      const cfg = oauthExample; // if user created oauth.config.js, they can override at build-time
      if (window.electronAPI) {
        const store = (settings) => window.electronAPI.saveSettings && window.electronAPI.saveSettings({ ...settings, oauthConfig: cfg });
        store({});
      }
    } catch (_) {}
  }, []);

  // Redirect to developer onboarding if intent was set during auth
  // BUT ONLY on initial load, not when navigating between pages
  const hasCheckedDeveloperIntent = useRef(false);
  
  useEffect(() => {
    // Only check once on initial load, not on every navigation
    if (hasCheckedDeveloperIntent.current) {
      return;
    }
    
    // Don't redirect if we're on special routes
    // Check both pathname (for BrowserRouter) and hash (for HashRouter)
    const currentPath = location.pathname;
    const currentHash = location.hash || '';
    const hashPath = currentHash.replace('#', '');
    
    // Check if we're on special routes (pathname or hash)
    const isSpecialRoute = 
      currentPath === '/account-switcher' || 
      currentPath === '/auth' || 
      currentPath === '/admin-window' ||
      currentPath === '/developer-onboarding' ||
      currentPath.startsWith('/account-switcher') ||
      currentPath.startsWith('/auth') ||
      currentPath.startsWith('/admin-window') ||
      currentPath.startsWith('/developer-onboarding') ||
      hashPath === '/account-switcher' ||
      hashPath === '/auth' ||
      hashPath === '/admin-window' ||
      hashPath === '/developer-onboarding' ||
      hashPath.startsWith('/account-switcher') ||
      hashPath.startsWith('/auth') ||
      hashPath.startsWith('/admin-window') ||
      hashPath.startsWith('/developer-onboarding');
    
    if (isSpecialRoute) {
      hasCheckedDeveloperIntent.current = true;
      return; // Don't redirect if already on special routes
    }
    
    // Also check if addAccount parameter is present (don't redirect if adding account)
    try {
      const hashParams = currentHash.includes('?') ? currentHash.split('?')[1] : '';
      const searchParams = location.search || '';
      const urlParams = hashParams 
        ? new URLSearchParams(hashParams)
        : new URLSearchParams(searchParams);
      if (urlParams.get('addAccount') === 'true') {
        hasCheckedDeveloperIntent.current = true;
        return; // Don't redirect if adding account
      }
    } catch (_) {}
    
    try {
      // Check user-specific developer intent
      const { getUserData, getCurrentUserId } = require('./utils/UserDataManager');
      const userId = getCurrentUserId();
      if (userId) {
        const intent = getUserData('developerIntent', 'none', userId);
        // Only redirect if intent is pending AND we're not already on developer-onboarding
        if (intent === 'pending' && currentPath !== '/developer-onboarding' && hashPath !== '/developer-onboarding') {
          navigate('/developer-onboarding');
        }
      } else {
        // Fallback to localStorage for backward compatibility
        const intent = localStorage.getItem('developerIntent');
        // Only redirect if intent is pending AND we're not already on developer-onboarding
        if (intent === 'pending' && currentPath !== '/developer-onboarding' && hashPath !== '/developer-onboarding') {
          navigate('/developer-onboarding');
        }
      }
    } catch (_) {}
    
    // Mark as checked so we don't check again on navigation
    hasCheckedDeveloperIntent.current = true;
  }, [navigate, location.pathname, location.hash]);

  const checkGameStatus = () => {
    setIsGameInstalled(true);
  };

  const handlePlayGame = () => {
    console.log('Playing Pathline...');
  };

  const handleUpdateGame = () => {
    setIsUpdating(true);
    setUpdateProgress(0);
    
    const interval = setInterval(() => {
      setUpdateProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsUpdating(false);
          return 100;
        }
        return prev + 2;
      });
    }, 100);
  };

  const getCurrentPage = () => {
    // Handle both BrowserRouter (pathname) and HashRouter (hash)
    const path = location.pathname !== '/' ? location.pathname : (location.hash || '#/').replace('#', '');
    
    // Check for market routes (including game-specific marketplaces)
    if (path === '/market' || path.startsWith('/market/') || (path.startsWith('/game/') && path.includes('/market'))) {
      return 'market';
    }
    
    switch (path) {
      case '/':
        return 'home';
      case '/store':
        return 'store';
      case '/friends':
        return 'friends';
      case '/community':
        return 'community';
      case '/profile':
        return 'profile';
      case '/settings':
        return 'settings';
      case '/game-studio/calendar':
        return 'calendar';
      default:
        return 'home';
    }
  };

  const currentPageId = getCurrentPage();

  // In main app window we assume auth completed (main window is opened after auth).

  const handleGameSelect = (gameId) => {
    setSelectedGame(gameId);
  };

  const toggleSidebar = () => {
    console.log('Toggling sidebar. Current state:', sidebarCollapsed);
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const handleResizeStart = (e) => {
    setIsResizing(true);
    e.preventDefault();
    e.stopPropagation();
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleResize = (e) => {
      e.preventDefault();
      const newWidth = e.clientX;
      // Fixed min/max values for better performance
      const minWidth = 200;
      const maxWidth = 400;
      
      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setSidebarWidth(newWidth);
        // Dispatch event so other components can update immediately
        window.dispatchEvent(new CustomEvent('sidebar-resize', { detail: { width: newWidth } }));
      }
    };

    const handleResizeEnd = () => {
      setIsResizing(false);
      // Mark as manually resized and save to localStorage
      setHasManuallyResized(true);
      // Use functional update to get the latest width
      setSidebarWidth(currentWidth => {
        try {
          localStorage.setItem('sidebarWidth', currentWidth.toString());
          localStorage.setItem('sidebarManuallyResized', 'true');
          // Dispatch event after saving to localStorage
          window.dispatchEvent(new CustomEvent('sidebar-resize', { detail: { width: currentWidth } }));
        } catch (_) {}
        return currentWidth;
      });
    };

    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', handleResizeEnd);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleResize);
      document.removeEventListener('mouseup', handleResizeEnd);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, sidebarWidth]);

  // Listen for account switching events
  useEffect(() => {
    const handleAccountSwitchStart = (event) => {
      const user = event.detail?.user;
      if (user) {
        setSwitchingToUser(user);
        setIsAccountSwitching(true);
      }
    };

    const handleAccountSwitchComplete = () => {
      setIsAccountSwitching(false);
      setSwitchingToUser(null);
      // Dispatch user-changed event to reload user-specific data
      window.dispatchEvent(new Event('user-changed'));
    };

    window.addEventListener('main-window-account-switch-start', handleAccountSwitchStart);
    window.addEventListener('main-window-account-switch-complete', handleAccountSwitchComplete);

    return () => {
      window.removeEventListener('main-window-account-switch-start', handleAccountSwitchStart);
      window.removeEventListener('main-window-account-switch-complete', handleAccountSwitchComplete);
    };
  }, []);

  // Helper function to get user initials
  const getInitials = (user) => {
    const name = user.name || user.username || user.email || 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="app">
      {isAccountSwitching ? (
        <div className="account-switcher-loading-screen">
          <div className="account-switcher-loading-circle">
            {switchingToUser && (
              <div className="account-switcher-loading-circle-content">
                <div className="account-switcher-loading-circle-content-inner">
                  <div className="account-switcher-loading-avatar">
                    {getInitials(switchingToUser)}
                  </div>
                  <h2 className="account-switcher-loading-name">
                    {switchingToUser.name || switchingToUser.username || switchingToUser.email?.split('@')[0] || 'User'}
                  </h2>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          <TitleBar onToggleSidebar={toggleSidebar} navigate={navigate} />
          {(location.pathname !== '/auth' && location.hash !== '#/auth' && location.pathname !== '/account-switcher' && location.hash !== '#/account-switcher' && location.pathname !== '/admin-window' && location.hash !== '#/admin-window' && !location.pathname.includes('/market/compare') && !location.hash.includes('/market/compare')) && (
        <TopNavigation 
          currentPage={currentPageId}
          setCurrentPage={setCurrentPage}
          navigate={navigate}
          selectedGame={selectedGame}
          isGameInstalled={isGameInstalled}
          isUpdating={isUpdating}
          updateProgress={updateProgress}
          onPlayGame={handlePlayGame}
          onUpdateGame={handleUpdateGame}
          onToggleSidebar={toggleSidebar}
          location={location}
          sidebarWidth={sidebarCollapsed ? 0 : sidebarWidth}
          isResizing={isResizing}
        />
      )}
      <div className="app-layout">
        {(location.pathname !== '/auth' && location.hash !== '#/auth' && location.pathname !== '/account-switcher' && location.hash !== '#/account-switcher' && location.pathname !== '/game-studio' && location.hash !== '#/game-studio' && location.pathname !== '/game-studio/calendar' && location.hash !== '#/game-studio/calendar' && location.pathname !== '/game-studio/analytics' && location.hash !== '#/game-studio/analytics' && location.pathname !== '/game-studio/team' && location.hash !== '#/game-studio/team' && location.pathname !== '/game-studio-settings' && location.hash !== '#/game-studio-settings' && location.pathname !== '/admin-window' && location.hash !== '#/admin-window' && !location.pathname.includes('/market/compare') && !location.hash.includes('/market/compare')) && (
          <>
            <SideBar 
              ref={sidebarRef}
              currentGame={selectedGame}
              onGameSelect={handleGameSelect}
              navigate={navigate}
              isCollapsed={sidebarCollapsed}
              width={sidebarCollapsed ? 0 : sidebarWidth}
              isResizing={isResizing}
            />
            <div 
              ref={resizeRef}
              className={`sidebar-resizer ${isResizing ? 'resizing' : ''}`}
              onMouseDown={handleResizeStart}
              style={{ display: sidebarCollapsed ? 'none' : 'block' }}
            />
          </>
        )}
        <div className="app-content-wrapper" style={{ width: ((location.pathname === '/game-studio' || location.hash === '#/game-studio') || (location.pathname === '/game-studio/calendar' || location.hash === '#/game-studio/calendar') || (location.pathname === '/game-studio/analytics' || location.hash === '#/game-studio/analytics') || (location.pathname === '/game-studio/team' || location.hash === '#/game-studio/team') || (location.pathname === '/game-studio-settings' || location.hash === '#/game-studio-settings') || (location.pathname === '/auth' || location.hash === '#/auth') || (location.pathname === '/account-switcher' || location.hash === '#/account-switcher') || (location.pathname === '/admin-window' || location.hash === '#/admin-window')) ? '100%' : 'auto' }}>
          <div className="main-content">
            <Routes>
              <Route path="/" element={<Navigate to="/library" replace />} />
              <Route path="/auth" element={<Auth navigate={navigate} />} />
              <Route path="/account-switcher" element={<AccountSwitcherPage navigate={navigate} />} />
              <Route path="/library" element={<Library />} />
              <Route path="/game-studio" element={<GameStudio navigate={navigate} />} />
              <Route path="/game-studio/calendar" element={<StudioCalendar navigate={navigate} />} />
              <Route path="/game-studio/analytics" element={<StudioAnalytics navigate={navigate} />} />
              <Route path="/game-studio/team" element={<StudioTeam navigate={navigate} />} />
              <Route path="/store" element={<Store navigate={navigate} gamesData={{}} sidebarWidth={sidebarCollapsed ? 0 : sidebarWidth} />} />
              <Route path="/store/game/:gameId" element={<GamePromo gamesData={{}} />} />
              <Route path="/friends" element={<Friends />} />
              <Route path="/market" element={<Market />} />
              <Route path="/market/compare" element={<Market />} />
              <Route path="/game/:gameId/market" element={<Market />} />
              <Route path="/game/:gameId/market/compare" element={<Market />} />
              <Route path="/community" element={<Community />} />
              <Route path="/game/:gameId/community" element={<Community />} />
              <Route path="/profile" element={<Profile navigate={navigate} />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/developer-onboarding" element={<DeveloperOnboarding navigate={navigate} />} />
              <Route path="/game-studio-settings" element={<GameStudioSettings />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/admin-window" element={<AdminWindow />} />
              <Route path="/game/:gameId" element={<Game />} />
            </Routes>
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  );
};

const App = () => {
  // Use HashRouter for production (file:// protocol) and BrowserRouter for dev (http:// protocol)
  const isDev = !window.location.protocol.startsWith('file');
  const Router = isDev ? BrowserRouter : HashRouter;
  
  return (
    <Router>
      <AppContent />
    </Router>
  );
};

export default App;

