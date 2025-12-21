import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import WorkshopSection from '../components/WorkshopSection';
import { MessageSquare, Package, Users, Bookmark, TrendingUp, Heart, Globe, Sparkles, Plus, Search, Filter, Bell, BellOff } from 'lucide-react';
import { getUserData, getUserScopedKey, getAllUsersData, saveUserData, getCurrentUserId } from '../utils/UserDataManager';
import { loadNotifications, addNotification } from '../utils/NotificationManager';
import './Community.css';

const Community = () => {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = React.useState('posts'); // posts | workshop
  const [communityView, setCommunityView] = React.useState('all'); // all, saved, trending, following
  
  // Posts/Threads toggle state (merged section)
  const [showThreads, setShowThreads] = React.useState(false); // false = posts, true = threads
  const [postsGame, setPostsGame] = React.useState(gameId || 'all');
  const [postsSelectedTags, setPostsSelectedTags] = React.useState(new Set());
  const [postsSortBy, setPostsSortBy] = React.useState('trending');
  
  // Workshop tab state (uses gameId from URL if available)
  const [workshopGame, setWorkshopGame] = React.useState(gameId || 'all');
  const [savedSet] = React.useState(() => {
    try { 
      const saved = getUserData('communitySaved', []);
      return new Set(saved); 
    } catch (_) { 
      return new Set(); 
    }
  });
  // Picker state for posts/threads section
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const pickerRef = React.useRef(null);
  const [pickerQuery, setPickerQuery] = React.useState('');
  
  // Post type dropdown state
  const [postTypeDropdownOpen, setPostTypeDropdownOpen] = React.useState(false);
  const postTypeDropdownRef = React.useRef(null);

  // Thread creation state
  const [threadTitle, setThreadTitle] = React.useState('');
  const [threadDescription, setThreadDescription] = React.useState('');
  const [threadGame, setThreadGame] = React.useState('all');
  const [threadType, setThreadType] = React.useState('discussion'); // discussion, gaming, art, music, tech, fitness, cooking, travel, photography, books
  const [threadImage, setThreadImage] = React.useState('');
  const [showThreadCreator, setShowThreadCreator] = React.useState(false);
  const [selectedThreadId, setSelectedThreadId] = React.useState(null);
  const [threadSearchQuery, setThreadSearchQuery] = React.useState('');
  const [threadTypeDropdownOpen, setThreadTypeDropdownOpen] = React.useState(false);
  const threadTypeDropdownRef = React.useRef(null);

  // Close post type dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (postTypeDropdownRef.current && !postTypeDropdownRef.current.contains(event.target)) {
        setPostTypeDropdownOpen(false);
      }
      if (threadTypeDropdownRef.current && !threadTypeDropdownRef.current.contains(event.target)) {
        setThreadTypeDropdownOpen(false);
      }
    };
    if (postTypeDropdownOpen || threadTypeDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [postTypeDropdownOpen, threadTypeDropdownOpen]);
  const [postContent, setPostContent] = React.useState('');
  const [postType, setPostType] = React.useState('text'); // text, speedrun, achievement, screenshot, image-text, video, build, discussion, meme, review, tournament
  const [postImage, setPostImage] = React.useState('');
  const [postVideo, setPostVideo] = React.useState('');
  const [postRating, setPostRating] = React.useState(5);
  const [postTime, setPostTime] = React.useState({ h: 0, m: 0, s: 0, ms: 0 });
  const [postTitle, setPostTitle] = React.useState('');
  const [showPostForm, setShowPostForm] = React.useState(false);

  // Window width for responsive sidebar sizing
  const [windowWidth, setWindowWidth] = React.useState(() => {
    return typeof window !== 'undefined' ? window.innerWidth : 1120;
  });

  // Left sidebar resizing state
  const [communityLeftSidebarWidth, setCommunityLeftSidebarWidth] = React.useState(() => {
    try {
      const saved = localStorage.getItem('sidebarWidth');
      return saved ? parseInt(saved, 10) : 200;
    } catch (_) {
      return 200;
    }
  });

  // Calculate responsive left sidebar width based on window size
  // Sidebar only increases by max 50px (200px min, 250px max)
  // Content area is the main focus and should resize based on window size
  const responsiveLeftSidebarWidth = React.useMemo(() => {
    const minWidth = 200; // Base size - not too big, not too small
    const maxWidth = 250; // Only 50px increase from min
    // Scale based on window width - more conservative scaling
    // At minimum window (1120px): use minWidth
    // At larger windows: gradually increase up to maxWidth
    const windowMin = 1120;
    const windowMax = 1920;
    const normalizedWidth = Math.min(1, Math.max(0, (windowWidth - windowMin) / (windowMax - windowMin)));
    const calculatedWidth = minWidth + (normalizedWidth * (maxWidth - minWidth));
    return Math.max(minWidth, Math.min(maxWidth, calculatedWidth));
  }, [windowWidth]);

  // Content width for smart resizing (window width minus left sidebar only)
  // Content area is the main focus - should use most of the window width
  const [contentWidth, setContentWidth] = React.useState(() => {
    // Default to 1080px (1280px min app width - 200px left sidebar)
    // Content should be the main resizing element
    return typeof window !== 'undefined' ? Math.max(1080, window.innerWidth - 200) : 1080;
  });

  // Track window size changes - optimized with requestAnimationFrame for smooth updates
  React.useEffect(() => {
    let rafId = null;
    let lastWidth = window.innerWidth;
    
    const handleResize = () => {
      const currentWidth = window.innerWidth;
      
      // Only update if width actually changed (avoid unnecessary re-renders)
      if (Math.abs(currentWidth - lastWidth) < 1) return;
      lastWidth = currentWidth;
      
      // Use requestAnimationFrame for smooth, batched updates
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        setWindowWidth(currentWidth);
        
        // Calculate available content width (window width - left sidebar only)
        const leftSidebarWidth = communityLeftSidebarWidth || 200;
        const newContentWidth = Math.max(1030, currentWidth - leftSidebarWidth);
        setContentWidth(newContentWidth);
      });
    };
    
    // Initial update
    handleResize();
    
    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('sidebar-resize', handleResize, { passive: true });
    
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('sidebar-resize', handleResize);
    };
  }, [communityLeftSidebarWidth]);

  // Calculate banner height based on content width (maintain aspect ratio)
  // Use 20% of content width, clamped between 180px and 600px
  const bannerHeight = React.useMemo(() => {
    return Math.max(180, Math.min(600, contentWidth * 0.20));
  }, [contentWidth]);


  // Auto-adjust left sidebar width based on window size
  React.useEffect(() => {
    if (responsiveLeftSidebarWidth) {
      setCommunityLeftSidebarWidth(prevWidth => {
        const newWidth = responsiveLeftSidebarWidth;
        if (Math.abs(prevWidth - newWidth) > 0.1) {
          // Update localStorage asynchronously to avoid blocking
          setTimeout(() => {
            try {
              localStorage.setItem('sidebarWidth', newWidth.toString());
            } catch (_) {}
          }, 0);
          return newWidth;
        }
        return prevWidth;
      });
    }
  }, [windowWidth, responsiveLeftSidebarWidth]);


  // Game notification preferences - structure: { gameId: { posts: boolean, threads: boolean, workshop: boolean } }
  const [gameNotifications, setGameNotifications] = React.useState(() => {
    try {
      const notifications = getUserData('gameNotifications', {});
      return notifications;
    } catch (_) {
      return {};
    }
  });

  const toggleGameNotification = (gameId, type, e) => {
    e.stopPropagation(); // Prevent game selection when clicking toggle
    const currentState = gameNotifications[gameId] || { posts: false, threads: false, workshop: false };
    const newNotifications = {
      ...gameNotifications,
      [gameId]: {
        ...currentState,
        [type]: !currentState[type]
      }
    };
    setGameNotifications(newNotifications);
    saveUserData('gameNotifications', newNotifications);
  };

  // Build game list from ALL published games from ALL users (shared marketplace)
  const [gameList, setGameList] = React.useState([{ id: 'all', name: 'All Games', banner: null }]);
  
  React.useEffect(() => {
    const loadGames = async () => {
      let list = [{ id: 'all', name: 'All Games', banner: null }];
      try {
        // Get all games from all users (shared)
        const allGames = await getAllUsersData('customGames');
        
        // Filter to only show published games
        const publishedGames = allGames.filter(game => {
          const status = game.status || game.fullFormData?.status || 'draft';
          return status === 'public' || status === 'published';
        });
        
        // Remove duplicates based on gameId (keep first occurrence)
        const uniqueGamesMap = new Map();
        publishedGames.forEach(game => {
          const gameId = game.gameId || game.id;
          if (gameId && !uniqueGamesMap.has(gameId)) {
            uniqueGamesMap.set(gameId, game);
          }
        });
        
        // Check which games actually exist in the games folder
        const existingGames = [];
        for (const [gameId, game] of uniqueGamesMap) {
          try {
            if (window.electronAPI && window.electronAPI.gameFolderExists) {
              const exists = await window.electronAPI.gameFolderExists(gameId);
              if (exists) {
                existingGames.push(game);
              }
            } else {
              // Fallback: if Electron API is not available, include the game anyway
              existingGames.push(game);
            }
          } catch (error) {
            console.error(`Error checking game folder for ${gameId}:`, error);
            // Skip games that can't be verified
          }
        }
        
        const getCard = (g) => (
          g.card || g.cardImage || g.fullFormData?.cardImage ||
          g.fullFormData?.card || g.metadata?.cardImage || g.files?.card?.path || null
        );
        const getBanner = (g) => (
          g.banner || g.bannerImage || g.fullFormData?.bannerImage ||
          g.fullFormData?.banner || g.metadata?.bannerImage || g.files?.banner?.path || null
        );
        const getLogo = (g) => (
          g.gameLogo || g.logo || g.fullFormData?.gameLogo || g.fullFormData?.titleImage || g.titleImage || g.title || null
        );
        const customs = existingGames.map(g => ({
          id: g.gameId,
          name: g.name || g.gameName || g.id,
          banner: getBanner(g),
          card: getCard(g) || getBanner(g) || null,
          logo: getLogo(g)
        }));
        list = [...list, ...customs];
      } catch (_) {}
      setGameList(list);
    };
    
    loadGames();
    
    // Reload when games are updated
    const handleUpdate = () => loadGames();
    window.addEventListener('customGameUpdate', handleUpdate);
    window.addEventListener('user-changed', loadGames);
    
    return () => {
      window.removeEventListener('customGameUpdate', handleUpdate);
      window.removeEventListener('user-changed', loadGames);
    };
  }, []);

  // Load ALL published posts from ALL users (shared community)
  const [posts, setPosts] = React.useState(() => {
    try {
      // Get all posts from all users (shared)
      const allPosts = getAllUsersData('communityPosts');
      // Filter to only show published posts
      const publishedPosts = allPosts.filter(post => {
        const status = post.status || 'published';
        return status === 'public' || status === 'published';
      });
      return publishedPosts;
    } catch (_) {
      return [];
    }
  });

  // Load threads (similar to posts but for user discussions)
  const [threads, setThreads] = React.useState(() => {
    try {
      const allThreads = getAllUsersData('communityThreads');
      const publishedThreads = allThreads.filter(thread => {
        const status = thread.status || 'published';
        return status === 'public' || status === 'published';
      });
      return publishedThreads;
    } catch (_) {
      return [];
    }
  });

  // Filter and sort posts
  const sortedPosts = React.useMemo(() => {
    let filtered = [...posts];
    
    // Filter by game
    if (postsGame !== 'all') {
      filtered = filtered.filter(p => p.game === postsGame);
    }
    
    // Filter by view
    if (communityView === 'saved') {
      filtered = filtered.filter(p => savedSet.has(p.id));
    } else if (communityView === 'trending') {
      filtered = filtered.filter(p => (p.likes || 0) > 5 || (p.comments || 0) > 3);
    } else if (communityView === 'following') {
      // TODO: Implement following logic
      filtered = [];
    }
    
    // Sort
    if (postsSortBy === 'trending') {
      filtered.sort((a, b) => {
        const aScore = (a.likes || 0) * 2 + (a.comments || 0);
        const bScore = (b.likes || 0) * 2 + (b.comments || 0);
        return bScore - aScore;
      });
    } else if (postsSortBy === 'recent') {
      filtered.sort((a, b) => {
        const aTime = a.timestamp || a.createdAt || 0;
        const bTime = b.timestamp || b.createdAt || 0;
        return bTime - aTime;
      });
    } else if (postsSortBy === 'popular') {
      filtered.sort((a, b) => (b.likes || 0) - (a.likes || 0));
    }
    
    return filtered;
  }, [posts, postsGame, communityView, postsSortBy, savedSet]);

  // Filter and sort threads
  const sortedThreads = React.useMemo(() => {
    let filtered = [...threads];
    
    // Filter by game
    if (postsGame !== 'all') {
      filtered = filtered.filter(t => t.game === postsGame);
    }
    
    // Filter by search query
    if (threadSearchQuery) {
      const query = threadSearchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        t.title?.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query) ||
        t.author?.toLowerCase().includes(query)
      );
    }
    
    // Sort by members/popularity
    filtered.sort((a, b) => (b.members || 1) - (a.members || 1));
    
    return filtered;
  }, [threads, postsGame, threadSearchQuery]);

  const handleCreateThread = () => {
    if (!threadTitle.trim()) return;
    const newThread = {
      id: Date.now(),
      title: threadTitle,
      description: threadDescription,
      game: threadGame === 'all' ? null : threadGame,
      type: threadType,
      image: threadImage || null,
      author: 'You',
      time: 'just now',
      createdAt: Date.now(),
      members: 1,
      posts: 0,
      status: 'published'
    };
    const currentUserId = getCurrentUserId();
    const existing = getUserData('communityThreads', []);
    saveUserData('communityThreads', [...existing, newThread], currentUserId);
    setThreads(prev => [...prev, newThread]);
    
    // Send notifications to users who have notifications enabled for this game
    if (threadGame !== 'all' && threadGame) {
      try {
        const currentNotifications = loadNotifications();
        const gameName = gameList.find(g => g.id === threadGame)?.name || threadGame;
        const currentUserId = getCurrentUserId();
        
        // Check current user's notification preferences
        const userNotifications = getUserData('gameNotifications', {});
        if (userNotifications[threadGame]?.threads) {
          const notification = {
            id: Date.now() + Math.random() * 1000,
            type: 'community',
            title: 'New Community Thread',
            message: `A new thread "${threadTitle}" was created for ${gameName}`,
            time: 'just now',
            timestamp: Date.now(),
            read: false,
            iconType: 'users',
            source: 'Community Threads'
          };
          addNotification(notification, currentNotifications);
        }
      } catch (error) {
        console.error('Error sending thread notifications:', error);
      }
    }
    
    setThreadTitle('');
    setThreadDescription('');
    setThreadGame('all');
    setThreadType('discussion');
    setThreadImage('');
    setShowThreadCreator(false);
  };

  const handleCreatePost = () => {
    if (!postContent.trim() && !postImage && !postVideo) return;
    const newPost = {
      id: Date.now(),
      type: postType,
      text: postContent,
      image: postImage || null,
      video: postVideo || null,
      title: postTitle || null,
      rating: postType === 'review' ? postRating : null,
      h: postType === 'speedrun' ? postTime.h : null,
      m: postType === 'speedrun' ? postTime.m : null,
      s: postType === 'speedrun' ? postTime.s : null,
      ms: postType === 'speedrun' ? postTime.ms : null,
      game: postsGame === 'all' ? null : postsGame,
      author: 'You',
      time: 'just now',
      timestamp: Date.now(),
      createdAt: Date.now(),
      likes: 0,
      comments: 0,
      status: 'published'
    };
    const currentUserId = getCurrentUserId();
    const existing = getUserData('communityPosts', []);
    saveUserData('communityPosts', [...existing, newPost], currentUserId);
    setPosts(prev => [...prev, newPost]);
    
    // Send notifications to users who have notifications enabled for this game
    if (postsGame !== 'all' && postsGame) {
      try {
        const currentNotifications = loadNotifications();
        const gameName = gameList.find(g => g.id === postsGame)?.name || postsGame;
        const previewText = postContent.length > 50 ? postContent.substring(0, 50) + '...' : postContent;
        
        // Check current user's notification preferences
        const userNotifications = getUserData('gameNotifications', {});
        if (userNotifications[postsGame]?.posts) {
          const notification = {
            id: Date.now() + Math.random() * 1000,
            type: 'community',
            title: 'New Game Post',
            message: `New post in ${gameName}: ${previewText}`,
            time: 'just now',
            timestamp: Date.now(),
            read: false,
            iconType: 'messageSquare',
            source: 'Game Posts'
          };
          addNotification(notification, currentNotifications);
        }
      } catch (error) {
        console.error('Error sending post notifications:', error);
      }
    }
    
    setPostContent('');
    setPostImage('');
    setPostVideo('');
    setPostType('text');
    setPostRating(5);
    setPostTime({ h: 0, m: 0, s: 0, ms: 0 });
    setPostTitle('');
    setShowPostForm(false);
  };

  // Position dropdown menu dynamically
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, width: 0 });
  const menuRef = useRef(null);
  
  // Helper to safely get document.body
  const getBodyElement = () => {
    if (typeof document !== 'undefined' && document.body) {
      return document.body;
    }
    return null;
  };

  // Update menu position when picker opens or window resizes
  const updateMenuPosition = React.useCallback(() => {
    if (pickerOpen && pickerRef.current) {
      const buttonRect = pickerRef.current.getBoundingClientRect();
      const menuWidth = Math.max(200, Math.min(250, communityLeftSidebarWidth));
      
      // Position menu to the left of the button
      let leftPos = buttonRect.left - menuWidth - 5; // 5px gap
      
      // Ensure menu doesn't go off-screen to the left
      const finalLeft = Math.max(5, leftPos);
      
      // Calculate top position (align with button top)
      const finalTop = buttonRect.top;
      
      setMenuPosition({
        top: finalTop,
        left: finalLeft,
        width: menuWidth,
      });
    }
  }, [pickerOpen, communityLeftSidebarWidth]);

  // Update position when picker opens or dependencies change
  React.useEffect(() => {
    if (pickerOpen) {
      updateMenuPosition();
      
      // Update on scroll/resize
      const handleUpdate = () => updateMenuPosition();
      window.addEventListener('scroll', handleUpdate, true);
      window.addEventListener('resize', handleUpdate);
      
      return () => {
        window.removeEventListener('scroll', handleUpdate, true);
        window.removeEventListener('resize', handleUpdate);
      };
    }
  }, [pickerOpen, updateMenuPosition]);

  // Close picker when clicking outside
  React.useEffect(() => {
    if (!pickerOpen) return;
    
    const handleClickOutside = (e) => {
      const buttonEl = pickerRef.current;
      const menuEl = menuRef.current;
      
      // Check if click is outside both the button and the menu
      if (
        buttonEl && 
        !buttonEl.contains(e.target) && 
        menuEl && 
        !menuEl.contains(e.target)
      ) {
        setPickerOpen(false);
      }
    };
    
    // Use capture phase and a small delay to ensure we catch the event
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside, true);
    }, 0);
    
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, [pickerOpen]);


  return (
    <div className="community" style={{ '--window-width': `${windowWidth}px` }}>
      <div className="community-layout-3">
        {/* Left: Filters */}
        <aside className="community-left" style={{ '--sidebar-width': `${communityLeftSidebarWidth}px`, width: `${communityLeftSidebarWidth}px` }}>
          <div className="community-left-content">
            {/* CHOOSE GAME Filter - Keep this design exactly as is */}
            <div className="comm-filter-group" style={{ paddingLeft: '0', paddingRight: '0', marginTop: '0' }}>
              <div className="comm-game-picker" ref={pickerRef}>
                <button className="comm-picker-btn" onClick={() => setPickerOpen(!pickerOpen)}>
                  <div className="comm-picker-card">
                    {selectedTab === 'posts' ? (
                      postsGame === 'all' ? (
                        <span>🎮</span>
                      ) : (gameList.find(g => g.id === postsGame)?.card ? (
                        <img src={gameList.find(g => g.id === postsGame)?.card} alt="card" />
                      ) : (
                        <span>🎮</span>
                      ))
                    ) : (
                      workshopGame === 'all' ? (
                        <span>🎮</span>
                      ) : (gameList.find(g => g.id === workshopGame)?.card ? (
                        <img src={gameList.find(g => g.id === workshopGame)?.card} alt="card" />
                      ) : (
                        <span>🎮</span>
                      ))
                    )}
                  </div>
                  <span className="comm-picker-label">
                    {selectedTab === 'posts' 
                      ? (gameList.find(g => g.id === postsGame)?.name || 'Select Game')
                      : (gameList.find(g => g.id === workshopGame)?.name || 'Select Game')
                    }
                  </span>
                </button>
                {pickerOpen && (() => {
                  const bodyEl = getBodyElement();
                  if (!bodyEl) return null;
                  
                  return createPortal(
                    <div 
                      className="comm-picker-menu" 
                      ref={menuRef}
                      style={{
                        top: `${menuPosition.top}px`,
                        left: `${menuPosition.left}px`,
                        width: `${menuPosition.width}px`,
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="comm-picker-search">
                        <input
                          className="comm-picker-input"
                          value={pickerQuery}
                          onChange={(e) => setPickerQuery(e.target.value)}
                          placeholder="Search games..."
                          autoFocus
                        />
                      </div>
                      {gameList.filter(g => g.name.toLowerCase().includes(pickerQuery.toLowerCase())).length === 0 ? (
                        <div className="comm-picker-empty">
                          <span>No games found</span>
                        </div>
                      ) : (
                        gameList.filter(g => g.name.toLowerCase().includes(pickerQuery.toLowerCase())).map(g => (
                          <div 
                            key={g.id} 
                            className={`comm-picker-option ${g.id === 'all' ? 'is-all' : ''} ${(selectedTab === 'posts' ? postsGame : workshopGame) === g.id ? 'active' : ''}`} 
                            onClick={() => {
                              if (selectedTab === 'posts') {
                                setPostsGame(g.id);
                                if (g.id === 'all') navigate('/community');
                                else navigate(`/game/${g.id}/community`);
                              } else {
                                setWorkshopGame(g.id);
                              }
                              setPickerOpen(false);
                            }}
                          >
                            {g.id !== 'all' && (
                              <div className="comm-picker-logo">
                                {g.logo ? <img src={g.logo} alt={g.name} /> : <span>🎮</span>}
                              </div>
                            )}
                            <span className="comm-picker-name">{g.name}</span>
                              {g.id !== 'all' && (
                                <div className="comm-picker-notifications" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    className={`comm-picker-notification-toggle ${gameNotifications[g.id]?.posts ? 'enabled' : ''}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleGameNotification(g.id, 'posts', e);
                                    }}
                                    title={gameNotifications[g.id]?.posts ? "Posts notifications enabled" : "Enable posts notifications"}
                                  >
                                    <Bell size={12} style={{ 
                                      color: gameNotifications[g.id]?.posts
                                        ? '#4a9eff'
                                        : 'rgba(255, 255, 255, 0.4)'
                                    }} />
                                  </button>
                                  <button
                                    className={`comm-picker-notification-toggle ${gameNotifications[g.id]?.threads ? 'enabled' : ''}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleGameNotification(g.id, 'threads', e);
                                    }}
                                    title={gameNotifications[g.id]?.threads ? "Threads notifications enabled" : "Enable threads notifications"}
                                  >
                                    <Bell size={12} style={{ 
                                      color: gameNotifications[g.id]?.threads
                                        ? '#4a9eff'
                                        : 'rgba(255, 255, 255, 0.4)'
                                    }} />
                                  </button>
                                  <button
                                    className={`comm-picker-notification-toggle ${gameNotifications[g.id]?.workshop ? 'enabled' : ''}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleGameNotification(g.id, 'workshop', e);
                                    }}
                                    title={gameNotifications[g.id]?.workshop ? "Workshop notifications enabled" : "Enable workshop notifications"}
                                  >
                                    <Bell size={12} style={{ 
                                      color: gameNotifications[g.id]?.workshop
                                        ? '#4a9eff'
                                        : 'rgba(255, 255, 255, 0.4)'
                                    }} />
                                  </button>
                                </div>
                              )}
                          </div>
                        ))
                      )}
                    </div>,
                    bodyEl
                  );
                })()}
              </div>
            </div>

            {/* Content Navigation - Posts, Threads, Workshop */}
            <div className="comm-filter-group">
              <h3 className="sidebar-section-title">Content</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(8px, calc(var(--window-width, 1120px) * 0.0071), 12px)' }}>
                  <button
                  className={`sidebar-nav-item ${selectedTab === 'posts' && !showThreads ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedTab('posts');
                    setShowThreads(false);
                  }}
                  style={{ width: '100%', justifyContent: 'flex-start' }}
                >
                  <MessageSquare size={18} />
                  <span>Posts</span>
                  </button>
                  <button
                  className={`sidebar-nav-item ${selectedTab === 'posts' && showThreads ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedTab('posts');
                    setShowThreads(true);
                  }}
                  style={{ width: '100%', justifyContent: 'flex-start' }}
                >
                  <Users size={18} />
                  <span>Threads</span>
                  </button>
                  <button
                  className={`sidebar-nav-item ${selectedTab === 'workshop' ? 'active' : ''}`}
                  onClick={() => setSelectedTab('workshop')}
                  style={{ width: '100%', justifyContent: 'flex-start' }}
                >
                  <Package size={18} />
                  <span>Workshop</span>
                  </button>
              </div>
                        </div>


                  </div>
        </aside>

        {/* Center: Feed */}
        <main className="community-center">
          <div className="marketplace-content">
            {/* Hero Sections */}
            {selectedTab === 'workshop' ? (
              <div 
                className="marketplace-hero"
                style={{ 
                  '--content-width': `${contentWidth}px`,
                  '--banner-height': `${bannerHeight}px`,
                  height: `${bannerHeight}px`,
                  backgroundImage: workshopGame !== 'all' && gameList.find(g => g.id === workshopGame)?.banner 
                    ? `url(${gameList.find(g => g.id === workshopGame).banner})` 
                    : undefined,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat'
                }}
              >
                <div className="marketplace-hero-content">
                  <div className="marketplace-hero-left">
                    <h1 className="marketplace-hero-title">
                      {workshopGame !== 'all' 
                        ? `${gameList.find(g => g.id === workshopGame)?.name || workshopGame}: Workshop`
                        : 'Workshop'
                      }
                    </h1>
                    <p className="marketplace-hero-subtitle">Browse and share community-created content for your favorite games.</p>
                    <div className="marketplace-hero-stats">
                      <div className="hero-stat">
                        <div className="hero-stat-value">{sortedPosts.length}</div>
                        <div className="hero-stat-label">Items</div>
              </div>
            </div>
                  </div>
                  <div className="marketplace-hero-right">
                    {workshopGame !== 'all' && (
                <button 
                        className="featured-deal-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleGameNotification(workshopGame, 'workshop', e);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          background: gameNotifications[workshopGame]?.workshop 
                            ? 'rgba(74, 158, 255, 0.2)' 
                            : 'rgba(255, 255, 255, 0.1)',
                          border: gameNotifications[workshopGame]?.workshop 
                            ? '1px solid rgba(74, 158, 255, 0.4)' 
                            : '1px solid rgba(255, 255, 255, 0.2)'
                        }}
                      >
                        <Bell size={18} style={{ color: gameNotifications[workshopGame]?.workshop ? '#4a9eff' : 'rgba(255, 255, 255, 0.8)' }} />
                        <span>{gameNotifications[workshopGame]?.workshop ? 'Notifications On' : 'Notifications Off'}</span>
                </button>
                )}
                  </div>
                </div>
              </div>
            ) : showThreads ? (
              <div 
                className="marketplace-hero"
                style={{ 
                  '--content-width': `${contentWidth}px`,
                  '--banner-height': `${bannerHeight}px`,
                  height: `${bannerHeight}px`,
                  backgroundImage: postsGame !== 'all' && gameList.find(g => g.id === postsGame)?.banner 
                    ? `url(${gameList.find(g => g.id === postsGame).banner})` 
                    : undefined,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat'
                }}
              >
                <div className="marketplace-hero-content">
                  <div className="marketplace-hero-left">
                    <h1 className="marketplace-hero-title">
                      {postsGame !== 'all' 
                        ? `${gameList.find(g => g.id === postsGame)?.name || postsGame}: Community Threads`
                        : 'Community Threads'
                      }
                    </h1>
                    <p className="marketplace-hero-subtitle">Join discussions and connect with other players in community threads.</p>
                    <div className="marketplace-hero-stats">
                      <div className="hero-stat">
                        <div className="hero-stat-value">{sortedThreads.length}</div>
                        <div className="hero-stat-label">Threads</div>
                  </div>
              </div>
                  </div>
                  <div className="marketplace-hero-right">
                    {postsGame !== 'all' && (
                  <button
                        className="featured-deal-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleGameNotification(postsGame, 'threads', e);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          background: gameNotifications[postsGame]?.threads 
                            ? 'rgba(74, 158, 255, 0.2)' 
                            : 'rgba(255, 255, 255, 0.1)',
                          border: gameNotifications[postsGame]?.threads 
                            ? '1px solid rgba(74, 158, 255, 0.4)' 
                            : '1px solid rgba(255, 255, 255, 0.2)',
                          marginRight: '12px'
                        }}
                      >
                        <Bell size={18} style={{ color: gameNotifications[postsGame]?.threads ? '#4a9eff' : 'rgba(255, 255, 255, 0.8)' }} />
                        <span>{gameNotifications[postsGame]?.threads ? 'Notifications On' : 'Notifications Off'}</span>
                  </button>
                )}
                </div>
                </div>
              </div>
            ) : (
              <div 
                className="marketplace-hero"
                style={{ 
                  '--content-width': `${contentWidth}px`,
                  '--banner-height': `${bannerHeight}px`,
                  height: `${bannerHeight}px`,
                  backgroundImage: postsGame !== 'all' && gameList.find(g => g.id === postsGame)?.banner 
                    ? `url(${gameList.find(g => g.id === postsGame).banner})` 
                    : undefined,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat'
                }}
              >
                <div className="marketplace-hero-content">
                  <div className="marketplace-hero-left">
                    <h1 className="marketplace-hero-title">
                      {postsGame !== 'all' 
                        ? `${gameList.find(g => g.id === postsGame)?.name || postsGame}: Posts`
                        : 'Posts'
                      }
                    </h1>
                    <p className="marketplace-hero-subtitle">Share your achievements, screenshots, and experiences with the community.</p>
                    <div className="marketplace-hero-stats">
                      <div className="hero-stat">
                        <div className="hero-stat-value">{sortedPosts.length}</div>
                        <div className="hero-stat-label">Posts</div>
            </div>
          </div>
            </div>
                  <div className="marketplace-hero-right">
                    {postsGame !== 'all' && (
                      <button
                        className="featured-deal-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleGameNotification(postsGame, 'posts', e);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          background: gameNotifications[postsGame]?.posts 
                            ? 'rgba(74, 158, 255, 0.2)' 
                            : 'rgba(255, 255, 255, 0.1)',
                          border: gameNotifications[postsGame]?.posts 
                            ? '1px solid rgba(74, 158, 255, 0.4)' 
                            : '1px solid rgba(255, 255, 255, 0.2)'
                        }}
                      >
                        <Bell size={18} style={{ color: gameNotifications[postsGame]?.posts ? '#4a9eff' : 'rgba(255, 255, 255, 0.8)' }} />
                        <span>{gameNotifications[postsGame]?.posts ? 'Notifications On' : 'Notifications Off'}</span>
                      </button>
                    )}
            </div>
            </div>
            </div>
            )}

            {/* Content Area */}
            <div className="marketplace-content-inner">

            {selectedTab === 'workshop' ? (
            <WorkshopSection gameId={workshopGame === 'all' ? null : workshopGame} />
            ) : showThreads ? (
            <>
              {/* Create Thread Form */}
              {showThreadCreator && (
                <div 
                  className="create-petition-form-container"
                  style={{ '--content-width': `${contentWidth}px` }}
                >
                  <div className="create-petition-form">
                    <div className="create-petition-form-header">
                      <h2>Create New Thread</h2>
                      <p className="create-petition-description">Start a discussion with the community</p>
                    </div>
                    <div className="post-type-selector-wrapper" ref={threadTypeDropdownRef}>
                      <button
                        type="button"
                        className="post-type-selector-btn"
                        onClick={() => setThreadTypeDropdownOpen(!threadTypeDropdownOpen)}
                        style={{ '--content-width': `${contentWidth}px` }}
                      >
                        <span className="post-type-selector-label">
                          {threadType === 'discussion' ? 'Discussion' :
                           threadType === 'gaming' ? 'Gaming' :
                           threadType === 'art' ? 'Art & Design' :
                           threadType === 'music' ? 'Music' :
                           threadType === 'tech' ? 'Technology' :
                           threadType === 'fitness' ? 'Fitness' :
                           threadType === 'cooking' ? 'Cooking' :
                           threadType === 'travel' ? 'Travel' :
                           threadType === 'photography' ? 'Photography' :
                           threadType === 'books' ? 'Books & Literature' : 'Discussion'}
                        </span>
                        <svg width="12" height="8" viewBox="0 0 12 8" fill="none" style={{ 
                          transform: threadTypeDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'none'
                        }}>
                          <path d="M1 1L6 6L11 1" stroke="rgba(255, 255, 255, 0.6)" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                      </button>
                      {threadTypeDropdownOpen && (
                        <div className="post-type-dropdown-menu" style={{ '--content-width': `${contentWidth}px` }}>
                          <button type="button" className={`post-type-option ${threadType === 'discussion' ? 'active' : ''}`} onClick={() => { setThreadType('discussion'); setThreadTypeDropdownOpen(false); }}>Discussion</button>
                          <button type="button" className={`post-type-option ${threadType === 'gaming' ? 'active' : ''}`} onClick={() => { setThreadType('gaming'); setThreadTypeDropdownOpen(false); }}>Gaming</button>
                          <button type="button" className={`post-type-option ${threadType === 'art' ? 'active' : ''}`} onClick={() => { setThreadType('art'); setThreadTypeDropdownOpen(false); }}>Art & Design</button>
                          <button type="button" className={`post-type-option ${threadType === 'music' ? 'active' : ''}`} onClick={() => { setThreadType('music'); setThreadTypeDropdownOpen(false); }}>Music</button>
                          <button type="button" className={`post-type-option ${threadType === 'tech' ? 'active' : ''}`} onClick={() => { setThreadType('tech'); setThreadTypeDropdownOpen(false); }}>Technology</button>
                          <button type="button" className={`post-type-option ${threadType === 'fitness' ? 'active' : ''}`} onClick={() => { setThreadType('fitness'); setThreadTypeDropdownOpen(false); }}>Fitness</button>
                          <button type="button" className={`post-type-option ${threadType === 'cooking' ? 'active' : ''}`} onClick={() => { setThreadType('cooking'); setThreadTypeDropdownOpen(false); }}>Cooking</button>
                          <button type="button" className={`post-type-option ${threadType === 'travel' ? 'active' : ''}`} onClick={() => { setThreadType('travel'); setThreadTypeDropdownOpen(false); }}>Travel</button>
                          <button type="button" className={`post-type-option ${threadType === 'photography' ? 'active' : ''}`} onClick={() => { setThreadType('photography'); setThreadTypeDropdownOpen(false); }}>Photography</button>
                          <button type="button" className={`post-type-option ${threadType === 'books' ? 'active' : ''}`} onClick={() => { setThreadType('books'); setThreadTypeDropdownOpen(false); }}>Books & Literature</button>
                        </div>
                      )}
                    </div>
                    <input
                      type="text"
                      className="comm-thread-title-input"
                      placeholder="Thread title..."
                      value={threadTitle}
                      onChange={(e) => setThreadTitle(e.target.value)}
                      style={{ '--content-width': `${contentWidth}px` }}
                    />
                    <textarea
                      className="comm-thread-description-input"
                      placeholder="Thread description..."
                      value={threadDescription}
                      onChange={(e) => setThreadDescription(e.target.value)}
                      style={{ '--content-width': `${contentWidth}px` }}
                    />
                    {(threadType === 'art' || threadType === 'photography' || threadType === 'travel' || threadType === 'cooking' || threadType === 'gaming') && (
                      <input
                        type="text"
                        className="comm-thread-title-input"
                        placeholder="Image URL (optional)..."
                        value={threadImage}
                        onChange={(e) => setThreadImage(e.target.value)}
                        style={{ '--content-width': `${contentWidth}px` }}
                      />
                    )}
                    <select
                      className="comm-thread-game-select"
                      value={threadGame}
                      onChange={(e) => setThreadGame(e.target.value)}
                      style={{ '--content-width': `${contentWidth}px` }}
                    >
                      <option value="all">All Games</option>
                      {gameList.filter(g => g.id !== 'all').map(game => (
                        <option key={game.id} value={game.id}>{game.name}</option>
                      ))}
                    </select>
                    <div className="create-petition-actions" style={{ '--content-width': `${contentWidth}px` }}>
                      <button
                        className="create-petition-cancel-btn"
                        onClick={() => {
                          setShowThreadCreator(false);
                          setThreadTitle('');
                          setThreadDescription('');
                          setThreadGame('all');
                          setThreadType('discussion');
                          setThreadImage('');
                        }}
                        style={{ '--content-width': `${contentWidth}px` }}
                      >
                        Cancel
                      </button>
                      <button
                        className="create-petition-submit-btn"
                        onClick={handleCreateThread}
                        disabled={!threadTitle.trim()}
                        style={{ '--content-width': `${contentWidth}px` }}
                      >
                        Create Thread
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {!showThreadCreator && (
                <div className="items-grid-controls" style={{ '--content-width': `${contentWidth}px` }}>
                  <div className="items-grid-controls-left">
                    <div className="items-count">{sortedThreads.length} {sortedThreads.length === 1 ? 'thread' : 'threads'}</div>
                  </div>
                  <div className="items-grid-controls-right">
                    <button 
                      className="featured-deal-btn"
                      onClick={() => setShowThreadCreator(true)}
                    >
                      <Plus size={18} />
                      <span>Create Thread</span>
                    </button>
                  </div>
                </div>
              )}
              <div className="comm-thread-search">
                <Search size={18} />
                <input
                  className="comm-thread-search-input"
                  type="text"
                  placeholder="Search community threads by title, description, or author..."
                  value={threadSearchQuery}
                  onChange={(e) => setThreadSearchQuery(e.target.value)}
                />
              </div>
              {selectedThreadId ? (
                <div className="comm-thread-detail">
                  {(() => {
                    const thread = sortedThreads.find(t => t.id === selectedThreadId);
                    if (!thread) return null;
                    return (
                      <>
                        <div className="comm-thread-detail-header">
                          <button className="comm-thread-back-btn" onClick={() => setSelectedThreadId(null)}>
                            ← Back to Community Threads
                          </button>
                          <h2 className="comm-thread-detail-title">{thread.title}</h2>
                          <div className="comm-thread-detail-meta">
                            <span>by {thread.author}</span>
                            {thread.game && (
                              <span className="comm-game-badge">{gameList.find(g => g.id === thread.game)?.name || thread.game}</span>
                            )}
                            {!thread.game && <span className="comm-game-badge">All Games</span>}
                            <span>🕐 {thread.time || new Date(thread.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        {thread.description && (
                          <div className="comm-thread-detail-description">
                            <p>{thread.description}</p>
                          </div>
                        )}
                        <div className="comm-thread-detail-stats">
                          <span className="comm-thread-stat">👥 {thread.members || 1} members</span>
                          <span className="comm-thread-stat">📝 {thread.posts || 0} posts</span>
                        </div>
                        <div className="comm-thread-posts">
                          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            Thread posts will appear here
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              ) : (
                <div className="comm-feed">
                  {sortedThreads.length === 0 ? (
                    <div className="comm-empty-state">
                      <Users size={48} />
                      <h3>No community threads yet</h3>
                      <p>Create your first community thread to start a discussion!</p>
                    </div>
                  ) : (
                    <div className="threads-grid" style={{ '--content-width': `${contentWidth}px` }}>
                      {sortedThreads.map(thread => {
                        const renderThreadContent = () => {
                          switch(thread.type) {
                            case 'gaming':
                              return (
                                <div className="thread-gaming">
                                  {thread.image && (
                                    <div className="thread-image-container">
                                      <img src={thread.image} alt="gaming" />
                                    </div>
                                  )}
                                  <div className="thread-gaming-content">
                                    <div className="thread-gaming-icon">🎮</div>
                                    <h3 className="thread-card-title">{thread.title}</h3>
                                    {thread.description && <p className="thread-card-description">{thread.description}</p>}
                                  </div>
                                </div>
                              );
                            case 'art':
                              return (
                                <div className="thread-art">
                                  {thread.image && (
                                    <div className="thread-image-container">
                                      <img src={thread.image} alt="art" />
                                    </div>
                                  )}
                                  <div className="thread-art-content">
                                    <div className="thread-art-icon">🎨</div>
                                    <h3 className="thread-card-title">{thread.title}</h3>
                                    {thread.description && <p className="thread-card-description">{thread.description}</p>}
                                  </div>
                                </div>
                              );
                            case 'music':
                              return (
                                <div className="thread-music">
                                  <div className="thread-music-header">
                                    <div className="thread-music-icon">🎵</div>
                                    <h3 className="thread-card-title">{thread.title}</h3>
                                  </div>
                                  {thread.description && <p className="thread-card-description">{thread.description}</p>}
                                  <div className="thread-music-waveform">
                                    <div className="waveform-bar"></div>
                                    <div className="waveform-bar"></div>
                                    <div className="waveform-bar"></div>
                                    <div className="waveform-bar"></div>
                                    <div className="waveform-bar"></div>
                                  </div>
                                </div>
                              );
                            case 'tech':
                              return (
                                <div className="thread-tech">
                                  <div className="thread-tech-header">
                                    <div className="thread-tech-icon">💻</div>
                                    <h3 className="thread-card-title">{thread.title}</h3>
                                  </div>
                                  {thread.description && <p className="thread-card-description">{thread.description}</p>}
                                  <div className="thread-tech-code">
                                    <code>{'// Tech discussion thread'}</code>
                                  </div>
                                </div>
                              );
                            case 'fitness':
                              return (
                                <div className="thread-fitness">
                                  <div className="thread-fitness-header">
                                    <div className="thread-fitness-icon">💪</div>
                                    <h3 className="thread-card-title">{thread.title}</h3>
                                  </div>
                                  {thread.description && <p className="thread-card-description">{thread.description}</p>}
                                  <div className="thread-fitness-stats">
                                    <div className="fitness-stat">🔥 Active</div>
                                    <div className="fitness-stat">📊 Progress</div>
                                  </div>
                                </div>
                              );
                            case 'cooking':
                              return (
                                <div className="thread-cooking">
                                  {thread.image && (
                                    <div className="thread-image-container">
                                      <img src={thread.image} alt="cooking" />
                                    </div>
                                  )}
                                  <div className="thread-cooking-content">
                                    <div className="thread-cooking-icon">🍳</div>
                                    <h3 className="thread-card-title">{thread.title}</h3>
                                    {thread.description && <p className="thread-card-description">{thread.description}</p>}
                                  </div>
                                </div>
                              );
                            case 'travel':
                              return (
                                <div className="thread-travel">
                                  {thread.image && (
                                    <div className="thread-image-container">
                                      <img src={thread.image} alt="travel" />
                                    </div>
                                  )}
                                  <div className="thread-travel-content">
                                    <div className="thread-travel-icon">✈️</div>
                                    <h3 className="thread-card-title">{thread.title}</h3>
                                    {thread.description && <p className="thread-card-description">{thread.description}</p>}
                                    <div className="thread-travel-location">📍 Location</div>
                                  </div>
                                </div>
                              );
                            case 'photography':
                              return (
                                <div className="thread-photography">
                                  {thread.image && (
                                    <div className="thread-image-container">
                                      <img src={thread.image} alt="photography" />
                                    </div>
                                  )}
                                  <div className="thread-photography-content">
                                    <div className="thread-photography-icon">📸</div>
                                    <h3 className="thread-card-title">{thread.title}</h3>
                                    {thread.description && <p className="thread-card-description">{thread.description}</p>}
                                  </div>
                                </div>
                              );
                            case 'books':
                              return (
                                <div className="thread-books">
                                  <div className="thread-books-header">
                                    <div className="thread-books-icon">📚</div>
                                    <h3 className="thread-card-title">{thread.title}</h3>
                                  </div>
                                  {thread.description && <p className="thread-card-description">{thread.description}</p>}
                                  <div className="thread-books-pages">
                                    <div className="book-page"></div>
                                    <div className="book-page"></div>
                                    <div className="book-page"></div>
                                  </div>
                                </div>
                              );
                            default: // discussion
                              return (
                                <div className="thread-discussion">
                                  <div className="thread-discussion-header">
                                    <div className="thread-discussion-icon">💬</div>
                                    <h3 className="thread-card-title">{thread.title}</h3>
                                  </div>
                                  {thread.description && <p className="thread-card-description">{thread.description}</p>}
                                </div>
                              );
                          }
                        };

                        return (
                          <article key={thread.id} className={`thread-card thread-type-${thread.type || 'discussion'}`} onClick={() => setSelectedThreadId(thread.id)}>
                            <div className="thread-card-content">
                              {renderThreadContent()}
                              <div className="thread-card-meta">
                                <span className="thread-card-author">by {thread.author}</span>
                                {thread.game && (
                                  <span className="thread-game-badge">{gameList.find(g => g.id === thread.game)?.name || thread.game}</span>
                                )}
                                {!thread.game && <span className="thread-game-badge">All Games</span>}
                              </div>
                            </div>
                            <div className="thread-card-footer">
                              <div className="thread-card-stats">
                                <span className="thread-stat">👥 {thread.members || 1}</span>
                                <span className="thread-stat">📝 {thread.posts || 0}</span>
                                <span className="thread-stat">🕐 {thread.time || new Date(thread.createdAt).toLocaleDateString()}</span>
                              </div>
                              <button className="thread-enter-btn" onClick={(e) => { e.stopPropagation(); setSelectedThreadId(thread.id); }}>
                                Join →
                              </button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              {/* Create Post Form */}
              {showPostForm && (
                <div 
                  className="create-petition-form-container"
                  style={{ '--content-width': `${contentWidth}px` }}
                >
                  <div className="create-petition-form">
                    <div className="create-petition-form-header">
                      <h2>Create New Post</h2>
                      <p className="create-petition-description">Share something with the community</p>
                    </div>
                    <div className="post-type-selector-wrapper" ref={postTypeDropdownRef}>
                      <button
                        type="button"
                        className="post-type-selector-btn"
                        onClick={() => setPostTypeDropdownOpen(!postTypeDropdownOpen)}
                        style={{ '--content-width': `${contentWidth}px` }}
                      >
                        <span className="post-type-selector-label">
                          {postType === 'text' ? 'Text Post' :
                           postType === 'speedrun' ? 'Speedrun' :
                           postType === 'achievement' ? 'Achievement' :
                           postType === 'screenshot' ? 'Screenshot' :
                           postType === 'image-text' ? 'Image + Text' :
                           postType === 'video' ? 'Video' :
                           postType === 'build' ? 'Build/Setup' :
                           postType === 'discussion' ? 'Discussion' :
                           postType === 'meme' ? 'Meme' :
                           postType === 'review' ? 'Review' :
                           postType === 'tournament' ? 'Tournament' : 'Text Post'}
                        </span>
                        <svg width="12" height="8" viewBox="0 0 12 8" fill="none" style={{ 
                          transform: postTypeDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'none'
                        }}>
                          <path d="M1 1L6 6L11 1" stroke="rgba(255, 255, 255, 0.6)" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                      </button>
                      {postTypeDropdownOpen && (
                        <div className="post-type-dropdown-menu" style={{ '--content-width': `${contentWidth}px` }}>
                          <button
                            type="button"
                            className={`post-type-option ${postType === 'text' ? 'active' : ''}`}
                            onClick={() => {
                              setPostType('text');
                              setPostTypeDropdownOpen(false);
                            }}
                          >
                            Text Post
                          </button>
                          <button
                            type="button"
                            className={`post-type-option ${postType === 'speedrun' ? 'active' : ''}`}
                            onClick={() => {
                              setPostType('speedrun');
                              setPostTypeDropdownOpen(false);
                            }}
                          >
                            Speedrun
                          </button>
                          <button
                            type="button"
                            className={`post-type-option ${postType === 'achievement' ? 'active' : ''}`}
                            onClick={() => {
                              setPostType('achievement');
                              setPostTypeDropdownOpen(false);
                            }}
                          >
                            Achievement
                          </button>
                          <button
                            type="button"
                            className={`post-type-option ${postType === 'screenshot' ? 'active' : ''}`}
                            onClick={() => {
                              setPostType('screenshot');
                              setPostTypeDropdownOpen(false);
                            }}
                          >
                            Screenshot
                          </button>
                          <button
                            type="button"
                            className={`post-type-option ${postType === 'image-text' ? 'active' : ''}`}
                            onClick={() => {
                              setPostType('image-text');
                              setPostTypeDropdownOpen(false);
                            }}
                          >
                            Image + Text
                          </button>
                          <button
                            type="button"
                            className={`post-type-option ${postType === 'video' ? 'active' : ''}`}
                            onClick={() => {
                              setPostType('video');
                              setPostTypeDropdownOpen(false);
                            }}
                          >
                            Video
                          </button>
                          <button
                            type="button"
                            className={`post-type-option ${postType === 'build' ? 'active' : ''}`}
                            onClick={() => {
                              setPostType('build');
                              setPostTypeDropdownOpen(false);
                            }}
                          >
                            Build/Setup
                          </button>
                          <button
                            type="button"
                            className={`post-type-option ${postType === 'discussion' ? 'active' : ''}`}
                            onClick={() => {
                              setPostType('discussion');
                              setPostTypeDropdownOpen(false);
                            }}
                          >
                            Discussion
                          </button>
                          <button
                            type="button"
                            className={`post-type-option ${postType === 'meme' ? 'active' : ''}`}
                            onClick={() => {
                              setPostType('meme');
                              setPostTypeDropdownOpen(false);
                            }}
                          >
                            Meme
                          </button>
                          <button
                            type="button"
                            className={`post-type-option ${postType === 'review' ? 'active' : ''}`}
                            onClick={() => {
                              setPostType('review');
                              setPostTypeDropdownOpen(false);
                            }}
                          >
                            Review
                          </button>
                          <button
                            type="button"
                            className={`post-type-option ${postType === 'tournament' ? 'active' : ''}`}
                            onClick={() => {
                              setPostType('tournament');
                              setPostTypeDropdownOpen(false);
                            }}
                          >
                            Tournament
                          </button>
                        </div>
                      )}
                    </div>
                    {(postType === 'achievement' || postType === 'build' || postType === 'discussion' || postType === 'review' || postType === 'tournament') && (
                      <input
                        className="comm-thread-title-input"
                        placeholder="Title..."
                        value={postTitle}
                        onChange={(e) => setPostTitle(e.target.value)}
                      />
                    )}
                    {(postType === 'speedrun') && (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                          type="number"
                          placeholder="Hours"
                          value={postTime.h || ''}
                          onChange={(e) => setPostTime({...postTime, h: parseInt(e.target.value) || 0})}
                          style={{ width: '80px', padding: '8px' }}
                        />
                        <span>:</span>
                        <input
                          type="number"
                          placeholder="Minutes"
                          value={postTime.m || ''}
                          onChange={(e) => setPostTime({...postTime, m: parseInt(e.target.value) || 0})}
                          style={{ width: '80px', padding: '8px' }}
                        />
                        <span>:</span>
                        <input
                          type="number"
                          placeholder="Seconds"
                          value={postTime.s || ''}
                          onChange={(e) => setPostTime({...postTime, s: parseInt(e.target.value) || 0})}
                          style={{ width: '80px', padding: '8px' }}
                        />
                        <span>.</span>
                        <input
                          type="number"
                          placeholder="MS"
                          value={postTime.ms || ''}
                          onChange={(e) => setPostTime({...postTime, ms: parseInt(e.target.value) || 0})}
                          style={{ width: '80px', padding: '8px' }}
                        />
                      </div>
                    )}
                    {(postType === 'review') && (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span>Rating:</span>
                        {Array.from({ length: 5 }).map((_, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setPostRating(i + 1)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              fontSize: '24px',
                              color: i < postRating ? '#ffd700' : 'rgba(255,255,255,0.3)',
                              cursor: 'pointer'
                            }}
                          >
                            ★
                          </button>
                        ))}
                      </div>
                    )}
                    {(postType === 'screenshot' || postType === 'image-text' || postType === 'speedrun' || postType === 'achievement' || postType === 'build' || postType === 'meme' || postType === 'review' || postType === 'tournament') && (
                      <input
                        className="comm-thread-title-input"
                        placeholder="Image URL..."
                        value={postImage}
                        onChange={(e) => setPostImage(e.target.value)}
                      />
                    )}
                    {(postType === 'video') && (
                      <input
                        className="comm-thread-title-input"
                        placeholder="Video URL..."
                        value={postVideo}
                        onChange={(e) => setPostVideo(e.target.value)}
                      />
                    )}
                  <textarea
                    className="comm-composer-input"
                      placeholder={postType === 'screenshot' ? "Caption (optional)..." : postType === 'meme' ? "Caption..." : "Share something..."}
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                      rows={4}
                    />
                    <div className="create-petition-actions">
                      <button
                        className="create-petition-cancel-btn"
                        onClick={() => {
                          setPostContent('');
                          setPostImage('');
                          setPostVideo('');
                          setPostType('text');
                          setPostRating(5);
                          setPostTime({ h: 0, m: 0, s: 0, ms: 0 });
                          setPostTitle('');
                          setShowPostForm(false);
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        className="create-petition-submit-btn"
                        onClick={handleCreatePost}
                        disabled={!postContent.trim() && !postImage && !postVideo}
                      >
                      Post
                    </button>
                  </div>
                </div>
              </div>
              )}
              {!showPostForm && (
                <div className="items-grid-controls" style={{ '--content-width': `${contentWidth}px` }}>
                  <div className="items-grid-controls-left">
                    <div className="items-count">{sortedPosts.length} {sortedPosts.length === 1 ? 'post' : 'posts'}</div>
                  </div>
                  <div className="items-grid-controls-right">
                    <button 
                      className="featured-deal-btn"
                      onClick={() => setShowPostForm(true)}
                    >
                      <Plus size={18} />
                      <span>Create Post</span>
                    </button>
                  </div>
                </div>
              )}
              <div 
                className="posts-grid" 
                style={{ 
                  '--content-width': `${contentWidth}px`,
                  // No left/right spacing
                  paddingLeft: '0',
                  paddingRight: '0'
                }}
              >
                {sortedPosts.length === 0 ? (
                  <div className="marketplace-empty-state">
                    <div className="empty-state-icon">📝</div>
                    <h3 className="empty-state-title">No posts yet</h3>
                    <p className="empty-state-description">Be the first to share something with the community!</p>
                    <button className="empty-state-action-btn" onClick={() => setShowPostForm(true)}>
                      <Plus size={16} />
                      <span>Create Post</span>
                    </button>
                  </div>
                ) : (
                  sortedPosts.map(p => {
                    const renderPostContent = () => {
                      switch(p.type) {
                        case 'speedrun':
                          return (
                            <div className="post-speedrun">
                              {p.image && (
                                <div className="post-image-container">
                                  <img src={p.image} alt="speedrun" />
                          </div>
                              )}
                              <div className="post-time-display">
                                <div className="post-time-big">
                                  {`${(p.h || 0).toString().padStart(2,'0')}:${(p.m || 0).toString().padStart(2,'0')}:${(p.s || 0).toString().padStart(2,'0')}.${((p.ms || 0)).toString().padStart(2,'0')}`}
                        </div>
                                <div className="post-time-label">Speedrun Time</div>
                        </div>
                              {p.text && <p className="post-text">{p.text}</p>}
                        </div>
                          );
                        case 'achievement':
                          return (
                            <div className="post-achievement">
                              {p.image && (
                                <div className="post-achievement-badge">
                                  <img src={p.image} alt="achievement" />
                                </div>
                              )}
                              <div className="post-achievement-content">
                                <h3 className="post-achievement-title">{p.title || 'Achievement Unlocked!'}</h3>
                                {p.text && <p className="post-text">{p.text}</p>}
                        </div>
                            </div>
                          );
                        case 'screenshot':
                          return (
                            <div className="post-screenshot">
                              {p.image && (
                                <div className="post-image-container">
                                  <img src={p.image} alt="screenshot" />
                                </div>
                              )}
                              {p.text && <p className="post-text">{p.text}</p>}
              </div>
                          );
                        case 'image-text':
                          return (
                            <div className="post-image-text">
                              {p.image && (
                                <div className="post-image-container">
                                  <img src={p.image} alt="post" />
                                </div>
                              )}
                              {p.text && <p className="post-text">{p.text}</p>}
          </div>
                          );
                        case 'video':
                          return (
                            <div className="post-video">
                              {p.video && (
                                <div className="post-video-container">
                                  <video src={p.video} controls />
                                </div>
                              )}
                              {p.text && <p className="post-text">{p.text}</p>}
                            </div>
                          );
                        case 'build':
                          return (
                            <div className="post-build">
                              <div className="post-build-header">
                                <h3 className="post-build-title">{p.title || 'Character Build'}</h3>
                                {p.game && <span className="post-build-game">{p.game}</span>}
                              </div>
                              {p.image && (
                                <div className="post-image-container">
                                  <img src={p.image} alt="build" />
                                </div>
                              )}
                              {p.text && <p className="post-text">{p.text}</p>}
                              {p.stats && (
                                <div className="post-build-stats">
                                  {Object.entries(p.stats).map(([key, value]) => (
                                    <div key={key} className="post-build-stat">
                                      <span className="stat-label">{key}</span>
                                      <span className="stat-value">{value}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        case 'discussion':
                          return (
                            <div className="post-discussion">
                              <h3 className="post-discussion-title">{p.title || 'Discussion'}</h3>
                              {p.text && <p className="post-text">{p.text}</p>}
                              {p.tags && p.tags.length > 0 && (
                                <div className="post-tags">
                                  {p.tags.map(t => <span key={t} className="post-tag">{t}</span>)}
                                </div>
                              )}
                            </div>
                          );
                        case 'meme':
                          return (
                            <div className="post-meme">
                              {p.image && (
                                <div className="post-image-container">
                                  <img src={p.image} alt="meme" />
                                </div>
                              )}
                              {p.text && (
                                <div className="post-meme-caption">
                                  <p className="post-text">{p.text}</p>
                                </div>
                              )}
                            </div>
                          );
                        case 'review':
                          return (
                            <div className="post-review">
                              <div className="post-review-header">
                                <h3 className="post-review-title">{p.title || 'Game Review'}</h3>
                                <div className="post-review-rating">
                                  {Array.from({ length: 5 }).map((_, i) => (
                                    <span key={i} className={`star ${i < (p.rating || 0) ? 'filled' : ''}`}>★</span>
                                  ))}
                                </div>
                              </div>
                              {p.image && (
                                <div className="post-image-container">
                                  <img src={p.image} alt="review" />
                                </div>
                              )}
                              {p.text && <p className="post-text">{p.text}</p>}
                            </div>
                          );
                        case 'tournament':
                          return (
                            <div className="post-tournament">
                              <div className="post-tournament-header">
                                <h3 className="post-tournament-title">{p.title || 'Tournament'}</h3>
                                <div className="post-tournament-badge">🏆</div>
                              </div>
                              {p.image && (
                                <div className="post-image-container">
                                  <img src={p.image} alt="tournament" />
                                </div>
                              )}
                              {p.text && <p className="post-text">{p.text}</p>}
                              {p.date && (
                                <div className="post-tournament-date">
                                  <span>📅 {p.date}</span>
                                </div>
                              )}
                            </div>
                          );
                        default: // text
                          return p.text ? <p className="post-text">{p.text}</p> : null;
                      }
                    };

                    return (
                      <div key={p.id} className={`post-card ${p.type ? `type-${p.type}` : 'type-text'}`}>
                        <div className="post-vote-section">
                          <button className="post-vote-up">▲</button>
                          <div className="post-vote-count">{p.likes || 0}</div>
                          <button className="post-vote-down">▼</button>
                        </div>
                        <div className="post-card-content-wrapper">
                          <div className="post-card-header">
                            <div className="post-avatar">👤</div>
                            <div className="post-meta">
                              <div className="post-author">
                                {p.author} 
                                {p.game && <span className="post-game-badge">{p.game}</span>}
                              </div>
                              <div className="post-time">{p.time}</div>
                            </div>
                          </div>
                          <div className="post-card-content">
                            {renderPostContent()}
                          </div>
                          <div className="post-card-footer">
                            <button className="post-action">💬 {p.comments || 0} Comments</button>
                            <button className="post-action">↗︎ Share</button>
                            <button className="post-action">🔖 Save</button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Community;
