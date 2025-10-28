import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MessageSquare, Heart, Share2, MoreHorizontal, Plus, Image, Link, Filter, ChevronDown, Users, Clock, Star, TrendingUp, Gamepad2, User, Bot, Sparkles, UserCircle, Hash, ThumbsUp, ThumbsDown, Package } from 'lucide-react';
import WorkshopSection from '../components/WorkshopSection';
import './Community.css';

const Community = () => {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = useState('workshop');
  const [selectedGame, setSelectedGame] = useState(gameId || 'all');
  const [showGameDropdown, setShowGameDropdown] = useState(false);
  const [gameSearchQuery, setGameSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState({
    contentType: 'all',
    timeRange: 'all',
    sortBy: 'trending'
  });

  // Game data mapping - same as in other components
  const games = [
    { id: 'all', name: 'All Games', image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&h=600&fit=crop' },
    {
      id: 'the-finals',
      name: 'THE FINALS',
      image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&h=600&fit=crop',
      icon: 'T'
    },
    {
      id: 'cs2',
      name: 'Counter-Strike 2',
      image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&h=600&fit=crop',
      icon: 'C'
    },
    {
      id: 'skate',
      name: 'skate.',
      image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&h=600&fit=crop',
      icon: 'S'
    },
    {
      id: 'hellblade',
      name: 'Hellblade: Senua\'s Sacrifice',
      image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&h=600&fit=crop',
      icon: 'H'
    },
    {
      id: 'cyberpunk',
      name: 'Cyberpunk 2077',
      image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&h=600&fit=crop',
      icon: 'C'
    },
    {
      id: 'valorant',
      name: 'VALORANT',
      image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&h=600&fit=crop',
      icon: 'V'
    }
  ];

  // Intelligente Suchfunktion
  const searchGames = (query) => {
    if (!query.trim()) return games;

    const searchTerm = query.toLowerCase().trim();

    return games.filter(game => {
      const gameName = game.name.toLowerCase();

      // Exakte Übereinstimmung
      if (gameName === searchTerm) return true;

      // Beginnt mit dem Suchbegriff
      if (gameName.startsWith(searchTerm)) return true;

      // Enthält den Suchbegriff
      if (gameName.includes(searchTerm)) return true;

      // Fuzzy-Suche: Teile des Namens
      const nameWords = gameName.split(' ');
      const searchWords = searchTerm.split(' ');

      // Alle Suchwörter müssen in den Namen-Wörtern gefunden werden
      return searchWords.every(searchWord =>
        nameWords.some(nameWord =>
          nameWord.includes(searchWord) || searchWord.includes(nameWord)
        )
      );
    }).sort((a, b) => {
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();

      // Exakte Übereinstimmung zuerst
      if (aName === searchTerm && bName !== searchTerm) return -1;
      if (bName === searchTerm && aName !== searchTerm) return 1;

      // Beginnt mit Suchbegriff zuerst
      if (aName.startsWith(searchTerm) && !bName.startsWith(searchTerm)) return -1;
      if (bName.startsWith(searchTerm) && !aName.startsWith(searchTerm)) return 1;

      // Alphabetische Sortierung für den Rest
      return aName.localeCompare(bName);
    });
  };

  const filteredGames = isSearching ? searchGames(gameSearchQuery) : games;

  const posts = [
    // THE FINALS posts
    {
      id: 1,
      author: 'BuildDestroyer99',
      avatar: UserCircle,
      time: '1 hour ago',
      content: 'The destruction mechanics in THE FINALS are absolutely insane! Just collapsed an entire building on the enemy team 🔥',
      image: null,
      likes: 156,
      comments: 23,
      shares: 12,
      tags: ['#destruction', '#gameplay', '#thefinals'],
      game: 'the-finals',
      type: 'discussion'
    },
    {
      id: 2,
      author: 'FinalsFanatic',
      avatar: Gamepad2,
      time: '3 hours ago',
      content: 'Epic tournament match! Check out this insane comeback we pulled off in the last 30 seconds 💪',
      image: null,
      likes: 89,
      comments: 15,
      shares: 8,
      tags: ['#tournament', '#comeback', '#thefinals'],
      game: 'the-finals',
      type: 'discussion'
    },

    // CS2 posts
    {
      id: 3,
      author: 'GlobalElite',
      avatar: TrendingUp,
      time: '2 hours ago',
      content: 'New CS2 update is amazing! The improved smoke mechanics make the game so much more tactical. Thoughts?',
      image: null,
      likes: 234,
      dislikes: 8,
      comments: 45,
      shares: 23,
      tags: ['#cs2', '#update', '#smoke'],
      game: 'cs2',
      type: 'discussion'
    },
    {
      id: 4,
      author: 'AWPMaster',
      avatar: UserCircle,
      time: '5 hours ago',
      content: 'Just hit an insane noscope across the map! Sometimes you just feel it 🏹',
      image: null,
      likes: 167,
      comments: 34,
      shares: 15,
      tags: ['#awp', '#noscope', '#cs2'],
      game: 'cs2',
      type: 'discussion'
    },

    // skate. posts
    {
      id: 5,
      author: 'StreetSkater',
      avatar: Gamepad2,
      time: '4 hours ago',
      content: 'The physics in skate. are so realistic! Finally a skateboarding game that feels authentic 🛼',
      image: null,
      likes: 98,
      comments: 18,
      shares: 9,
      tags: ['#physics', '#skateboarding', '#skate'],
      game: 'skate',
      type: 'discussion'
    },

    // Hellblade posts
    {
      id: 6,
      author: 'StorySeeker',
      avatar: Sparkles,
      time: '1 day ago',
      content: 'Hellblade\'s portrayal of mental health is incredibly powerful. This game touched me deeply 💙',
      image: null,
      likes: 312,
      comments: 67,
      shares: 45,
      tags: ['#story', '#mentalhealth', '#hellblade'],
      game: 'hellblade',
      type: 'discussion'
    },
    {
      id: 7,
      author: 'AudioFan',
      avatar: UserCircle,
      time: '2 days ago',
      content: 'The binaural audio in Hellblade is absolutely phenomenal. Play with headphones for the full experience!',
      image: null,
      likes: 189,
      comments: 28,
      shares: 19,
      tags: ['#audio', '#binaural', '#hellblade'],
      game: 'hellblade',
      type: 'discussion'
    },

    // Cyberpunk 2077 posts
    {
      id: 8,
      author: 'NightCityDweller',
      avatar: Gamepad2,
      time: '30 minutes ago',
      content: 'After all the updates, Cyberpunk 2077 is finally the game it should have been. Night City feels alive! 🌆',
      image: null,
      likes: 445,
      comments: 89,
      shares: 34,
      tags: ['#cyberpunk', '#nightcity', '#updates'],
      game: 'cyberpunk',
      type: 'discussion'
    },

    // VALORANT posts
    {
      id: 9,
      author: 'TacticalShooter',
      avatar: TrendingUp,
      time: '1 hour ago',
      content: 'Reyna main here! The agent balancing this season is actually really good. Finally some proper nerfs to Jett!',
      image: null,
      likes: 123,
      comments: 45,
      shares: 12,
      tags: ['#valorant', '#reyna', '#balance'],
      game: 'valorant',
      type: 'discussion'
    },
    {
      id: 10,
      author: 'ClutchKing',
      avatar: UserCircle,
      time: '3 hours ago',
      content: 'Just won a 1v4 clutch in overtime! The pressure was insane but we got the dub 🔥',
      image: null,
      likes: 89,
      comments: 15,
      shares: 7,
      tags: ['#clutch', '#1v4', '#valorant'],
      game: 'valorant',
      type: 'discussion'
    }
  ];

  const filteredPosts = posts.filter(post => 
    selectedGame === 'all' || post.game === selectedGame
  );

  const handleFilterChange = (filterType, value) => {
    setSelectedFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const handleGameSearch = (e) => {
    const query = e.target.value;
    setGameSearchQuery(query);
    setIsSearching(query.length > 0);
    
    // Wenn exakte Übereinstimmung gefunden wird, automatisch auswählen
    if (query.length > 0) {
      const exactMatch = games.find(game => 
        game.name.toLowerCase() === query.toLowerCase()
      );
      if (exactMatch) {
        setSelectedGame(exactMatch.id);
      }
    }
  };

  const handleGameSelect = (newGameId) => {
    setSelectedGame(newGameId);
    setGameSearchQuery('');
    setIsSearching(false);
    setShowGameDropdown(false);

    // Navigate to game-specific community if selecting a specific game and not already in that game's community
    if (newGameId !== 'all' && (!gameId || gameId !== newGameId)) {
      navigate(`/game/${newGameId}/community`);
    }
  };

  const renderPost = (post) => {
    const AvatarIcon = post.avatar;
    
    switch (post.type) {
      case 'speedrun':
        return (
          <div key={post.id} className="community-post speedrun-post">
            <div className="speedrun-stats">
              <div className="record-category">{post.category}</div>
              <div className="record-time">
                <span className="time-line">02h</span>
                <span className="time-line">12min</span>
                <span className="time-line">30s</span>
              </div>
            </div>
            
            <div className="post-content">
              <div className="post-main-content">
                <div className="post-header">
                  <div className="post-author">
                    <div className="author-avatar">
                      <AvatarIcon size={20} />
                    </div>
                    <div className="author-info">
                      <span className="author-name">{post.author}</span>
                      <span className="post-time">{post.time}</span>
                    </div>
                  </div>
                  <div className="post-type-icon">
                    <TrendingUp size={16} />
                  </div>
                </div>
                
                <p>{post.content}</p>
                <div className="hashtag-hover">
                  <button className="action-btn hashtag-btn">
                    <Hash size={16} />
                  </button>
                  <div className="hashtag-tooltip">
                    {post.tags.map((tag, index) => (
                      <span key={index} className="hashtag-item">{tag}</span>
                    ))}
                  </div>
                </div>
               </div>
               
               <div className="post-actions">
                 <button className="action-btn">
                   <ThumbsUp size={16} />
                   <span>{post.likes}</span>
                 </button>
                 <button className="action-btn">
                   <ThumbsDown size={16} />
                   <span>{post.dislikes}</span>
                 </button>
                 <button className="action-btn">
                   <MessageSquare size={16} />
                   <span>{post.comments}</span>
                 </button>
               </div>
             </div>
           </div>
         );

      case 'artwork':
        return (
          <div key={post.id} className="community-post artwork-post">
            <div className="post-header">
              <div className="post-author">
                <div className="author-avatar">
                  <AvatarIcon size={20} />
                </div>
                <div className="author-info">
                  <span className="author-name">{post.author}</span>
                  <span className="post-time">{post.time}</span>
                </div>
              </div>
              <div className="post-type-icon">
                <Sparkles size={16} />
              </div>
            </div>
            
            <div className="post-content">
              <p>{post.content}</p>
              {post.image && (
                <div className="post-image artwork-image">
                  <div className="image-placeholder">
                    <Image size={32} />
                    <span>Artwork</span>
                  </div>
                </div>
              )}
              <div className="post-tags">
                {post.tags.map((tag, index) => (
                  <span key={index} className="post-tag">{tag}</span>
                ))}
              </div>
            </div>
            
            <div className="post-actions">
              <button className="action-btn">
                <Heart size={16} />
                <span>{post.likes}</span>
              </button>
              <button className="action-btn">
                <MessageSquare size={16} />
                <span>{post.comments}</span>
              </button>
              <button className="action-btn">
                <Share2 size={16} />
                <span>{post.shares}</span>
              </button>
            </div>
          </div>
        );

      case 'screenshot':
        return (
          <div key={post.id} className="community-post screenshot-post">
            <div className="post-header">
              <div className="post-author">
                <div className="author-avatar">
                  <AvatarIcon size={20} />
                </div>
                <div className="author-info">
                  <span className="author-name">{post.author}</span>
                  <span className="post-time">{post.time}</span>
                </div>
              </div>
              <div className="post-type-icon">
                <Image size={16} />
              </div>
            </div>
            
            <div className="post-content">
              <p>{post.content}</p>
              {post.image && (
                <div className="post-image screenshot-image">
                  <div className="image-placeholder">
                    <Image size={32} />
                    <span>Screenshot</span>
                  </div>
                </div>
              )}
              <div className="post-tags">
                {post.tags.map((tag, index) => (
                  <span key={index} className="post-tag">{tag}</span>
                ))}
              </div>
            </div>
            
            <div className="post-actions">
              <button className="action-btn">
                <Heart size={16} />
                <span>{post.likes}</span>
              </button>
              <button className="action-btn">
                <MessageSquare size={16} />
                <span>{post.comments}</span>
              </button>
              <button className="action-btn">
                <Share2 size={16} />
                <span>{post.shares}</span>
              </button>
            </div>
          </div>
        );

      case 'discovery':
        return (
          <div key={post.id} className="community-post discovery-post">
            <div className="post-header">
              <div className="post-author">
                <div className="author-avatar">
                  <AvatarIcon size={20} />
                </div>
                <div className="author-info">
                  <span className="author-name">{post.author}</span>
                  <span className="post-time">{post.time}</span>
                </div>
              </div>
              <div className="post-type-icon">
                <Bot size={16} />
              </div>
            </div>
            
            <div className="post-content">
              <p>{post.content}</p>
              {post.image && (
                <div className="post-image discovery-image">
                  <div className="image-placeholder">
                    <Image size={32} />
                    <span>Discovery</span>
                  </div>
                </div>
              )}
              <div className="post-tags">
                {post.tags.map((tag, index) => (
                  <span key={index} className="post-tag">{tag}</span>
                ))}
              </div>
            </div>
            
            <div className="post-actions">
              <button className="action-btn">
                <Heart size={16} />
                <span>{post.likes}</span>
              </button>
              <button className="action-btn">
                <MessageSquare size={16} />
                <span>{post.comments}</span>
              </button>
              <button className="action-btn">
                <Share2 size={16} />
                <span>{post.shares}</span>
              </button>
            </div>
          </div>
        );

      default: // discussion
        return (
          <div key={post.id} className="community-post discussion-post">
            <div className="post-header">
              <div className="post-author">
                <div className="author-avatar">
                  <AvatarIcon size={20} />
                </div>
                <div className="author-info">
                  <span className="author-name">{post.author}</span>
                  <span className="post-time">{post.time}</span>
                </div>
              </div>
              <div className="post-type-icon">
                <MessageSquare size={16} />
              </div>
            </div>
            
            <div className="post-content">
              <p>{post.content}</p>
              <div className="post-tags">
                {post.tags.map((tag, index) => (
                  <span key={index} className="post-tag">{tag}</span>
                ))}
              </div>
            </div>
            
            <div className="post-actions">
              <button className="action-btn">
                <Heart size={16} />
                <span>{post.likes}</span>
              </button>
              <button className="action-btn">
                <MessageSquare size={16} />
                <span>{post.comments}</span>
              </button>
              <button className="action-btn">
                <Share2 size={16} />
                <span>{post.shares}</span>
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="community">
      <div className="community-layout">
      {/* Content */}
      {selectedTab !== 'workshop' && (
        <div className="community-sidebar">
          <div className="filter-island">
            <div className="filter-header">
              <Filter size={20} />
              <h3>Filters</h3>
            </div>
            
            {/* Game Selection */}
            <div className="filter-section">
              <label className="filter-label">Game</label>
              <div className="game-selector">
                <div className="game-search-container">
                  <input
                    type="text"
                    className="game-search-input"
                    placeholder="Search games..."
                    value={gameSearchQuery}
                    onChange={handleGameSearch}
                    onFocus={() => setShowGameDropdown(true)}
                    onBlur={() => setTimeout(() => setShowGameDropdown(false), 200)}
                  />
                  <div className="selected-game-display">
                    {selectedGame !== 'all' && (
                      <div className="selected-game-info">
                        <div className="game-icon-small">
                          {games.find(g => g.id === selectedGame)?.icon}
                        </div>
                        <span className="game-name">
                          {games.find(g => g.id === selectedGame)?.name}
                        </span>
                        {gameId && (
                          <button
                            className="back-to-game-btn"
                            onClick={() => navigate(`/game/${gameId}`)}
                            title="Back to Game"
                          >
                            ← Back to Game
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                {showGameDropdown && (
                  <div className="game-dropdown">
                    <div
                      className={`game-option ${selectedGame === 'all' ? 'selected' : ''}`}
                      onClick={() => {
                        setSelectedGame('all');
                        setShowGameDropdown(false);
                        navigate('/community');
                      }}
                    >
                      <div className="game-icon-small">🎮</div>
                      <span>All Games</span>
                    </div>
                    {filteredGames.map(game => (
                      <div
                        key={game.id}
                        className={`game-option ${selectedGame === game.id ? 'selected' : ''}`}
                        onClick={() => handleGameSelect(game.id)}
                      >
                        <div className="game-icon-small">{game.icon}</div>
                        <span>{game.name}</span>
                      </div>
                    ))}
                    {filteredGames.length === 0 && gameSearchQuery && (
                      <div className="no-results">
                        No games found for "{gameSearchQuery}"
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Content Type Filter */}
            <div className="filter-section">
              <label className="filter-label">Content Type</label>
              <div className="filter-options">
                <button 
                  className={`filter-option ${selectedFilters.contentType === 'all' ? 'active' : ''}`}
                  onClick={() => handleFilterChange('contentType', 'all')}
                >
                  All
                </button>
                <button 
                  className={`filter-option ${selectedFilters.contentType === 'posts' ? 'active' : ''}`}
                  onClick={() => handleFilterChange('contentType', 'posts')}
                >
                  Posts
                </button>
                <button 
                  className={`filter-option ${selectedFilters.contentType === 'images' ? 'active' : ''}`}
                  onClick={() => handleFilterChange('contentType', 'images')}
                >
                  Images
                </button>
                <button 
                  className={`filter-option ${selectedFilters.contentType === 'videos' ? 'active' : ''}`}
                  onClick={() => handleFilterChange('contentType', 'videos')}
                >
                  Videos
                </button>
              </div>
            </div>

            {/* Time Range Filter */}
            <div className="filter-section">
              <label className="filter-label">Time Range</label>
              <div className="filter-options">
                <button 
                  className={`filter-option ${selectedFilters.timeRange === 'all' ? 'active' : ''}`}
                  onClick={() => handleFilterChange('timeRange', 'all')}
                >
                  All Time
                </button>
                <button 
                  className={`filter-option ${selectedFilters.timeRange === 'today' ? 'active' : ''}`}
                  onClick={() => handleFilterChange('timeRange', 'today')}
                >
                  Today
                </button>
                <button 
                  className={`filter-option ${selectedFilters.timeRange === 'week' ? 'active' : ''}`}
                  onClick={() => handleFilterChange('timeRange', 'week')}
                >
                  This Week
                </button>
                <button 
                  className={`filter-option ${selectedFilters.timeRange === 'month' ? 'active' : ''}`}
                  onClick={() => handleFilterChange('timeRange', 'month')}
                >
                  This Month
                </button>
              </div>
            </div>

            {/* Sort By Filter */}
            <div className="filter-section">
              <label className="filter-label">Sort By</label>
              <div className="filter-options">
                <button 
                  className={`filter-option ${selectedFilters.sortBy === 'trending' ? 'active' : ''}`}
                  onClick={() => handleFilterChange('sortBy', 'trending')}
                >
                  <TrendingUp size={14} />
                  Trending
                </button>
                <button 
                  className={`filter-option ${selectedFilters.sortBy === 'recent' ? 'active' : ''}`}
                  onClick={() => handleFilterChange('sortBy', 'recent')}
                >
                  <Clock size={14} />
                  Recent
                </button>
                <button 
                  className={`filter-option ${selectedFilters.sortBy === 'popular' ? 'active' : ''}`}
                  onClick={() => handleFilterChange('sortBy', 'popular')}
                >
                  <Star size={14} />
                  Popular
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

        {/* Main Content */}
        <div className="community-main">
          <div className="community-tabs">
            <button 
              className={`tab-btn ${selectedTab === 'workshop' ? 'active' : ''}`}
              onClick={() => setSelectedTab('workshop')}
            >
              <Package size={16} />
              Workshop
            </button>
            <button 
              className={`tab-btn ${selectedTab === 'trending' ? 'active' : ''}`}
              onClick={() => setSelectedTab('trending')}
            >
              <TrendingUp size={16} />
              Trending
            </button>
            <button 
              className={`tab-btn ${selectedTab === 'recent' ? 'active' : ''}`}
              onClick={() => setSelectedTab('recent')}
            >
              <Clock size={16} />
              Recent
            </button>
            <button 
              className={`tab-btn ${selectedTab === 'following' ? 'active' : ''}`}
              onClick={() => setSelectedTab('following')}
            >
              <Users size={16} />
              Following
            </button>
          </div>

          <div className="create-post">
            <div className="create-post-header">
              <div className="user-avatar">
                <UserCircle size={24} />
              </div>
              <input 
                type="text" 
                placeholder="What's on your mind?"
                className="post-input"
              />
            </div>
            <div className="create-post-actions">
              <button className="create-action-btn">
                <Image size={16} />
                Photo
              </button>
              <button className="create-action-btn">
                <Link size={16} />
                Link
              </button>
              <button className="post-btn">
                <Plus size={16} />
                Post
              </button>
            </div>
          </div>

          {selectedTab === 'workshop' ? (
            <WorkshopSection gameId={selectedGame} />
          ) : (
            <>
              <div className="create-post">
                <div className="create-post-header">
                  <div className="user-avatar">
                    <UserCircle size={24} />
                  </div>
                  <input 
                    type="text" 
                    placeholder="What's on your mind?"
                    className="post-input"
                  />
                </div>
                <div className="create-post-actions">
                  <button className="create-action-btn">
                    <Image size={16} />
                    Photo
                  </button>
                  <button className="create-action-btn">
                    <Link size={16} />
                    Link
                  </button>
                  <button className="post-btn">
                    <Plus size={16} />
                    Post
                  </button>
                </div>
              </div>

              <div className="posts-feed">
                {filteredPosts.map(renderPost)}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Community;