import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import WorkshopSection from '../components/WorkshopSection';
import { MessageSquare, Package } from 'lucide-react';
import './Community.css';

// Posts will be loaded from API or localStorage

const Community = () => {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const [currentGame, setCurrentGame] = React.useState(gameId || 'all');
  const [selectedTags, setSelectedTags] = React.useState(new Set());
  const [sortBy, setSortBy] = React.useState('trending');
  const [selectedTab, setSelectedTab] = React.useState('posts'); // posts | workshop
  const [savedSet] = React.useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('communitySaved') || '[]')); } catch (_) { return new Set(); }
  });
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const pickerRef = React.useRef(null);
  const [pickerQuery, setPickerQuery] = React.useState('');

  // Build game list from customGames only (no built-ins)
  const gameList = React.useMemo(() => {
    let list = [{ id: 'all', name: 'All Games', banner: null }];
    try {
      const stored = JSON.parse(localStorage.getItem('customGames') || '[]');
      const getCard = (g) => (
        g.card || g.cardImage || g.fullFormData?.cardImage ||
        g.fullFormData?.card || g.metadata?.cardImage || g.files?.card?.path || null
      );
      const getLogo = (g) => (
        g.gameLogo || g.logo || g.fullFormData?.gameLogo || g.fullFormData?.titleImage || g.titleImage || g.title || null
      );
      const customs = stored.map(g => ({
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

  // Load posts from localStorage or empty array
  const [posts] = React.useState(() => {
    try {
      const stored = localStorage.getItem('communityPosts');
      return stored ? JSON.parse(stored) : [];
    } catch (_) {
      return [];
    }
  });

  const filteredByGame = posts.filter(p => (currentGame === 'all' || p.game === currentGame));
  const filtered = filteredByGame.filter(p => (selectedTags.size === 0 || p.tags?.some(t => selectedTags.has(t))));

  const sortedPosts = [...filtered].sort((a,b) => sortBy === 'popular' ? (b.likes - a.likes) : 0);

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
    <div className="community">
      <div className="community-topbar">
        <div className="comm-tabs">
          <button className={`comm-tab ${selectedTab==='posts'?'active':''}`} onClick={()=>setSelectedTab('posts')}>
            <MessageSquare size={16} />
            <span>Posts</span>
          </button>
          <button className={`comm-tab ${selectedTab==='workshop'?'active':''}`} onClick={()=>setSelectedTab('workshop')}>
            <Package size={16} />
            <span>Workshop</span>
          </button>
        </div>
      </div>
      <div className="community-layout-3">
        {/* Left: Filters */}
        <aside className="community-left">
          <div className="comm-card">
            <div className="comm-card-title">Filters</div>
            <div className="comm-filter-group">
              <div className="comm-filter-label">Choose game</div>
              <div className="comm-game-picker" ref={pickerRef}>
                <button className="comm-picker-btn" onClick={()=> setPickerOpen(!pickerOpen)}>
                  <div className="comm-picker-card">
                    {currentGame==='all' ? (
                      <span>🎮</span>
                    ) : (gameList.find(g=>g.id===currentGame)?.card ? (
                      <img src={gameList.find(g=>g.id===currentGame)?.card} alt="card" />
                    ) : (
                      <span>🎮</span>
                    ))}
                  </div>
                  <span className="comm-picker-label">{gameList.find(g => g.id === currentGame)?.name || 'Select Game'}</span>
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
                      <div key={g.id} className={`comm-picker-option ${g.id==='all'?'is-all':''} ${currentGame===g.id?'active':''}`} onClick={()=>{ setCurrentGame(g.id); setPickerOpen(false); if (g.id==='all') navigate('/community'); else navigate(`/game/${g.id}/community`); }}>
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
            {/* Saved stats moved to right sidebar */}
            <div className="comm-filter-group">
              <div className="comm-filter-label">Trending communities</div>
              <ul className="comm-mini-list">
                {gameList.filter(g=>g.id!=='all').slice(0,3).map(g => (
                  <li key={g.id} className="comm-mini-item" onClick={()=>{ setCurrentGame(g.id); navigate(`/game/${g.id}/community`); }}>
                    <div className="comm-picker-logo">{g.logo ? <img src={g.logo} alt={g.name} /> : <span>🎮</span>}</div>
                    <span className="comm-mini-name">{g.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </aside>

        {/* Center: Feed */}
        <main className="community-center">
          <div className="comm-header">
            <div className="comm-title">{currentGame === 'all' ? 'All Communities' : `${currentGame} Community`}</div>
            <div className="comm-subtitle">{sortedPosts.length} posts • sorted by {sortBy}</div>
          </div>
          {selectedTab==='workshop' ? (
            <WorkshopSection gameId={currentGame==='all'? null : currentGame} />
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

