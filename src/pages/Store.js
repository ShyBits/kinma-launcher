import React, { useState, useEffect, useRef } from 'react';
import { Star, Download, Play, Users, TrendingUp, TrendingDown, Share2, Bookmark, MessageSquare, Bell, Search, X, ChevronDown, DollarSign, Settings, Save, Volume2, VolumeX, ChevronLeft, ChevronRight, CheckCircle2, Flame, Gift } from 'lucide-react';
import { getUserData, getUserScopedKey, getAllUsersData, saveUserData, getCurrentUserId } from '../utils/UserDataManager';
import CustomVideoPlayer from '../components/CustomVideoPlayer';
import './Store.css';

const Store = ({ isPreview = false, previewGameData = null, gamesData = {}, navigate, sidebarWidth = 260 }) => {
  const [favoriteGames, setFavoriteGames] = useState(new Set());
  const [bookmarkedGames, setBookmarkedGames] = useState(new Set());
  const [customGames, setCustomGames] = useState([]);
  const [myCustomGames, setMyCustomGames] = useState([]); // Games owned by current user
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [isBannerHovered, setIsBannerHovered] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [activeFilter, setActiveFilter] = useState(() => {
    // Load saved filter from localStorage, default to 'grid'
    try {
      const saved = localStorage.getItem('storeActiveFilter');
      return saved && ['grid', 'bookmarked', 'trending', 'free'].includes(saved) ? saved : 'grid';
    } catch (_) {
      return 'grid';
    }
  });
  
  // Save filter to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('storeActiveFilter', activeFilter);
    } catch (_) {}
  }, [activeFilter]);
  
  // Media slideshow state
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [isMediaSlideshowHovered, setIsMediaSlideshowHovered] = useState(false);
  const [isMediaMuted, setIsMediaMuted] = useState(true);
  const mediaVideoRefs = useRef({});

  // Filter games based on active filter
  const getFilteredGames = (games) => {
    if (!games || games.length === 0) return [];
    
    switch (activeFilter) {
      case 'bookmarked':
        return games.filter(g => bookmarkedGames.has(g.id));
      case 'trending':
        // Show trending games (positive trending percentage)
        return games.filter(g => {
          const stats = getGameStats(g);
          return stats.trending.startsWith('+');
        });
      case 'free':
        // Show free games
        return games.filter(g => getPriceValue(g) === 0);
      case 'grid':
      default:
        // Grid view - show all (view type is handled by CSS)
        return games;
    }
  };

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

  const getColorForRating = (rating) => {
    // Red to Gold gradient (same as Game.js)
    if (rating >= 4.5) return '#FFD700'; // Gold
    if (rating >= 3.5) return '#FFB800'; // Yellow-orange
    if (rating >= 2.5) return '#FF9500'; // Orange
    if (rating >= 1.5) return '#FF6B00'; // Dark orange
    if (rating >= 0.5) return '#FF4444'; // Red-orange
    return 'rgba(255,255,255,0.3)'; // Gray for very low or no rating
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

  // Helper function to extract stats consistently from game data
  const getGameStats = (game) => {
    if (!game) return { rating: 0, players: '0', trending: '+0%' };
    
    // Try to get from original game object first
    const original = game.original || game;
    
    // Rating: check multiple possible locations including localStorage ratings
    let rating = original?.rating ?? 
                 original?.fullFormData?.rating ?? 
                 original?.metadata?.rating ?? 
                 gamesData?.[original?.gameId || original?.id]?.rating ?? 
                 0;
    
    // If rating is 0 or not found, try to load from localStorage ratings
    if (!rating || rating === 0) {
      try {
        const gameId = original?.gameId || original?.id;
        if (gameId) {
          const savedRatings = localStorage.getItem(`gameRatings_${gameId}`);
          if (savedRatings) {
            const ratings = JSON.parse(savedRatings);
            if (ratings && ratings.length > 0) {
              const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
              rating = Math.round((sum / ratings.length) * 10) / 10;
            }
          }
        }
      } catch (_) {}
    }
    
    // Players: check multiple possible locations
    const players = original?.playerCount ?? 
                    original?.players ?? 
                    original?.fullFormData?.playerCount ?? 
                    original?.fullFormData?.players ?? 
                    gamesData?.[original?.gameId || original?.id]?.playerCount ?? 
                    gamesData?.[original?.gameId || original?.id]?.players ?? 
                    '0';
    
    // Trending: check multiple possible locations
    const trending = original?.trending ?? 
                     original?.fullFormData?.trending ?? 
                     original?.metadata?.trending ?? 
                     gamesData?.[original?.gameId || original?.id]?.trending ?? 
                     '+0%';
    
    return {
      rating: rating || 0,
      players: players || '0',
      trending: trending || '+0%'
    };
  };

  const featuredGames = React.useMemo(() => {
    const disableBuiltIns = (()=>{ try { return localStorage.getItem('disableBuiltinGames') !== 'false'; } catch(_) { return true; } })();
    // Collect candidates from gamesData prop
    const fromGamesDataRaw = Object.entries(gamesData || {}).map(([id, g]) => {
      const stats = getGameStats({ original: g });
      return {
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
        rating: stats.rating,
        players: stats.players,
        currentPlaying: g.currentPlaying || '0',
        trending: stats.trending,
        description: g.description || '',
        tags: g.tags || [],
        image: g.banner || g.image || g.cardImage || null,
        original: g,
      };
    });
    const fromGamesData = disableBuiltIns ? [] : fromGamesDataRaw;

    // Collect candidates from customGames (localStorage)
    const fromCustom = customGames.map((g, i) => {
      const stats = getGameStats({ original: g });
      return {
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
        rating: stats.rating,
        players: stats.players,
        currentPlaying: g.currentPlaying || '0',
        trending: stats.trending,
        description: g.description || g.fullFormData?.description || '',
        tags: Array.isArray(g.tags) ? g.tags : (g.tags ? String(g.tags).split(/[,;\s]+/).filter(Boolean) : []),
        image: g.banner || g.bannerImage || g.cardImage || g.fullFormData?.bannerImage || g.card || null,
        original: g,
      };
    });

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
        rating: previewGameData.rating || 0,
        players: previewGameData.players || '0',
        trending: previewGameData.trending || '+0%',
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

  // Helper to get image/media URL
  const getImageUrl = (image) => {
    if (!image) return null;
    if (typeof image === 'string') {
      if (image.startsWith('data:') || image.startsWith('http://') || image.startsWith('https://')) {
        return image;
      }
      return image;
    }
    if (image instanceof File || image instanceof Blob) {
      return URL.createObjectURL(image);
    }
    return null;
  };

  // Get screenshots/media from game
  const getGameMedia = (game) => {
    if (!game) return [];
    const original = game.original || game;
    const screenshots = original?.screenshots || original?.fullFormData?.screenshots || [];
    return screenshots.filter(Boolean);
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

  // Get media from current featured game
  const currentMedia = getGameMedia(safeFeaturedGame);
  
  // Reset media index when game changes
  useEffect(() => {
    setCurrentMediaIndex(0);
  }, [safeFeaturedGame.id]);

  // Auto-switch media slideshow
  useEffect(() => {
    if (!currentMedia.length || currentMedia.length <= 1 || isMediaSlideshowHovered) return;
    const interval = setInterval(() => {
      setCurrentMediaIndex((prev) => (prev + 1) % currentMedia.length);
    }, 4000); // Switch every 4 seconds
    return () => clearInterval(interval);
  }, [currentMedia.length, isMediaSlideshowHovered]);

  // Handle video playback when media changes
  useEffect(() => {
    if (!currentMedia.length) return;
    
    // Pause all videos first
    Object.values(mediaVideoRefs.current).forEach(videoRef => {
      if (videoRef && !videoRef.paused) {
        videoRef.pause();
      }
    });
    
    const currentMediaItem = currentMedia[currentMediaIndex];
    if (!currentMediaItem) return;
    
    const isVideo = (typeof currentMediaItem === 'object' && currentMediaItem.type?.startsWith('video/')) ||
                    (typeof currentMediaItem === 'string' && /\.(mp4|webm|mov)$/i.test(currentMediaItem));
    
    if (isVideo) {
      // Play video when it becomes active
      const videoKey = `${safeFeaturedGame.id}-${currentMediaIndex}`;
      const videoRef = mediaVideoRefs.current[videoKey];
      if (videoRef) {
        videoRef.muted = isMediaMuted;
        videoRef.currentTime = 0; // Reset to start
        videoRef.play().catch(() => {
          // Auto-play may be blocked, that's okay
        });
      }
    }
  }, [currentMediaIndex, safeFeaturedGame.id, currentMedia.length, isMediaMuted]);

  const nextBanner = (e) => {
    e.stopPropagation(); // Prevent banner click navigation
    if (isPreview) return; // Disabled in preview mode
    if (!featuredGames.length) return;
    setCurrentBannerIndex((prev) => (prev + 1) % featuredGames.length);
  };

  const prevBanner = (e) => {
    e.stopPropagation(); // Prevent banner click navigation
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
        
        // Load current user's games to check ownership
        const myGames = getUserData('customGames', []);
        setMyCustomGames(myGames);
      } catch (_) {
        setCustomGames([]);
        setMyCustomGames([]);
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
    
    // Listen for rating updates
    const handleRatingUpdate = () => {
      load(); // Reload to get updated ratings
    };
    window.addEventListener('gameRatingUpdated', handleRatingUpdate);
    
    return () => {
      window.removeEventListener('customGameUpdate', handler);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('user-changed', load);
      window.removeEventListener('gameRatingUpdated', handleRatingUpdate);
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

  // Helper to check if current user owns a game
  const isGameOwnedByMe = (game) => {
    if (!game) return false;
    const gameId = game.gameId || game.id || game.original?.gameId || game.original?.id;
    if (!gameId) return false;
    
    // Check if this game exists in current user's games
    return myCustomGames.some(myGame => {
      const myGameId = myGame.gameId || myGame.id;
      return myGameId === gameId;
    });
  };

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

  // Check if game is new (released within the last month)
  const isNewRelease = (game) => {
    const releaseDateStr = getReleaseDate(game);
    if (!releaseDateStr) return false;
    
    try {
      let releaseDate;
      
      // Try to parse different date formats
      // Format: "Dec 2023", "Jan 2025", etc. - set to first day of month
      if (/^[A-Za-z]{3}\s+\d{4}$/.test(releaseDateStr.trim())) {
        releaseDate = new Date(releaseDateStr.trim() + ' 1');
      }
      // Format: ISO date string or date with slashes
      else if (releaseDateStr.includes('-') || releaseDateStr.includes('/')) {
        releaseDate = new Date(releaseDateStr);
      }
      // Format: timestamp
      else if (/^\d+$/.test(releaseDateStr)) {
        releaseDate = new Date(parseInt(releaseDateStr));
      }
      else {
        releaseDate = new Date(releaseDateStr);
      }
      
      // Check if date is valid
      if (isNaN(releaseDate.getTime())) return false;
      
      // Calculate difference in milliseconds
      const now = new Date();
      const diffTime = now.getTime() - releaseDate.getTime();
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      
      // Consider it "new" if released within the last 30 days
      return diffDays >= 0 && diffDays <= 30;
    } catch (error) {
      console.error('Error checking if game is new:', error);
      return false;
    }
  };

  const parseTags = (game) => {
    const t = game?.tags;
    if (!t) return [];
    if (Array.isArray(t)) return t;
    return String(t).split(/[,;\s]+/).filter(Boolean).slice(0, 6);
  };

  const normalizeGame = (game, idx) => {
    const stats = getGameStats({ original: game });
    return {
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
      rating: stats.rating,
      players: stats.players,
      trending: stats.trending,
      original: game,
    };
  };

  const goToBanner = (index, e) => {
    if (e) e.stopPropagation(); // Prevent banner click navigation
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

  // Calculate content area width (window width minus sidebar)
  // Minimum app size: 1280px width - 260px sidebar = 1020px content width
  const [contentWidth, setContentWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth - sidebarWidth;
    }
    return 1020; // Default: 1280 (min width) - 260 (sidebar)
  });

  useEffect(() => {
    const updateContentWidth = () => {
      setContentWidth(window.innerWidth - sidebarWidth);
    };

    window.addEventListener('resize', updateContentWidth);
    updateContentWidth(); // Initial calculation

    return () => {
      window.removeEventListener('resize', updateContentWidth);
    };
  }, [sidebarWidth]);

  // Calculate banner height based on content width (maintain aspect ratio)
  // Use 20% of content width, clamped between 250px and 600px
  const bannerHeight = Math.max(250, Math.min(600, contentWidth * 0.20));

  return (
    <div className="store" style={{ '--content-width': `${contentWidth}px` }}>
      {/* Featured Game Banner */}
      <div className="featured-section" style={{ height: `${bannerHeight}px` }}>
        <div 
          className="featured-banner"
          onMouseEnter={() => setIsBannerHovered(true)}
          onMouseLeave={() => setIsBannerHovered(false)}
          onClick={() => {
            if (safeFeaturedGame.id && safeFeaturedGame.id !== 'none') {
              navigate(`/store/game/${safeFeaturedGame.id}`);
            }
          }}
          style={{ 
            cursor: safeFeaturedGame.id && safeFeaturedGame.id !== 'none' ? 'pointer' : 'default',
            '--content-width': `${contentWidth}px`,
            '--banner-height': `${bannerHeight}px`
          }}
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
          <div className="featured-content-left">
            <div className="featured-badges">
              <div className="featured-badge">FEATURED</div>
              {isNewRelease(safeFeaturedGame) && (
                <div className="featured-badge featured-badge-new">NEW</div>
              )}
              {isGameOwnedByMe(safeFeaturedGame) && (
                <div className="featured-badge featured-badge-owned" title="You own this game">
                  <CheckCircle2 size={14} />
                  <span>OWNED</span>
                </div>
              )}
            </div>
            <div className="featured-title-section">
              <h1 className="featured-title">{safeFeaturedGame.name}</h1>
              <div className="featured-stats">
                <div 
                  className="stat stat-rating"
                  style={{ 
                    color: getColorForRating(getGameStats(safeFeaturedGame).rating),
                  }}
                >
                  <Star size={18} fill={getColorForRating(getGameStats(safeFeaturedGame).rating)} color={getColorForRating(getGameStats(safeFeaturedGame).rating)} />
                  <span>{getGameStats(safeFeaturedGame).rating || '0'}</span>
                </div>
                <div className="stat">
                  <Users size={18} />
                  <span>{getGameStats(safeFeaturedGame).players || '0'}</span>
                </div>
                <div className={`stat trending ${!getTrendingDisplay(getGameStats(safeFeaturedGame).trending).isPositive ? 'negative' : ''}`}>
                  {React.createElement(getTrendingIcon(getGameStats(safeFeaturedGame).trending), { size: 18 })}
                  <span>{getTrendingDisplay(getGameStats(safeFeaturedGame).trending).value}</span>
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
              {isGameOwnedByMe(safeFeaturedGame) ? (
                <button className="play-btn install" onClick={(e) => e.stopPropagation()}>
                  <Play size={20} />
                  Play Now
                </button>
              ) : (
                <button className={`play-btn ${safeFeaturedGame.price > 0 ? 'buy' : 'install'}`} onClick={(e) => e.stopPropagation()}>
                  <Play size={20} />
                  {safeFeaturedGame.price === 0 ? 'Play Free' : `Buy for $${safeFeaturedGame.price}`}
                </button>
              )}
              <button
                className={`banner-bookmark inline ${bookmarkedGames.has(safeFeaturedGame.id) ? 'bookmarked' : ''}`}
                title={bookmarkedGames.has(safeFeaturedGame.id) ? 'Saved' : 'Save'}
                onClick={(e) => { e.stopPropagation(); toggleBookmark(safeFeaturedGame.id); }}
                aria-label={bookmarkedGames.has(safeFeaturedGame.id) ? 'Remove bookmark' : 'Add bookmark'}
                aria-pressed={bookmarkedGames.has(safeFeaturedGame.id)}
              >
                <svg width="48" height="48" viewBox="0 0 24 24" fill={bookmarkedGames.has(safeFeaturedGame.id) ? 'currentColor' : 'none'} xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 3h12v18l-6-4-6 4V3z" stroke="currentColor" strokeWidth="2" strokeLinejoin="miter" strokeLinecap="butt"/>
                </svg>
              </button>
            </div>
          </div>
          
          {/* Media Slideshow */}
          <div className="featured-content-right">
            <div 
              className="featured-media-slideshow"
              onMouseEnter={() => setIsMediaSlideshowHovered(true)}
              onMouseLeave={() => setIsMediaSlideshowHovered(false)}
            >
              <div className="media-slideshow-container">
                {currentMedia.length > 0 ? (
                  <>
                    {currentMedia.map((mediaItem, index) => {
                      const mediaUrl = getImageUrl(mediaItem);
                      if (!mediaUrl) return null;
                      
                      const isVideo = (typeof mediaItem === 'object' && mediaItem.type?.startsWith('video/')) ||
                                      (typeof mediaItem === 'string' && /\.(mp4|webm|mov)$/i.test(mediaItem));
                      
                      const isActive = index === currentMediaIndex;
                      const videoKey = `${safeFeaturedGame.id}-${index}`;
                      
                      return (
                        <div
                          key={index}
                          className={`media-slide ${isActive ? 'active' : ''}`}
                          style={{ display: isActive ? 'block' : 'none' }}
                        >
                          {isVideo ? (
                            <video
                              ref={(el) => {
                                if (el) mediaVideoRefs.current[videoKey] = el;
                              }}
                              src={mediaUrl}
                              muted={isMediaMuted}
                              loop
                              playsInline
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                borderRadius: '16px'
                              }}
                            />
                          ) : (
                            <img
                              src={mediaUrl}
                              alt={`Media ${index + 1}`}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                borderRadius: '16px'
                              }}
                            />
                          )}
                        </div>
                      );
                    })}
                    
                    {/* Sound toggle button (only show for videos) */}
                    {currentMedia[currentMediaIndex] && (
                      (() => {
                        const currentMediaItem = currentMedia[currentMediaIndex];
                        const isVideo = (typeof currentMediaItem === 'object' && currentMediaItem.type?.startsWith('video/')) ||
                                        (typeof currentMediaItem === 'string' && /\.(mp4|webm|mov)$/i.test(currentMediaItem));
                        
                        return isVideo ? (
                          <button
                            className="media-sound-toggle"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsMediaMuted(!isMediaMuted);
                            }}
                            title={isMediaMuted ? 'Unmute' : 'Mute'}
                          >
                            {isMediaMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                          </button>
                        ) : null;
                      })()
                    )}
                  </>
                ) : (
                  <div style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(0, 0, 0, 0.3)',
                    borderRadius: '16px',
                    color: 'rgba(255, 255, 255, 0.5)',
                    fontSize: '14px'
                  }}>
                    No media available
                  </div>
                )}
              </div>
              
              {/* Media indicators */}
              {currentMedia.length > 1 && (
                <div className="media-indicators">
                  {currentMedia.map((_, index) => (
                    <button
                      key={index}
                      className={`media-indicator ${index === currentMediaIndex ? 'active' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentMediaIndex(index);
                      }}
                      aria-label={`Go to media ${index + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
          
          {/* Navigation Buttons */}
          <button 
            className={`banner-nav prev ${isPreview ? 'disabled' : ''}`} 
            onClick={prevBanner}
            disabled={isPreview}
          >
            <ChevronLeft size={28} strokeWidth={2.5} />
          </button>
          <button 
            className={`banner-nav next ${isPreview ? 'disabled' : ''}`} 
            onClick={nextBanner}
            disabled={isPreview}
          >
            <ChevronRight size={28} strokeWidth={2.5} />
          </button>
          
          {/* Banner Indicators */}
          <div className="banner-indicators">
            {featuredGames.map((_, index) => (
              <button
                key={index}
                className={`indicator ${index === currentBannerIndex ? 'active' : ''} ${isPreview ? 'disabled' : ''}`}
                onClick={(e) => goToBanner(index, e)}
                disabled={isPreview}
              />
            ))}
          </div>
        </div>
        
        {/* Taskbar */}
        <div className="store-taskbar" style={{ '--content-width': `${contentWidth}px` }}>
          <div className="taskbar-content">
            {/* Left Section - Empty/Spacer */}
            <div className="taskbar-left">
            </div>

            {/* Middle Section - Filter Buttons */}
            <div className="taskbar-center">
              <button 
                className={`taskbar-btn taskbar-btn-grid ${activeFilter === 'grid' ? 'active' : ''}`} 
                title="Grid View"
                onClick={() => setActiveFilter('grid')}
              >
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
              <button 
                className={`taskbar-btn taskbar-btn-bookmarked ${activeFilter === 'bookmarked' ? 'active' : ''}`} 
                title="Bookmarked"
                onClick={() => setActiveFilter('bookmarked')}
              >
                <Bookmark size={18} />
              </button>
              <button 
                className={`taskbar-btn taskbar-btn-trending ${activeFilter === 'trending' ? 'active' : ''}`} 
                title="Trending"
                onClick={() => setActiveFilter('trending')}
              >
                <Flame size={18} />
              </button>
              <button 
                className={`taskbar-btn taskbar-btn-free ${activeFilter === 'free' ? 'active' : ''}`} 
                title="Free Games"
                onClick={() => setActiveFilter('free')}
              >
                <Gift size={18} />
              </button>
            </div>

            {/* Right Section - Search */}
            <div className="taskbar-right">
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
              {getFilteredGames(customGames.map((g, i) => normalizeGame(g, i))).slice(0, 10).map((g) => (
                <div 
                  key={`new-${g.id}`} 
                  className="featured-below-card"
                  onClick={() => {
                    if (g.id) {
                      navigate(`/store/game/${g.id}`);
                    }
                  }}
                  style={{ cursor: g.id ? 'pointer' : 'default' }}
                >
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
                      <svg width="32" height="32" viewBox="0 0 24 24" fill={bookmarkedGames.has(g.id) ? 'currentColor' : 'none'} xmlns="http://www.w3.org/2000/svg">
                        <path d="M6 3h12v18l-6-4-6 4V3z" stroke="currentColor" strokeWidth="2" strokeLinejoin="miter" strokeLinecap="butt"/>
                      </svg>
                    </button>
                    <div className="banner-cta">
                      <div className="banner-free-text">{displayPrice(g)}</div>
                    </div>
                    <div className="banner-hover-hint">
                      <ChevronRight size={14} />
                    </div>
                  </div>
                  <div className="featured-card-info">
                    <div className="card-info-header">
                      <div className="card-info-header-row">
                        <h3 title={g.name || 'Untitled Game'}>{g.name || 'Untitled Game'}</h3>
                        {isGameOwnedByMe(g) && (
                          <div className="card-owned-badge" title="You own this game">
                            <CheckCircle2 size={14} />
                          </div>
                        )}
                      </div>
                      {g.version && <p className="card-info-version">Version {g.version}</p>}
                    </div>
                    <div 
                      className="card-info-rating"
                      style={{
                        color: getColorForRating(getGameStats(g).rating),
                      }}
                    >
                      <Star size={14} fill={getColorForRating(getGameStats(g).rating)} color={getColorForRating(getGameStats(g).rating)} />
                      <span>{getGameStats(g).rating || '0'}</span>
                    </div>
                    <div className="card-info-desc">{g.description || 'No description provided.'}</div>
                    <div className={`card-info-price ${!(getPriceValue(g) > 0) ? 'is-free' : ''}`}>{displayPrice(g)}</div>
                    <div className="card-info-actions">
                      {isGameOwnedByMe(g) ? (
                        <button className="card-info-primary install" onClick={(e) => e.stopPropagation()}>Play Now</button>
                      ) : (
                        <button className={`card-info-primary ${getPriceValue(g) > 0 ? 'buy' : 'install'}`} onClick={(e) => e.stopPropagation()}>{getPriceValue(g) > 0 ? 'Buy Now' : 'Install Now'}</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Older games - alternating grid */}
            <div className="featured-older-grid">
              {getFilteredGames(customGames.map((g, i) => normalizeGame(g, i))).slice(10).map((g) => (
                <div 
                  key={g.id} 
                  className="featured-below-card"
                  onClick={() => {
                    if (g.id) {
                      navigate(`/store/game/${g.id}`);
                    }
                  }}
                  style={{ cursor: g.id ? 'pointer' : 'default' }}
                >
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
                      <svg width="32" height="32" viewBox="0 0 24 24" fill={bookmarkedGames.has(g.id) ? 'currentColor' : 'none'} xmlns="http://www.w3.org/2000/svg">
                        <path d="M6 3h12v18l-6-4-6 4V3z" stroke="currentColor" strokeWidth="2" strokeLinejoin="miter" strokeLinecap="butt"/>
                      </svg>
                    </button>
                    <div className="banner-cta">
                      <div className="banner-free-text">{displayPrice(g)}</div>
                    </div>
                    <div className="banner-hover-hint">
                      <ChevronRight size={14} />
                    </div>

                  </div>
                  <div className="featured-card-info">
                    <div className="card-info-header">
                      <div className="card-info-header-row">
                        <h3 title={g.name || 'Untitled Game'}>{g.name || 'Untitled Game'}</h3>
                        {isGameOwnedByMe(g) && (
                          <div className="card-owned-badge" title="You own this game">
                            <CheckCircle2 size={14} />
                          </div>
                        )}
                      </div>
                      {g.version && <p className="card-info-version">Version {g.version}</p>}
                    </div>
                    <div 
                      className="card-info-rating"
                      style={{
                        color: getColorForRating(getGameStats(g).rating),
                      }}
                    >
                      <Star size={14} fill={getColorForRating(getGameStats(g).rating)} color={getColorForRating(getGameStats(g).rating)} />
                      <span>{getGameStats(g).rating || '0'}</span>
                    </div>
                    <div className="card-info-desc">
                      {g.description || 'No description provided.'}
                    </div>
                    <div className={`card-info-price ${!(getPriceValue(g) > 0) ? 'is-free' : ''}`}>
                      {displayPrice(g)}
                    </div>
                    <div className="card-info-actions">
                      {isGameOwnedByMe(g) ? (
                        <button className="card-info-primary install" onClick={(e) => e.stopPropagation()}>Play Now</button>
                      ) : (
                        <button className={`card-info-primary ${getPriceValue(g) > 0 ? 'buy' : 'install'}`} onClick={(e) => e.stopPropagation()}>{getPriceValue(g) > 0 ? 'Buy Now' : 'Install Now'}</button>
                      )}
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