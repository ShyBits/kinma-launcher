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
  Folder,
  FolderOpen,
  ArrowDownCircle,
  BookOpen,
  Grid,
  List,
} from "lucide-react";
import { useLocation } from "react-router-dom";
import { subscribe as subscribeDownloadSpeed, setSpeed as setGlobalDownloadSpeed, setPaused as setGlobalPaused, clearSpeed as clearGlobalDownloadSpeed, getPaused, startDownload as startGlobalDownload, stopDownload as stopGlobalDownload, getProgress, getSpeed } from "../utils/DownloadSpeedStore";
import { getUserData, saveUserData, getUserScopedKey } from "../utils/UserDataManager";
import "./SideBar.css";

const SideBar = React.forwardRef(({ currentGame, onGameSelect, navigate, isCollapsed, width = 260, isResizing = false }, ref) => {
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem('libraryViewMode') || 'list';
    } catch (_) {
      return 'list';
    }
  });
  const [expanded, setExpanded] = useState({ recent: true, myOwn: true });
  const [updatingGames, setUpdatingGames] = useState({}); // track updating states
  const [downloadingGames, setDownloadingGames] = useState({}); // track downloading states
  const [gameStatus, setGameStatus] = useState({}); // track status type: "download", "update", "verify", "install"
  const [pausedGames, setPausedGames] = useState({}); // track paused games
  const [playingGames, setPlayingGames] = useState({});
  const [showUpdateConfirmModal, setShowUpdateConfirmModal] = useState(false);
  const [pendingUpdateGameId, setPendingUpdateGameId] = useState(null);
  const [hoveredUpdateIcon, setHoveredUpdateIcon] = useState(null);
  const [appVersion, setAppVersion] = useState('1.0.0');
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateDownloaded, setUpdateDownloaded] = useState(false);
  const [updateDownloading, setUpdateDownloading] = useState(false);
  const [updateProgress, setUpdateProgress] = useState(0);
  const [updateInfo, setUpdateInfo] = useState(null); // track hover state
  const [hoveredDownloadId, setHoveredDownloadId] = useState(null); // track hovered download for side menu
  const [sidebarSpeeds, setSidebarSpeeds] = useState({}); // per-game speeds from global store
  const [sidebarProgress, setSidebarProgress] = useState({}); // per-game progress from global store
  const [completedGames, setCompletedGames] = useState({}); // track completed games (true = download, "update" = update)
  const [sideMenuPosition, setSideMenuPosition] = useState(null); // track side menu position
  const [contextMenuPosition, setContextMenuPosition] = useState(null); // track context menu position
  const [selectedFolderId, setSelectedFolderId] = useState(null); // track which folder was right-clicked
  const [showAddFolderInput, setShowAddFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [renamingFolderId, setRenamingFolderId] = useState(null); // track which folder is being renamed
  const [renameFolderName, setRenameFolderName] = useState(""); // name for renaming folder
  const [showGameSelectionModal, setShowGameSelectionModal] = useState(false); // show game selection modal for folder creation
  const [selectedGamesForFolder, setSelectedGamesForFolder] = useState([]); // selected games for new folder
  const updateTimersRef = React.useRef({}); // track update timers for cancellation
  const downloadTimersRef = React.useRef({}); // track download timers for cancellation
  const sidebarContentRef = useRef(null);
  const footerRef = useRef(null);
  const sectionListRefs = useRef({});

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
  const [customGames, setCustomGames] = useState([]);

  // Load library folders from user-specific storage
  const [libraryFolders, setLibraryFolders] = useState([]);

  // Listen for storage changes to update custom games and sidebar data
  useEffect(() => {
    const loadCustomGames = async () => {
      try {
        const userGames = await getUserData('customGames', []);
        
        // Remove duplicates based on gameId (keep the most recent one)
        const uniqueGamesMap = new Map();
        if (Array.isArray(userGames)) {
          userGames.forEach(game => {
            const gameId = game.gameId || game.id;
            if (gameId) {
              const gameIdStr = String(gameId);
              const existingGame = uniqueGamesMap.get(gameIdStr);
              // Keep the one with the most recent addedToLibraryAt or purchasedAt
              if (!existingGame || 
                  (game.addedToLibraryAt && (!existingGame.addedToLibraryAt || 
                   new Date(game.addedToLibraryAt) > new Date(existingGame.addedToLibraryAt))) ||
                  (game.purchasedAt && (!existingGame.purchasedAt || 
                   new Date(game.purchasedAt) > new Date(existingGame.purchasedAt)))) {
                uniqueGamesMap.set(gameIdStr, game);
              }
            }
          });
        }
        
        const uniqueGames = Array.from(uniqueGamesMap.values());
        
        // Only update if there are actual changes (to avoid unnecessary re-renders)
        if (uniqueGames.length !== (Array.isArray(userGames) ? userGames.length : 0)) {
          // Save cleaned up games back to storage
          await saveUserData('customGames', uniqueGames);
        }
        
        setCustomGames(uniqueGames);
      } catch (e) {
        console.error('Error loading custom games:', e);
      }
    };
    
    const loadSidebarData = async () => {
      try {
        // Reload library folders
        const folders = await getUserData('libraryFolders', []);
        setLibraryFolders(Array.isArray(folders) ? folders : []);
        
        // Reload expanded state
        const expandedState = await getUserData('sidebarExpanded', null);
        if (expandedState && typeof expandedState === 'object') {
          setExpanded({ recent: true, myOwn: true, ...expandedState });
        }
        
        // Reload playing games
        const playing = await getUserData('playingGames', {});
        setPlayingGames(playing && typeof playing === 'object' ? playing : {});
      } catch (e) {
        console.error('Error loading sidebar data:', e);
      }
    };
    
    const handleStorageChange = (e) => {
      if (e.key === getUserScopedKey('customGames')) {
        loadCustomGames();
      } else if (e.key === getUserScopedKey('sidebarExpanded') ||
                 e.key === getUserScopedKey('playingGames') ||
                 e.key === getUserScopedKey('libraryFolders')) {
        loadSidebarData();
      }
    };

    const handleLibraryFolderUpdate = () => {
      loadSidebarData();
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
    window.addEventListener('libraryFolderUpdate', handleLibraryFolderUpdate);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('customGameUpdate', handleCustomGameUpdate);
      window.removeEventListener('user-changed', handleUserChange);
      window.removeEventListener('libraryFolderUpdate', handleLibraryFolderUpdate);
    };
  }, []);

  // Load app version and check for updates
  useEffect(() => {
    const loadVersion = async () => {
      try {
        if (window.electronAPI && window.electronAPI.getAppVersion) {
          const result = await window.electronAPI.getAppVersion();
          if (result && result.version) {
            setAppVersion(result.version);
          }
        }
      } catch (error) {
        console.error('Error loading app version:', error);
      }
    };

    const checkUpdateStatus = async () => {
      try {
        if (window.electronAPI && window.electronAPI.getUpdateStatus) {
          const result = await window.electronAPI.getUpdateStatus();
          if (result) {
            setUpdateAvailable(result.updateAvailable || false);
            setUpdateDownloaded(result.updateDownloaded || false);
            setUpdateInfo(result.updateInfo);
          }
        }
      } catch (error) {
        console.error('Error checking update status:', error);
      }
    };

    loadVersion();
    checkUpdateStatus();

    // Check for updates on mount
    if (window.electronAPI && window.electronAPI.checkForUpdates) {
      window.electronAPI.checkForUpdates().catch(err => {
        console.error('Error checking for updates:', err);
      });
    }

    // Set up update event listeners
    if (window.electronAPI) {
      if (window.electronAPI.onUpdateAvailable) {
        window.electronAPI.onUpdateAvailable((info) => {
          setUpdateAvailable(true);
          setUpdateInfo(info);
        });
      }

      if (window.electronAPI.onUpdateNotAvailable) {
        window.electronAPI.onUpdateNotAvailable(() => {
          setUpdateAvailable(false);
        });
      }

      if (window.electronAPI.onUpdateDownloadProgress) {
        window.electronAPI.onUpdateDownloadProgress((progress) => {
          setUpdateDownloading(true);
          setUpdateProgress(progress.percent || 0);
        });
      }

      if (window.electronAPI.onUpdateDownloaded) {
        window.electronAPI.onUpdateDownloaded((info) => {
          setUpdateDownloaded(true);
          setUpdateDownloading(false);
          setUpdateInfo(info);
        });
      }

      if (window.electronAPI.onUpdateError) {
        window.electronAPI.onUpdateError((error) => {
          console.error('Update error:', error);
          setUpdateDownloading(false);
        });
      }
    }

    return () => {
      if (window.electronAPI && window.electronAPI.removeUpdateListeners) {
        window.electronAPI.removeUpdateListeners();
      }
    };
  }, []);

  // Games will be loaded from localStorage or API
  const gamesByCategory = useMemo(() => {
    const base = {
      recent: [], // Will be populated from localStorage or API
      myOwn: [] // This will be populated by custom games
    };
    
    // Categories and folders are the same - use libraryFolders
    if (Array.isArray(libraryFolders)) {
      libraryFolders.forEach(folder => {
        if (folder.id && folder.name) {
          // Use folder.id directly (not folder_folder.id) since categories = folders
          base[folder.id] = [];
        }
      });
    }
    
    return base;
  }, [libraryFolders]);

  // Combine regular games with custom games - MUST be after customGames and gamesByCategory
  const allGames = useMemo(() => {
    // Format ALL custom games (not just own games)
    const allCustomGamesFormatted = customGames.map(customGame => ({
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
      lastPlayedTimestamp: customGame.lastPlayedTimestamp || customGame.lastPlayed,
      size: customGame.size,
      developer: customGame.developer,
      releaseDate: customGame.releaseDate,
      isOwnGame: customGame.isOwnGame || false,
      status: customGame.status || customGame.fullFormData?.status || 'draft'
    }));
    
    // Only include own games in myOwn folder that are published/released (not drafts)
    const myOwnGames = allCustomGamesFormatted.filter(g => {
      if (g.isOwnGame !== true) return false;
      // Check if game is published/released
      const originalGame = customGames.find(cg => cg.gameId === g.id);
      if (!originalGame) return false;
      const status = originalGame.status || originalGame.fullFormData?.status || 'draft';
      // Only show published/public games, not drafts
      return status === 'public' || status === 'published';
    });
    
    // Calculate Recent games (same logic as Library page)
    const recentGames = [...allCustomGamesFormatted]
      .filter(g => g.lastPlayedTimestamp || g.lastPlayed)
      .sort((a, b) => {
        const aTime = a.lastPlayedTimestamp || a.lastPlayed;
        const bTime = b.lastPlayedTimestamp || b.lastPlayed;
        const aDate = new Date(aTime);
        const bDate = new Date(bTime);
        return bDate - aDate; // Most recent first
      })
      .slice(0, 20); // Limit to 20 most recent
    
    // Get all game IDs that are in user-created folders (not special folders)
    const gamesInUserFolders = new Set();
    if (Array.isArray(libraryFolders)) {
      libraryFolders.forEach(folder => {
        if (folder.gameIds && folder.gameIds.length > 0) {
          folder.gameIds.forEach(gameId => gamesInUserFolders.add(String(gameId)));
        }
      });
    }
    
    // Games outside user-created folders (not in myOwn and not in any user folder)
    // These are games that should be displayed at root level
    const gamesOutsideFolders = allCustomGamesFormatted.filter(game => {
      const gameId = String(game.id);
      return !game.isOwnGame && !gamesInUserFolders.has(gameId);
    });
    
    const result = {
      ...gamesByCategory,
      myOwn: myOwnGames,
      recent: recentGames,
      library: gamesOutsideFolders // Games added to library but not in user folders
    };
    
    // Add games to their respective folders/categories (they are the same)
    if (Array.isArray(libraryFolders)) {
      libraryFolders.forEach(folder => {
        const folderKey = folder.id; // Use folder.id directly since categories = folders
        if (folder.gameIds && folder.gameIds.length > 0) {
          result[folderKey] = folder.gameIds
            .map(gameId => {
              const game = allCustomGamesFormatted.find(g => String(g.id) === String(gameId));
              return game;
            })
            .filter(Boolean);
        } else {
          result[folderKey] = [];
        }
      });
    }
    
    return result;
  }, [customGames, gamesByCategory, libraryFolders]);

  // Auto-delete empty folders (only when allGames changes, not when libraryFolders changes to avoid loops)
  useEffect(() => {
    if (!Array.isArray(libraryFolders) || libraryFolders.length === 0) return;
    
    // Check each folder and remove if empty
    const foldersToKeep = libraryFolders.filter(folder => {
      const folderGames = allGames[folder.id] || [];
      return folderGames.length > 0;
    });
    
    // Only update if folders were removed
    if (foldersToKeep.length !== libraryFolders.length) {
      const removedFolderIds = libraryFolders
        .filter(f => !foldersToKeep.some(k => k.id === f.id))
        .map(f => f.id);
      
      setLibraryFolders(foldersToKeep);
      saveUserData('libraryFolders', foldersToKeep);
      
      // Remove from expanded state
      if (removedFolderIds.length > 0) {
        setExpanded(prev => {
          const newExpanded = { ...prev };
          removedFolderIds.forEach(id => delete newExpanded[id]);
          return newExpanded;
        });
      }
      // Dispatch event to notify library page
      window.dispatchEvent(new CustomEvent('libraryFolderUpdate'));
    }
  }, [allGames, libraryFolders]);

  // Calculate vertical line height for active items - MUST be after allGames is defined
  useEffect(() => {
    const updateVerticalLineHeights = () => {
      // Use requestAnimationFrame to ensure DOM is updated
      requestAnimationFrame(() => {
        Object.keys(sectionListRefs.current).forEach(sectionId => {
          const sectionList = sectionListRefs.current[sectionId];
          if (!sectionList) return;
          
          const activeItem = sectionList.querySelector('.game-item.active');
          if (activeItem) {
            const itemTop = activeItem.offsetTop;
            const connectionPointY = itemTop + 20; // 20px is where the connection point is
            const height = connectionPointY + 17; // +17px to account for top offset
            sectionList.style.setProperty('--active-line-height', `${height}px`);
          } else {
            sectionList.style.removeProperty('--active-line-height');
          }
        });
      });
    };

    // Small delay to ensure DOM is ready
    const timeoutId = setTimeout(updateVerticalLineHeights, 0);
    
    // Update on resize
    window.addEventListener('resize', updateVerticalLineHeights);
    
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', updateVerticalLineHeights);
    };
  }, [currentGame, expanded]);

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
    
    setSelectedFolderId(null);
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
  };

  // Handle context menu for folders/categories (they are the same)
  const handleFolderContextMenu = (e, folderId) => {
    e.preventDefault();
    e.stopPropagation();
    
    setSelectedFolderId(folderId);
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
  };

  const handleCloseContextMenu = () => {
    setContextMenuPosition(null);
    setSelectedFolderId(null);
  };

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenuPosition(null);
      setSelectedFolderId(null);
    };
    if (contextMenuPosition) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [contextMenuPosition]);

  // Handle creating library folder
  const handleCreateLibraryFolder = () => {
    if (!newFolderName.trim()) {
      setShowAddFolderInput(false);
      setNewFolderName("");
      return;
    }
    
    // Show game selection modal instead of creating folder directly
    setSelectedGamesForFolder([]);
    setShowGameSelectionModal(true);
  };

  // Handle confirming folder creation with selected games
  const handleConfirmFolderCreation = () => {
    if (!newFolderName.trim()) return;
    
    const newFolder = {
      id: `folder-${Date.now()}`,
      name: newFolderName.trim(),
      gameIds: selectedGamesForFolder,
      createdAt: Date.now()
    };
    
    const updatedFolders = [...libraryFolders, newFolder];
    setLibraryFolders(updatedFolders);
    saveUserData('libraryFolders', updatedFolders);
    setNewFolderName("");
    setShowAddFolderInput(false);
    setShowGameSelectionModal(false);
    setSelectedGamesForFolder([]);
    // Dispatch event to notify library page
    window.dispatchEvent(new CustomEvent('libraryFolderUpdate'));
  };

  // Handle canceling folder creation
  const handleCancelFolderCreation = () => {
    setShowGameSelectionModal(false);
    setSelectedGamesForFolder([]);
    setNewFolderName("");
    setShowAddFolderInput(false);
  };

  // Toggle game selection in modal
  const toggleGameSelection = (gameId) => {
    setSelectedGamesForFolder(prev => {
      const gameIdStr = String(gameId);
      if (prev.includes(gameIdStr)) {
        return prev.filter(id => id !== gameIdStr);
      } else {
        return [...prev, gameIdStr];
      }
    });
  };

  // Handle renaming library folder
  const handleRenameLibraryFolder = (folderId) => {
    const folder = Array.isArray(libraryFolders) ? libraryFolders.find(f => f.id === folderId) : null;
    if (!folder) return;
    
    setRenamingFolderId(folderId);
    setRenameFolderName(folder.name);
    handleCloseContextMenu();
  };

  const handleSaveFolderRename = () => {
    if (!renameFolderName.trim() || !renamingFolderId) {
      setRenamingFolderId(null);
      setRenameFolderName("");
      return;
    }
    
    const updatedFolders = libraryFolders.map(f => 
      f.id === renamingFolderId ? { ...f, name: renameFolderName.trim() } : f
    );
    setLibraryFolders(updatedFolders);
    saveUserData('libraryFolders', updatedFolders);
    setRenamingFolderId(null);
    setRenameFolderName("");
    // Dispatch event to notify library page
    window.dispatchEvent(new CustomEvent('libraryFolderUpdate'));
  };

  // Handle deleting library folder (same as category)
  const handleDeleteLibraryFolder = (folderId) => {
    const updatedFolders = libraryFolders.filter(f => f.id !== folderId);
    setLibraryFolders(updatedFolders);
    saveUserData('libraryFolders', updatedFolders);
    
    // Remove from expanded state
    setExpanded(prev => {
      const newExpanded = { ...prev };
      delete newExpanded[folderId];
      return newExpanded;
    });
    
    handleCloseContextMenu();
    // Dispatch event to notify library page
    window.dispatchEvent(new CustomEvent('libraryFolderUpdate'));
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
        
        // Update downloading state based on progress
        const isDownloading = data.progress > 0 && data.progress < 100;
        setDownloadingGames((prev) => {
          if (isDownloading && !prev[gameId]) {
            return { ...prev, [gameId]: true };
          } else if (!isDownloading && prev[gameId]) {
            const newState = { ...prev };
            delete newState[gameId];
            return newState;
          }
          return prev;
        });
        
        // If progress is 100, mark as completed and remove from downloads/updates immediately
        if (data.progress >= 100) {
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
    // Stop the global download first
    stopGlobalDownload(gameId);
    
    // Clear all download states - this will notify subscribers with speed: 0, progress: 0
    clearGlobalDownloadSpeed(gameId);
    
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

  const handleDownloadClick = (gameId) => {
    const currentProgress = getProgress(gameId);
    const isPaused = getPaused(gameId);
    const isDownloading = currentProgress > 0 && currentProgress < 100;

    if (isDownloading) {
      // If downloading, toggle pause/resume
      const newPausedState = !isPaused;
      setGlobalPaused(gameId, newPausedState);
      setPausedGames((prev) => ({ ...prev, [gameId]: newPausedState }));
    } else if (currentProgress === 0 || currentProgress >= 100) {
      // Start or restart download
      startGlobalDownload(gameId, true);
      setDownloadingGames((prev) => ({ ...prev, [gameId]: true }));
      setPausedGames((prev) => ({ ...prev, [gameId]: false }));
      try { localStorage.setItem(`game_${gameId}_status`, 'download'); } catch (_) {}
    }
  };

  const handleStopDownload = (gameId) => {
    stopGlobalDownload(gameId);
    clearGlobalDownloadSpeed(gameId);
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
    try { localStorage.removeItem(`game_${gameId}_status`); } catch (_) {}
  };

  return (
    <aside 
      ref={ref}
      className={`sidebar ${isCollapsed ? "collapsed" : ""} ${isResizing ? "resizing" : ""}`}
      style={{ width: isCollapsed ? 0 : width }}
    >
      {!isCollapsed && (
        <div className="sidebar-top">
          <div className="sidebar-top-row">
            <div className="sidebar-search">
              <input
                type="text"
                placeholder="Search games..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            <button
              className={`sidebar-home-icon ${location.pathname === "/library" ? "active" : ""
                }`}
              onClick={() => navigate("/library")}
              title="Library"
            >
              <Home size={16} />
            </button>
            </div>
            <button
              className="sidebar-view-toggle"
              onClick={() => {
                const newMode = viewMode === 'list' ? 'grid' : 'list';
                setViewMode(newMode);
                try {
                  localStorage.setItem('libraryViewMode', newMode);
                } catch (_) {}
                window.dispatchEvent(new CustomEvent('libraryViewModeChanged', { detail: { mode: newMode } }));
              }}
              title={viewMode === 'list' ? 'Switch to grid view' : 'Switch to list view'}
            >
              {viewMode === 'list' ? <Grid size={14} /> : <List size={14} />}
            </button>
          </div>
        </div>
      )}

      {!isCollapsed && (
        <div 
          className="sidebar-content"
          ref={sidebarContentRef}
          onContextMenu={handleContextMenu}
        >
          {(() => {
            // Extract library games (games not in folders) to render separately
            const libraryGames = filteredGames['library'] || [];
            const otherSections = Object.entries(filteredGames).filter(([section]) => section !== 'library');
            
            // Helper function to get status color
            const getStatusColor = (status) => {
              switch (status?.toLowerCase()) {
                case 'public':
                case 'published':
                  return '#22c55e'; // Green
                case 'draft':
                  return '#f59e0b'; // Amber/Orange
                case 'private':
                  return '#6b7280'; // Gray
                case 'archived':
                  return '#9ca3af'; // Light gray
                default:
                  return '#f59e0b'; // Default to amber for draft/unknown
              }
            };

            // Helper function to render a game item
            const renderGameItem = (game) => {
              const updating = updatingGames[game.id];
              const downloading = downloadingGames[game.id] && !updating;
              const completed = completedGames[game.id];
              const playing = playingGames[game.id];
              const statusColor = game.isOwnGame && game.status ? getStatusColor(game.status) : null;

              return (
                <div
                  key={game.id}
                  className={`game-item ${currentGame === game.id && location.pathname.startsWith('/game/') ? "active" : ""
                    } ${updating ? "updating" : ""} ${downloading ? "downloading" : ""} ${completed === true ? "completed-download" : ""} ${completed === "update" ? "completed-update" : ""} ${playing ? "playing" : ""}`}
                  onClick={() => handleGameClick(game.id)}
                >
                  <div className="game-row">
                    <div className="game-clickable">
                      <div className="game-icon" style={{ position: 'relative' }}>
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
                        {/* Status indicator dot for own games */}
                        {game.isOwnGame && statusColor && (
                          <span 
                            style={{
                              position: 'absolute',
                              bottom: '-2px',
                              right: '-2px',
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              backgroundColor: statusColor,
                              border: '2px solid var(--bg-primary)',
                              boxSizing: 'border-box'
                            }}
                            title={game.status || 'draft'}
                          />
                        )}
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
            };

            // Check if there are any folders (user-created folders)
            const hasFolders = Array.isArray(libraryFolders) && libraryFolders.length > 0;
            
            return (
              <>
                {/* Render library games at the same level as folders */}
                {viewMode === 'grid' ? (
                  <div className="sidebar-games-grid">
                    {libraryGames
                      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                      .map((game) => {
                        const updating = updatingGames[game.id];
                        const downloading = downloadingGames[game.id] && !updating;
                        const completed = completedGames[game.id];
                        const playing = playingGames[game.id];
                        const statusColor = game.isOwnGame && game.status ? getStatusColor(game.status) : null;
                        
                        return (
                          <div
                            key={game.id}
                            className={`sidebar-game-grid-item ${currentGame === game.id && location.pathname.startsWith('/game/') ? "active" : ""
                              } ${updating ? "updating" : ""} ${downloading ? "downloading" : ""} ${completed === true ? "completed-download" : ""} ${completed === "update" ? "completed-update" : ""} ${playing ? "playing" : ""}`}
                            onClick={() => handleGameClick(game.id)}
                          >
                            <div className="sidebar-game-grid-icon" style={{ position: 'relative' }}>
                              {game.logo ? (
                                <img 
                                  src={game.logo}
                                  alt={game.name}
                                  onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }}
                                />
                              ) : null}
                              <span style={{ display: game.logo ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', fontSize: '16px', fontWeight: 700, color: 'var(--accent-primary)' }}>
                                {(game.name || '?').charAt(0).toUpperCase()}
                              </span>
                              {game.isOwnGame && statusColor && (
                                <span 
                                  style={{
                                    position: 'absolute',
                                    bottom: '4px',
                                    right: '4px',
                                    width: '10px',
                                    height: '10px',
                                    borderRadius: '50%',
                                    backgroundColor: statusColor,
                                    border: '2px solid var(--bg-primary)',
                                    boxSizing: 'border-box'
                                  }}
                                  title={game.status || 'draft'}
                                />
                              )}
                            </div>
                            <div className="sidebar-game-grid-name">{game.name}</div>
                            {(downloading || updating) && (
                              <div className="sidebar-game-grid-progress" style={{
                                width: `${sidebarProgress[game.id] || 0}%`
                              }} />
                            )}
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  libraryGames
                    .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                    .map(renderGameItem)
                )}
                
                {/* Empty state when no folders exist and no library games */}
                {!hasFolders && libraryGames.length === 0 && (
                  <div className="sidebar-empty-state">
                    <p>There is nothing yet</p>
                  </div>
                )}
                
                {/* Render folders and other sections */}
                {otherSections
                  .sort(([a], [b]) => {
                    // Always put "myOwn" first
                    if (a === 'myOwn') return -1;
                    if (b === 'myOwn') return 1;
                    // Then folders/categories (after myOwn, before recent)
                    const aIsFolder = libraryFolders.some(f => f.id === a);
                    const bIsFolder = libraryFolders.some(f => f.id === b);
                    if (aIsFolder && !bIsFolder && b !== 'recent') return -1;
                    if (!aIsFolder && bIsFolder && a !== 'recent') return 1;
                    if (aIsFolder && bIsFolder) {
                      const aFolder = libraryFolders.find(f => f.id === a);
                      const bFolder = libraryFolders.find(f => f.id === b);
                      if (aFolder && bFolder) return aFolder.name.localeCompare(bFolder.name);
                      return a.localeCompare(b);
                    }
                    // Then "recent"
                    if (a === 'recent') return -1;
                    if (b === 'recent') return 1;
                    // Then all other categories alphabetically
                    return a.localeCompare(b);
                  })
                  .map(([section, games]) => {
                    // Categories and folders are the same - use libraryFolders
                    const folder = Array.isArray(libraryFolders) ? libraryFolders.find(f => f.id === section) : null;
                    let categoryName;
                    if (folder) {
                      categoryName = folder.name;
                    } else if (section === 'myOwn') {
                      categoryName = 'MY OWN GAMES';
                    } else {
                      categoryName = section.toUpperCase();
                    }
                    
                    // Only show "My Own Games" and "Recent" sections when there are games in them
                    // Show folders/categories if they exist, even if empty
                    // Don't show recent or myOwn if they're empty
                    if (section === 'recent' || section === 'myOwn') {
                      if (games.length === 0) return null;
                    }
                    // For folders, always show them
                    return games.length > 0 || folder ? (
                      <div key={section} className="sidebar-section">
                        {(renamingFolderId && folder && folder.id === section) ? (
                          <div className="sidebar-rename-category">
                            <div className="add-category-input-wrapper">
                              <input
                                type="text"
                                value={renameFolderName}
                                onChange={(e) => setRenameFolderName(e.target.value)}
                                placeholder="Ordnername eingeben..."
                                className="add-category-input"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleSaveFolderRename();
                                  } else if (e.key === 'Escape') {
                                    setRenamingFolderId(null);
                                    setRenameFolderName("");
                                  }
                                }}
                                autoFocus
                              />
                              <div className="add-category-actions">
                                <button
                                  className="add-category-btn add-category-confirm"
                                  onClick={handleSaveFolderRename}
                                  disabled={!renameFolderName.trim()}
                                  title="Speichern (Enter)"
                                >
                                  <CheckCircle size={14} />
                                </button>
                                <button
                                  className="add-category-btn add-category-cancel"
                                  onClick={() => {
                                    setRenamingFolderId(null);
                                    setRenameFolderName("");
                                  }}
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
                              // Show context menu for folders/categories (they are the same)
                              if (folder && section !== 'recent' && section !== 'myOwn') {
                                e.preventDefault();
                                e.stopPropagation();
                                handleFolderContextMenu(e, folder.id);
                              }
                            }}
                          >
                            {expanded[section] ? (
                              <FolderOpen size={16} className="section-folder-icon" />
                            ) : (
                              <Folder size={16} className="section-folder-icon" />
                            )}
                            {categoryName} ({games.length})
                          </button>
                        )}

                        {expanded[section] && (
                          <div 
                            className="section-list"
                            ref={(el) => {
                              if (el) sectionListRefs.current[section] = el;
                              else delete sectionListRefs.current[section];
                            }}
                          >
                            {games.map(renderGameItem)}
                          </div>
                        )}
                      </div>
                    ) : null;
                  })}
              </>
            );
          })()}
          
          {/* Add Folder Input Field */}
          {showAddFolderInput && (
            <div className="sidebar-add-category">
              <div className="add-category-input-wrapper">
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Ordnername eingeben..."
                  className="add-category-input"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCreateLibraryFolder();
                    } else if (e.key === 'Escape') {
                      setShowAddFolderInput(false);
                      setNewFolderName("");
                    }
                  }}
                  autoFocus
                />
                <div className="add-category-actions">
                  <button
                    className="add-category-btn add-category-confirm"
                    onClick={handleCreateLibraryFolder}
                    disabled={!newFolderName.trim()}
                    title="Hinzufügen (Enter)"
                  >
                    <CheckCircle size={14} />
                  </button>
                  <button
                    className="add-category-btn add-category-cancel"
                    onClick={() => {
                      setShowAddFolderInput(false);
                      setNewFolderName("");
                    }}
                    title="Abbrechen (Esc)"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}
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
          {selectedFolderId ? (
            // Context menu for a library folder
            <>
              {Array.isArray(libraryFolders) && libraryFolders.find(f => f.id === selectedFolderId) ? (
                <>
                  <button
                    className="context-menu-item"
                    onClick={() => {
                      handleRenameLibraryFolder(selectedFolderId);
                      setContextMenuPosition(null);
                    }}
                  >
                    <Edit2 size={14} />
                    <span>Ordner umbenennen</span>
                  </button>
                  <div className="context-menu-divider" />
                  <button
                    className="context-menu-item context-menu-item-danger"
                    onClick={() => {
                      handleDeleteLibraryFolder(selectedFolderId);
                      setContextMenuPosition(null);
                    }}
                  >
                    <Trash2 size={14} />
                    <span>Ordner löschen</span>
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
                  setShowAddFolderInput(true);
                  setContextMenuPosition(null);
                }}
              >
                <FolderPlus size={14} />
                <span>Ordner hinzufügen</span>
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
                      
                      // Calculate horizontal position - show to the right of the sidebar
                      const sidebarRight = rect.right;
                      const rightSpace = window.innerWidth - sidebarRight;
                      let left = sidebarRight + 8;
                      
                      // Check if menu would overflow to the right
                      if (rightSpace < menuWidth + 8) {
                        // Show to the left of the sidebar instead
                        left = rect.left - menuWidth - 8;
                        // Ensure it doesn't go off-screen to the left
                        if (left < 8) {
                          left = 8;
                        }
                      }
                      
                      // Calculate vertical position - align top of menu with top of item
                      let top = rect.top;
                      
                      // Adjust if menu would overflow at the bottom
                      if (top + menuHeight > window.innerHeight - 8) {
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
            {updateAvailable ? (
              <button
                className="footer-update-btn"
                onClick={async () => {
                  if (updateDownloaded) {
                    // Install update
                    if (window.electronAPI && window.electronAPI.installUpdate) {
                      await window.electronAPI.installUpdate();
                    }
                  } else if (!updateDownloading) {
                    // Download update
                    setUpdateDownloading(true);
                    if (window.electronAPI && window.electronAPI.downloadUpdate) {
                      await window.electronAPI.downloadUpdate();
                    }
                  }
                }}
                disabled={updateDownloading && !updateDownloaded}
                title={updateDownloaded ? 'Install update and restart' : updateDownloading ? `Downloading update... ${Math.round(updateProgress)}%` : 'Download update'}
              >
                {updateDownloaded ? (
                  <>
                    <CheckCircle size={14} />
                    <span>Install Update</span>
                  </>
                ) : updateDownloading ? (
                  <>
                    <RefreshCw size={14} className="spinning" />
                    <span>{Math.round(updateProgress)}%</span>
                  </>
                ) : (
                  <>
                    <ArrowDownCircle size={14} />
                    <span>Update Available</span>
                  </>
                )}
              </button>
            ) : (
              <span className="footer-version">v{appVersion}</span>
            )}
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

      {/* Game Selection Modal for Folder Creation */}
      {showGameSelectionModal && (() => {
        // Get available games for selection (library games - games not in myOwn and not in any folder)
        const availableGames = (allGames['library'] || []).filter(game => {
          // Don't include games that are already in folders
          const gameId = String(game.id);
          const isInFolder = libraryFolders.some(folder => 
            Array.isArray(folder.gameIds) && folder.gameIds.includes(gameId)
          );
          return !isInFolder;
        });
        
        return createPortal(
          <div className="properties-modal-overlay" onClick={handleCancelFolderCreation}>
            <div className="switch-game-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', maxHeight: '80vh' }}>
              <div className="switch-game-modal-header">
                <h2>Select Games for "{newFolderName}"</h2>
                <button className="switch-game-modal-close" onClick={handleCancelFolderCreation}>
                  <X size={20} />
                </button>
              </div>
              <div className="switch-game-modal-content" style={{ maxHeight: '50vh', overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '200px' }}>
                {availableGames.length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--accent-danger)', padding: '20px', fontSize: '14px', fontWeight: 500 }}>
                    No games available to add to folder
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {availableGames.map(game => {
                      const gameId = String(game.id);
                      const isSelected = selectedGamesForFolder.includes(gameId);
                      return (
                        <div
                          key={game.id}
                          onClick={() => toggleGameSelection(game.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '12px',
                            borderRadius: '8px',
                            background: isSelected ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                            border: `1px solid ${isSelected ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.1)'}`,
                            cursor: 'pointer',
                            transition: 'none'
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                            }
                          }}
                        >
                          <div
                            style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '4px',
                              border: `2px solid ${isSelected ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.3)'}`,
                              background: isSelected ? 'var(--accent-primary)' : 'transparent',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}
                          >
                            {isSelected && <CheckCircle size={14} style={{ color: 'white' }} fill="white" />}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                            {game.logo && (
                              <img
                                src={game.logo}
                                alt={game.name}
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '4px',
                                  objectFit: 'cover',
                                  flexShrink: 0
                                }}
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              />
                            )}
                            <span style={{ color: 'var(--text-primary)', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {game.name}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="switch-game-modal-actions">
                <button 
                  className="switch-game-modal-btn switch-game-modal-btn-cancel" 
                  onClick={handleCancelFolderCreation}
                >
                  Cancel
                </button>
                <button 
                  className="switch-game-modal-btn switch-game-modal-btn-confirm" 
                  onClick={handleConfirmFolderCreation}
                  disabled={availableGames.length === 0 || selectedGamesForFolder.length === 0}
                >
                  Create Folder ({selectedGamesForFolder.length} {selectedGamesForFolder.length === 1 ? 'game' : 'games'})
                </button>
              </div>
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
});

export default SideBar;
