import React, { useState, useEffect } from 'react';
import { Star, Download, Heart, Play, Users, TrendingUp, TrendingDown, Share2, Bookmark, MessageSquare, Bell } from 'lucide-react';
import './Store.css';

const Store = ({ isPreview = false, previewGameData = null }) => {
  const [favoriteGames, setFavoriteGames] = useState(new Set());
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [isBannerHovered, setIsBannerHovered] = useState(false);

  const toggleFavorite = (gameId) => {
    setFavoriteGames(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(gameId)) {
        newFavorites.delete(gameId);
      } else {
        newFavorites.add(gameId);
      }
      return newFavorites;
    });
  };

  const getTrendingIcon = (trendingValue) => {
    const isPositive = trendingValue.startsWith('+');
    return isPositive ? TrendingUp : TrendingDown;
  };

  const getTrendingDisplay = (trendingValue) => {
    // Remove the + or - sign and add it back with proper color
    const value = trendingValue.replace(/^[+-]/, '');
    const isPositive = trendingValue.startsWith('+');
    return {
      value: `${isPositive ? '+' : '-'}${value}`,
      isPositive
    };
  };

  // Top 5 meistgespielte Spiele für den Banner
  const topGames = [
    {
      id: 1,
      name: 'Pathline',
      developer: 'Kinma',
      price: 0,
      rating: 4.8,
      players: '2.4M',
      trending: '+15%',
      description: 'Your main game - an epic adventure with stunning visuals and immersive gameplay that will keep you engaged for hours.',
      tags: ['Action', 'Adventure', 'Free'],
      image: '/api/placeholder/1200/400'
    },
    {
      id: 2,
      name: 'Shadow Walker',
      developer: 'Stealth Studios',
      price: 19.99,
      rating: 4.6,
      players: '1.8M',
      trending: '+8%',
      description: 'Master the art of stealth in this intense action game with incredible graphics and challenging gameplay.',
      tags: ['Stealth', 'Action', 'Premium'],
      image: '/api/placeholder/1200/400'
    },
    {
      id: 3,
      name: 'Cyberpunk Arena',
      developer: 'Future Games',
      price: 29.99,
      rating: 4.7,
      players: '1.5M',
      trending: '+12%',
      description: 'Fight in futuristic arenas with cybernetic enhancements and high-tech weapons in this fast-paced shooter.',
      tags: ['Cyberpunk', 'Shooter', 'Multiplayer'],
      image: '/api/placeholder/1200/400'
    },
    {
      id: 4,
      name: 'Racing Thunder',
      developer: 'Speed Studios',
      price: 18.99,
      rating: 4.4,
      players: '1.2M',
      trending: '+5%',
      description: 'Experience high-speed racing with realistic physics and stunning graphics in this adrenaline-pumping game.',
      tags: ['Racing', 'Sports', 'Multiplayer'],
      image: '/api/placeholder/1200/400'
    },
    {
      id: 5,
      name: 'Zombie Survival',
      developer: 'Horror Games',
      price: 14.99,
      rating: 4.5,
      players: '980K',
      trending: '+3%',
      description: 'Survive the zombie apocalypse in this intense survival horror game with strategic gameplay and terrifying atmosphere.',
      tags: ['Horror', 'Survival', 'Strategy'],
      image: '/api/placeholder/1200/400'
    }
  ];

  // Use preview data when in preview mode, otherwise use the game from topGames array
  const currentFeaturedGame = isPreview && previewGameData 
    ? {
        id: 999,
        name: previewGameData.name,
        developer: previewGameData.developer,
        price: previewGameData.price,
        rating: 0,
        players: '0',
        trending: '+0%',
        description: previewGameData.description,
        tags: previewGameData.genre ? [previewGameData.genre] : [],
        image: '/api/placeholder/1200/400'
      }
    : topGames[currentBannerIndex];

  // Auto-switch zwischen Top 5 Games alle 5 Sekunden
  useEffect(() => {
    if (isPreview || isBannerHovered) return; // Disabled in preview mode or when hovered
    
    const interval = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % topGames.length);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [isPreview, isBannerHovered, topGames.length]);

  const nextBanner = () => {
    if (isPreview) return; // Disabled in preview mode
    setCurrentBannerIndex((prev) => (prev + 1) % topGames.length);
  };

  const prevBanner = () => {
    if (isPreview) return; // Disabled in preview mode
    setCurrentBannerIndex((prev) => (prev - 1 + topGames.length) % topGames.length);
  };

  const goToBanner = (index) => {
    if (isPreview) return; // Disabled in preview mode
    setCurrentBannerIndex(index);
  };

  return (
    <div className="store">
      {/* Featured Game Banner */}
      <div className="featured-section">
        <div 
          className="featured-banner"
          onMouseEnter={() => setIsBannerHovered(true)}
          onMouseLeave={() => setIsBannerHovered(false)}
        >
          <div className="featured-background">
            <div className="featured-image">
              {isPreview && previewGameData && previewGameData.bannerImage ? (
                <img 
                  src={URL.createObjectURL(previewGameData.bannerImage)} 
                  alt="Game banner" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div className="featured-placeholder">🎮</div>
              )}
            </div>
            <div className="featured-overlay"></div>
          </div>
          
          <div className="featured-content">
            <div className="featured-badge">FEATURED</div>
            <div className="featured-title-section">
              <h1 className="featured-title">{currentFeaturedGame.name}</h1>
              <div className="featured-stats">
                <div className="stat">
                  <Star size={16} />
                  <span>{currentFeaturedGame.rating}</span>
                </div>
                <div className="stat">
                  <Users size={16} />
                  <span>{currentFeaturedGame.players}</span>
                </div>
                <div className={`stat trending ${!getTrendingDisplay(currentFeaturedGame.trending).isPositive ? 'negative' : ''}`}>
                  {React.createElement(getTrendingIcon(currentFeaturedGame.trending), { size: 16 })}
                  <span>{getTrendingDisplay(currentFeaturedGame.trending).value}</span>
                </div>
              </div>
            </div>
            <p className="featured-description">{currentFeaturedGame.description}</p>
            <div className="featured-tags">
              {currentFeaturedGame.tags && currentFeaturedGame.tags.length > 0 ? (
                currentFeaturedGame.tags.map(tag => (
                  <span key={tag} className="tag">{tag}</span>
                ))
              ) : (
                <span className="tag">Game</span>
              )}
            </div>
            <div className="featured-actions">
              <button className="play-btn">
                <Play size={20} />
                {currentFeaturedGame.price === 0 ? 'Play Free' : `Buy for $${currentFeaturedGame.price}`}
              </button>
              <button 
                className={`favorite-btn ${favoriteGames.has(currentFeaturedGame.id) ? 'favorited' : ''}`}
                onClick={() => toggleFavorite(currentFeaturedGame.id)}
              >
                <Heart size={18} fill={favoriteGames.has(currentFeaturedGame.id) ? 'currentColor' : 'none'} />
              </button>
            </div>
          </div>
          
          {/* Navigation Buttons */}
          <button 
            className={`banner-nav prev ${isPreview ? 'disabled' : ''}`} 
            onClick={prevBanner}
            disabled={isPreview}
          >
            ←
          </button>
          <button 
            className={`banner-nav next ${isPreview ? 'disabled' : ''}`} 
            onClick={nextBanner}
            disabled={isPreview}
          >
            →
          </button>
          
          {/* Banner Indicators */}
          <div className="banner-indicators">
            {topGames.map((_, index) => (
              <button
                key={index}
                className={`indicator ${index === currentBannerIndex ? 'active' : ''} ${isPreview ? 'disabled' : ''}`}
                onClick={() => goToBanner(index)}
                disabled={isPreview}
              />
            ))}
          </div>
        </div>
        
        {/* Taskbar */}
        <div className="store-taskbar">
          <div className="taskbar-content">
            <button className="taskbar-btn taskbar-btn-grid" title="Toggle Grid View">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* 3x3 grid with gaps */}
                <rect x="1" y="1" width="4" height="4" fill="currentColor"/>
                <rect x="7" y="1" width="4" height="4" fill="currentColor"/>
                <rect x="13" y="1" width="4" height="4" fill="currentColor"/>
                <rect x="1" y="7" width="4" height="4" fill="currentColor"/>
                <rect x="7" y="7" width="4" height="4" fill="currentColor"/>
                <rect x="13" y="7" width="4" height="4" fill="currentColor"/>
                <rect x="1" y="13" width="4" height="4" fill="currentColor"/>
                <rect x="7" y="13" width="4" height="4" fill="currentColor"/>
                <rect x="13" y="13" width="4" height="4" fill="currentColor"/>
              </svg>
            </button>
            <button className="taskbar-btn taskbar-btn-favorite" title="Add to Favorites">
              <Heart size={18} />
            </button>
            <button className="taskbar-btn taskbar-btn-wishlist" title="Add to Wishlist">
              <Bookmark size={18} />
            </button>
            <button className="taskbar-btn taskbar-btn-share" title="Share">
              <Share2 size={18} />
            </button>
            <button className="taskbar-btn taskbar-btn-follow" title="Follow">
              <Bell size={18} />
            </button>
            <button className="taskbar-btn taskbar-btn-comment" title="Comment">
              <MessageSquare size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Store;