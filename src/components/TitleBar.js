import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Minus, Maximize, X, Menu, ChevronLeft, ChevronRight } from 'lucide-react';
import './TitleBar.css';

const TitleBar = ({ onToggleSidebar }) => {
  const location = useLocation();
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);

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

  // Hide hamburger menu in Game Studio views
  const isGameStudio = location.pathname === '/game-studio' || location.pathname === '/game-studio-settings';

  return (
    <div className="title-bar">
      <div className="title-bar-content">
        <div className="title-bar-left">
          {!isGameStudio && (
            <button 
              className="title-bar-button sidebar-menu" 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onToggleSidebar) {
                  onToggleSidebar();
                }
              }}
              title="Toggle Sidebar"
            >
              <Menu size={14} />
            </button>
          )}
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
        </div>
        <div className="title-bar-right">
          <button className="title-bar-button minimize" onClick={minimizeWindow}>
            <Minus size={14} />
          </button>
          <button className="title-bar-button maximize" onClick={maximizeWindow}>
            <Maximize size={14} />
          </button>
          <button className="title-bar-button close" onClick={closeWindow}>
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default TitleBar;