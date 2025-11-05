import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import TitleBar from './components/TitleBar';
import TopNavigation from './components/TopNavigation';
import SideBar from './components/SideBar';
import Home from './pages/Home';
import Library from './pages/Library';
import GameStudio from './pages/GameStudio';
import Store from './pages/Store';
import Friends from './pages/Friends';
import Market from './pages/Market';
import Community from './pages/Community';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import GameStudioSettings from './pages/GameStudioSettings';
import Game from './pages/Game';
import DeveloperOnboarding from './pages/DeveloperOnboarding';
import Auth from './pages/Auth';
import AccountSwitcherPage from './pages/AccountSwitcher';
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
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef(null);
  const sidebarRef = useRef(null);
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
  useEffect(() => {
    try {
      const intent = localStorage.getItem('developerIntent');
      if (intent === 'pending') {
        navigate('/developer-onboarding');
      }
    } catch (_) {}
  }, []);

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
    const path = location.pathname;
    switch (path) {
      case '/':
        return 'home';
      case '/store':
        return 'store';
      case '/friends':
        return 'friends';
      case '/market':
        return 'market';
      case '/community':
        return 'community';
      case '/profile':
        return 'profile';
      case '/settings':
        return 'settings';
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
      const minWidth = 200;
      const maxWidth = 600;
      
      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setSidebarWidth(newWidth);
      }
    };

    const handleResizeEnd = () => {
      setIsResizing(false);
      // Save to localStorage only at the end
      try {
        localStorage.setItem('sidebarWidth', sidebarWidth.toString());
      } catch (_) {}
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
          <TitleBar onToggleSidebar={toggleSidebar} />
          {location.pathname !== '/auth' && location.pathname !== '/account-switcher' && (
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
        />
      )}
      <div className="app-layout">
        {location.pathname !== '/auth' && location.pathname !== '/account-switcher' && location.pathname !== '/game-studio' && location.pathname !== '/game-studio-settings' && (
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
        <div className="app-content-wrapper" style={{ width: (location.pathname === '/game-studio' || location.pathname === '/game-studio-settings' || location.pathname === '/auth' || location.pathname === '/account-switcher') ? '100%' : 'auto' }}>
          <div className="main-content">
            <Routes>
              <Route path="/" element={<Navigate to="/library" replace />} />
              <Route path="/auth" element={<Auth navigate={navigate} />} />
              <Route path="/account-switcher" element={<AccountSwitcherPage navigate={navigate} />} />
              <Route path="/library" element={<Library />} />
              <Route path="/game-studio" element={<GameStudio navigate={navigate} />} />
              <Route path="/store" element={<Store navigate={navigate} gamesData={{}} />} />
              <Route path="/store/game/:gameId" element={<GamePromo gamesData={{}} />} />
              <Route path="/friends" element={<Friends />} />
              <Route path="/market" element={<Market />} />
              <Route path="/game/:gameId/market" element={<Market />} />
              <Route path="/community" element={<Community />} />
              <Route path="/game/:gameId/community" element={<Community />} />
              <Route path="/profile" element={<Profile navigate={navigate} />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/developer-onboarding" element={<DeveloperOnboarding navigate={navigate} />} />
              <Route path="/game-studio-settings" element={<GameStudioSettings />} />
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
  return (
    <Router>
      <AppContent />
    </Router>
  );
};

export default App;

