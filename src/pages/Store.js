import React, { useState, useEffect, useRef } from 'react';
import { Star, Download, Play, Users, TrendingUp, TrendingDown, Share2, Bookmark, MessageSquare, Bell, Search, X, Filter, ChevronDown, DollarSign, Settings, Save } from 'lucide-react';
import { getUserData, getUserScopedKey, getAllUsersData, saveUserData } from '../utils/UserDataManager';
import './Store.css';

const Store = ({ isPreview = false, previewGameData = null, gamesData = {}, navigate }) => {
  const [favoriteGames, setFavoriteGames] = useState(new Set());
  const [bookmarkedGames, setBookmarkedGames] = useState(new Set());
  const [customGames, setCustomGames] = useState([]);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [isBannerHovered, setIsBannerHovered] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const filterMenuRef = useRef(null);

  // Close filter menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target)) {
        setShowFilterMenu(false);
      }
    };

    if (showFilterMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showFilterMenu]);

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

  // Build featured games list from real data (gamesData + customGames), weighted by activity
  const toNumber = (value) => {
    if (value == null) return 0;
    const s = String(value).trim();
    const m = s.match(/([0-9]+(?:\.[0-9]+)?)\s*([KkMm])?/);
    if (!m) {
      const digits = s.replace(/\D+/g, '');
      return digits ? parseInt(digits, 10) : 0;
    }
    const num = parseFloat(m[1]);
    const unit = (m[2] || '').toUpperCase();
    if (unit === 'M') return Math.round(num * 1_000_000);
    if (unit === 'K') return Math.round(num * 1_000);
    return Math.round(num);
  };

  const featuredGames = React.useMemo(() => {
    const disableBuiltIns = (()=>{ try { return localStorage.getItem('disableBuiltinGames') !== 'false'; } catch(_) { return true; } })();
    // Collect candidates from gamesData prop
    const fromGamesDataRaw = Object.entries(gamesData || {}).map(([id, g]) => ({
      id,
      name: g.name || id,
      developer: g.developer || '',
      price: (() => {
        const raw = g.price ?? g.Price ?? g.priceUSD ?? g.cost ?? g.amount ?? g.pricing;
        if (raw == null || raw === '') return 0;
        const cleaned = String(raw).trim().replace(/[^0-9.,-]/g, '').replace(/,(?=\d{3}(\D|$))/g, '').replace(/,/g, '');
        const n = parseFloat(cleaned);
        return Number.isFinite(n) && n > 0 ? n : 0;
      })(),
      rating: g.rating || 0,
      players: g.playerCount || g.players || '0',
      currentPlaying: g.currentPlaying || '0',
      trending: g.trending || '+0%',
      description: g.description || '',
      tags: g.tags || [],
      image: g.banner || g.image || g.cardImage || null,
      original: g,
    }));
    const fromGamesData = disableBuiltIns ? [] : fromGamesDataRaw;

    // Collect candidates from customGames (localStorage)
    const fromCustom = customGames.map((g, i) => ({
      id: g.gameId || g.id || `custom-${i}`,
      name: g.name || g.gameName || g.fullFormData?.gameName || 'Untitled Game',
      developer: g.developer || g.fullFormData?.developer || '',
      price: (() => {
        const raw = g.price ?? g.fullFormData?.price ?? g.metadata?.price;
        if (raw == null || raw === '') return 0;
        const cleaned = String(raw).trim().replace(/[^0-9.,-]/g, '').replace(/,(?=\d{3}(\D|$))/g, '').replace(/,/g, '');
        const n = parseFloat(cleaned);
        return Number.isFinite(n) && n > 0 ? n : 0;
      })(),
      rating: 0,
      players: g.playerCount || '0',
      currentPlaying: g.currentPlaying || '0',
      trending: g.trending || '+0%',
      description: g.description || g.fullFormData?.description || '',
      tags: Array.isArray(g.tags) ? g.tags : (g.tags ? String(g.tags).split(/[,;\s]+/).filter(Boolean) : []),
      image: g.banner || g.bannerImage || g.cardImage || g.fullFormData?.bannerImage || g.card || null,
      original: g,
    }));

    const candidates = [...fromGamesData, ...fromCustom].filter(g => g && (g.image || isPreview));
    if (candidates.length === 0) return [];

    // Weighted random pick without replacement (up to 5)
    const weight = (g) => {
      const now = toNumber(g.currentPlaying);
      const total = toNumber(g.players);
      const w = (now || Math.round(total * 0.05) || 1);
      return Math.max(1, w);
    };

    const pool = candidates.map(g => ({ g, w: weight(g) }));
    const picks = [];
    const count = Math.min(5, pool.length);
    for (let i = 0; i < count; i++) {
      const sum = pool.reduce((s, x) => s + x.w, 0);
      let r = Math.random() * sum;
      let idx = 0;
      for (; idx < pool.length; idx++) {
        if ((r -= pool[idx].w) <= 0) break;
      }
      const picked = pool.splice(Math.min(idx, pool.length - 1), 1)[0];
      if (picked) picks.push(picked.g);
    }
    return picks;
  }, [gamesData, customGames]);

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
        image: previewGameData.bannerImage ? URL.createObjectURL(previewGameData.bannerImage) : null
      }
    : (featuredGames[currentBannerIndex] || featuredGames[0] || null);

  const safeFeaturedGame = currentFeaturedGame || {
    id: 'none',
    name: 'Featured',
    developer: '',
    price: 0,
    rating: 0,
    players: '0',
    trending: '+0%',
    description: '',
    tags: [],
    image: null,
  };

  // Auto-switch zwischen Top 5 Games alle 5 Sekunden
  useEffect(() => {
    if (isPreview || isBannerHovered) return; // Disabled in preview mode or when hovered
    if (!featuredGames.length) return;
    const interval = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % featuredGames.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isPreview, isBannerHovered, featuredGames.length]);

  const nextBanner = () => {
    if (isPreview) return; // Disabled in preview mode
    if (!featuredGames.length) return;
    setCurrentBannerIndex((prev) => (prev + 1) % featuredGames.length);
  };

  const prevBanner = () => {
    if (isPreview) return; // Disabled in preview mode
    if (!featuredGames.length) return;
    setCurrentBannerIndex((prev) => (prev - 1 + featuredGames.length) % featuredGames.length);
  };

  // Load ALL published games from ALL users for store listing (marketplace)
  useEffect(() => {
    const load = () => {
      try {
        // Get all games from all users for the Store (shared marketplace)
        const allGames = getAllUsersData('customGames');
        // Filter to only show published games
        const publishedGames = allGames.filter(game => {
          const status = game.status || game.fullFormData?.status || 'draft';
          return status === 'public' || status === 'published';
        });
        setCustomGames(publishedGames);
      } catch (_) {
        setCustomGames([]);
      }
    };
    load();
    
    // Reload whenever any user's games are updated (for marketplace updates)
    const handler = () => load();
    
    // Listen for storage changes from any user
    const handleStorageChange = (e) => {
      // Reload if any user's customGames were updated
      if (e.key && e.key.startsWith('customGames_')) {
        load();
      }
    };
    
    window.addEventListener('customGameUpdate', handler);
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('user-changed', load);
    
    return () => {
      window.removeEventListener('customGameUpdate', handler);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('user-changed', load);
    };
  }, []);

  // Load/save bookmarks (account-separated)
  useEffect(() => {
    try {
      const saved = getUserData('bookmarkedGames', []);
      setBookmarkedGames(saved ? new Set(saved) : new Set());
    } catch (_) {
      setBookmarkedGames(new Set());
    }
  }, []);

  useEffect(() => {
    try {
      saveUserData('bookmarkedGames', Array.from(bookmarkedGames));
    } catch (_) {}
  }, [bookmarkedGames]);

  const toggleBookmark = (gameId) => {
    setBookmarkedGames(prev => {
      const next = new Set(prev);
      if (next.has(gameId)) next.delete(gameId); else next.add(gameId);
      return next;
    });
  };

  // Resolve price from various possible fields and normalize
  const getPriceRaw = (game) => {
    if (!game || typeof game !== 'object') return undefined;
    const direct = game?.price ?? game?.Price ?? game?.priceUSD ?? game?.cost ?? game?.amount ?? game?.pricing;
    if (direct != null && direct !== '') return direct;
    // Fallback to gamesData by id when available
    const fromGamesData = gamesData?.[game?.gameId || game?.id]?.price;
    if (fromGamesData != null && fromGamesData !== '') return fromGamesData;
    // Try common nested containers (include GameStudio saved data)
    const containers = [
      game.metadata,
      game.store,
      game.details,
      game.pricing,
      game.info,
      game.data,
      game.fullFormData // where GameStudio persists the price
    ];
    for (const c of containers) {
      if (c && typeof c === 'object') {
        const v = c.price ?? c.Price ?? c.priceUSD ?? c.cost ?? c.amount ?? c.pricing;
        if (v != null && v !== '') return v;
      }
    }
    // Generic heuristic: find first key that contains 'price'
    try {
      const stack = [game];
      const seen = new Set();
      let depth = 0;
      while (stack.length && depth < 3) { // limit depth to avoid cycles
        const obj = stack.shift();
        if (!obj || typeof obj !== 'object' || seen.has(obj)) continue;
        seen.add(obj);
        for (const [k, v] of Object.entries(obj)) {
          if (/(^|_)price/i.test(k)) {
            if (v != null && v !== '') return v;
          }
          if (v && typeof v === 'object') stack.push(v);
        }
        depth++;
      }
    } catch (_) {}
    return undefined;
  };

  const getPriceValue = (game) => {
    const raw = getPriceRaw(game);
    if (raw == null) return 0;
    const cleaned = String(raw)
      .trim()
      .replace(/[^0-9.,-]/g, '')
      .replace(/,(?=\d{3}(\D|$))/g, '')
      .replace(/,/g, '');
    const n = parseFloat(cleaned);
    return Number.isFinite(n) && n > 0 ? n : 0;
  };

  const formatPrice = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return 'Free';
    try {
      const locale = typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'en-US';

      // Resolve preferred currency from app settings
      const resolveCurrency = () => {
        try {
          // 1) Explicit currency override
          const override = localStorage.getItem('currency');
          if (override) return override;

          // 2) Settings pages storages
          const launcher = JSON.parse(localStorage.getItem('launcherSettings') || '{}');
          if (launcher.currency) return launcher.currency;
          const countryFromLauncher = (launcher.country || launcher.region || '').toUpperCase();
          if (countryFromLauncher) {
            return countryToCurrency(countryFromLauncher);
          }

          // 3) Global settings manager
          const sm = window.settingsManager;
          if (sm && typeof sm.get === 'function') {
            const smCurrency = sm.get('currency');
            if (smCurrency) return smCurrency;
            const smCountry = (sm.get('country') || '').toUpperCase();
            if (smCountry) return countryToCurrency(smCountry);
          }
        } catch (_) {}

        // 4) Fallback by locale
        return locale && locale.toLowerCase().startsWith('de') ? 'EUR' : 'USD';
      };

      const countryToCurrency = (code) => {
        const map = {
          DE: 'EUR', AT: 'EUR', FR: 'EUR', ES: 'EUR', IT: 'EUR', NL: 'EUR', BE: 'EUR', PT: 'EUR', FI: 'EUR', IE: 'EUR', GR: 'EUR', LU: 'EUR', CY: 'EUR', MT: 'EUR', LT: 'EUR', LV: 'EUR', EE: 'EUR', SK: 'EUR', SI: 'EUR', HR: 'EUR',
          US: 'USD', GB: 'GBP', CH: 'CHF', JP: 'JPY', CN: 'CNY', PL: 'PLN', CZ: 'CZK', SE: 'SEK', NO: 'NOK', DK: 'DKK', AU: 'AUD', CA: 'CAD', NZ: 'NZD', RU: 'RUB', TR: 'TRY', IN: 'INR', BR: 'BRL', MX: 'MXN', KR: 'KRW'
        };
        // accept full names too
        const byName = {
          GERMANY: 'EUR', AUSTRIA: 'EUR', FRANCE: 'EUR', SPAIN: 'EUR', ITALY: 'EUR', NETHERLANDS: 'EUR', BELGIUM: 'EUR', PORTUGAL: 'EUR', FINLAND: 'EUR', IRELAND: 'EUR', GREECE: 'EUR', LUXEMBOURG: 'EUR', CYPRUS: 'EUR', MALTA: 'EUR', LITHUANIA: 'EUR', LATVIA: 'EUR', ESTONIA: 'EUR', SLOVAKIA: 'EUR', SLOVENIA: 'EUR', CROATIA: 'EUR',
          USA: 'USD', UNITEDSTATES: 'USD', UNITEDKINGDOM: 'GBP', UK: 'GBP', SWITZERLAND: 'CHF', JAPAN: 'JPY', CHINA: 'CNY', POLAND: 'PLN', CZECHREPUBLIC: 'CZK', SWEDEN: 'SEK', NORWAY: 'NOK', DENMARK: 'DKK', AUSTRALIA: 'AUD', CANADA: 'CAD', NEWZEALAND: 'NZD', RUSSIA: 'RUB', TURKEY: 'TRY', INDIA: 'INR', BRAZIL: 'BRL', MEXICO: 'MXN', KOREA: 'KRW'
        };
        return map[code] || byName[code.replace(/\s+/g, '').toUpperCase()] || 'USD';
      };

      const currency = resolveCurrency();
      return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 2 }).format(n);
    } catch (_) {
      return `${n.toFixed(2)}`;
    }
  };

  // Display price with raw fallback when parsing fails but digits exist
  const displayPrice = (game) => {
    const val = getPriceValue(game);
    if (val > 0) return formatPrice(val);
    const raw = getPriceRaw(game);
    if (raw != null) {
      const digits = String(raw).replace(/\D+/g, '');
      if (digits && digits !== '0') return formatPrice(Number(digits));
    }
    return 'Free';
  };

  // Normalization helpers for custom games coming from JSON
  const getBannerSrc = (game) => (
    game?.banner || game?.bannerImage || game?.images?.banner || game?.cardImage || game?.card || game?.cover || null
  );

  const getName = (game) => (
    game?.name || game?.gameName || game?.title || 'Untitled Game'
  );

  const getId = (game, idx) => (
    game?.gameId || game?.id || `${getName(game)}-${idx}`
  );

  const getDeveloper = (game) => (
    game?.developer || game?.dev || game?.studio || ''
  );

  const getVersion = (game) => (
    game?.version || game?.Version || game?.build || ''
  );

  const getGenre = (game) => (
    game?.genre || game?.genres || ''
  );

  const getDescription = (game) => (
    game?.description || game?.desc || ''
  );

  const getReleaseDate = (game) => (
    game?.releaseDate || game?.released || game?.date || ''
  );

  const parseTags = (game) => {
    const t = game?.tags;
    if (!t) return [];
    if (Array.isArray(t)) return t;
    return String(t).split(/[,;\s]+/).filter(Boolean).slice(0, 6);
  };

  const normalizeGame = (game, idx) => ({
    id: getId(game, idx),
    name: getName(game),
    developer: getDeveloper(game),
    version: getVersion(game),
    genre: getGenre(game),
    description: getDescription(game),
    releaseDate: getReleaseDate(game),
    tags: parseTags(game),
    banner: getBannerSrc(game),
    price: getPriceValue(game),
    original: game,
  });

  const goToBanner = (index) => {
    if (isPreview) return; // Disabled in preview mode
    setCurrentBannerIndex(index);
  };

  // Filter games based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const query = searchQuery.toLowerCase();
    const results = Object.entries(gamesData || {})
      .filter(([gameId, game]) => {
        if (!game) return false;
        const name = (game.name || '').toLowerCase();
        const developer = (game.developer || '').toLowerCase();
        const tags = (game.tags || []).join(' ').toLowerCase();
        const description = (game.description || '').toLowerCase();
        
        return name.includes(query) || 
               developer.includes(query) || 
               tags.includes(query) || 
               description.includes(query);
      })
      .map(([gameId, game]) => ({ gameId, ...game }))
      .slice(0, 12);

    setSearchResults(results);
  }, [searchQuery, gamesData]);

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
            <div 
              className="featured-image"
              style={safeFeaturedGame.image ? {
                backgroundImage: `url(${safeFeaturedGame.image})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
              } : undefined}
            >
              {!safeFeaturedGame.image && (
                <div className="featured-placeholder">🎮</div>
              )}
            </div>
            <div className="featured-overlay"></div>
          </div>
          
        {/* Inline bookmark will be rendered next to CTA below */}

        <div className="featured-content">
            <div className="featured-badge">FEATURED</div>
            <div className="featured-title-section">
              <h1 className="featured-title">{safeFeaturedGame.name}</h1>
              <div className="featured-stats">
                <div className="stat">
                  <Star size={16} />
                  <span>{safeFeaturedGame.rating}</span>
                </div>
                <div className="stat">
                  <Users size={16} />
                  <span>{safeFeaturedGame.players}</span>
                </div>
                <div className={`stat trending ${!getTrendingDisplay(safeFeaturedGame.trending).isPositive ? 'negative' : ''}`}>
                  {React.createElement(getTrendingIcon(safeFeaturedGame.trending), { size: 16 })}
                  <span>{getTrendingDisplay(safeFeaturedGame.trending).value}</span>
                </div>
              </div>
            </div>
            <p className="featured-description">{safeFeaturedGame.description}</p>
            <div className="featured-tags">
              {safeFeaturedGame.tags && safeFeaturedGame.tags.length > 0 ? (
                safeFeaturedGame.tags.map(tag => (
                  <span key={tag} className="tag">{tag}</span>
                ))
              ) : (
                <span className="tag">Game</span>
              )}
            </div>
            <div className="featured-actions">
              <button className={`play-btn ${safeFeaturedGame.price > 0 ? 'buy' : 'install'}`}>
                <Play size={20} />
                {safeFeaturedGame.price === 0 ? 'Play Free' : `Buy for $${safeFeaturedGame.price}`}
              </button>
              <button
                className={`banner-bookmark inline ${bookmarkedGames.has(safeFeaturedGame.id) ? 'bookmarked' : ''}`}
                title={bookmarkedGames.has(safeFeaturedGame.id) ? 'Saved' : 'Save'}
                onClick={(e) => { e.stopPropagation(); toggleBookmark(safeFeaturedGame.id); }}
                aria-label={bookmarkedGames.has(safeFeaturedGame.id) ? 'Remove bookmark' : 'Add bookmark'}
                aria-pressed={bookmarkedGames.has(safeFeaturedGame.id)}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill={bookmarkedGames.has(safeFeaturedGame.id) ? 'currentColor' : 'none'} xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 3h12v18l-6-4-6 4V3z" stroke="currentColor" stroke-width="2" stroke-linejoin="miter" stroke-linecap="butt"/>
                </svg>
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
            {featuredGames.map((_, index) => (
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
            {/* Left Section - Empty/Spacer */}
            <div className="taskbar-left">
            </div>

            {/* Middle Section - Buttons */}
            <div className="taskbar-center">
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

            {/* Right Section - Filter & Search */}
            <div className="taskbar-right">
              {/* Filter Button (Icon Only) */}
              <div className="taskbar-filter-wrapper" ref={filterMenuRef}>
                <button 
                  className="taskbar-filter-btn-icon"
                  onClick={() => setShowFilterMenu(!showFilterMenu)}
                  title="Filter"
                >
                  <Filter size={20} />
                </button>
                {showFilterMenu && (
                  <div className="filter-menu">
                    <div 
                      className={`filter-option ${selectedFilter === 'all' ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedFilter('all');
                        setShowFilterMenu(false);
                      }}
                    >
                      All Games
                    </div>
                    <div 
                      className={`filter-option ${selectedFilter === 'featured' ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedFilter('featured');
                        setShowFilterMenu(false);
                      }}
                    >
                      Featured
                    </div>
                    <div 
                      className={`filter-option ${selectedFilter === 'new' ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedFilter('new');
                        setShowFilterMenu(false);
                      }}
                    >
                      New Releases
                    </div>
                    <div 
                      className={`filter-option ${selectedFilter === 'popular' ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedFilter('popular');
                        setShowFilterMenu(false);
                      }}
                    >
                      Popular
                    </div>
                    <div 
                      className={`filter-option ${selectedFilter === 'free' ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedFilter('free');
                        setShowFilterMenu(false);
                      }}
                    >
                      Free to Play
                    </div>
                  </div>
                )}
              </div>

              {/* Search Bar (Just underline with icon) */}
              <div className="taskbar-search-wrapper">
                <Search size={18} className="taskbar-search-icon" />
                <input
                  type="text"
                  placeholder="Search games..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="taskbar-search-input"
                />
                {searchQuery && (
                  <button 
                    className="taskbar-search-clear"
                    onClick={() => setSearchQuery('')}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
        {/* Uploaded Games */}
        {customGames && customGames.length > 0 && (
          <div className="featured-below">
            {/* New games - horizontal scroll */}
            <div className="new-games-row">
              {customGames.map((g, i) => normalizeGame(g, i)).slice(0, 10).map((g) => (
                <div key={`new-${g.id}`} className="featured-below-card">
                  <div className="featured-below-banner">
                    {g.banner ? (
                      <img src={g.banner} alt={g.name || 'Game'} onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }} />
                    ) : null}
                    <div className="featured-below-placeholder" style={{ display: g.banner ? 'none' : 'flex' }}>
                      <div className="placeholder-icon">🎮</div>
                    </div>
                    <button
                      className={`banner-bookmark ${bookmarkedGames.has(g.id) ? 'bookmarked' : ''}`}
                      title={bookmarkedGames.has(g.id) ? 'Saved' : 'Save'}
                      onClick={(e) => { e.stopPropagation(); toggleBookmark(g.id); }}
                      aria-label={bookmarkedGames.has(g.id) ? 'Remove bookmark' : 'Add bookmark'}
                      aria-pressed={bookmarkedGames.has(g.id)}
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill={bookmarkedGames.has(g.id) ? 'currentColor' : 'none'} xmlns="http://www.w3.org/2000/svg">
                        <path d="M6 3h12v18l-6-4-6 4V3z" stroke="currentColor" stroke-width="2" stroke-linejoin="miter" stroke-linecap="butt"/>
                      </svg>
                    </button>
                    <div className="banner-cta">
                      <div className="banner-free-text">{displayPrice(g)}</div>
                    </div>
                  </div>
                  <div className="featured-card-info">
                    <div className="card-info-header">
                      <h3 title={g.name || 'Untitled Game'}>{g.name || 'Untitled Game'}</h3>
                      {g.version && <p className="card-info-version">Version {g.version}</p>}
                    </div>
                    <div className="card-info-desc">{g.description || 'No description provided.'}</div>
                    <div className={`card-info-price ${!(getPriceValue(g) > 0) ? 'is-free' : ''}`}>{displayPrice(g)}</div>
                    <div className="card-info-actions">
                      <button className={`card-info-primary ${getPriceValue(g) > 0 ? 'buy' : 'install'}`}>{getPriceValue(g) > 0 ? 'Buy Now' : 'Install Now'}</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Older games - alternating grid */}
            <div className="featured-older-grid">
              {customGames.map((g, i) => normalizeGame(g, i)).slice(10).map((g) => (
                <div key={g.id} className="featured-below-card">
                  <div className="featured-below-banner">
                    {g.banner ? (
                      <img
                        src={g.banner}
                        alt={g.name || 'Game'}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div className="featured-below-placeholder" style={{ display: g.banner ? 'none' : 'flex' }}>
                      <div className="placeholder-icon">🎮</div>
                    </div>

                    {/* Bookmark top-left and CTA bottom-left on banner */}
                    <button
                      className={`banner-bookmark ${bookmarkedGames.has(g.id) ? 'bookmarked' : ''}`}
                      title={bookmarkedGames.has(g.id) ? 'Saved' : 'Save'}
                      onClick={(e) => { e.stopPropagation(); toggleBookmark(g.id); }}
                      aria-label={bookmarkedGames.has(g.id) ? 'Remove bookmark' : 'Add bookmark'}
                      aria-pressed={bookmarkedGames.has(g.id)}
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill={bookmarkedGames.has(g.id) ? 'currentColor' : 'none'} xmlns="http://www.w3.org/2000/svg">
                        <path d="M6 3h12v18l-6-4-6 4V3z" stroke="currentColor" stroke-width="2" stroke-linejoin="miter" stroke-linecap="butt"/>
                      </svg>
                    </button>
                    <div className="banner-cta">
                      <div className="banner-free-text">{displayPrice(g)}</div>
                    </div>

                  </div>
                  <div className="featured-card-info">
                    <div className="card-info-header">
                      <h3 title={g.name || 'Untitled Game'}>{g.name || 'Untitled Game'}</h3>
                      {g.version && <p className="card-info-version">Version {g.version}</p>}
                    </div>
                    <div className="card-info-desc">
                      {g.description || 'No description provided.'}
                    </div>
                    <div className={`card-info-price ${!(getPriceValue(g) > 0) ? 'is-free' : ''}`}>
                      {displayPrice(g)}
                    </div>
                    <div className="card-info-actions">
                      <button className={`card-info-primary ${getPriceValue(g) > 0 ? 'buy' : 'install'}`}>{getPriceValue(g) > 0 ? 'Buy Now' : 'Install Now'}</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Discover - include custom games (banner-style cards like Library) */}
      {/* Discover grid intentionally removed */}
    </div>
  );
};

export default Store;