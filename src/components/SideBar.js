import React, { useEffect, useState, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Search,
  ChevronDown,
  User,
  Home,
  RefreshCw,
  Pause,
  Download,
  CheckCircle,
  X,
  Play,
  Plus,
  FolderPlus,
  Trash2,
  Edit2,
} from "lucide-react";
import { useLocation } from "react-router-dom";
import { subscribe as subscribeDownloadSpeed, setSpeed as setGlobalDownloadSpeed, setPaused as setGlobalPaused, clearSpeed as clearGlobalDownloadSpeed, getPaused } from "../utils/DownloadSpeedStore";
import { getUserData, saveUserData, getUserScopedKey } from "../utils/UserDataManager";
import "./SideBar.css";

const SideBar = ({ currentGame, onGameSelect, navigate, isCollapsed }) => {
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [expanded, setExpanded] = useState(() => {
    try {
      const stored = getUserData('sidebarExpanded', null);
      if (stored) {
        // Ensure defaults are set
        return { recent: true, myOwn: true, ...stored };
      }
    } catch (_) {}
    return { recent: true, myOwn: true };
  });
  const [updatingGames, setUpdatingGames] = useState({}); // track updating states
  const [downloadingGames, setDownloadingGames] = useState({}); // track downloading states
  const [gameStatus, setGameStatus] = useState({}); // track status type: "download", "update", "verify", "install"
  const [pausedGames, setPausedGames] = useState({}); // track paused games
  const [playingGames, setPlayingGames] = useState(() => {
    // Load playing games from user-specific storage on mount
    try {
      return getUserData('playingGames', {});
    } catch (e) {
      return {};
    }
  });
  const [showUpdateConfirmModal, setShowUpdateConfirmModal] = useState(false);
  const [pendingUpdateGameId, setPendingUpdateGameId] = useState(null);
  const [hoveredUpdateIcon, setHoveredUpdateIcon] = useState(null); // track hover state
  const [hoveredDownloadId, setHoveredDownloadId] = useState(null); // track hovered download for side menu
  const [sidebarSpeeds, setSidebarSpeeds] = useState({}); // per-game speeds from global store
  const [sidebarProgress, setSidebarProgress] = useState({}); // per-game progress from global store
  const [completedGames, setCompletedGames] = useState({}); // track completed games (true = download, "update" = update)
  const [sideMenuPosition, setSideMenuPosition] = useState(null); // track side menu position
  const [contextMenuPosition, setContextMenuPosition] = useState(null); // track context menu position
  const [selectedCategoryId, setSelectedCategoryId] = useState(null); // track which category was right-clicked
  const [showAddCategoryInput, setShowAddCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [renamingCategoryId, setRenamingCategoryId] = useState(null); // track which category is being renamed
  const [renameCategoryName, setRenameCategoryName] = useState(""); // name for renaming category
  const [customCategories, setCustomCategories] = useState(() => {
    try {
      return getUserData('sidebarCategories', []);
    } catch (e) {
      return [];
    }
  });
  const updateTimersRef = React.useRef({}); // track update timers for cancellation
  const downloadTimersRef = React.useRef({}); // track download timers for cancellation
  const sidebarContentRef = useRef(null);
  const footerRef = useRef(null);

  // Hide side menu when the download finishes or is no longer in the downloads list
  useEffect(() => {
    if (sideMenuPosition && !downloadingGames[sideMenuPosition.gameId] && !updatingGames[sideMenuPosition.gameId]) {
      setSideMenuPosition(null);
      setHoveredDownloadId(null);
    }
  }, [downloadingGames, updatingGames, sideMenuPosition]);

  // Subscribe to global download speed updates for currently updating games
  useEffect(() => {
    const unsubscribers = Object.keys(updatingGames)
      .filter((gameId) => updatingGames[gameId])
      .map((gameId) =>
        subscribeDownloadSpeed(gameId, (data) => {
          setSidebarSpeeds((prev) => ({ ...prev, [gameId]: data.speed }));
          setSidebarProgress((prev) => ({ ...prev, [gameId]: data.progress }));
        })
      );
    return () => unsubscribers.forEach((u) => u && u());
  }, [updatingGames]);

  // This useEffect will be moved after allGames is defined


  // Listen for game status changes (playing)
  useEffect(() => {
    const handleGameStatusChange = (e) => {
      const { gameId, status } = e.detail;
      setPlayingGames((prev) => {
        const newState = { ...prev };
        if (status === 'playing') {
          newState[gameId] = true;
        } else {
          delete newState[gameId];
        }
        // Save to user-specific storage
        saveUserData('playingGames', newState);
        return newState;
      });
    };

    window.addEventListener('gameStatusChanged', handleGameStatusChange);
    return () => window.removeEventListener('gameStatusChanged', handleGameStatusChange);
  }, []);

  // Load custom games from user-specific storage - MUST be before allGames definition
  const [customGames, setCustomGames] = useState(() => {
    try {
      return getUserData('customGames', []);
    } catch (e) {
      console.error('Error loading custom games:', e);
      return [];
    }
  });

  // Listen for storage changes to update custom games and sidebar data
  useEffect(() => {
    const loadCustomGames = () => {
      try {
        const userGames = getUserData('customGames', []);
        setCustomGames(userGames);
      } catch (e) {
        console.error('Error loading custom games:', e);
      }
    };
    
    const loadSidebarData = () => {
      try {
        // Reload categories
        const categories = getUserData('sidebarCategories', []);
        setCustomCategories(categories);
        
        // Reload expanded state
        const expandedState = getUserData('sidebarExpanded', null);
        if (expandedState) {
          setExpanded({ recent: true, myOwn: true, ...expandedState });
        }
        
        // Reload playing games
        const playing = getUserData('playingGames', {});
        setPlayingGames(playing);
      } catch (e) {
        console.error('Error loading sidebar data:', e);
      }
    };
    
    const handleStorageChange = (e) => {
      if (e.key === getUserScopedKey('customGames')) {
        loadCustomGames();
      } else if (e.key === getUserScopedKey('sidebarCategories') || 
                 e.key === getUserScopedKey('sidebarExpanded') ||
                 e.key === getUserScopedKey('playingGames')) {
        loadSidebarData();
      }
    };
    
    const handleCustomGameUpdate = () => {
      loadCustomGames();
    };
    
    const handleUserChange = () => {
      loadCustomGames();
      loadSidebarData();
    };
    
    // Load on mount
    loadCustomGames();
    loadSidebarData();
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('customGameUpdate', handleCustomGameUpdate);
    window.addEventListener('user-changed', handleUserChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('customGameUpdate', handleCustomGameUpdate);
      window.removeEventListener('user-changed', handleUserChange);
    };
  }, []);

  // Games will be loaded from localStorage or API
  const gamesByCategory = useMemo(() => {
    const base = {
      recent: [], // Will be populated from localStorage or API
      myOwn: [] // This will be populated by custom games
    };
    
    // Add custom categories
    customCategories.forEach(cat => {
      if (cat.id && cat.name) {
        base[cat.id] = [];
      }
    });
    
    return base;
  }, [customCategories]);

  // Combine regular games with custom games - MUST be after customGames and gamesByCategory
  const allGames = useMemo(() => {
    // Format custom games as a separate category
    const myOwnGames = customGames.map(customGame => ({
      id: customGame.gameId,
      name: customGame.name,
      icon: customGame.icon,
      logo: customGame.logo || customGame.gameLogo || customGame.fullFormData?.gameLogo,
      banner: customGame.banner,
      rating: customGame.rating,
      playerCount: customGame.playerCount,
      currentPlaying: customGame.currentPlaying,
      trending: customGame.trending,
      description: customGame.description,
      tags: customGame.tags,
      playtime: customGame.playtime,
      lastPlayed: customGame.lastPlayed,
      size: customGame.size,
      developer: customGame.developer,
      releaseDate: customGame.releaseDate
    }));
    
    return {
      ...gamesByCategory,
      myOwn: myOwnGames
    };
  }, [customGames, gamesByCategory]);

  const toggle = (section) => {
    setExpanded((prev) => {
      const newExpanded = { ...prev, [section]: !prev[section] };
      // Save to user-specific storage
      try {
        saveUserData('sidebarExpanded', newExpanded);
      } catch (e) {
        console.error('Error saving expanded state:', e);
      }
      return newExpanded;
    });
  };

  // Handle context menu for empty areas
  const handleContextMenu = (e) => {
    // Don't show context menu if clicking on interactive elements or categories
    // Let the event bubble to the category's onContextMenu handler
    if (
      e.target.closest('.game-item') ||
      e.target.closest('.sidebar-section') ||
      e.target.closest('.section-header') ||
      e.target.closest('.sidebar-btn') ||
      e.target.closest('.sidebar-search') ||
      e.target.closest('.footer-download-item') ||
      e.target.closest('.footer-update-item') ||
      e.target.closest('.footer-info') ||
      e.target.closest('.sidebar-rename-category')
    ) {
      // Don't prevent default or stop propagation - let the event bubble
      return;
    }
    
    // Only prevent default and stop propagation for empty area clicks
    e.preventDefault();
    e.stopPropagation();
    
    setSelectedCategoryId(null);
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
  };

  // Handle context menu for categories
  const handleCategoryContextMenu = (e, categoryId) => {
    e.preventDefault();
    e.stopPropagation();
    
    setSelectedCategoryId(categoryId);
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
  };

  const handleCloseContextMenu = () => {
    setContextMenuPosition(null);
    setSelectedCategoryId(null);
  };

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenuPosition(null);
      setSelectedCategoryId(null);
    };
    if (contextMenuPosition) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [contextMenuPosition]);

  // Handle adding new category
  const handleAddCategory = () => {
    if (!newCategoryName.trim()) {
      setShowAddCategoryInput(false);
      setNewCategoryName("");
      return;
    }
    
    const categoryId = newCategoryName.toLowerCase().replace(/\s+/g, '-');
    const newCategory = {
      id: categoryId,
      name: newCategoryName.trim()
    };
    
    const updated = [...customCategories, newCategory];
    setCustomCategories(updated);
    try {
      saveUserData('sidebarCategories', updated);
    } catch (e) {
      console.error('Error saving categories:', e);
    }
    
    setExpanded(prev => ({ ...prev, [categoryId]: true }));
    setShowAddCategoryInput(false);
    setNewCategoryName("");
  };

  const handleCancelAddCategory = () => {
    setShowAddCategoryInput(false);
    setNewCategoryName("");
  };

  // Handle deleting category
  const handleDeleteCategory = (categoryId) => {
    if (categoryId === 'recent' || categoryId === 'myOwn') return; // Don't allow deleting default categories
    
    const updated = customCategories.filter(cat => cat.id !== categoryId);
    setCustomCategories(updated);
    try {
      saveUserData('sidebarCategories', updated);
    } catch (e) {
      console.error('Error saving categories:', e);
    }
    
    // Remove from expanded state
    setExpanded(prev => {
      const newExpanded = { ...prev };
      delete newExpanded[categoryId];
      return newExpanded;
    });
    
    handleCloseContextMenu();
  };

  // Handle renaming category
  const handleRenameCategory = (categoryId) => {
    const category = customCategories.find(c => c.id === categoryId);
    if (!category) return;
    
    setRenamingCategoryId(categoryId);
    setRenameCategoryName(category.name);
    handleCloseContextMenu();
  };

  const handleSaveRename = () => {
    if (!renameCategoryName.trim() || !renamingCategoryId) {
      setRenamingCategoryId(null);
      setRenameCategoryName("");
      return;
    }
    
    const updated = customCategories.map(cat => 
      cat.id === renamingCategoryId 
        ? { ...cat, name: renameCategoryName.trim() }
        : cat
    );
    setCustomCategories(updated);
    try {
      saveUserData('sidebarCategories', updated);
    } catch (e) {
      console.error('Error saving categories:', e);
    }
    
    setRenamingCategoryId(null);
    setRenameCategoryName("");
  };

  const handleCancelRename = () => {
    setRenamingCategoryId(null);
    setRenameCategoryName("");
  };

  // Subscribe to all games for download/update tracking (moved after allGames definition)
  useEffect(() => {
    const allGameIds = [...Object.values(allGames).flat().map(g => g.id), ...customGames.map(g => g.gameId)];
    const unsubscribers = allGameIds.map(gameId =>
      subscribeDownloadSpeed(gameId, (data) => {
        // Always update speeds and progress
        setSidebarSpeeds((prev) => ({ ...prev, [gameId]: data.speed }));
        setSidebarProgress((prev) => ({ ...prev, [gameId]: data.progress }));
        
        // Update pause state from global store
        if (data.isPaused !== undefined) {
          setPausedGames((prev) => ({ ...prev, [gameId]: data.isPaused }));
        }
        
        // If progress is 100, mark as completed and remove from downloads/updates immediately
        if (data.progress >= 100) {
          setDownloadingGames((prev) => {
            if (prev[gameId]) {
              const newState = { ...prev };
              delete newState[gameId];
              return newState;
            }
            return prev;
          });
          setUpdatingGames((prev) => {
            if (prev[gameId]) {
              const newState = { ...prev };
              delete newState[gameId];
              return newState;
            }
            return prev;
          });
          setGameStatus((prev) => {
            if (prev[gameId]) {
              const newState = { ...prev };
              delete newState[gameId];
              return newState;
            }
            return prev;
          });
          setCompletedGames((prev) => ({ ...prev, [gameId]: true }));
          // Clear completed state after showing briefly
          setTimeout(() => {
            setCompletedGames((prev) => {
              const newState = { ...prev };
              delete newState[gameId];
              return newState;
            });
          }, 1000);
        }
        
        // Mark as downloading when speed > 0 or progress > 0 and not already completed (use functional updates to avoid stale closure)
        if (data.speed > 0 || (data.progress > 0 && data.progress < 100)) {
          // Do not mark as downloading if we're in update mode
          if (!updatingGames[gameId]) {
            setDownloadingGames((prev) => {
              if (!prev[gameId]) {
                return { ...prev, [gameId]: true };
              }
              return prev;
            });
          }
          setGameStatus((prev) => {
            // Do not override explicit update state
            if (prev[gameId] === "update") {
              return prev;
            }
            if (!prev[gameId] || prev[gameId] !== "download") {
              return { ...prev, [gameId]: "download" };
            }
            return prev;
          });
        }
        
        // If speed and progress are both 0, stop the download/update state immediately
        if (data.speed === 0 && data.progress === 0) {
          setDownloadingGames((prev) => {
            if (prev[gameId]) {
              const newState = { ...prev };
              delete newState[gameId];
              return newState;
            }
            return prev;
          });
          setUpdatingGames((prev) => {
            if (prev[gameId]) {
              const newState = { ...prev };
              delete newState[gameId];
              return newState;
            }
            return prev;
          });
          setGameStatus((prev) => {
            if (prev[gameId]) {
              const newState = { ...prev };
              delete newState[gameId];
              return newState;
            }
            return prev;
          });
          setPausedGames((prev) => {
            if (prev[gameId]) {
              const newState = { ...prev };
              delete newState[gameId];
              return newState;
            }
            return prev;
          });
        }
      })
    );
    return () => unsubscribers.forEach((u) => u && u());
  }, [allGames, customGames]);

  const filteredGames = Object.fromEntries(
    Object.entries(allGames).map(([k, v]) => [
      k,
      v.filter((g) =>
        g.name.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    ])
  );


  const handlePauseDownload = (gameId) => {
    const isCurrentlyPaused = pausedGames[gameId];
    const newPausedState = !isCurrentlyPaused;
    
    // Update local state
    setPausedGames((prev) => ({ ...prev, [gameId]: newPausedState }));
    
    // Update global state
    setGlobalPaused(gameId, newPausedState);
    
    // If pausing, set speed to 0 globally
    if (newPausedState) {
      setGlobalDownloadSpeed(gameId, 0, null);
    }
    // If resuming, let the download continue from where it paused
    // The global store will continue to update progress if the download is running
  };

  const handleCancelDownload = (gameId) => {
    // Clear all download states
    setDownloadingGames((prev) => {
      const newState = { ...prev };
      delete newState[gameId];
      return newState;
    });
    setPausedGames((prev) => {
      const newState = { ...prev };
      delete newState[gameId];
      return newState;
    });
    setGameStatus((prev) => {
      const newState = { ...prev };
      delete newState[gameId];
      return newState;
    });
    setSidebarSpeeds((prev) => {
      const newState = { ...prev };
      delete newState[gameId];
      return newState;
    });
    setSidebarProgress((prev) => {
      const newState = { ...prev };
      delete newState[gameId];
      return newState;
    });
    
    // Clear download speed and progress from global store completely
    clearGlobalDownloadSpeed(gameId);
  };

  const handleGameClick = (id) => {
    onGameSelect?.(id);
    navigate?.(`/game/${id}`);
  };

  const handleUpdateClick = async (gameId, e) => {
    if (e) {
      e.stopPropagation();
    }
    
    const currentlyUpdating = updatingGames[gameId];

    if (currentlyUpdating) {
      // Pause/Cancel update
      if (updateTimersRef.current[gameId]) {
        const timer = updateTimersRef.current[gameId];
        if (timer.interval) {
          clearInterval(timer.interval);
        }
        if (timer.timeout) {
          clearTimeout(timer.timeout);
        }
        delete updateTimersRef.current[gameId];
      }
      setUpdatingGames((prev) => ({ ...prev, [gameId]: false }));
      setGameStatus((prev) => {
        const newState = { ...prev };
        delete newState[gameId];
        return newState;
      });
      clearGlobalDownloadSpeed(gameId);
      window.dispatchEvent(new CustomEvent('gameStatusChanged', { detail: { gameId, status: null } }));
      return;
    }

    // Check if game is currently playing
    if (playingGames[gameId]) {
      // Game is playing, show confirmation modal
      setPendingUpdateGameId(gameId);
      setShowUpdateConfirmModal(true);
      return;
    }

    // Game is not playing, start update directly
    startUpdate(gameId);
  };

  const handleConfirmUpdate = () => {
    if (pendingUpdateGameId) {
      // Terminate the game
      const playingGames = getUserData('playingGames', {});
      delete playingGames[pendingUpdateGameId];
      saveUserData('playingGames', playingGames);
      // Dispatch custom event to notify
      window.dispatchEvent(new CustomEvent('gameStatusChanged', { detail: { gameId: pendingUpdateGameId, status: null } }));
      
      // Update local state
      setPlayingGames((prev) => {
        const newState = { ...prev };
        delete newState[pendingUpdateGameId];
        // Save to user-specific storage
        saveUserData('playingGames', newState);
        return newState;
      });
      
      // Start the update
      const gameId = pendingUpdateGameId;
      setPendingUpdateGameId(null);
      setShowUpdateConfirmModal(false);
      startUpdate(gameId);
    }
  };

  const handleCancelUpdate = () => {
    setShowUpdateConfirmModal(false);
    setPendingUpdateGameId(null);
  };

  const startUpdate = async (gameId) => {
    // Start update
    setUpdatingGames((prev) => ({ ...prev, [gameId]: true }));
    setGameStatus((prev) => ({ ...prev, [gameId]: "update" }));
    try { localStorage.setItem(`game_${gameId}_status`, 'update'); } catch (_) {}
    
    // Dispatch event to notify Game component
    window.dispatchEvent(new CustomEvent('gameStatusChanged', { detail: { gameId, status: 'update' } }));
    
    // Start tracking update progress in global download store
    setGlobalDownloadSpeed(gameId, 0.5, 0); // Start with 0 progress
    
    // Simulate update progress with pause-aware countdown
    let currentProgress = 0;
    let remainingMs = 13000; // total simulated duration
    const tickMs = 100;
    const progressPerTick = 100 / (remainingMs / tickMs);
    const updateInterval = setInterval(() => {
      const paused = getPaused ? getPaused(gameId) : false;
      if (paused) {
        // While paused, do not advance or countdown; keep speed 0 so graphs stop
        setGlobalDownloadSpeed(gameId, 0, currentProgress);
        return;
      }
      remainingMs = Math.max(0, remainingMs - tickMs);
      currentProgress = Math.min(100, currentProgress + progressPerTick);
      setGlobalDownloadSpeed(gameId, 0.5 + Math.random() * 0.3, currentProgress);
      if (currentProgress >= 100 || remainingMs <= 0) {
        clearInterval(updateInterval);
        // Update completed
        setGlobalDownloadSpeed(gameId, 0, 100);
        setTimeout(() => clearGlobalDownloadSpeed(gameId), 1000);
        // proceed to completion block below via manual call
        finish();
      }
    }, tickMs);

    // Store interval and remaining in ref for cleanup/cancel
    updateTimersRef.current[gameId] = { interval: updateInterval };

    const finish = async () => {
      // Show completed state for update
      setCompletedGames((prev) => ({ ...prev, [gameId]: "update" }));
      setUpdatingGames((prev) => ({ ...prev, [gameId]: false }));
      
      // Clear update status
      window.dispatchEvent(new CustomEvent('gameStatusChanged', { detail: { gameId, status: null } }));
      try { localStorage.removeItem(`game_${gameId}_status`); } catch (_) {}
      
      // Clear completed state after 1 second
      setTimeout(() => {
        setCompletedGames((prev) => {
          const newState = { ...prev };
          delete newState[gameId];
          return newState;
        });
      }, 1000);
    };
  };

  const handleDownloadClick = async (gameId) => {
    const currentlyDownloading = downloadingGames[gameId];

    if (currentlyDownloading) {
      // Pause/Cancel download
      if (downloadTimersRef.current[gameId]) {
        clearTimeout(downloadTimersRef.current[gameId]);
        delete downloadTimersRef.current[gameId];
      }
      setDownloadingGames((prev) => ({ ...prev, [gameId]: false }));
      return;
    }

    // Start download
    setDownloadingGames((prev) => ({ ...prev, [gameId]: true }));
    try { localStorage.setItem(`game_${gameId}_status`, 'download'); } catch (_) {}

    // Create a promise-based timer that can be cancelled (longer for downloads)
    const timerPromise = new Promise((resolve) => {
      downloadTimersRef.current[gameId] = setTimeout(() => {
        resolve();
        delete downloadTimersRef.current[gameId];
      }, 5000);
    });

    try {
      await timerPromise;
      // Show completed state
      setCompletedGames((prev) => ({ ...prev, [gameId]: true }));
      setDownloadingGames((prev) => ({ ...prev, [gameId]: false }));
      try { localStorage.removeItem(`game_${gameId}_status`); } catch (_) {}
      
      // Clear completed state after 1 second
      setTimeout(() => {
        setCompletedGames((prev) => {
          const newState = { ...prev };
          delete newState[gameId];
          return newState;
        });
      }, 1000);
    } catch (error) {
      // Download was cancelled, nothing to do
    }
  };

  return (
    <aside className={`sidebar ${isCollapsed ? "collapsed" : ""}`}>
      {!isCollapsed && (
        <div className="sidebar-top">
          <button
            className={`sidebar-btn ${location.pathname === "/library" ? "active" : ""
              }`}
            onClick={() => navigate("/library")}
          >
            <Home size={16} />
            <span>Library</span>
          </button>

          <div className="sidebar-search">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search games..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      )}

      {!isCollapsed && (
        <div 
          className="sidebar-content"
          ref={sidebarContentRef}
          onContextMenu={handleContextMenu}
        >
          {Object.entries(filteredGames)
            .sort(([a], [b]) => {
              // Always put "myOwn" first
              if (a === 'myOwn') return -1;
              if (b === 'myOwn') return 1;
              // Then "recent"
              if (a === 'recent') return -1;
              if (b === 'recent') return 1;
              // Then all other categories (custom categories) alphabetically
              return a.localeCompare(b);
            })
            .map(([section, games]) => {
            const category = customCategories.find(c => c.id === section);
            const categoryName = category ? category.name : (section === 'myOwn' ? 'MY OWN GAMES' : section.toUpperCase());
            
            // Only show "My Own Games" section when there are games in it
            return games.length || section === 'recent' || (section === 'myOwn' && games.length) || category ? (
              <div key={section} className="sidebar-section">
                {renamingCategoryId === section && category ? (
                  <div className="sidebar-rename-category">
                    <div className="add-category-input-wrapper">
                      <input
                        type="text"
                        value={renameCategoryName}
                        onChange={(e) => setRenameCategoryName(e.target.value)}
                        placeholder="Kategoriename eingeben..."
                        className="add-category-input"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSaveRename();
                          } else if (e.key === 'Escape') {
                            handleCancelRename();
                          }
                        }}
                        autoFocus
                      />
                      <div className="add-category-actions">
                        <button
                          className="add-category-btn add-category-confirm"
                          onClick={handleSaveRename}
                          disabled={!renameCategoryName.trim()}
                          title="Speichern (Enter)"
                        >
                          <CheckCircle size={14} />
                        </button>
                        <button
                          className="add-category-btn add-category-cancel"
                          onClick={handleCancelRename}
                          title="Abbrechen (Esc)"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    className="section-header"
                    onClick={() => toggle(section)}
                    onContextMenu={(e) => {
                      // Only show context menu for custom categories
                      if (category && section !== 'recent' && section !== 'myOwn') {
                        e.preventDefault();
                        e.stopPropagation();
                        handleCategoryContextMenu(e, section);
                      }
                    }}
                  >
                    <ChevronDown
                      size={16}
                      className={expanded[section] ? "rotated" : ""}
                    />
                    {categoryName} ({games.length})
                  </button>
                )}

                {expanded[section] && (
                  <div className="section-list">
                    {games.map((game) => {
                      const updating = updatingGames[game.id];
                      const downloading = downloadingGames[game.id] && !updating; // don't show downloading class if updating
                      const completed = completedGames[game.id];
                      const playing = playingGames[game.id];

                      return (
                        <div
                          key={game.id}
                          className={`game-item ${currentGame === game.id && location.pathname.startsWith('/game/') ? "active" : ""
                            } ${updating ? "updating" : ""} ${downloading ? "downloading" : ""} ${completed === true ? "completed-download" : ""} ${completed === "update" ? "completed-update" : ""} ${playing ? "playing" : ""}`}
                          onClick={() => handleGameClick(game.id)}
                        >
                            <div className="game-row">
                            <div className="game-clickable">
                              <div className="game-icon">
                                {game.logo ? (
                                  <img 
                                    src={game.logo}
                                    alt={game.name}
                                    onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }}
                                  />
                                ) : null}
                                <span style={{ display: game.logo ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', fontSize: '10px', fontWeight: 700, color: 'var(--accent-primary)' }}>
                                  {(game.name || '?').charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div className="game-name">{game.name}</div>
                            </div>

                            {game.isUpdateQueued && (
                              updating ? (
                                <div className="update-controls" onMouseEnter={() => setHoveredUpdateIcon(game.id)} onMouseLeave={() => setHoveredUpdateIcon(null)}>
                                  <span className="update-speed">
                                    {pausedGames[game.id] ? 'Paused' : `${typeof sidebarSpeeds[game.id] === 'number' ? sidebarSpeeds[game.id].toFixed(1) : '0.0'} MB/s`}
                                  </span>
                                  <button
                                    className="icon-btn"
                                    title={pausedGames[game.id] ? 'Resume' : 'Pause'}
                                    onClick={(e) => { e.stopPropagation(); handlePauseDownload(game.id); }}
                                  >
                                    {pausedGames[game.id] ? <Play size={14} fill="currentColor" /> : <Pause size={14} fill="currentColor" />}
                                  </button>
                                  <button
                                    className="icon-btn"
                                    title="Cancel"
                                    onClick={(e) => handleUpdateClick(game.id, e)}
                                  >
                                    <X size={14} fill="currentColor" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  className={`update-icon-btn ${updating && hoveredUpdateIcon !== game.id ? 'spinning' : ''}`}
                                  onClick={(e) => {
                                    handleUpdateClick(game.id, e);
                                  }}
                                  onMouseEnter={() => setHoveredUpdateIcon(game.id)}
                                  onMouseLeave={() => setHoveredUpdateIcon(null)}
                                  title="Click to start update"
                                >
                                  <RefreshCw size={14} />
                                </button>
                              )
                            )}
                          </div>

                          {/* Download/Update Progress Bar (synced with global progress) */}
                          {(downloading || updating) && (
                            <div className="game-progress-bar" style={{
                              width: `${sidebarProgress[game.id] || 0}%`
                            }} />
                          )}

                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : null;
          })}
          
          {/* Add Category Input Field */}
          {showAddCategoryInput && (
            <div className="sidebar-add-category">
              <div className="add-category-input-wrapper">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Kategoriename eingeben..."
                  className="add-category-input"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleAddCategory();
                    } else if (e.key === 'Escape') {
                      handleCancelAddCategory();
                    }
                  }}
                  autoFocus
                />
                <div className="add-category-actions">
                  <button
                    className="add-category-btn add-category-confirm"
                    onClick={handleAddCategory}
                    disabled={!newCategoryName.trim()}
                    title="Hinzufügen (Enter)"
                  >
                    <CheckCircle size={14} />
                  </button>
                  <button
                    className="add-category-btn add-category-cancel"
                    onClick={handleCancelAddCategory}
                    title="Abbrechen (Esc)"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Empty spacer to ensure context menu works even in empty areas */}
          <div style={{ flex: 1, minHeight: '100px' }} />
        </div>
      )}

      {/* Context Menu */}
      {contextMenuPosition && createPortal(
        <div
          className="sidebar-context-menu"
          style={{
            position: 'fixed',
            left: `${contextMenuPosition.x}px`,
            top: `${contextMenuPosition.y}px`,
            zIndex: 10001
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {selectedCategoryId ? (
            // Context menu for a specific category (only shows for custom categories)
            <>
              {customCategories.find(c => c.id === selectedCategoryId) ? (
                <>
                  <button
                    className="context-menu-item"
                    onClick={() => {
                      handleRenameCategory(selectedCategoryId);
                      setContextMenuPosition(null);
                    }}
                  >
                    <Edit2 size={14} />
                    <span>Kategorie umbenennen</span>
                  </button>
                  <div className="context-menu-divider" />
                  <button
                    className="context-menu-item context-menu-item-danger"
                    onClick={() => {
                      handleDeleteCategory(selectedCategoryId);
                      setContextMenuPosition(null);
                    }}
                  >
                    <Trash2 size={14} />
                    <span>Kategorie löschen</span>
                  </button>
                </>
              ) : null}
            </>
          ) : (
            // Context menu for empty area
            <>
              <button
                className="context-menu-item"
                onClick={() => {
                  setShowAddCategoryInput(true);
                  setContextMenuPosition(null);
                }}
              >
                <FolderPlus size={14} />
                <span>Kategorie hinzufügen</span>
              </button>
            </>
          )}
        </div>,
        document.body
      )}
      
      {!isCollapsed && (
        <div 
          className="sidebar-footer"
          onContextMenu={handleContextMenu}
        >
          {/* Active Downloads */}
          {(Object.keys(downloadingGames).some(id => downloadingGames[id]) || 
            Object.keys(updatingGames).some(id => updatingGames[id])) && (
            <div className="footer-downloads">
              {(() => {
                // Build unified list of active download/update ids (unique)
                const activeIdsSet = new Set([
                  ...Object.entries(downloadingGames)
                    .filter(([_, v]) => v)
                    .map(([id]) => id),
                  ...Object.entries(updatingGames)
                    .filter(([_, v]) => v)
                    .map(([id]) => id),
                ]);
                const activeIds = Array.from(activeIdsSet);
                return activeIds.map((gameId) => {
                const game = Object.values(allGames).flat().find(g => g.id === gameId);
                const progress = sidebarProgress[gameId] || 0;
                const status = gameStatus[gameId] || "download";
                const statusLabels = {
                  download: "Downloading",
                  update: "Updating",
                  verify: "Verifying",
                  install: "Installing"
                };
                
                const isPaused = pausedGames[gameId];
                const gameName = game?.name || gameId;
                const shouldShowMenu = hoveredDownloadId === gameId;
                
                return (
                  <div 
                    key={gameId} 
                    className={status === "update" ? "footer-update-item" : "footer-download-item"}
                    ref={footerRef}
                    onMouseEnter={(e) => {
                      setHoveredDownloadId(gameId);
                      const rect = e.currentTarget.getBoundingClientRect();
                      const menuWidth = 280;
                      const menuHeight = 290; // approximate height
                      
                      // Calculate horizontal position
                      const rightSpace = window.innerWidth - rect.right;
                      let left = rect.right + 8;
                      
                      // Check if menu would overflow to the right
                      if (rightSpace < menuWidth && rect.left > menuWidth) {
                        left = rect.left - menuWidth - 8; // Show to the left
                      }
                      
                      // Calculate vertical position - center menu on item
                      let top = rect.top + (rect.height / 2) - (menuHeight / 2);
                      
                      // Adjust if menu would overflow at the bottom
                      if (top + menuHeight > window.innerHeight) {
                        top = window.innerHeight - menuHeight - 8;
                      }
                      
                      // Adjust if menu would overflow at the top
                      if (top < 8) {
                        top = 8;
                      }
                      
                      setSideMenuPosition({ left, top, gameId });
                    }}
                    onMouseLeave={(e) => {
                      // Check if mouse is moving to the side menu
                      const relatedTarget = e.relatedTarget;
                      const sideMenuElement = document.querySelector('.footer-download-side-menu');
                      
                      // If mouse moved to side menu or is still hovering the download item, keep menu open
                      if (
                        sideMenuElement &&
                        relatedTarget &&
                        typeof relatedTarget === 'object' &&
                        'nodeType' in relatedTarget &&
                        sideMenuElement.contains(relatedTarget)
                      ) {
                        return;
                      }
                      
                      // Otherwise, close the menu
                      setHoveredDownloadId(null);
                      setSideMenuPosition(null);
                    }}
                  >
                    <div className="footer-download-info">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: '1 1 auto', overflow: 'hidden' }}>
                        <span className="footer-download-name">{gameName}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                        <span className="footer-download-speed">
                          {isPaused ? "Paused" : (status === "download" ? `${typeof sidebarSpeeds[gameId] === 'number' ? sidebarSpeeds[gameId].toFixed(1) : '0.0'} MB/s` : `${statusLabels[status]}...`)}
                        </span>
                        <button 
                          className="footer-download-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePauseDownload(gameId);
                          }}
                          title={isPaused ? "Resume" : "Pause"}
                        >
                          {isPaused ? <Play size={14} fill="currentColor" /> : <Pause size={14} fill="currentColor" />}
                        </button>
                        <button 
                          className="footer-download-btn footer-cancel-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCancelDownload(gameId);
                          }}
                          title="Cancel"
                        >
                          <X size={14} fill="currentColor" />
                        </button>
                      </div>
                    </div>
                    <div className="footer-progress-bar">
                      <div className="footer-progress-fill" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                );
              });})()}
            </div>
          )}
          
          <div className="footer-info">
            <span className="footer-text">© 2024 Kinma</span>
            <span className="footer-version">v1.0.0</span>
          </div>
        </div>
      )}
      
      {/* Portal for Side Menu */}
      {sideMenuPosition && (() => {
        const hoveredGame = Object.values(allGames).flat().find(g => g.id === sideMenuPosition.gameId);
        const hoveredProgress = sidebarProgress[sideMenuPosition.gameId] || 0;
        const hoveredStatus = gameStatus[sideMenuPosition.gameId] || "download";
        const hoveredIsPaused = pausedGames[sideMenuPosition.gameId];
        const hoveredSpeed = sidebarSpeeds[sideMenuPosition.gameId];
        const hoveredGameName = hoveredGame?.name || sideMenuPosition.gameId;
        
        // Calculate downloaded size
        const calculateDownloadedSize = (totalSize, progress) => {
          const totalSizeMatch = totalSize?.match(/([\d.]+)\s*(GB|MB)/i);
          if (!totalSizeMatch) return null;
          
          const totalValue = parseFloat(totalSizeMatch[1]);
          const unit = totalSizeMatch[2].toUpperCase();
          const downloadedValue = (totalValue * progress / 100).toFixed(2);
          
          return `${downloadedValue} ${unit}`;
        };
        
        const statusLabels = {
          download: "Downloading",
          update: "Updating",
          verify: "Verifying",
          install: "Installing"
        };
        
        return createPortal(
          <div 
            className="footer-download-side-menu"
            style={{ 
              position: 'fixed',
              left: `${sideMenuPosition.left}px`,
              top: `${sideMenuPosition.top}px`,
              zIndex: 10000
            }}
          >
            <div className="side-menu-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {hoveredStatus === "download" ? <Download size={20} fill="currentColor" /> : <RefreshCw size={20} fill="currentColor" />}
                <span className="side-menu-title">{hoveredGameName}</span>
              </div>
            </div>
            <div className="side-menu-content">
              <div className="side-menu-item">
                <span className="side-menu-label">Status</span>
                <span className="side-menu-value">
                  {hoveredIsPaused ? "Paused" : statusLabels[hoveredStatus] || "Unknown"}
                </span>
              </div>
              <div className="side-menu-item">
                <span className="side-menu-label">Progress</span>
                <span className="side-menu-value">{hoveredProgress.toFixed(1)}%</span>
              </div>
              {hoveredStatus === "download" && (
                <div className="side-menu-item">
                  <span className="side-menu-label">Speed</span>
                  <span className="side-menu-value">
                    {hoveredIsPaused ? "Paused" : `${typeof hoveredSpeed === 'number' ? hoveredSpeed.toFixed(1) : '0.0'} MB/s`}
                  </span>
                </div>
              )}
              {hoveredGame?.size && (
                <div className="side-menu-item">
                  <span className="side-menu-label">Size</span>
                  <span className="side-menu-value">
                    {calculateDownloadedSize(hoveredGame.size, hoveredProgress) ? 
                      `${calculateDownloadedSize(hoveredGame.size, hoveredProgress)} / ${hoveredGame.size}` : 
                      hoveredGame.size}
                  </span>
                </div>
              )}
            </div>
          </div>,
          document.body
        );
      })()}

      {/* Update Confirmation Modal */}
      {showUpdateConfirmModal && pendingUpdateGameId && (() => {
        const gameToUpdate = Object.values(allGames).flat().find(g => g.id === pendingUpdateGameId);
        const gameName = gameToUpdate?.name || pendingUpdateGameId;
        
        return createPortal(
          <div className="properties-modal-overlay" onClick={handleCancelUpdate}>
            <div className="switch-game-modal" onClick={(e) => e.stopPropagation()}>
              <div className="switch-game-modal-header">
                <h2>Update Game?</h2>
                <button className="switch-game-modal-close" onClick={handleCancelUpdate}>
                  <X size={20} />
                </button>
              </div>
              <div className="switch-game-modal-content">
                <p>
                  <strong>{gameName}</strong> is currently running.<br /><br />Do you want to close it and start the update?
                </p>
              </div>
              <div className="switch-game-modal-actions">
                <button 
                  className="switch-game-modal-btn switch-game-modal-btn-cancel" 
                  onClick={handleCancelUpdate}
                >
                  Cancel
                </button>
                <button 
                  className="switch-game-modal-btn switch-game-modal-btn-confirm" 
                  onClick={handleConfirmUpdate}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>,
          document.body
        );
      })()}
    </aside>
  );
};

export default SideBar;
