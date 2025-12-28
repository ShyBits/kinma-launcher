import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { ShoppingCart, Plus, Minus, ShoppingBag, Eye, EyeOff, Grid, List, ArrowLeft, Crown, TrendingUp, TrendingDown, Zap, Clock, Star, Users, Flame, ArrowRight, Sparkles, BarChart3, DollarSign, TrendingUp as TrendingUpIcon, PieChart, Target, Award, Activity, ArrowUpRight, ArrowDownRight, FileText, CheckCircle2, UserPlus, Search, X, ChevronLeft, RotateCw, RotateCcw, Maximize2, Minimize2, GitCompare, Flag, CheckSquare, Square, SlidersHorizontal, MousePointer2, ArrowUp, ArrowDown } from 'lucide-react';
import { getUserData, saveUserData, getAllUsersData, getCurrentUserId } from '../utils/UserDataManager';
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
const getAllInventoryItems = async () => {
  try {
    const allItems = [];
    
    // Get all games from all users
    const allGames = await getAllUsersData('customGames');
    
    // Create a map of gameId to game name
    const gameMap = {};
    allGames.forEach(game => {
      const gameId = game.gameId || game.id;
      if (gameId) {
        gameMap[gameId] = game.name || game.gameName || gameId;
      }
    });
    
    // Always add dummy game for testing
    const dummyGameId = 'dummy-game-1';
    const dummyGameName = 'Dummy Game';
    gameMap[dummyGameId] = dummyGameName;
    
    // If no games exist, create dummy data for a default game
    if (allGames.length === 0) {
      const defaultGameId = 'default-game';
      const defaultGameName = 'Default Game';
      gameMap[defaultGameId] = defaultGameName;
    }
    
    // Initialize dummy data if no inventory exists
    const initializeDummyInventory = async (gameId, gameName) => {
      const existingInventory = await getUserData(`inventory_${gameId}`, []);
      if (!existingInventory || existingInventory.length === 0) {
        const dummyItems = [
          {
            id: `dummy-${gameId}-1`,
            name: 'Epic Sword',
            description: 'A powerful legendary weapon with enhanced damage',
            rarity: 'epic',
            type: 'Weapon',
            image: '⚔️',
            gameId: gameId,
            gameName: gameName
          },
          {
            id: `dummy-${gameId}-2`,
            name: 'Rare Shield',
            description: 'A sturdy defensive item that blocks incoming attacks',
            rarity: 'rare',
            type: 'Armor',
            image: '🛡️',
            gameId: gameId,
            gameName: gameName
          },
          {
            id: `dummy-${gameId}-3`,
            name: 'Legendary Potion',
            description: 'Restores health completely and grants temporary buffs',
            rarity: 'legendary',
            type: 'Consumable',
            image: '🧪',
            gameId: gameId,
            gameName: gameName
          },
          {
            id: `dummy-${gameId}-4`,
            name: 'Common Boots',
            description: 'Basic footwear that provides minimal protection',
            rarity: 'common',
            type: 'Armor',
            image: '👢',
            gameId: gameId,
            gameName: gameName
          },
          {
            id: `dummy-${gameId}-5`,
            name: 'Rare Helmet',
            description: 'Protective headgear with moderate defense',
            rarity: 'rare',
            type: 'Armor',
            image: '⛑️',
            gameId: gameId,
            gameName: gameName
          },
          {
            id: `dummy-${gameId}-6`,
            name: 'Epic Bow',
            description: 'A long-range weapon with high accuracy',
            rarity: 'epic',
            type: 'Weapon',
            image: '🏹',
            gameId: gameId,
            gameName: gameName
          }
        ];
        await saveUserData(`inventory_${gameId}`, dummyItems);
        return dummyItems;
      }
      return existingInventory;
    };
    
    // Get inventory for each game
    for (const gameId of Object.keys(gameMap)) {
      const inventory = await initializeDummyInventory(gameId, gameMap[gameId]);
      if (inventory && Array.isArray(inventory) && inventory.length > 0) {
        inventory.forEach(item => {
          allItems.push({
            ...item,
            gameId,
            gameName: gameMap[gameId]
          });
        });
      }
    }
    
    // If no games exist, create dummy inventory for a default game
    if (allGames.length === 0 && Object.keys(gameMap).length === 0) {
      const defaultGameId = 'default-game';
      const defaultGameName = 'Default Game';
      const inventory = await initializeDummyInventory(defaultGameId, defaultGameName);
      if (inventory && Array.isArray(inventory) && inventory.length > 0) {
        inventory.forEach(item => {
          allItems.push({
            ...item,
            gameId: defaultGameId,
            gameName: defaultGameName
          });
        });
      }
    }
    
    // Also check localStorage directly for any inventory_ keys (for backward compatibility)
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('inventory_')) {
        const gameId = key.replace('inventory_', '');
        if (!gameMap[gameId]) {
          // Game not in customGames, use gameId as name
          gameMap[gameId] = gameId;
          // Initialize dummy data for this game too
          await initializeDummyInventory(gameId, gameId);
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

// Format price with letter abbreviations (1.00k, 1.00m, etc.)
const formatPriceCompact = (price) => {
  const num = parseFloat(price);
  if (isNaN(num)) return '0.00';
  
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(2) + 'b';
  } else if (num >= 1000000) {
    return (num / 1000000).toFixed(2) + 'm';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(2) + 'k';
  } else {
    return num.toFixed(2);
  }
};

const Market = () => {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  // Check both pathname and hash for compare-only mode (HashRouter uses hash)
  // HashRouter puts the route in location.pathname, but we also check hash for safety
  const currentPath = location.pathname + (location.hash || '');
  const isCompareOnlyMode = currentPath.includes('/market/compare') || 
                            (gameId && currentPath.includes(`/game/${gameId}/market/compare`)) || 
                            searchParams.get('compare') === 'true' ||
                            window.location.hash.includes('/market/compare') ||
                            (gameId && window.location.hash.includes(`/game/${gameId}/market/compare`));
  // Load selected game from localStorage on mount
  const [selectedGame, setSelectedGame] = useState(() => {
    try {
      const saved = localStorage.getItem('market_selected_game');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [lastSelectedGameInBrowse, setLastSelectedGameInBrowse] = useState(() => {
    try {
      const saved = localStorage.getItem('market_last_selected_game');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  }); // Remember last selected game when in browse view
  const isRestoringGameRef = useRef(false); // Track if we're restoring a game
  const [isRestoringGame, setIsRestoringGame] = useState(false); // State to track restoration for smooth rendering
  const [selectedTab, setSelectedTab] = useState('items');
  const [sortBy, setSortBy] = useState('price-low');
  const [rarityFilter, setRarityFilter] = useState(new Set(['all'])); // Multiple choice
  const [viewMode, setViewMode] = useState('grid');
  const [itemSearch, setItemSearch] = useState('');
  const [priceFilter, setPriceFilter] = useState(new Set(['all'])); // Multiple choice
  const [openFilterDropdown, setOpenFilterDropdown] = useState(null); // 'rarity', 'price', 'sort', or null
  const [selectedFilters, setSelectedFilters] = useState({
    rarity: new Set(['all']),
    price: new Set(['all']),
    sort: 'price-low'
  });
  const [watchedItems, setWatchedItems] = useState(() => {
    try {
      const stored = localStorage.getItem('watchedItems');
      if (stored) {
        const parsed = JSON.parse(stored);
        return new Set(Array.isArray(parsed) ? parsed : []);
      }
    } catch (e) {
      console.error('Error loading watched items:', e);
    }
    return new Set();
  });
  const [isSearchMode, setIsSearchMode] = useState(false);
  const searchInputRef = useRef(null);
  const [generalSearch, setGeneralSearch] = useState(''); // General search for browse/watchlist/analytics
  const searchWrapperRef = useRef(null);
  const [showSellModal, setShowSellModal] = useState(false);
  const [cartItems, setCartItems] = useState([]); // Track cart items for visual feedback
  const [showQuickBuyModal, setShowQuickBuyModal] = useState(false);
  const [showItemDetailModal, setShowItemDetailModal] = useState(false);
  const [selectedItemDetail, setSelectedItemDetail] = useState(null);
  // Load comparison items from localStorage on mount and sync between windows
  const [comparisonItems, setComparisonItems] = useState(() => {
    try {
      const stored = localStorage.getItem('market_comparison_items');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  
  // Sync comparison items to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('market_comparison_items', JSON.stringify(comparisonItems));
      // Dispatch event to sync with other windows
      window.dispatchEvent(new CustomEvent('comparison-items-updated', { detail: comparisonItems }));
    } catch (error) {
      console.error('Error saving comparison items:', error);
    }
  }, [comparisonItems]);
  
  // Load cart items on mount and listen for updates
  useEffect(() => {
    const loadCartItems = async () => {
      try {
        const userId = await getCurrentUserId();
        if (!userId) {
          setCartItems([]);
          return;
        }
        
        // Load from localStorage
        const stored = localStorage.getItem(`cartItems_${userId}`);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
              setCartItems(parsed);
            }
          } catch (e) {
            console.error('Error parsing cart items:', e);
          }
        }
      } catch (error) {
        console.error('Error loading cart items:', error);
      }
    };
    
    loadCartItems();
    
    // Listen for cart update events
    const handleCartUpdate = (event) => {
      if (event.detail && event.detail.items && Array.isArray(event.detail.items)) {
        setCartItems(event.detail.items);
      } else {
        // If no items in event, reload from localStorage
        loadCartItems();
      }
    };
    
    window.addEventListener('cart-updated', handleCartUpdate);
    return () => {
      window.removeEventListener('cart-updated', handleCartUpdate);
    };
  }, []);
  
  // Listen for comparison items updates from other windows
  useEffect(() => {
    const handleComparisonUpdate = (event) => {
      if (event.detail && Array.isArray(event.detail)) {
        // Only update if the items are actually different
        setComparisonItems(prev => {
          const prevIds = prev.map(i => i.id).sort().join(',');
          const newIds = event.detail.map(i => i.id).sort().join(',');
          if (prevIds !== newIds) {
            return event.detail;
          }
          return prev;
        });
      }
    };
    
    // Also listen to storage events for cross-window synchronization
    const handleStorageChange = (e) => {
      if (e.key === 'market_comparison_items') {
        try {
          const stored = e.newValue ? JSON.parse(e.newValue) : [];
          if (Array.isArray(stored)) {
            setComparisonItems(prev => {
              const prevIds = prev.map(i => i.id).sort().join(',');
              const newIds = stored.map(i => i.id).sort().join(',');
              if (prevIds !== newIds) {
                return stored;
              }
              return prev;
            });
          }
        } catch (error) {
          console.error('Error parsing comparison items from storage:', error);
        }
      }
    };
    
    window.addEventListener('comparison-items-updated', handleComparisonUpdate);
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('comparison-items-updated', handleComparisonUpdate);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);
  const [comparisonModalAutoOpened, setComparisonModalAutoOpened] = useState(false);
  const [comparisonModalManuallyClosed, setComparisonModalManuallyClosed] = useState(false);
  const [showAddItemsModal, setShowAddItemsModal] = useState(false);
  const popOutOpeningRef = useRef(false);
  const [referenceItemId, setReferenceItemId] = useState(null);
  const [comparisonRotations, setComparisonRotations] = useState({});
  const [comparisonZooms, setComparisonZooms] = useState({});
  const [comparisonPans, setComparisonPans] = useState({});
  const [comparisonIsRotating, setComparisonIsRotating] = useState({});
  const [comparisonIsPanning, setComparisonIsPanning] = useState({});
  const [comparisonIsResetting, setComparisonIsResetting] = useState({});
  const [expanded3DViews, setExpanded3DViews] = useState({}); // Object with item IDs as keys and boolean values for expanded state
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
  const [marketItems, setMarketItems] = useState([]); // Declare early to avoid initialization error
  const [allMarketItemsForWatchlist, setAllMarketItemsForWatchlist] = useState([]); // All market items from all games for watchlist
  const [marketView, setMarketView] = useState('browse'); // browse, petitions, featured, trending, favorites, stats
  const [customGames, setCustomGames] = useState([]);
  const [watchedGames, setWatchedGames] = useState(new Set());
  const [currentMarketItems, setCurrentMarketItems] = useState([]);
  const [expandedCards, setExpandedCards] = useState(new Set());
  
  // Virtual Scrolling State for Market Cards
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 }); // Start with first 20 items
  const gamesGridRef = useRef(null);
  const gamesGridContainerRef = useRef(null);
  const INITIAL_LOAD_COUNT = 20; // Load first 20 items initially
  const MAX_VISIBLE_ITEMS = 30; // Maximum items to keep in memory
  const ITEMS_PER_LOAD = 10; // Load 10 more items when scrolling
  const scrollThrottleRef = useRef(null);
  const [petitions, setPetitions] = useState({});
  const [showCreatePetitionForm, setShowCreatePetitionForm] = useState(false);
  const [petitionSearchQuery, setPetitionSearchQuery] = useState('');
  const [selectedPetitionGame, setSelectedPetitionGame] = useState(null);
  
  // Bid System State
  const [itemBids, setItemBids] = useState(() => {
    try {
      const stored = localStorage.getItem('market_item_bids');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }); // { itemId: { saleType: 'buy'|'bid', bidEndTime: timestamp, currentBid: number, bidHistory: [], bidDuration: minutes } }
  
  const [bidInputs, setBidInputs] = useState({}); // { itemId: { amount: number, duration: number } }
  const [soldItems, setSoldItems] = useState({}); // { itemId: true } - items that have been sold and should disappear
  const [noBidItems, setNoBidItems] = useState({}); // { itemId: true } - items that ended with no bids
  const [lockedItems, setLockedItems] = useState(() => {
    try {
      const stored = localStorage.getItem('market_locked_items');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }); // { itemId: { userId: string, timestamp: number, timeout: number } } - items locked for purchase
  const [showBidModal, setShowBidModal] = useState(false);
  const [selectedBidItem, setSelectedBidItem] = useState(null);
  const [bidModalError, setBidModalError] = useState(null);
  const [showPurchaseConfirmation, setShowPurchaseConfirmation] = useState(false);
  const [pendingPurchaseItem, setPendingPurchaseItem] = useState(null);
  
  // Current user state
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentUsername, setCurrentUsername] = useState(null);
  
  // Load current user
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const userId = await getCurrentUserId();
        const username = await getUserData('username', null);
        // Also try to get from authUser in localStorage as fallback
        let fallbackUsername = null;
        try {
          const authUser = localStorage.getItem('authUser');
          if (authUser) {
            const user = JSON.parse(authUser);
            fallbackUsername = user.name || user.username || user.email;
          }
        } catch (e) {
          // Ignore
        }
        const finalUsername = username || fallbackUsername;
        let finalUserId = userId;
        try {
          const authUser = localStorage.getItem('authUser');
          if (authUser && !finalUserId) {
            const user = JSON.parse(authUser);
            finalUserId = user.id;
          }
        } catch (e) {
          // Ignore
        }
        setCurrentUserId(finalUserId);
        setCurrentUsername(finalUsername);
        console.log('Current user loaded:', { 
          userId, 
          finalUserId,
          username, 
          fallbackUsername, 
          finalUsername,
          authUserFromStorage: localStorage.getItem('authUser')
        });
      } catch (error) {
        console.error('Error loading current user:', error);
      }
    };
    loadCurrentUser();
  }, []);
  
  // Sale type state for sell modal (buy or bid)
  const [saleType, setSaleType] = useState('buy'); // 'buy' or 'bid'
  
  // Window width for responsive sidebar sizing
  const [windowWidth, setWindowWidth] = useState(() => {
    return typeof window !== 'undefined' ? window.innerWidth : 1120;
  });

  // Right sidebar resizing state
  const [marketLeftSidebarWidth, setMarketLeftSidebarWidth] = useState(() => {
    try {
      const saved = localStorage.getItem('sidebarWidth');
      return saved ? parseInt(saved, 10) : 260;
    } catch {
      return 260;
    }
  });

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
  const [allInventoryItems, setAllInventoryItems] = useState([]);
  
  useEffect(() => {
    const loadInventory = async () => {
      const items = await getAllInventoryItems();
      setAllInventoryItems(items);
    };
    loadInventory();
  }, [inventoryRefresh]);
  
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
    
    // If a game is selected in the marketplace, only show items from that game
    const currentGameId = selectedGame?.id || selectedGame?.gameId || gameId;
    if (currentGameId) {
      filtered = filtered.filter(item => {
        const itemGameId = item.gameId;
        return itemGameId && String(itemGameId) === String(currentGameId);
      });
    }
    
    // Search filter
    if (inventorySearch) {
      filtered = filtered.filter(item =>
        item.name?.toLowerCase().includes(inventorySearch.toLowerCase()) ||
        item.description?.toLowerCase().includes(inventorySearch.toLowerCase())
      );
    }
    
    // Game filter (only applies if no game is selected in marketplace)
    if (!currentGameId && inventoryGameFilter !== 'all') {
      filtered = filtered.filter(item => item.gameId === inventoryGameFilter);
    }
    
    // Rarity filter
    if (inventoryRarityFilter !== 'all') {
      filtered = filtered.filter(item =>
        item.rarity?.toLowerCase() === inventoryRarityFilter.toLowerCase()
      );
    }
    
    // Filter out items that are already listed in the marketplace
    // Use currentMarketItems which is synchronized with marketItems via useEffect
    const allMarketItems = Array.isArray(currentMarketItems) ? currentMarketItems : [];
    
    if (selectedGame && allMarketItems.length > 0) {
      const gameId = selectedGame.id || selectedGame.gameId;
      if (gameId) {
        const listedItemIds = new Set(
          allMarketItems
            .filter(mi => {
              // Only include active items, or items without a status (for backwards compatibility)
              const status = mi.status;
              return !status || status === 'active';
            })
            .map(mi => {
              // Use originalItemId if available, otherwise use id
              const itemId = mi.originalItemId || mi.id;
              const itemGameId = mi.gameId || gameId;
              return `${String(itemGameId)}_${String(itemId)}`;
            })
        );
        
        filtered = filtered.filter(item => {
          const itemKey = `${String(item.gameId || gameId)}_${String(item.id)}`;
          const isListed = listedItemIds.has(itemKey);
          if (isListed) {
            console.log(`Filtering out listed item: ${item.name} (${itemKey})`);
          }
          return !isListed;
        });
      }
    }
    
    return filtered;
  }, [allInventoryItems, inventorySearch, inventoryGameFilter, inventoryRarityFilter, selectedGame, gameId, marketItemsRefresh, currentMarketItems]);
  
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

  // Save selectedGame to localStorage whenever it changes
  useEffect(() => {
    try {
      if (selectedGame) {
        localStorage.setItem('market_selected_game', JSON.stringify(selectedGame));
      } else {
        localStorage.removeItem('market_selected_game');
      }
    } catch (error) {
      console.error('Error saving selected game:', error);
    }
  }, [selectedGame]);

  // Save lastSelectedGameInBrowse to localStorage whenever it changes
  useEffect(() => {
    try {
      if (lastSelectedGameInBrowse) {
        localStorage.setItem('market_last_selected_game', JSON.stringify(lastSelectedGameInBrowse));
      } else {
        localStorage.removeItem('market_last_selected_game');
      }
    } catch (error) {
      console.error('Error saving last selected game:', error);
    }
  }, [lastSelectedGameInBrowse]);

  // Save selectedGame when in browse view, so it can be restored when returning
  useEffect(() => {
    if (marketView === 'browse' && selectedGame) {
      // Save the currently selected game when in browse view
      setLastSelectedGameInBrowse(selectedGame);
    }
  }, [marketView, selectedGame]);



  // Handle banner collapsing on scroll

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
    
    // Update left sidebar width from localStorage or event
    const updateLeftSidebarWidth = (event) => {
      try {
        // Use event detail if available (more immediate), otherwise fall back to localStorage
        const width = event?.detail?.width;
        if (width) {
          setMarketLeftSidebarWidth(width);
        } else {
          const saved = localStorage.getItem('sidebarWidth');
          if (saved) {
            setMarketLeftSidebarWidth(parseInt(saved, 10));
          }
        }
      } catch (_) {}
    };
    
    updateLeftSidebarWidth();
    window.addEventListener('sidebar-resize', updateLeftSidebarWidth);
    
    return () => {
      window.removeEventListener('resize', updateWindowSize);
      window.removeEventListener('resize', updateContentWidth);
      window.removeEventListener('sidebar-resize', updateContentWidth);
      window.removeEventListener('sidebar-resize', updateLeftSidebarWidth);
    };
  }, [marketRightSidebarWidth]);

  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (openFilterDropdown && !e.target.closest('.market-filter-dropdown-wrapper')) {
        setOpenFilterDropdown(null);
      }
    };
    
    if (openFilterDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => {
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [openFilterDropdown]);

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
  const [investments, setInvestments] = useState({});

  // Load all games with marketplace enabled from all users (for Market browse view)
  useEffect(() => {
    const loadCustomGames = async () => {
      try {
        // Get all games from all users for the Market (shared marketplace)
        const allGames = await getAllUsersData('customGames');
        
        // Ensure allGames is an array
        if (!Array.isArray(allGames)) {
          console.warn('getAllUsersData did not return an array, using empty array');
          setCustomGames([]);
          return;
        }
        
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

    // Add dummy game for testing
    const dummyGame = {
      id: 'dummy-game-1',
      name: 'Dummy Game',
      icon: 'D',
      image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1200&h=600&fit=crop',
      logo: null,
      installed: false,
      hasMarket: true,
      signatures: 0,
      myToken: null,
      isCustom: false,
      cardImage: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1200&h=600&fit=crop',
      marketRank: null,
      totalVolume: '$15,230',
      marketTrend: '+8.5%'
    };

    return [...customGamesData, dummyGame];
  }, [customGames, petitions, marketDataCache]);

  // Get games with markets and games without markets
  const gamesWithMarketsRaw = allGamesData.filter(g => g.hasMarket !== false);
  const gamesWithoutMarkets = allGamesData.filter(g => g.hasMarket === false);
  
  // Calculate ranks for browse view (by volume) - games with same stats get same rank
  // Rankings should NOT be affected by search/filter - use gamesWithMarketsRaw
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
  // Rankings should NOT be affected by search/filter - use gamesWithMarketsRaw
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
  // Rankings should NOT be affected by search/filter - use gamesWithMarketsRaw
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

  // Get current games list based on marketView (must be after gamesWithMarkets, trendingGames, topMarketsGames)
  // Apply search filter but preserve rankings from unfiltered data
  const currentGamesList = useMemo(() => {
    let baseList;
    if (marketView === 'trending') baseList = trendingGames;
    else if (marketView === 'featured') baseList = topMarketsGames;
    else baseList = gamesWithMarkets;
    
    // Apply search filter if there's a search query
    if (generalSearch && marketView !== 'petitions') {
      const searchLower = generalSearch.toLowerCase();
      return baseList.filter(game => {
        const name = (game.name || '').toLowerCase();
        const gameId = (game.id || game.gameId || '').toLowerCase();
        return name.includes(searchLower) || gameId.includes(searchLower);
      });
    }
    
    return baseList;
  }, [marketView, trendingGames, topMarketsGames, gamesWithMarkets, generalSearch]);
  
  // Reset visible range when marketView changes
  useEffect(() => {
    setVisibleRange({ start: 0, end: Math.min(INITIAL_LOAD_COUNT, currentGamesList.length) });
  }, [marketView, currentGamesList.length]);

  // Virtual Scrolling: Handle scroll events to load/unload items
  useEffect(() => {
    // Use market-content-area as scroll container
    const scrollContainer = document.querySelector('.market-content-area');
    const grid = gamesGridRef.current;
    if (!scrollContainer || !grid || currentGamesList.length === 0) return;
    
    const handleScroll = () => {
      if (scrollThrottleRef.current) return;
      
      scrollThrottleRef.current = requestAnimationFrame(() => {
        const scrollTop = scrollContainer.scrollTop;
        const containerHeight = scrollContainer.clientHeight;
        
        // Get actual card dimensions from the grid
        const gridComputedStyle = window.getComputedStyle(grid);
        const gap = parseFloat(gridComputedStyle.gap) || 16;
        const paddingTop = parseFloat(gridComputedStyle.paddingTop) || 24;
        
        // Estimate card height based on aspect ratio (2/3) and width
        // Card width is approximately clamp(150px, calc(var(--content-width, 1020px) * 0.12), 200px)
        const contentWidth = scrollContainer.clientWidth - (parseFloat(gridComputedStyle.paddingLeft) || 32) * 2;
        const minCardWidth = Math.max(150, Math.min(200, contentWidth * 0.12));
        const itemsPerRow = Math.floor(contentWidth / (minCardWidth + gap)) || 5;
        const cardHeight = minCardWidth * 1.5; // aspect-ratio 2/3 means height = width * 1.5
        const rowHeight = cardHeight + gap;
        
        // Get the offset of the grid container from the top of the scroll container
        const gridContainer = gamesGridContainerRef.current;
        if (!gridContainer) return;
        const gridOffsetTop = gridContainer.getBoundingClientRect().top - scrollContainer.getBoundingClientRect().top + scrollContainer.scrollTop;
        
        // Calculate which rows are visible (with buffer)
        const bufferRows = 2; // Load 2 rows before and after
        const relativeScrollTop = scrollTop - gridOffsetTop;
        const startRow = Math.max(0, Math.floor((relativeScrollTop - paddingTop) / rowHeight) - bufferRows);
        const endRow = Math.min(
          Math.ceil(currentGamesList.length / itemsPerRow),
          Math.ceil((relativeScrollTop + containerHeight - paddingTop) / rowHeight) + bufferRows
        );
        
        const newStart = Math.max(0, startRow * itemsPerRow);
        const newEnd = Math.min(currentGamesList.length, endRow * itemsPerRow);
        
        // Only update if range changed significantly (to avoid too many re-renders)
        setVisibleRange(prev => {
          const rangeDiff = Math.abs(prev.start - newStart) + Math.abs(prev.end - newEnd);
          if (rangeDiff > ITEMS_PER_LOAD || newStart < prev.start || newEnd > prev.end) {
            // Limit the range to MAX_VISIBLE_ITEMS
            const rangeSize = newEnd - newStart;
            if (rangeSize > MAX_VISIBLE_ITEMS) {
              // If scrolling down, keep items at the end
              if (scrollTop > (prev.start / itemsPerRow) * rowHeight) {
                return { start: Math.max(0, newEnd - MAX_VISIBLE_ITEMS), end: newEnd };
              } else {
                // If scrolling up, keep items at the start
                return { start: newStart, end: Math.min(currentGamesList.length, newStart + MAX_VISIBLE_ITEMS) };
              }
            }
            return { start: newStart, end: newEnd };
          }
          return prev;
        });
        
        scrollThrottleRef.current = null;
      });
    };
    
    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    
    // Initial calculation
    handleScroll();
    
    // Also recalculate on resize
    const handleResize = () => {
      handleScroll();
    };
    window.addEventListener('resize', handleResize);
    
    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      if (scrollThrottleRef.current) {
        cancelAnimationFrame(scrollThrottleRef.current);
      }
    };
  }, [currentGamesList.length, marketView]);
  
  // Get visible games slice
  const visibleGames = useMemo(() => {
    return currentGamesList.slice(visibleRange.start, visibleRange.end);
  }, [currentGamesList, visibleRange]);

  // Auto-select game based on URL parameter or restore from localStorage
  useEffect(() => {
    if (gameId) {
      // If gameId is in URL, use that
      const match = allGamesData.find(g => String(g.id) === String(gameId));
      if (match) {
        setSelectedGame(match);
        // Update lastSelectedGameInBrowse when game is auto-selected from URL
        setLastSelectedGameInBrowse(match);
        isRestoringGameRef.current = false;
      }
      return;
    }

    // No gameId in URL - check if we should restore from localStorage
    // Only restore if we're in browse view, have a saved game, and not currently restoring
    if (marketView === 'browse' && !isRestoringGameRef.current && !selectedGame) {
      // Check localStorage directly for saved game
      let gameToRestore = lastSelectedGameInBrowse;
      if (!gameToRestore) {
        try {
          const saved = localStorage.getItem('market_last_selected_game');
          gameToRestore = saved ? JSON.parse(saved) : null;
        } catch (error) {
          console.error('Error loading saved game from localStorage:', error);
        }
      }
      
      if (gameToRestore) {
        const gameIdToRestore = gameToRestore.id || gameToRestore.gameId;
        if (gameIdToRestore) {
          // Check if the game still exists in allGamesData
          const match = allGamesData.find(g => String(g.id) === String(gameIdToRestore) || String(g.gameId) === String(gameIdToRestore));
          if (match) {
            isRestoringGameRef.current = true;
            setIsRestoringGame(true);
            setSelectedGame(match);
            setLastSelectedGameInBrowse(match);
            // Navigate to the game's marketplace URL
            navigate(`/game/${gameIdToRestore}/market`, { replace: true });
            setTimeout(() => {
              isRestoringGameRef.current = false;
              setIsRestoringGame(false);
            }, 200);
            return;
          }
        }
      }
    }

    // Don't clear selectedGame if we're restoring a game
    if (!isRestoringGameRef.current && !gameId) {
      // Only clear if we explicitly don't have a gameId and we're not restoring
      // This allows the back button to work properly
      if (marketView === 'browse' && !lastSelectedGameInBrowse) {
        setSelectedGame(null);
      }
    } else if (isRestoringGameRef.current) {
      // Reset the flag after a short delay
      setTimeout(() => {
        isRestoringGameRef.current = false;
      }, 100);
    }
  }, [gameId, allGamesData, marketView, lastSelectedGameInBrowse, navigate, selectedGame]);

  // Initialize dummy market items for a game if none exist
  const initializeDummyMarketItems = async (gameId, gameName) => {
    const existingItems = await getUserData(`marketItems_${gameId}`, []);
    if (!existingItems || existingItems.length === 0) {
      // Get current user info for dummy items
      const username = await getUserData('username', 'Unknown');
      const userId = await getCurrentUserId();
      let fallbackUsername = null;
      try {
        const authUser = localStorage.getItem('authUser');
        if (authUser) {
          const user = JSON.parse(authUser);
          fallbackUsername = user.name || user.username || user.email;
        }
      } catch (e) {
        // Ignore
      }
      const finalUsername = username || fallbackUsername || 'Unknown';
      const finalUserId = userId || null;
      
      const dummyMarketItems = [
        {
          id: `market-${gameId}-1`,
          name: 'Epic Sword',
          description: 'A powerful legendary weapon with enhanced damage',
          rarity: 'epic',
          type: 'Weapon',
          image: '⚔️',
          imageUrl: null,
          price: 45.99,
          seller: finalUsername,
          sellerId: finalUserId,
          listedAt: Date.now() - (35 * 60 * 1000), // 35 minutes ago
          status: 'active',
          gameId: gameId,
          gameName: gameName
        },
        {
          id: `market-${gameId}-2`,
          name: 'Rare Shield',
          description: 'A sturdy defensive item that blocks incoming attacks',
          rarity: 'rare',
          type: 'Armor',
          image: '🛡️',
          imageUrl: null,
          price: 32.50,
          seller: finalUsername,
          sellerId: finalUserId,
          listedAt: Date.now() - (35 * 60 * 1000),
          status: 'active',
          gameId: gameId,
          gameName: gameName
        },
        {
          id: `market-${gameId}-3`,
          name: 'Rare Helmet',
          description: 'Protective headgear with moderate defense',
          rarity: 'rare',
          type: 'Armor',
          image: '⛑️',
          imageUrl: null,
          price: 28.75,
          seller: finalUsername,
          sellerId: finalUserId,
          listedAt: Date.now() - (35 * 60 * 1000),
          status: 'active',
          gameId: gameId,
          gameName: gameName
        },
        {
          id: `market-${gameId}-4`,
          name: 'Common Boots',
          description: 'Basic footwear that provides minimal protection',
          rarity: 'common',
          type: 'Armor',
          image: '👢',
          imageUrl: null,
          price: 12.00,
          seller: finalUsername,
          sellerId: finalUserId,
          listedAt: Date.now() - (35 * 60 * 1000),
          status: 'active',
          gameId: gameId,
          gameName: gameName
        },
        {
          id: `market-${gameId}-5`,
          name: 'Epic Bow',
          description: 'A long-range weapon with high accuracy',
          rarity: 'epic',
          type: 'Weapon',
          image: '🏹',
          imageUrl: null,
          price: 55.25,
          seller: finalUsername,
          sellerId: finalUserId,
          listedAt: Date.now() - (35 * 60 * 1000),
          status: 'active',
          gameId: gameId,
          gameName: gameName
        },
        {
          id: `market-${gameId}-6`,
          name: 'Legendary Potion',
          description: 'Restores health completely and grants temporary buffs',
          rarity: 'legendary',
          type: 'Consumable',
          image: '🧪',
          imageUrl: null,
          price: 89.99,
          seller: finalUsername,
          sellerId: finalUserId,
          listedAt: Date.now() - (35 * 60 * 1000),
          status: 'active',
          gameId: gameId,
          gameName: gameName
        }
      ];
      await saveUserData(`marketItems_${gameId}`, dummyMarketItems);
      return dummyMarketItems;
    }
    
    // Update existing items that have "Unknown" as seller to current user if logged in
    const username = await getUserData('username', null);
    const userId = await getCurrentUserId();
    let fallbackUsername = null;
    try {
      const authUser = localStorage.getItem('authUser');
      if (authUser) {
        const user = JSON.parse(authUser);
        fallbackUsername = user.name || user.username || user.email;
      }
    } catch (e) {
      // Ignore
    }
    const finalUsername = username || fallbackUsername;
    const finalUserId = userId || null;
    
    if (finalUsername && finalUsername !== 'Unknown') {
      const needsUpdate = existingItems.some(item => 
        item.seller === 'Unknown' || (!item.sellerId && finalUserId)
      );
      
      if (needsUpdate) {
        const updatedItems = existingItems.map(item => {
          if (item.seller === 'Unknown' || (!item.sellerId && finalUserId)) {
            return {
              ...item,
              seller: finalUsername,
              sellerId: finalUserId
            };
          }
          return item;
        });
        await saveUserData(`marketItems_${gameId}`, updatedItems);
        return updatedItems;
      }
    }
    
    return existingItems;
  };

  // Load market items for selected game
  useEffect(() => {
    const loadMarketItems = async () => {
      if (!selectedGame) {
        setMarketItems([]);
        return;
      }
      
      try {
        const gameId = selectedGame.id || selectedGame.gameId;
        if (!gameId) {
          setMarketItems([]);
          return;
        }
        
        // Initialize dummy market items if none exist
        const items = await initializeDummyMarketItems(gameId, selectedGame.name || selectedGame.gameName || 'Game');
        setMarketItems(Array.isArray(items) ? items : []);
      } catch (error) {
        console.error('Error loading market items:', error);
        setMarketItems([]);
    }
    };
    
    loadMarketItems();
  }, [selectedGame, marketItemsRefresh]);

  // Load all market items from all games for watchlist
  useEffect(() => {
    const loadAllMarketItems = async () => {
      if (marketView !== 'favorites') {
        setAllMarketItemsForWatchlist([]);
        return;
      }
      
      try {
        const allItems = [];
        const allGames = await getAllUsersData('customGames');
        
        // Get market items from all games
        for (const game of allGames) {
          const gameId = game.gameId || game.id;
          if (gameId) {
            try {
              const items = await getUserData(`marketItems_${gameId}`, []);
              if (Array.isArray(items) && items.length > 0) {
                items.forEach(item => {
                  allItems.push({
                    ...item,
                    gameId: gameId,
                    gameName: game.name || game.gameName || gameId
                  });
                });
              }
            } catch (e) {
              console.error(`Error loading market items for game ${gameId}:`, e);
            }
          }
        }
        
        // Also check localStorage directly for any marketItems_ keys
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('marketItems_')) {
            const gameId = key.replace('marketItems_', '');
            try {
              const items = JSON.parse(localStorage.getItem(key) || '[]');
              if (Array.isArray(items) && items.length > 0) {
                items.forEach(item => {
                  // Check if item already added
                  const exists = allItems.some(existing => 
                    existing.id === item.id && existing.gameId === gameId
                  );
                  if (!exists) {
                    allItems.push({
                      ...item,
                      gameId: gameId,
                      gameName: item.gameName || gameId
                    });
                  }
                });
              }
            } catch (e) {
              console.error(`Error parsing market items for game ${gameId}:`, e);
            }
          }
        }
        
        console.log('📦 Loaded all market items for watchlist:', allItems.length);
        console.log('👀 Watched items:', Array.from(watchedItems));
        console.log('✅ Matching watched items:', allItems.filter(item => watchedItems.has(item.id)).map(i => ({ id: i.id, name: i.name })));
        
        setAllMarketItemsForWatchlist(allItems);
      } catch (e) {
        console.error('Error loading all market items:', e);
        setAllMarketItemsForWatchlist([]);
      }
    };
    
    loadAllMarketItems();
  }, [marketView, watchedItems, marketItemsRefresh]);

  // Update currentMarketItems when marketItems changes
  useEffect(() => {
    setCurrentMarketItems(Array.isArray(marketItems) ? marketItems : []);
    
    // Initialize itemBids from items that have saleType: 'bid'
    setItemBids(prev => {
      const updated = { ...prev };
      let hasChanges = false;
      
      marketItems.forEach(item => {
        // Check if item has saleType: 'bid' (explicitly set)
        const itemSaleType = item.saleType || 'buy';
        console.log('🔍 Loading item:', item.name, 'saleType:', itemSaleType);
        
        if (itemSaleType === 'bid') {
          const now = Date.now();
          let bidEndTime = item.bidEndTime;
          let bidDuration = item.bidDuration || 60;
          
          // If no bidEndTime is set, start the timer immediately from now
          if (!bidEndTime) {
            bidEndTime = now + (bidDuration * 60 * 1000);
            console.log('⏰ Starting bid timer immediately for item:', item.name, 'ends at:', new Date(bidEndTime));
            hasChanges = true;
          }
          
          // Only add if bid is still active (not expired) or if it doesn't exist in itemBids
          if (bidEndTime > now || !updated[item.id]) {
            updated[item.id] = {
              saleType: 'bid',
              bidEndTime: bidEndTime,
              currentBid: item.currentBid || item.price,
              bidHistory: item.bidHistory || [],
              bidDuration: bidDuration
            };
            console.log('✅ Initialized bid for item:', item.name, 'active:', bidEndTime > now);
            hasChanges = true;
          }
        }
      });
      
      if (hasChanges) {
        localStorage.setItem('market_item_bids', JSON.stringify(updated));
      }
      return updated;
    });
  }, [marketItems]);

  const [marketTransactions, setMarketTransactions] = useState([]);
  
  // Load market data (investments, transactions, petitions)
  useEffect(() => {
    const loadMarketData = async () => {
      try {
        const [investmentsData, transactionsData, petitionsData] = await Promise.all([
          getUserData('marketInvestments', {}),
          getUserData('marketTransactions', []),
          getUserData('marketPetitions', {})
        ]);
        
        setInvestments(typeof investmentsData === 'object' && investmentsData !== null ? investmentsData : {});
        setMarketTransactions(Array.isArray(transactionsData) ? transactionsData : []);
        setPetitions(typeof petitionsData === 'object' && petitionsData !== null ? petitionsData : {});
      } catch (error) {
        console.error('Error loading market data:', error);
        setInvestments({});
        setMarketTransactions([]);
        setPetitions({});
      }
    };
    
    loadMarketData();
  }, [marketItemsRefresh]);

  // Calculate market statistics from account-separated storage
  const marketStats = React.useMemo(() => {
    try {
      const transactions = Array.isArray(marketTransactions) ? marketTransactions : [];
      const investmentKeys = Object.keys(investments);
      const totalTraded = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
      const totalProfit = transactions.reduce((sum, t) => sum + (t.profit || 0), 0);
      const totalInvested = investmentKeys.reduce((sum, key) => sum + (investments[key]?.invested || 0), 0);
      const investmentReturns = investmentKeys.reduce((sum, key) => sum + (investments[key]?.returns || 0), 0);
      const avgReturn = totalInvested > 0 ? (investmentReturns / totalInvested * 100) : 0;
      const netWorth = totalTraded + investmentReturns;
      const bestTrade = transactions.length > 0 ? Math.max(...transactions.map(t => t.profitPercent || 0), 0) : 0;
      
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
  }, [investments, marketTransactions]);

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
    
    // Get current game ID
    const currentGameId = selectedGame?.id || selectedGame?.gameId || gameId;
    const itemGameId = item.gameId;
    
    // Only allow comparing items from the current game
    if (currentGameId && itemGameId && String(currentGameId) !== String(itemGameId)) {
      alert(`You can only compare items from the same game. This item is from a different game.`);
      return;
    }
    
    // If there are existing comparison items, check they're from the same game
    if (comparisonItems.length > 0) {
      const firstItemGameId = comparisonItems[0].gameId;
      if (firstItemGameId && itemGameId && String(firstItemGameId) !== String(itemGameId)) {
        alert(`You can only compare items from the same game. Please clear the comparison first.`);
        return;
      }
    }
    
    let newComparisonItems = comparisonItems;
    if (comparisonItems.some(i => i.id === item.id)) {
      newComparisonItems = comparisonItems.filter(i => i.id !== item.id);
      setComparisonItems(newComparisonItems);
    } else {
      if (comparisonItems.length >= 8) {
        alert('Maximum 8 items can be compared at once');
        return;
      }
      newComparisonItems = [...comparisonItems, item];
      setComparisonItems(newComparisonItems);
      
      // Auto-open pop-out window when 2 items are selected (only if not manually closed and not already opened)
      // This is now handled by the useEffect hook to prevent multiple opens
    }
    
    // Focus the compare pop-out window if it exists, or open it if it doesn't (only if not in pop-out mode)
    if (!isCompareOnlyMode && window.electronAPI && window.electronAPI.focusComparePopoutWindow) {
      window.electronAPI.focusComparePopoutWindow().then(result => {
        if (result && result.found) {
          console.log('✅ Focused compare pop-out window');
        } else {
          // If pop-out doesn't exist, open it immediately when compare button is clicked
          const api = window.electronAPI;
          if (api?.openPopOutWindow) {
            const route = gameId ? `/game/${gameId}/market/compare` : '/market/compare';
            api.openPopOutWindow(route).then(() => {
              setComparisonModalAutoOpened(true);
              console.log('✅ Opened compare pop-out window');
            }).catch(err => {
              console.error('Error opening compare pop-out window:', err);
            });
          }
        }
      }).catch(err => {
        console.error('Error focusing compare pop-out window:', err);
        // If focus fails, try to open the window anyway
        const api = window.electronAPI;
        if (api?.openPopOutWindow) {
          const route = gameId ? `/game/${gameId}/market/compare` : '/market/compare';
          api.openPopOutWindow(route).then(() => {
            setComparisonModalAutoOpened(true);
            console.log('✅ Opened compare pop-out window (fallback)');
          }).catch(openErr => {
            console.error('Error opening compare pop-out window:', openErr);
          });
        }
      });
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
    // Don't close pop-out window or modal - let user stay in comparison view
    // Keep the pop-out window open even if list becomes empty
    // Only "Clear All" should close the window
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

  // Filter comparison items to only include items from the current game
  useEffect(() => {
    if (!selectedGame || comparisonItems.length === 0) return;
    
    const currentGameId = selectedGame.id || selectedGame.gameId;
    if (!currentGameId) return;
    
    // Filter comparison items to only include items from the current game
    const filteredComparisonItems = comparisonItems.filter(item => {
      const itemGameId = item.gameId;
      return itemGameId && String(currentGameId) === String(itemGameId);
    });
    
    // If items were filtered out, update the comparison
    if (filteredComparisonItems.length !== comparisonItems.length) {
      setComparisonItems(filteredComparisonItems);
      // Clear reference if it was removed
      if (referenceItemId && !filteredComparisonItems.some(item => item.id === referenceItemId)) {
        setReferenceItemId(filteredComparisonItems.length > 0 ? filteredComparisonItems[0].id : null);
      }
    }
  }, [selectedGame, comparisonItems, referenceItemId]);

  // Auto-open pop-out window when 2 items are selected (only if not manually closed and not already opened)
  useEffect(() => {
    // Prevent opening from within a pop-out window
    if (isCompareOnlyMode) return;
    
    // Prevent opening if already opened or if we're currently opening one
    if (comparisonModalAutoOpened || popOutOpeningRef.current) return;
    
    if (comparisonItems.length >= 2 && !comparisonModalManuallyClosed && !showComparisonModal) {
      popOutOpeningRef.current = true;
      const openPopOut = async () => {
        try {
          const api = window.electronAPI;
          if (api?.openPopOutWindow) {
            const route = gameId ? `/game/${gameId}/market/compare` : '/market/compare';
            await api.openPopOutWindow(route);
            setComparisonModalAutoOpened(true);
          } else {
            // Fallback: open comparison modal if pop-out not available
            setShowComparisonModal(true);
            setComparisonModalAutoOpened(true);
          }
        } catch (error) {
          console.error('Error opening pop-out window:', error);
          // Fallback: open comparison modal on error
          setShowComparisonModal(true);
          setComparisonModalAutoOpened(true);
        } finally {
          popOutOpeningRef.current = false;
        }
      };
      openPopOut();
    }
    // Don't auto-close when items are removed - let user stay in comparison view
  }, [comparisonItems.length, comparisonModalManuallyClosed, showComparisonModal, gameId, isCompareOnlyMode, comparisonModalAutoOpened]);

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

  // Auto-open comparison modal in pop-out mode and ensure selectedGame is set
  // This must be with all other hooks, before any early returns
  useEffect(() => {
    if (isCompareOnlyMode) {
      setShowComparisonModal(true);
      // Ensure selectedGame is set in pop-out mode based on gameId from URL
      if (gameId && !selectedGame) {
        // Find the game from allGamesData
        const game = allGamesData.find(g => (g.id || g.gameId) === gameId);
        if (game) {
          setSelectedGame(game);
        }
      }
    }
  }, [isCompareOnlyMode, gameId, selectedGame, allGamesData]);

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

  // Format time remaining in compact format - always show 2 time units (except when only seconds)
  const formatTimeRemaining = (milliseconds) => {
    if (milliseconds <= 0) return '0s';
    
    const totalSeconds = Math.floor(milliseconds / 1000);
    const years = Math.floor(totalSeconds / (365 * 24 * 60 * 60));
    const months = Math.floor((totalSeconds % (365 * 24 * 60 * 60)) / (30 * 24 * 60 * 60));
    const weeks = Math.floor((totalSeconds % (30 * 24 * 60 * 60)) / (7 * 24 * 60 * 60));
    const days = Math.floor((totalSeconds % (7 * 24 * 60 * 60)) / (24 * 60 * 60));
    const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    
    // If only seconds remain, show only seconds
    if (totalSeconds < 60) {
      return `${seconds}s`;
    }
    
    // Find the highest non-zero unit and show it with the next unit
    if (years > 0) {
      const remainingAfterYears = totalSeconds % (365 * 24 * 60 * 60);
      const monthsInRemaining = Math.floor(remainingAfterYears / (30 * 24 * 60 * 60));
      return `${years}y ${monthsInRemaining}m`;
    }
    
    if (months > 0) {
      const remainingAfterMonths = totalSeconds % (30 * 24 * 60 * 60);
      const weeksInRemaining = Math.floor(remainingAfterMonths / (7 * 24 * 60 * 60));
      return `${months}m ${weeksInRemaining}w`;
    }
    
    if (weeks > 0) {
      const remainingAfterWeeks = totalSeconds % (7 * 24 * 60 * 60);
      const daysInRemaining = Math.floor(remainingAfterWeeks / (24 * 60 * 60));
      return `${weeks}w ${daysInRemaining}d`;
    }
    
    if (days > 0) {
      const remainingAfterDays = totalSeconds % (24 * 60 * 60);
      const hoursInRemaining = Math.floor(remainingAfterDays / (60 * 60));
      return `${days}d ${hoursInRemaining}h`;
    }
    
    if (hours > 0) {
      const remainingAfterHours = totalSeconds % (60 * 60);
      const minutesInRemaining = Math.floor(remainingAfterHours / 60);
      return `${hours}h ${minutesInRemaining}m`;
    }
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    
    return `${seconds}s`;
  };
  
  // Format large numbers with letters (K, M, B, T, etc.)
  const formatLargeNumber = (num) => {
    if (!num || num === 0) return '$0.00';
    
    if (num >= 1000000000000) {
      const trillions = num / 1000000000000;
      if (trillions >= 1000) {
        return `$${(trillions / 1000).toFixed(2)}Q`;
      }
      return `$${trillions.toFixed(2)}T`;
    } else if (num >= 1000000000) {
      const billions = num / 1000000000;
      if (billions >= 1000) {
        return `$${(billions / 1000).toFixed(2)}T`;
      }
      return `$${billions.toFixed(2)}B`;
    } else if (num >= 1000000) {
      const millions = num / 1000000;
      if (millions >= 1000) {
        return `$${(millions / 1000).toFixed(2)}B`;
      }
      return `$${millions.toFixed(2)}M`;
    } else if (num >= 1000) {
      const thousands = num / 1000;
      if (thousands >= 1000) {
        return `$${(thousands / 1000).toFixed(2)}M`;
      }
      return `$${thousands.toFixed(2)}K`;
    }
    return `$${num.toFixed(2)}`;
  };

  // Helper function to manage user balance
  const updateUserBalance = async (amount) => {
    try {
      const currentUserId = await getCurrentUserId();
      if (!currentUserId) return;
      
      const currentBalance = await getUserData('userBalance', 0);
      const newBalance = Math.max(0, currentBalance + amount);
      await saveUserData('userBalance', newBalance);
      
      // Trigger balance update event
      window.dispatchEvent(new CustomEvent('balance-updated', { detail: { balance: newBalance } }));
    } catch (error) {
      console.error('Error updating balance:', error);
    }
  };
  
  const handleBuyItem = async (itemId, itemsArray = null) => {
    const items = itemsArray || sortedItems || [];
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    
    const bid = itemBids[itemId];
    const itemSaleType = item.saleType || 'buy';
    const isBidItem = itemSaleType === 'bid' || bid?.saleType === 'bid';
    const isActiveBid = bid?.saleType === 'bid' && bid?.bidEndTime && bid.bidEndTime > Date.now();
    const currentUserId = await getCurrentUserId();
    
    if (isBidItem) {
      if (isActiveBid && bid) {
        // Handle bid submission for active bid (don't restart timer)
        let bidAmount = bidInputs[itemId]?.amount || (bid.currentBid ? bid.currentBid + 0.01 : item.price + 0.01);
        
        // Cap bid amount at 1 million
        if (bidAmount > 1000000) {
          alert('Maximum bid amount is $1,000,000.00');
          bidAmount = 1000000;
        }
        
        const now = Date.now();
        const currentHighestBid = bid.currentBid || item.price;
        
        // Get user's current bid
        const userBids = bid.bidHistory?.filter(b => b.userId === currentUserId || b.userId === 'current-user') || [];
        const userCurrentBid = userBids.length > 0 
          ? userBids.reduce((max, b) => b.amount > max.amount ? b : max, userBids[0])
          : null;
        const userCurrentBidAmount = userCurrentBid?.amount || 0;
        
        // Get second highest bid (excluding user's bids)
        const otherBids = bid.bidHistory?.filter(b => b.userId !== currentUserId && b.userId !== 'current-user') || [];
        const secondHighestBid = otherBids.length > 0
          ? otherBids.reduce((max, b) => b.amount > max.amount ? b : max, otherBids[0])
          : null;
        const secondHighestAmount = secondHighestBid?.amount || item.price;
        
        // Check if new bid would make user lose highest bid
        if (userCurrentBidAmount > 0 && bidAmount < secondHighestAmount) {
          alert(`This bid would make you lose the highest bid position. The second highest bid is $${secondHighestAmount.toFixed(2)}. Please enter at least $${(secondHighestAmount + 0.01).toFixed(2)} to maintain your position.`);
          return;
        }
        
        // Check if bid is higher than current highest bid
        if (bidAmount > currentHighestBid) {
          // Find the previous highest bidder (if not the current user)
          const previousHighestBidder = bid.bidHistory?.find(b => 
            b.amount === currentHighestBid && 
            (b.userId !== currentUserId && b.userId !== 'current-user')
          );
          
          // Refund the previous highest bidder if they exist
          if (previousHighestBidder) {
            // Note: This would need to be done server-side or via a proper user lookup
            // For now, we'll just handle the current user's refund
            console.log(`Previous highest bidder ${previousHighestBidder.userId} should be refunded $${previousHighestBidder.amount}`);
          }
          
          // Refund user's previous bid if they had one (but weren't highest)
          if (userCurrentBidAmount > 0 && userCurrentBidAmount < currentHighestBid) {
            await updateUserBalance(userCurrentBidAmount);
          }
          
          // Deduct new bid amount
          await updateUserBalance(-bidAmount);
          
          setItemBids(prev => {
            const newBids = {
              ...prev,
              [itemId]: {
                ...prev[itemId],
                currentBid: bidAmount,
                bidHistory: [
                  ...(prev[itemId]?.bidHistory || []),
                  { userId: currentUserId || 'current-user', amount: bidAmount, timestamp: now }
                ]
                // Keep existing bidEndTime and bidDuration - don't restart timer
              }
            };
            localStorage.setItem('market_item_bids', JSON.stringify(newBids));
            return newBids;
          });
          
          setBidInputs(prev => {
            const newInputs = { ...prev };
            delete newInputs[itemId];
            return newInputs;
          });
        } else if (bidAmount < userCurrentBidAmount && bidAmount >= secondHighestAmount) {
          // User is lowering their bid but still highest - refund difference
          const refundAmount = userCurrentBidAmount - bidAmount;
          await updateUserBalance(refundAmount);
          
          // Update bid
          setItemBids(prev => {
            const newBids = {
              ...prev,
              [itemId]: {
                ...prev[itemId],
                currentBid: bidAmount,
                bidHistory: [
                  ...(prev[itemId]?.bidHistory || []),
                  { userId: currentUserId || 'current-user', amount: bidAmount, timestamp: now }
                ]
              }
            };
            localStorage.setItem('market_item_bids', JSON.stringify(newBids));
            return newBids;
          });
          
          setBidInputs(prev => {
            const newInputs = { ...prev };
            delete newInputs[itemId];
            return newInputs;
          });
        } else {
          alert(`A higher bid of $${currentHighestBid.toFixed(2)} has already been placed. Please enter a higher total amount.`);
        }
      } else {
        // Handle new bid setup (start timer) - for items without active bids or expired bids
        let bidAmount = bidInputs[itemId]?.amount || item.price + 0.01;
        
        // Cap bid amount at 1 million
        if (bidAmount > 1000000) {
          alert('Maximum bid amount is $1,000,000.00');
          bidAmount = 1000000;
        }
        
        // Use existing bidDuration from item or bid, or default to 60 minutes
        const bidDuration = bidInputs[itemId]?.duration || bid?.bidDuration || item.bidDuration || 60;
        
        const now = Date.now();
        const endTime = now + (bidDuration * 60 * 1000);
        
        // Deduct bid amount
        await updateUserBalance(-bidAmount);
        
        setItemBids(prev => {
          const newBids = {
            ...prev,
            [itemId]: {
              ...prev[itemId],
              saleType: 'bid',
              bidEndTime: endTime,
              currentBid: bidAmount,
              bidHistory: [
                ...(prev[itemId]?.bidHistory || []),
                { userId: currentUserId || 'current-user', amount: bidAmount, timestamp: now }
              ],
              bidDuration: bidDuration
            }
          };
          localStorage.setItem('market_item_bids', JSON.stringify(newBids));
          return newBids;
        });
        
        setBidInputs(prev => {
          const newInputs = { ...prev };
          delete newInputs[itemId];
          return newInputs;
        });
      }
    } else {
      // Handle direct buy - check if item is locked by another user
      const lock = lockedItems[itemId];
      const now = Date.now();
      const LOCK_TIMEOUT = 30000; // 30 seconds
      
      // Check if item is locked by another user
      if (lock && lock.userId !== currentUserId && (now - lock.timestamp) < LOCK_TIMEOUT) {
        alert(`This item is currently being purchased by another user. Please try again in a moment.`);
        return;
      }
      
      // Lock the item for this user
      const lockTimestamp = now;
      setLockedItems(prev => {
        const newLocks = {
          ...prev,
          [itemId]: {
            userId: currentUserId,
            timestamp: lockTimestamp,
            timeout: LOCK_TIMEOUT
          }
        };
        localStorage.setItem('market_locked_items', JSON.stringify(newLocks));
        return newLocks;
      });
      
      // Set timeout to release lock if purchase isn't completed
      const lockTimeoutId = setTimeout(() => {
        setLockedItems(prev => {
          const newLocks = { ...prev };
          const lock = newLocks[itemId];
          if (lock && (Date.now() - lock.timestamp) >= LOCK_TIMEOUT) {
            delete newLocks[itemId];
            localStorage.setItem('market_locked_items', JSON.stringify(newLocks));
          }
          return newLocks;
        });
      }, LOCK_TIMEOUT);
      
      // Store timeout ID for potential cancellation
      if (!window.itemLockTimeouts) {
        window.itemLockTimeouts = {};
      }
      window.itemLockTimeouts[itemId] = lockTimeoutId;
      
      // Show purchase confirmation
      setPendingPurchaseItem(item);
      setShowPurchaseConfirmation(true);
    }
  };
  
  const handleConfirmPurchase = async () => {
    if (!pendingPurchaseItem) return;
    
    const item = pendingPurchaseItem;
    const itemId = item.id;
      const currentBalance = await getUserData('userBalance', 0);
      
      if (currentBalance < item.price) {
        alert(`Insufficient balance. You need $${item.price.toFixed(2)} but only have $${currentBalance.toFixed(2)}.`);
      // Release lock
      setLockedItems(prev => {
        const newLocks = { ...prev };
        delete newLocks[itemId];
        localStorage.setItem('market_locked_items', JSON.stringify(newLocks));
        return newLocks;
      });
      if (window.itemLockTimeouts && window.itemLockTimeouts[itemId]) {
        clearTimeout(window.itemLockTimeouts[itemId]);
        delete window.itemLockTimeouts[itemId];
      }
      setShowPurchaseConfirmation(false);
      setPendingPurchaseItem(null);
        return;
      }
      
      // Deduct balance
      await updateUserBalance(-item.price);
      
      // Add item to inventory
      const gameId = item.gameId || selectedGame?.id || selectedGame?.gameId;
      if (gameId) {
        const inventory = await getUserInventory(gameId);
        const newItem = {
          ...item,
          id: `bought-${item.id}-${Date.now()}`,
          boughtAt: Date.now(),
          boughtFrom: item.seller || 'Market'
        };
        inventory.push(newItem);
        await saveUserData(`inventory_${gameId}`, inventory);
      }
      
      // Remove item from market (mark as sold)
      setSoldItems(prev => ({ ...prev, [itemId]: true }));
      
      // Remove from market items
      const marketItems = await getUserData(`marketItems_${gameId}`, []);
      const updatedMarketItems = marketItems.filter(i => i.id !== itemId);
      await saveUserData(`marketItems_${gameId}`, updatedMarketItems);
    
    // Release lock
    setLockedItems(prev => {
      const newLocks = { ...prev };
      delete newLocks[itemId];
      localStorage.setItem('market_locked_items', JSON.stringify(newLocks));
      return newLocks;
    });
    
    // Clear timeout
    if (window.itemLockTimeouts && window.itemLockTimeouts[itemId]) {
      clearTimeout(window.itemLockTimeouts[itemId]);
      delete window.itemLockTimeouts[itemId];
    }
      
      // Refresh market
      setMarketItemsRefresh(prev => prev + 1);
    
    setShowPurchaseConfirmation(false);
    setPendingPurchaseItem(null);
      
      alert(`Successfully purchased ${item.name} for $${item.price.toFixed(2)}!`);
  };
  
  const handleCancelPurchase = () => {
    if (!pendingPurchaseItem) return;
    
    const itemId = pendingPurchaseItem.id;
    
    // Release lock
    setLockedItems(prev => {
      const newLocks = { ...prev };
      delete newLocks[itemId];
      localStorage.setItem('market_locked_items', JSON.stringify(newLocks));
      return newLocks;
    });
    
    // Clear timeout
    if (window.itemLockTimeouts && window.itemLockTimeouts[itemId]) {
      clearTimeout(window.itemLockTimeouts[itemId]);
      delete window.itemLockTimeouts[itemId];
    }
    
    setShowPurchaseConfirmation(false);
    setPendingPurchaseItem(null);
  };
  
  const handleCancelBid = async (itemId, itemsArray = null) => {
    const bid = itemBids[itemId];
    if (!bid) return;
    
    const currentUserId = await getCurrentUserId();
    
    // Find user's bid in history
    const userBids = bid.bidHistory?.filter(b => b.userId === currentUserId || b.userId === 'current-user') || [];
    if (userBids.length === 0) return;
    
    // Get user's highest bid
    const userHighestBid = userBids.reduce((max, b) => b.amount > max.amount ? b : max, userBids[0]);
    const userBidAmount = userHighestBid.amount;
    
    // Check if user is currently the highest bidder
    const isCurrentlyHighest = bid.currentBid === userBidAmount;
    
    // Remove user's bids from history
    const updatedHistory = bid.bidHistory?.filter(b => b.userId !== currentUserId && b.userId !== 'current-user') || [];
    
    // Update current bid to the next highest bid
    let newCurrentBid = bid.currentBid;
    if (updatedHistory.length > 0) {
      const highestRemainingBid = updatedHistory.reduce((max, b) => b.amount > max.amount ? b : max, updatedHistory[0]);
      newCurrentBid = highestRemainingBid.amount;
    } else {
      // If no bids remain, reset to item price
      const items = itemsArray || sortedItems || [];
      const item = items.find(i => i.id === itemId);
      newCurrentBid = item?.price || bid.currentBid;
    }
    
    // Refund user's bid amount
    if (isCurrentlyHighest) {
      // User was highest bidder - refund full amount
      await updateUserBalance(userBidAmount);
    } else {
      // User was not highest - refund full amount (they weren't winning anyway)
      await updateUserBalance(userBidAmount);
    }
    
    setItemBids(prev => {
      const newBids = {
        ...prev,
        [itemId]: {
          ...prev[itemId],
          currentBid: newCurrentBid,
          bidHistory: updatedHistory
        }
      };
      localStorage.setItem('market_item_bids', JSON.stringify(newBids));
      return newBids;
    });
  };
  
  // Sync lockedItems to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('market_locked_items', JSON.stringify(lockedItems));
    } catch (error) {
      console.error('Error saving locked items:', error);
    }
  }, [lockedItems]);
  
  // Clean up expired locks
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const LOCK_TIMEOUT = 30000; // 30 seconds
      
      setLockedItems(prev => {
        const newLocks = { ...prev };
        let hasChanges = false;
        
        Object.keys(newLocks).forEach(itemId => {
          const lock = newLocks[itemId];
          if (lock && (now - lock.timestamp) >= LOCK_TIMEOUT) {
            delete newLocks[itemId];
            hasChanges = true;
            
            // Clear timeout if exists
            if (window.itemLockTimeouts && window.itemLockTimeouts[itemId]) {
              clearTimeout(window.itemLockTimeouts[itemId]);
              delete window.itemLockTimeouts[itemId];
            }
          }
        });
        
        if (hasChanges) {
          localStorage.setItem('market_locked_items', JSON.stringify(newLocks));
        }
        
        return newLocks;
      });
    }, 1000); // Check every second
    
    return () => clearInterval(interval);
  }, []);
  
  // Timer state for real-time updates
  const [currentTime, setCurrentTime] = useState(Date.now());
  
  // Update current time every second for timer display
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  
  // Auto-hide sold items after 2 seconds
  useEffect(() => {
    const now = currentTime;
    const endedBids = Object.entries(itemBids).filter(([itemId, bid]) => {
      return bid?.saleType === 'bid' && bid?.bidEndTime && bid.bidEndTime <= now;
    });
    
    endedBids.forEach(([itemId]) => {
      if (!soldItems[itemId]) {
        setTimeout(() => {
          setSoldItems(prev => ({ ...prev, [itemId]: true }));
        }, 2000);
      }
    });
  }, [currentTime, itemBids, soldItems]);
  

  const handleWatchItem = (itemId) => {
    const newWatchedItems = new Set(watchedItems);
    if (newWatchedItems.has(itemId)) {
      newWatchedItems.delete(itemId);
    } else {
      newWatchedItems.add(itemId);
    }
    setWatchedItems(newWatchedItems);
    // Save to localStorage
    try {
      localStorage.setItem('watchedItems', JSON.stringify(Array.from(newWatchedItems)));
    } catch (e) {
      console.error('Error saving watched items:', e);
    }
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
    if (!Array.isArray(marketItems)) {
      return [];
    }
    
    // Get current game ID
    const currentGameId = selectedGame?.id || selectedGame?.gameId || gameId;
    
    return marketItems.filter(item => {
      // Filter out sold items (items that were won in bids)
      if (soldItems[item.id]) {
        return false;
      }
      
      // First, ensure item belongs to the current game
      if (currentGameId) {
        const itemGameId = item.gameId;
        if (itemGameId && String(currentGameId) !== String(itemGameId)) {
          return false; // Item doesn't belong to current game
        }
      }
      
      // Rarity filter (multiple choice)
      const rarityMatch = rarityFilter.has('all') || rarityFilter.has(item.rarity.toLowerCase());
      
      // Search filter
      const searchMatch = !itemSearch || item.name.toLowerCase().includes(itemSearch.toLowerCase()) || 
                          (item.seller && item.seller.toLowerCase().includes(itemSearch.toLowerCase()));
      
      // Price filter (multiple choice)
      let priceMatch = true;
      if (!priceFilter.has('all')) {
        const price = item.price || 0;
        priceMatch = (priceFilter.has('under-10') && price < 10) ||
                     (priceFilter.has('10-50') && price >= 10 && price <= 50) ||
                     (priceFilter.has('50-100') && price > 50 && price <= 100) ||
                     (priceFilter.has('over-100') && price > 100);
      }
      
      return rarityMatch && searchMatch && priceMatch;
    });
  }, [marketItems, rarityFilter, itemSearch, priceFilter, selectedGame, gameId, soldItems]);

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
  
  // Check and process expired bids - must be after sortedItems definition
  useEffect(() => {
    const checkExpiredBids = async () => {
      const now = Date.now();
      const sortedItemsArray = sortedItems || [];
      
      for (const item of sortedItemsArray) {
        const bid = itemBids[item.id];
        if (bid?.saleType === 'bid' && bid?.bidEndTime && bid.bidEndTime <= now && !soldItems[item.id] && !noBidItems[item.id]) {
          // Bid expired - check if there are any valid bids
          // Only consider bidHistory - if it's empty or doesn't exist, no bids were placed
          const hasValidBids = bid.bidHistory && Array.isArray(bid.bidHistory) && bid.bidHistory.length > 0;
          
          let highestBid = null;
          if (hasValidBids) {
            // Find highest bid from history
            highestBid = bid.bidHistory.reduce((max, b) => b.amount > max.amount ? b : max, bid.bidHistory[0]);
          }
          // If no valid bids in history, highestBid remains null
          
          if (highestBid) {
            // Remove item from marketplace
            const gameId = item.gameId || selectedGame?.id || selectedGame?.gameId;
            if (gameId) {
              try {
                // Remove item from marketplace
                const marketItems = await getUserData(`marketItems_${gameId}`, []);
                const updatedMarketItems = marketItems.filter(marketItem => marketItem.id !== item.id);
                await saveUserData(`marketItems_${gameId}`, updatedMarketItems);
                
                // Add item to winner's inventory (not back to seller)
                const winnerUserId = highestBid.userId;
                if (winnerUserId && winnerUserId !== 'current-user') {
                  // Add to winner's inventory using their userId
                  const winnerInventory = await getUserData(`inventory_${gameId}`, [], winnerUserId);
                  const itemToAdd = {
                    ...item,
                    id: `bid-won-${item.id}-${Date.now()}`, // New ID to avoid conflicts
                    purchasedAt: Date.now(),
                    wonFromBid: true,
                    bidAmount: highestBid.amount
                  };
                  const updatedWinnerInventory = Array.isArray(winnerInventory) ? [...winnerInventory, itemToAdd] : [itemToAdd];
                  await saveUserData(`inventory_${gameId}`, updatedWinnerInventory, winnerUserId);
                  console.log(`✅ Item "${item.name}" transferred to winner ${winnerUserId} for $${highestBid.amount.toFixed(2)}`);
                } else if (winnerUserId === 'current-user' || !winnerUserId) {
                  // Current user won - add to their inventory
                  const currentUserId = await getCurrentUserId();
                  if (currentUserId) {
                const winnerInventory = await getUserData(`inventory_${gameId}`, []);
                const itemToAdd = {
                  ...item,
                      id: `bid-won-${item.id}-${Date.now()}`,
                      purchasedAt: Date.now(),
                      wonFromBid: true,
                      bidAmount: highestBid.amount
                    };
                    const updatedWinnerInventory = Array.isArray(winnerInventory) ? [...winnerInventory, itemToAdd] : [itemToAdd];
                    await saveUserData(`inventory_${gameId}`, updatedWinnerInventory);
                    console.log(`✅ Item "${item.name}" transferred to current user for $${highestBid.amount.toFixed(2)}`);
                  }
                }
                
                // Mark item as sold (this will hide the entire item from the list)
                setSoldItems(prev => ({ ...prev, [item.id]: true }));
                
                // Remove from itemBids
                setItemBids(prev => {
                  const updated = { ...prev };
                  delete updated[item.id];
                  localStorage.setItem('market_item_bids', JSON.stringify(updated));
                  return updated;
                });
                
                // Refresh marketplace to remove the item from display
                setMarketItemsRefresh(prev => prev + 1);
                
                console.log(`🏁 Bid ended for "${item.name}" - item removed from marketplace and transferred to winner`);
              } catch (error) {
                console.error('Error processing expired bid:', error);
              }
            }
          } else {
            // No bids - return to seller's inventory
            const gameId = item.gameId || selectedGame?.id || selectedGame?.gameId;
            if (gameId) {
              try {
                // Remove item from marketplace
                const marketItems = await getUserData(`marketItems_${gameId}`, []);
                const updatedMarketItems = marketItems.filter(marketItem => marketItem.id !== item.id);
                await saveUserData(`marketItems_${gameId}`, updatedMarketItems);
                
                // Return item to seller's inventory
                const sellerId = item.sellerId;
                if (sellerId) {
                  const sellerInventory = await getUserData(`inventory_${gameId}`, [], sellerId);
                  const inventoryArray = Array.isArray(sellerInventory) ? [...sellerInventory] : [];
                  
                  // Check if item already exists in inventory
                  const existingItem = inventoryArray.find(invItem => 
                    String(invItem.id) === String(item.originalItemId || item.id) &&
                    String(invItem.gameId) === String(gameId)
                  );
                  
                  if (!existingItem) {
                    // Reconstruct original item from marketplace item
                    const restoredItem = {
                      id: item.originalItemId || item.id,
                      gameId: gameId,
                      gameName: item.gameName || selectedGame?.name,
                      name: item.name,
                      description: item.description,
                      rarity: item.rarity,
                      type: item.type,
                      category: item.category,
                      image: item.image,
                      imageUrl: item.imageUrl
                    };
                    
                    inventoryArray.push(restoredItem);
                    await saveUserData(`inventory_${gameId}`, inventoryArray, sellerId);
                    console.log(`✅ Item "${item.name}" returned to seller ${sellerId}'s inventory (no bids placed)`);
                  }
                } else {
                  // Fallback: try current user if sellerId not found
                  const currentUserId = await getCurrentUserId();
                  if (currentUserId) {
                    const inventory = await getUserData(`inventory_${gameId}`, []);
                    const inventoryArray = Array.isArray(inventory) ? [...inventory] : [];
                    
                    const existingItem = inventoryArray.find(invItem => 
                      String(invItem.id) === String(item.originalItemId || item.id) &&
                      String(invItem.gameId) === String(gameId)
                    );
                    
                    if (!existingItem) {
                      const restoredItem = {
                        id: item.originalItemId || item.id,
                        gameId: gameId,
                        gameName: item.gameName || selectedGame?.name,
                        name: item.name,
                        description: item.description,
                        rarity: item.rarity,
                        type: item.type,
                        category: item.category,
                        image: item.image,
                        imageUrl: item.imageUrl
                      };
                      
                      inventoryArray.push(restoredItem);
                      await saveUserData(`inventory_${gameId}`, inventoryArray);
                      console.log(`✅ Item "${item.name}" returned to current user's inventory (no bids placed)`);
                    }
                  }
                }
                
                // Mark as no bid - this will show "NO BID PLACED" in red
                setNoBidItems(prev => ({ ...prev, [item.id]: true }));
                
                // Remove from itemBids
                setItemBids(prev => {
                  const updated = { ...prev };
                  delete updated[item.id];
                  localStorage.setItem('market_item_bids', JSON.stringify(updated));
                  return updated;
                });
                
                // Hide item after showing "NO BID PLACED" for 2 seconds
                setTimeout(() => {
                  setSoldItems(prev => ({ ...prev, [item.id]: true }));
                }, 2000);
                
                setMarketItemsRefresh(prev => prev + 1);
                console.log(`🏁 Bid ended for "${item.name}" with no bids - item returned to seller`);
              } catch (error) {
                console.error('Error processing expired bid with no winner:', error);
              }
            }
          }
        }
      }
    };
    
    const interval = setInterval(checkExpiredBids, 1000); // Check every second
    return () => clearInterval(interval);
  }, [sortedItems, selectedGame, soldItems, itemBids, noBidItems]);

  // Always set bid amount to 1 cent higher than current highest bid when modal opens
  useEffect(() => {
    if (showBidModal && selectedBidItem) {
      const expectedBidAmount = selectedBidItem.currentPrice + 0.01;
      const currentBidAmount = bidInputs[selectedBidItem.id]?.amount;
      
      // Only update if the amount is different (to avoid infinite loops)
      if (currentBidAmount !== expectedBidAmount) {
        setBidInputs(prev => ({
          ...prev,
          [selectedBidItem.id]: {
            ...prev[selectedBidItem.id],
            amount: expectedBidAmount,
            duration: prev[selectedBidItem.id]?.duration || selectedBidItem.bidDuration || 60
          }
        }));
      }
    }
  }, [showBidModal, selectedBidItem]);

  // Remove sold items from cart
  useEffect(() => {
    const removeSoldItemsFromCart = async () => {
      const soldItemIds = Object.keys(soldItems).filter(id => soldItems[id]);
      if (soldItemIds.length === 0) return;

      const userId = await getCurrentUserId();
      if (!userId) return;

      try {
        const api = window.electronAPI;
        let currentCartItems = [];
        
        if (api?.dbGetCartItems) {
          const result = await api.dbGetCartItems(userId);
          if (result && result.success && Array.isArray(result.items)) {
            currentCartItems = result.items;
          }
        } else {
          const stored = localStorage.getItem(`cartItems_${userId}`);
          if (stored) {
            currentCartItems = JSON.parse(stored);
          }
        }

        const updatedCart = currentCartItems.filter(i => 
          !(i.itemType === 'market_item' && soldItemIds.includes(i.itemData?.id))
        );

        if (updatedCart.length !== currentCartItems.length) {
          if (api?.dbSaveCartItems) {
            await api.dbSaveCartItems(userId, updatedCart);
          } else {
            localStorage.setItem(`cartItems_${userId}`, JSON.stringify(updatedCart));
          }
          
          // Trigger cart update event for TopNavigation
          window.dispatchEvent(new CustomEvent('cart-updated'));
        }
      } catch (error) {
        console.error('Error removing sold items from cart:', error);
      }
    };

    removeSoldItemsFromCart();
  }, [soldItems]);

  // If no game is selected, show game selection
  // But don't show it if we're restoring a game (check localStorage for smooth transition)
  const shouldShowSelection = !selectedGame && !isRestoringGame;
  if (shouldShowSelection) {
    // Check if we should be restoring (for smooth transition)
    // If we're in browse view and have a saved game or gameId in URL, don't show selection screen yet
    // The useEffect will handle the restoration - wait for it to complete
    if (marketView === 'browse' && (lastSelectedGameInBrowse || gameId)) {
      // We have a saved game or gameId, so we're likely restoring - don't show selection screen
      // Return a minimal container that will be replaced once restoration completes
      // This prevents the flash of the selection screen
      return (
        <div className="market" style={{ '--market-sidebar-width': `${marketLeftSidebarWidth}px` }}>
          <div className="market-main-container">
            <div className="marketplace-content">
              {/* Placeholder - restoration in progress */}
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="market" style={{ '--market-sidebar-width': `${marketLeftSidebarWidth}px` }}>
        <div className="market-main-container">
        {/* Main Content Area */}
        <div className="marketplace-content">
          {/* Live Activity Ticker - Always at top in all views */}
            <div 
              className="marketplace-ticker"
              style={{ '--content-width': `${contentWidth}px` }}
            >
              <div className="ticker-label">
              <span className="live-status-text active">Live</span>
            </div>
              <div className="ticker-content">
              <div className="ticker-content-wrapper">
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
                {/* Duplicate for seamless loop */}
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
          </div>

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
              {[...watchedGames].filter(gameId => {
                if (!generalSearch) return true;
                const game = gamesWithMarkets.find(g => g.id === gameId);
                if (!game) return false;
                const searchLower = generalSearch.toLowerCase();
                const name = (game.name || '').toLowerCase();
                const id = (game.id || game.gameId || '').toLowerCase();
                return name.includes(searchLower) || id.includes(searchLower);
              }).map(gameId => {
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
        ) : marketView === 'favorites' && watchedGames.size === 0 && watchedItems.size > 0 ? (
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
                  <h1 className="marketplace-hero-title">Watched Items</h1>
                  <p className="marketplace-hero-subtitle">Monitor {watchedItems.size} {watchedItems.size === 1 ? 'item' : 'items'} for price changes.</p>
                </div>
              </div>
            </div>
            
            <div className="marketplace-items-container">
              {(() => {
                // Get all watched items from all games
                const allWatchedItems = allMarketItemsForWatchlist.filter(item => watchedItems.has(item.id));
                
                if (allWatchedItems.length === 0) {
                  return (
                    <div className="marketplace-empty-state">
                      <div className="empty-state-icon">📦</div>
                      <h3 className="empty-state-title">No watched items available</h3>
                      <p className="empty-state-text">The items you're watching are not currently listed in the marketplace.</p>
                    </div>
                  );
                }
                
                // Separate bid items and buy items
                const bidItems = allWatchedItems.filter(item => {
                  const itemSaleType = item.saleType || 'buy';
                  const bid = itemBids[item.id];
                  return itemSaleType === 'bid' || bid?.saleType === 'bid';
                });
                const buyItems = allWatchedItems.filter(item => {
                  const itemSaleType = item.saleType || 'buy';
                  const bid = itemBids[item.id];
                  return itemSaleType !== 'bid' && bid?.saleType !== 'bid';
                });
                
                return (
                  <>
                    {/* Bid Items - Horizontal Scrollable Row */}
                    {bidItems.length > 0 && (
                      <>
                        <div className="watchlist-bid-row">
                          <div className="watchlist-bid-scroll">
                            {bidItems.map(item => {
                              // Get bid data for this item
                              const bid = itemBids[item.id];
                              const itemSaleType = item.saleType || 'buy';
                              const isBidMode = itemSaleType === 'bid' || bid?.saleType === 'bid';
                              const bidEndTime = bid?.bidEndTime || item.bidEndTime;
                              const now = currentTime;
                              const isBidActive = isBidMode && bidEndTime && bidEndTime > now;
                              const isBidEnded = isBidMode && bidEndTime && bidEndTime <= now;
                              
                              return (
                                <div 
                                  key={item.id} 
                                  className="market-item-card watchlist-bid-card"
                                  onClick={() => {
                                    setSelectedItemDetail(item);
                                    setShowItemDetailModal(true);
                                  }}
                                >
                                  <div className="item-image-container">
                                    {item.imageUrl ? (
                                      <img 
                                        src={item.imageUrl} 
                                        alt={item.name}
                                        className="item-image"
                                        onError={(e) => {
                                          e.target.style.display = 'none';
                                          e.target.nextSibling.style.display = 'flex';
                                        }}
                                      />
                                    ) : null}
                                    <div className="item-icon-large" style={{display: item.imageUrl ? 'none' : 'flex'}}>
                                      {item.image || '📦'}
                                    </div>
                                    <button 
                                      className={`watch-btn watch-btn-image ${watchedItems.has(item.id) ? 'watched' : ''}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleWatchItem(item.id);
                                      }}
                                      title={watchedItems.has(item.id) ? 'Remove from watchlist' : 'Add to watchlist'}
                                    >
                                      {watchedItems.has(item.id) ? <Eye size={16} /> : <EyeOff size={16} />}
                                    </button>
                                  </div>
                                  <div className={`rarity-line rarity-${item.rarity.toLowerCase()}`}></div>
                                  <div className="item-details">
                                    <div className="item-name-row">
                                      <h3 className="item-name-large">{item.name}</h3>
                                    </div>
                                    <div className="item-meta-row">
                                      <span className="seller-name">{item.seller || 'Unknown'}</span>
                                      <span className="item-price">${item.price.toFixed(2)}</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        
                        {/* Divider between bid and buy items */}
                        {buyItems.length > 0 && (
                          <div className="watchlist-divider"></div>
                        )}
                      </>
                    )}
                    
                    {/* Buy Items - Normal Grid */}
                    {buyItems.length > 0 && (
                      <div className={`items-grid ${viewMode === 'grid' ? 'grid-view' : 'row-view'}`}>
                        {buyItems.map(item => (
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
                              <button 
                                className={`watch-btn watch-btn-image ${watchedItems.has(item.id) ? 'watched' : ''}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleWatchItem(item.id);
                                }}
                                title={watchedItems.has(item.id) ? 'Remove from watchlist' : 'Add to watchlist'}
                              >
                                {watchedItems.has(item.id) ? <Eye size={16} /> : <EyeOff size={16} />}
                              </button>
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
                              
                            </div>
                            
                            <div className="item-action-buttons" onClick={(e) => e.stopPropagation()}>
                              {(() => {
                                const bid = itemBids[item.id];
                                const itemSaleType = item.saleType || 'buy';
                                const isBidMode = itemSaleType === 'bid' || bid?.saleType === 'bid';
                                
                                // Use bid data from itemBids or from item itself
                                let bidEndTime = bid?.bidEndTime || item.bidEndTime;
                                const bidDuration = bid?.bidDuration || item.bidDuration || 60;
                                const currentBid = bid?.currentBid || item.currentBid || item.price;
                                const now = Date.now();
                                
                                // If item is in bid mode but has no bidEndTime, start timer immediately
                                if (isBidMode && !bidEndTime) {
                                  bidEndTime = now + (bidDuration * 60 * 1000);
                                }
                                
                                const isBidActive = isBidMode && bidEndTime && bidEndTime > now;
                                const isBidEnded = isBidMode && bidEndTime && bidEndTime <= now;
                                
                                // Calculate progress and timer for active bids
                                const timeRemaining = isBidActive ? Math.max(0, bidEndTime - now) : 0;
                                const totalDuration = bidDuration * 60 * 1000;
                                const progress = totalDuration > 0 ? ((totalDuration - timeRemaining) / totalDuration) * 100 : 0;
                                const timeFormatted = formatTimeRemaining(timeRemaining);
                                // For bid items, use currentBid if available, otherwise use item price
                                const currentPrice = isBidMode ? (currentBid || item.price) : item.price;
                                const isNearEnd = progress >= 90;
                                // Check if there are any valid bids - only bidHistory counts
                                const hasBids = bid.bidHistory && Array.isArray(bid.bidHistory) && bid.bidHistory.length > 0;
                                // If bid ended and no bids in history, show "NO BID PLACED" (even if bids were removed)
                                const isNoBid = isBidEnded && !hasBids;
                                const timerText = isBidEnded ? (isNoBid ? 'no bid placed' : 'bid ended') : (isNearEnd ? `bidding ending | ${timeFormatted}` : timeFormatted);
                                
                                if (soldItems[item.id]) {
                                  return null; // Don't render sold items
                                }
                                
                                // Check if current user is the seller
                                const isSeller = item.sellerId && currentUserId && String(item.sellerId) === String(currentUserId);
                                
                                // Show bid button if item is in bid mode (active or not yet started), otherwise show buy button
                                if (isBidMode) {
                                  // Bid item - show bid button (active, ended, or not yet started)
                                  return (
                                    <div className="buy-button-wrapper">
                                      {(isBidActive || isBidEnded) && (
                                        <div className="bid-info-row">
                                          <div className={isNearEnd && !isBidEnded ? 'bid-timer-above bid-timer-warning' : 'bid-timer-above'}>
                                            {timerText}
                                          </div>
                                        </div>
                                      )}
                                      <div className="button-row">
                                        <button 
                                          className={`compare-btn-item ${comparisonItems.some(i => i.id === item.id) ? 'active' : ''}`}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            e.preventDefault();
                                            handleAddToComparison(item, e);
                                          }}
                                          title={comparisonItems.some(i => i.id === item.id) ? 'Remove from comparison' : 'Add to comparison'}
                                        >
                                          <GitCompare size={14} />
                                        </button>
                                        <div className="bid-buttons-container">
                                          <button 
                                            className={`buy-now-btn bid-mode ${isBidActive ? 'bid-active' : ''} ${isBidEnded && hasBids ? 'bid-sold' : ''} ${isNoBid ? 'bid-no-bid' : ''} ${isSeller ? 'seller-item' : ''}`}
                                            onClick={() => {
                                              if (!isBidEnded && !isSeller) {
                                                setSelectedBidItem(item);
                                                setShowBidModal(true);
                                              }
                                            }}
                                            disabled={isBidEnded || isSeller}
                                            title={isSeller ? 'You cannot bid on your own item' : isBidEnded ? 'Bid ended' : 'Place a bid'}
                                          >
                                            {isBidActive && !isBidEnded && (
                                              <div 
                                                className="bid-progress-bar"
                                                style={{ width: `${progress}%` }}
                                              />
                                            )}
                                            <span className="buy-button-text">
                                              {isBidEnded ? (
                                                <>
                                                  <span className="buy-price">${formatPriceCompact(currentPrice)}</span>
                                                  <span className="buy-label bid-label">{isNoBid ? 'NO BID PLACED' : 'SOLD'}</span>
                                                </>
                                              ) : (
                                                <>
                                                  <span className="buy-price">${formatPriceCompact(currentPrice)}</span>
                                                  <span className="buy-label bid-label">Bid</span>
                                                </>
                                              )}
                                            </span>
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                } else {
                                  // Buy now item - show buy button
                                  const lock = lockedItems[item.id];
                                  const LOCK_TIMEOUT = 30000;
                                  const isLocked = lock && (now - lock.timestamp) < LOCK_TIMEOUT;
                                  const isLockedByOther = isLocked && lock.userId !== currentUserId;
                                  const isLockedByMe = isLocked && lock.userId === currentUserId;
                                  
                                  const isInCart = cartItems.some(i => i.itemType === 'market_item' && i.itemData?.id === item.id);
                                  
                                  // Check if current user is the seller
                                  const isSeller = item.sellerId && currentUserId && String(item.sellerId) === String(currentUserId);
                                  
                                  return (
                                    <div className="buy-button-wrapper">
                                      <div className="button-row">
                                        <button 
                                          className={`compare-btn-item ${comparisonItems.some(i => i.id === item.id) ? 'active' : ''}`}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            e.preventDefault();
                                            handleAddToComparison(item, e);
                                          }}
                                          title={comparisonItems.some(i => i.id === item.id) ? 'Remove from comparison' : 'Add to comparison'}
                                        >
                                          <GitCompare size={14} />
                                        </button>
                                        <div className="bid-buttons-container">
                                          <button 
                                            className={`buy-now-btn ${isLockedByOther ? 'locked' : ''} ${isLockedByMe ? 'locked-by-me' : ''} ${isSeller ? 'seller-item' : ''}`}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (!isLockedByOther && !isSeller) {
                                                handleBuyItem(item.id);
                                              }
                                            }}
                                            disabled={isLockedByOther || isSeller}
                                            title={isSeller ? 'You cannot buy your own item' : isLockedByOther ? 'This item is being purchased by another user' : isLockedByMe ? 'Confirming purchase...' : 'Buy now'}
                                          >
                                            <span className="buy-button-text">
                                              <span className="buy-price">${formatPriceCompact(item.price)}</span>
                                              <span className="buy-label">
                                                {isLockedByOther ? 'Locked' : isLockedByMe ? 'Confirming...' : 'Buy'}
                                              </span>
                                            </span>
                                          </button>
                                        </div>
                                        <button 
                                          className={`cart-btn-item ${isInCart ? 'active' : ''} ${isSeller ? 'seller-item' : ''}`}
                                          type="button"
                                          disabled={isSeller}
                                          onMouseDown={(e) => {
                                            e.stopPropagation();
                                            e.preventDefault();
                                          }}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            e.preventDefault();
                                            if (isSeller) return;
                                            // Use the same cart logic as in browse view
                                            (async () => {
                                              try {
                                                const userId = await getCurrentUserId();
                                                if (!userId) {
                                                  alert('Please log in to add items to cart.');
                                                  return;
                                                }
                                                const api = window.electronAPI;
                                                let currentCartItems = [];
                                                const stored = localStorage.getItem(`cartItems_${userId}`);
                                                if (stored) {
                                                  try {
                                                    const parsed = JSON.parse(stored);
                                                    if (Array.isArray(parsed)) {
                                                      currentCartItems = parsed;
                                                    }
                                                  } catch (e) {
                                                    console.error('Error parsing localStorage cart:', e);
                                                  }
                                                }
                                                const itemInCart = currentCartItems.some(i => 
                                                  i.itemType === 'market_item' && i.itemData?.id === item.id
                                                );
                                                let updatedCart;
                                                if (itemInCart) {
                                                  updatedCart = currentCartItems.filter(i => 
                                                    !(i.itemType === 'market_item' && i.itemData?.id === item.id)
                                                  );
                                                } else {
                                                  const cartItem = {
                                                    id: `market-${item.id}-${Date.now()}`,
                                                    amount: parseFloat(item.price) || 0,
                                                    timestamp: new Date().toISOString(),
                                                    itemType: 'market_item',
                                                    itemData: {
                                                      id: String(item.id || ''),
                                                      name: String(item.name || 'Unknown Item'),
                                                      price: parseFloat(item.price) || 0,
                                                      image: String(item.image || ''),
                                                      imageUrl: item.imageUrl ? String(item.imageUrl) : null,
                                                      gameId: item.gameId ? String(item.gameId) : null,
                                                      gameName: item.gameName || selectedGame?.name ? String(item.gameName || selectedGame?.name) : null,
                                                      seller: item.seller ? String(item.seller) : null,
                                                      sellerId: item.sellerId ? String(item.sellerId) : null
                                                    }
                                                  };
                                                  updatedCart = [...currentCartItems, cartItem];
                                                }
                                                const serializableCart = updatedCart.map(i => ({
                                                  id: String(i.id || Date.now()),
                                                  amount: parseFloat(i.amount || 0),
                                                  timestamp: String(i.timestamp || new Date().toISOString()),
                                                  itemType: String(i.itemType || 'market_item'),
                                                  itemData: i.itemData && typeof i.itemData === 'object' ? {
                                                    id: String(i.itemData.id || ''),
                                                    name: String(i.itemData.name || 'Unknown Item'),
                                                    price: parseFloat(i.itemData.price || 0),
                                                    image: String(i.itemData.image || ''),
                                                    imageUrl: i.itemData.imageUrl ? String(i.itemData.imageUrl) : null,
                                                    gameId: i.itemData.gameId ? String(i.itemData.gameId) : null,
                                                    gameName: i.itemData.gameName ? String(i.itemData.gameName) : null,
                                                    seller: i.itemData.seller ? String(i.itemData.seller) : null,
                                                    sellerId: i.itemData.sellerId ? String(i.itemData.sellerId) : null
                                                  } : {}
                                                }));
                                                localStorage.setItem(`cartItems_${userId}`, JSON.stringify(serializableCart));
                                                if (api?.dbSaveCartItems) {
                                                  try {
                                                    await api.dbSaveCartItems(userId, serializableCart);
                                                  } catch (err) {
                                                    console.error('Error saving to DB:', err);
                                                  }
                                                }
                                                setTimeout(() => {
                                                  window.dispatchEvent(new CustomEvent('cart-updated', { detail: { items: serializableCart } }));
                                                }, 100);
                                              } catch (error) {
                                                console.error('Cart error:', error);
                                                alert('Error: ' + (error.message || 'Failed to update cart'));
                                              }
                                            })();
                                          }}
                                          title={isSeller ? "You cannot add your own item to cart" : (isInCart ? "Remove from cart" : "Add to cart")}
                                        >
                                          <ShoppingCart size={14} className="cart-icon-default" />
                                          <Plus size={14} className="cart-icon-hover cart-icon-plus" />
                                          <Minus size={14} className="cart-icon-hover cart-icon-minus" />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                }
                              })()}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </>
        ) : marketView === 'favorites' && watchedGames.size === 0 && watchedItems.size === 0 ? (
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

                  {/* Games Grid with Virtual Scrolling */}
                  <div 
                    ref={gamesGridContainerRef}
                    className="games-selection-grid-container"
                    style={{ 
                      overflow: 'visible',
                      position: 'relative'
                    }}
                  >
                    {/* Top Spacer for items before visible range */}
                    {visibleRange.start > 0 && (() => {
                      // Calculate spacer height based on actual card dimensions
                      const contentWidth = typeof window !== 'undefined' ? window.innerWidth - 260 : 1020;
                      const minCardWidth = Math.max(150, Math.min(200, contentWidth * 0.12));
                      const gap = Math.max(16, Math.min(32, contentWidth * 0.024));
                      const itemsPerRow = Math.floor((contentWidth - 64) / (minCardWidth + gap)) || 5;
                      const cardHeight = minCardWidth * 1.5;
                      const rowHeight = cardHeight + gap;
                      const rowsBefore = Math.ceil(visibleRange.start / itemsPerRow);
                      return (
                        <div 
                          className="virtual-scroll-spacer"
                          style={{ 
                            height: `${rowsBefore * rowHeight}px`,
                            gridColumn: '1 / -1'
                          }}
                        />
                      );
                    })()}
                    
                    <div 
                      ref={gamesGridRef}
                      className="games-selection-grid"
                    >
                      {visibleGames.map((game, index) => {
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
                    
                    {/* Bottom Spacer for items after visible range */}
                    {visibleRange.end < currentGamesList.length && (() => {
                      // Calculate spacer height based on actual card dimensions
                      const contentWidth = typeof window !== 'undefined' ? window.innerWidth - 260 : 1020;
                      const minCardWidth = Math.max(150, Math.min(200, contentWidth * 0.12));
                      const gap = Math.max(16, Math.min(32, contentWidth * 0.024));
                      const itemsPerRow = Math.floor((contentWidth - 64) / (minCardWidth + gap)) || 5;
                      const cardHeight = minCardWidth * 1.5;
                      const rowHeight = cardHeight + gap;
                      const itemsAfter = currentGamesList.length - visibleRange.end;
                      const rowsAfter = Math.ceil(itemsAfter / itemsPerRow);
                      return (
                        <div 
                          className="virtual-scroll-spacer"
                          style={{ 
                            height: `${rowsAfter * rowHeight}px`,
                            gridColumn: '1 / -1'
                          }}
                        />
                      );
                    })()}
          </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Bottom Navigation Container - Search Button, Island, Close Button - Fixed at bottom */}
        <div className="market-bottom-menu-container">
          {/* Centered Menu Items Group */}
          <div className="market-bottom-menu-items">
            {/* Dummy element for centering in marketplace selection */}
            {!gameId && !selectedGame && <div className="market-bottom-nav-dummy"></div>}
            <div className="market-bottom-nav-container">
            {/* Search Button - Left of Island */}
            {!isSearchMode && (
              <button 
                className="market-search-trigger-button"
                onClick={() => {
                  setIsSearchMode(true);
                  setTimeout(() => {
                    if (searchInputRef.current) {
                      searchInputRef.current.focus();
                      searchInputRef.current.select();
                    }
                  }, 50);
                }}
              >
                <Search size={18} />
              </button>
            )}
            
            {/* Bottom Navigation Island / Search Bar */}
            <div className={`market-bottom-nav-island ${isSearchMode ? 'search-mode' : ''}`}>
              {!isSearchMode ? (
                <div className="market-bottom-nav-content">
                  <button 
                    className={`market-bottom-nav-item market-bottom-nav-main ${marketView === 'browse' ? 'active' : ''}`}
                    onClick={() => setMarketView('browse')}
                  >
                    <Search size={17} />
                    <span>Browse</span>
                  </button>
                  <button 
                    className={`market-bottom-nav-item ${marketView === 'favorites' ? 'active' : ''}`}
                    onClick={() => setMarketView('favorites')}
                  >
                    <Eye size={17} />
                    <span>Watchlist</span>
                  </button>
                  <button 
                    className={`market-bottom-nav-item ${marketView === 'stats' ? 'active' : ''}`}
                    onClick={() => setMarketView('stats')}
                  >
                    <BarChart3 size={17} />
                    <span>Analytics</span>
                  </button>
                  <button 
                    className={`market-bottom-nav-item ${marketView === 'petitions' ? 'active' : ''}`}
                    onClick={() => setMarketView('petitions')}
                  >
                    <FileText size={17} />
                    <span>Petitions</span>
                  </button>
                </div>
              ) : (
                <>
                  {/* Menu Selector - Options displayed above search bar */}
                  <div className="market-search-menu-toggle-wrapper">
                    <div className="market-search-menu-options">
                      <button 
                        className={`market-search-menu-option ${marketView === 'browse' ? 'active' : ''}`}
                        onClick={() => {
                          setMarketView('browse');
                          // Restore last selected game when returning to browse
                          if (lastSelectedGameInBrowse) {
                            const gameIdToNavigate = lastSelectedGameInBrowse.id || lastSelectedGameInBrowse.gameId;
                            const gameToRestore = lastSelectedGameInBrowse;
                            if (gameIdToNavigate) {
                              // Set flag to prevent clearing during navigation
                              isRestoringGameRef.current = true;
                              // Restore the selected game state immediately
                              setSelectedGame(gameToRestore);
                              // Navigate to the game's marketplace
                              navigate(`/game/${gameIdToNavigate}/market`);
                              // Ensure selectedGame is set after navigation completes
                              setTimeout(() => {
                                setSelectedGame(prev => {
                                  // Only update if not already set correctly
                                  if (!prev || (prev.id !== gameIdToNavigate && prev.gameId !== gameIdToNavigate)) {
                                    return gameToRestore;
                                  }
                                  return prev;
                                });
                                isRestoringGameRef.current = false;
                              }, 200);
                            } else {
                              setSelectedGame(null);
                              navigate('/market');
                            }
                          } else {
                            setSelectedGame(null);
                            navigate('/market');
                          }
                        }}
                      >
                        <ShoppingBag size={12} />
                        <span>Browse</span>
                      </button>
                      <button 
                        className={`market-search-menu-option ${marketView === 'favorites' ? 'active' : ''}`}
                        onClick={() => {
                          // Save current selectedGame when leaving browse
                          if (marketView === 'browse' && selectedGame) {
                            setLastSelectedGameInBrowse(selectedGame);
                          }
                          setSelectedGame(null);
                          setMarketView('favorites');
                          navigate('/market');
                        }}
                      >
                        <Eye size={14} />
                        <span>Watchlist</span>
                      </button>
                      <button 
                        className={`market-search-menu-option ${marketView === 'stats' ? 'active' : ''}`}
                        onClick={() => {
                          // Save current selectedGame when leaving browse
                          if (marketView === 'browse' && selectedGame) {
                            setLastSelectedGameInBrowse(selectedGame);
                          }
                          setSelectedGame(null);
                          setMarketView('stats');
                          navigate('/market');
                        }}
                      >
                        <BarChart3 size={12} />
                        <span>Analytics</span>
                      </button>
                      <button 
                        className={`market-search-menu-option ${marketView === 'petitions' ? 'active' : ''}`}
                        onClick={() => {
                          // Save current selectedGame when leaving browse
                          if (marketView === 'browse' && selectedGame) {
                            setLastSelectedGameInBrowse(selectedGame);
                          }
                          setSelectedGame(null);
                          setMarketView('petitions');
                          navigate('/market');
                        }}
                      >
                        <FileText size={12} />
                        <span>Petitions</span>
                      </button>
                    </div>
                  </div>
                  <div className="market-search-island-dummy-left"></div>
                  <div className="market-search-island-content">
                    <Search size={16} className="market-search-island-icon" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder={(() => {
                        if (gameId) {
                          return "Search items...";
                        }
                        switch (marketView) {
                          case 'browse':
                            return "Search games...";
                          case 'favorites':
                            return "Search watchlist...";
                          case 'stats':
                            return "Search analytics...";
                          case 'petitions':
                            return "Search petitions...";
                          default:
                            return "Search...";
                        }
                      })()}
                      value={gameId ? itemSearch : (marketView === 'petitions' ? petitionSearchQuery : generalSearch)}
                      onChange={(e) => {
                        if (gameId) {
                          setItemSearch(e.target.value);
                        } else if (marketView === 'petitions') {
                          setPetitionSearchQuery(e.target.value);
                        } else {
                          setGeneralSearch(e.target.value);
                        }
                      }}
                      className="market-search-island-input"
                    />
                  </div>
                  <button
                    className="market-search-island-clear"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsSearchMode(false);
                      if (gameId) {
                        setItemSearch('');
                      } else if (marketView === 'petitions') {
                        setPetitionSearchQuery('');
                      } else {
                        setGeneralSearch('');
                      }
                    }}
                  >
                    <X size={14} />
                  </button>
                  <div className="market-search-island-dummy-right"></div>
                </>
              )}
            </div>
            </div>
            {/* Dummy element for centering in marketplace selection */}
            {!gameId && !selectedGame && <div className="market-bottom-nav-dummy"></div>}
          </div>
        </div>

        {/* Right Sidebar - Hidden */}
        <div 
          className="market-sidebar-right"
          style={{ 
            display: 'none',
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

  // Render split view when comparison modal is open
  const renderComparisonPanel = () => {
    return (
      <div className="comparison-panel">
        <div className="comparison-panel-content">
          {comparisonItems.length === 0 ? (
            <div className="comparison-empty">
              <GitCompare size={48} />
              <p>No items selected for comparison</p>
              <span>Click the compare icon on items to add them</span>
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
                  : (comparisonItems.length <= 5 ? comparisonItems.length.toString() : '3'),
                '--grid-rows': comparisonViewMode === '3d'
                  ? (comparisonItems.length === 2 ? '1' : 
                     comparisonItems.length === 3 ? '2' : 
                     comparisonItems.length === 4 ? '2' : 
                     comparisonItems.length <= 6 ? '2' : 
                     comparisonItems.length <= 8 ? '2' : '2')
                  : (comparisonItems.length <= 5 ? '1' : '2')
              }}
            >
              {comparisonItems.map((item, index) => {
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
                      gridRow: `span ${spanRows}`,
                      cursor: 'pointer'
                    }}
                    onClick={(e) => {
                      // Only set as reference if clicking on the item itself, not on interactive elements
                      const target = e.target;
                      const isInteractiveElement = target.closest('.comparison-remove-btn') ||
                                                   target.closest('.comparison-reference-checkbox') ||
                                                   target.closest('.item-3d-controls') ||
                                                   target.closest('button');
                      if (!isInteractiveElement) {
                        setReferenceItemId(item.id);
                      }
                    }}
                  >
                    <div className="comparison-3d-header">
                      <div className="comparison-3d-header-left">
                        <div
                          className="comparison-reference-checkbox"
                          onClick={(e) => {
                            e.stopPropagation();
                            setReferenceItemId(item.id);
                          }}
                          title={isReference ? "Reference item" : "Set as reference"}
                        >
                          {isReference ? <CheckSquare size={18} /> : <Square size={18} />}
                        </div>
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
                    
                    {(comparisonViewMode === 'both' || comparisonViewMode === '3d') && (
                    <div className="item-3d-view">
                      <Item3DView
                        imageUrl={item.imageUrl}
                        image={item.image}
                        name={item.name}
                        isMaximized={expanded3DViews[item.id] || false}
                        onMaximizeToggle={() => {
                          setExpanded3DViews(prev => ({
                            ...prev,
                            [item.id]: !prev[item.id]
                          }));
                        }}
                        maxZoom={expanded3DViews[item.id] ? 4 : 2}
                        showMaximizeButton={true}
                        showZoomControls={true}
                      />
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
        
        {/* Fixed bottom control bar with floating islands */}
        <div className="comparison-bottom-controls">
          <button
            className="comparison-add-items-btn"
            onClick={() => {
              setShowAddItemsModal(true);
            }}
            title={comparisonItems.length > 0 ? `Add more items (${comparisonItems.length}/8)` : 'Add items to compare'}
          >
            <Plus size={16} />
            <span>Add Items</span>
          </button>
          
          {!isCompareOnlyMode && (
            <div className="comparison-control-island">
              <button
                className="comparison-popout-btn"
                onClick={async () => {
                  try {
                    const api = window.electronAPI;
                    if (api?.openPopOutWindow) {
                      const route = gameId ? `/game/${gameId}/market/compare` : '/market/compare';
                      await api.openPopOutWindow(route);
                    }
                  } catch (error) {
                    console.error('Error opening pop-out window:', error);
                  }
                }}
                title="Open in separate window"
              >
                <Maximize2 size={16} />
              </button>
            </div>
          )}
          
          <div className="comparison-control-island">
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
          </div>
          
          {comparisonItems.length > 0 && (
            <button className="comparison-clear-btn" onClick={handleClearComparison}>
              Clear All
            </button>
          )}
        </div>
      </div>
    );
  };

  // If in compare-only mode (pop-out window), show only the comparison panel
  // This early return must be AFTER renderComparisonPanel is defined
  if (isCompareOnlyMode) {
    return (
      <div className="market compare-only-mode">
        <div className="market-main-container">
          <div className="market-content-area">
            <div className="market-main-content">
              {renderComparisonPanel()}
            </div>
          </div>
        </div>
        
        {/* Add Items to Comparison Modal - Also available in pop-out */}
        {showAddItemsModal && (
          <div className="modal-overlay" onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setShowAddItemsModal(false);
            }
          }}>
            <div className="sell-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1000px', height: '80vh' }}>
              <div className="sell-modal-header">
                <h3>Add Items to Comparison ({comparisonItems.length}/8)</h3>
                <button className="modal-close-btn" onClick={() => setShowAddItemsModal(false)}>✕</button>
              </div>
              
              <div className="sell-modal-body" style={{ overflowY: 'auto', padding: '20px' }}>
                {(() => {
                  // Get current game ID
                  const currentGameId = selectedGame?.id || selectedGame?.gameId || gameId;
                  
                  // Filter out items that are already in comparison AND ensure items are from the current game
                  const availableItems = sortedItems.filter(item => {
                    // Check if item is already in comparison
                    const isInComparison = comparisonItems.some(compItem => compItem.id === item.id);
                    if (isInComparison) return false;
                    
                    // Check if item is from the current game
                    const itemGameId = item.gameId;
                    if (currentGameId && itemGameId) {
                      return String(currentGameId) === String(itemGameId);
                    }
                    
                    // If no game ID is set, allow the item (for backwards compatibility)
                    return true;
                  });
                  
                  return availableItems.length === 0 ? (
                    <div className="marketplace-empty-state" style={{ padding: '40px', textAlign: 'center' }}>
                      <div className="empty-state-icon">📦</div>
                      <h3 className="empty-state-title">No items available</h3>
                      <p className="empty-state-description">
                        {sortedItems.length === 0 
                          ? 'There are no items listed in the marketplace'
                          : 'All available items are already in the comparison'}
                      </p>
                    </div>
                  ) : (
                    <div className="items-grid grid-view" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                      {availableItems.map(item => {
                        const canAdd = comparisonItems.length < 8;
                        
                        return (
                          <div 
                            key={item.id} 
                            className="market-item-card"
                            style={{ cursor: canAdd ? 'pointer' : 'default' }}
                            onClick={() => {
                              if (canAdd) {
                                handleAddToComparison(item, { stopPropagation: () => {} });
                              }
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
                                <button 
                                  className="compare-btn-item"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddToComparison(item, e);
                                  }}
                                  disabled={!canAdd}
                                  title={canAdd ? 'Add to comparison' : 'Maximum 8 items'}
                                >
                                  <GitCompare size={14} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="market" style={{ '--market-sidebar-width': `${marketLeftSidebarWidth}px` }}>
      <div className="market-main-container">
        <div className="market-content-area">
          <div className="market-main-content">
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
                    // Clear selected game and localStorage
                    setSelectedGame(null);
                    setLastSelectedGameInBrowse(null);
                    setIsRestoringGame(false);
                    isRestoringGameRef.current = false;
                    try {
                      localStorage.removeItem('market_selected_game');
                      localStorage.removeItem('market_last_selected_game');
                    } catch (error) {
                      console.error('Error clearing selected game from localStorage:', error);
                    }
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
                    // Clear selected game and localStorage
                    setSelectedGame(null);
                    setLastSelectedGameInBrowse(null);
                    setIsRestoringGame(false);
                    isRestoringGameRef.current = false;
                    try {
                      localStorage.removeItem('market_selected_game');
                      localStorage.removeItem('market_last_selected_game');
                    } catch (error) {
                      console.error('Error clearing selected game from localStorage:', error);
                    }
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
                {gameId && (
                  <div className="banner-view-controls">
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

        {/* Comparison Panel - Only shown in pop-out window, not in main window */}

        
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
              {/* Remove button for own items */}
              {(() => {
                // Check ownership by user ID (more reliable) or username (fallback)
                const isOwnerById = currentUserId && item.sellerId && String(item.sellerId) === String(currentUserId);
                const isOwnerByUsername = currentUsername && item.seller && (
                  String(item.seller).toLowerCase().trim() === String(currentUsername).toLowerCase().trim() ||
                  String(item.seller) === String(currentUsername)
                );
                const isOwner = isOwnerById || isOwnerByUsername;
                
                // Debug logging for all items to help diagnose
                if (process.env.NODE_ENV === 'development' || true) {
                  console.log('Item ownership check:', { 
                    itemId: item.id,
                    itemName: item.name,
                    itemSeller: item.seller,
                    itemSellerId: item.sellerId,
                    currentUsername, 
                    currentUserId,
                    isOwner,
                    isOwnerById,
                    isOwnerByUsername,
                    sellerMatch: item.seller && currentUsername ? String(item.seller).toLowerCase().trim() === String(currentUsername).toLowerCase().trim() : false,
                    sellerExactMatch: item.seller === currentUsername
                  });
                }
                
                // Always show button if user is logged in, but check ownership in onClick
                if (!currentUsername && !currentUserId) {
                  return null;
                }
                
                return (
                  <button 
                    className="item-remove-btn"
                    style={{ display: isOwner ? 'flex' : 'none' }}
                    onClick={async (e) => {
                      e.stopPropagation();
                      
                      // Re-check ownership before removing
                      const checkOwnerById = currentUserId && item.sellerId && String(item.sellerId) === String(currentUserId);
                      const checkOwnerByUsername = currentUsername && item.seller && (
                        String(item.seller).toLowerCase().trim() === String(currentUsername).toLowerCase().trim() ||
                        String(item.seller) === String(currentUsername)
                      );
                      
                      if (!checkOwnerById && !checkOwnerByUsername) {
                        alert('You can only remove your own items.');
                        console.error('Ownership check failed:', {
                          itemSeller: item.seller,
                          itemSellerId: item.sellerId,
                          currentUsername,
                          currentUserId
                        });
                        return;
                      }
                      
                      if (confirm(`Are you sure you want to remove "${item.name}" from the marketplace? This will cancel any active bids and return the item to your inventory.`)) {
                        try {
                          const gameId = item.gameId || selectedGame?.id || selectedGame?.gameId;
                          
                          // 1. Cancel/end any active bids for this item
                          setItemBids(prev => {
                            const updated = { ...prev };
                            if (updated[item.id]) {
                              delete updated[item.id];
                              localStorage.setItem('market_item_bids', JSON.stringify(updated));
                            }
                            return updated;
                          });
                          
                          // 2. Remove item from marketplace
                          const marketItems = await getUserData(`marketItems_${gameId}`, []);
                          const itemToRemove = marketItems.find(mi => mi.id === item.id);
                          const updatedItems = marketItems.filter(mi => mi.id !== item.id);
                          await saveUserData(`marketItems_${gameId}`, updatedItems);
                          
                          // 3. Return item to inventory if it has originalItemId
                          if (itemToRemove && itemToRemove.originalItemId) {
                            const inventory = await getUserData(`inventory_${gameId}`, []);
                            const inventoryArray = Array.isArray(inventory) ? inventory : [];
                            
                            // Check if item already exists in inventory
                            const existingItem = inventoryArray.find(invItem => 
                              String(invItem.id) === String(itemToRemove.originalItemId) &&
                              String(invItem.gameId) === String(gameId)
                            );
                            
                            if (!existingItem) {
                              // Reconstruct original item from marketplace item
                              const restoredItem = {
                                id: itemToRemove.originalItemId,
                                gameId: gameId,
                                gameName: itemToRemove.gameName || selectedGame?.name,
                                name: itemToRemove.name,
                                description: itemToRemove.description,
                                rarity: itemToRemove.rarity,
                                type: itemToRemove.type,
                                category: itemToRemove.category,
                                image: itemToRemove.image,
                                imageUrl: itemToRemove.imageUrl
                              };
                              
                              inventoryArray.push(restoredItem);
                              await saveUserData(`inventory_${gameId}`, inventoryArray);
                              console.log('Item restored to inventory:', restoredItem.id);
                              
                              // Refresh inventory
                              setInventoryRefresh(prev => prev + 1);
                            }
                          }
                          
                          // 4. Refresh marketplace
                          setMarketItemsRefresh(prev => prev + 1);
                          console.log('Item removed from marketplace and bid cancelled:', item.id);
                        } catch (error) {
                          console.error('Error removing item:', error);
                          alert('Error removing item. Please try again.');
                        }
                      }
                    }}
                    title="Remove from marketplace"
                  >
                    <X size={14} />
                  </button>
                );
              })()}
              <button 
                className={`watch-btn watch-btn-image ${watchedItems.has(item.id) ? 'watched' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleWatchItem(item.id);
                }}
                title={watchedItems.has(item.id) ? 'Remove from watchlist' : 'Add to watchlist'}
              >
                {watchedItems.has(item.id) ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>
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
              
            </div>
            
            <div className="item-action-buttons" onClick={(e) => e.stopPropagation()}>
              {(() => {
                const bid = itemBids[item.id];
                const itemSaleType = item.saleType || 'buy';
                const isBidMode = itemSaleType === 'bid' || bid?.saleType === 'bid';
                
                // Check if item was listed as bid (from item.saleType) or has active bid in itemBids
                // Default to 'buy' if saleType is not set (for backward compatibility)
                
                // Use bid data from itemBids or from item itself
                let bidEndTime = bid?.bidEndTime || item.bidEndTime;
                const bidDuration = bid?.bidDuration || item.bidDuration || 60;
                const currentBid = bid?.currentBid || item.currentBid || item.price;
                const now = currentTime;
                
                // If item is in bid mode but has no bidEndTime, start timer immediately
                if (isBidMode && !bidEndTime) {
                  bidEndTime = now + (bidDuration * 60 * 1000);
                }
                
                const isBidActive = isBidMode && bidEndTime && bidEndTime > now;
                const isBidEnded = isBidMode && bidEndTime && bidEndTime <= now;
                
                // Calculate progress and timer for active bids
                const timeRemaining = isBidActive ? Math.max(0, bidEndTime - now) : 0;
                const totalDuration = bidDuration * 60 * 1000;
                const progress = totalDuration > 0 ? ((totalDuration - timeRemaining) / totalDuration) * 100 : 0;
                const timeFormatted = formatTimeRemaining(timeRemaining);
                // For bid items, use currentBid if available, otherwise use item price
                const currentPrice = isBidMode ? (currentBid || item.price) : item.price;
                const isNearEnd = progress >= 90;
                // Check if there are any valid bids - only bidHistory counts, not currentBid
                const hasBids = bid?.bidHistory && Array.isArray(bid.bidHistory) && bid.bidHistory.length > 0;
                const isNoBid = isBidEnded && !hasBids;
                const timerText = isBidEnded ? (isNoBid ? 'no bid placed' : 'bid ended') : (isNearEnd ? `bidding ending | ${timeFormatted}` : timeFormatted);
                
                if (soldItems[item.id]) {
                  return null; // Don't render sold items
                }
                
                // Check if current user is the seller
                const isSeller = item.sellerId && currentUserId && String(item.sellerId) === String(currentUserId);
                
                // Check if current user has a bid - get the most recent/highest one
                const userBids = bid?.bidHistory?.filter(b => {
                  return b.userId === currentUserId || b.userId === 'current-user';
                }) || [];
                // Get the highest bid from user (most recent or highest amount)
                const userBid = userBids.length > 0 
                  ? userBids.reduce((max, b) => b.amount > max.amount ? b : max, userBids[0])
                  : null;
                const userBidAmount = userBid?.amount;
                
                // Check if user is the highest bidder
                const isHighestBidder = userBidAmount && userBidAmount === currentPrice;
                
                // Show bid button if item is in bid mode (active or not yet started), otherwise show buy button
                if (isBidMode) {
                  // Bid item - show bid button (active, ended, or not yet started)
                  return (
                    <div className="buy-button-wrapper">
                      {(isBidActive || isBidEnded) && (
                        <div className="bid-info-row">
                          <div className={isNearEnd && !isBidEnded ? 'bid-timer-above bid-timer-warning' : 'bid-timer-above'}>
                            {timerText}
                          </div>
                        </div>
                      )}
                      <div className="button-row">
              <button 
                className={`compare-btn-item ${comparisonItems.some(i => i.id === item.id) ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  handleAddToComparison(item, e);
                }}
                title={comparisonItems.some(i => i.id === item.id) ? 'Remove from comparison' : 'Add to comparison'}
              >
                <GitCompare size={14} />
              </button>
                        <div className="bid-buttons-container">
                          <button 
                            className={`buy-now-btn bid-mode ${isBidActive ? 'bid-active' : ''} ${isBidEnded && hasBids ? 'bid-sold' : ''} ${isNoBid ? 'bid-no-bid' : ''} ${isSeller ? 'seller-item' : ''}`}
                            onClick={() => {
                              if (!isBidEnded && !isSeller) {
                                setSelectedBidItem(item);
                                setShowBidModal(true);
                              }
                            }}
                            disabled={isBidEnded || isSeller}
                            title={isSeller ? 'You cannot bid on your own item' : isBidEnded ? 'Bid ended' : 'Place a bid'}
                          >
                            {isBidActive && !isBidEnded && (
                              <div 
                                className="bid-progress-bar"
                                style={{ width: `${progress}%` }}
                              />
                            )}
                            <span className="buy-button-text">
                              {isBidEnded ? (
                                <>
                                  <span className="buy-price">${formatPriceCompact(currentPrice)}</span>
                                  <span className="buy-label bid-label">{isNoBid ? 'NO BID PLACED' : 'SOLD'}</span>
                                </>
                              ) : (
                                <>
                                  <span className="buy-price">${formatPriceCompact(currentPrice)}</span>
                                  <span className="buy-label bid-label">Bid</span>
                                </>
                              )}
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                } else {
                  // Buy now item - show buy button
                  const lock = lockedItems[item.id];
                  const LOCK_TIMEOUT = 30000;
                  const isLocked = lock && (now - lock.timestamp) < LOCK_TIMEOUT;
                  const isLockedByOther = isLocked && lock.userId !== currentUserId;
                  const isLockedByMe = isLocked && lock.userId === currentUserId;
                  
                const isInCart = cartItems.some(i => i.itemType === 'market_item' && i.itemData?.id === item.id);
                  
                  // Check if current user is the seller
                  const isSeller = item.sellerId && currentUserId && String(item.sellerId) === String(currentUserId);
                  
                return (
                    <div className="buy-button-wrapper">
                      <div className="button-row">
                  <button 
                          className={`compare-btn-item ${comparisonItems.some(i => i.id === item.id) ? 'active' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            handleAddToComparison(item, e);
                          }}
                          title={comparisonItems.some(i => i.id === item.id) ? 'Remove from comparison' : 'Add to comparison'}
                        >
                          <GitCompare size={14} />
                        </button>
                        <div className="bid-buttons-container">
                          <button 
                            className={`buy-now-btn ${isLockedByOther ? 'locked' : ''} ${isLockedByMe ? 'locked-by-me' : ''} ${isSeller ? 'seller-item' : ''}`}
                            onClick={() => {
                              if (!isLockedByOther && !isSeller) {
                                handleBuyItem(item.id);
                              }
                            }}
                            disabled={isLockedByOther || isSeller}
                            title={isSeller ? 'You cannot buy your own item' : isLockedByOther ? 'This item is being purchased by another user' : isLockedByMe ? 'Confirming purchase...' : 'Buy now'}
                          >
                                            <span className="buy-button-text">
                                              <span className="buy-price">${formatPriceCompact(item.price)}</span>
                                              <span className="buy-label">
                                                {isLockedByOther ? 'Locked' : isLockedByMe ? 'Confirming...' : 'Buy'}
                                              </span>
                                            </span>
                                          </button>
                                        </div>
                  {(() => {
                    // Check if current user is the seller
                    const isSeller = item.sellerId && currentUserId && String(item.sellerId) === String(currentUserId);
                    return (
                      <button 
                        className={`cart-btn-item ${isInCart ? 'active' : ''} ${isSeller ? 'seller-item' : ''}`}
                    type="button"
                        disabled={isSeller}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                          if (isSeller) return;
                      
                      console.log('🛒 Cart button clicked!', item);
                      
                      // Immediately execute async function
                      (async () => {
                      
                      try {
                        const userId = await getCurrentUserId();
                        if (!userId) {
                          alert('Please log in to add items to cart.');
                          return;
                        }

                        console.log('✅ User ID:', userId);

                        const api = window.electronAPI;
                        let currentCartItems = [];
                        
                        // Always check localStorage first (most reliable) - read fresh data
                        const stored = localStorage.getItem(`cartItems_${userId}`);
                        if (stored) {
                          try {
                            const parsed = JSON.parse(stored);
                            if (Array.isArray(parsed)) {
                              currentCartItems = parsed;
                              console.log('📦 Loaded from localStorage:', currentCartItems.length, 'items');
                            }
                          } catch (e) {
                            console.error('❌ Error parsing localStorage cart:', e);
                          }
                        }
                        
                        // Also try to get from database (but localStorage takes priority)
                        if (api?.dbGetCartItems && currentCartItems.length === 0) {
                          try {
                            const result = await api.dbGetCartItems(userId);
                            console.log('📦 Cart result from DB:', result);
                            if (result?.success && Array.isArray(result.items) && result.items.length > 0) {
                              currentCartItems = result.items;
                              // Sync to localStorage
                              localStorage.setItem(`cartItems_${userId}`, JSON.stringify(currentCartItems));
                            }
                          } catch (err) {
                            console.error('❌ Error getting cart from DB:', err);
                          }
                        }

                        console.log('📋 Current cart items:', currentCartItems);
                        console.log('🔍 Checking for item ID:', item.id);

                        // Check if item is already in cart - compare by itemData.id
                        const itemInCart = currentCartItems.some(i => {
                          const itemMatches = i.itemType === 'market_item' && 
                                             i.itemData && 
                                             i.itemData.id && 
                                             String(i.itemData.id) === String(item.id);
                          if (itemMatches) {
                            console.log('✅ Found matching item in cart:', i);
                          }
                          return itemMatches;
                        });

                        console.log('🔍 Is in cart?', itemInCart);

                        let updatedCart;
                        let itemWasAdded = false;
                        if (itemInCart) {
                          // Remove from cart
                          updatedCart = currentCartItems.filter(i => 
                            !(i.itemType === 'market_item' && i.itemData?.id === item.id)
                          );
                          console.log('➖ Removing from cart');
                        } else {
                          // Add to cart
                          const cartItem = {
                            id: `market-${item.id}-${Date.now()}`,
                            amount: parseFloat(item.price) || 0,
                            timestamp: new Date().toISOString(),
                            itemType: 'market_item',
                            itemData: {
                              id: String(item.id || ''),
                              name: String(item.name || 'Unknown Item'),
                              price: parseFloat(item.price) || 0,
                              image: String(item.image || ''),
                              imageUrl: item.imageUrl ? String(item.imageUrl) : null,
                              gameId: item.gameId ? String(item.gameId) : null,
                              gameName: item.gameName || selectedGame?.name ? String(item.gameName || selectedGame?.name) : null,
                              seller: item.seller ? String(item.seller) : null,
                              sellerId: item.sellerId ? String(item.sellerId) : null
                            }
                          };
                          updatedCart = [...currentCartItems, cartItem];
                          itemWasAdded = true;
                          console.log('➕ Adding to cart:', cartItem);
                        }
                        
                        console.log('💾 Saving cart with', updatedCart.length, 'items');
                        
                        // Ensure all items are properly serialized
                        const serializableCart = updatedCart.map(i => ({
                          id: String(i.id || Date.now()),
                          amount: parseFloat(i.amount || 0),
                          timestamp: String(i.timestamp || new Date().toISOString()),
                          itemType: String(i.itemType || 'market_item'),
                          itemData: i.itemData && typeof i.itemData === 'object' ? {
                            id: String(i.itemData.id || ''),
                            name: String(i.itemData.name || 'Unknown Item'),
                            price: parseFloat(i.itemData.price || 0),
                            image: String(i.itemData.image || ''),
                            imageUrl: i.itemData.imageUrl ? String(i.itemData.imageUrl) : null,
                            gameId: i.itemData.gameId ? String(i.itemData.gameId) : null,
                            gameName: i.itemData.gameName ? String(i.itemData.gameName) : null,
                            seller: i.itemData.seller ? String(i.itemData.seller) : null,
                            sellerId: i.itemData.sellerId ? String(i.itemData.sellerId) : null
                          } : {}
                        }));
                        
                        console.log('📦 Serialized cart:', serializableCart);
                        
                        // ALWAYS save to localStorage first (most reliable)
                        localStorage.setItem(`cartItems_${userId}`, JSON.stringify(serializableCart));
                        console.log('💾 Saved to localStorage');
                        
                        // Also try to save to database (but don't fail if it doesn't work)
                        if (api?.dbSaveCartItems) {
                          try {
                            const saveResult = await api.dbSaveCartItems(userId, serializableCart);
                            console.log('💾 Save result from DB:', saveResult);
                            if (!saveResult || !saveResult.success) {
                              console.warn('⚠️ Database save failed, but localStorage saved successfully');
                            }
                          } catch (err) {
                            console.error('❌ Error saving to DB (localStorage already saved):', err);
                          }
                        }
                        
                        // Verify the save
                        const verifyStored = localStorage.getItem(`cartItems_${userId}`);
                        console.log('✅ Verified stored cart:', verifyStored);
                        
                        // Trigger cart update event with a small delay to ensure save is complete
                        console.log('📢 Dispatching cart-updated event');
                        setTimeout(() => {
                          window.dispatchEvent(new CustomEvent('cart-updated', { detail: { items: serializableCart } }));
                          console.log('✅ Cart update event dispatched!');
                          
                          // Open cart menu if item was added (not removed)
                          if (itemWasAdded) {
                            console.log('🛒 Opening cart menu');
                            window.dispatchEvent(new CustomEvent('open-cart-menu'));
                          }
                        }, 100);
                      } catch (error) {
                        console.error('❌ Cart error:', error);
                        console.error('Error stack:', error.stack);
                        alert('Error: ' + (error.message || 'Failed to update cart'));
                      }
                      })();
                    }}
                        title={isSeller ? "You cannot add your own item to cart" : (isInCart ? "Remove from cart" : "Add to cart")}
                    >
                      <ShoppingCart size={14} className="cart-icon-default" />
                      <Plus size={14} className="cart-icon-hover cart-icon-plus" />
                      <Minus size={14} className="cart-icon-hover cart-icon-minus" />
                    </button>
                  );
                })()}
                      </div>
                    </div>
                  );
                }
              })()}
            </div>
          </div>
          ))
        )}
        </div>

          </div>
        </div>
        
        {/* Bottom Navigation Container - Compare Button, Search Bar, Sell Item Button */}
        <div className="market-bottom-menu-container">
          {/* Centered Menu Items Group */}
          <div className="market-bottom-menu-items">
            {/* Floating Action Button - Compare - Opens pop-out window */}
            {/* Always show when marketplace is selected (selectedGame) or gameId in URL */}
            {(gameId || selectedGame) && (
              <button
                className="marketplace-compare-btn-left"
                onClick={async () => {
                  try {
                    const api = window.electronAPI;
                    if (api?.openPopOutWindow) {
                      const currentGameId = selectedGame?.id || selectedGame?.gameId || gameId;
                      const route = currentGameId ? `/game/${currentGameId}/market/compare` : '/market/compare';
                      await api.openPopOutWindow(route);
                    } else {
                      // Fallback: open comparison modal if pop-out not available
                      setShowComparisonModal(true);
                      setComparisonModalManuallyClosed(false);
                    }
                  } catch (error) {
                    console.error('Error opening pop-out window:', error);
                    // Fallback: open comparison modal on error
                    setShowComparisonModal(true);
                    setComparisonModalManuallyClosed(false);
                  }
                }}
                title={comparisonItems.length > 0 ? `Open comparison in new window (${comparisonItems.length} items)` : 'Open comparison in new window'}
              >
                <GitCompare size={14} />
                <span className="marketplace-compare-btn-text">Compare</span>
              </button>
            )}
            
            {/* Bottom Navigation Container - Search Button, Island, Close Button - Also show in item view */}
            <div className="market-bottom-nav-container">
            {/* Search Button - Left of Island */}
            {!isSearchMode && (
              <button 
                className="market-search-trigger-button"
                onClick={() => {
                  setIsSearchMode(true);
                  setTimeout(() => {
                    if (searchInputRef.current) {
                      searchInputRef.current.focus();
                      searchInputRef.current.select();
                    }
                  }, 50);
                }}
              >
                <Search size={18} />
              </button>
            )}
            
            {/* Filter Dropdowns - Only show when in search mode and inside marketplace */}
            {isSearchMode && (gameId || selectedGame) && (
              <div className="market-search-filters-wrapper">
                {/* Rarity Filter Dropdown */}
                <div className="market-filter-dropdown-wrapper">
                  <button
                    className="market-search-filter-select"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenFilterDropdown(openFilterDropdown === 'rarity' ? null : 'rarity');
                    }}
                  >
                    {Array.from(rarityFilter)[0] === 'all' ? 'All Rarities' : 
                     Array.from(rarityFilter)[0] === 'common' ? 'Common' :
                     Array.from(rarityFilter)[0] === 'rare' ? 'Rare' :
                     Array.from(rarityFilter)[0] === 'epic' ? 'Epic' :
                     Array.from(rarityFilter)[0] === 'legendary' ? 'Legendary' : 'All Rarities'}
                  </button>
                  {openFilterDropdown === 'rarity' && (
                    <div className="market-filter-dropdown-menu">
                      {['all', 'common', 'rare', 'epic', 'legendary'].map(option => (
                        <button
                          key={option}
                          className={`market-filter-dropdown-option ${Array.from(rarityFilter)[0] === option ? 'active' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setRarityFilter(new Set([option]));
                            setOpenFilterDropdown(null);
                          }}
                        >
                          {option === 'all' ? 'All Rarities' : 
                           option === 'common' ? 'Common' :
                           option === 'rare' ? 'Rare' :
                           option === 'epic' ? 'Epic' :
                           option === 'legendary' ? 'Legendary' : option}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Price Filter Dropdown */}
                <div className="market-filter-dropdown-wrapper">
                  <button
                    className="market-search-filter-select"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenFilterDropdown(openFilterDropdown === 'price' ? null : 'price');
                    }}
                  >
                    {Array.from(priceFilter)[0] === 'all' ? 'All Prices' :
                     Array.from(priceFilter)[0] === 'under-10' ? 'Under $10' :
                     Array.from(priceFilter)[0] === '10-50' ? '$10 - $50' :
                     Array.from(priceFilter)[0] === '50-100' ? '$50 - $100' :
                     Array.from(priceFilter)[0] === 'over-100' ? 'Over $100' : 'All Prices'}
                  </button>
                  {openFilterDropdown === 'price' && (
                    <div className="market-filter-dropdown-menu">
                      {['all', 'under-10', '10-50', '50-100', 'over-100'].map(option => (
                        <button
                          key={option}
                          className={`market-filter-dropdown-option ${Array.from(priceFilter)[0] === option ? 'active' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setPriceFilter(new Set([option]));
                            setOpenFilterDropdown(null);
                          }}
                        >
                          {option === 'all' ? 'All Prices' :
                           option === 'under-10' ? 'Under $10' :
                           option === '10-50' ? '$10 - $50' :
                           option === '50-100' ? '$50 - $100' :
                           option === 'over-100' ? 'Over $100' : option}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Sort Dropdown */}
                <div className="market-filter-dropdown-wrapper">
                  <button
                    className="market-search-filter-select"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenFilterDropdown(openFilterDropdown === 'sort' ? null : 'sort');
                    }}
                  >
                    {sortBy === 'price-low' ? 'Price: Low to High' :
                     sortBy === 'price-high' ? 'Price: High to Low' :
                     sortBy === 'name-asc' ? 'Name: A to Z' :
                     sortBy === 'name-desc' ? 'Name: Z to A' :
                     sortBy === 'newest' ? 'Newest First' :
                     sortBy === 'oldest' ? 'Oldest First' : 'Price: Low to High'}
                  </button>
                  {openFilterDropdown === 'sort' && (
                    <div className="market-filter-dropdown-menu">
                      {['price-low', 'price-high', 'name-asc', 'name-desc', 'newest', 'oldest'].map(option => (
                        <button
                          key={option}
                          className={`market-filter-dropdown-option ${sortBy === option ? 'active' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSortBy(option);
                            setOpenFilterDropdown(null);
                          }}
                        >
                          {option === 'price-low' ? 'Price: Low to High' :
                           option === 'price-high' ? 'Price: High to Low' :
                           option === 'name-asc' ? 'Name: A to Z' :
                           option === 'name-desc' ? 'Name: Z to A' :
                           option === 'newest' ? 'Newest First' :
                           option === 'oldest' ? 'Oldest First' : option}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Bottom Navigation Island / Search Bar */}
            <div className={`market-bottom-nav-island ${isSearchMode ? 'search-mode' : ''}`}>
              {!isSearchMode ? (
                <div className="market-bottom-nav-content">
                  <button 
                    className={`market-bottom-nav-item market-bottom-nav-main ${marketView === 'browse' ? 'active' : ''}`}
                    onClick={() => {
                      setMarketView('browse');
                      // Restore last selected game when returning to browse
                      if (lastSelectedGameInBrowse) {
                        const gameIdToNavigate = lastSelectedGameInBrowse.id || lastSelectedGameInBrowse.gameId;
                        if (gameIdToNavigate) {
                          // Set restoration flags immediately to prevent selection screen flash
                          isRestoringGameRef.current = true;
                          setIsRestoringGame(true);
                          // Restore the selected game state IMMEDIATELY before navigation
                          // This ensures the marketplace view renders directly without showing selection screen
                          setSelectedGame(lastSelectedGameInBrowse);
                          setLastSelectedGameInBrowse(lastSelectedGameInBrowse);
                          // Navigate to the game's marketplace URL immediately
                          navigate(`/game/${gameIdToNavigate}/market`, { replace: false });
                          // Clear restoration flags after navigation completes
                          setTimeout(() => {
                            setSelectedGame(prev => {
                              // Only update if not already set correctly
                              if (!prev || (prev.id !== gameIdToNavigate && prev.gameId !== gameIdToNavigate)) {
                                return lastSelectedGameInBrowse;
                              }
                              return prev;
                            });
                            isRestoringGameRef.current = false;
                            setIsRestoringGame(false);
                          }, 100);
                        } else {
                          setSelectedGame(null);
                          setLastSelectedGameInBrowse(null);
                          setIsRestoringGame(false);
                          navigate('/market');
                        }
                      } else {
                        setSelectedGame(null);
                        setLastSelectedGameInBrowse(null);
                        setIsRestoringGame(false);
                        navigate('/market');
                      }
                    }}
                  >
                    <Search size={17} />
                    <span>Browse</span>
                  </button>
                  <button 
                    className={`market-bottom-nav-item ${marketView === 'favorites' ? 'active' : ''}`}
                    onClick={() => {
                      // Save current selectedGame when leaving browse
                      if (marketView === 'browse' && selectedGame) {
                        setLastSelectedGameInBrowse(selectedGame);
                      }
                      setSelectedGame(null);
                      setMarketView('favorites');
                      navigate('/market');
                    }}
                  >
                    <Eye size={17} />
                    <span>Watchlist</span>
                  </button>
                  <button 
                    className={`market-bottom-nav-item ${marketView === 'stats' ? 'active' : ''}`}
                    onClick={() => {
                      // Save current selectedGame when leaving browse
                      if (marketView === 'browse' && selectedGame) {
                        setLastSelectedGameInBrowse(selectedGame);
                      }
                      setSelectedGame(null);
                      setMarketView('stats');
                      navigate('/market');
                    }}
                  >
                    <BarChart3 size={17} />
                    <span>Analytics</span>
                  </button>
                  <button 
                    className={`market-bottom-nav-item ${marketView === 'petitions' ? 'active' : ''}`}
                    onClick={() => {
                      // Save current selectedGame when leaving browse
                      if (marketView === 'browse' && selectedGame) {
                        setLastSelectedGameInBrowse(selectedGame);
                      }
                      setSelectedGame(null);
                      setMarketView('petitions');
                      navigate('/market');
                    }}
                  >
                    <FileText size={17} />
                    <span>Petitions</span>
          </button>
        </div>
            ) : (
              <>
                {/* Menu Selector / Marketplace Name / Filters */}
                {!gameId ? (
                  <div className="market-search-menu-toggle-wrapper">
                    <div className="market-search-menu-options">
                      <button 
                        className={`market-search-menu-option ${marketView === 'browse' ? 'active' : ''}`}
                        onClick={() => {
                          setMarketView('browse');
                          // Restore last selected game when returning to browse
                          if (lastSelectedGameInBrowse) {
                            const gameIdToNavigate = lastSelectedGameInBrowse.id || lastSelectedGameInBrowse.gameId;
                            const gameToRestore = lastSelectedGameInBrowse;
                            if (gameIdToNavigate) {
                              // Set flag to prevent clearing during navigation
                              isRestoringGameRef.current = true;
                              // Restore the selected game state immediately
                              setSelectedGame(gameToRestore);
                              // Navigate to the game's marketplace
                              navigate(`/game/${gameIdToNavigate}/market`);
                              // Ensure selectedGame is set after navigation completes
                              setTimeout(() => {
                                setSelectedGame(prev => {
                                  // Only update if not already set correctly
                                  if (!prev || (prev.id !== gameIdToNavigate && prev.gameId !== gameIdToNavigate)) {
                                    return gameToRestore;
                                  }
                                  return prev;
                                });
                                isRestoringGameRef.current = false;
                              }, 200);
                            } else {
                              setSelectedGame(null);
                              navigate('/market');
                            }
                          } else {
                            setSelectedGame(null);
                            navigate('/market');
                          }
                        }}
                      >
                        <ShoppingBag size={12} />
                        <span>Browse</span>
                      </button>
                      <button 
                        className={`market-search-menu-option ${marketView === 'favorites' ? 'active' : ''}`}
                        onClick={() => {
                          // Save current selectedGame when leaving browse
                          if (marketView === 'browse' && selectedGame) {
                            setLastSelectedGameInBrowse(selectedGame);
                          }
                          setSelectedGame(null);
                          setMarketView('favorites');
                          navigate('/market');
                        }}
                      >
                        <Eye size={14} />
                        <span>Watchlist</span>
                      </button>
                      <button 
                        className={`market-search-menu-option ${marketView === 'stats' ? 'active' : ''}`}
                        onClick={() => {
                          // Save current selectedGame when leaving browse
                          if (marketView === 'browse' && selectedGame) {
                            setLastSelectedGameInBrowse(selectedGame);
                          }
                          setSelectedGame(null);
                          setMarketView('stats');
                          navigate('/market');
                        }}
                      >
                        <BarChart3 size={12} />
                        <span>Analytics</span>
                      </button>
                      <button 
                        className={`market-search-menu-option ${marketView === 'petitions' ? 'active' : ''}`}
                        onClick={() => {
                          // Save current selectedGame when leaving browse
                          if (marketView === 'browse' && selectedGame) {
                            setLastSelectedGameInBrowse(selectedGame);
                          }
                          setSelectedGame(null);
                          setMarketView('petitions');
                          navigate('/market');
                        }}
                      >
                        <FileText size={12} />
                        <span>Petitions</span>
                      </button>
                    </div>
                  </div>
                ) : null}
                <div className="market-search-island-dummy-left"></div>
                <div className="market-search-island-content">
                  <Search size={16} className="market-search-island-icon" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search items..."
                    value={itemSearch}
                    onChange={(e) => setItemSearch(e.target.value)}
                    className="market-search-island-input"
                  />
                </div>
                <button
                  className="market-search-island-clear"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsSearchMode(false);
                    setItemSearch('');
                  }}
                >
                  <X size={14} />
                </button>
                <div className="market-search-island-dummy-right"></div>
              </>
            )}
            </div>
            </div>
            
            {/* Floating Action Button - Sell Item (Right) */}
            {/* Always show when marketplace is selected (selectedGame) or gameId in URL */}
            {(gameId || selectedGame) && (
              <button 
                className="market-sell-item-floating-btn"
                onClick={handleSellItem}
                title="Sell Item"
              >
                <Plus size={14} />
                <span className="market-sell-item-btn-text">List your item</span>
              </button>
            )}
          </div>
        </div>
        </div>
      )}
          </div>
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
                  {allInventoryItems.length === 0 ? (
                    <>
                      <div className="inventory-empty-icon">📦</div>
                      <div className="inventory-empty-title">No items in inventory</div>
                      <div className="inventory-empty-description">Your inventory is empty. Items you own will appear here.</div>
                    </>
                  ) : inventorySearch.trim() ? (
                    <>
                      <div className="inventory-empty-icon">🔍</div>
                      <div className="inventory-empty-title">Nothing found</div>
                      <div className="inventory-empty-description">No items match your search "{inventorySearch}"</div>
                    </>
                  ) : (
                    <>
                      <div className="inventory-empty-icon">📭</div>
                      <div className="inventory-empty-title">No items available</div>
                      <div className="inventory-empty-description">No items match the current filters. Try adjusting your search or filter options.</div>
                    </>
                  )}
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
              <h3>Review & Confirm {saleType === 'bid' ? 'Bid Settings' : 'Prices'}</h3>
              <button className="modal-close-btn" onClick={handleCancelSell}>✕</button>
            </div>
            
            {/* Sale Type Switch */}
            <div className="sale-type-switch">
              <button 
                className={`sale-type-btn ${saleType === 'buy' ? 'active' : ''}`}
                onClick={() => setSaleType('buy')}
              >
                <ShoppingBag size={16} />
                <span>Buy Now</span>
              </button>
              <button 
                className={`sale-type-btn bid ${saleType === 'bid' ? 'active' : ''}`}
                onClick={() => setSaleType('bid')}
              >
                <Clock size={16} />
                <span>Bid Auction</span>
              </button>
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
                    {saleType === 'bid' ? (
                      <div className="bid-settings-group">
                        <div className="pricing-input-group">
                          <span className="pricing-input-label">Starting Bid</span>
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
                        <div className="bid-duration-group">
                          <span className="pricing-input-label">Duration (minutes)</span>
                          <input 
                            type="number"
                            className="bid-duration-input-modal"
                            value={bidInputs[item.id]?.duration || 60}
                            onChange={(e) => {
                              const duration = parseInt(e.target.value) || 60;
                              setBidInputs(prev => ({
                                ...prev,
                                [item.id]: { ...prev[item.id], amount: itemPrices[item.id] || item.marketPrice, duration }
                              }));
                            }}
                            min="1"
                            placeholder="60"
                          />
                        </div>
                      </div>
                    ) : (
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
                    )}
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
              <button className="confirm-btn" onClick={async () => {
                if (!selectedGame) return;
                
                const gameId = selectedGame.id || selectedGame.gameId;
                if (!gameId) return;
                
                try {
                // Get current market items
                  const marketItems = await getUserData(`marketItems_${gameId}`, []);
                  const currentMarketItemsArray = Array.isArray(marketItems) ? marketItems : [];
                
                // Check for duplicate listings (items already listed)
                const listedItemIds = new Set(
                    currentMarketItemsArray
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
                  
                  // Get username and user ID
                  const username = await getUserData('username', 'Unknown');
                  const userId = await getCurrentUserId();
                
                // Create new market listings
                const timestamp = Date.now();
                const newListings = itemsToList.map(item => {
                  const price = itemPrices[item.id] !== undefined 
                    ? parseFloat(itemPrices[item.id]) || 0 
                    : (item.marketPrice || 0);
                  
                  const listing = {
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
                    seller: username,
                    sellerId: userId,
                    listedAt: timestamp,
                    status: 'active',
                    saleType: saleType || 'buy' // Always set saleType: 'buy' or 'bid'
                  };
                  
                  console.log('📝 Creating listing with saleType:', saleType, 'for item:', item.name);
                  
                  // Add bid settings if sale type is bid
                  if (saleType === 'bid') {
                    const bidDuration = bidInputs[item.id]?.duration || 60;
                    const now = Date.now();
                    listing.bidEndTime = now + (bidDuration * 60 * 1000);
                    listing.bidDuration = bidDuration;
                    listing.currentBid = price;
                    listing.bidHistory = [];
                    console.log('🔨 Bid listing created:', {
                      bidEndTime: listing.bidEndTime,
                      bidDuration: listing.bidDuration,
                      currentBid: listing.currentBid
                    });
                  } else {
                    console.log('💰 Buy listing created');
                  }
                  
                  return listing;
                });
                
                // Add new listings to market
                  const updatedMarketItems = [...currentMarketItemsArray, ...newListings];
                  await saveUserData(`marketItems_${gameId}`, updatedMarketItems);
                  
                  // Initialize itemBids for bid items - timer starts immediately when uploaded
                  if (saleType === 'bid') {
                    setItemBids(prev => {
                      const newBids = { ...prev };
                      newListings.forEach(listing => {
                        if (listing.saleType === 'bid' && listing.bidEndTime) {
                          newBids[listing.id] = {
                            saleType: 'bid',
                            bidEndTime: listing.bidEndTime,
                            currentBid: listing.currentBid || listing.price,
                            bidHistory: listing.bidHistory || [],
                            bidDuration: listing.bidDuration || 60
                          };
                          console.log('✅ Bid timer started immediately for:', listing.name, 'ends at:', new Date(listing.bidEndTime));
                        }
                      });
                      localStorage.setItem('market_item_bids', JSON.stringify(newBids));
                      return newBids;
                    });
                  }
                
                // Remove items from inventory (only items that were actually listed)
                let removedCount = 0;
                  for (const item of itemsToList) {
                  const itemGameId = String(item.gameId || gameId);
                    const inventory = await getUserData(`inventory_${itemGameId}`, []);
                    const inventoryArray = Array.isArray(inventory) ? inventory : [];
                    const itemId = String(item.id);
                    const beforeCount = inventoryArray.length;
                    const updatedInventory = inventoryArray.filter(invItem => {
                      const invItemId = String(invItem.id || '');
                      const invItemGameId = String(invItem.gameId || itemGameId);
                      // Remove item if both ID and gameId match
                      return !(invItemId === itemId && invItemGameId === itemGameId);
                    });
                    
                    // Only save if inventory actually changed
                    if (updatedInventory.length !== beforeCount) {
                      await saveUserData(`inventory_${itemGameId}`, updatedInventory);
                      removedCount++;
                      console.log(`✅ Removed item ${itemId} from inventory for game ${itemGameId}`);
                      
                      // Dispatch storage event to notify other windows/components
                      if (typeof window !== 'undefined') {
                        window.dispatchEvent(new StorageEvent('storage', {
                          key: `inventory_${itemGameId}`,
                          newValue: JSON.stringify(updatedInventory),
                          oldValue: JSON.stringify(inventoryArray)
                        }));
                      }
                    } else {
                      console.warn(`⚠️ Item ${itemId} not found in inventory for game ${itemGameId}`);
                    }
                  }
                
                // Refresh inventory and market items
                setInventoryRefresh(prev => prev + 1);
                setMarketItemsRefresh(prev => prev + 1);
                
                // Show success message
                if (removedCount > 0) {
                  console.log(`✅ Successfully removed ${removedCount} item(s) from inventory`);
                }
                
                // Close modal and reset
                setShowSellModal(false);
                setSellStep(1);
                setSelectedItems([]);
                setItemPrices({});
                } catch (error) {
                  console.error('Error listing items:', error);
                  alert('An error occurred while listing items. Please try again.');
                }
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

      {/* Maximized 3D Views for Comparison */}
      {Object.entries(expanded3DViews).map(([itemId, isExpanded]) => {
        if (!isExpanded) return null;
        const expandedItem = comparisonItems.find(item => item.id === itemId);
        if (!expandedItem) return null;
        
        return (
          <div key={itemId} className="item-3d-view-maximized" onClick={(e) => {
            if (e.target === e.currentTarget) {
              setExpanded3DViews(prev => ({
                ...prev,
                [itemId]: false
              }));
            }
          }}>
            <Item3DView
              imageUrl={expandedItem.imageUrl}
              image={expandedItem.image}
              name={expandedItem.name}
              isMaximized={true}
              onMaximizeToggle={() => {
                setExpanded3DViews(prev => ({
                  ...prev,
                  [itemId]: false
                }));
              }}
              maxZoom={4}
            />
          </div>
        );
      })}

      {/* Add Items to Comparison Modal */}
      {showAddItemsModal && (
        <div className="modal-overlay" onMouseDown={(e) => {
          if (e.target === e.currentTarget) {
            setShowAddItemsModal(false);
          }
        }}>
          <div className="sell-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1000px', height: '80vh' }}>
            <div className="sell-modal-header">
              <h3>Add Items to Comparison ({comparisonItems.length}/8)</h3>
              <button className="modal-close-btn" onClick={() => setShowAddItemsModal(false)}>✕</button>
            </div>
            
            <div className="sell-modal-body" style={{ overflowY: 'auto', padding: '20px' }}>
              {(() => {
                // Get current game ID
                const currentGameId = selectedGame?.id || selectedGame?.gameId || gameId;
                
                // Filter out items that are already in comparison AND ensure items are from the current game
                const availableItems = sortedItems.filter(item => {
                  // Check if item is already in comparison
                  const isInComparison = comparisonItems.some(compItem => compItem.id === item.id);
                  if (isInComparison) return false;
                  
                  // Check if item is from the current game
                  const itemGameId = item.gameId;
                  if (currentGameId && itemGameId) {
                    return String(currentGameId) === String(itemGameId);
                  }
                  
                  // If no game ID is set, allow the item (for backwards compatibility)
                  return true;
                });
                
                return availableItems.length === 0 ? (
                  <div className="marketplace-empty-state" style={{ padding: '40px', textAlign: 'center' }}>
                    <div className="empty-state-icon">📦</div>
                    <h3 className="empty-state-title">No items available</h3>
                    <p className="empty-state-description">
                      {sortedItems.length === 0 
                        ? 'There are no items listed in the marketplace'
                        : 'All available items are already in the comparison'}
                    </p>
                  </div>
                ) : (
                  <div className="items-grid grid-view" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                    {availableItems.map(item => {
                      const canAdd = comparisonItems.length < 8;
                    
                      return (
                        <div 
                          key={item.id} 
                          className="market-item-card"
                          style={{ cursor: canAdd ? 'pointer' : 'default' }}
                          onClick={() => {
                            if (canAdd) {
                              handleAddToComparison(item, { stopPropagation: () => {} });
                            }
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
                              <button 
                                className="compare-btn-item"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAddToComparison(item, e);
                                }}
                                disabled={!canAdd}
                                title={canAdd ? 'Add to comparison' : 'Maximum 8 items'}
                              >
                                <GitCompare size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
            </div>
          </div>
        </div>
      )}

      {/* Bid Modal */}
      {showBidModal && selectedBidItem && (
        <div className="modal-overlay" onClick={() => {
          setShowBidModal(false);
          setSelectedBidItem(null);
          setBidModalError(null);
        }}>
          <div className="bid-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="bid-modal-header">
              <h2>Place Bid</h2>
              <button 
                className="modal-close-btn"
                onClick={() => {
                  setShowBidModal(false);
                  setSelectedBidItem(null);
                  setBidModalError(null);
                }}
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="bid-modal-body">
              <div className="bid-3d-view-container">
                <Item3DView
                  imageUrl={selectedBidItem.imageUrl}
                  image={selectedBidItem.image}
                  name={selectedBidItem.name}
                  isMaximized={false}
                  maxZoom={2}
                />
              </div>
              
              <div className="bid-item-info">
                <div className="bid-item-details">
                  <h3>{selectedBidItem.name}</h3>
                  {(() => {
                    // Get current price from itemBids or item data
                    const bid = itemBids[selectedBidItem.id];
                    const currentBidPrice = bid?.currentBid || selectedBidItem.currentBid || selectedBidItem.price || 0;
                    return (
                      <p className="bid-current-price">Current Highest Bid: ${currentBidPrice.toFixed(2)}</p>
                    );
                  })()}
                </div>
              </div>
              
              <div className="bid-input-section">
                <label className="bid-input-label">Your Bid Amount</label>
                {(() => {
                  // Get current price from itemBids or item data
                  const bid = itemBids[selectedBidItem.id];
                  const currentBidPrice = bid?.currentBid || selectedBidItem.currentBid || selectedBidItem.price || 0;
                  const minBid = currentBidPrice + 0.01;
                  
                  return (
                <input
                  type="number"
                  className="bid-modal-input"
                      value={bidInputs[selectedBidItem.id]?.amount ?? minBid}
                  onChange={(e) => {
                        let amount = parseFloat(e.target.value) || minBid;
                    // Cap at 1 million
                    if (amount > 1000000) {
                      amount = 1000000;
                      setBidModalError('Maximum bid amount is $1,000,000.00');
                    } else {
                      setBidModalError(null);
                    }
                    setBidInputs(prev => ({
                      ...prev,
                      [selectedBidItem.id]: { ...prev[selectedBidItem.id], amount }
                    }));
                  }}
                      min={minBid}
                  max={1000000}
                  step="0.01"
                      placeholder={`Minimum: $${minBid.toFixed(2)}`}
                />
                  );
                })()}
                {bidModalError && (
                  <p className="bid-input-error">{bidModalError}</p>
                )}
                {(() => {
                  // Get current price from itemBids or item data
                  const bid = itemBids[selectedBidItem.id];
                  const currentBidPrice = bid?.currentBid || selectedBidItem.currentBid || selectedBidItem.price || 0;
                  return (
                <p className="bid-input-hint">
                      Current highest bid: ${currentBidPrice.toFixed(2)}. Enter your total bid amount (must be higher).
                </p>
                  );
                })()}
              </div>
            </div>
            
            <div className="bid-modal-footer">
              <button 
                className="bid-modal-close-btn"
                onClick={() => {
                  setShowBidModal(false);
                  setSelectedBidItem(null);
                  setBidModalError(null);
                }}
              >
                Close
              </button>
              <button 
                className="bid-modal-submit-btn"
                onClick={async () => {
                  // Get current price from itemBids or item data
                  const bid = itemBids[selectedBidItem.id];
                  const currentBidPrice = bid?.currentBid || selectedBidItem.currentBid || selectedBidItem.price || 0;
                  const minBid = currentBidPrice + 0.01;
                  
                  let bidAmount = bidInputs[selectedBidItem.id]?.amount || minBid;
                  
                  // Cap bid amount at 1 million
                  if (bidAmount > 1000000) {
                    setBidModalError('Maximum bid amount is $1,000,000.00');
                    bidAmount = 1000000;
                    setBidInputs(prev => ({
                      ...prev,
                      [selectedBidItem.id]: { ...prev[selectedBidItem.id], amount: 1000000 }
                    }));
                    return;
                  }
                  
                  if (bidAmount <= currentBidPrice) {
                    setBidModalError(`A higher bid of $${currentBidPrice.toFixed(2)} has already been placed. Please enter a higher total amount.`);
                    return;
                  }
                  
                  setBidModalError(null);
                  await handleBuyItem(selectedBidItem.id);
                  setShowBidModal(false);
                  setSelectedBidItem(null);
                  setBidModalError(null);
                }}
              >
                Submit Bid
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Purchase Confirmation Modal */}
      {showPurchaseConfirmation && pendingPurchaseItem && (
        <div className="modal-overlay" onClick={(e) => {
          if (e.target === e.currentTarget) {
            handleCancelPurchase();
          }
        }}>
          <div className="bid-modal-overlay" onClick={(e) => e.stopPropagation()}>
            <div className="bid-modal-content">
              <div className="bid-modal-header">
                <h3>Confirm Purchase</h3>
                <button className="modal-close-btn" onClick={handleCancelPurchase}>✕</button>
              </div>
              
              <div className="bid-modal-body">
                <div className="purchase-confirmation-item">
                  <div className="purchase-item-image">
                    {pendingPurchaseItem.imageUrl ? (
                      <img src={pendingPurchaseItem.imageUrl} alt={pendingPurchaseItem.name} />
                    ) : (
                      <div className="item-icon-large">{pendingPurchaseItem.image || '📦'}</div>
                    )}
                  </div>
                  <div className="purchase-item-info">
                    <h4>{pendingPurchaseItem.name}</h4>
                    <p className="purchase-item-price">${formatPriceCompact(pendingPurchaseItem.price)}</p>
                  </div>
                </div>
                
                <div className="purchase-confirmation-actions">
                  <button 
                    className="bid-modal-cancel-btn"
                    onClick={handleCancelPurchase}
                  >
                    Cancel
                  </button>
                  <button 
                    className="bid-modal-submit-btn"
                    onClick={handleConfirmPurchase}
                  >
                    Confirm Purchase
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Market;