import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Filter, Award } from 'lucide-react';
import { getUserData, saveUserData, getUserScopedKey } from '../utils/UserDataManager';
import './Library.css';

const Library = () => {
  const navigate = useNavigate();
  const [iconSize, setIconSize] = useState(180);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);

  // Rating removed in favor of user-specific stats

  const [customGames, setCustomGames] = useState([]);
  const [playingMap, setPlayingMap] = useState(() => {
    try { return JSON.parse(localStorage.getItem('playingGames') || '{}'); } catch (_) { return {}; }
  });

  useEffect(() => {
    const load = () => {
      try {
        // Load user-specific custom games
        const userGames = getUserData('customGames', []);
        setCustomGames(userGames);
      } catch (_) {
        setCustomGames([]);
      }
    };
    load();
    const handler = () => load();
    window.addEventListener('customGameUpdate', handler);
    
    // Listen for storage changes for this user's games
    const handleStorageChange = (e) => {
      if (e.key === getUserScopedKey('customGames')) {
        load();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Also reload when user changes
    const handleUserChange = () => load();
    window.addEventListener('user-changed', handleUserChange);
    
    // Listen for game play/stop to reflect "Currently playing"
    const onGameStatus = () => {
      try { setPlayingMap(JSON.parse(localStorage.getItem('playingGames') || '{}')); } catch (_) {}
    };
    window.addEventListener('gameStatusChanged', onGameStatus);

    return () => {
      window.removeEventListener('customGameUpdate', handler);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('user-changed', handleUserChange);
      window.removeEventListener('gameStatusChanged', onGameStatus);
    };
  }, []);

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

  const LibraryGameCard = ({ game, iconSize }) => {
    const cardRef = useRef(null);
    const [tilt, setTilt] = useState({ x: 0, y: 0 });

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
    };

    // Calculate sizes based on icon size (scale factor)
    const scaleFactor = iconSize / 180; // 180 is the base/default size
    const fontSize = Math.round(14 * scaleFactor); // larger playtime
    const iconSizeScaled = Math.round(14 * scaleFactor);

    return (
      <div 
        ref={cardRef}
        className={`library-game-card ${playingMap[game.id] ? 'currently-playing' : ''}`}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transition: 'transform 0.05s linear'
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

  return (
    <div className="library-page">
      <div className="library-header">
        <div>
          <h1>My Games</h1>
          <p>{mergedGames.length} games in your library</p>
        </div>
        <div className="library-controls">
          <div className="library-size-control">
            <div className="size-control-header">
              <span className="size-title">Tile size</span>
              <span className="size-value">{iconSize}px</span>
            </div>
            <div className="custom-slider-container">
              {sliderSteps.map((step, index) => (
                <button
                  key={step}
                  className={`slider-tick ${iconSize === step ? 'active' : ''}`}
                  onClick={() => setIconSize(step)}
                  style={{
                    left: `${(index / (sliderSteps.length - 1)) * 100}%`,
                  }}
                  aria-label={`Set size to ${step}px`}
                />
              ))}
              <input
                type="range"
                min="140"
                max="220"
                value={iconSize}
                onChange={(e) => handleSliderChange(Number(e.target.value))}
                className="size-slider"
              />
              <div 
                className="slider-fill"
                style={{
                  width: `${((iconSize - 140) / (220 - 140)) * 100}%`
                }}
              />
            </div>
          </div>
          <button 
            className="library-filter-btn"
            onClick={() => setFilterMenuOpen(!filterMenuOpen)}
          >
            <Filter size={14} />
            <span>Filter</span>
          </button>
        </div>
      </div>

      <div className="library-grid" style={{ gridTemplateColumns: `repeat(auto-fill, ${iconSize}px)` }}>
        {mergedGames.map((game) => (
          <LibraryGameCard key={game.id} game={game} iconSize={iconSize} />
        ))}
      </div>
    </div>
  );
};

export default Library;
