import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, Folder, FolderOpen, Plus, Edit2, Trash2, X, Grid, ChevronLeft, ChevronRight } from 'lucide-react';
import { getUserData, saveUserData, getUserScopedKey } from '../utils/UserDataManager';
import './Library.css';

const Library = () => {
  const navigate = useNavigate();
  const [iconSize, setIconSize] = useState(180);

  // Rating removed in favor of user-specific stats

  const [customGames, setCustomGames] = useState([]);
  const [folders, setFolders] = useState([]);
  const [expandedFolders, setExpandedFolders] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('expandedFolders') || '[]');
    } catch (_) {
      return [];
    }
  });
  const [editingFolder, setEditingFolder] = useState(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [playingMap, setPlayingMap] = useState(() => {
    try { return JSON.parse(localStorage.getItem('playingGames') || '{}'); } catch (_) { return {}; }
  });
  const [activeFolder, setActiveFolder] = useState(null); // Track which folder is currently filtering
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const foldersScrollRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const hasMovedRef = useRef(false);
  const dragStartFolderRef = useRef(null);

  // Check scroll position and update arrow visibility
  const checkScrollPosition = useCallback(() => {
    if (foldersScrollRef.current) {
      const container = foldersScrollRef.current;
      const { scrollLeft, scrollWidth, clientWidth } = container;
      const canScrollLeftValue = scrollLeft > 1; // Use 1px threshold for better detection
      const canScrollRightValue = scrollLeft < scrollWidth - clientWidth - 1;
      setCanScrollLeft(canScrollLeftValue);
      setCanScrollRight(canScrollRightValue);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        // Load user-specific custom games
        const userGames = await getUserData('customGames', []);
        // Ensure it's an array
        setCustomGames(Array.isArray(userGames) ? userGames : []);
      } catch (_) {
        setCustomGames([]);
      }
    };
    
    const loadFolders = async () => {
      try {
        const userFolders = await getUserData('libraryFolders', []);
        // Ensure it's an array
        setFolders(Array.isArray(userFolders) ? userFolders : []);
      } catch (_) {
        setFolders([]);
      }
    };
    
    load();
    loadFolders();
    
    const handler = () => load();
    window.addEventListener('customGameUpdate', handler);
    
    const folderHandler = () => loadFolders();
    window.addEventListener('libraryFolderUpdate', folderHandler);
    
    // Listen for storage changes for this user's games
    const handleStorageChange = (e) => {
      if (e.key === getUserScopedKey('customGames')) {
        load();
      } else if (e.key === getUserScopedKey('libraryFolders')) {
        loadFolders();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Also reload when user changes
    const handleUserChange = () => {
      load();
      loadFolders();
    };
    window.addEventListener('user-changed', handleUserChange);
    
    // Listen for game play/stop to reflect "Currently playing"
    const onGameStatus = () => {
      try { setPlayingMap(JSON.parse(localStorage.getItem('playingGames') || '{}')); } catch (_) {}
    };
    window.addEventListener('gameStatusChanged', onGameStatus);

    return () => {
      window.removeEventListener('customGameUpdate', handler);
      window.removeEventListener('libraryFolderUpdate', folderHandler);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('user-changed', handleUserChange);
      window.removeEventListener('gameStatusChanged', onGameStatus);
    };
  }, []);


  const handleScrollLeft = () => {
    if (foldersScrollRef.current) {
      foldersScrollRef.current.scrollBy({ left: -200, behavior: 'smooth' });
      setTimeout(checkScrollPosition, 300);
    }
  };

  const handleScrollRight = () => {
    if (foldersScrollRef.current) {
      foldersScrollRef.current.scrollBy({ left: 200, behavior: 'smooth' });
      setTimeout(checkScrollPosition, 300);
    }
  };

  const handleMouseDown = (e) => {
    // Don't start dragging if clicking on a button (but allow on folder cards)
    if (e.target.closest('button') && !e.target.closest('.library-folder-card')) {
      return;
    }
    if (!foldersScrollRef.current) return;
    
    const folderCard = e.target.closest('.library-folder-card');
    if (folderCard) {
      dragStartFolderRef.current = folderCard;
    } else {
      dragStartFolderRef.current = null;
    }
    
    const container = foldersScrollRef.current;
    const rect = container.getBoundingClientRect();
    setIsDragging(true);
    hasMovedRef.current = false;
    setStartX(e.pageX - rect.left);
    setScrollLeft(container.scrollLeft);
    container.style.cursor = 'grabbing';
    container.style.userSelect = 'none';
  };

  useEffect(() => {
    const handleGlobalMouseMove = (e) => {
      if (!isDragging || !foldersScrollRef.current) return;
      
      const container = foldersScrollRef.current;
      const rect = container.getBoundingClientRect();
      const x = e.pageX - rect.left;
      const walk = (x - startX) * 1; // 1:1 scroll speed to match mouse movement
      
      // Check if mouse has moved significantly (more than 5px)
      if (Math.abs(walk) > 5) {
        if (!hasMovedRef.current) {
          hasMovedRef.current = true;
          // Prevent folder click if we're dragging
          if (dragStartFolderRef.current) {
            dragStartFolderRef.current.style.pointerEvents = 'none';
          }
        }
        e.preventDefault();
        container.scrollLeft = scrollLeft - walk;
        checkScrollPosition();
      }
    };

    const handleGlobalMouseUp = (e) => {
      if (isDragging) {
        // Re-enable pointer events on folder cards
        if (dragStartFolderRef.current) {
          if (hasMovedRef.current) {
            // Prevent click if we dragged
            e.preventDefault();
            e.stopPropagation();
            // Delay to prevent click event
            setTimeout(() => {
              if (dragStartFolderRef.current) {
                dragStartFolderRef.current.style.pointerEvents = '';
              }
            }, 100);
          } else {
            dragStartFolderRef.current.style.pointerEvents = '';
          }
          dragStartFolderRef.current = null;
        }
        
        setIsDragging(false);
        hasMovedRef.current = false;
        if (foldersScrollRef.current) {
          foldersScrollRef.current.style.cursor = 'grab';
          foldersScrollRef.current.style.userSelect = '';
        }
      }
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleGlobalMouseMove, { passive: false });
      document.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, startX, scrollLeft, checkScrollPosition]);

  // Base games will be loaded from localStorage or API
  const baseGames = [];

  const handleGameClick = (gameId) => {
    navigate(`/game/${gameId}`);
  };

  const handleCommentsClick = (e, gameId) => {
    e.stopPropagation();
    sessionStorage.setItem('scrollToComments', 'true');
    navigate(`/game/${gameId}`);
  };

  // Folder management functions
  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    
    const newFolder = {
      id: `folder-${Date.now()}`,
      name: newFolderName.trim(),
      gameIds: [],
      createdAt: Date.now()
    };
    
    const currentFolders = Array.isArray(folders) ? folders : [];
    const updatedFolders = [...currentFolders, newFolder];
    setFolders(updatedFolders);
    saveUserData('libraryFolders', updatedFolders);
    setNewFolderName('');
    setShowCreateFolder(false);
    // Dispatch event to notify sidebar
    window.dispatchEvent(new CustomEvent('libraryFolderUpdate'));
  };

  const handleStartEditFolder = (folderId, currentName) => {
    setEditingFolder(folderId);
    setNewFolderName(currentName);
  };

  const handleCancelEditFolder = () => {
    setEditingFolder(null);
    setNewFolderName('');
  };

  const handleEditFolder = (folderId, newName) => {
    if (!newName.trim()) return;
    if (!Array.isArray(folders)) return;
    
    const updatedFolders = folders.map(f => 
      f.id === folderId ? { ...f, name: newName.trim() } : f
    );
    setFolders(updatedFolders);
    saveUserData('libraryFolders', updatedFolders);
    setEditingFolder(null);
    setNewFolderName('');
    // Dispatch event to notify sidebar
    window.dispatchEvent(new CustomEvent('libraryFolderUpdate'));
  };

  const handleDeleteFolder = (folderId) => {
    if (!Array.isArray(folders)) return;
    
    const updatedFolders = folders.filter(f => f.id !== folderId);
    setFolders(updatedFolders);
    saveUserData('libraryFolders', updatedFolders);
    // Remove from expanded folders if it was expanded
    setExpandedFolders(prev => prev.filter(id => id !== folderId));
    // Dispatch event to notify sidebar
    window.dispatchEvent(new CustomEvent('libraryFolderUpdate'));
  };

  const handleFolderClick = (folder) => {
    // If clicking the same folder, clear the filter
    if (activeFolder && activeFolder.id === folder.id) {
      setActiveFolder(null);
    } else {
      setActiveFolder(folder);
    }
  };

  const handleAddGameToFolder = (gameId, folderId) => {
    if (!Array.isArray(folders)) return;
    
    const updatedFolders = folders.map(f => {
      if (f.id === folderId) {
        const gameIds = Array.isArray(f.gameIds) ? f.gameIds : [];
        if (!gameIds.includes(gameId)) {
          return { ...f, gameIds: [...gameIds, gameId] };
        }
      }
      return f;
    });
    setFolders(updatedFolders);
    saveUserData('libraryFolders', updatedFolders);
    // Dispatch event to notify sidebar
    window.dispatchEvent(new CustomEvent('libraryFolderUpdate'));
  };

  const handleRemoveGameFromFolder = (gameId, folderId) => {
    if (!Array.isArray(folders)) return;
    
    const updatedFolders = folders.map(f => {
      if (f.id === folderId) {
        const gameIds = Array.isArray(f.gameIds) ? f.gameIds : [];
        return { ...f, gameIds: gameIds.filter(id => id !== gameId) };
      }
      return f;
    });
    setFolders(updatedFolders);
    saveUserData('libraryFolders', updatedFolders);
    // Dispatch event to notify sidebar
    window.dispatchEvent(new CustomEvent('libraryFolderUpdate'));
  };

  const sliderSteps = [140, 160, 180, 200, 220];
  
  const handleSliderChange = (value) => {
    // Find the nearest step
    const step = sliderSteps.reduce((prev, curr) => 
      Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev
    );
    setIconSize(step);
  };

  // Format last played time with relative stages
  const formatLastPlayed = (timestamp) => {
    if (!timestamp) return 'never';
    
    try {
      // Support both old format (lastPlayed string) and new format (lastPlayedTimestamp ISO string)
      const playedDate = typeof timestamp === 'string' && timestamp.includes('T') 
        ? new Date(timestamp) 
        : typeof timestamp === 'string' 
        ? new Date(timestamp) // Try parsing old format
        : new Date(timestamp);
      
      if (isNaN(playedDate.getTime())) return 'never';
      
      const now = new Date();
      const diffMs = now - playedDate;
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHours = Math.floor(diffMin / 60);
      const diffDays = Math.floor(diffHours / 24);
      
      // Just now (< 1 minute)
      if (diffSec < 60) return 'just now';
      
      // Minutes: show specific thresholds, then exact minutes
      if (diffMin < 60) {
        if (diffMin <= 5) return '5 min ago';
        if (diffMin <= 10) return '10 min ago';
        if (diffMin <= 30) return '30 min ago';
        return `${diffMin} min ago`;
      }
      
      // Hours: "1h ago", "2h ago", etc.
      if (diffHours < 24) {
        return `${diffHours}h ago`;
      }
      
      // Yesterday (24 hours to less than 48 hours)
      if (diffHours >= 24 && diffHours < 48) {
        return 'yesterday';
      }
      
      // After 48 hours: show date
      const playedYear = playedDate.getFullYear();
      const currentYear = now.getFullYear();
      
      // Month names
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const day = playedDate.getDate();
      const month = monthNames[playedDate.getMonth()];
      
      // Same year: "DD. MM"
      if (playedYear === currentYear) {
        return `${day}. ${month}`;
      }
      
      // Different year: "DD. MM. YYYY"
      return `${day}. ${month}. ${playedYear}`;
    } catch (error) {
      return 'never';
    }
  };

  // Format total playtime from seconds to a compact string
  const formatPlaytime = (seconds) => {
    const totalSec = Number(seconds || 0);
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    if (hours <= 0) return `${minutes}m`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
  };

  const LibraryFolderCard = ({ folder, iconSize, games, onToggle, onEdit, onDelete, onAddGame, onRemoveGame, editingFolderId, editingFolderName, onStartEdit, onCancelEdit, onUpdateEditingName, activeFolder }) => {
    const folderGames = games.filter(g => folder.gameIds.includes(g.id));
    const previewGames = folderGames.slice(0, 6); // First 6 games for preview
    const scaleFactor = iconSize / 180;
    const fontSize = Math.round(14 * scaleFactor);
    const iconSizeScaled = Math.round(14 * scaleFactor);
    const isActive = activeFolder && activeFolder.id === folder.id;

    const handleFolderClick = (e) => {
      e.stopPropagation();
      if (editingFolderId !== folder.id) {
        onToggle(folder);
      }
    };

    return (
      <div className="library-folder-wrapper">
        <div className={`library-folder-card ${isActive ? 'active' : ''}`} onClick={handleFolderClick}>
          <div className="library-folder-preview">
            {previewGames.length > 0 ? (
              <div className="library-folder-preview-grid">
                {previewGames.map((game) => (
                  <div key={game.id} className="library-folder-preview-banner">
                    <img 
                      src={game.banner} 
                      alt={game.name}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        if (e.target.nextSibling) {
                          e.target.nextSibling.style.display = 'flex';
                        }
                      }}
                    />
                    <div className="library-folder-banner-placeholder" style={{display: 'none'}}>
                      <Folder size={16} />
                    </div>
                  </div>
                ))}
                {folderGames.length > 6 && (
                  <div className="library-folder-preview-more">
                    +{folderGames.length - 6}
                  </div>
                )}
              </div>
            ) : (
              <div className="library-folder-empty-preview">
                <Folder size={32} />
                <span>No games</span>
              </div>
            )}
          </div>
          <div className="library-folder-actions-overlay" onClick={(e) => e.stopPropagation()}>
            {editingFolderId !== folder.id && !folder.isSpecial && (
              <>
                <button
                  className="folder-action-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStartEdit(folder.id, folder.name);
                  }}
                  title="Rename folder"
                >
                  <Edit2 size={12} />
                </button>
                <button
                  className="folder-action-btn delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(folder.id);
                  }}
                  title="Delete folder"
                >
                  <Trash2 size={12} />
                </button>
              </>
            )}
          </div>
        </div>
        <div className="library-folder-footer">
          <div className="library-folder-name">
            {editingFolderId === folder.id && !folder.isSpecial ? (
              <input
                type="text"
                value={editingFolderName}
                onChange={(e) => onUpdateEditingName(e.target.value)}
                onBlur={() => {
                  if (editingFolderName.trim()) {
                    onEdit(folder.id, editingFolderName);
                  } else {
                    onCancelEdit();
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (editingFolderName.trim()) {
                      onEdit(folder.id, editingFolderName);
                    }
                  } else if (e.key === 'Escape') {
                    onCancelEdit();
                  }
                }}
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span>{folder.name}</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  const LibraryGameCard = ({ game, iconSize, folders, onAddToFolder }) => {
    const cardRef = useRef(null);
    const [tilt, setTilt] = useState({ x: 0, y: 0 });
    const [averageColor, setAverageColor] = useState(null);
    const [isHovered, setIsHovered] = useState(false);

    const handleMouseMove = (e) => {
      const rect = cardRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      // Fixed: rotate in the direction opposite to the mouse
      const rotateX = (y - centerY) / 25;
      const rotateY = -(x - centerX) / 25;
      
      setTilt({ x: rotateX, y: rotateY });
    };

    const handleMouseLeave = () => {
      setTilt({ x: 0, y: 0 });
      setIsHovered(false);
    };

    const handleMouseEnter = () => {
      setIsHovered(true);
    };

    // Extract average color from banner image
    useEffect(() => {
      if (!game.banner || averageColor) return;

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 50; // Small size for performance
          canvas.height = 50;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          
          ctx.drawImage(img, 0, 0, 50, 50);
          const imageData = ctx.getImageData(0, 0, 50, 50);
          const data = imageData.data;
          
          let r = 0, g = 0, b = 0, count = 0;
          for (let i = 0; i < data.length; i += 4) {
            r += data[i];
            g += data[i + 1];
            b += data[i + 2];
            count++;
          }
          
          const avgR = Math.round(r / count);
          const avgG = Math.round(g / count);
          const avgB = Math.round(b / count);
          
          setAverageColor({ r: avgR, g: avgG, b: avgB });
        } catch (error) {
          console.error('Error extracting color:', error);
        }
      };
      img.onerror = () => {
        // Fallback to default color if image fails to load
        setAverageColor({ r: 88, g: 204, b: 255 }); // Default cyan
      };
      img.src = game.banner;
    }, [game.banner, averageColor]);

    // Calculate sizes based on icon size (scale factor)
    const scaleFactor = iconSize / 180; // 180 is the base/default size
    const fontSize = Math.round(14 * scaleFactor); // larger playtime
    const iconSizeScaled = Math.round(14 * scaleFactor);

    // Calculate shadow color based on average color
    // Create a shadow that matches the card's 2:3 aspect ratio (taller than wide)
    const shadowColor = averageColor 
      ? `rgba(${averageColor.r}, ${averageColor.g}, ${averageColor.b}, ${isHovered ? 0.5 : 0})`
      : 'rgba(0, 0, 0, 0.5)';

    // Create shadow that better matches the portrait card shape (2:3 aspect ratio)
    // Vertical shadow with more spread on y-axis to match the taller card
    const baseShadow = '0 4px 16px rgba(0, 0, 0, 0.3)';
    const coloredShadow = isHovered && averageColor
      ? `0 16px 60px 2px ${shadowColor}, 0 8px 30px 1px ${shadowColor}`
      : '';

    return (
      <div 
        ref={cardRef}
        className={`library-game-card ${playingMap[game.id] ? 'currently-playing' : ''}`}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transition: 'none',
          boxShadow: coloredShadow ? `${coloredShadow}, ${baseShadow}` : baseShadow
        }}
      >
        <div className="library-game-banner" onClick={() => handleGameClick(game.id)}>
          <img src={game.banner} alt={game.name} onError={(e) => {
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'block';
          }} />
          <div className="library-banner-placeholder" style={{display: 'none'}}>
            <div className="placeholder-icon">🎮</div>
          </div>
          <div className="library-achievements-badge" title="Achievements">
            <Award size={iconSizeScaled} />
            <span className="achievements-count">{(game.achievementsUnlocked ?? 0)}/{(game.totalAchievements ?? 0)}</span>
          </div>
        </div>
          <div className="library-card-footer">
          <div className="library-play-meta">
            <span className="playtime" style={{ fontSize: `${fontSize}px` }}>{formatPlaytime(game.playtimeSeconds) || game.playTime || '0h'}</span>
            <span
              className={`last-played ${playingMap[game.id] ? 'playing' : ''}`}
              style={{ fontSize: `${Math.max(12, fontSize - 1)}px` }}
            >
              {playingMap[game.id]
                ? 'Currently playing'
                : `Last played: ${formatLastPlayed(game.lastPlayedTimestamp || game.lastPlayed)}`}
            </span>
          </div>
          {/* comments button removed */}
        </div>
      </div>
    );
  };

  // Merge base games with custom games for display
  const mergedGames = [
    ...baseGames,
    ...customGames.map(g => ({
      id: g.gameId,
      name: g.name || 'Untitled Game',
      banner: g.banner || g.bannerImage || g.fullFormData?.bannerImage || g.card || g.cardImage || '/public/images/games/pathline-banner.jpg',
      playtimeSeconds: g.playtimeSeconds || 0,
      playTime: g.playtime || '0h',
      lastPlayedTimestamp: g.lastPlayedTimestamp || g.lastPlayed || null, // Support both old and new format
      lastPlayed: g.lastPlayed || null, // Keep for backward compatibility
      isInstalled: true,
      achievementsUnlocked: g.achievementsUnlocked || 0,
      totalAchievements: g.totalAchievements || 0,
      commentCount: g.commentCount || 0,
    }))
  ];

  // Create special folders: "Recent" and "My Own Games"
  // Recent: games sorted by lastPlayedTimestamp (most recent first)
  const recentGames = [...mergedGames]
    .filter(g => g.lastPlayedTimestamp || g.lastPlayed)
    .sort((a, b) => {
      const aTime = a.lastPlayedTimestamp || a.lastPlayed;
      const bTime = b.lastPlayedTimestamp || b.lastPlayed;
      const aDate = new Date(aTime);
      const bDate = new Date(bTime);
      return bDate - aDate; // Most recent first
    })
    .slice(0, 20) // Limit to 20 most recent
    .map(g => g.id);

  const recentFolder = {
    id: 'recent',
    name: 'Recent',
    gameIds: recentGames,
    createdAt: 0,
    isSpecial: true // Mark as special folder that cannot be deleted/edited
  };

  // My Own Games: only games created by the current user (isOwnGame: true) that are published
  const myOwnGames = customGames.filter(g => {
    const isOwnGame = g.isOwnGame === true;
    const status = g.status || g.fullFormData?.status || 'draft';
    const isPublished = status === 'public' || status === 'published';
    return isOwnGame && isPublished;
  });
  
  const myOwnGamesFolder = {
    id: 'myOwn',
    name: 'My Own Games',
    gameIds: myOwnGames.map(g => g.gameId),
    createdAt: 0,
    isSpecial: true // Mark as special folder that cannot be deleted/edited
  };

  // Get games that are not in any user-created folder (excluding special folders)
  // Games in "Recent" or "My Own Games" should still be shown at root level
  const gamesInUserFolders = new Set();
  
  // Add games from user-created folders only (not special folders)
  // Ensure folders is an array before iterating
  if (Array.isArray(folders)) {
    folders.forEach(folder => {
      if (!folder.isSpecial && Array.isArray(folder.gameIds)) {
        folder.gameIds.forEach(gameId => gamesInUserFolders.add(String(gameId)));
      }
    });
  }
  
  // Filter out games that are in user-created folders
  // Games in "Recent" or "My Own Games" will still be shown
  const gamesNotInFolders = mergedGames.filter(g => !gamesInUserFolders.has(String(g.id)));

  // Filter games based on active folder
  const displayedGames = activeFolder
    ? mergedGames.filter(g => activeFolder.gameIds.includes(g.id))
    : gamesNotInFolders;

  // Combine special folders and regular folders
  // Only include "My Own Games" if there are published games
  // Ensure folders is an array before spreading
  const allFolders = [
    recentFolder,
    ...(myOwnGamesFolder.gameIds.length > 0 ? [myOwnGamesFolder] : []),
    ...(Array.isArray(folders) ? folders : [])
  ];

  useEffect(() => {
    // Delay to ensure DOM is updated after content changes
    const timeoutId = setTimeout(() => {
      checkScrollPosition();
    }, 150);
    
    const container = foldersScrollRef.current;
    if (container) {
      container.addEventListener('scroll', checkScrollPosition);
      window.addEventListener('resize', checkScrollPosition);
    }
    return () => {
      clearTimeout(timeoutId);
      if (container) {
        container.removeEventListener('scroll', checkScrollPosition);
      }
      window.removeEventListener('resize', checkScrollPosition);
    };
  }, [allFolders.length, folders.length, checkScrollPosition]);

  return (
    <div className="library-page">

      {showCreateFolder && (
        <div className="library-create-folder-modal">
          <div className="library-create-folder-content">
            <h3>Create New Folder</h3>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCreateFolder();
                } else if (e.key === 'Escape') {
                  setShowCreateFolder(false);
                  setNewFolderName('');
                }
              }}
              placeholder="Folder name"
              autoFocus
            />
            <div className="library-create-folder-actions">
              <button onClick={handleCreateFolder}>Create</button>
              <button onClick={() => {
                setShowCreateFolder(false);
                setNewFolderName('');
              }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="library-folders-wrapper">
        <button
          className={`library-all-games-btn ${!activeFolder ? 'active' : ''}`}
          onClick={() => setActiveFolder(null)}
          title="Show all games"
        >
          <div className="library-all-games-icon">
            <Grid size={32} />
          </div>
          <div className="library-all-games-label">All Games</div>
        </button>
        <div className="library-folders-scroll-wrapper">
          {canScrollLeft && (
            <button
              className="library-scroll-arrow left"
              onClick={handleScrollLeft}
              title="Scroll left"
            >
              <ChevronLeft size={20} />
            </button>
          )}
          <div 
            className="library-folders-scroll" 
            ref={foldersScrollRef}
            onMouseDown={handleMouseDown}
          >
            <div className="library-folders-container">
              {allFolders.length > 0 && allFolders.map((folder) => (
                <LibraryFolderCard
                  key={folder.id}
                  folder={folder}
                  iconSize={iconSize}
                  games={mergedGames}
                  onToggle={handleFolderClick}
                  onEdit={handleEditFolder}
                  onDelete={handleDeleteFolder}
                  onAddGame={handleAddGameToFolder}
                  onRemoveGame={handleRemoveGameFromFolder}
                  editingFolderId={editingFolder}
                  editingFolderName={newFolderName}
                  onStartEdit={handleStartEditFolder}
                  onCancelEdit={handleCancelEditFolder}
                  onUpdateEditingName={setNewFolderName}
                  activeFolder={activeFolder}
                />
              ))}
            </div>
          </div>
          {canScrollRight && (
            <button
              className="library-scroll-arrow right"
              onClick={handleScrollRight}
              title="Scroll right"
            >
              <ChevronRight size={20} />
            </button>
          )}
        </div>
        <button
          className="library-create-folder-box"
          onClick={() => {
            setShowCreateFolder(true);
            setNewFolderName('');
          }}
          title="Create folder"
        >
          <Plus size={32} />
          <span>New Folder</span>
        </button>
      </div>

      <div className="library-games-section">
        <div className="library-games-header">
          <h2>{activeFolder ? activeFolder.name : 'All Games'}</h2>
          <p>{displayedGames.length} {displayedGames.length === 1 ? 'game' : 'games'}</p>
        </div>
        <div className="library-grid" style={{ gridTemplateColumns: `repeat(auto-fill, ${iconSize}px)` }}>
          {displayedGames.map((game) => (
            <LibraryGameCard
              key={game.id}
              game={game}
              iconSize={iconSize}
              folders={folders}
              onAddToFolder={handleAddGameToFolder}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Library;
