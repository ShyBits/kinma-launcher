import React, { useState, useEffect } from 'react';
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
import oauthExample from './config/oauth.config.example.js';

const AppContent = () => {
  const [currentPage, setCurrentPage] = useState('home');
  const [isGameInstalled, setIsGameInstalled] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateProgress, setUpdateProgress] = useState(0);
  const [selectedGame, setSelectedGame] = useState('the-finals');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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

  return (
    <div className="app">
      <TitleBar onToggleSidebar={toggleSidebar} />
      {location.pathname !== '/auth' && (
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
        {location.pathname !== '/auth' && location.pathname !== '/game-studio' && location.pathname !== '/game-studio-settings' && (
          <SideBar 
            currentGame={selectedGame}
            onGameSelect={handleGameSelect}
            navigate={navigate}
            isCollapsed={sidebarCollapsed}
          />
        )}
        <div className="app-content-wrapper" style={{ width: (location.pathname === '/game-studio' || location.pathname === '/game-studio-settings' || location.pathname === '/auth') ? '100%' : 'auto' }}>
          <div className="main-content">
            <Routes>
              <Route path="/" element={<Navigate to="/library" replace />} />
              <Route path="/auth" element={<Auth navigate={navigate} />} />
              <Route path="/library" element={<Library />} />
              <Route path="/game-studio" element={<GameStudio navigate={navigate} />} />
              <Route path="/store" element={<Store navigate={navigate} gamesData={{}} />} />
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

