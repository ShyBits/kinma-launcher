import React, { useState, useEffect, useRef } from 'react';
import { Star, Download, Play, Users, TrendingUp, TrendingDown, Share2, Bookmark, MessageSquare, Bell, Search, X, ChevronDown, DollarSign, Settings, Save, Volume2, VolumeX, ChevronLeft, ChevronRight, CheckCircle2, Flame, Gift, User, CreditCard, ShoppingCart } from 'lucide-react';
import { getUserData, getUserScopedKey, getAllUsersData, saveUserData, getCurrentUserId } from '../utils/UserDataManager';
import { startDownload as startGlobalDownload } from '../utils/DownloadSpeedStore';
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
  const [bannerColors, setBannerColors] = useState({}); // Store extracted colors: { gameId: 'rgb(r, g, b)' }
  const [bannerAverageColors, setBannerAverageColors] = useState({}); // Store average colors (not darkened): { gameId: { r, g, b } }
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [selectedGameForPurchase, setSelectedGameForPurchase] = useState(null);
  const [cartItems, setCartItems] = useState(new Set());
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

  // Store current game ID to preserve it across recalculations
  const currentGameIdRef = React.useRef(null);
  // Track if we're currently resizing to prevent conflicts with auto-switch
  const isResizingRef = React.useRef(false);
  const resizeTimeoutRef = React.useRef(null);

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
    // Use stable seed based on game IDs to ensure consistent order
    const weight = (g) => {
      const now = toNumber(g.currentPlaying);
      const total = toNumber(g.players);
      const w = (now || Math.round(total * 0.05) || 1);
      return Math.max(1, w);
    };

    // Sort candidates by ID first for stable ordering, then apply weights
    const sortedCandidates = [...candidates].sort((a, b) => {
      const idA = a.id || '';
      const idB = b.id || '';
      return idA.localeCompare(idB);
    });

    const pool = sortedCandidates.map(g => ({ g, w: weight(g) }));
    const picks = [];
    const count = Math.min(5, pool.length);
    
    // If we have a current game ID, try to preserve it
    let preservedGame = null;
    if (currentGameIdRef.current) {
      const preserved = pool.find(p => p.g.id === currentGameIdRef.current);
      if (preserved) {
        preservedGame = preserved.g;
        pool.splice(pool.indexOf(preserved), 1);
      }
    }
    
    // Sort remaining pool by weight (descending) for deterministic selection
    // This ensures consistent order when games have same weights
    pool.sort((a, b) => {
      if (b.w !== a.w) return b.w - a.w; // Higher weight first
      // If weights are equal, sort by ID for stability
      const idA = a.g.id || '';
      const idB = b.g.id || '';
      return idA.localeCompare(idB);
    });
    
    // Pick top games by weight (deterministic, no random)
    const remainingCount = preservedGame ? count - 1 : count;
    for (let i = 0; i < remainingCount && i < pool.length; i++) {
      picks.push(pool[i].g);
    }
    
    // Add preserved game at the beginning to maintain current index
    const result = preservedGame ? [preservedGame, ...picks] : picks;
    
    // Update ref with current game ID
    if (result.length > 0 && !currentGameIdRef.current) {
      currentGameIdRef.current = result[0].id;
    }
    
    return result;
  }, [gamesData, customGames, isPreview]);

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

  // Update current game ID ref when banner index changes
  React.useEffect(() => {
    if (currentFeaturedGame && currentFeaturedGame.id) {
      currentGameIdRef.current = currentFeaturedGame.id;
    }
  }, [currentFeaturedGame?.id]);

  // Track previous featured games IDs to detect actual changes
  const prevFeaturedGamesIdsRef = React.useRef(null);

  // Update banner index when featuredGames array changes to preserve current game
  React.useEffect(() => {
    if (featuredGames.length === 0) return;
    
    // Create a stable key from game IDs to detect actual changes
    const currentIds = featuredGames.map(g => g.id).join(',');
    const prevIds = prevFeaturedGamesIdsRef.current;
    
    // Only update if the array actually changed (different game IDs)
    if (prevIds !== null && currentIds !== prevIds) {
      if (currentGameIdRef.current) {
        const newIndex = featuredGames.findIndex(g => g.id === currentGameIdRef.current);
        if (newIndex !== -1) {
          // Use a small delay to avoid conflicts with auto-switch
          const timeoutId = setTimeout(() => {
            // Double-check we're not resizing before updating
            if (!isResizingRef.current) {
              setCurrentBannerIndex(prevIndex => {
                // Only update if the index actually needs to change
                return prevIndex !== newIndex ? newIndex : prevIndex;
              });
            }
          }, 100);
          return () => clearTimeout(timeoutId);
        } else {
          // Current game not found, reset to first game
          const timeoutId = setTimeout(() => {
            if (!isResizingRef.current) {
              setCurrentBannerIndex(0);
              currentGameIdRef.current = featuredGames[0]?.id || null;
            }
          }, 100);
          return () => clearTimeout(timeoutId);
        }
      }
    }
    
    // Update ref with current IDs
    prevFeaturedGamesIdsRef.current = currentIds;
  }, [featuredGames]); // Only depend on featuredGames, not currentBannerIndex

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
      // Skip if currently resizing - pause auto-switch during resize
      if (isResizingRef.current) return;
      
      setCurrentBannerIndex((prev) => {
        const nextIndex = (prev + 1) % featuredGames.length;
        // Update ref to track current game
        if (featuredGames[nextIndex]?.id) {
          currentGameIdRef.current = featuredGames[nextIndex].id;
        }
        return nextIndex;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [isPreview, isBannerHovered, featuredGames.length, featuredGames]);

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
    const load = async () => {
      try {
        // Get all games from all users for the Store (shared marketplace)
        const allGames = getAllUsersData('customGames');
        
        // Filter to only show published games
        const publishedGames = allGames.filter(game => {
          const status = game.status || game.fullFormData?.status || 'draft';
          return status === 'public' || status === 'published';
        });
        
        // Remove duplicates based on gameId (keep first occurrence)
        const uniqueGamesMap = new Map();
        publishedGames.forEach(game => {
          const gameId = game.gameId || game.id;
          if (gameId && !uniqueGamesMap.has(gameId)) {
            uniqueGamesMap.set(gameId, game);
          }
        });
        
        // Check which games actually exist in the games folder
        const existingGames = [];
        for (const [gameId, game] of uniqueGamesMap) {
          try {
            if (window.electronAPI && window.electronAPI.gameFolderExists) {
              const exists = await window.electronAPI.gameFolderExists(gameId);
              if (exists) {
                existingGames.push(game);
              }
            } else {
              // Fallback: if Electron API is not available, include the game anyway
              existingGames.push(game);
            }
          } catch (error) {
            console.error(`Error checking game folder for ${gameId}:`, error);
            // Skip games that can't be verified
          }
        }
        
        setCustomGames(existingGames);
        
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

  // Extract average color from banner image
  const extractBannerColor = (imageUrl, gameId) => {
    if (!imageUrl || bannerColors[gameId]) return; // Skip if already extracted or no image
    
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 50; // Small size for performance
        canvas.height = 50;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        ctx.drawImage(img, 0, 0, 50, 50);
        const imageData = ctx.getImageData(0, 0, 50, 50);
        const data = imageData.data;
        
        let r = 0, g = 0, b = 0, count = 0;
        for (let i = 0; i < data.length; i += 4) {
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          count++;
        }
        
        const avgR = Math.round(r / count);
        const avgG = Math.round(g / count);
        const avgB = Math.round(b / count);
        
        // Store average color (not darkened) for version box
        setBannerAverageColors(prev => ({
          ...prev,
          [gameId]: { r: avgR, g: avgG, b: avgB }
        }));
        
        // Darken the color (multiply by 0.3 for darker background)
        const darkR = Math.round(avgR * 0.3);
        const darkG = Math.round(avgG * 0.3);
        const darkB = Math.round(avgB * 0.3);
        
        setBannerColors(prev => ({
          ...prev,
          [gameId]: `rgb(${darkR}, ${darkG}, ${darkB})`
        }));
      } catch (error) {
        console.error('Error extracting color:', error);
      }
    };
    img.onerror = () => {
      // Fallback to default dark color if image fails to load
      setBannerColors(prev => ({
        ...prev,
        [gameId]: 'rgb(15, 17, 21)'
      }));
    };
    img.src = imageUrl;
  };

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

  // Helper to check if a game has a promo/discount
  const hasPromo = (game) => {
    if (!game) return false;
    const original = game.original || game;
    // Check for various promo/discount fields
    const discountPercent = original.discountPercent || original.discountPercentage || original.fullFormData?.discountPercent;
    const hasDiscount = discountPercent && parseFloat(discountPercent) > 0;
    return !!(
      original.promo ||
      original.discount ||
      hasDiscount ||
      original.onSale ||
      original.isPromo ||
      original.sale ||
      (original.discountPrice && original.discountPrice < original.price)
    );
  };

  const getPromoPercent = (game) => {
    if (!game) return null;
    const original = game.original || game;
    const discountPercent = original.discountPercent || original.discountPercentage || original.fullFormData?.discountPercent;
    if (discountPercent && parseFloat(discountPercent) > 0) {
      return Math.round(parseFloat(discountPercent));
    }
    // Calculate from discount price if available
    if (original.discountPrice && original.price && original.discountPrice < original.price) {
      const percent = Math.round(((original.price - original.discountPrice) / original.price) * 100);
      return percent > 0 ? percent : null;
    }
    return null;
  };

  const getDiscountedPrice = (game) => {
    if (!game) return null;
    const originalPrice = getPriceValue(game);
    if (originalPrice <= 0) return null;
    
    const promoPercent = getPromoPercent(game);
    if (!promoPercent || promoPercent <= 0) return null;
    
    const discount = originalPrice * (promoPercent / 100);
    const discountedPrice = originalPrice - discount;
    // Return 0 if 100% discount, otherwise return the discounted price if > 0
    return discountedPrice >= 0 ? discountedPrice : null;
  };

  // Get the final price considering promo discounts
  const getFinalPrice = (game) => {
    if (!game) return 0;
    const originalPrice = getPriceValue(game);
    if (originalPrice <= 0) return 0;
    
    const discountedPrice = getDiscountedPrice(game);
    return discountedPrice !== null ? discountedPrice : originalPrice;
  };

  const getPromoColor = (percent) => {
    if (!percent || percent <= 0) return 'rgba(255, 87, 34, 1)'; // Default orange
    
    // Scale from orange to green based on discount percentage
    // 0-25%: Orange (255, 87, 34)
    // 25-50%: Orange-Yellow (255, 150, 50)
    // 50-75%: Yellow-Green (200, 200, 50)
    // 75-100%: Green (34, 197, 94)
    
    if (percent <= 25) {
      // Orange to Orange-Yellow
      const ratio = percent / 25;
      const r = 255;
      const g = Math.round(87 + (150 - 87) * ratio);
      const b = Math.round(34 + (50 - 34) * ratio);
      return `rgba(${r}, ${g}, ${b}, 1)`;
    } else if (percent <= 50) {
      // Orange-Yellow to Yellow-Green
      const ratio = (percent - 25) / 25;
      const r = Math.round(255 - (255 - 200) * ratio);
      const g = Math.round(150 + (200 - 150) * ratio);
      const b = Math.round(50);
      return `rgba(${r}, ${g}, ${b}, 1)`;
    } else if (percent <= 75) {
      // Yellow-Green to Green
      const ratio = (percent - 50) / 25;
      const r = Math.round(200 - (200 - 34) * ratio);
      const g = Math.round(200 - (200 - 197) * ratio);
      const b = Math.round(50 - (50 - 94) * ratio);
      return `rgba(${r}, ${g}, ${b}, 1)`;
    } else {
      // 75-100%: Green
      return 'rgba(34, 197, 94, 1)';
    }
  };

  const getPromoReason = (game) => {
    if (!game) return null;
    const original = game.original || game;
    return original.promoReason || original.discountReason || original.fullFormData?.promoReason || original.fullFormData?.discountReason || null;
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

  // Add game to library (without starting download)
  const handleAddToLibrary = (game) => {
    console.log('handleAddToLibrary called with game:', game);
    
    if (!game) {
      console.error('No game provided to handleAddToLibrary');
      return;
    }
    
    // Get gameId from various possible locations
    const gameId = game.id || game.gameId || game.original?.gameId || game.original?.id;
    
    if (!gameId) {
      console.error('No gameId found in game object:', game);
      alert('Error: Game ID not found. Please try again.');
      return;
    }
    
    try {
      const currentUserId = getCurrentUserId();
      if (!currentUserId) {
        alert('Please log in to add games to library.');
        return;
      }

      // Get current user's customGames
      const userCustomGames = getUserData('customGames', []);
      console.log('Current user customGames:', userCustomGames);
      
      // Check if game is already in library (check both gameId and id for compatibility)
      const gameExists = userCustomGames.some(g => {
        const existingGameId = g.gameId || g.id;
        return String(existingGameId) === String(gameId);
      });
      
      if (gameExists) {
        console.log('Game already in library, navigating...');
        // Game already in library, just navigate
        if (navigate) {
          navigate(`/game/${gameId}`);
        }
        return;
      }

      // Find the original game data from customGames (published games)
      // Also check in the normalized game object's original property
      let originalGame = customGames.find(g => {
        const gId = g.gameId || g.id;
        return String(gId) === String(gameId);
      });
      
      // If not found in customGames, use the game.original if available
      if (!originalGame && game.original) {
        originalGame = game.original;
      }
      
      // If still not found, use the game itself as fallback
      if (!originalGame) {
        originalGame = game;
      }

      console.log('Original game found:', originalGame);

      // Check if this is the user's own game (check if it exists in myCustomGames)
      const isOwnGame = myCustomGames.some(g => {
        const gId = g.gameId || g.id;
        return String(gId) === String(gameId);
      });

      // Create a new game entry for the user's library
      const newLibraryGame = {
        ...originalGame,
        gameId: gameId,
        id: gameId, // Ensure both gameId and id are set
        name: game.name || originalGame.name || originalGame.gameName || 'Untitled Game',
        banner: game.banner || originalGame.banner || originalGame.bannerImage || null,
        isInstalled: false,
        addedToLibraryAt: new Date().toISOString(),
        // Mark as own game if it's the developer's game
        isOwnGame: isOwnGame,
        // Store ownership information
        owned: true,
        ownedBy: currentUserId,
        purchasedAt: new Date().toISOString()
      };

      // Add to user's customGames (remove any duplicates first)
      const uniqueGames = userCustomGames.filter(g => {
        const existingGameId = g.gameId || g.id;
        return String(existingGameId) !== String(gameId);
      });
      const updatedCustomGames = [...uniqueGames, newLibraryGame];
      
      console.log('Saving updated customGames:', updatedCustomGames);
      saveUserData('customGames', updatedCustomGames);

      // Verify it was saved
      const verifySaved = getUserData('customGames', []);
      console.log('Verified saved games:', verifySaved);

      // Update local state immediately
      setMyCustomGames(updatedCustomGames);

      // Dispatch event to notify other components (sidebar and library menu)
      // Dispatch immediately to ensure all components update
      console.log('Dispatching customGameUpdate event');
      window.dispatchEvent(new CustomEvent('customGameUpdate'));

      // Small delay before navigation to ensure UI updates are visible
      // This gives time for the sidebar and library to update
      setTimeout(() => {
        // Navigate to game page (without starting download)
        if (navigate) {
          navigate(`/game/${gameId}`);
        }
      }, 150);
    } catch (error) {
      console.error('Error adding game to library:', error);
      alert('Failed to add game to library. Please try again.');
    }
  };

  // Open purchase modal
  const handleBuyGame = (game) => {
    if (!game || !game.id) return;
    setSelectedGameForPurchase(game);
    setShowPurchaseModal(true);
  };

  // Handle purchase completion
  const handlePurchaseComplete = () => {
    if (!selectedGameForPurchase) return;
    
    // After purchase, add game to library (download can be started manually in game menu)
    handleAddToLibrary(selectedGameForPurchase);
    
    // Close modal
    setShowPurchaseModal(false);
    setSelectedGameForPurchase(null);
  };

  // Add/remove game from cart
  const handleToggleCart = (game) => {
    if (!game || !game.id) return;
    setCartItems(prev => {
      const newCart = new Set(prev);
      if (newCart.has(game.id)) {
        newCart.delete(game.id);
      } else {
        newCart.add(game.id);
      }
      return newCart;
    });
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
      // Mark as resizing
      isResizingRef.current = true;
      
      // Clear any existing timeout
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      
      setContentWidth(window.innerWidth - sidebarWidth);
      
      // Reset resizing flag after resize completes (debounce)
      resizeTimeoutRef.current = setTimeout(() => {
        isResizingRef.current = false;
      }, 150);
    };

    window.addEventListener('resize', updateContentWidth);
    updateContentWidth(); // Initial calculation

    return () => {
      window.removeEventListener('resize', updateContentWidth);
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
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
            <div className="featured-images-container">
              {featuredGames.map((game, index) => (
                <div 
                  key={game.id || index}
                  className="featured-image"
                  style={{
                    ...(game.image ? {
                      backgroundImage: `url(${game.image})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      backgroundRepeat: 'no-repeat'
                    } : {}),
                    opacity: index === currentBannerIndex ? 1 : 0,
                    transform: `translateX(${(index - currentBannerIndex) * 100}%)`,
                    transition: 'opacity 0.5s ease-in-out, transform 0.5s ease-in-out',
                    pointerEvents: index === currentBannerIndex ? 'auto' : 'none'
                  }}
                >
                  {!game.image && (
                    <div className="featured-placeholder">🎮</div>
                  )}
                </div>
              ))}
            </div>
            <div className="featured-overlay"></div>
          </div>
          
        {/* Inline bookmark will be rendered next to CTA below */}

        <div className="featured-content">
          {featuredGames.map((game, index) => (
            <div 
              key={game.id || index}
              className="featured-content-wrapper"
              style={{
                opacity: index === currentBannerIndex ? 1 : 0,
                transform: `translateX(${(index - currentBannerIndex) * 100}%)`,
                transition: 'opacity 0.5s ease-in-out, transform 0.5s ease-in-out',
                pointerEvents: index === currentBannerIndex ? 'auto' : 'none'
              }}
            >
              <div className="featured-content-left">
                <div className="featured-badges">
                  <div className="featured-badge">FEATURED</div>
                  {isNewRelease(game) && (
                    <div className="featured-badge featured-badge-new">NEW</div>
                  )}
                  {isGameOwnedByMe(game) && (
                    <div className="featured-badge featured-badge-owned" title="You own this game">
                      <CheckCircle2 size={14} />
                      <span>OWNED</span>
                    </div>
                  )}
                </div>
                <div className="featured-title-section">
                  <h1 className="featured-title">{game.name}</h1>
                  <div className="featured-stats">
                    <div 
                      className="stat stat-rating"
                      style={{ 
                        color: getColorForRating(getGameStats(game).rating),
                      }}
                    >
                      <Star size={18} fill={getColorForRating(getGameStats(game).rating)} color={getColorForRating(getGameStats(game).rating)} />
                      <span>{getGameStats(game).rating || '0'}</span>
                    </div>
                    <div className="stat">
                      <Users size={18} />
                      <span>{getGameStats(game).players || '0'}</span>
                    </div>
                    <div className={`stat trending ${!getTrendingDisplay(getGameStats(game).trending).isPositive ? 'negative' : ''}`}>
                      {React.createElement(getTrendingIcon(getGameStats(game).trending), { size: 18 })}
                      <span>{getTrendingDisplay(getGameStats(game).trending).value}</span>
                    </div>
                  </div>
                </div>
                <p className="featured-description">{game.description}</p>
                <div className="featured-tags">
                  {game.tags && game.tags.length > 0 ? (
                    game.tags.map(tag => (
                      <span key={tag} className="tag">{tag}</span>
                    ))
                  ) : (
                    <span className="tag">Game</span>
                  )}
                </div>
                <div className="featured-actions">
                  {isGameOwnedByMe(game) ? (
                    <button className="play-btn install" onClick={(e) => e.stopPropagation()}>
                      <Play size={20} />
                      Play Now
                    </button>
                  ) : (
                    <button className={`play-btn ${game.price > 0 ? 'buy' : 'install'}`} onClick={(e) => e.stopPropagation()}>
                      <Play size={20} />
                      {game.price === 0 ? 'Play Free' : `Buy for $${game.price}`}
                    </button>
                  )}
                  <button
                    className={`banner-bookmark inline ${bookmarkedGames.has(game.id) ? 'bookmarked' : ''}`}
                    title={bookmarkedGames.has(game.id) ? 'Saved' : 'Save'}
                    onClick={(e) => { e.stopPropagation(); toggleBookmark(game.id); }}
                    aria-label={bookmarkedGames.has(game.id) ? 'Remove bookmark' : 'Add bookmark'}
                    aria-pressed={bookmarkedGames.has(game.id)}
                  >
                    <svg width="48" height="48" viewBox="0 0 24 24" fill={bookmarkedGames.has(game.id) ? 'currentColor' : 'none'} xmlns="http://www.w3.org/2000/svg">
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
                {(() => {
                  const gameMedia = getGameMedia(game);
                  return gameMedia.length > 0 ? (
                    <>
                      {gameMedia.map((mediaItem, mediaIndex) => {
                        const mediaUrl = getImageUrl(mediaItem);
                        if (!mediaUrl) return null;
                        
                        const isVideo = (typeof mediaItem === 'object' && mediaItem.type?.startsWith('video/')) ||
                                        (typeof mediaItem === 'string' && /\.(mp4|webm|mov)$/i.test(mediaItem));
                        
                        const isActive = mediaIndex === 0; // Show first media for each game
                        const videoKey = `${game.id}-${mediaIndex}`;
                        
                        return (
                          <div
                            key={mediaIndex}
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
                                alt={`Media ${mediaIndex + 1}`}
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
                  );
                })()}
              </div>
            </div>
          </div>
            </div>
          ))}
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
                    {hasPromo(g) && getPromoPercent(g) && (
                      <div 
                        className="card-promo-badge" 
                        title={`${getPromoPercent(g)}% off`}
                        style={{ '--promo-color': getPromoColor(getPromoPercent(g)) }}
                      >
                        <span className="card-promo-percent">{getPromoPercent(g)}%</span>
                        {getPromoReason(g) && (
                          <span className="card-promo-reason">{getPromoReason(g)}</span>
                        )}
                      </div>
                    )}
                    <div 
                      className="banner-rating"
                      style={{
                        color: getColorForRating(getGameStats(g).rating),
                      }}
                    >
                      <Star size={16} fill={getColorForRating(getGameStats(g).rating)} color={getColorForRating(getGameStats(g).rating)} />
                      <span>{getGameStats(g).rating || '0'}</span>
                    </div>
                  </div>
                  <div 
                    className="featured-card-info"
                    style={bannerColors[g.id] ? { '--banner-color': bannerColors[g.id] } : {}}
                    ref={(el) => {
                      if (el && g.banner && !bannerColors[g.id]) {
                        extractBannerColor(g.banner, g.id);
                      }
                    }}
                  >
                    <div className="card-info-header">
                      <h3 title={g.name || 'Untitled Game'}>{g.name || 'Untitled Game'}</h3>
                    </div>
                    {g.version && (
                      <div 
                        className="card-info-version-separator"
                        style={bannerAverageColors[g.id] ? {
                          background: `rgba(${bannerAverageColors[g.id].r}, ${bannerAverageColors[g.id].g}, ${bannerAverageColors[g.id].b}, 1)`
                        } : {}}
                      >
                        <p className="card-info-version">{g.version}</p>
                      </div>
                    )}
                    <div className="card-info-desc">{g.description || 'No description provided.'}</div>
                    <div className={`card-info-price ${!(getPriceValue(g) > 0) ? 'is-free' : ''} ${hasPromo(g) && getPromoPercent(g) ? 'has-promo' : ''}`}>
                      {hasPromo(g) && getPromoPercent(g) && getPriceValue(g) > 0 ? (
                        (() => {
                          const discountedPrice = getDiscountedPrice(g);
                          return discountedPrice !== null ? (
                            <>
                              <span 
                                className="card-price-new" 
                                style={{ color: getPromoColor(getPromoPercent(g)) }}
                              >
                                {discountedPrice === 0 ? 'Free' : formatPrice(discountedPrice)}
                              </span>
                              <span className="card-price-old">{displayPrice(g)}</span>
                            </>
                          ) : (
                            displayPrice(g)
                          );
                        })()
                      ) : (
                        displayPrice(g)
                      )}
                    </div>
                    <div className="card-info-actions">
                      <button 
                        className={`card-info-primary ${getFinalPrice(g) > 0 ? 'buy' : 'install'}`} 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (getFinalPrice(g) > 0) {
                            handleBuyGame(g);
                          } else {
                            handleAddToLibrary(g);
                          }
                        }}
                      >
                        {getFinalPrice(g) > 0 ? 'Buy Now' : 'Add to Library'}
                      </button>
                      {getFinalPrice(g) > 0 && (
                        <button 
                          className={`card-info-cart ${cartItems.has(g.id) ? 'in-cart' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleCart(g);
                          }}
                          title={cartItems.has(g.id) ? 'Remove from cart' : 'Add to cart'}
                        >
                          <ShoppingCart size={18} />
                        </button>
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
                    {hasPromo(g) && getPromoPercent(g) && (
                      <div 
                        className="card-promo-badge" 
                        title={`${getPromoPercent(g)}% off`}
                        style={{ '--promo-color': getPromoColor(getPromoPercent(g)) }}
                      >
                        <span className="card-promo-percent">{getPromoPercent(g)}%</span>
                        {getPromoReason(g) && (
                          <span className="card-promo-reason">{getPromoReason(g)}</span>
                        )}
                      </div>
                    )}
                    <div 
                      className="banner-rating"
                      style={{
                        color: getColorForRating(getGameStats(g).rating),
                      }}
                    >
                      <Star size={16} fill={getColorForRating(getGameStats(g).rating)} color={getColorForRating(getGameStats(g).rating)} />
                      <span>{getGameStats(g).rating || '0'}</span>
                    </div>
                  </div>
                  <div 
                    className="featured-card-info"
                    style={bannerColors[g.id] ? { '--banner-color': bannerColors[g.id] } : {}}
                    ref={(el) => {
                      if (el && g.banner && !bannerColors[g.id]) {
                        extractBannerColor(g.banner, g.id);
                      }
                    }}
                  >
                    <div className="card-info-header">
                      <h3 title={g.name || 'Untitled Game'}>{g.name || 'Untitled Game'}</h3>
                      <div className="card-info-header-meta">
                        {g.version && <p className="card-info-version">{g.version}</p>}
                        <div 
                          className="card-info-rating"
                          style={{
                            color: getColorForRating(getGameStats(g).rating),
                          }}
                        >
                          <Star size={14} fill={getColorForRating(getGameStats(g).rating)} color={getColorForRating(getGameStats(g).rating)} />
                          <span>{getGameStats(g).rating || '0'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="card-info-desc">
                      {g.description || 'No description provided.'}
                    </div>
                    <div className={`card-info-price ${!(getPriceValue(g) > 0) ? 'is-free' : ''} ${hasPromo(g) && getPromoPercent(g) ? 'has-promo' : ''}`}>
                      {hasPromo(g) && getPromoPercent(g) && getPriceValue(g) > 0 ? (
                        (() => {
                          const discountedPrice = getDiscountedPrice(g);
                          return discountedPrice !== null ? (
                            <>
                              <span 
                                className="card-price-new" 
                                style={{ color: getPromoColor(getPromoPercent(g)) }}
                              >
                                {discountedPrice === 0 ? 'Free' : formatPrice(discountedPrice)}
                              </span>
                              <span className="card-price-old">{displayPrice(g)}</span>
                            </>
                          ) : (
                            displayPrice(g)
                          );
                        })()
                      ) : (
                        displayPrice(g)
                      )}
                    </div>
                    <div className="card-info-actions">
                      <button 
                        className={`card-info-primary ${getFinalPrice(g) > 0 ? 'buy' : 'install'}`} 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (getFinalPrice(g) > 0) {
                            handleBuyGame(g);
                          } else {
                            handleAddToLibrary(g);
                          }
                        }}
                      >
                        {getFinalPrice(g) > 0 ? 'Buy Now' : 'Add to Library'}
                      </button>
                      {getFinalPrice(g) > 0 && (
                        <button 
                          className={`card-info-cart ${cartItems.has(g.id) ? 'in-cart' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleCart(g);
                          }}
                          title={cartItems.has(g.id) ? 'Remove from cart' : 'Add to cart'}
                        >
                          <ShoppingCart size={18} />
                        </button>
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

      {/* Purchase Modal */}
      {showPurchaseModal && selectedGameForPurchase && (
        <div 
          className="purchase-modal-overlay" 
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowPurchaseModal(false);
              setSelectedGameForPurchase(null);
            }
          }}
        >
          <div className="purchase-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="purchase-modal-header">
              <h2>Purchase Game</h2>
              <button 
                className="purchase-modal-close" 
                onClick={() => {
                  setShowPurchaseModal(false);
                  setSelectedGameForPurchase(null);
                }}
              >
                <X size={20} />
              </button>
            </div>
            <div className="purchase-modal-body">
              <div className="purchase-game-info">
                <div className="purchase-game-image">
                  {selectedGameForPurchase.banner ? (
                    <img src={selectedGameForPurchase.banner} alt={selectedGameForPurchase.name} />
                  ) : (
                    <div className="purchase-game-placeholder">🎮</div>
                  )}
                </div>
                <div className="purchase-game-details">
                  <h3>{selectedGameForPurchase.name || 'Untitled Game'}</h3>
                  <p className="purchase-game-developer">{selectedGameForPurchase.developer || 'Unknown Developer'}</p>
                </div>
              </div>
              <div className="purchase-price-section">
                <div className="purchase-price-label">Price</div>
                <div className="purchase-price-value">
                  {getFinalPrice(selectedGameForPurchase) > 0 ? (
                    <>
                      {selectedGameForPurchase.original?.discountPercent > 0 ? (
                        <>
                          <span className="purchase-price-new" style={{ color: getPromoColor(selectedGameForPurchase.original.discountPercent) }}>
                            {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(getFinalPrice(selectedGameForPurchase))}
                          </span>
                          <span className="purchase-price-old">
                            {displayPrice(selectedGameForPurchase)}
                          </span>
                        </>
                      ) : (
                        <span>{displayPrice(selectedGameForPurchase)}</span>
                      )}
                    </>
                  ) : (
                    <span>Free</span>
                  )}
                </div>
              </div>
              <div className="purchase-payment-section">
                <h4>Payment Method</h4>
                <div className="purchase-payment-methods">
                  <button className="purchase-payment-method active">
                    <CreditCard size={20} />
                    <span>Credit Card</span>
                  </button>
                  <button className="purchase-payment-method">
                    <ShoppingCart size={20} />
                    <span>PayPal</span>
                  </button>
                </div>
              </div>
              <div className="purchase-modal-actions">
                <button 
                  className="purchase-cancel-btn"
                  onClick={() => {
                    setShowPurchaseModal(false);
                    setSelectedGameForPurchase(null);
                  }}
                >
                  Cancel
                </button>
                <button 
                  className="purchase-confirm-btn"
                  onClick={handlePurchaseComplete}
                >
                  Complete Purchase
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Store;