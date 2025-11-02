import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Filter, MessageSquare, Star } from 'lucide-react';
import './Library.css';

const Library = () => {
  const navigate = useNavigate();
  const [iconSize, setIconSize] = useState(180);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);

  const getRatingColor = (rating) => {
    const numRating = Math.round(rating);
    if (numRating >= 5) return '#FFD700'; // Gold
    if (numRating === 4) return '#FFB800'; // Yellow-orange
    if (numRating === 3) return '#FF9500'; // Orange
    if (numRating === 2) return '#FF6B00'; // Dark orange
    if (numRating === 1) return '#FF4444'; // Red-orange
    return 'rgba(255,255,255,0.3)';
  };

  const [customGames, setCustomGames] = useState([]);

  useEffect(() => {
    const load = () => {
      try {
        const stored = localStorage.getItem('customGames');
        setCustomGames(stored ? JSON.parse(stored) : []);
      } catch (_) {
        setCustomGames([]);
      }
    };
    load();
    const handler = () => load();
    window.addEventListener('customGameUpdate', handler);
    window.addEventListener('storage', (e) => { if (e.key === 'customGames') load(); });
    return () => window.removeEventListener('customGameUpdate', handler);
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
    const fontSize = Math.round(13 * scaleFactor);
    const iconSizeScaled = Math.round(13 * scaleFactor);

    return (
      <div 
        ref={cardRef}
        className="library-game-card"
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
        </div>
        <div className="library-card-footer">
          <div className="library-rating" style={{ color: getRatingColor(game.rating) }}>
            <Star size={iconSizeScaled} color="currentColor" fill="currentColor" />
            <span style={{ fontSize: `${fontSize}px` }}>{game.rating}</span>
          </div>
          <button 
            className="library-comments-btn"
            onClick={(e) => handleCommentsClick(e, game.id)}
          >
            <MessageSquare size={Math.round(14 * scaleFactor)} color="#ffffff" fill="#ffffff" strokeWidth={0} />
            <span style={{ fontSize: `${Math.round(12 * scaleFactor)}px` }}> {game.commentCount.toLocaleString()}</span>
          </button>
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
      playTime: g.playtime || '0h',
      lastPlayed: g.lastPlayed || 'Never',
      isInstalled: true,
      rating: g.rating || 0,
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
