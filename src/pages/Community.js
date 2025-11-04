import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import WorkshopSection from '../components/WorkshopSection';
import { MessageSquare, Package, Users } from 'lucide-react';
import { getUserData, getUserScopedKey, getAllUsersData, saveUserData, getCurrentUserId } from '../utils/UserDataManager';
import './Community.css';

// Posts will be loaded from API or localStorage

const Community = () => {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = React.useState('posts'); // posts | workshop
  
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

  const toggleTag = (tag) => {
    setSelectedTags(prev => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag); else next.add(tag);
      return next;
    });
  };

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

  // Reload posts when user changes or posts are updated
  React.useEffect(() => {
    const loadPosts = () => {
      try {
        const allPosts = getAllUsersData('communityPosts');
        const publishedPosts = allPosts.filter(post => {
          const status = post.status || 'published';
          return status === 'public' || status === 'published';
        });
        setPosts(publishedPosts);
      } catch (_) {
        setPosts([]);
      }
    };

    const loadThreads = () => {
      try {
        const allThreads = getAllUsersData('communityThreads');
        const publishedThreads = allThreads.filter(thread => {
          const status = thread.status || 'published';
          return status === 'public' || status === 'published';
        });
        setThreads(publishedThreads);
      } catch (_) {
        setThreads([]);
      }
    };

    loadPosts();
    loadThreads();

    const handleStorageChange = (e) => {
      if (e.key && e.key.startsWith('communityPosts_')) {
        loadPosts();
      }
      if (e.key && e.key.startsWith('communityThreads_')) {
        loadThreads();
      }
    };

    const handleUserChanged = () => {
      loadPosts();
      loadThreads();
    };
    
    window.addEventListener('user-changed', handleUserChanged);
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('user-changed', handleUserChanged);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Posts filtering and sorting (uses posts-specific state)
  const filteredByGame = posts.filter(p => (postsGame === 'all' || p.game === postsGame));
  const filtered = filteredByGame.filter(p => (postsSelectedTags.size === 0 || p.tags?.some(t => postsSelectedTags.has(t))));
  const sortedPosts = [...filtered].sort((a,b) => postsSortBy === 'popular' ? (b.likes - a.likes) : 0);
  
  // Threads filtering and sorting (uses posts game filter when in merged section)
  const filteredThreads = threads.filter(t => {
    // If there's a search query, filter by title or description
    if (threadSearchQuery.trim()) {
      const query = threadSearchQuery.toLowerCase();
      const matchesTitle = t.title?.toLowerCase().includes(query);
      const matchesDescription = t.description?.toLowerCase().includes(query);
      const matchesAuthor = t.author?.toLowerCase().includes(query);
      return matchesTitle || matchesDescription || matchesAuthor;
    }
    // If game filter is set and not 'all', optionally filter by game (but threads can exist without games)
    if (postsGame !== 'all') {
      return !t.game || t.game === postsGame;
    }
    return true;
  });
  
  const sortedThreads = [...filteredThreads].sort((a,b) => {
    if (postsSortBy === 'popular') return (b.likes || 0) - (a.likes || 0);
    if (postsSortBy === 'recent') return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    return 0;
  });
  
  // Handle thread creation (creates a new thread space/room for a game)
  const handleCreateThread = () => {
    if (!threadTitle.trim()) {
      alert('Please enter a thread title');
      return;
    }
    
    const currentUser = getCurrentUserId();
    if (!currentUser) {
      alert('Please log in to create a thread');
      return;
    }
    
    try {
      const authUser = JSON.parse(localStorage.getItem('authUser') || '{}');
      const authorName = authUser.name || 'Anonymous';
      
      const newThread = {
        id: Date.now().toString(),
        title: threadTitle.trim(),
        description: threadDescription.trim() || '',
        author: authorName,
        authorId: currentUser,
        game: threadGame === 'all' ? null : threadGame,
        createdAt: new Date().toISOString(),
        time: 'just now',
        members: 1, // Starting member count
        posts: 0, // Posts within this thread
        status: 'published',
        tags: []
      };
      
      const existingThreads = getUserData('communityThreads', []);
      const updatedThreads = [...existingThreads, newThread];
      saveUserData('communityThreads', updatedThreads);
      
      // Reload threads
      const allThreads = getAllUsersData('communityThreads');
      const publishedThreads = allThreads.filter(thread => {
        const status = thread.status || 'published';
        return status === 'public' || status === 'published';
      });
      setThreads(publishedThreads);
      
      // Reset form
      setThreadTitle('');
      setThreadDescription('');
      setThreadGame('all');
      setShowThreadCreator(false);
      // Auto-select the newly created thread
      setSelectedThreadId(newThread.id);
      
      // Trigger storage event for other tabs
      window.dispatchEvent(new Event('storage'));
    } catch (error) {
      console.error('Error creating thread:', error);
      alert('Failed to create thread');
    }
  };

  // Handle click outside for picker
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

  return (
    <div className="community" data-tab={selectedTab}>
      <div className="community-topbar">
        <div className="comm-tabs">
          <button className={`comm-tab ${selectedTab==='posts'?'active':''}`} data-tab="posts" onClick={()=>setSelectedTab('posts')}>
            <MessageSquare size={16} />
            <span>Community</span>
          </button>
          <button className={`comm-tab ${selectedTab==='workshop'?'active':''}`} data-tab="workshop" onClick={()=>setSelectedTab('workshop')}>
            <Package size={16} />
            <span>Workshop</span>
          </button>
        </div>
      </div>
      <div className="community-layout-3">
        {/* Left: Filters */}
        <aside className="community-left">
          {selectedTab === 'posts' ? (
            <div className="comm-card">
              <div className="comm-view-switch">
                <button 
                  className={`comm-switch-btn ${!showThreads ? 'active' : ''}`}
                  onClick={() => setShowThreads(false)}
                >
                  <MessageSquare size={14} />
                  <span>Posts</span>
                </button>
                <button 
                  className={`comm-switch-btn ${showThreads ? 'active' : ''}`}
                  onClick={() => setShowThreads(true)}
                >
                  <Users size={14} />
                  <span>Threads</span>
                </button>
              </div>
              <div className="comm-card-title">Community</div>
              {showThreads ? (
                <>
                  <div className="comm-filter-group">
                    <button 
                      className="comm-create-thread-btn-sidebar" 
                      onClick={() => setShowThreadCreator(!showThreadCreator)}
                    >
                      <Users size={16} />
                      <span>{showThreadCreator ? 'Cancel' : 'Create Thread'}</span>
                    </button>
                    {showThreadCreator && (
                      <div className="comm-thread-form-sidebar">
                        <input
                          className="comm-thread-title"
                          placeholder="Thread name..."
                          value={threadTitle}
                          onChange={(e) => setThreadTitle(e.target.value)}
                        />
                        <textarea
                          className="comm-thread-content"
                          placeholder="Description (optional)..."
                          value={threadDescription}
                          onChange={(e) => setThreadDescription(e.target.value)}
                          rows={2}
                        />
                        <div className="comm-thread-game-select">
                          <label className="comm-thread-label">Game (optional):</label>
                          <select
                            className="comm-thread-game-selector"
                            value={threadGame}
                            onChange={(e) => setThreadGame(e.target.value)}
                          >
                            <option value="all">No game</option>
                            {gameList.filter(g => g.id !== 'all').map(game => (
                              <option key={game.id} value={game.id}>{game.name}</option>
                            ))}
                          </select>
                        </div>
                        <button className="comm-post-btn" onClick={handleCreateThread}>
                          Create
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="comm-filter-group">
                    <div className="comm-filter-label">My Threads</div>
                    <ul className="comm-thread-list">
                      {sortedThreads.length === 0 ? (
                        <li className="comm-thread-list-empty">No threads yet</li>
                      ) : (
                        sortedThreads.map(thread => (
                          <li 
                            key={thread.id} 
                            className={`comm-thread-list-item ${selectedThreadId === thread.id ? 'active' : ''}`}
                            onClick={() => setSelectedThreadId(selectedThreadId === thread.id ? null : thread.id)}
                          >
                            <div className="comm-thread-list-icon">#</div>
                            <div className="comm-thread-list-info">
                              <div className="comm-thread-list-title">{thread.title}</div>
                              <div className="comm-thread-list-meta">
                                {thread.game ? (
                                  <span className="comm-game-badge-small">{gameList.find(g => g.id === thread.game)?.name || thread.game}</span>
                                ) : (
                                  <span className="comm-game-badge-small">All Games</span>
                                )}
                                <span className="comm-thread-list-stats">{thread.members || 1} members</span>
                              </div>
                            </div>
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                </>
              ) : null}
              <div className="comm-filter-group">
                <div className="comm-filter-label">Choose game</div>
                <div className="comm-game-picker" ref={pickerRef}>
                  <button className="comm-picker-btn" onClick={()=> setPickerOpen(!pickerOpen)}>
                    <div className="comm-picker-card">
                      {postsGame==='all' ? (
                        <span>🎮</span>
                      ) : (gameList.find(g=>g.id===postsGame)?.card ? (
                        <img src={gameList.find(g=>g.id===postsGame)?.card} alt="card" />
                      ) : (
                        <span>🎮</span>
                      ))}
                    </div>
                    <span className="comm-picker-label">{gameList.find(g => g.id === postsGame)?.name || 'Select Game'}</span>
                  </button>
                  {pickerOpen && (
                    <div className="comm-picker-menu">
                      <div className="comm-picker-search">
                        <input
                          className="comm-picker-input"
                          value={pickerQuery}
                          onChange={(e)=> setPickerQuery(e.target.value)}
                          placeholder="Search games..."
                          autoFocus
                        />
                      </div>
                      {gameList.filter(g => g.name.toLowerCase().includes(pickerQuery.toLowerCase())).map(g => (
                        <div key={g.id} className={`comm-picker-option ${g.id==='all'?'is-all':''} ${postsGame===g.id?'active':''}`} onClick={()=>{ setPostsGame(g.id); setPickerOpen(false); if (g.id==='all') navigate('/community'); else navigate(`/game/${g.id}/community`); }}>
                          {g.id!=='all' && (
                            <div className="comm-picker-logo">
                              {g.logo ? <img src={g.logo} alt={g.name} /> : <span>🎮</span>}
                            </div>
                          )}
                          <span className="comm-picker-name">{g.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="comm-filter-group">
                <div className="comm-filter-label">Trending communities</div>
                <ul className="comm-mini-list">
                  {gameList.filter(g=>g.id!=='all').slice(0,3).map(g => (
                    <li key={g.id} className="comm-mini-item" onClick={()=>{ setPostsGame(g.id); navigate(`/game/${g.id}/community`); }}>
                      <div className="comm-picker-logo">{g.logo ? <img src={g.logo} alt={g.name} /> : <span>🎮</span>}</div>
                      <span className="comm-mini-name">{g.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="comm-card">
              <div className="comm-card-title">Filters</div>
              <div className="comm-filter-group">
                <div className="comm-filter-label">Choose game</div>
                <div className="comm-game-picker" ref={pickerRef}>
                  <button className="comm-picker-btn" onClick={()=> setPickerOpen(!pickerOpen)}>
                    <div className="comm-picker-card">
                      {workshopGame==='all' ? (
                        <span>🎮</span>
                      ) : (gameList.find(g=>g.id===workshopGame)?.card ? (
                        <img src={gameList.find(g=>g.id===workshopGame)?.card} alt="card" />
                      ) : (
                        <span>🎮</span>
                      ))}
                    </div>
                    <span className="comm-picker-label">{gameList.find(g => g.id === workshopGame)?.name || 'Select Game'}</span>
                  </button>
                  {pickerOpen && (
                    <div className="comm-picker-menu">
                      <div className="comm-picker-search">
                        <input
                          className="comm-picker-input"
                          value={pickerQuery}
                          onChange={(e)=> setPickerQuery(e.target.value)}
                          placeholder="Search games..."
                          autoFocus
                        />
                      </div>
                      {gameList.filter(g => g.name.toLowerCase().includes(pickerQuery.toLowerCase())).map(g => (
                        <div key={g.id} className={`comm-picker-option ${g.id==='all'?'is-all':''} ${workshopGame===g.id?'active':''}`} onClick={()=>{ setWorkshopGame(g.id); setPickerOpen(false); }}>
                          {g.id!=='all' && (
                            <div className="comm-picker-logo">
                              {g.logo ? <img src={g.logo} alt={g.name} /> : <span>🎮</span>}
                            </div>
                          )}
                          <span className="comm-picker-name">{g.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="comm-filter-group">
                <div className="comm-filter-label">Trending communities</div>
                <ul className="comm-mini-list">
                  {gameList.filter(g=>g.id!=='all').slice(0,3).map(g => (
                    <li key={g.id} className="comm-mini-item" onClick={()=>{ setWorkshopGame(g.id); }}>
                      <div className="comm-picker-logo">{g.logo ? <img src={g.logo} alt={g.name} /> : <span>🎮</span>}</div>
                      <span className="comm-mini-name">{g.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </aside>

        {/* Center: Feed */}
        <main className="community-center">
          <div className="comm-header">
            <div className="comm-title">
              {selectedTab === 'workshop'
                ? (workshopGame === 'all' ? 'All Workshop' : `${workshopGame} Workshop`)
                : showThreads
                ? 'All Threads'
                : (postsGame === 'all' ? 'All Communities' : `${postsGame} Community`)
              }
            </div>
            <div className="comm-subtitle">
              {selectedTab === 'workshop'
                ? 'Browse community content'
                : showThreads
                ? `${sortedThreads.length} threads • sorted by ${postsSortBy}`
                : `${sortedPosts.length} posts • sorted by ${postsSortBy}`
              }
            </div>
          </div>
          {selectedTab==='workshop' ? (
            <WorkshopSection gameId={workshopGame==='all'? null : workshopGame} />
          ) : showThreads ? (
            <>
              <div className="comm-thread-search">
                <input
                  className="comm-thread-search-input"
                  type="text"
                  placeholder="Search threads by title, description, or author..."
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
                            ← Back to Threads
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
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      No threads yet. Create your first thread in the sidebar!
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
                          Enter Thread →
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
                <input className="comm-input" placeholder="Share something..." />
                <button className="comm-post-btn">Post</button>
              </div>
              <div className="comm-feed">
                {sortedPosts.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No posts yet. Be the first to share something!
                  </div>
                ) : (
                  sortedPosts.map(p => (
                  <article key={p.id} className={`comm-post ${p.type ? `type-${p.type}` : ''}`}>
                    <header className="comm-post-header">
                      <div className="comm-avatar">👤</div>
                      <div className="comm-meta">
                        <div className="comm-author">{p.author} {p.game && (<span className="comm-game-badge">{p.game}</span>)}</div>
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

        {/* Right: Extras */}
        <aside className="community-right">
          <div className="comm-right-section">
            <div className="comm-card-title">Saved</div>
            <div className="comm-stats-row">
              <div className="comm-stat">
                <div className="comm-stat-num">{savedSet.size}</div>
                <div className="comm-stat-label">saved posts</div>
              </div>
              <div className="comm-stat">
                <div className="comm-stat-num">{sortedPosts.length}</div>
                <div className="comm-stat-label">posts here</div>
              </div>
            </div>
          </div>
          <div className="comm-card">
            <div className="comm-card-title">Trending</div>
            <ul className="comm-list">
              {/* Trending topics will be loaded from API */}
            </ul>
          </div>
          <div className="comm-card">
            <div className="comm-card-title">Suggested creators</div>
            <ul className="comm-list">
              {/* Suggested creators will be loaded from API */}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Community;

