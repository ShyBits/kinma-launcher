import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Minus, Maximize, X, Menu, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import KinmaLogo from './KinmaLogo';
import './TitleBar.css';

const TitleBar = ({ onToggleSidebar, navigate }) => {
  const location = useLocation();
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null);
  const [isDeveloper, setIsDeveloper] = useState(false);

  // Check if user is a developer
  useEffect(() => {
    const checkDeveloperStatus = () => {
      try {
        const developerIntent = localStorage.getItem('developerIntent');
        const isDev = developerIntent === 'complete' || developerIntent === 'pending';
        setIsDeveloper(isDev);
      } catch (_) {
        setIsDeveloper(false);
      }
    };

    checkDeveloperStatus();
    
    // Listen for user changes
    const handleUserChanged = () => {
      checkDeveloperStatus();
    };
    
    window.addEventListener('user-changed', handleUserChanged);
    return () => {
      window.removeEventListener('user-changed', handleUserChanged);
    };
  }, []);

  useEffect(() => {
    // Simple approach: enable back button whenever there's history
    const updateButtonStates = () => {
      // Check if we can go back (history has more than current page)
      const hasHistory = window.history.length > 1;
      setCanGoBack(hasHistory);
      
      // Forward is typically not available unless we've gone back
      // We'll disable it for simplicity in SPA context
      setCanGoForward(false);
    };

    // Listen for popstate to update button states
    const handlePopState = () => {
      updateButtonStates();
    };

    // Track navigation pushes
    const originalPushState = window.history.pushState.bind(window.history);
    window.history.pushState = function(...args) {
      originalPushState(...args);
      updateButtonStates();
    };

    const originalReplaceState = window.history.replaceState.bind(window.history);
    window.history.replaceState = function(...args) {
      originalReplaceState(...args);
      updateButtonStates();
    };

    window.addEventListener('popstate', handlePopState);
    
    // Initial state
    updateButtonStates();

    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (originalPushState) {
        window.history.pushState = originalPushState;
      }
      if (originalReplaceState) {
        window.history.replaceState = originalReplaceState;
      }
    };
  }, []);

  const minimizeWindow = () => {
    if (window.electronAPI && window.electronAPI.minimizeWindow) {
      window.electronAPI.minimizeWindow();
    }
  };

  const maximizeWindow = () => {
    if (window.electronAPI && window.electronAPI.maximizeWindow) {
      window.electronAPI.maximizeWindow();
    }
  };

  const closeWindow = () => {
    if (window.electronAPI && window.electronAPI.closeWindow) {
      window.electronAPI.closeWindow();
    }
  };

  const handleGoBack = () => {
    if (canGoBack) {
      window.history.back();
    }
  };

  const handleGoForward = () => {
    if (canGoForward) {
      window.history.forward();
    }
  };

  // Hide hamburger menu in Game Studio views; hide all left buttons on auth page and account switcher
  const isGameStudio = location.pathname === '/game-studio' || location.pathname === '/game-studio-settings';
  const isAuth = location.pathname === '/auth';
  const isAccountSwitcher = location.pathname === '/account-switcher';

  // Close menus when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (activeMenu && !event.target.closest('.title-bar-menu-wrapper')) {
        setActiveMenu(null);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape' && activeMenu) {
        setActiveMenu(null);
      }
    };

    if (activeMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [activeMenu]);

  const handleMenuClick = (menuName) => {
    setActiveMenu(activeMenu === menuName ? null : menuName);
  };

  const handleMenuItemClick = (action) => {
    setActiveMenu(null);
    if (action) {
      action();
    }
  };

  return (
    <div className="title-bar">
      <div className="title-bar-content">
        <div className="title-bar-left">
          {!isAuth && !isAccountSwitcher && (
            <>
              <div className="title-bar-logo-wrapper">
                <div className="title-bar-logo">
                  <KinmaLogo />
                </div>
                <span className="title-bar-logo-text">KINMA</span>
              </div>
              {!isGameStudio && (
                <>
                  {/* Library Menu */}
                  <div className="title-bar-menu-wrapper">
                    <button 
                      className={`title-bar-menu-button ${activeMenu === 'library' ? 'active' : ''}`}
                      onClick={() => handleMenuClick('library')}
                    >
                      Library
                    </button>
                    {activeMenu === 'library' && (
                      <div className="title-bar-menu-dropdown">
                        <div className="title-bar-menu-item" onClick={() => handleMenuItemClick(() => navigate('/library'))}>
                          My Games
                        </div>
                        {isDeveloper && (
                          <>
                            <div className="title-bar-menu-divider"></div>
                            <div className="title-bar-menu-item" onClick={() => handleMenuItemClick(() => navigate('/game-studio'))}>
                              Create Game
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Browse Menu */}
                  <div className="title-bar-menu-wrapper">
                    <button 
                      className={`title-bar-menu-button ${activeMenu === 'browse' ? 'active' : ''}`}
                      onClick={() => handleMenuClick('browse')}
                    >
                      Browse
                    </button>
                    {activeMenu === 'browse' && (
                      <div className="title-bar-menu-dropdown">
                        <div className="title-bar-menu-item" onClick={() => handleMenuItemClick(() => navigate('/store'))}>
                          Store
                        </div>
                        <div className="title-bar-menu-item" onClick={() => handleMenuItemClick(() => navigate('/market'))}>
                          Market
                        </div>
                        <div className="title-bar-menu-item" onClick={() => handleMenuItemClick(() => navigate('/community'))}>
                          Community
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Account Menu */}
                  <div className="title-bar-menu-wrapper">
                    <button 
                      className={`title-bar-menu-button ${activeMenu === 'account' ? 'active' : ''}`}
                      onClick={() => handleMenuClick('account')}
                    >
                      Account
                    </button>
                    {activeMenu === 'account' && (
                      <div className="title-bar-menu-dropdown">
                        <div className="title-bar-menu-item" onClick={() => handleMenuItemClick(() => navigate('/profile'))}>
                          Profile
                        </div>
                        <div className="title-bar-menu-item" onClick={() => handleMenuItemClick(() => navigate('/friends'))}>
                          Friends
                        </div>
                        <div className="title-bar-menu-item" onClick={() => handleMenuItemClick(() => navigate('/notifications'))}>
                          Notifications
                        </div>
                        <div className="title-bar-menu-divider"></div>
                        <div className="title-bar-menu-item" onClick={() => handleMenuItemClick(() => navigate('/account-switcher'))}>
                          Switch Account
                        </div>
                        <div className="title-bar-menu-item" onClick={() => handleMenuItemClick(() => navigate('/settings'))}>
                          Settings
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Studio Menu - Only for developers */}
                  {isDeveloper && (
                    <div className="title-bar-menu-wrapper">
                      <button 
                        className={`title-bar-menu-button ${activeMenu === 'studio' ? 'active' : ''}`}
                        onClick={() => handleMenuClick('studio')}
                      >
                        Studio
                      </button>
                      {activeMenu === 'studio' && (
                        <div className="title-bar-menu-dropdown">
                          <div className="title-bar-menu-item" onClick={() => handleMenuItemClick(() => navigate('/game-studio'))}>
                            Game Studio
                          </div>
                          <div className="title-bar-menu-item" onClick={() => handleMenuItemClick(() => navigate('/game-studio-settings'))}>
                            Studio Settings
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Separator between menus and navigation arrows */}
                  <div className="title-bar-separator"></div>

                  <button 
                    className={`title-bar-button nav-arrow ${!canGoBack ? 'disabled' : ''}`}
                    onClick={handleGoBack}
                    disabled={!canGoBack}
                    title="Back"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button 
                    className={`title-bar-button nav-arrow ${!canGoForward ? 'disabled' : ''}`}
                    onClick={handleGoForward}
                    disabled={!canGoForward}
                    title="Forward"
                  >
                    <ChevronRight size={14} />
                  </button>
                </>
              )}
            </>
          )}
        </div>
        <div className="title-bar-right">
          <button className="title-bar-button minimize" onClick={minimizeWindow}>
            <Minus size={14} />
          </button>
          {!isAccountSwitcher && !isAuth && (
            <button className="title-bar-button maximize" onClick={maximizeWindow}>
              <Maximize size={14} />
            </button>
          )}
          <button className="title-bar-button close" onClick={closeWindow}>
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default TitleBar;