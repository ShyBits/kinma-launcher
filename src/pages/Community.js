import React, { useRef } from 'react';
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
  
  // Thread creation state
  const [threadTitle, setThreadTitle] = React.useState('');
  const [threadDescription, setThreadDescription] = React.useState('');
  const [threadGame, setThreadGame] = React.useState('all');
  const [showThreadCreator, setShowThreadCreator] = React.useState(false);
  const [selectedThreadId, setSelectedThreadId] = React.useState(null);
  const [threadSearchQuery, setThreadSearchQuery] = React.useState('');
  const [postContent, setPostContent] = React.useState('');

  // Right sidebar resizing state
  const [communityRightSidebarWidth, setCommunityRightSidebarWidth] = React.useState(() => {
    try {
      const saved = localStorage.getItem('communityRightSidebarWidth');
      return saved ? parseInt(saved, 10) : 260;
    } catch (_) {
      return 260;
    }
  });
  const [isRightSidebarResizing, setIsRightSidebarResizing] = React.useState(false);
  const rightSidebarResizeRef = useRef(null);

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
  const gameList = React.useMemo(() => {
    let list = [{ id: 'all', name: 'All Games', banner: null }];
    try {
      // Get all games from all users (shared)
      const allGames = getAllUsersData('customGames');
      // Filter to only show published games
      const publishedGames = allGames.filter(game => {
        const status = game.status || game.fullFormData?.status || 'draft';
        return status === 'public' || status === 'published';
      });
      const getCard = (g) => (
        g.card || g.cardImage || g.fullFormData?.cardImage ||
        g.fullFormData?.card || g.metadata?.cardImage || g.files?.card?.path || null
      );
      const getLogo = (g) => (
        g.gameLogo || g.logo || g.fullFormData?.gameLogo || g.fullFormData?.titleImage || g.titleImage || g.title || null
      );
      const customs = publishedGames.map(g => ({
        id: g.gameId,
        name: g.name || g.gameName || g.id,
        banner: null,
        card: getCard(g) || g.banner || g.bannerImage || null,
        logo: getLogo(g)
      }));
      list = [...list, ...customs];
    } catch (_) {}
    return list;
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
    setShowThreadCreator(false);
  };

  const handleCreatePost = () => {
    if (!postContent.trim()) return;
    const newPost = {
      id: Date.now(),
      text: postContent,
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
  };

  // Close picker when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (e) => {
      if (!pickerOpen) return;
      const el = pickerRef.current;
      if (el && !el.contains(e.target)) {
        setPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [pickerOpen]);

  // Right sidebar resize handlers
  const handleRightSidebarResizeStart = (e) => {
    setIsRightSidebarResizing(true);
    e.preventDefault();
    e.stopPropagation();
  };

  React.useEffect(() => {
    if (!isRightSidebarResizing) return;

    const handleResize = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const windowWidth = window.innerWidth;
      const clientX = e.clientX !== undefined ? e.clientX : windowWidth;
      const newWidth = windowWidth - clientX;
      const minWidth = 180;
      const maxWidth = 400;
      
      // Clamp to boundaries
      const clampedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
      setCommunityRightSidebarWidth(clampedWidth);
    };

    const handleResizeEnd = (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      setIsRightSidebarResizing(false);
      // Save to localStorage only at the end
      try {
        localStorage.setItem('communityRightSidebarWidth', communityRightSidebarWidth.toString());
      } catch (_) {}
    };

    const handleMouseLeave = () => {
      // When mouse leaves window, clamp to boundaries
      const minWidth = 180;
      const maxWidth = 400;
      const currentWidth = communityRightSidebarWidth;
      const clampedWidth = Math.max(minWidth, Math.min(maxWidth, currentWidth));
      if (clampedWidth !== currentWidth) {
        setCommunityRightSidebarWidth(clampedWidth);
      }
    };

    // Use capture phase to ensure we catch events even outside the window
    document.addEventListener('mousemove', handleResize, true);
    document.addEventListener('mouseup', handleResizeEnd, true);
    window.addEventListener('mouseup', handleResizeEnd, true);
    window.addEventListener('mouseleave', handleMouseLeave);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleResize, true);
      document.removeEventListener('mouseup', handleResizeEnd, true);
      window.removeEventListener('mouseup', handleResizeEnd, true);
      window.removeEventListener('mouseleave', handleMouseLeave);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isRightSidebarResizing, communityRightSidebarWidth]);

  return (
    <div className="community">
      <div className="community-layout-3">
        {/* Left: Filters */}
        <aside className="community-left">
          <div className="community-left-content">
            {/* CHOOSE GAME Filter - Keep this design exactly as is */}
            <div className="comm-filter-group">
              <div className="comm-filter-label">Choose game</div>
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
                {pickerOpen && (
                  <div className="comm-picker-menu">
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
                            <div className="comm-picker-notifications">
                              <button
                                className={`comm-picker-notification-toggle ${gameNotifications[g.id]?.posts ? 'enabled' : ''}`}
                                onClick={(e) => toggleGameNotification(g.id, 'posts', e)}
                                title={gameNotifications[g.id]?.posts ? 'Disable game posts notifications' : 'Enable game posts notifications'}
                              >
                                <MessageSquare size={12} />
                              </button>
                              <button
                                className={`comm-picker-notification-toggle ${gameNotifications[g.id]?.threads ? 'enabled' : ''}`}
                                onClick={(e) => toggleGameNotification(g.id, 'threads', e)}
                                title={gameNotifications[g.id]?.threads ? 'Disable community threads notifications' : 'Enable community threads notifications'}
                              >
                                <Users size={12} />
                              </button>
                              <button
                                className={`comm-picker-notification-toggle ${gameNotifications[g.id]?.workshop ? 'enabled' : ''}`}
                                onClick={(e) => toggleGameNotification(g.id, 'workshop', e)}
                                title={gameNotifications[g.id]?.workshop ? 'Disable workshop notifications' : 'Enable workshop notifications'}
                              >
                                <Package size={12} />
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Notification Toggles - Show when a game is selected */}
            {((selectedTab === 'posts' && postsGame !== 'all') || (selectedTab === 'workshop' && workshopGame !== 'all')) && (
              <div className="comm-notification-toggles">
                {selectedTab === 'posts' && !showThreads && (
                  <button
                    className={`comm-notification-toggle ${gameNotifications[postsGame]?.posts ? 'enabled' : ''}`}
                    onClick={(e) => toggleGameNotification(postsGame, 'posts', e)}
                    title={gameNotifications[postsGame]?.posts ? 'Disable game posts notifications' : 'Enable game posts notifications'}
                  >
                    <MessageSquare size={14} />
                    <span>Notify me about new game posts</span>
                  </button>
                )}
                {selectedTab === 'posts' && showThreads && (
                  <button
                    className={`comm-notification-toggle ${gameNotifications[postsGame]?.threads ? 'enabled' : ''}`}
                    onClick={(e) => toggleGameNotification(postsGame, 'threads', e)}
                    title={gameNotifications[postsGame]?.threads ? 'Disable community threads notifications' : 'Enable community threads notifications'}
                  >
                    <Users size={14} />
                    <span>Notify me about new community threads</span>
                  </button>
                )}
                {selectedTab === 'workshop' && (
                  <button
                    className={`comm-notification-toggle ${gameNotifications[workshopGame]?.workshop ? 'enabled' : ''}`}
                    onClick={(e) => toggleGameNotification(workshopGame, 'workshop', e)}
                    title={gameNotifications[workshopGame]?.workshop ? 'Disable workshop notifications' : 'Enable workshop notifications'}
                  >
                    <Package size={14} />
                    <span>Notify me about new workshop items</span>
                  </button>
                )}
              </div>
            )}

            {/* Thread Creation - Only show when threads view is active */}
            {selectedTab === 'posts' && showThreads && (
              <div className="comm-thread-creation">
                <button 
                  className="comm-create-thread-btn" 
                  onClick={() => setShowThreadCreator(!showThreadCreator)}
                >
                  <Plus size={16} />
                  <span>{showThreadCreator ? 'Cancel' : 'Create Community Thread'}</span>
                </button>
                {showThreadCreator && (
                  <div className="comm-thread-form">
                    <input
                      className="comm-thread-title-input"
                      placeholder="Community thread name..."
                      value={threadTitle}
                      onChange={(e) => setThreadTitle(e.target.value)}
                    />
                    <textarea
                      className="comm-thread-description-input"
                      placeholder="Description (optional)..."
                      value={threadDescription}
                      onChange={(e) => setThreadDescription(e.target.value)}
                      rows={3}
                    />
                    <select
                      className="comm-thread-game-select"
                      value={threadGame}
                      onChange={(e) => setThreadGame(e.target.value)}
                    >
                      <option value="all">No game</option>
                      {gameList.filter(g => g.id !== 'all').map(game => (
                        <option key={game.id} value={game.id}>{game.name}</option>
                      ))}
                    </select>
                    <button className="comm-thread-submit-btn" onClick={handleCreateThread}>
                      Create Community Thread
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Stats Section */}
            <div className="comm-stats-section">
              <div className="comm-stats-row">
                <div className="comm-stat">
                  <div className="comm-stat-num">{savedSet.size}</div>
                  <div className="comm-stat-label">saved</div>
                </div>
                <div className="comm-stat">
                  <div className="comm-stat-num">{sortedPosts.length}</div>
                  <div className="comm-stat-label">game posts</div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Center: Feed */}
        <main className="community-center">
          <div className="comm-header">
            <div className="comm-title">
              {selectedTab === 'workshop'
                ? (workshopGame === 'all' ? 'All Workshop' : `${workshopGame} Workshop`)
                : showThreads
                ? 'All Community Threads'
                : (postsGame === 'all' ? 'All Communities' : `${postsGame} Community`)
              }
            </div>
            <div className="comm-subtitle">
              {selectedTab === 'workshop'
                ? 'Browse community content'
                : showThreads
                ? `${sortedThreads.length} community threads • sorted by popularity`
                : `${sortedPosts.length} game posts • sorted by ${postsSortBy}`
              }
            </div>
          </div>

          {selectedTab === 'workshop' ? (
            <WorkshopSection gameId={workshopGame === 'all' ? null : workshopGame} />
          ) : showThreads ? (
            <>
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
                    sortedThreads.map(thread => (
                      <article key={thread.id} className="comm-thread-card">
                        <div className="comm-thread-card-header">
                          <div className="comm-thread-icon">#</div>
                          <div className="comm-thread-card-info">
                            <h3 className="comm-thread-card-title">{thread.title}</h3>
                            <div className="comm-thread-card-meta">
                              <span className="comm-thread-card-author">by {thread.author}</span>
                              {thread.game && (
                                <span className="comm-game-badge">{gameList.find(g => g.id === thread.game)?.name || thread.game}</span>
                              )}
                              {!thread.game && <span className="comm-game-badge">All Games</span>}
                            </div>
                          </div>
                        </div>
                        {thread.description && (
                          <p className="comm-thread-card-description">{thread.description}</p>
                        )}
                        <div className="comm-thread-card-stats">
                          <span className="comm-thread-stat">👥 {thread.members || 1} members</span>
                          <span className="comm-thread-stat">📝 {thread.posts || 0} posts</span>
                          <span className="comm-thread-stat">🕐 {thread.time || new Date(thread.createdAt).toLocaleDateString()}</span>
                        </div>
                        <button className="comm-thread-enter-btn" onClick={() => setSelectedThreadId(thread.id)}>
                          Enter Community Thread →
                        </button>
                      </article>
                    ))
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="comm-composer">
                <div className="comm-composer-avatar">👤</div>
                <div className="comm-composer-content">
                  <textarea
                    className="comm-composer-input"
                    placeholder="Share something..."
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                    rows={3}
                  />
                  <div className="comm-composer-actions">
                    <button className="comm-post-btn" onClick={handleCreatePost}>
                      Post
                    </button>
                  </div>
                </div>
              </div>
              <div className="comm-feed">
                {sortedPosts.length === 0 ? (
                  <div className="comm-empty-state">
                    <MessageSquare size={48} />
                    <h3>No game posts yet</h3>
                    <p>Be the first to share something!</p>
                  </div>
                ) : (
                  sortedPosts.map(p => (
                    <article key={p.id} className={`comm-post ${p.type ? `type-${p.type}` : ''}`}>
                      <header className="comm-post-header">
                        <div className="comm-avatar">👤</div>
                        <div className="comm-meta">
                          <div className="comm-author">
                            {p.author} 
                            {p.game && <span className="comm-game-badge">{p.game}</span>}
                          </div>
                          <div className="comm-time">{p.time}</div>
                        </div>
                      </header>
                      {p.type === 'speedrun' ? (
                        <div className="comm-speedrun">
                          <div className="comm-time-big">{`${p.h?.toString().padStart(2,'0')}:${p.m?.toString().padStart(2,'0')}:${p.s?.toString().padStart(2,'0')}.${(p.ms??0).toString().padStart(2,'0')}`}</div>
                          <p className="comm-text">{p.text}</p>
                        </div>
                      ) : p.type === 'screenshot' ? (
                        <div className="comm-screenshot">
                          {p.image && (<div className="comm-shot"><img src={p.image} alt="screenshot" /></div>)}
                          <p className="comm-text">{p.text}</p>
                        </div>
                      ) : (
                        <p className="comm-text">{p.text}</p>
                      )}
                      {p.tags?.length ? (
                        <div className="comm-post-tags">
                          {p.tags.map(t => <span key={t} className="comm-post-tag">{t}</span>)}
                        </div>
                      ) : null}
                      <footer className="comm-actions">
                        <button className="comm-action">❤️ {p.likes}</button>
                        <button className="comm-action">💬 {p.comments}</button>
                        <button className="comm-action">↗︎ Share</button>
                      </footer>
                    </article>
                  ))
                )}
              </div>
            </>
          )}
        </main>

        {/* Right Sidebar Resizer */}
        <div 
          ref={rightSidebarResizeRef}
          className={`sidebar-resizer ${isRightSidebarResizing ? 'resizing' : ''}`}
          onMouseDown={handleRightSidebarResizeStart}
        />

        {/* Right: Navigation Sidebar */}
        <aside 
          className={`community-right marketplace-sidebar ${isRightSidebarResizing ? 'resizing' : ''}`}
          style={{ width: communityRightSidebarWidth }}
        >
          <div className="sidebar-title">Community</div>
          <nav className="sidebar-nav">
            <div className="sidebar-nav-section">
              <h3 className="sidebar-section-title">Content</h3>
              <button 
                className={`sidebar-nav-item ${selectedTab === 'posts' && !showThreads ? 'active' : ''}`}
                onClick={() => {
                  setSelectedTab('posts');
                  setShowThreads(false);
                }}
              >
                <MessageSquare size={18} />
                <span>Game Posts</span>
                {sortedPosts.length > 0 && (
                  <span className="sidebar-badge">{sortedPosts.length}</span>
                )}
              </button>
              <button 
                className={`sidebar-nav-item ${selectedTab === 'posts' && showThreads ? 'active' : ''}`}
                onClick={() => {
                  setSelectedTab('posts');
                  setShowThreads(true);
                }}
              >
                <Users size={18} />
                <span>Community Threads</span>
                {sortedThreads.length > 0 && (
                  <span className="sidebar-badge">{sortedThreads.length}</span>
                )}
              </button>
              <button 
                className={`sidebar-nav-item ${selectedTab === 'workshop' ? 'active' : ''}`}
                onClick={() => setSelectedTab('workshop')}
              >
                <Package size={18} />
                <span>Workshop</span>
              </button>
            </div>
          </nav>
        </aside>
      </div>
    </div>
  );
};

export default Community;
