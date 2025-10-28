import React, { useState, useRef } from 'react';
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

  const games = [
    {
      id: 'the-finals',
      name: 'THE FINALS',
      banner: '/public/images/games/pathline-banner.jpg',
      playTime: '24h 32m',
      lastPlayed: '2 hours ago',
      isInstalled: true,
      rating: 4.5,
      commentCount: 1284
    },
    {
      id: 'counter-strike-2',
      name: 'Counter-Strike 2',
      banner: '/public/images/games/pathline-banner.jpg',
      playTime: '156h 12m',
      lastPlayed: 'Yesterday',
      isInstalled: true,
      rating: 4.8,
      commentCount: 5678
    },
    {
      id: 'skate',
      name: 'skate.',
      banner: '/public/images/games/pathline-banner.jpg',
      playTime: '8h 45m',
      lastPlayed: '3 days ago',
      isInstalled: true,
      rating: 4.2,
      commentCount: 892
    },
    {
      id: 'hellblade',
      name: 'Hellblade: Senua\'s Sacrifice',
      banner: '/public/images/games/pathline-banner.jpg',
      playTime: '12h 30m',
      lastPlayed: '1 week ago',
      isInstalled: true,
      rating: 4.7,
      commentCount: 2134
    },
    {
      id: 'cyberpunk-2077',
      name: 'Cyberpunk 2077',
      banner: '/public/images/games/pathline-banner.jpg',
      playTime: '89h 15m',
      lastPlayed: '2 days ago',
      isInstalled: true,
      rating: 4.6,
      commentCount: 3421
    },
    {
      id: 'valorant',
      name: 'VALORANT',
      banner: '/public/images/games/pathline-banner.jpg',
      playTime: '342h 44m',
      lastPlayed: 'Today',
      isInstalled: true,
      rating: 4.9,
      commentCount: 8943
    }
  ];

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

  return (
    <div className="library-page">
      <div className="library-header">
        <div>
          <h1>My Games</h1>
          <p>{games.length} games in your library</p>
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
        {games.map((game) => (
          <LibraryGameCard key={game.id} game={game} iconSize={iconSize} />
        ))}
      </div>
    </div>
  );
};

export default Library;
