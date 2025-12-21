import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShoppingCart, Plus, Minus, ShoppingBag, Eye, EyeOff, Grid, List, ArrowLeft, Crown, TrendingUp, TrendingDown, Zap, Clock, Star, Users, Flame, ArrowRight, Sparkles, BarChart3, DollarSign, TrendingUp as TrendingUpIcon, PieChart, Target, Award, Activity, ArrowUpRight, ArrowDownRight, FileText, CheckCircle2, UserPlus, Search, X, ChevronLeft, RotateCw, RotateCcw, Maximize2, Minimize2, GitCompare, Flag, CheckSquare, Square } from 'lucide-react';
import { getUserData, saveUserData, getAllUsersData } from '../utils/UserDataManager';
import Item3DView from '../components/Item3DView';
import './Market.css';


// User inventory will be loaded from account-separated storage
const getUserInventory = (gameId) => {
  try {
    return getUserData(`inventory_${gameId}`, []);
  } catch (_) {
    return [];
  }
};

// Get all inventory items from all games (same as Profile.js)
const getAllInventoryItems = () => {
  try {
    const allItems = [];
    
    // Get all games from all users
    const allGames = getAllUsersData('customGames');
    
    // Create a map of gameId to game name
    const gameMap = {};
    allGames.forEach(game => {
      const gameId = game.gameId || game.id;
      if (gameId) {
        gameMap[gameId] = game.name || game.gameName || gameId;
      }
    });
    
    // Get inventory for each game
    Object.keys(gameMap).forEach(gameId => {
      const inventory = getUserData(`inventory_${gameId}`, []);
      if (inventory && Array.isArray(inventory) && inventory.length > 0) {
        inventory.forEach(item => {
          allItems.push({
            ...item,
            gameId,
            gameName: gameMap[gameId]
          });
        });
      }
    });
    
    // Also check localStorage directly for any inventory_ keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('inventory_')) {
        const gameId = key.replace('inventory_', '');
        if (!gameMap[gameId]) {
          // Game not in customGames, use gameId as name
          gameMap[gameId] = gameId;
        }
        try {
          const inventory = JSON.parse(localStorage.getItem(key) || '[]');
          if (Array.isArray(inventory) && inventory.length > 0) {
            inventory.forEach(item => {
              // Check if item already added
              const exists = allItems.some(existing => 
                existing.gameId === gameId && existing.id === item.id
              );
              if (!exists) {
                allItems.push({
                  ...item,
                  gameId,
                  gameName: gameMap[gameId]
                });
              }
            });
          }
        } catch (_) {
          // Skip invalid inventory data
        }
      }
    }
    
    return allItems;
  } catch (_) {
    return [];
  }
};

