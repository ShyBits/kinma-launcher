import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShoppingCart, Plus, ShoppingBag, Eye, EyeOff, Grid, List, ArrowLeft, Crown, TrendingUp, TrendingDown, Zap, Clock, Star, Users, Flame, ArrowRight, Sparkles, BarChart3, DollarSign, TrendingUp as TrendingUpIcon, PieChart, Target, Award, Activity, ArrowUpRight, ArrowDownRight, FileText, CheckCircle2, UserPlus, Search, X, ChevronLeft } from 'lucide-react';
import { getUserData, saveUserData, getAllUsersData } from '../utils/UserDataManager';
import './Market.css';


// User inventory will be loaded from account-separated storage
const getUserInventory = (gameId) => {
  try {
    return getUserData(`inventory_${gameId}`, []);
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
  const [watchedItems, setWatchedItems] = useState(new Set());
  const [showSellModal, setShowSellModal] = useState(false);
  const [showQuickBuyModal, setShowQuickBuyModal] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [sellStep, setSellStep] = useState(1); // 1: inventory selection, 2: pricing
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryFilter, setInventoryFilter] = useState('all');
  const [itemPrices, setItemPrices] = useState({});
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
    const loadCustomGames = () => {
      try {
        // Get all games from all users for the Market (shared marketplace)
        const allGames = getAllUsersData('customGames');
        // Filter to only show published games with marketplace enabled
        const marketGames = allGames.filter(game => {
          const status = game.status || game.fullFormData?.status || 'draft';
          const marketEnabled = game.fullFormData?.marketEnabled !== false; // Default to true
          return (status === 'public' || status === 'published') && marketEnabled;
        });
        setCustomGames(marketGames);
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
  }, [selectedGame]);

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
    const isSelected = selectedItems.some(i => i.id === item.id);
    if (isSelected) {
      setSelectedItems(selectedItems.filter(i => i.id !== item.id));
    } else {
      setSelectedItems([...selectedItems, item]);
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

  // If no game is selected, show game selection
  if (!selectedGame) {
    return (
      <div className="market">
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

        {/* Right Sidebar Navigation - Inside Content */}
        <div 
          className="marketplace-content-right"
          style={{ 
            '--window-width': windowWidth,
            '--sidebar-scale': Math.max(0.8, Math.min(1.2, windowWidth / 1120))
          }}
        >
          {/* Right Sidebar Navigation */}
          <aside 
            className={`marketplace-sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}
            style={{ 
              width: isSidebarCollapsed ? COLLAPSED_WIDTH : marketRightSidebarWidth
            }}
          >
            {!isSidebarCollapsed && (
              <div 
                className="sidebar-title"
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
                  className="sidebar-close-btn"
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
                    transition: 'all 0.2s ease'
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
                className="sidebar-collapsed-header"
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
                className="sidebar-nav"
                style={{
                  padding: `${sidebarStyles.navPadding}px 0`,
                  gap: `${sidebarStyles.navGap}px`
                }}
              >
                {/* Main Section - Browse */}
                <div 
                  className="sidebar-nav-section sidebar-nav-main"
                  style={{
                    paddingBottom: `${sidebarStyles.sectionPaddingBottom}px`
                  }}
                >
                  <button 
                    className={`sidebar-nav-item sidebar-nav-main-item ${marketView === 'browse' ? 'active' : ''}`}
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
                
                <div className="sidebar-nav-section">
                  <h3 
                    className="sidebar-section-title"
                    style={{
                      fontSize: `${sidebarStyles.sectionTitleFontSize}px`,
                      padding: `0 ${sidebarStyles.sectionTitlePadding.horizontal}px ${sidebarStyles.sectionTitlePadding.bottom}px ${sidebarStyles.sectionTitlePadding.horizontal}px`
                    }}
                  >
                    Marketplace
                  </h3>
                  <button 
                    className={`sidebar-nav-item ${marketView === 'featured' ? 'active' : ''}`}
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
                    className={`sidebar-nav-item ${marketView === 'trending' ? 'active' : ''}`}
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
                
                <div className="sidebar-nav-section">
                  <h3 
                    className="sidebar-section-title"
                    style={{
                      fontSize: `${sidebarStyles.sectionTitleFontSize}px`,
                      padding: `0 ${sidebarStyles.sectionTitlePadding.horizontal}px ${sidebarStyles.sectionTitlePadding.bottom}px ${sidebarStyles.sectionTitlePadding.horizontal}px`
                    }}
                  >
                    My Activity
                  </h3>
                  <button 
                    className={`sidebar-nav-item ${marketView === 'favorites' ? 'active' : ''}`}
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
                    className={`sidebar-nav-item ${marketView === 'stats' ? 'active' : ''}`}
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
                
                <div className="sidebar-nav-section">
                  <h3 
                    className="sidebar-section-title"
                    style={{
                      fontSize: `${sidebarStyles.sectionTitleFontSize}px`,
                      padding: `0 ${sidebarStyles.sectionTitlePadding.horizontal}px ${sidebarStyles.sectionTitlePadding.bottom}px ${sidebarStyles.sectionTitlePadding.horizontal}px`
                    }}
                  >
                    Community
                  </h3>
                  <button 
                    className={`sidebar-nav-item ${marketView === 'petitions' ? 'active' : ''}`}
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

  const filteredItems = marketItems.filter(item => 
    rarityFilter === 'all' || item.rarity.toLowerCase() === rarityFilter.toLowerCase()
  );

  const sortedItems = [...filteredItems].sort((a, b) => {
    switch (sortBy) {
      case 'price-low': return a.price - b.price;
      case 'price-high': return b.price - a.price;
      default: return 0;
    }
  });

  return (
    <div className="market">
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

      {/* Marketplace Section */}
      <div className="marketplace-section">
        {/* Game Banner */}
        <div className="market-banner" style={{backgroundImage: `url(${selectedGame.image})`}}>
          <div className="banner-overlay"></div>
          <div className="banner-content">
            <button className="back-btn" onClick={handleBackToGames} title="Back to Games">
              <ArrowLeft size={18} />
            </button>
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
          </div>
        </div>

        {/* Market Content Container */}
        <div className="marketplace-content-wrapper">
        {/* Market Stats Bar */}
        <div className="market-stats-bar">
          <div className="stats-wrapper">
            <div className="stat-box">
              <div className="stat-value">$12,450</div>
              <div className="stat-label">24H VOLUME</div>
            </div>
            <div className="stat-box">
              <div className="stat-value">1,234</div>
              <div className="stat-label">ACTIVE LISTINGS</div>
            </div>
            <div className="stat-box">
              <div className="stat-value">$3.25 - $89.99</div>
              <div className="stat-label">PRICE RANGE</div>
            </div>
            <div className="stat-box">
              <div className="stat-value positive">+5.2%</div>
              <div className="stat-label">MARKET TREND</div>
            </div>
          </div>
        </div>

        {/* Items Grid Controls */}
        <div className="items-grid-controls" style={{ '--content-width': `${contentWidth}px` }}>
          <div className="items-grid-controls-left">
            <div className="items-count">{sortedItems.length} {sortedItems.length === 1 ? 'item' : 'items'}</div>
          </div>
          <div className="items-grid-controls-right">
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
        <div className={`items-grid ${viewMode === 'grid' ? 'grid-view' : 'row-view'}`}>
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
          <div key={item.id} className="market-item-card">
            <div className="item-image-container">
              <img 
                src={item.imageUrl} 
                alt={item.name}
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div className="item-icon-large" style={{display: 'none'}}>{item.image}</div>
            </div>
            
            {viewMode === 'row' && <div className={`rarity-line-vertical rarity-${item.rarity.toLowerCase()}`}></div>}
            
            <div className={`rarity-line rarity-${item.rarity.toLowerCase()}`}></div>
            
            <div className="item-details">
              <div className="item-name-row">
                <h3 className="item-name-large">{item.name}</h3>
                <span className="seller-name">{item.seller}</span>
              </div>
              
              <div className="item-meta-row">
                <span className="listed-at-text">{item.listedAt ? `Listed ${item.listedAt}` : 'Listed recently'}</span>
              </div>
              
              <div className="item-bottom-row">
                <div className="item-price-row">
                  <span className="price-value">${item.price.toFixed(2)}</span>
                </div>
                
                <div className="item-action-buttons">
                  <button className="buy-now-btn" onClick={() => handleBuyItem(item.id)}>Buy</button>
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

        {/* Right Sidebar Navigation - Inside Content */}
        <div 
          className="marketplace-content-right"
          style={{ 
            '--window-width': windowWidth,
            '--sidebar-scale': Math.max(0.8, Math.min(1.2, windowWidth / 1120))
          }}
        >
          {/* Right Sidebar Navigation */}
          <aside 
            className={`marketplace-sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}
            style={{ 
              width: isSidebarCollapsed ? COLLAPSED_WIDTH : marketRightSidebarWidth
            }}
          >
            {!isSidebarCollapsed && (
              <div 
                className="sidebar-title"
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
                  className="sidebar-close-btn"
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
                    transition: 'all 0.2s ease'
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
                className="sidebar-collapsed-header"
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
                className="sidebar-nav"
                style={{
                  padding: `${sidebarStyles.navPadding}px 0`,
                  gap: `${sidebarStyles.navGap}px`
                }}
              >
                {/* Main Section - Browse */}
                <div 
                  className="sidebar-nav-section sidebar-nav-main"
                  style={{
                    paddingBottom: `${sidebarStyles.sectionPaddingBottom}px`
                  }}
                >
                  <button 
                    className={`sidebar-nav-item sidebar-nav-main-item ${marketView === 'browse' ? 'active' : ''}`}
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
                
                <div className="sidebar-nav-section">
                  <h3 
                    className="sidebar-section-title"
                    style={{
                      fontSize: `${sidebarStyles.sectionTitleFontSize}px`,
                      padding: `0 ${sidebarStyles.sectionTitlePadding.horizontal}px ${sidebarStyles.sectionTitlePadding.bottom}px ${sidebarStyles.sectionTitlePadding.horizontal}px`
                    }}
                  >
                    Marketplace
                  </h3>
                  <button 
                    className={`sidebar-nav-item ${marketView === 'featured' ? 'active' : ''}`}
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
                    className={`sidebar-nav-item ${marketView === 'trending' ? 'active' : ''}`}
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
                
                <div className="sidebar-nav-section">
                  <h3 
                    className="sidebar-section-title"
                    style={{
                      fontSize: `${sidebarStyles.sectionTitleFontSize}px`,
                      padding: `0 ${sidebarStyles.sectionTitlePadding.horizontal}px ${sidebarStyles.sectionTitlePadding.bottom}px ${sidebarStyles.sectionTitlePadding.horizontal}px`
                    }}
                  >
                    My Activity
                  </h3>
                  <button 
                    className={`sidebar-nav-item ${marketView === 'favorites' ? 'active' : ''}`}
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
                    className={`sidebar-nav-item ${marketView === 'stats' ? 'active' : ''}`}
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
                
                <div className="sidebar-nav-section">
                  <h3 
                    className="sidebar-section-title"
                    style={{
                      fontSize: `${sidebarStyles.sectionTitleFontSize}px`,
                      padding: `0 ${sidebarStyles.sectionTitlePadding.horizontal}px ${sidebarStyles.sectionTitlePadding.bottom}px ${sidebarStyles.sectionTitlePadding.horizontal}px`
                    }}
                  >
                    Community
                  </h3>
                  <button 
                    className={`sidebar-nav-item ${marketView === 'petitions' ? 'active' : ''}`}
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
                value={inventoryFilter}
                onChange={(e) => setInventoryFilter(e.target.value)}
              >
                <option value="all">All Categories</option>
                <option value="Weapon">Weapon</option>
                <option value="Armor">Armor</option>
                <option value="Consumable">Consumable</option>
                <option value="Accessory">Accessory</option>
              </select>
            </div>

            <div className="inventory-grid">
              {(() => {
                const userInventory = getUserInventory(gameId);
                const filteredItems = userInventory.filter(item =>
                  item.name.toLowerCase().includes(inventorySearch.toLowerCase()) &&
                  (inventoryFilter === 'all' || item.category === inventoryFilter)
                );
                
                if (filteredItems.length === 0) {
                  return (
                    <div className="inventory-empty">
                      Nothing found for "{inventorySearch}"
                    </div>
                  );
                }
                
                return filteredItems.map(item => (
                  <div 
                    key={item.id} 
                    className={`inventory-item ${selectedItems.some(i => i.id === item.id) ? 'selected' : ''}`}
                    onClick={() => handleItemSelect(item)}
                  >
                    <div className="inventory-item-content">
                      <div className="inventory-item-icon">{item.image}</div>
                      <div className="inventory-item-title">{item.name}</div>
                    </div>
                    <div className={`rarity-line rarity-${item.rarity.toLowerCase()}`}></div>
                  </div>
                ));
              })()}
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
                // Add items to marketItems with current timestamp
                const timestamp = Date.now();
                const getTimeAgo = () => {
                  const seconds = Math.floor((Date.now() - timestamp) / 1000);
                  if (seconds < 60) return 'just now';
                  const minutes = Math.floor(seconds / 60);
                  if (minutes < 60) return `${minutes}m ago`;
                  const hours = Math.floor(minutes / 60);
                  if (hours < 24) return `${hours}h ago`;
                  const days = Math.floor(hours / 24);
                  return `${days}d ago`;
                };
                alert('Items listed on market!');
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

    </div>
  );
};

export default Market;