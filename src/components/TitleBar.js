import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Minus, Maximize, X, Menu, ChevronLeft, ChevronRight, ChevronDown, Plus, Layout, ExternalLink } from 'lucide-react';
import KinmaLogo from './KinmaLogo';
import { getUserData, getCurrentUserId, saveUserData } from '../utils/UserDataManager';
import './TitleBar.css';

const TitleBar = ({ onToggleSidebar, navigate }) => {
  const location = useLocation();
  const navigateRouter = useNavigate();
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null);
  const [isDeveloper, setIsDeveloper] = useState(false);
  const [gameStudioEnabled, setGameStudioEnabled] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [windowNumber, setWindowNumber] = useState(1);
  const [totalWindowCount, setTotalWindowCount] = useState(1);
  const titleBarMenuJustOpenedRef = useRef(false);
  const titleBarMenuTimeoutRef = useRef(null);
  
  // Navigation history tracking
  const historyStackRef = useRef([]);
  const historyIndexRef = useRef(-1);
  const isNavigatingRef = useRef(false);

  // Check if user is a developer (has developer access or game studio access)
  useEffect(() => {
    const checkDeveloperStatus = () => {
      try {
        const userId = getCurrentUserId();
        if (userId) {
          // Check user-specific developer access
          const hasDeveloperAccess = getUserData('developerAccess', false, userId);
          const hasGameStudioAccess = getUserData('gameStudioAccess', false, userId);
          const accessStatus = getUserData('developerAccessStatus', null, userId);
          
          // User has developer access only if explicitly granted (not pending)
          const isDev = (hasDeveloperAccess || hasGameStudioAccess) && accessStatus !== 'pending';
          setIsDeveloper(isDev);
          setGameStudioEnabled(isDev);
        } else {
          // Fallback to localStorage for backward compatibility
          const developerIntent = localStorage.getItem('developerIntent');
          const isDev = developerIntent === 'complete' || developerIntent === 'pending';
          setIsDeveloper(isDev);
        }
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

  // Initialize history stack on mount
  useEffect(() => {
    const currentPath = location.pathname + location.search + location.hash;
    if (historyStackRef.current.length === 0) {
      historyStackRef.current = [currentPath];
      historyIndexRef.current = 0;
      setCanGoBack(false);
      setCanGoForward(false);
    }
  }, []); // Only run on mount

  // Track navigation history
  useEffect(() => {
    const currentPath = location.pathname + location.search + location.hash;
    const historyStack = historyStackRef.current;
    const currentIndex = historyIndexRef.current;
    
    // Initialize if empty (shouldn't happen, but safety check)
    if (historyStack.length === 0) {
      historyStack.push(currentPath);
      historyIndexRef.current = 0;
      setCanGoBack(false);
      setCanGoForward(false);
      return;
    }
    
    // Skip if we're currently navigating programmatically
    if (isNavigatingRef.current) {
      isNavigatingRef.current = false;
      return;
    }
    
    // Check if this is a new navigation (not back/forward)
    const isNewNavigation = currentIndex === -1 || 
                            currentIndex === historyStack.length - 1 ||
                            historyStack[currentIndex] !== currentPath;
    
    if (isNewNavigation) {
      // Remove any forward history if we're navigating to a new page
      // (browser behavior: when you go back and then navigate to a new page, forward history is cleared)
      if (currentIndex < historyStack.length - 1) {
        historyStack.splice(currentIndex + 1);
      }
      
      // Add new path to history
      historyStack.push(currentPath);
      historyIndexRef.current = historyStack.length - 1;
    } else {
      // This is a back/forward navigation - find the index
      const foundIndex = historyStack.findIndex(path => path === currentPath);
      if (foundIndex !== -1 && foundIndex !== currentIndex) {
        historyIndexRef.current = foundIndex;
      }
    }
    
    // Update button states
    setCanGoBack(historyIndexRef.current > 0);
    setCanGoForward(historyIndexRef.current < historyStack.length - 1);
  }, [location]);

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

  const zoomIn = () => {
    const newZoom = Math.min(zoomLevel + 10, 200);
    setZoomLevel(newZoom);
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
      mainContent.style.zoom = `${newZoom}%`;
    }
  };

  const zoomOut = () => {
    const newZoom = Math.max(zoomLevel - 10, 50);
    setZoomLevel(newZoom);
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
      mainContent.style.zoom = `${newZoom}%`;
    }
  };

  // Initialize zoom level on mount
  useEffect(() => {
    const savedZoom = localStorage.getItem('zoomLevel');
    if (savedZoom) {
      const zoom = parseInt(savedZoom, 10);
      setZoomLevel(zoom);
      const mainContent = document.querySelector('.main-content');
      if (mainContent) {
        mainContent.style.zoom = `${zoom}%`;
      }
    }
  }, []);

  // Save zoom level when it changes
  useEffect(() => {
    localStorage.setItem('zoomLevel', zoomLevel.toString());
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
      mainContent.style.zoom = `${zoomLevel}%`;
    }
  }, [zoomLevel]);

  // Track window number and total count
  useEffect(() => {
    const updateWindowInfo = async () => {
      try {
        if (window.electronAPI?.getWindowNumber) {
          const number = await window.electronAPI.getWindowNumber();
          console.log('🔲 Window number updated:', number);
          if (number) {
            setWindowNumber(number);
          }
        }
        if (window.electronAPI?.getTotalWindowCount) {
          const count = await window.electronAPI.getTotalWindowCount();
          console.log('🔲 Total window count updated:', count);
          if (count !== null && count !== undefined) {
            setTotalWindowCount(count);
          }
        }
      } catch (error) {
        console.error('Error getting window info:', error);
      }
    };

    // Initial info
    updateWindowInfo();

    // Listen for window number changes
    const handleWindowNumberChanged = (number) => {
      console.log('🔲 Window number changed event:', number);
      if (number) {
        setWindowNumber(number);
      }
    };

    // Listen for total window count changes
    const handleTotalWindowCountChanged = (count) => {
      console.log('🔲 Total window count changed event:', count);
      if (count !== null && count !== undefined) {
        setTotalWindowCount(count);
      }
    };

    if (window.electronAPI?.onWindowNumberChanged) {
      window.electronAPI.onWindowNumberChanged(handleWindowNumberChanged);
    }
    if (window.electronAPI?.onTotalWindowCountChanged) {
      window.electronAPI.onTotalWindowCountChanged(handleTotalWindowCountChanged);
    }

    // Poll for changes (fallback) - more frequent polling
    const interval = setInterval(updateWindowInfo, 500);

    return () => {
      clearInterval(interval);
      if (window.electronAPI?.removeWindowNumberListener) {
        window.electronAPI.removeWindowNumberListener();
      }
      if (window.electronAPI?.removeTotalWindowCountListener) {
        window.electronAPI.removeTotalWindowCountListener();
      }
    };
  }, []);

  const handleGoBack = () => {
    const historyStack = historyStackRef.current;
    const currentIndex = historyIndexRef.current;
    
    if (currentIndex > 0) {
      const targetIndex = currentIndex - 1;
      const targetPath = historyStack[targetIndex];
      
      if (targetPath) {
        isNavigatingRef.current = true;
        historyIndexRef.current = targetIndex;
        navigateRouter(targetPath);
      }
    }
  };

  const handleGoForward = () => {
    const historyStack = historyStackRef.current;
    const currentIndex = historyIndexRef.current;
    
    if (currentIndex < historyStack.length - 1) {
      const targetIndex = currentIndex + 1;
      const targetPath = historyStack[targetIndex];
      
      if (targetPath) {
        isNavigatingRef.current = true;
        historyIndexRef.current = targetIndex;
        navigateRouter(targetPath);
      }
    }
  };

  // Hide hamburger menu in Game Studio views; hide all left buttons on auth page and account switcher
  const isGameStudio = location.pathname === '/game-studio' || location.pathname === '/game-studio-settings' || location.pathname === '/game-studio/calendar' || location.pathname === '/game-studio/analytics' || location.pathname === '/game-studio/team';
  const isAuth = location.pathname === '/auth';
  const isAccountSwitcher = location.pathname === '/account-switcher';

  // Memoized handlers for title bar menus
  const handleTitleBarMenuEscape = useCallback((event) => {
    if (event.key === 'Escape' && activeMenu) {
      setActiveMenu(null);
    }
  }, [activeMenu]);

  const handleTitleBarMenuClickOutside = useCallback((event) => {
    // Don't close if menu was just opened (prevent immediate closure)
    if (titleBarMenuJustOpenedRef.current) {
      return;
    }
    
    if (activeMenu && !event.target.closest('.title-bar-menu-wrapper')) {
      setActiveMenu(null);
    }
  }, [activeMenu]);

  // Close menus when clicking outside or pressing Escape
  useEffect(() => {
    if (!activeMenu) {
      titleBarMenuJustOpenedRef.current = false;
      if (titleBarMenuTimeoutRef.current) {
        clearTimeout(titleBarMenuTimeoutRef.current);
        titleBarMenuTimeoutRef.current = null;
      }
      return;
    }

    // Mark menu as just opened and set flag to prevent immediate closure
    titleBarMenuJustOpenedRef.current = true;
    if (titleBarMenuTimeoutRef.current) {
      clearTimeout(titleBarMenuTimeoutRef.current);
    }
    titleBarMenuTimeoutRef.current = setTimeout(() => {
      titleBarMenuJustOpenedRef.current = false;
    }, 100); // 100ms delay before allowing click outside to close

    // Add event listeners with delay to prevent immediate closure
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleTitleBarMenuClickOutside);
      document.addEventListener('keydown', handleTitleBarMenuEscape);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      if (titleBarMenuTimeoutRef.current) {
        clearTimeout(titleBarMenuTimeoutRef.current);
        titleBarMenuTimeoutRef.current = null;
      }
      document.removeEventListener('mousedown', handleTitleBarMenuClickOutside);
      document.removeEventListener('keydown', handleTitleBarMenuEscape);
    };
  }, [activeMenu, handleTitleBarMenuEscape, handleTitleBarMenuClickOutside]);

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
                {isGameStudio && <span className="title-bar-logo-text-studio">STUDIO</span>}
              </div>
              {gameStudioEnabled && (
                <button
                  className="title-bar-studio-btn"
                  onClick={() => {
                    if (isGameStudio) {
                      navigate('/library');
                    } else {
                      navigate('/game-studio');
                    }
                  }}
                  title={isGameStudio ? "Back to Library" : "Game Studio"}
                >
                  <Layout size={16} />
                  <span className="title-bar-studio-text">
                    {isGameStudio ? "User View" : "Studio View"}
                  </span>
                </button>
              )}
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
        {(() => {
          const shouldShow = totalWindowCount > 1;
          if (shouldShow) {
            console.log('🔲 Rendering window number:', windowNumber, 'total count:', totalWindowCount);
          }
          return shouldShow ? (
            <div className="title-bar-center">
              <div className="title-bar-window-count">
                {windowNumber}
              </div>
            </div>
          ) : null;
        })()}
        <div className="title-bar-right">
          {!isAuth && !isAccountSwitcher && (
            <>
              <button 
                className="title-bar-button pop-out-btn" 
                onClick={async () => {
                  try {
                    const currentRoute = location.pathname;
                    if (window.electronAPI?.openPopOutWindow) {
                      const result = await window.electronAPI.openPopOutWindow(currentRoute);
                      if (!result.success) {
                        console.error('Failed to open pop-out window:', result.error);
                      }
                    } else {
                      console.warn('Electron API not available');
                    }
                  } catch (error) {
                    console.error('Error opening pop-out window:', error);
                  }
                }}
                title="Pop out to separate window"
              >
                <ExternalLink size={14} />
              </button>
              <div className="title-bar-separator-vertical"></div>
            </>
          )}
          <div className="title-bar-zoom-controls">
            <button 
              className="title-bar-zoom-btn zoom-out" 
              onClick={zoomOut}
              title="Zoom Out"
            >
              <Minus size={12} />
            </button>
            <span className="title-bar-zoom-level">{zoomLevel}%</span>
            <button 
              className="title-bar-zoom-btn zoom-in" 
              onClick={zoomIn}
              title="Zoom In"
            >
              <Plus size={12} />
            </button>
          </div>
          <div className="title-bar-separator-vertical"></div>
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