const Market = () => {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const [selectedGame, setSelectedGame] = useState(null);
  const [selectedTab, setSelectedTab] = useState('items');
  const [sortBy, setSortBy] = useState('price-low');
  const [rarityFilter, setRarityFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [itemSearch, setItemSearch] = useState('');
  const [priceFilter, setPriceFilter] = useState('all');
  const [watchedItems, setWatchedItems] = useState(new Set());
  const [showSellModal, setShowSellModal] = useState(false);
  const [showQuickBuyModal, setShowQuickBuyModal] = useState(false);
  const [showItemDetailModal, setShowItemDetailModal] = useState(false);
  const [selectedItemDetail, setSelectedItemDetail] = useState(null);
  const [comparisonItems, setComparisonItems] = useState([]);
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const [comparisonModalAutoOpened, setComparisonModalAutoOpened] = useState(false);
  const [comparisonModalManuallyClosed, setComparisonModalManuallyClosed] = useState(false);
  const [referenceItemId, setReferenceItemId] = useState(null);
  const [comparisonRotations, setComparisonRotations] = useState({});
  const [comparisonZooms, setComparisonZooms] = useState({});
  const [comparisonPans, setComparisonPans] = useState({});
  const [comparisonIsRotating, setComparisonIsRotating] = useState({});
  const [comparisonIsPanning, setComparisonIsPanning] = useState({});
  const [comparisonIsResetting, setComparisonIsResetting] = useState({});
  const comparison3dRefs = useRef({});
  const comparisonAnimationFrameRefs = useRef({});
  const comparisonCurrentValuesRefs = useRef({});
  const wheelThrottleRefs = useRef({});
  const doubleClickThrottleRefs = useRef({});
  const [comparisonViewMode, setComparisonViewMode] = useState('both'); // 'both', '3d', 'stats'
  const [drawerHeight, setDrawerHeight] = useState(45);
  const [isDraggingDrawer, setIsDraggingDrawer] = useState(false);
  const [hasDragged, setHasDragged] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showDrawerContent, setShowDrawerContent] = useState(false);

  // Handle drawer resize from top
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDraggingDrawer) {
        setHasDragged(true);
        // Calculate height from bottom of viewport
        const newHeight = window.innerHeight - e.clientY;
        const height = Math.max(45, Math.min(newHeight, window.innerHeight - 100));
        setDrawerHeight(height);
        // Show/hide content based on height
        if (height > 60) {
          setShowDrawerContent(true);
        } else {
          setShowDrawerContent(false);
        }
      }
    };

    const handleMouseUp = () => {
      if (isDraggingDrawer) {
        if (!hasDragged) {
          // If clicked without dragging, toggle open/close
          setIsDraggingDrawer(false);
          // Small delay to allow transition to re-enable
          setTimeout(() => {
            if (drawerHeight <= 60) {
              // Currently closed, open it to maximum (same as manual drag limit)
              setIsAnimating(true);
              setShowDrawerContent(true);
              const maxHeight = Math.min(window.innerHeight * 0.8, window.innerHeight - 100);
              setDrawerHeight(maxHeight);
              // Reset animation state after transition
              setTimeout(() => setIsAnimating(false), 400);
            } else {
              // Currently open, close it (same as manual drag minimum)
              // Keep full width during height animation, then minimize
              setIsAnimating(true);
              setDrawerHeight(45);
              // Hide content after animation completes
              setTimeout(() => {
                setShowDrawerContent(false);
                setIsAnimating(false);
              }, 400);
            }
          }, 10);
        } else {
          setIsDraggingDrawer(false);
        }
        setHasDragged(false);
      }
    };

    if (isDraggingDrawer) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDraggingDrawer, hasDragged]);
  const [isViewMaximized, setIsViewMaximized] = useState(false);
  const [lastMouseX, setLastMouseX] = useState(0);
  const [lastMouseY, setLastMouseY] = useState(0);
  const [selectedItems, setSelectedItems] = useState([]);
  const [sellStep, setSellStep] = useState(1); // 1: inventory selection, 2: pricing
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryFilter, setInventoryFilter] = useState('all');
  const [inventoryRarityFilter, setInventoryRarityFilter] = useState('all');
  const [inventoryGameFilter, setInventoryGameFilter] = useState('all');
  const [inventoryRefresh, setInventoryRefresh] = useState(0);
  const [itemPrices, setItemPrices] = useState({});
  const [collapsedBannerHeight, setCollapsedBannerHeight] = useState(300);
  const itemsGridRef = useRef(null);
  const [marketItemsRefresh, setMarketItemsRefresh] = useState(0);
  const [marketView, setMarketView] = useState('browse'); // browse, petitions, featured, trending, favorites, stats
  const [customGames, setCustomGames] = useState([]);
  const [watchedGames, setWatchedGames] = useState(new Set());
  const [expandedCards, setExpandedCards] = useState(new Set());
  const [petitions, setPetitions] = useState(() => {
    try {
      return getUserData('marketPetitions', {});
    } catch (e) {
      return {};
    }
  });
  const [showCreatePetitionForm, setShowCreatePetitionForm] = useState(false);
  const [petitionSearchQuery, setPetitionSearchQuery] = useState('');
  const [selectedPetitionGame, setSelectedPetitionGame] = useState(null);
  
  // Window width for responsive sidebar sizing
  const [windowWidth, setWindowWidth] = useState(() => {
    return typeof window !== 'undefined' ? window.innerWidth : 1120;
  });

  // Right sidebar resizing state
  const [marketRightSidebarWidth, setMarketRightSidebarWidth] = useState(() => {
    try {
      const saved = localStorage.getItem('marketRightSidebarWidth');
      return saved ? parseInt(saved, 10) : 260;
    } catch (_) {
      return 260;
    }
  });
  
  // Track if sidebar is collapsed
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('marketSidebarCollapsed') === 'true';
    } catch (_) {
      return false;
    }
  });
  
  // Collapsed sidebar width (minimal space)
  const COLLAPSED_WIDTH = 40;
  
  // Calculate responsive sidebar width based on window size
  // Scales between 15-25% of window width, clamped between 200px and 250px
  // Get all inventory items (same as Profile.js)
  const allInventoryItems = useMemo(() => getAllInventoryItems(), [inventoryRefresh]);
  
  // Get unique games from inventory
  const inventoryGames = useMemo(() => {
    const games = new Set();
    allInventoryItems.forEach(item => {
      if (item.gameId) games.add(item.gameId);
    });
    return Array.from(games).map(gameId => ({
      id: gameId,
      name: allInventoryItems.find(item => item.gameId === gameId)?.gameName || gameId
    }));
  }, [allInventoryItems]);
  
  // Filter and sort inventory items (same as Profile.js)
  const filteredInventoryItems = useMemo(() => {
    let filtered = [...allInventoryItems];
    
    // Search filter
    if (inventorySearch) {
      filtered = filtered.filter(item =>
        item.name?.toLowerCase().includes(inventorySearch.toLowerCase()) ||
        item.description?.toLowerCase().includes(inventorySearch.toLowerCase())
      );
    }
    
    // Game filter
    if (inventoryGameFilter !== 'all') {
      filtered = filtered.filter(item => item.gameId === inventoryGameFilter);
    }
    
    // Rarity filter
    if (inventoryRarityFilter !== 'all') {
      filtered = filtered.filter(item =>
        item.rarity?.toLowerCase() === inventoryRarityFilter.toLowerCase()
      );
    }
    
    // Filter out items that are already listed in the marketplace
    if (selectedGame) {
      const gameId = selectedGame.id || selectedGame.gameId;
      if (gameId) {
        const currentMarketItems = getUserData(`marketItems_${gameId}`, []);
        const listedItemIds = new Set(
          currentMarketItems
            .filter(mi => mi.status === 'active')
            .map(mi => `${mi.gameId || gameId}_${mi.originalItemId || mi.id}`)
        );
        
        filtered = filtered.filter(item => {
          const itemKey = `${item.gameId || gameId}_${item.id}`;
          return !listedItemIds.has(itemKey);
        });
      }
    }
    
    return filtered;
  }, [allInventoryItems, inventorySearch, inventoryGameFilter, inventoryRarityFilter, selectedGame, marketItemsRefresh]);
  
  // Refresh inventory on storage changes
  useEffect(() => {
    const handleStorageChange = () => {
      setInventoryRefresh(prev => prev + 1);
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('user-changed', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('user-changed', handleStorageChange);
    };
  }, []);

  // Reset banner height when game changes
  useEffect(() => {
    if (selectedGame) {
      setCollapsedBannerHeight(300);
    }
  }, [selectedGame]);



  // Handle banner collapsing on scroll
  useEffect(() => {
    const itemsGrid = itemsGridRef.current;
    if (!itemsGrid || !selectedGame) return;

    let lastScrollTop = 0;

    const handleScroll = () => {
      const scrollTop = itemsGrid.scrollTop;
      const initialHeight = 300;
      const minHeight = 60; // Minimum height for back button visibility
      
      // Switch directly to collapsed version on first scroll with smooth animation
      if (scrollTop > 0 && lastScrollTop === 0) {
        setCollapsedBannerHeight(minHeight);
      } else if (scrollTop === 0 && lastScrollTop > 0) {
        // Switch back to full height when scrolled to top with smooth animation
        setCollapsedBannerHeight(initialHeight);
      }
      
      lastScrollTop = scrollTop;
    };

    itemsGrid.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      itemsGrid.removeEventListener('scroll', handleScroll);
    };
  }, [selectedGame]);

  const responsiveSidebarWidth = useMemo(() => {
    const minWidth = 200;
    const maxWidth = 250;
    // Scale from 15% (at 1120px) to 25% (at larger windows)
    const scaleFactor = Math.min(0.25, Math.max(0.15, 0.15 + (windowWidth - 1120) * 0.0001));
    const calculatedWidth = windowWidth * scaleFactor;
    return Math.max(minWidth, Math.min(maxWidth, calculatedWidth));
  }, [windowWidth]);
  
  // Content width for smart resizing (similar to Store)
  const [contentWidth, setContentWidth] = useState(() => {
    // Default to 1020px (1280px min app width - 260px sidebar)
    return typeof window !== 'undefined' ? Math.max(1020, window.innerWidth - 260) : 1020;
  });
  
  useEffect(() => {
    const updateWindowSize = () => {
      setWindowWidth(window.innerWidth);
    };
    
    const updateContentWidth = () => {
      // Calculate available content width (window width - left sidebar - right sidebar)
      // Try to get left sidebar width from localStorage, fallback to 260
      let leftSidebarWidth = 260;
      try {
        const saved = localStorage.getItem('sidebarWidth');
        if (saved) leftSidebarWidth = parseInt(saved, 10);
      } catch (_) {}
      
      const rightSidebarWidth = marketRightSidebarWidth || 260;
      const newContentWidth = Math.max(1020, window.innerWidth - leftSidebarWidth - rightSidebarWidth);
      setContentWidth(newContentWidth);
    };
    
    updateWindowSize();
    updateContentWidth();
    window.addEventListener('resize', () => {
      updateWindowSize();
      updateContentWidth();
    });
    // Listen for sidebar resize events
    window.addEventListener('sidebar-resize', updateContentWidth);
    return () => {
      window.removeEventListener('resize', updateWindowSize);
      window.removeEventListener('resize', updateContentWidth);
      window.removeEventListener('sidebar-resize', updateContentWidth);
    };
  }, [marketRightSidebarWidth]);

  // Calculate banner height based on content width (maintain aspect ratio)
  // Use 20% of content width, clamped between 180px and 600px
  // Lower minimum allows banner to shrink more on smaller windows
  const bannerHeight = Math.max(180, Math.min(600, contentWidth * 0.20));

  // Calculate responsive sizes for sidebar elements - fixed sizes for buttons to avoid delay
  const sidebarStyles = React.useMemo(() => {
    // Badge width scales with sidebar width (12-20% of sidebar width, clamped between 40-80px)
    // Badge height is fixed at 30px
    const badgeWidth = Math.max(70, Math.min(80, marketRightSidebarWidth * 0.16));
    const badgeHeight = 30; // Fixed height
    return {
      // Title styles - fixed size
      titleFontSize: 24,
      titlePadding: {
        vertical: 20,
        horizontal: 20,
        bottom: 18
      },
      // Nav styles - fixed
      navPadding: 20,
      navGap: 26,
      // Main item styles - fixed sizes (no delay)
      mainItemFontSize: 14,
      mainItemPadding: {
        vertical: 12,
        horizontal: 20
      },
      mainItemIconSize: 18,
      // Section title styles - fixed
      sectionTitleFontSize: 10,
      sectionTitlePadding: {
        horizontal: 20,
        bottom: 6
      },
      // Nav item styles - fixed sizes (no delay)
      navItemFontSize: 14,
      navItemPadding: {
        vertical: 10,
        horizontal: 20
      },
      navItemGap: 10,
      navItemIconSize: 16,
      // Badge styles - rectangle, width scales with sidebar width, height is fixed
      badgeWidth: badgeWidth,
      badgeHeight: badgeHeight,
      badgePadding: 0, // No padding
      badgeFontSize: 11, // Fixed font size
      badgeBorderRadius: 0, // Square corners
      // Section padding - fixed
      sectionPaddingBottom: 13
    };
  }, [marketRightSidebarWidth]);

  // Auto-adjust sidebar width based on window size
  useEffect(() => {
    if (responsiveSidebarWidth) {
      setMarketRightSidebarWidth(prevWidth => {
        const newWidth = responsiveSidebarWidth;
        if (Math.abs(prevWidth - newWidth) > 0.1) {
          // Update localStorage asynchronously to avoid blocking
          setTimeout(() => {
            try {
              localStorage.setItem('marketRightSidebarWidth', newWidth.toString());
            } catch (_) {}
          }, 0);
          return newWidth;
        }
        return prevWidth;
      });
    }
  }, [windowWidth, responsiveSidebarWidth]);
  
  // Investments data loaded from account-separated storage
  const [investments] = useState(() => {
    try {
      return getUserData('marketInvestments', {});
    } catch (e) {
      return {};
    }
  });

  // Load all games with marketplace enabled from all users (for Market browse view)
  useEffect(() => {
    const loadCustomGames = async () => {
      try {
        // Get all games from all users for the Market (shared marketplace)
        const allGames = getAllUsersData('customGames');
        
        // Filter to only show published games with marketplace enabled
        const marketGames = allGames.filter(game => {
          const status = game.status || game.fullFormData?.status || 'draft';
          const marketEnabled = game.fullFormData?.marketEnabled !== false; // Default to true
          return (status === 'public' || status === 'published') && marketEnabled;
        });
        
        // Remove duplicates based on gameId (keep first occurrence)
        const uniqueGamesMap = new Map();
        marketGames.forEach(game => {
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
      } catch (e) {
        console.error('Error loading custom games:', e);
        setCustomGames([]);
      }
    };

    const loadWatchedGames = () => {
      try {
        const watched = getUserData('watchedGames', []);
        if (Array.isArray(watched)) {
          setWatchedGames(new Set(watched));
        }
      } catch (e) {
        console.error('Error loading watched games:', e);
      }
    };

    loadCustomGames();
    loadWatchedGames();
    const handleUpdate = () => loadCustomGames();
    window.addEventListener('customGameUpdate', handleUpdate);
    window.addEventListener('user-changed', loadCustomGames);
    
    return () => {
      window.removeEventListener('customGameUpdate', handleUpdate);
      window.removeEventListener('user-changed', loadCustomGames);
    };
  }, []);

  // State to store market data loaded from metadata.json
  const [marketDataCache, setMarketDataCache] = useState({});

  // Load market data from metadata.json files
  useEffect(() => {
    const loadMarketData = async () => {
      const cache = {};
      for (const game of customGames) {
        const gameId = game.gameId || game.id;
        if (!gameId) continue;
        
        try {
          if (window.electronAPI && window.electronAPI.getGameMetadata) {
            const result = await window.electronAPI.getGameMetadata(gameId);
            if (result.success && result.metadata) {
              cache[gameId] = {
                marketRank: result.metadata.marketRank || null,
                totalVolume: result.metadata.totalVolume || '$0',
                marketTrend: result.metadata.marketTrend || '+0%'
              };
            }
          }
        } catch (error) {
          console.error(`Error loading market data for ${gameId}:`, error);
          // Fallback to localStorage
          try {
            const marketKey = `market_${gameId}`;
            const localData = getUserData(marketKey, {});
            if (localData.marketRank || localData.totalVolume || localData.marketTrend) {
              cache[gameId] = localData;
            }
          } catch (_) {}
        }
      }
      setMarketDataCache(cache);
    };

    if (customGames.length > 0) {
      loadMarketData();
    }
  }, [customGames]);

  // Function to save market data to metadata.json
  const saveMarketDataToMetadata = async (gameId, marketData) => {
    try {
      if (window.electronAPI && window.electronAPI.getGameMetadata && window.electronAPI.saveGameMetadata) {
        // Get existing metadata
        const result = await window.electronAPI.getGameMetadata(gameId);
        if (result.success) {
          const metadata = result.metadata;
          // Update market data fields
          metadata.marketRank = marketData.marketRank ?? metadata.marketRank;
          metadata.totalVolume = marketData.totalVolume ?? metadata.totalVolume;
          metadata.marketTrend = marketData.marketTrend ?? metadata.marketTrend;
          // Save updated metadata
          await window.electronAPI.saveGameMetadata(gameId, metadata);
          // Update cache
          setMarketDataCache(prev => ({
            ...prev,
            [gameId]: {
              marketRank: metadata.marketRank,
              totalVolume: metadata.totalVolume,
              marketTrend: metadata.marketTrend
            }
          }));
        }
      }
    } catch (error) {
      console.error(`Error saving market data for ${gameId}:`, error);
    }
  };

  // Get all games with market settings (already filtered by published and marketEnabled)
  const allGamesData = React.useMemo(() => {
    // Custom games are already filtered to published + marketEnabled
    const customGamesData = customGames.map((game) => {
      const hasMarket = game.fullFormData?.marketEnabled !== false; // Default to true
      const gameId = game.gameId || game.id || `custom-${Date.now()}`;
      
      // Get market data from cache (loaded from metadata.json)
      const marketData = marketDataCache[gameId] || {};
      
      // Get petition data from petitions state
      const petitionData = petitions[gameId] || {};
      
      return {
        id: gameId,
        name: game.name || game.gameName || 'Untitled Game',
        icon: (game.name || game.gameName || 'G')?.charAt(0)?.toUpperCase() || 'G',
        image: game.banner || game.bannerImage || game.cardImage,
        logo: game.logo || game.gameLogo,
        installed: true,
        hasMarket,
        signatures: petitionData.signatures || marketData.signatures || 0,
        myToken: petitionData.myToken || marketData.myToken || null,
        isCustom: true,
        cardImage: game.card || game.cardImage || game.banner,
        marketRank: marketData.marketRank || null,
        totalVolume: marketData.totalVolume || '$0',
        marketTrend: marketData.marketTrend || '+0%'
      };
    });

    return [...customGamesData];
  }, [customGames, petitions, marketDataCache]);

  // Get games with markets and games without markets
  const gamesWithMarketsRaw = allGamesData.filter(g => g.hasMarket !== false);
  const gamesWithoutMarkets = allGamesData.filter(g => g.hasMarket === false);
  
  // Calculate ranks for browse view (by volume) - games with same stats get same rank
  const gamesWithMarkets = React.useMemo(() => {
    const sorted = [...gamesWithMarketsRaw].sort((a, b) => {
      const parseVolume = (volume) => {
        if (!volume || volume === '$0') return 0;
        const numStr = volume.replace(/[^0-9.]/g, '');
        return parseFloat(numStr) || 0;
      };
      return parseVolume(b.totalVolume) - parseVolume(a.totalVolume);
    });
    
    // Assign ranks dynamically - games with same stats get same rank, but first one gets better rank number
    let currentRank = 1;
    let previousValue = null;
    let firstInGroupIndex = 0;
    
    sorted.forEach((game, index) => {
      const parseVolume = (volume) => {
        if (!volume || volume === '$0') return 0;
        const numStr = volume.replace(/[^0-9.]/g, '');
        return parseFloat(numStr) || 0;
      };
      const currentValue = parseVolume(game.totalVolume);
      
      if (index === 0) {
        // First game always gets rank 1
        game.marketRank = 1;
        previousValue = currentValue;
        currentRank = 1;
        firstInGroupIndex = 0;
      } else if (currentValue === previousValue) {
        // Same value as previous - first in group has better rank, others get incrementing ranks
        // First game in group keeps its rank, others get rank based on position
        game.marketRank = sorted[firstInGroupIndex].marketRank + (index - firstInGroupIndex);
      } else {
        // New unique value - gets next rank (position in list)
        currentRank = index + 1;
        game.marketRank = currentRank;
        previousValue = currentValue;
        firstInGroupIndex = index;
      }
    });
    
    return sorted;
  }, [gamesWithMarketsRaw]);

  // Sort games by 24h trend for trending view
  const trendingGames = React.useMemo(() => {
    const sorted = [...gamesWithMarketsRaw].sort((a, b) => {
      const parseTrend = (trend) => {
        if (!trend || trend === '+0%') return 0;
        const match = trend.match(/[+-]?(\d+\.?\d*)/);
        return match ? parseFloat(match[0]) : 0;
      };
      return parseTrend(b.marketTrend) - parseTrend(a.marketTrend);
    });
    
    // Assign ranks dynamically - games with same stats get same rank, but first one gets better rank number
    let currentRank = 1;
    let previousValue = null;
    let firstInGroupIndex = 0;
    
    sorted.forEach((game, index) => {
      const parseTrend = (trend) => {
        if (!trend || trend === '+0%') return 0;
        const match = trend.match(/[+-]?(\d+\.?\d*)/);
        return match ? parseFloat(match[0]) : 0;
      };
      const currentValue = parseTrend(game.marketTrend);
      
      if (index === 0) {
        // First game always gets rank 1
        game.marketRank = 1;
        previousValue = currentValue;
        currentRank = 1;
        firstInGroupIndex = 0;
      } else if (currentValue === previousValue) {
        // Same value as previous - first in group has better rank, others get incrementing ranks
        // First game in group keeps its rank, others get rank based on position
        game.marketRank = sorted[firstInGroupIndex].marketRank + (index - firstInGroupIndex);
      } else {
        // New unique value - gets next rank (position in list)
        currentRank = index + 1;
        game.marketRank = currentRank;
        previousValue = currentValue;
        firstInGroupIndex = index;
      }
    });
    
    return sorted;
  }, [gamesWithMarketsRaw]);

  // Sort games by volume for top markets view
  const topMarketsGames = React.useMemo(() => {
    const sorted = [...gamesWithMarketsRaw].sort((a, b) => {
      const parseVolume = (volume) => {
        if (!volume || volume === '$0') return 0;
        const numStr = volume.replace(/[^0-9.]/g, '');
        return parseFloat(numStr) || 0;
      };
      return parseVolume(b.totalVolume) - parseVolume(a.totalVolume);
    });
    
    // Assign ranks dynamically - games with same stats get same rank, but first one gets better rank number
    let currentRank = 1;
    let previousValue = null;
    let firstInGroupIndex = 0;
    
    sorted.forEach((game, index) => {
      const parseVolume = (volume) => {
        if (!volume || volume === '$0') return 0;
        const numStr = volume.replace(/[^0-9.]/g, '');
        return parseFloat(numStr) || 0;
      };
      const currentValue = parseVolume(game.totalVolume);
      
      if (index === 0) {
        // First game always gets rank 1
        game.marketRank = 1;
        previousValue = currentValue;
        currentRank = 1;
        firstInGroupIndex = 0;
      } else if (currentValue === previousValue) {
        // Same value as previous - first in group has better rank, others get incrementing ranks
        // First game in group keeps its rank, others get rank based on position
        game.marketRank = sorted[firstInGroupIndex].marketRank + (index - firstInGroupIndex);
      } else {
        // New unique value - gets next rank (position in list)
        currentRank = index + 1;
        game.marketRank = currentRank;
        previousValue = currentValue;
        firstInGroupIndex = index;
      }
    });
    
    return sorted;
  }, [gamesWithMarketsRaw]);

  // Auto-select game based on URL parameter
  useEffect(() => {
    if (!gameId) {
      setSelectedGame(null);
      return;
    }

    // Find game in computed list (custom games only)
    const match = allGamesData.find(g => String(g.id) === String(gameId));
    if (match) {
      setSelectedGame(match);
    }
  }, [gameId, allGamesData]);

  // Load market items from account-separated storage
  const marketItems = React.useMemo(() => {
    if (!selectedGame) return [];
    
    try {
      return getUserData(`marketItems_${selectedGame.id}`, []);
    } catch (_) {
      return [];
    }
  }, [selectedGame, marketItemsRefresh]);

  // Calculate market statistics from account-separated storage
  const marketStats = React.useMemo(() => {
    try {
      const transactions = getUserData('marketTransactions', []);
      const investmentKeys = Object.keys(investments);
      const totalTraded = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
      const totalProfit = transactions.reduce((sum, t) => sum + (t.profit || 0), 0);
      const totalInvested = investmentKeys.reduce((sum, key) => sum + (investments[key]?.invested || 0), 0);
      const investmentReturns = investmentKeys.reduce((sum, key) => sum + (investments[key]?.returns || 0), 0);
      const avgReturn = totalInvested > 0 ? (investmentReturns / totalInvested * 100) : 0;
      const netWorth = totalTraded + investmentReturns;
      const bestTrade = Math.max(...transactions.map(t => t.profitPercent || 0), 0);
      
      return {
        totalProfit,
        totalTraded,
        transactions: transactions.length,
        avgPrice: transactions.length > 0 ? (totalTraded / transactions.length) : 0,
        activeInvestments: investmentKeys.length,
        investmentReturns,
        totalInvested,
        avgReturn,
        successRate: transactions.length > 0 ? (transactions.filter(t => t.profit > 0).length / transactions.length * 100) : 0,
        roi: totalInvested > 0 ? ((investmentReturns / totalInvested) * 100) : 0,
        netWorth,
        bestTrade
      };
    } catch (_) {
      return {
        totalProfit: 0,
        totalTraded: 0,
        transactions: 0,
        avgPrice: 0,
        activeInvestments: 0,
        investmentReturns: 0,
        totalInvested: 0,
        avgReturn: 0,
        successRate: 0,
        roi: 0,
        netWorth: 0,
        bestTrade: 0
      };
    }
  }, [investments]);

  // Handler functions
  const handleTabChange = (tab) => {
    setSelectedTab(tab);
  };

  const handleSortChange = (sort) => {
    setSortBy(sort);
  };

  const handleRarityFilter = (rarity) => {
    setRarityFilter(rarity);
  };

  const handleSellItem = () => {
    setShowSellModal(true);
    setSellStep(1);
    setSelectedItems([]);
    setItemPrices({});
  };

  const handlePriceChange = (itemId, value, currentValue) => {
    // Allow empty input
    if (value === '') {
      setItemPrices(prev => ({
        ...prev,
        [itemId]: ''
      }));
      return;
    }
    
    // Allow only numbers and decimal point
    if (!/^\d*\.?\d*$/.test(value)) {
      return;
    }
    
    const numValue = parseFloat(value) || 0;
    
    // Limit max price to 1 million
    if (numValue > 1000000) {
      setItemPrices(prev => ({
        ...prev,
        [itemId]: 1000000
      }));
      return;
    }
    
    // Limit to 2 decimal places
    const roundedValue = Math.round(numValue * 100) / 100;
    
    // Update with actual typed value (not rounded) for better UX while typing
    setItemPrices(prev => ({
      ...prev,
      [itemId]: value
    }));
  };

  const handleQuickBuy = () => {
    setShowQuickBuyModal(true);
  };

  const handleItemSelect = (item) => {
    const isSelected = selectedItems.some(i => 
      i.id === item.id && i.gameId === item.gameId
    );
    if (isSelected) {
      setSelectedItems(selectedItems.filter(i => 
        !(i.id === item.id && i.gameId === item.gameId)
      ));
    } else {
      setSelectedItems([...selectedItems, item]);
    }
  };

  const handleAddToComparison = (item, e) => {
    e.stopPropagation();
    if (comparisonItems.some(i => i.id === item.id)) {
      setComparisonItems(comparisonItems.filter(i => i.id !== item.id));
    } else {
      if (comparisonItems.length >= 8) {
        alert('Maximum 8 items can be compared at once');
        return;
      }
      const newComparisonItems = [...comparisonItems, item];
      setComparisonItems(newComparisonItems);
      
      // Auto-open modal when 2 items are selected (only if not manually closed)
      if (newComparisonItems.length === 2 && !comparisonModalManuallyClosed) {
        setShowComparisonModal(true);
        setComparisonModalAutoOpened(true);
      }
    }
  };

  const handleRemoveFromComparison = (itemId) => {
    const newItems = comparisonItems.filter(i => i.id !== itemId);
    setComparisonItems(newItems);
    // If removed item was reference, set new reference
    if (referenceItemId === itemId && newItems.length > 0) {
      setReferenceItemId(newItems[0].id);
    } else if (newItems.length === 0) {
      // Only clear reference if no items remain
      setReferenceItemId(null);
    }
    // Don't close modal - let user stay in comparison view
    // Clean up rotations/zooms for removed item
    setComparisonRotations(prev => {
      const updated = { ...prev };
      delete updated[itemId];
      return updated;
    });
    setComparisonZooms(prev => {
      const updated = { ...prev };
      delete updated[itemId];
      return updated;
    });
    setComparisonPans(prev => {
      const updated = { ...prev };
      delete updated[itemId];
      return updated;
    });
  };

  const handleClearComparison = () => {
    setComparisonItems([]);
    setShowComparisonModal(false);
    setComparisonModalAutoOpened(false);
    setComparisonModalManuallyClosed(false);
    setReferenceItemId(null);
    setComparisonRotations({});
    setComparisonZooms({});
    setComparisonPans({});
  };

  // Auto-open comparison modal when 2 items are selected (only if not manually closed)
  useEffect(() => {
    if (comparisonItems.length >= 2 && !comparisonModalManuallyClosed && !showComparisonModal) {
      setShowComparisonModal(true);
      setComparisonModalAutoOpened(true);
    }
    // Don't auto-close when items are removed - let user stay in comparison view
  }, [comparisonItems.length, comparisonModalManuallyClosed, showComparisonModal]);

  // Set first item as reference when modal opens
  useEffect(() => {
    if (showComparisonModal && comparisonItems.length > 0 && !referenceItemId) {
      setReferenceItemId(comparisonItems[0].id);
    }
  }, [showComparisonModal, comparisonItems.length]);

  // Initialize rotations and zooms for new items
  useEffect(() => {
    comparisonItems.forEach(item => {
      if (!comparisonRotations[item.id]) {
        setComparisonRotations(prev => ({
          ...prev,
          [item.id]: { x: 0, y: 0, z: 0 }
        }));
      }
      if (!comparisonZooms[item.id]) {
        setComparisonZooms(prev => ({
          ...prev,
          [item.id]: 1
        }));
      }
      if (!comparisonPans[item.id]) {
        setComparisonPans(prev => ({
          ...prev,
          [item.id]: { x: 0, y: 0 }
        }));
      }
    });
  }, [comparisonItems]);

  // Reset 3D view when switching view modes
  useEffect(() => {
    if (!showComparisonModal) return;
    
    // Set resetting flag for smooth transition
    const resettingFlags = {};
    comparisonItems.forEach(item => {
      resettingFlags[item.id] = true;
    });
    setComparisonIsResetting(resettingFlags);
    
    // Reset all rotations, zooms, and pans when view mode changes
    const resetValues = {};
    comparisonItems.forEach(item => {
      resetValues[item.id] = { x: 0, y: 0, z: 0 };
    });
    setComparisonRotations(resetValues);
    
    const resetZooms = {};
    comparisonItems.forEach(item => {
      resetZooms[item.id] = 1;
    });
    setComparisonZooms(resetZooms);
    
    const resetPans = {};
    comparisonItems.forEach(item => {
      resetPans[item.id] = { x: 0, y: 0 };
    });
    setComparisonPans(resetPans);
    
    // Reset the flags after animation completes
    setTimeout(() => {
      const clearedFlags = {};
      comparisonItems.forEach(item => {
        clearedFlags[item.id] = false;
      });
      setComparisonIsResetting(clearedFlags);
    }, 600);
  }, [comparisonViewMode, showComparisonModal, comparisonItems]);

  // Memoize reference item to avoid repeated finds
  const referenceItem = useMemo(() => {
    if (!referenceItemId) return null;
    return comparisonItems.find(i => i.id === referenceItemId) || null;
  }, [referenceItemId, comparisonItems]);

  // Memoize difference calculations for all items
  const itemDifferences = useMemo(() => {
    if (!referenceItem) return {};
    
    const differences = {};
    comparisonItems.forEach(item => {
      if (item.id === referenceItemId) return;
      
      const itemDiffs = [];
      if (item.price !== referenceItem.price) itemDiffs.push('price');
      if (item.rarity !== referenceItem.rarity) itemDiffs.push('rarity');
      if (item.type !== referenceItem.type) itemDiffs.push('type');
      
      differences[item.id] = itemDiffs.length > 0 ? 'rgba(255, 193, 7, 0.4)' : null;
    });
    
    return differences;
  }, [referenceItem, referenceItemId, comparisonItems]);

  // Get difference color for an item (now just a lookup)
  const getDifferenceColor = useCallback((item) => {
    return itemDifferences[item.id] || null;
  }, [itemDifferences]);

  const hasDifferent3DView = useCallback((item) => {
    if (!referenceItem || item.id === referenceItemId) return false;
    
    // Compare 3D view (imageUrl or image/icon)
    const itemImage = item.imageUrl || item.image;
    const referenceImage = referenceItem.imageUrl || referenceItem.image;
    
    return itemImage !== referenceImage;
  }, [referenceItem, referenceItemId]);

  // Normalize rotation to -180 to 180 range for shortest path in CSS transitions
  const normalizeRotation = (rotation) => {
    if (rotation === undefined || rotation === null) return 0;
    rotation = rotation % 360;
    if (rotation > 180) {
      rotation = rotation - 360;
    } else if (rotation < -180) {
      rotation = rotation + 360;
    }
    return rotation;
  };

  // Update comparison rotation for an item
  const updateComparisonRotation = (itemId, axis, delta) => {
    setComparisonRotations(prev => {
      const current = prev[itemId] || { x: 0, y: 0, z: 0 };
      const newValue = current[axis] + delta;
      const wrapped = ((newValue % 360) + 360) % 360;
      return {
        ...prev,
        [itemId]: {
          ...current,
          [axis]: wrapped
        }
      };
    });
  };

  // Update comparison zoom for an item - using same logic as item detail modal
  const updateComparisonZoom = (itemId, delta) => {
    setComparisonZooms(prev => {
      const current = prev[itemId] || 1;
      return {
        ...prev,
        [itemId]: Math.max(0.5, Math.min(2, current + delta))
      };
    });
  };

  // Mouse rotation and panning handlers for comparison items - exact copy from item detail modal
  useEffect(() => {
    if (!showComparisonModal) return;
    // Only set up listeners if 3D view is visible
    if (comparisonViewMode !== '3d' && comparisonViewMode !== 'both') return;

    const cleanupFunctions = [];
    
    comparisonItems.forEach(item => {
      const container = comparison3dRefs.current[item.id];
      if (!container) return;

      let rotating = false;
      let panning = false;
      let lastX = 0;
      let lastY = 0;

      // Don't wrap rotation during interaction - let it accumulate continuously
      // Normalize only for display to prevent unnecessary 360° flips
      const normalizeRotation = (rotation) => {
        rotation = rotation % 360;
        if (rotation > 180) {
          rotation = rotation - 360;
        } else if (rotation < -180) {
          rotation = rotation + 360;
        }
        return rotation;
      };

      const maxPanX = 400;
      const maxPanYUp = 120;
      const maxPanYDown = 100;

      const isOverControls = (target) => {
        return target.closest('.item-3d-controls') || 
               target.closest('.item-3d-btn') ||
               target.closest('.comparison-reference-checkbox');
      };

      const handleDoubleClick = (e) => {
        if (isOverControls(e.target)) return;
        if (!(e.target.closest('.item-3d-model-wrapper') || e.target === container || e.target.closest('.item-3d-image') || e.target.closest('.item-3d-placeholder'))) return;

        // Set resetting flag for smooth transition
        setComparisonIsResetting(prev => ({ ...prev, [item.id]: true }));
        
        setComparisonRotations(prev => ({ ...prev, [item.id]: { x: 0, y: 0, z: 0 } }));
        setComparisonZooms(prev => ({ ...prev, [item.id]: 1 }));
        setComparisonPans(prev => ({ ...prev, [item.id]: { x: 0, y: 0 } }));
        
        // Reset the flag after animation completes
        setTimeout(() => {
          setComparisonIsResetting(prev => ({ ...prev, [item.id]: false }));
        }, 600);
      };

      const handleMouseDown = (e) => {
        if (isOverControls(e.target)) return;
        if (!(e.target.closest('.item-3d-model-wrapper') || e.target === container || e.target.closest('.item-3d-image') || e.target.closest('.item-3d-placeholder'))) return;

        if (e.button === 0) {
          lastX = e.clientX;
          lastY = e.clientY;
          
          if (e.shiftKey) {
            panning = true;
            setComparisonIsPanning(prev => ({ ...prev, [item.id]: true }));
          } else {
            rotating = true;
            setComparisonIsRotating(prev => ({ ...prev, [item.id]: true }));
          }
        }
      };

      const handleMouseMove = (e) => {
        if (rotating) {
          const deltaX = e.clientX - lastX;
          const deltaY = e.clientY - lastY;
          
          setComparisonRotations(prev => {
            const current = prev[item.id] || { x: 0, y: 0, z: 0 };
            return {
              ...prev,
              [item.id]: {
                x: current.x - deltaY * 0.5,
                y: current.y + deltaX * 0.5,
                z: current.z
              }
            };
          });
          
          lastX = e.clientX;
          lastY = e.clientY;
        } else if (panning) {
          const deltaX = e.clientX - lastX;
          const deltaY = e.clientY - lastY;
          
          setComparisonPans(prev => {
            const current = prev[item.id] || { x: 0, y: 0 };
            return {
              ...prev,
              [item.id]: {
                x: Math.max(-maxPanX, Math.min(maxPanX, current.x + deltaX)),
                y: Math.max(-maxPanYUp, Math.min(maxPanYDown, current.y + deltaY))
              }
            };
          });
          
          lastX = e.clientX;
          lastY = e.clientY;
        }
      };

      const handleMouseUp = () => {
        rotating = false;
        panning = false;
        setComparisonIsRotating(prev => ({ ...prev, [item.id]: false }));
        setComparisonIsPanning(prev => ({ ...prev, [item.id]: false }));
      };

      const handleWheel = (e) => {
        if (isOverControls(e.target)) return;
        if (!(e.target.closest('.item-3d-model-wrapper') || e.target === container || e.target.closest('.item-3d-image') || e.target.closest('.item-3d-placeholder'))) return;

        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setComparisonZooms(prev => {
          const current = prev[item.id] || 1;
          return {
            ...prev,
            [item.id]: Math.max(0.5, Math.min(2, current + delta))
          };
        });
      };

      // Check if mouse is over controls for cursor styling
      const handleMouseMoveCheck = (e) => {
        if (isOverControls(e.target)) {
          container.style.cursor = 'default';
        } else if (e.target.closest('.item-3d-model-wrapper') || e.target === container || e.target.closest('.item-3d-image') || e.target.closest('.item-3d-placeholder')) {
          if (e.shiftKey) {
            container.style.cursor = 'move';
          } else {
            container.style.cursor = 'grab';
          }
        } else {
          container.style.cursor = 'default';
        }
      };

      container.addEventListener('dblclick', handleDoubleClick);
      container.addEventListener('mousedown', handleMouseDown);
      container.addEventListener('mousemove', handleMouseMoveCheck);
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      container.addEventListener('wheel', handleWheel, { passive: false });

      cleanupFunctions.push(() => {
        container.removeEventListener('dblclick', handleDoubleClick);
        container.removeEventListener('mousedown', handleMouseDown);
        container.removeEventListener('mousemove', handleMouseMoveCheck);
        container.removeEventListener('wheel', handleWheel);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        container.style.cursor = '';
      });
    });

    return () => {
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }, [showComparisonModal, comparisonItems, comparisonViewMode]);

  // Format listedAt timestamp to "time ago" format
  const formatListedAt = (timestamp) => {
    if (!timestamp) return 'Listed recently';
    try {
      const listedDate = new Date(timestamp);
      if (isNaN(listedDate.getTime())) return 'Listed recently';
      
      const now = Date.now();
      const diffMs = now - timestamp;
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHours = Math.floor(diffMin / 60);
      const diffDays = Math.floor(diffHours / 24);
      
      if (diffSec < 60) return 'just now';
      if (diffMin < 60) return `${diffMin}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const day = listedDate.getDate();
      const month = monthNames[listedDate.getMonth()];
      const year = listedDate.getFullYear();
      const currentYear = new Date().getFullYear();
      
      if (year === currentYear) return `${day} ${month}`;
      return `${day} ${month} ${year}`;
    } catch (_) {
      return 'Listed recently';
    }
  };

  const handleConfirmItems = () => {
    if (selectedItems.length > 0) {
      // Initialize prices with market prices
      const initialPrices = {};
      selectedItems.forEach(item => {
        initialPrices[item.id] = item.marketPrice;
      });
      setItemPrices(initialPrices);
      setSellStep(2);
    }
  };

  const handleCancelSell = () => {
    setShowSellModal(false);
    setSellStep(1);
    setSelectedItems([]);
  };

  const handleBuyItem = (itemId) => {
    alert(`Buying item ${itemId} for ${selectedGame.name}`);
  };

  const handleWatchItem = (itemId) => {
    const newWatchedItems = new Set(watchedItems);
    if (newWatchedItems.has(itemId)) {
      newWatchedItems.delete(itemId);
    } else {
      newWatchedItems.add(itemId);
    }
    setWatchedItems(newWatchedItems);
  };

  const handleBackToGames = () => {
    if (gameId) {
      // Navigate back to the specific game page
      navigate(`/game/${gameId}`);
    } else {
      // Navigate to general market
      setSelectedGame(null);
    }
  };

  const handlePetitionSign = (gameId) => {
    setPetitions(prev => {
      const game = prev[gameId] || {};
      
      if (game.myToken) {
        // User already signed, show message
        alert('You have already signed this petition!');
        return prev;
      }
      
      // Add signature
      const updated = {
        ...prev,
        [gameId]: {
          ...game,
          signatures: (game.signatures || 0) + 1,
          myToken: true
        }
      };
      
      // Save to account-separated storage
      try {
        saveUserData('marketPetitions', updated);
      } catch (e) {
        console.error('Error saving petitions:', e);
      }
      
      return updated;
    });
  };

  const handleWatchGame = (gameId, e) => {
    e.stopPropagation();
    const newWatched = new Set(watchedGames);
    if (newWatched.has(gameId)) {
      newWatched.delete(gameId);
    } else {
      newWatched.add(gameId);
    }
    setWatchedGames(newWatched);
    saveUserData('watchedGames', Array.from(newWatched));
  };

  const handleCreatePetition = () => {
    if (!selectedPetitionGame) return;
    
    setPetitions(prev => {
      const updated = {
        ...prev,
        [selectedPetitionGame.id]: {
          signatures: 1,
          myToken: true,
          createdAt: Date.now()
        }
      };
      
      try {
        saveUserData('marketPetitions', updated);
      } catch (e) {
        console.error('Error saving petitions:', e);
      }
      
      return updated;
    });
    
    setShowCreatePetitionForm(false);
    setSelectedPetitionGame(null);
    setPetitionSearchQuery('');
  };


  // Get all games for petition creation (only games without markets)
  const allGamesForPetition = React.useMemo(() => {
    return customGames.filter(game => {
      const hasMarket = game.fullFormData?.marketEnabled !== false;
      if (hasMarket) return false; // Only show games without markets
      
      const name = (game.name || game.gameName || '').toLowerCase();
      const query = petitionSearchQuery.toLowerCase();
      const gameId = game.gameId || game.id;
      // Don't show games that already have petitions
      const hasPetition = petitions[gameId];
      return (query === '' || name.includes(query)) && !hasPetition;
    }).map(game => ({
      ...game,
      id: game.gameId || game.id
    }));
  }, [customGames, petitionSearchQuery, petitions]);

  // Filter and sort items - must be called before any early returns
  const filteredItems = useMemo(() => {
    return marketItems.filter(item => {
      // Rarity filter
      const rarityMatch = rarityFilter === 'all' || item.rarity.toLowerCase() === rarityFilter.toLowerCase();
      
      // Search filter
      const searchMatch = !itemSearch || item.name.toLowerCase().includes(itemSearch.toLowerCase()) || 
                          (item.seller && item.seller.toLowerCase().includes(itemSearch.toLowerCase()));
      
      // Price filter
      let priceMatch = true;
      if (priceFilter !== 'all') {
        const price = item.price || 0;
        switch (priceFilter) {
          case 'under-10': priceMatch = price < 10; break;
          case '10-50': priceMatch = price >= 10 && price <= 50; break;
          case '50-100': priceMatch = price > 50 && price <= 100; break;
          case 'over-100': priceMatch = price > 100; break;
          default: priceMatch = true;
        }
      }
      
      return rarityMatch && searchMatch && priceMatch;
    });
  }, [marketItems, rarityFilter, itemSearch, priceFilter]);

  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      switch (sortBy) {
        case 'price-low': return a.price - b.price;
        case 'price-high': return b.price - a.price;
        case 'name-asc': return (a.name || '').localeCompare(b.name || '');
        case 'name-desc': return (b.name || '').localeCompare(a.name || '');
        case 'newest': return new Date(b.listedAt || 0) - new Date(a.listedAt || 0);
        case 'oldest': return new Date(a.listedAt || 0) - new Date(b.listedAt || 0);
        default: return 0;
      }
    });
  }, [filteredItems, sortBy]);

  // If no game is selected, show game selection
  if (!selectedGame) {
    return (
      <div className="market">
        <div className="market-main-container">
        {/* Main Content Area */}
        <div className="marketplace-content">
          {/* Live Activity Ticker - Always at top (except browse) */}
          {marketView !== 'browse' && (
            <div 
              className="marketplace-ticker"
              style={{ '--content-width': `${contentWidth}px` }}
            >
              <div className="ticker-label">
                <Zap size={14} />
                <span>Live Activity</span>
            </div>
              <div className="ticker-content">
                <div className="ticker-item">
                  <span className="ticker-user">Player123</span>
                  <span className="ticker-action">bought</span>
                  <span className="ticker-item-name">Legendary Sword</span>
                  <span className="ticker-price">for $45.99</span>
            </div>
                <div className="ticker-item">
                  <span className="ticker-user">TraderPro</span>
                  <span className="ticker-action">listed</span>
                  <span className="ticker-item-name">Rare Armor Set</span>
                  <span className="ticker-price">at $89.50</span>
            </div>
                <div className="ticker-item">
                  <span className="ticker-user">Collector2024</span>
                  <span className="ticker-action">sold</span>
                  <span className="ticker-item-name">Epic Shield</span>
                  <span className="ticker-price">for $120.00</span>
            </div>
          </div>
            </div>
          )}

          {/* Stats View */}
          {marketView === 'stats' && (
          <>
            {/* Marketplace Hero Section */}
            <div 
              className="marketplace-hero"
              style={{ 
                '--content-width': `${contentWidth}px`,
                '--banner-height': `${bannerHeight}px`,
                height: `${bannerHeight}px`
              }}
            >
              <div className="marketplace-hero-content">
                <div className="marketplace-hero-left">
                  <h1 className="marketplace-hero-title">Trading Performance</h1>
                  <p className="marketplace-hero-subtitle">Track your market activity, investments, and trading statistics.</p>
                </div>
              </div>
            </div>
            
            <div 
              className="marketplace-stats-view"
              style={{ '--content-width': `${contentWidth}px` }}
            >
            
            {/* Performance Overview */}
            <div className="stats-overview-section">
              <h3 className="stats-section-title">Performance</h3>
              <div className="stats-overview-grid">
                <div className="stat-overview-item">
                  <div className="stat-overview-label">Total Profit</div>
                  <div className={`stat-overview-value ${marketStats.totalProfit >= 0 ? 'positive' : 'negative'}`}>
                    {marketStats.totalProfit >= 0 ? '+' : ''}${marketStats.totalProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
                  <div className="stat-overview-meta">
                    {marketStats.totalTraded > 0 ? `${((Math.abs(marketStats.totalProfit) / marketStats.totalTraded) * 100).toFixed(1)}%` : '0%'} of total traded
            </div>
          </div>

                <div className="stat-overview-item">
                  <div className="stat-overview-label">Net Worth</div>
                  <div className="stat-overview-value">
                    ${marketStats.netWorth.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
                  <div className="stat-overview-meta">
                    {marketStats.totalInvested > 0 ? (
                      <>
                        {marketStats.netWorth >= marketStats.totalInvested ? '+' : ''}
                        {((marketStats.netWorth / marketStats.totalInvested - 1) * 100).toFixed(1)}% from investments
                      </>
                    ) : (
                      'No investments'
                    )}
            </div>
                </div>

                <div className="stat-overview-item">
                  <div className="stat-overview-label">ROI</div>
                  <div className={`stat-overview-value ${marketStats.roi >= 0 ? 'positive' : 'negative'}`}>
                {marketStats.roi >= 0 ? '+' : ''}{marketStats.roi.toFixed(1)}%
            </div>
                  <div className="stat-overview-meta">
                    {marketStats.totalInvested > 0 ? (
                      <>${marketStats.investmentReturns.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} returns</>
                    ) : (
                      'No investments'
                    )}
                  </div>
                </div>

                <div className="stat-overview-item">
                  <div className="stat-overview-label">Success Rate</div>
                  <div className={`stat-overview-value ${marketStats.successRate >= 50 ? 'positive' : ''}`}>
                    {marketStats.successRate.toFixed(1)}%
                  </div>
                  <div className="stat-overview-meta">
                    {marketStats.transactions} transaction{marketStats.transactions !== 1 ? 's' : ''}
                  </div>
            </div>
          </div>
        </div>

            {/* Trading Activity */}
            <div className="stats-overview-section">
              <h3 className="stats-section-title">Trading Activity</h3>
              <div className="stats-details-grid">
                <div className="stat-detail-item">
                  <div className="stat-detail-label">Total Traded</div>
                  <div className="stat-detail-value">${marketStats.totalTraded.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>

                <div className="stat-detail-item">
                  <div className="stat-detail-label">Transactions</div>
                  <div className="stat-detail-value">{marketStats.transactions.toLocaleString()}</div>
        </div>

                <div className="stat-detail-item">
                  <div className="stat-detail-label">Average Price</div>
                  <div className="stat-detail-value">${marketStats.avgPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>

                <div className="stat-detail-item">
                  <div className="stat-detail-label">Best Trade</div>
                  <div className={`stat-detail-value ${marketStats.bestTrade >= 0 ? 'positive' : 'negative'}`}>
                    {marketStats.bestTrade >= 0 ? '+' : ''}{marketStats.bestTrade.toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>

            {/* Investments */}
            <div className="stats-overview-section">
              <h3 className="stats-section-title">Investments</h3>
              <div className="stats-details-grid">
                <div className="stat-detail-item">
                  <div className="stat-detail-label">Total Invested</div>
                  <div className="stat-detail-value">${marketStats.totalInvested.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>

                <div className="stat-detail-item">
                  <div className="stat-detail-label">Active Investments</div>
                  <div className="stat-detail-value">{marketStats.activeInvestments}</div>
                </div>

                <div className="stat-detail-item">
                  <div className="stat-detail-label">Investment Returns</div>
                  <div className={`stat-detail-value ${marketStats.investmentReturns >= 0 ? 'positive' : 'negative'}`}>
                    {marketStats.investmentReturns >= 0 ? '+' : ''}${marketStats.investmentReturns.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="stat-detail-item">
                  <div className="stat-detail-label">Average Return</div>
                  <div className={`stat-detail-value ${marketStats.avgReturn >= 0 ? 'positive' : 'negative'}`}>
                    {marketStats.avgReturn >= 0 ? '+' : ''}{marketStats.avgReturn.toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
          </div>
          </>
        )}

        {/* Watchlist Section */}
        {marketView === 'favorites' && watchedGames.size > 0 ? (
          <>
            {/* Marketplace Hero Section */}
            <div 
              className="marketplace-hero"
              style={{ 
                '--content-width': `${contentWidth}px`,
                '--banner-height': `${bannerHeight}px`,
                height: `${bannerHeight}px`
              }}
            >
              <div className="marketplace-hero-content">
                <div className="marketplace-hero-left">
                  <h1 className="marketplace-hero-title">Tracked Markets</h1>
                  <p className="marketplace-hero-subtitle">Monitor {watchedGames.size} {watchedGames.size === 1 ? 'market' : 'markets'} for price trends and analytics.</p>
                </div>
              </div>
            </div>
            
            <div 
              className="watchlist-container"
              style={{ '--content-width': `${contentWidth}px` }}
            >
            
            <div className="watchlist-grid">
              {[...watchedGames].map(gameId => {
                const game = gamesWithMarkets.find(g => g.id === gameId);
                if (!game) return null;
                const isExpanded = expandedCards.has(game.id);
                return (
                  <div 
                    key={game.id} 
                    className={`watchlist-card ${isExpanded ? 'expanded' : ''}`}
                  >
                    <div className="watchlist-card-header" onClick={() => {
                      const newExpanded = new Set(expandedCards);
                      if (newExpanded.has(game.id)) {
                        newExpanded.delete(game.id);
                      } else {
                        newExpanded.add(game.id);
                      }
                      setExpandedCards(newExpanded);
                    }}>
                      <div className="watchlist-card-image">
                        <img 
                          src={game.image || game.cardImage || game.banner} 
                          alt={game.name}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                        <div className="watchlist-card-image-placeholder" style={{ display: game.image || game.cardImage || game.banner ? 'none' : 'flex' }}>
                          <div className="watchlist-card-icon">{game.icon}</div>
                        </div>
                      </div>
                      <div className="watchlist-card-info">
                        <h3 className="watchlist-card-title">{game.name}</h3>
                        <div className="watchlist-card-meta">
                          <span className="watchlist-rank">#{game.marketRank || 1}</span>
                          <span className="watchlist-divider">•</span>
                          <span className="watchlist-volume">{game.totalVolume || '$0'}</span>
                          <span className="watchlist-divider">•</span>
                          <span className={`watchlist-trend ${game.marketTrend?.startsWith('+') ? 'positive' : 'negative'}`}>
                            {game.marketTrend || '+0%'}
                          </span>
                        </div>
                      </div>
                      <div className="watchlist-card-actions">
                        {investments[game.id] && (
                          <span className="watchlist-investment-badge" title={`Invested: $${investments[game.id].amount}`}>
                            <DollarSign size={14} />
                          </span>
                        )}
                        <button 
                          className="watchlist-remove-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleWatchGame(game.id, e);
                          }}
                          title="Remove from watchlist"
                        >
                          <Eye size={16} strokeWidth={2} />
                        </button>
                        <div className={`watchlist-expand-icon ${isExpanded ? 'expanded' : ''}`}>
                          <ArrowDownRight size={16} />
                        </div>
                      </div>
                    </div>
                    
                    <div className={`watchlist-card-content ${isExpanded ? 'expanded' : ''}`}>
                      <div className="watchlist-chart-section">
                        <div className="watchlist-chart-header">
                          <div className="watchlist-chart-header-left">
                            <span className="watchlist-chart-title">7-Day Price Trend</span>
                            <div className="watchlist-chart-price-info">
                              <span className="watchlist-chart-current-price">$45.23</span>
                              <span className="watchlist-chart-change positive">+2.34%</span>
                            </div>
                          </div>
                          <div className="watchlist-chart-header-right">
                            <div className="watchlist-chart-stats">
                              <div className="watchlist-chart-stat">
                                <span className="watchlist-chart-stat-label">High</span>
                                <span className="watchlist-chart-stat-value">$48.50</span>
                              </div>
                              <div className="watchlist-chart-stat">
                                <span className="watchlist-chart-stat-label">Low</span>
                                <span className="watchlist-chart-stat-value">$42.10</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="watchlist-chart-container">
                          <div className="watchlist-chart-y-axis">
                            <span className="watchlist-chart-y-label">$50</span>
                            <span className="watchlist-chart-y-label">$45</span>
                            <span className="watchlist-chart-y-label">$40</span>
                            <span className="watchlist-chart-y-label">$35</span>
                          </div>
                          <div className="watchlist-chart-main">
                            <svg className="watchlist-line-chart" viewBox="0 0 400 120" preserveAspectRatio="xMidYMid meet">
                              <defs>
                                <linearGradient id={`watchlist-gradient-${game.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                                  <stop offset="0%" style={{ stopColor: '#4a9eff', stopOpacity: 0.2 }} />
                                  <stop offset="100%" style={{ stopColor: '#4a9eff', stopOpacity: 0 }} />
                                </linearGradient>
                                <filter id={`watchlist-glow-${game.id}`}>
                                  <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                                  <feMerge>
                                    <feMergeNode in="coloredBlur"/>
                                    <feMergeNode in="SourceGraphic"/>
                                  </feMerge>
                                </filter>
                              </defs>
                              {/* Grid lines */}
                              <line x1="0" y1="20" x2="400" y2="20" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="1" />
                              <line x1="0" y1="40" x2="400" y2="40" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="1" />
                              <line x1="0" y1="60" x2="400" y2="60" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="1" />
                              <line x1="0" y1="80" x2="400" y2="80" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="1" />
                              <line x1="0" y1="100" x2="400" y2="100" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="1" />
                              {/* Vertical grid lines */}
                              <line x1="100" y1="0" x2="100" y2="120" stroke="rgba(255, 255, 255, 0.03)" strokeWidth="1" />
                              <line x1="200" y1="0" x2="200" y2="120" stroke="rgba(255, 255, 255, 0.03)" strokeWidth="1" />
                              <line x1="300" y1="0" x2="300" y2="120" stroke="rgba(255, 255, 255, 0.03)" strokeWidth="1" />
                              {/* Filled area under the line */}
                              <path
                                d="M 0 120 L 0 85 Q 50 70, 100 55 T 200 60 T 300 55 T 400 45 L 400 120 Z"
                                fill={`url(#watchlist-gradient-${game.id})`}
                              />
                              {/* Main price line */}
                              <path
                                d="M 0 85 Q 50 70, 100 55 T 200 60 T 300 55 T 400 45"
                                fill="none"
                                stroke="#4a9eff"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                filter={`url(#watchlist-glow-${game.id})`}
                              />
                              {/* Current price indicator */}
                              <circle cx="400" cy="45" r="4" fill="#4a9eff" />
                              <circle cx="400" cy="45" r="6" fill="#4a9eff" opacity="0.3" />
                            </svg>
                          </div>
                          <div className="watchlist-chart-x-axis">
                            <span className="watchlist-chart-x-label">Mon</span>
                            <span className="watchlist-chart-x-label">Tue</span>
                            <span className="watchlist-chart-x-label">Wed</span>
                            <span className="watchlist-chart-x-label">Thu</span>
                            <span className="watchlist-chart-x-label">Fri</span>
                            <span className="watchlist-chart-x-label">Sat</span>
                            <span className="watchlist-chart-x-label">Sun</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="watchlist-stats-grid">
                        <div className="watchlist-stat-item">
                          <span className="watchlist-stat-label">Volume</span>
                          <div className="watchlist-stat-bar">
                            <div className="watchlist-stat-bar-fill" style={{ width: '72%' }}></div>
                          </div>
                          <span className="watchlist-stat-value">$2.1M</span>
                        </div>
                        <div className="watchlist-stat-item">
                          <span className="watchlist-stat-label">Listings</span>
                          <div className="watchlist-stat-bar">
                            <div className="watchlist-stat-bar-fill" style={{ width: '45%' }}></div>
                          </div>
                          <span className="watchlist-stat-value">1,234</span>
                        </div>
                        <div className="watchlist-stat-item">
                          <span className="watchlist-stat-label">Price Range</span>
                          <span className="watchlist-stat-value">$3.25 - $89.99</span>
                        </div>
                        <div className="watchlist-stat-item">
                          <span className="watchlist-stat-label">Avg. Price</span>
                          <span className="watchlist-stat-value">$45.23</span>
                        </div>
                        <div className="watchlist-stat-item">
                          <span className="watchlist-stat-label">Active Listings</span>
                          <span className="watchlist-stat-value">1,234</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          </>
        ) : marketView === 'favorites' && watchedGames.size === 0 ? (
          <>
            {/* Marketplace Hero Section */}
            <div 
              className="marketplace-hero"
              style={{ 
                '--content-width': `${contentWidth}px`,
                '--banner-height': `${bannerHeight}px`,
                height: `${bannerHeight}px`
              }}
            >
              <div className="marketplace-hero-content">
                <div className="marketplace-hero-left">
                  <h1 className="marketplace-hero-title">Tracked Markets</h1>
                  <p className="marketplace-hero-subtitle">Add games to your watchlist to track market trends and analytics.</p>
                </div>
              </div>
            </div>
            
            <div 
              className="watchlist-empty"
              style={{ '--content-width': `${contentWidth}px` }}
            >
              <div className="watchlist-empty-icon">
                <Eye size={48} />
              </div>
              <h3 className="watchlist-empty-title">No watched games</h3>
              <p className="watchlist-empty-text">Add games to your watchlist to track market trends and analytics</p>
            </div>
          </>
        ) : (
            <>
              {/* Petitions View */}
              {marketView === 'petitions' && (
                <div className="petitions-view-container">
                  {/* Marketplace Hero Section */}
                  <div 
                    className="marketplace-hero"
                    style={{ 
                      '--content-width': `${contentWidth}px`,
                      '--banner-height': `${bannerHeight}px`,
                      height: `${bannerHeight}px`
                    }}
                  >
                    <div className="marketplace-hero-content">
                      <div className="marketplace-hero-left">
                        <h1 className="marketplace-hero-title">Support Marketplace Access</h1>
                        <p className="marketplace-hero-subtitle">Games without marketplace support need your voice. Sign petitions to show developers that you want trading features enabled for these games.</p>
                        <div className="marketplace-hero-stats">
                          <div className="hero-stat">
                            <div className="hero-stat-value">{gamesWithoutMarkets.length}</div>
                            <div className="hero-stat-label">Active Petitions</div>
                          </div>
                          <div className="hero-stat">
                            <div className="hero-stat-value">
                              {gamesWithoutMarkets.reduce((sum, game) => sum + (petitions[game.id]?.signatures || 0), 0).toLocaleString()}
                            </div>
                            <div className="hero-stat-label">Total Signatures</div>
                          </div>
                          <div className="hero-stat">
                            <div className="hero-stat-value">
                              {gamesWithoutMarkets.filter(game => petitions[game.id]?.myToken).length}
                            </div>
                            <div className="hero-stat-label">You've Signed</div>
                          </div>
                        </div>
                      </div>
                      <div className="marketplace-hero-right">
                        <button 
                          className="featured-deal-btn"
                          onClick={() => setShowCreatePetitionForm(!showCreatePetitionForm)}
                        >
                          <Plus size={18} />
                          <span>{showCreatePetitionForm ? 'Cancel' : 'Create Petition'}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Create Petition Form - Centered */}
                  {showCreatePetitionForm && (
                    <div 
                      className="create-petition-form-container"
                      style={{ '--content-width': `${contentWidth}px` }}
                    >
                      <div className="create-petition-form">
                        <div className="create-petition-form-header">
                          <h2>Create New Petition</h2>
                          <p className="create-petition-description">Select a game to create a petition for marketplace support</p>
                        </div>
                        
                        {/* Search */}
                        <div className="petition-search">
                          <Search size={18} />
                          <input
                            type="text"
                            placeholder="Search for a game..."
                            value={petitionSearchQuery}
                            onChange={(e) => setPetitionSearchQuery(e.target.value)}
                            className="petition-search-input"
                          />
                        </div>

                        {/* Game List */}
                        <div className="petition-games-list">
                          {allGamesForPetition.length > 0 ? (
                            allGamesForPetition.map(game => {
                              const gameId = game.gameId || game.id;
                              const isSelected = selectedPetitionGame?.id === gameId;
                              const hasPetition = petitions[gameId];
                              
                              return (
                                <div
                                  key={gameId}
                                  className={`petition-game-item ${isSelected ? 'selected' : ''} ${hasPetition ? 'has-petition' : ''}`}
                                  onClick={() => !hasPetition && setSelectedPetitionGame({
                                    id: gameId,
                                    name: game.name || game.gameName || 'Untitled Game',
                                    icon: (game.name || game.gameName || 'G')?.charAt(0)?.toUpperCase() || 'G',
                                    image: game.banner || game.bannerImage || game.cardImage
                                  })}
                                >
                                  <div className="petition-game-image">
                                    {game.banner || game.bannerImage || game.cardImage ? (
                                      <img 
                                        src={game.banner || game.bannerImage || game.cardImage} 
                                        alt={game.name || game.gameName}
                                        onError={(e) => {
                                          e.target.style.display = 'none';
                                          e.target.nextSibling.style.display = 'flex';
                                        }}
                                      />
                                    ) : null}
                                    <div className="petition-game-image-placeholder" style={{ display: game.banner || game.bannerImage || game.cardImage ? 'none' : 'flex' }}>
                                      <div className="petition-game-icon">{(game.name || game.gameName || 'G')?.charAt(0)?.toUpperCase() || 'G'}</div>
                                    </div>
                                  </div>
                                  <div className="petition-game-info">
                                    <h3>{game.name || game.gameName || 'Untitled Game'}</h3>
                                    {hasPetition && (
                                      <span className="petition-game-status">Petition exists</span>
                                    )}
                                  </div>
                                  {isSelected && !hasPetition && (
                                    <div className="petition-game-check">
                                      <CheckCircle2 size={20} />
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            <div className="petition-games-empty">
                              <p>No games found</p>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="create-petition-actions">
                          <button
                            className="create-petition-cancel-btn"
                            onClick={() => {
                              setShowCreatePetitionForm(false);
                              setSelectedPetitionGame(null);
                              setPetitionSearchQuery('');
                            }}
                          >
                            Cancel
                          </button>
                          <button
                            className="create-petition-submit-btn"
                            onClick={handleCreatePetition}
                            disabled={!selectedPetitionGame || petitions[selectedPetitionGame.id]}
                          >
                            Create Petition
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Petitions Grid */}
                  {gamesWithoutMarkets.length > 0 ? (
                    <div 
                      className="petitions-grid"
                      style={{ '--content-width': `${contentWidth}px` }}
                    >
                      {gamesWithoutMarkets.map(game => {
                        const petitionData = petitions[game.id] || {};
                        const signatures = petitionData.signatures || 0;
                        const hasSigned = petitionData.myToken || false;
                        const goal = 100; // Signature goal
                        const progress = Math.min((signatures / goal) * 100, 100);
                        
                        return (
                          <div
                            key={game.id}
                            className={`petition-card ${hasSigned ? 'signed' : ''}`}
                            onClick={() => !hasSigned && handlePetitionSign(game.id)}
                          >
                            {/* Game Image */}
                            <div className="petition-card-image">
                              {game.image || game.cardImage ? (
                                <img 
                                  src={game.image || game.cardImage} 
                                  alt={game.name}
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'flex';
                                  }}
                                />
                              ) : null}
                              <div className="petition-card-image-placeholder" style={{ display: game.image || game.cardImage ? 'none' : 'flex' }}>
                                <div className="petition-card-icon">{game.icon}</div>
                              </div>
                              {hasSigned && (
                                <div className="petition-signed-badge">
                                  <CheckCircle2 size={20} />
                                </div>
                              )}
                            </div>

                            {/* Petition Content */}
                            <div className="petition-card-content">
                              <h3 className="petition-card-title">{game.name}</h3>
                              <p className="petition-card-description">Request marketplace trading features for this game</p>
                              
                              {/* Progress Bar */}
                              <div className="petition-progress">
                                <div className="petition-progress-bar">
                                  <div 
                                    className="petition-progress-fill"
                                    style={{ width: `${progress}%` }}
                                  ></div>
                                </div>
                                <div className="petition-progress-text">
                                  <span className="petition-signatures">{signatures.toLocaleString()}</span>
                                  <span className="petition-goal">/ {goal.toLocaleString()} signatures</span>
                                </div>
                              </div>

                              {/* Sign Button */}
                              <button 
                                className={`petition-sign-btn ${hasSigned ? 'signed' : ''}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!hasSigned) {
                                    handlePetitionSign(game.id);
                                  }
                                }}
                              >
                                {hasSigned ? (
                                  <>
                                    <CheckCircle2 size={18} />
                                    <span>Signed</span>
                                  </>
                                ) : (
                                  <>
                                    <UserPlus size={18} />
                                    <span>Sign Petition</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div 
                      className="petitions-empty"
                      style={{ '--content-width': `${contentWidth}px` }}
                    >
                      <FileText size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
                      <h3>No active petitions</h3>
                      <p>All games currently have marketplace support enabled</p>
                    </div>
                  )}

                </div>
              )}

              {/* Browse/Top Markets/Trending View */}
              {(marketView === 'browse' || marketView === 'featured' || marketView === 'trending') && (
                <>
                  {marketView === 'browse' && (
                    <>
                      {/* Marketplace Hero Section */}
                      <div 
                        className="marketplace-hero"
                        style={{ 
                          '--content-width': `${contentWidth}px`,
                          '--banner-height': `${bannerHeight}px`,
                          height: `${bannerHeight}px`
                        }}
                      >
                        <div className="marketplace-hero-content">
                          <div className="marketplace-hero-left">
                            <h1 className="marketplace-hero-title">Discover & Trade</h1>
                            <p className="marketplace-hero-subtitle">Browse thousands of items across all games. Buy, sell, and invest in the biggest gaming marketplace.</p>
                            <div className="marketplace-hero-stats">
                              <div className="hero-stat">
                                <div className="hero-stat-value">{gamesWithMarkets.length}+</div>
                                <div className="hero-stat-label">Active Markets</div>
                              </div>
                              <div className="hero-stat">
                                <div className="hero-stat-value">${marketStats.totalTraded.toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
                                <div className="hero-stat-label">Total Volume</div>
                              </div>
                              <div className="hero-stat">
                                <div className="hero-stat-value">{marketStats.transactions}</div>
                                <div className="hero-stat-label">Transactions</div>
                              </div>
                            </div>
                          </div>
                          <div className="marketplace-hero-right">
                            <div className="marketplace-featured-deal">
                              <div className="featured-deal-badge">
                                <Flame className="deal-badge-icon" />
                                <span>Hot Deal</span>
                              </div>
                              <div className="featured-deal-content">
                                <div className="featured-deal-title">Limited Time Offer</div>
                                <div className="featured-deal-discount">Up to 50% OFF</div>
                                <div className="featured-deal-desc">Premium items & exclusive bundles</div>
                                <button className="featured-deal-btn">
                                  Shop Now
                                  <ArrowRight className="deal-btn-icon" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Live Activity Ticker - Browse view */}
                      {marketView === 'browse' && (
                        <div 
                          className="marketplace-ticker"
                          style={{ '--content-width': `${contentWidth}px` }}
                        >
                          <div className="ticker-label">
                            <Zap size={14} />
                            <span>Live Activity</span>
                          </div>
                          <div className="ticker-content">
                            <div className="ticker-item">
                              <span className="ticker-user">Player123</span>
                              <span className="ticker-action">bought</span>
                              <span className="ticker-item-name">Legendary Sword</span>
                              <span className="ticker-price">for $45.99</span>
                            </div>
                            <div className="ticker-item">
                              <span className="ticker-user">TraderPro</span>
                              <span className="ticker-action">listed</span>
                              <span className="ticker-item-name">Rare Armor Set</span>
                              <span className="ticker-price">at $89.50</span>
                            </div>
                            <div className="ticker-item">
                              <span className="ticker-user">Collector2024</span>
                              <span className="ticker-action">sold</span>
                              <span className="ticker-item-name">Epic Shield</span>
                              <span className="ticker-price">for $120.00</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {marketView === 'featured' && (
                    <div 
                      className="marketplace-hero"
                      style={{ 
                        '--content-width': `${contentWidth}px`,
                        '--banner-height': `${bannerHeight}px`,
                        height: `${bannerHeight}px`
                      }}
                    >
                      <div className="marketplace-hero-content">
                        <div className="marketplace-hero-left">
                          <h1 className="marketplace-hero-title">Highest Volume Markets</h1>
                          <p className="marketplace-hero-subtitle">Discover the most active marketplaces ranked by total trading volume.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {marketView === 'trending' && (
                    <div 
                      className="marketplace-hero"
                      style={{ 
                        '--content-width': `${contentWidth}px`,
                        '--banner-height': `${bannerHeight}px`,
                        height: `${bannerHeight}px`
                      }}
                    >
                      <div className="marketplace-hero-content">
                        <div className="marketplace-hero-left">
                          <h1 className="marketplace-hero-title">24h Market Trends</h1>
                          <p className="marketplace-hero-subtitle">Markets with the biggest price movements in the last 24 hours.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Games Grid */}
                  <div className="games-selection-grid">
                    {(marketView === 'trending' ? trendingGames : 
                      marketView === 'featured' ? topMarketsGames : 
                      gamesWithMarkets).map(game => {
                      const rankClass = game.marketRank <= 3 ? `rank-${game.marketRank}` : '';
                      const isWatched = watchedGames.has(game.id);
                      return (
                        <div
                          key={game.id}
                          className={`game-select-card ${rankClass}`}
                          onClick={() => navigate(`/game/${game.id}/market`)}
            >
              {/* Banner Section */}
              <div className="game-select-banner">
                <button 
                  className={`game-select-watch-btn ${isWatched ? 'watched' : ''}`}
                  onClick={(e) => handleWatchGame(game.id, e)}
                  title={isWatched ? 'Remove from watchlist' : 'Add to watchlist'}
                >
                  {isWatched ? <Eye size={20} strokeWidth={3} /> : <EyeOff size={20} strokeWidth={3} />}
                </button>
                {game.image || game.cardImage ? (
                  <img 
                    src={game.image || game.cardImage} 
                    alt={game.name}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div className="game-select-banner-placeholder" style={{ display: game.image || game.cardImage ? 'none' : 'flex' }}>
                  <div className="game-select-icon">{game.icon}</div>
                </div>
                <div style={{ position: 'absolute', bottom: '12px', left: '12px', right: '12px', zIndex: 2 }}>
                  <div className="game-select-name">{game.name}</div>
                  <div className="game-select-action">
                                {game.installed ? 'Open Marketplace' : 'Install & Browse'}
                  </div>
                </div>
              </div>

              {/* Market Info Bar */}
                <div className="game-select-market-bar">
                  <div className="game-select-market-stat">
                    <div className="game-select-market-stat-value">
                      #{game.marketRank || 1}
                      {game.marketRank === 1 && <Crown size={16} style={{ marginLeft: '4px', color: '#FFD700' }} />}
                      {game.marketRank === 2 && <Crown size={16} style={{ marginLeft: '4px', color: '#C0C0C0' }} />}
                      {game.marketRank === 3 && <Crown size={16} style={{ marginLeft: '4px', color: '#CD7F32' }} />}
                    </div>
                    <div className="game-select-market-stat-label">RANK</div>
                  </div>
                  <div className="game-select-market-stat">
                    <div className="game-select-market-stat-value">{game.totalVolume || '$0'}</div>
                    <div className="game-select-market-stat-label">volume</div>
                  </div>
                  <div className="game-select-market-stat">
                    <div className="game-select-market-stat-value">{game.marketTrend || '+0%'}</div>
                    <div className="game-select-market-stat-label">24H TREND</div>
                  </div>
                </div>
            </div>
          );
                    })}
          </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Right Sidebar - Works throughout market menu */}
        <div 
          className="market-sidebar-right"
          style={{ 
            '--window-width': windowWidth,
            '--sidebar-scale': Math.max(0.8, Math.min(1.2, windowWidth / 1120))
          }}
        >
          <aside 
            className={`market-sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}
            style={{ 
              width: isSidebarCollapsed ? COLLAPSED_WIDTH : marketRightSidebarWidth
            }}
          >
            {!isSidebarCollapsed && (
              <div 
                className="market-sidebar-title"
                style={{
                  fontSize: `${sidebarStyles.titleFontSize}px`,
                  padding: `${sidebarStyles.titlePadding.vertical}px ${sidebarStyles.titlePadding.horizontal}px ${sidebarStyles.titlePadding.bottom}px ${sidebarStyles.titlePadding.horizontal}px`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px'
                }}
              >
                <span>Market</span>
                <button
                  className="market-sidebar-close-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsSidebarCollapsed(true);
                    try {
                      localStorage.setItem('marketSidebarCollapsed', 'true');
                    } catch (_) {}
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'rgba(255, 255, 255, 0.6)',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '4px',
                    transition: 'none'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                    e.currentTarget.style.color = 'rgba(255, 255, 255, 0.9)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)';
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            )}
            {isSidebarCollapsed && (
              <div 
                className="market-sidebar-collapsed-header"
                style={{
                  padding: '20px 8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
                onClick={() => {
                  setIsSidebarCollapsed(false);
                  try {
                    localStorage.setItem('marketSidebarCollapsed', 'false');
                  } catch (_) {}
                }}
              >
                <ChevronLeft size={20} style={{ color: 'rgba(255, 255, 255, 0.6)' }} />
              </div>
            )}
            {!isSidebarCollapsed && (
              <nav 
                className="market-sidebar-nav"
                style={{
                  padding: `${sidebarStyles.navPadding}px 0`,
                  gap: `${sidebarStyles.navGap}px`
                }}
              >
                {/* Main Section - Browse */}
                <div 
                  className="market-sidebar-nav-section market-sidebar-nav-main"
                  style={{
                    paddingBottom: `${sidebarStyles.sectionPaddingBottom}px`
                  }}
                >
                  <button 
                    className={`market-sidebar-nav-item market-sidebar-nav-main-item ${marketView === 'browse' ? 'active' : ''}`}
                    onClick={() => setMarketView('browse')}
                    style={{
                      fontSize: `${sidebarStyles.mainItemFontSize}px`,
                      padding: `${sidebarStyles.mainItemPadding.vertical}px ${sidebarStyles.mainItemPadding.horizontal}px`
                    }}
                  >
                    <ShoppingBag size={sidebarStyles.mainItemIconSize} />
                    <span>Browse</span>
                  </button>
                </div>

                <div className="market-sidebar-nav-section">
                  <h3 
                    className="market-sidebar-section-title"
                    style={{
                      fontSize: `${sidebarStyles.sectionTitleFontSize}px`,
                      padding: `0 ${sidebarStyles.sectionTitlePadding.horizontal}px ${sidebarStyles.sectionTitlePadding.bottom}px ${sidebarStyles.sectionTitlePadding.horizontal}px`
                    }}
                  >
                    Marketplace
                  </h3>
                  <button 
                    className={`market-sidebar-nav-item ${marketView === 'featured' ? 'active' : ''}`}
                    onClick={() => setMarketView('featured')}
                    style={{
                      fontSize: `${sidebarStyles.navItemFontSize}px`,
                      padding: `${sidebarStyles.navItemPadding.vertical}px ${sidebarStyles.navItemPadding.horizontal}px`,
                      gap: `${sidebarStyles.navItemGap}px`
                    }}
                  >
                    <BarChart3 size={sidebarStyles.navItemIconSize} />
                    <span>Top Markets</span>
                  </button>
                  <button 
                    className={`market-sidebar-nav-item ${marketView === 'trending' ? 'active' : ''}`}
                    onClick={() => setMarketView('trending')}
                    style={{
                      fontSize: `${sidebarStyles.navItemFontSize}px`,
                      padding: `${sidebarStyles.navItemPadding.vertical}px ${sidebarStyles.navItemPadding.horizontal}px`,
                      gap: `${sidebarStyles.navItemGap}px`
                    }}
                  >
                    <TrendingUp size={sidebarStyles.navItemIconSize} />
                    <span>Trending</span>
                  </button>
                </div>
                
                <div className="market-sidebar-nav-section">
                  <h3 
                    className="market-sidebar-section-title"
                    style={{
                      fontSize: `${sidebarStyles.sectionTitleFontSize}px`,
                      padding: `0 ${sidebarStyles.sectionTitlePadding.horizontal}px ${sidebarStyles.sectionTitlePadding.bottom}px ${sidebarStyles.sectionTitlePadding.horizontal}px`
                    }}
                  >
                    My Activity
                  </h3>
                  <button 
                    className={`market-sidebar-nav-item ${marketView === 'favorites' ? 'active' : ''}`}
                    onClick={() => setMarketView('favorites')}
                    style={{
                      fontSize: `${sidebarStyles.navItemFontSize}px`,
                      padding: `${sidebarStyles.navItemPadding.vertical}px ${sidebarStyles.navItemPadding.horizontal}px`,
                      gap: `${sidebarStyles.navItemGap}px`
                    }}
                  >
                    <Eye size={sidebarStyles.navItemIconSize} />
                    <span>Watchlist</span>
                  </button>
                  <button 
                    className={`market-sidebar-nav-item ${marketView === 'stats' ? 'active' : ''}`}
                    onClick={() => setMarketView('stats')}
                    style={{
                      fontSize: `${sidebarStyles.navItemFontSize}px`,
                      padding: `${sidebarStyles.navItemPadding.vertical}px ${sidebarStyles.navItemPadding.horizontal}px`,
                      gap: `${sidebarStyles.navItemGap}px`
                    }}
                  >
                    <BarChart3 size={sidebarStyles.navItemIconSize} />
                    <span>Analytics</span>
                  </button>
                </div>
                
                <div className="market-sidebar-nav-section">
                  <h3 
                    className="market-sidebar-section-title"
                    style={{
                      fontSize: `${sidebarStyles.sectionTitleFontSize}px`,
                      padding: `0 ${sidebarStyles.sectionTitlePadding.horizontal}px ${sidebarStyles.sectionTitlePadding.bottom}px ${sidebarStyles.sectionTitlePadding.horizontal}px`
                    }}
                  >
                    Community
                  </h3>
                  <button 
                    className={`market-sidebar-nav-item ${marketView === 'petitions' ? 'active' : ''}`}
                    onClick={() => setMarketView('petitions')}
                    style={{
                      fontSize: `${sidebarStyles.navItemFontSize}px`,
                      padding: `${sidebarStyles.navItemPadding.vertical}px ${sidebarStyles.navItemPadding.horizontal}px`,
                      gap: `${sidebarStyles.navItemGap}px`
                    }}
                  >
                    <Users size={sidebarStyles.navItemIconSize} />
                    <span>Petitions</span>
                  </button>
                </div>
              </nav>
            )}
          </aside>
        </div>
        </div>
      </div>
    );
  }


  const getRarityColor = (rarity) => {
    switch (rarity) {
      case 'Legendary': return '#ff6b35';
      case 'Epic': return '#9d4edd';
      case 'Rare': return '#0077b6';
      case 'Common': return '#6c757d';
      default: return '#6c757d';
    }
  };

  // Show comparison view as full-screen submenu
  if (showComparisonModal) {
    return (
      <div className="market">
        <div className="market-main-container">
          <div className="market-content-area">
            <div className="comparison-fullscreen-view">
              <div className="comparison-fullscreen-header">
                <button 
                  className="comparison-back-btn"
                  onClick={() => {
                    setShowComparisonModal(false);
                    setComparisonModalAutoOpened(false);
                    setComparisonModalManuallyClosed(true);
                    // Allow user to manually close even with items selected
                  }}
                >
                  <ArrowLeft size={18} />
                  <span>Back to Marketplace</span>
                </button>
                <h2 className="comparison-fullscreen-title">Compare Items ({comparisonItems.length}/8)</h2>
                <div className="comparison-fullscreen-actions">
                  <div className="comparison-view-mode-toggle">
                    <button 
                      className={`comparison-view-mode-btn ${comparisonViewMode === 'both' ? 'active' : ''}`}
                      onClick={() => setComparisonViewMode('both')}
                      title="Show both 3D view and stats"
                    >
                      <Grid size={16} />
                      <span>Both</span>
                    </button>
                    <button 
                      className={`comparison-view-mode-btn ${comparisonViewMode === '3d' ? 'active' : ''}`}
                      onClick={() => setComparisonViewMode('3d')}
                      title="Show only 3D view"
                    >
                      <Maximize2 size={16} />
                      <span>3D View</span>
                    </button>
                    <button 
                      className={`comparison-view-mode-btn ${comparisonViewMode === 'stats' ? 'active' : ''}`}
                      onClick={() => setComparisonViewMode('stats')}
                      title="Show only stats"
                    >
                      <BarChart3 size={16} />
                      <span>Stats</span>
                    </button>
                  </div>
                  {comparisonItems.length > 0 && (
                    <button className="comparison-clear-btn" onClick={handleClearComparison}>
                      Clear All
                    </button>
                  )}
                </div>
              </div>


              <div className="comparison-fullscreen-content">
                {comparisonItems.length === 0 ? (
                  <div className="comparison-empty">
                    <GitCompare size={48} />
                    <p>No items selected for comparison</p>
                    <span>Click the compare icon on items below to add them</span>
                  </div>
                ) : (
                  <div 
                    className={`comparison-3d-grid comparison-view-mode-${comparisonViewMode}`}
                    style={{
                      '--item-count': comparisonItems.length,
                      '--grid-columns': comparisonViewMode === '3d' 
                        ? (comparisonItems.length === 2 ? '2' : 
                           comparisonItems.length === 3 ? '2' : 
                           comparisonItems.length === 4 ? '2' : 
                           comparisonItems.length <= 6 ? '3' : 
                           comparisonItems.length <= 8 ? '4' : '4')
                        : (comparisonItems.length <= 4 ? comparisonItems.length.toString() : '4'),
                      '--grid-rows': comparisonViewMode === '3d'
                        ? (comparisonItems.length === 2 ? '1' : 
                           comparisonItems.length === 3 ? '2' : 
                           comparisonItems.length === 4 ? '2' : 
                           comparisonItems.length <= 6 ? '2' : 
                           comparisonItems.length <= 8 ? '2' : '2')
                        : (comparisonItems.length <= 4 ? '1' : '2')
                    }}
                  >
                    {comparisonItems.map((item, index) => {
                      // For 3D view with 3 items: first item spans 2 columns
                      const spanColumns = comparisonViewMode === '3d' && comparisonItems.length === 3 && index === 0 ? 2 : 1;
                      const spanRows = comparisonViewMode === '3d' && comparisonItems.length === 3 && index === 0 ? 1 : 1;
                      const diffColor = getDifferenceColor(item);
                      const isReference = referenceItemId === item.id;
                      const hasDifferences = !isReference && diffColor !== null && diffColor !== undefined;
                      
                      return (
                        <div 
                          key={item.id} 
                          className={`comparison-3d-item ${isReference ? 'is-reference' : ''} ${hasDifferences ? 'has-differences' : ''}`}
                          style={{
                            ...(hasDifferences && diffColor ? { '--diff-color': diffColor } : {}),
                            gridColumn: `span ${spanColumns}`,
                            gridRow: `span ${spanRows}`
                          }}
                        >
                          <div className="comparison-3d-header">
                            <div className="comparison-3d-header-left">
                              <button
                                className="comparison-reference-checkbox"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setReferenceItemId(item.id);
                                }}
                                title={isReference ? "Reference item" : "Set as reference"}
                              >
                                {isReference ? <CheckSquare size={18} /> : <Square size={18} />}
                              </button>
                              <h3 className="comparison-3d-item-name">{item.name}</h3>
                            </div>
                            <button 
                              className="comparison-remove-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveFromComparison(item.id);
                              }}
                              title="Remove from comparison"
                            >
                              <X size={14} />
                            </button>
                          </div>
                          
                          {/* Use existing 3D view system - exact copy */}
                          {(comparisonViewMode === 'both' || comparisonViewMode === '3d') && (
                          <div className="item-3d-view">
                            <div 
                              className="item-3d-container" 
                              ref={(el) => {
                                if (el) {
                                  comparison3dRefs.current[item.id] = el;
                                } else {
                                  delete comparison3dRefs.current[item.id];
                                }
                              }}
                            >
                              <div className="item-3d-model-wrapper" style={{
                                transform: `translate(${comparisonPans[item.id]?.x || 0}px, ${comparisonPans[item.id]?.y || 0}px) rotateX(${normalizeRotation(comparisonRotations[item.id]?.x)}deg) rotateY(${normalizeRotation(comparisonRotations[item.id]?.y)}deg) rotateZ(${normalizeRotation(comparisonRotations[item.id]?.z)}deg) scale(${comparisonZooms[item.id] || 1})`,
                                transformStyle: 'preserve-3d',
                                transition: (comparisonIsRotating[item.id] || comparisonIsPanning[item.id]) ? 'none' : (comparisonIsResetting[item.id] ? 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)' : 'transform 0.1s ease')
                              }}>
                                {item.imageUrl ? (
                                  <img 
                                    src={item.imageUrl} 
                                    alt={item.name}
                                    className="item-3d-image"
                                  />
                                ) : (
                                  <div className="item-3d-placeholder">
                                    <div className="item-3d-icon">{item.image || '📦'}</div>
                                    <p>3D Model View</p>
                                    <span className="item-3d-note">3D model preview will be available here</span>
                                  </div>
                                )}
                              </div>
                              <div className="item-3d-controls item-3d-controls-zoom" onClick={(e) => e.stopPropagation()}>
                                <button 
                                  className="item-3d-btn" 
                                  title="Zoom In"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setComparisonZooms(prev => {
                                      const current = prev[item.id] || 1;
                                      return {
                                        ...prev,
                                        [item.id]: Math.max(0.5, Math.min(2, current + 0.1))
                                      };
                                    });
                                  }}
                                >
                                  <Plus size={14} />
                                </button>
                                <button 
                                  className="item-3d-btn" 
                                  title="Zoom Out"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setComparisonZooms(prev => {
                                      const current = prev[item.id] || 1;
                                      return {
                                        ...prev,
                                        [item.id]: Math.max(0.5, Math.min(2, current - 0.1))
                                      };
                                    });
                                  }}
                                >
                                  <Minus size={14} />
                                </button>
                              </div>
                            </div>
                            {isReference && (
                              <div className="comparison-reference-badge">
                                <Flag size={14} />
                                <span>Reference</span>
                              </div>
                            )}
                          </div>
                          )}
                          
                          {(comparisonViewMode === 'both' || comparisonViewMode === 'stats') && (
                          <div className="comparison-3d-info">
                            <div className="comparison-info-grid">
                              <div className="comparison-info-item">
                                <span className="comparison-info-label">Price</span>
                                <span className={`comparison-info-value ${referenceItem && referenceItem.price !== item.price ? 'different' : ''}`}>
                                  ${item.price.toFixed(2)}
                                </span>
                              </div>
                              <div className="comparison-info-item">
                                <span className="comparison-info-label">Rarity</span>
                                <span className={`comparison-info-value rarity-${item.rarity.toLowerCase()} ${referenceItem && referenceItem.rarity !== item.rarity ? 'different' : ''}`}>
                                  {item.rarity}
                                </span>
                              </div>
                              {item.type && (
                                <div className="comparison-info-item">
                                  <span className="comparison-info-label">Type</span>
                                  <span className={`comparison-info-value ${referenceItem && referenceItem.type !== item.type ? 'different' : ''}`}>
                                    {item.type}
                                  </span>
                                </div>
                              )}
                              <div className="comparison-info-item">
                                <span className="comparison-info-label">Seller</span>
                                <span className="comparison-info-value">{item.seller || 'Unknown'}</span>
                              </div>
                            </div>
                          </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Resizable Bottom Drawer for Items */}
              {selectedGame && marketItems.length > 0 && (
                <div className="comparison-drawer-container">
                  <div 
                    className={`comparison-drawer ${(drawerHeight <= 60 && !isAnimating) ? 'minimized' : ''} ${isDraggingDrawer ? 'dragging' : ''}`}
                    style={{ height: `${drawerHeight}px` }}
                  >
                    <div className="comparison-drawer-handle-wrapper">
                      <div className="comparison-drawer-handle-hint">
                        {drawerHeight <= 60 ? 'Click to open' : 'Click to close'}
                      </div>
                      <div 
                        className="comparison-drawer-handle"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setHasDragged(false);
                          setIsDraggingDrawer(true);
                        }}
                      >
                        <div className="comparison-drawer-handle-bar"></div>
                      </div>
                    </div>
                    
                    {showDrawerContent && (
                      <>
                        <div className="comparison-drawer-header">
                          <h3>Add More Items to Compare</h3>
                        </div>

                        <div className="comparison-drawer-content">
                      <div className="marketplace-filters-bar" style={{ '--content-width': `${contentWidth}px` }}>
                        <div className="filters-bar-left">
                          <div className="marketplace-search-wrapper">
                            <Search size={16} className="search-icon" />
                            <input
                              type="text"
                              className="marketplace-search-input"
                              placeholder="Search items..."
                              value={itemSearch}
                              onChange={(e) => setItemSearch(e.target.value)}
                            />
                            {itemSearch && (
                              <button 
                                className="search-clear-btn"
                                onClick={() => setItemSearch('')}
                                title="Clear search"
                              >
                                <X size={12} />
                              </button>
                            )}
                          </div>
                          
                          <div className="marketplace-filters-group">
                            <select
                              className="marketplace-filter-select"
                              value={rarityFilter}
                              onChange={(e) => setRarityFilter(e.target.value)}
                            >
                              <option value="all">All Rarities</option>
                              <option value="common">Common</option>
                              <option value="rare">Rare</option>
                              <option value="epic">Epic</option>
                              <option value="legendary">Legendary</option>
                            </select>
                            
                            <select
                              className="marketplace-filter-select"
                              value={priceFilter}
                              onChange={(e) => setPriceFilter(e.target.value)}
                            >
                              <option value="all">All Prices</option>
                              <option value="under-10">Under $10</option>
                              <option value="10-50">$10 - $50</option>
                              <option value="50-100">$50 - $100</option>
                              <option value="over-100">Over $100</option>
                            </select>
                            
                            <select
                              className="marketplace-filter-select"
                              value={sortBy}
                              onChange={(e) => setSortBy(e.target.value)}
                            >
                              <option value="price-low">Price: Low to High</option>
                              <option value="price-high">Price: High to Low</option>
                              <option value="name-asc">Name: A to Z</option>
                              <option value="name-desc">Name: Z to A</option>
                              <option value="newest">Newest First</option>
                              <option value="oldest">Oldest First</option>
                            </select>
                          </div>
                        </div>

                        <div className="filters-bar-right">
                          <div className="items-count">
                            {sortedItems.length} {sortedItems.length === 1 ? 'item' : 'items'}
                            {itemSearch || rarityFilter !== 'all' || priceFilter !== 'all' ? (
                              <span className="items-count-filtered"> (filtered)</span>
                            ) : null}
                          </div>
                          <div className="view-mode-controls">
                            <button 
                              className={`view-mode-btn ${viewMode === 'grid' ? 'active' : ''}`}
                              onClick={() => setViewMode('grid')}
                              title="Grid view"
                            >
                              <Grid size={16} />
                            </button>
                            <button 
                              className={`view-mode-btn ${viewMode === 'row' ? 'active' : ''}`}
                              onClick={() => setViewMode('row')}
                              title="List view"
                            >
                              <List size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      <div 
                        ref={itemsGridRef}
                        className={`items-grid ${viewMode === 'grid' ? 'grid-view' : 'row-view'}`}
                      >
                        {sortedItems.length === 0 ? (
                          <div className="marketplace-empty-state">
                            <div className="empty-state-icon">📦</div>
                            <h3 className="empty-state-title">No items listed</h3>
                            <p className="empty-state-description">Be the first to list an item for {selectedGame.name}</p>
                            <button className="empty-state-action-btn" onClick={handleSellItem}>
                              <Plus size={16} />
                              <span>List Item</span>
                            </button>
                          </div>
                        ) : (
                          sortedItems.map(item => (
                          <div 
                            key={item.id} 
                            className="market-item-card"
                            onClick={() => {
                              setSelectedItemDetail(item);
                              setShowItemDetailModal(true);
                            }}
                          >
                            <div className="item-image-container">
                              <img 
                                src={item.imageUrl} 
                                alt={item.name}
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  if (e.target.nextSibling) {
                                    e.target.nextSibling.style.display = 'flex';
                                  }
                                }}
                              />
                              <div className="item-icon-large" style={{display: item.imageUrl ? 'none' : 'flex'}}>
                                {item.image || '📦'}
                              </div>
                            </div>
                            
                            {viewMode === 'row' && <div className={`rarity-line-vertical rarity-${item.rarity.toLowerCase()}`}></div>}
                            
                            <div className={`rarity-line rarity-${item.rarity.toLowerCase()}`}></div>
                            
                            <div className="item-details">
                              <div className="item-name-row">
                                <h3 className="item-name-large">{item.name}</h3>
                              </div>
                              
                              <div className="item-meta-row">
                                <span className="seller-name">{item.seller || 'Unknown'}</span>
                                <span className="listed-at-text">{formatListedAt(item.listedAt)}</span>
                              </div>
                              
                              <div className="item-bottom-row">
                                <div className="item-price-row">
                                  <span className="price-value">${item.price.toFixed(2)}</span>
                                </div>
                                
                                <div className="item-action-buttons" onClick={(e) => e.stopPropagation()}>
                                  <button className="buy-now-btn" onClick={() => handleBuyItem(item.id)}>Buy</button>
                                  <button 
                                    className={`compare-btn-item ${comparisonItems.some(i => i.id === item.id) ? 'active' : ''}`}
                                    onClick={(e) => handleAddToComparison(item, e)}
                                    title={comparisonItems.some(i => i.id === item.id) ? 'Remove from comparison' : 'Add to comparison'}
                                  >
                                    <GitCompare size={14} />
                                  </button>
                                  <button 
                                    className={`watch-btn ${watchedItems.has(item.id) ? 'watched' : ''}`}
                                    onClick={() => handleWatchItem(item.id)}
                                  >
                                    {watchedItems.has(item.id) ? <Eye size={16} /> : <EyeOff size={16} />}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                          ))
                        )}
                      </div>
                    </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="market">
      <div className="market-main-container">
        <div className="market-content-area">
      {/* Market Statistics Bar - Only show when NOT viewing a marketplace */}
      {!selectedGame && (
        <div className="watch-stats-overview">
          <div className="watch-stat-group">
            <div className="watch-stat-item">
              <span className="watch-stat-item-label">Total Profit</span>
              <span className={`watch-stat-item-value ${marketStats.totalProfit >= 0 ? 'positive' : ''}`}>
                {marketStats.totalProfit >= 0 ? '+' : ''}${marketStats.totalProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="watch-stat-item">
              <span className="watch-stat-item-label">Total Traded</span>
              <span className="watch-stat-item-value">${marketStats.totalTraded.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="watch-stat-item">
              <span className="watch-stat-item-label">Transactions</span>
              <span className="watch-stat-item-value">{marketStats.transactions}</span>
            </div>
            <div className="watch-stat-item">
              <span className="watch-stat-item-label">Avg. Price</span>
              <span className="watch-stat-item-value">${marketStats.avgPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
          <div className="watch-stat-group">
            <div className="watch-stat-item">
              <span className="watch-stat-item-label">Active Investments</span>
              <span className="watch-stat-item-value">{marketStats.activeInvestments}</span>
            </div>
            <div className="watch-stat-item">
              <span className="watch-stat-item-label">Investment Returns</span>
              <span className={`watch-stat-item-value ${marketStats.investmentReturns >= 0 ? 'positive' : ''}`}>
                {marketStats.investmentReturns >= 0 ? '+' : ''}${marketStats.investmentReturns.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="watch-stat-item">
              <span className="watch-stat-item-label">Total Invested</span>
              <span className="watch-stat-item-value">${marketStats.totalInvested.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="watch-stat-item">
              <span className="watch-stat-item-label">Avg. Return</span>
              <span className={`watch-stat-item-value ${marketStats.avgReturn >= 0 ? 'positive' : ''}`}>
                {marketStats.avgReturn >= 0 ? '+' : ''}{marketStats.avgReturn.toFixed(1)}%
              </span>
            </div>
          </div>
          <div className="watch-stat-group">
            <div className="watch-stat-item">
              <span className="watch-stat-item-label">Success Rate</span>
              <span className={`watch-stat-item-value ${marketStats.successRate >= 50 ? 'positive' : ''}`}>
                {marketStats.successRate.toFixed(0)}%
              </span>
            </div>
            <div className="watch-stat-item">
              <span className="watch-stat-item-label">Net Worth</span>
              <span className="watch-stat-item-value">${marketStats.netWorth.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="watch-stat-item">
              <span className="watch-stat-item-label">ROI</span>
              <span className={`watch-stat-item-value ${marketStats.roi >= 0 ? 'positive' : ''}`}>
                {marketStats.roi >= 0 ? '+' : ''}{marketStats.roi.toFixed(1)}%
              </span>
            </div>
            <div className="watch-stat-item">
              <span className="watch-stat-item-label">Best Trade</span>
              <span className={`watch-stat-item-value ${marketStats.bestTrade >= 0 ? 'positive' : ''}`}>
                {marketStats.bestTrade >= 0 ? '+' : ''}{marketStats.bestTrade.toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Marketplace Section - Only show when game is selected */}
      {selectedGame && (
      <div className="marketplace-section-container">
        <div className="marketplace-section">
          {/* Market Content Container */}
          <div 
            className="marketplace-content-wrapper"
            style={{
              '--banner-bg-image': `url(${selectedGame.image})`
            }}
          >
            {/* Collapsed Header Bar - Only shown when scrolled */}
            {collapsedBannerHeight <= 60 && (
              <div className="market-collapsed-header">
                <button 
                  className="back-btn" 
                  onClick={() => {
                    setSelectedGame(null);
                    navigate('/market');
                  }} 
                  title="Back to Market"
                >
                  <ArrowLeft size={18} />
                </button>
              </div>
            )}
            
            {/* Game Banner */}
            {collapsedBannerHeight > 60 && (
            <div className="market-banner" style={{
              backgroundImage: `url(${selectedGame.image})`,
              height: `${collapsedBannerHeight}px`,
              minHeight: `${collapsedBannerHeight}px`,
              maxHeight: `${collapsedBannerHeight}px`,
              overflow: 'hidden'
            }}>
              <div className="banner-overlay"></div>
              <div className="banner-content">
                <button 
                  className="back-btn" 
                  onClick={() => {
                    setSelectedGame(null);
                    navigate('/market');
                  }} 
                  title="Back to Market"
                >
                  <ArrowLeft size={18} />
                </button>
                {collapsedBannerHeight > 60 && (
                  <div className="banner-center">
                    <div className="banner-logo-container">
                      <img 
                        src={selectedGame.logo} 
                        alt={selectedGame.name}
                        className="game-logo-banner"
                        onError={(e) => { e.target.style.display = 'none' }}
                      />
                    </div>
                    <div className="banner-text">
                      <h1 className="banner-title">{selectedGame.name}</h1>
                      <span className="banner-subtitle">Marketplace</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            )}
        {/* Market Stats Bar */}
        <div className="market-stats-bar">
          <div className="stats-wrapper">
            <div className="stat-box">
              <div className="stat-value">$12,450</div>
              <div className="stat-label">24H VOLUME</div>
            </div>
            <div className="stat-box">
              <div className="stat-value">{sortedItems.length}</div>
              <div className="stat-label">ACTIVE LISTINGS</div>
            </div>
            <div className="stat-box">
              <div className="stat-value">
                {sortedItems.length > 0 
                  ? `$${Math.min(...sortedItems.map(i => i.price)).toFixed(2)} - $${Math.max(...sortedItems.map(i => i.price)).toFixed(2)}`
                  : '$0.00 - $0.00'
                }
              </div>
              <div className="stat-label">PRICE RANGE</div>
            </div>
            <div className="stat-box">
              <div className="stat-value positive">+5.2%</div>
              <div className="stat-label">MARKET TREND</div>
            </div>
          </div>
        </div>

        {/* Combined Search, Filter and Controls Bar */}
        <div className="marketplace-filters-bar" style={{ '--content-width': `${contentWidth}px` }}>
          <div className="filters-bar-left">
          <div className="marketplace-search-wrapper">
              <Search size={16} className="search-icon" />
            <input
              type="text"
              className="marketplace-search-input"
              placeholder="Search items..."
              value={itemSearch}
              onChange={(e) => setItemSearch(e.target.value)}
            />
            {itemSearch && (
              <button 
                className="search-clear-btn"
                onClick={() => setItemSearch('')}
                title="Clear search"
              >
                  <X size={12} />
              </button>
            )}
          </div>
          
          <div className="marketplace-filters-group">
            <select
              className="marketplace-filter-select"
              value={rarityFilter}
              onChange={(e) => setRarityFilter(e.target.value)}
            >
              <option value="all">All Rarities</option>
              <option value="common">Common</option>
              <option value="rare">Rare</option>
              <option value="epic">Epic</option>
              <option value="legendary">Legendary</option>
            </select>
            
            <select
              className="marketplace-filter-select"
              value={priceFilter}
              onChange={(e) => setPriceFilter(e.target.value)}
            >
              <option value="all">All Prices</option>
              <option value="under-10">Under $10</option>
              <option value="10-50">$10 - $50</option>
              <option value="50-100">$50 - $100</option>
              <option value="over-100">Over $100</option>
            </select>
            
            <select
              className="marketplace-filter-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="name-asc">Name: A to Z</option>
              <option value="name-desc">Name: Z to A</option>
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
            </div>
          </div>

          <div className="filters-bar-right">
            <button
              className="comparison-open-btn"
              onClick={() => {
                setShowComparisonModal(true);
                setComparisonModalManuallyClosed(false);
              }}
              title={comparisonItems.length > 0 ? `Open comparison (${comparisonItems.length} items)` : 'Open comparison to add items'}
            >
              <GitCompare size={16} />
              <span>Compare {comparisonItems.length > 0 ? `(${comparisonItems.length})` : ''}</span>
            </button>
            <div className="items-count">
              {sortedItems.length} {sortedItems.length === 1 ? 'item' : 'items'}
              {itemSearch || rarityFilter !== 'all' || priceFilter !== 'all' ? (
                <span className="items-count-filtered"> (filtered)</span>
              ) : null}
            </div>
            <div className="view-mode-controls">
              <button 
                className={`view-mode-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
                title="Grid view"
              >
                <Grid size={16} />
              </button>
              <button 
                className={`view-mode-btn ${viewMode === 'row' ? 'active' : ''}`}
                onClick={() => setViewMode('row')}
                title="List view"
              >
                <List size={16} />
              </button>
            </div>
          </div>
        </div>
        
        {/* Items Grid */}
        <div 
          ref={itemsGridRef}
          className={`items-grid ${viewMode === 'grid' ? 'grid-view' : 'row-view'}`}
        >
        {sortedItems.length === 0 ? (
          <div className="marketplace-empty-state">
            <div className="empty-state-icon">📦</div>
            <h3 className="empty-state-title">No items listed</h3>
            <p className="empty-state-description">Be the first to list an item for {selectedGame.name}</p>
            <button className="empty-state-action-btn" onClick={handleSellItem}>
              <Plus size={16} />
              <span>List Item</span>
            </button>
          </div>
        ) : (
          sortedItems.map(item => (
          <div 
            key={item.id} 
            className="market-item-card"
            onClick={() => {
              setSelectedItemDetail(item);
              setShowItemDetailModal(true);
            }}
          >
            <div className="item-image-container">
              <img 
                src={item.imageUrl} 
                alt={item.name}
                onError={(e) => {
                  e.target.style.display = 'none';
                  if (e.target.nextSibling) {
                    e.target.nextSibling.style.display = 'flex';
                  }
                }}
              />
              <div className="item-icon-large" style={{display: item.imageUrl ? 'none' : 'flex'}}>
                {item.image || '📦'}
              </div>
            </div>
            
            {viewMode === 'row' && <div className={`rarity-line-vertical rarity-${item.rarity.toLowerCase()}`}></div>}
            
            <div className={`rarity-line rarity-${item.rarity.toLowerCase()}`}></div>
            
            <div className="item-details">
              <div className="item-name-row">
                <h3 className="item-name-large">{item.name}</h3>
              </div>
              
              <div className="item-meta-row">
                <span className="seller-name">{item.seller || 'Unknown'}</span>
                <span className="listed-at-text">{formatListedAt(item.listedAt)}</span>
              </div>
              
              <div className="item-bottom-row">
                <div className="item-price-row">
                  <span className="price-value">${item.price.toFixed(2)}</span>
                </div>
                
                <div className="item-action-buttons" onClick={(e) => e.stopPropagation()}>
                  <button className="buy-now-btn" onClick={() => handleBuyItem(item.id)}>Buy</button>
                  <button 
                    className={`compare-btn-item ${comparisonItems.some(i => i.id === item.id) ? 'active' : ''}`}
                    onClick={(e) => handleAddToComparison(item, e)}
                    title={comparisonItems.some(i => i.id === item.id) ? 'Remove from comparison' : 'Add to comparison'}
                  >
                    <GitCompare size={14} />
                  </button>
                  <button 
                    className={`watch-btn ${watchedItems.has(item.id) ? 'watched' : ''}`}
                    onClick={() => handleWatchItem(item.id)}
                  >
                    {watchedItems.has(item.id) ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                </div>
              </div>
            </div>
          </div>
          ))
        )}
        </div>

        {/* Sell Item Button */}
        <div className="sell-button-wrapper">
          <button className="sell-item-btn" onClick={handleSellItem}>
            <Plus size={18} />
            <span>Sell Item</span>
          </button>
        </div>
          </div>
        </div>
        </div>
      )}
        </div>

      {/* Right Sidebar - Only show in browse view */}
      {!selectedGame && (
        <div 
          className="market-sidebar-right"
          style={{ 
            '--window-width': windowWidth,
            '--sidebar-scale': Math.max(0.8, Math.min(1.2, windowWidth / 1120))
          }}
        >
          <aside 
            className={`market-sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}
            style={{ 
              width: isSidebarCollapsed ? COLLAPSED_WIDTH : marketRightSidebarWidth
            }}
          >
            {!isSidebarCollapsed && (
              <div 
                className="market-sidebar-title"
                style={{
                  fontSize: `${sidebarStyles.titleFontSize}px`,
                  padding: `${sidebarStyles.titlePadding.vertical}px ${sidebarStyles.titlePadding.horizontal}px ${sidebarStyles.titlePadding.bottom}px ${sidebarStyles.titlePadding.horizontal}px`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px'
                }}
              >
                <span>Market</span>
                <button
                  className="market-sidebar-close-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsSidebarCollapsed(true);
                    try {
                      localStorage.setItem('marketSidebarCollapsed', 'true');
                    } catch (_) {}
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'rgba(255, 255, 255, 0.6)',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '4px',
                    transition: 'none'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                    e.currentTarget.style.color = 'rgba(255, 255, 255, 0.9)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)';
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            )}
            {isSidebarCollapsed && (
              <div 
                className="market-sidebar-collapsed-header"
                style={{
                  padding: '20px 8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
                onClick={() => {
                  setIsSidebarCollapsed(false);
                  try {
                    localStorage.setItem('marketSidebarCollapsed', 'false');
                  } catch (_) {}
                }}
              >
                <ChevronLeft size={20} style={{ color: 'rgba(255, 255, 255, 0.6)' }} />
              </div>
            )}
            {!isSidebarCollapsed && (
              <nav 
                className="market-sidebar-nav"
                style={{
                  padding: `${sidebarStyles.navPadding}px 0`,
                  gap: `${sidebarStyles.navGap}px`
                }}
              >
                {/* Main Section - Browse */}
                <div 
                  className="market-sidebar-nav-section market-sidebar-nav-main"
                  style={{
                    paddingBottom: `${sidebarStyles.sectionPaddingBottom}px`
                  }}
                >
                  <button 
                    className={`market-sidebar-nav-item market-sidebar-nav-main-item ${marketView === 'browse' ? 'active' : ''}`}
                    onClick={() => setMarketView('browse')}
                    style={{
                      fontSize: `${sidebarStyles.mainItemFontSize}px`,
                      padding: `${sidebarStyles.mainItemPadding.vertical}px ${sidebarStyles.mainItemPadding.horizontal}px`
                    }}
                  >
                    <ShoppingBag size={sidebarStyles.mainItemIconSize} />
                    <span>Browse</span>
                  </button>
                </div>

                <div className="market-sidebar-nav-section">
                  <h3 
                    className="market-sidebar-section-title"
                    style={{
                      fontSize: `${sidebarStyles.sectionTitleFontSize}px`,
                      padding: `0 ${sidebarStyles.sectionTitlePadding.horizontal}px ${sidebarStyles.sectionTitlePadding.bottom}px ${sidebarStyles.sectionTitlePadding.horizontal}px`
                    }}
                  >
                    Marketplace
                  </h3>
                  <button 
                    className={`market-sidebar-nav-item ${marketView === 'featured' ? 'active' : ''}`}
                    onClick={() => setMarketView('featured')}
                    style={{
                      fontSize: `${sidebarStyles.navItemFontSize}px`,
                      padding: `${sidebarStyles.navItemPadding.vertical}px ${sidebarStyles.navItemPadding.horizontal}px`,
                      gap: `${sidebarStyles.navItemGap}px`
                    }}
                  >
                    <BarChart3 size={sidebarStyles.navItemIconSize} />
                    <span>Top Markets</span>
                  </button>
                  <button 
                    className={`market-sidebar-nav-item ${marketView === 'trending' ? 'active' : ''}`}
                    onClick={() => setMarketView('trending')}
                    style={{
                      fontSize: `${sidebarStyles.navItemFontSize}px`,
                      padding: `${sidebarStyles.navItemPadding.vertical}px ${sidebarStyles.navItemPadding.horizontal}px`,
                      gap: `${sidebarStyles.navItemGap}px`
                    }}
                  >
                    <TrendingUp size={sidebarStyles.navItemIconSize} />
                    <span>Trending</span>
                  </button>
                </div>
                
                <div className="market-sidebar-nav-section">
                  <h3 
                    className="market-sidebar-section-title"
                    style={{
                      fontSize: `${sidebarStyles.sectionTitleFontSize}px`,
                      padding: `0 ${sidebarStyles.sectionTitlePadding.horizontal}px ${sidebarStyles.sectionTitlePadding.bottom}px ${sidebarStyles.sectionTitlePadding.horizontal}px`
                    }}
                  >
                    My Activity
                  </h3>
                  <button 
                    className={`market-sidebar-nav-item ${marketView === 'favorites' ? 'active' : ''}`}
                    onClick={() => setMarketView('favorites')}
                    style={{
                      fontSize: `${sidebarStyles.navItemFontSize}px`,
                      padding: `${sidebarStyles.navItemPadding.vertical}px ${sidebarStyles.navItemPadding.horizontal}px`,
                      gap: `${sidebarStyles.navItemGap}px`
                    }}
                  >
                    <Eye size={sidebarStyles.navItemIconSize} />
                    <span>Watchlist</span>
                  </button>
                  <button 
                    className={`market-sidebar-nav-item ${marketView === 'stats' ? 'active' : ''}`}
                    onClick={() => setMarketView('stats')}
                    style={{
                      fontSize: `${sidebarStyles.navItemFontSize}px`,
                      padding: `${sidebarStyles.navItemPadding.vertical}px ${sidebarStyles.navItemPadding.horizontal}px`,
                      gap: `${sidebarStyles.navItemGap}px`
                    }}
                  >
                    <BarChart3 size={sidebarStyles.navItemIconSize} />
                    <span>Analytics</span>
                  </button>
                </div>
                
                <div className="market-sidebar-nav-section">
                  <h3 
                    className="market-sidebar-section-title"
                    style={{
                      fontSize: `${sidebarStyles.sectionTitleFontSize}px`,
                      padding: `0 ${sidebarStyles.sectionTitlePadding.horizontal}px ${sidebarStyles.sectionTitlePadding.bottom}px ${sidebarStyles.sectionTitlePadding.horizontal}px`
                    }}
                  >
                    Community
                  </h3>
                  <button 
                    className={`market-sidebar-nav-item ${marketView === 'petitions' ? 'active' : ''}`}
                    onClick={() => setMarketView('petitions')}
                    style={{
                      fontSize: `${sidebarStyles.navItemFontSize}px`,
                      padding: `${sidebarStyles.navItemPadding.vertical}px ${sidebarStyles.navItemPadding.horizontal}px`,
                      gap: `${sidebarStyles.navItemGap}px`
                    }}
                  >
                    <Users size={sidebarStyles.navItemIconSize} />
                    <span>Petitions</span>
                  </button>
                </div>
              </nav>
            )}
          </aside>
        </div>
      )}
      </div>

      {/* Sell Modal */}
      {showSellModal && sellStep === 1 && (
        <div className="modal-overlay" onMouseDown={(e) => {
          if (e.target === e.currentTarget) {
            handleCancelSell();
          }
        }}>
          <div className="sell-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="sell-modal-header">
              <h3>Select Items to Sell</h3>
              <button className="modal-close-btn" onClick={handleCancelSell}>✕</button>
            </div>
            
            <div className="inventory-controls">
              <input 
                type="text" 
                placeholder="Search items..."
                className="inventory-search"
                value={inventorySearch}
                onChange={(e) => setInventorySearch(e.target.value)}
              />
              <select 
                className="inventory-filter"
                value={inventoryGameFilter}
                onChange={(e) => setInventoryGameFilter(e.target.value)}
              >
                <option value="all">All Games</option>
                {inventoryGames.map(game => (
                  <option key={game.id} value={game.id}>{game.name}</option>
                ))}
              </select>
              <select 
                className="inventory-filter"
                value={inventoryRarityFilter}
                onChange={(e) => setInventoryRarityFilter(e.target.value)}
              >
                <option value="all">All Rarities</option>
                <option value="common">Common</option>
                <option value="rare">Rare</option>
                <option value="epic">Epic</option>
                <option value="legendary">Legendary</option>
              </select>
            </div>

            <div className="inventory-grid">
              {filteredInventoryItems.length === 0 ? (
                <div className="inventory-empty">
                  {allInventoryItems.length === 0 
                    ? 'No items in inventory' 
                    : `Nothing found for "${inventorySearch}"`}
                </div>
              ) : (
                filteredInventoryItems.map((item, index) => {
                  const isSelected = selectedItems.some(i => 
                    i.gameId === item.gameId && i.id === item.id
                  );
                  return (
                    <div 
                      key={`${item.gameId}-${item.id || index}`} 
                      className={`inventory-item-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleItemSelect(item)}
                    >
                      <div className="inventory-item-image">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            onError={(e) => {
                              e.target.style.display = 'none';
                              if (e.target.nextSibling) {
                                e.target.nextSibling.style.display = 'flex';
                              }
                            }}
                          />
                        ) : null}
                        <div className="inventory-item-icon" style={{ display: item.imageUrl ? 'none' : 'flex' }}>
                          {item.image || '📦'}
                        </div>
                        <div className={`inventory-rarity-badge rarity-${(item.rarity || 'common').toLowerCase()}`}>
                          {(item.rarity || 'common').toUpperCase()}
                        </div>
                      </div>
                      <div className={`inventory-rarity-line rarity-${(item.rarity || 'common').toLowerCase()}`}></div>
                      <div className="inventory-item-info">
                        <div className="inventory-item-header">
                          <h3 className="inventory-item-name">{item.name || 'Unnamed Item'}</h3>
                          {item.gameName && (
                            <span className="inventory-game-badge">{item.gameName}</span>
                          )}
                        </div>
                        {item.description && (
                          <p className="inventory-item-description">{item.description}</p>
                        )}
                        <div className="inventory-item-footer">
                          <span className="inventory-item-type">{item.type || 'Item'}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="sell-modal-footer">
              <button onClick={handleCancelSell}>Cancel</button>
              <button 
                className="confirm-btn" 
                onClick={handleConfirmItems}
                disabled={selectedItems.length === 0}
              >
                Continue ({selectedItems.length} selected)
              </button>
            </div>
          </div>
        </div>
      )}

      {showSellModal && sellStep === 2 && (
        <div className="modal-overlay" onMouseDown={(e) => {
          if (e.target === e.currentTarget) {
            handleCancelSell();
          }
        }}>
          <div className="sell-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="sell-modal-header">
              <h3>Review & Confirm Prices</h3>
              <button className="modal-close-btn" onClick={handleCancelSell}>✕</button>
            </div>
            
            <div className="pricing-section">
              {selectedItems.map(item => (
                <div key={item.id} className="pricing-item">
                  <div className="pricing-item-left">
                    <div className="pricing-item-icon">{item.image}</div>
                    <div className="pricing-item-info">
                      <h4>{item.name}</h4>
                      <span className="pricing-category">{item.category}</span>
                    </div>
                  </div>
                  <div className="pricing-item-center">
                    <div className="pricing-input-group">
                      <span className="pricing-input-label">Buyer pays</span>
                      <div className="pricing-input-wrapper">
                        <span className="price-sizer">
                          {itemPrices[item.id] !== undefined ? itemPrices[item.id] : item.marketPrice}
                        </span>
                        <input 
                          type="text" 
                          placeholder="0"
                          className="price-input"
                          value={itemPrices[item.id] !== undefined ? itemPrices[item.id] : item.marketPrice}
                          onChange={(e) => handlePriceChange(item.id, e.target.value, itemPrices[item.id] !== undefined ? itemPrices[item.id] : item.marketPrice)}
                          onFocus={(e) => {
                            const currentValue = itemPrices[item.id] !== undefined ? itemPrices[item.id] : item.marketPrice;
                            if (currentValue === 0) {
                              e.target.value = '';
                            }
                          }}
                          onBlur={(e) => {
                            const numValue = parseFloat(e.target.value);
                            if (e.target.value === '' || isNaN(numValue)) {
                              setItemPrices(prev => ({
                                ...prev,
                                [item.id]: 0
                              }));
                            } else {
                              const rounded = Math.round(numValue * 100) / 100;
                              setItemPrices(prev => ({
                                ...prev,
                                [item.id]: rounded
                              }));
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="pricing-item-right">
                    <div className="pricing-market-info">
                      <div className="market-stat">
                        <span className="stat-label">Seller gets</span>
                        <span className="stat-value positive">+${(() => {
                          const price = itemPrices[item.id] !== undefined ? itemPrices[item.id] : item.marketPrice;
                          const numPrice = parseFloat(price) || 0;
                          return (numPrice * 0.99).toFixed(2);
                        })()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Total Section */}
            <div className="pricing-total">
              <div className="pricing-total-divider"></div>
              <div className="pricing-fee-total">
                <span className="fee-label">Kinma fee (1%)</span>
                <span className="fee-value negative">
                  -${selectedItems.reduce((sum, item) => {
                    const price = itemPrices[item.id] !== undefined ? itemPrices[item.id] : item.marketPrice;
                    const numPrice = parseFloat(price) || 0;
                    return sum + (numPrice * 0.01);
                  }, 0).toFixed(2)}
                </span>
              </div>
              <div className="pricing-total-content">
                <div className="total-label">Total</div>
                <div className="total-value">
                  +${selectedItems.reduce((sum, item) => {
                    const price = itemPrices[item.id] !== undefined ? itemPrices[item.id] : item.marketPrice;
                    const numPrice = parseFloat(price) || 0;
                    return sum + (numPrice * 0.99);
                  }, 0).toFixed(2)}
                </div>
              </div>
            </div>

            <div className="sell-modal-footer">
              <button onClick={() => setSellStep(1)}>Back</button>
              <button className="confirm-btn" onClick={() => {
                if (!selectedGame) return;
                
                const gameId = selectedGame.id || selectedGame.gameId;
                if (!gameId) return;
                
                // Get current market items
                const currentMarketItems = getUserData(`marketItems_${gameId}`, []);
                
                // Check for duplicate listings (items already listed)
                const listedItemIds = new Set(
                  currentMarketItems
                    .filter(mi => mi.status === 'active')
                    .map(mi => `${mi.gameId || gameId}_${mi.originalItemId || mi.id}`)
                );
                
                // Filter out items that are already listed
                const itemsToList = selectedItems.filter(item => {
                  const itemKey = `${item.gameId || gameId}_${item.id}`;
                  return !listedItemIds.has(itemKey);
                });
                
                if (itemsToList.length === 0) {
                  alert('All selected items are already listed in the marketplace!');
                  return;
                }
                
                if (itemsToList.length < selectedItems.length) {
                  const skipped = selectedItems.length - itemsToList.length;
                  alert(`${skipped} item(s) were skipped because they are already listed.`);
                }
                
                // Create new market listings
                const timestamp = Date.now();
                const newListings = itemsToList.map(item => {
                  const price = itemPrices[item.id] !== undefined 
                    ? parseFloat(itemPrices[item.id]) || 0 
                    : (item.marketPrice || 0);
                  
                  return {
                    id: `${item.gameId || gameId}_${item.id}_${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
                    originalItemId: item.id,
                    gameId: item.gameId || gameId,
                    name: item.name || 'Unnamed Item',
                    description: item.description || '',
                    imageUrl: item.imageUrl || null,
                    image: item.image || '📦',
                    rarity: item.rarity || 'common',
                    type: item.type || 'Item',
                    category: item.category || 'Item',
                    price: price,
                    seller: getUserData('username', 'Unknown'),
                    listedAt: timestamp,
                    status: 'active'
                  };
                });
                
                // Add new listings to market
                const updatedMarketItems = [...currentMarketItems, ...newListings];
                saveUserData(`marketItems_${gameId}`, updatedMarketItems);
                
                // Remove items from inventory (only items that were actually listed)
                itemsToList.forEach(item => {
                  const itemGameId = item.gameId || gameId;
                  const inventory = getUserData(`inventory_${itemGameId}`, []);
                  const updatedInventory = inventory.filter(invItem => 
                    !(invItem.id === item.id && invItem.gameId === itemGameId)
                  );
                  saveUserData(`inventory_${itemGameId}`, updatedInventory);
                });
                
                // Refresh inventory and market items
                setInventoryRefresh(prev => prev + 1);
                setMarketItemsRefresh(prev => prev + 1);
                
                // Close modal and reset
                setShowSellModal(false);
                setSellStep(1);
                setSelectedItems([]);
                setItemPrices({});
              }}>
                Confirm & List ({selectedItems.length} items)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Item Detail Modal */}
      {showItemDetailModal && selectedItemDetail && (
        <>
          {!isViewMaximized && (
            <div className="modal-overlay" onMouseDown={(e) => {
              if (e.target === e.currentTarget) {
                setShowItemDetailModal(false);
                setSelectedItemDetail(null);
                setIsViewMaximized(false);
              }
            }}>
              <div className="item-detail-modal" onClick={(e) => e.stopPropagation()}>
                <div className="item-detail-header">
                  <h3>{selectedItemDetail.name}</h3>
                  <button className="modal-close-btn" onClick={() => {
                    setShowItemDetailModal(false);
                    setSelectedItemDetail(null);
                    setIsViewMaximized(false);
                  }}>✕</button>
                </div>
                
                <div className="item-detail-content">
                  {/* 3D Model View */}
                  <Item3DView
                    imageUrl={selectedItemDetail.imageUrl}
                    image={selectedItemDetail.image}
                    name={selectedItemDetail.name}
                    isMaximized={isViewMaximized}
                    onMaximizeToggle={() => setIsViewMaximized(prev => !prev)}
                    maxZoom={isViewMaximized ? 4 : 2}
                  />
              
              {/* Item Info */}
              <div className="item-detail-info">
                <div className="item-detail-section">
                  <h4 className="item-detail-section-title">Item Information</h4>
                  <div className="item-detail-grid">
                    <div className="item-detail-item">
                      <span className="item-detail-label">Name</span>
                      <span className="item-detail-value">{selectedItemDetail.name}</span>
                    </div>
                    <div className="item-detail-item">
                      <span className="item-detail-label">Rarity</span>
                      <span className={`item-detail-value rarity-${(selectedItemDetail.rarity || 'common').toLowerCase()}`}>
                        {(selectedItemDetail.rarity || 'common').toUpperCase()}
                      </span>
                    </div>
                    <div className="item-detail-item">
                      <span className="item-detail-label">Type</span>
                      <span className="item-detail-value">{selectedItemDetail.type || 'Item'}</span>
                    </div>
                    <div className="item-detail-item">
                      <span className="item-detail-label">Category</span>
                      <span className="item-detail-value">{selectedItemDetail.category || 'Item'}</span>
                    </div>
                    <div className="item-detail-item full-width">
                      <span className="item-detail-label">Description</span>
                      <span className="item-detail-value">{selectedItemDetail.description || 'No description available.'}</span>
                    </div>
                  </div>
                </div>
                
                <div className="item-detail-section">
                  <h4 className="item-detail-section-title">Market Information</h4>
                  <div className="item-detail-grid">
                    <div className="item-detail-item">
                      <span className="item-detail-label">Price</span>
                      <span className="item-detail-value price">${selectedItemDetail.price.toFixed(2)}</span>
                    </div>
                    <div className="item-detail-item">
                      <span className="item-detail-label">Seller</span>
                      <span className="item-detail-value">{selectedItemDetail.seller || 'Unknown'}</span>
                    </div>
                    <div className="item-detail-item">
                      <span className="item-detail-label">Listed</span>
                      <span className="item-detail-value">{formatListedAt(selectedItemDetail.listedAt)}</span>
                    </div>
                    <div className="item-detail-item">
                      <span className="item-detail-label">Status</span>
                      <span className="item-detail-value">{selectedItemDetail.status || 'Active'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
             
              <div className="item-detail-footer">
                <button 
                  className="item-detail-btn secondary"
                  onClick={() => {
                    setShowItemDetailModal(false);
                    setSelectedItemDetail(null);
                    setIsViewMaximized(false);
                  }}
                >
                  Close
                </button>
                <button 
                  className="item-detail-btn primary"
                  onClick={() => {
                    handleBuyItem(selectedItemDetail.id);
                    setShowItemDetailModal(false);
                    setSelectedItemDetail(null);
                    setIsViewMaximized(false);
                  }}
                >
                  Buy Now
                </button>
              </div>
            </div>
          </div>
          )}
          
          {/* Maximized 3D View */}
          {isViewMaximized && (
            <div className="item-3d-view-maximized">
              <Item3DView
                imageUrl={selectedItemDetail.imageUrl}
                image={selectedItemDetail.image}
                name={selectedItemDetail.name}
                isMaximized={true}
                onMaximizeToggle={() => setIsViewMaximized(false)}
                maxZoom={4}
              />
            </div>
          )}
        </>
      )}


    </div>
  );
};

export default Market;