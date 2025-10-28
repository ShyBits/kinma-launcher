import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShoppingCart, Plus, ShoppingBag, Eye, EyeOff, Grid, List, ArrowLeft } from 'lucide-react';
import './Market.css';


// Generate game-specific user inventory
const getUserInventory = (gameId) => {
  const gameInventories = {
    "the-finals": [
      { id: 101, name: 'Building Material Pack', rarity: 'Common', category: 'Consumable', image: '🏗️', game: 'THE FINALS', marketPrice: 5.00 },
      { id: 102, name: 'Explosive Barrel', rarity: 'Rare', category: 'Gadget', image: '💣', game: 'THE FINALS', marketPrice: 15.00 },
      { id: 103, name: 'Shield Generator', rarity: 'Epic', category: 'Gadget', image: '🛡️', game: 'THE FINALS', marketPrice: 35.00 },
    ],
    "cs2": [
      { id: 201, name: 'AK-47 Skin', rarity: 'Epic', category: 'Cosmetic', image: '🔫', game: 'Counter-Strike 2', marketPrice: 25.00 },
      { id: 202, name: 'Flash Grenade', rarity: 'Common', category: 'Consumable', image: '💥', game: 'Counter-Strike 2', marketPrice: 2.50 },
      { id: 203, name: 'AWP Dragon Lore', rarity: 'Legendary', category: 'Cosmetic', image: '🔫', game: 'Counter-Strike 2', marketPrice: 800.00 },
    ],
    "skate": [
      { id: 301, name: 'Custom Skateboard', rarity: 'Rare', category: 'Equipment', image: '🛼', game: 'skate.', marketPrice: 45.00 },
      { id: 302, name: 'Protective Gear Set', rarity: 'Common', category: 'Armor', image: '🦺', game: 'skate.', marketPrice: 20.00 },
    ],
    "hellblade": [
      { id: 401, name: 'Viking Sword Replica', rarity: 'Epic', category: 'Collectible', image: '⚔️', game: 'Hellblade', marketPrice: 75.00 },
      { id: 402, name: 'Norse Rune Stone', rarity: 'Legendary', category: 'Collectible', image: '🪨', game: 'Hellblade', marketPrice: 150.00 },
    ],
    "cyberpunk": [
      { id: 501, name: 'Cybernetic Eye', rarity: 'Epic', category: 'Cyberware', image: '👁️', game: 'Cyberpunk 2077', marketPrice: 200.00 },
      { id: 502, name: 'Neural Link', rarity: 'Legendary', category: 'Cyberware', image: '🧠', game: 'Cyberpunk 2077', marketPrice: 500.00 },
    ],
    "valorant": [
      { id: 601, name: 'Reyna Spray', rarity: 'Common', category: 'Cosmetic', image: '🎨', game: 'VALORANT', marketPrice: 5.00 },
      { id: 602, name: 'Operator Skin Bundle', rarity: 'Legendary', category: 'Cosmetic', image: '🔫', game: 'VALORANT', marketPrice: 50.00 },
    ]
  };

  return gameInventories[gameId] || [
    { id: 101, name: 'Magic Sword', rarity: 'Epic', category: 'Weapon', image: '⚔️', game: 'Unknown Game', marketPrice: 25.00 },
    { id: 102, name: 'Health Potion', rarity: 'Common', category: 'Consumable', image: '🧪', game: 'Unknown Game', marketPrice: 3.50 },
  ];
};

// Game data mapping - same as in Game.js
const GAMES_DATA = {
  "the-finals": {
    id: "the-finals",
    name: 'THE FINALS',
    icon: 'T',
    image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&h=600&fit=crop",
    logo: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&h=600&fit=crop",
    installed: true,
    rarities: ['all', 'legendary', 'epic', 'rare', 'common']
  },
  "cs2": {
    id: "cs2",
    name: 'Counter-Strike 2',
    icon: 'C',
    image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&h=600&fit=crop",
    logo: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&h=600&fit=crop",
    installed: true,
    rarities: ['all', 'legendary', 'epic', 'rare', 'common']
  },
  "skate": {
    id: "skate",
    name: 'skate.',
    icon: 'S',
    image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&h=600&fit=crop",
    logo: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&h=600&fit=crop",
    installed: true,
    rarities: ['all', 'legendary', 'epic', 'rare', 'common']
  },
  "hellblade": {
    id: "hellblade",
    name: 'Hellblade: Senua\'s Sacrifice',
    icon: 'H',
    image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&h=600&fit=crop",
    logo: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&h=600&fit=crop",
    installed: true,
    rarities: ['all', 'legendary', 'epic', 'rare', 'common']
  },
  "cyberpunk": {
    id: "cyberpunk",
    name: 'Cyberpunk 2077',
    icon: 'C',
    image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&h=600&fit=crop",
    logo: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&h=600&fit=crop",
    installed: true,
    rarities: ['all', 'legendary', 'epic', 'rare', 'common']
  },
  "valorant": {
    id: "valorant",
    name: 'VALORANT',
    icon: 'V',
    image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&h=600&fit=crop",
    logo: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&h=600&fit=crop",
    installed: true,
    rarities: ['all', 'legendary', 'epic', 'rare', 'common']
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

  // Auto-select game based on URL parameter
  useEffect(() => {
    if (gameId && GAMES_DATA[gameId]) {
      setSelectedGame(GAMES_DATA[gameId]);
    }
  }, [gameId]);

  // Generate game-specific market items - moved before early return to avoid hooks order issues
  const marketItems = React.useMemo(() => {
    if (!selectedGame) return [];

    const gameSpecificItems = {
      "the-finals": [
        {
          id: 1,
          name: 'Destruction Hammer',
          type: 'Weapon',
          rarity: 'Legendary',
          price: 45.99,
          image: '🔨',
          imageUrl: '/images/items/destruction-hammer.jpg',
          seller: 'BuildBreaker99',
          timeLeft: '2h 15m',
          listedAt: '2 days ago'
        },
        {
          id: 2,
          name: 'Shield Generator',
          type: 'Gadget',
          rarity: 'Epic',
          price: 32.50,
          image: '🛡️',
          imageUrl: '/images/items/shield-generator.jpg',
          seller: 'TechMaster',
          timeLeft: '5h 30m',
          listedAt: '1 day ago'
        },
        {
          id: 3,
          name: 'Explosive Charge',
          type: 'Consumable',
          rarity: 'Rare',
          price: 8.50,
          image: '💣',
          imageUrl: '/images/items/explosive-charge.jpg',
          seller: 'DemoExpert',
          timeLeft: '12h 45m',
          listedAt: '5 hours ago'
        }
      ],
      "cs2": [
        {
          id: 1,
          name: 'AWP Dragon Lore',
          type: 'Weapon',
          rarity: 'Legendary',
          price: 1200.99,
          image: '🔫',
          imageUrl: '/images/items/awp-dragon-lore.jpg',
          seller: 'SkinCollector',
          timeLeft: '1h 30m',
          listedAt: '3 days ago'
        },
        {
          id: 2,
          name: 'Smoke Grenade Pack',
          type: 'Consumable',
          rarity: 'Common',
          price: 5.25,
          image: '💨',
          imageUrl: '/images/items/smoke-grenade.jpg',
          seller: 'TacticalPlayer',
          timeLeft: '8h 20m',
          listedAt: '3 hours ago'
        },
        {
          id: 3,
          name: 'Flashbang Bundle',
          type: 'Consumable',
          rarity: 'Common',
          price: 4.50,
          image: '💥',
          imageUrl: '/images/items/flashbang.jpg',
          seller: 'RushPlayer',
          timeLeft: '6h 15m',
          listedAt: '1 day ago'
        }
      ],
      "skate": [
        {
          id: 1,
          name: 'Pro Skateboard Deck',
          type: 'Equipment',
          rarity: 'Epic',
          price: 89.99,
          image: '🛼',
          imageUrl: '/images/items/pro-deck.jpg',
          seller: 'SkateLegend',
          timeLeft: '3h 45m',
          listedAt: '4 hours ago'
        },
        {
          id: 2,
          name: 'Custom Wheels Set',
          type: 'Parts',
          rarity: 'Rare',
          price: 45.00,
          image: '⚙️',
          imageUrl: '/images/items/custom-wheels.jpg',
          seller: 'WheelMaster',
          timeLeft: '1d 2h',
          listedAt: '2 days ago'
        }
      ],
      "hellblade": [
        {
          id: 1,
          name: 'Senua\'s Sword Replica',
          type: 'Collectible',
          rarity: 'Legendary',
          price: 199.99,
          image: '⚔️',
          imageUrl: '/images/items/senua-sword.jpg',
          seller: 'MythCollector',
          timeLeft: '5h 20m',
          listedAt: '1 week ago'
        },
        {
          id: 2,
          name: 'Viking Shield',
          type: 'Armor',
          rarity: 'Epic',
          price: 75.50,
          image: '🛡️',
          imageUrl: '/images/items/viking-shield.jpg',
          seller: 'HistoryBuff',
          timeLeft: '2d 8h',
          listedAt: '3 days ago'
        }
      ],
      "cyberpunk": [
        {
          id: 1,
          name: 'Neural Implant',
          type: 'Cyberware',
          rarity: 'Legendary',
          price: 299.99,
          image: '🧠',
          imageUrl: '/images/items/neural-implant.jpg',
          seller: 'CyberDoc',
          timeLeft: '4h 15m',
          listedAt: '1 day ago'
        },
        {
          id: 2,
          name: 'Chrome Arm',
          type: 'Cyberware',
          rarity: 'Epic',
          price: 149.99,
          image: '🦾',
          imageUrl: '/images/items/chrome-arm.jpg',
          seller: 'BodyModder',
          timeLeft: '1d 12h',
          listedAt: '2 days ago'
        }
      ],
      "valorant": [
        {
          id: 1,
          name: 'Operator Skin',
          type: 'Cosmetic',
          rarity: 'Legendary',
          price: 89.99,
          image: '🔫',
          imageUrl: '/images/items/operator-skin.jpg',
          seller: 'SkinTrader',
          timeLeft: '2h 30m',
          listedAt: '5 hours ago'
        },
        {
          id: 2,
          name: 'Agent Spray Set',
          type: 'Cosmetic',
          rarity: 'Rare',
          price: 25.00,
          image: '🎨',
          imageUrl: '/images/items/agent-spray.jpg',
          seller: 'SprayMaster',
          timeLeft: '8h 45m',
          listedAt: '1 day ago'
        }
      ]
    };

    return gameSpecificItems[gameId] || [
      {
        id: 1,
        name: 'Legendary Sword',
        type: 'Weapon',
        rarity: 'Legendary',
        price: 45.99,
        image: '⚔️',
        imageUrl: '/images/items/legendary-sword.jpg',
        seller: 'DragonSlayer99',
        timeLeft: '2h 15m',
        listedAt: '2 days ago'
      }
    ];
  }, [selectedGame, gameId]);

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

  // If no game is selected, show game selection
  if (!selectedGame) {
    return (
      <div className="market">
        <div className="game-selection-header">
          <h2>Select a game to browse its marketplace</h2>
        </div>
        <div className="games-selection-grid">
          {Object.values(GAMES_DATA).map(game => (
            <div
              key={game.id}
              className="game-select-card"
              onClick={() => {
                if (gameId) {
                  // If we're already in a game context, navigate back to game page first
                  navigate(`/game/${game.id}/market`);
                } else {
                  // If we're in general market, navigate to specific game market
                  navigate(`/game/${game.id}/market`);
                }
              }}
            >
              <div className="game-select-icon">{game.icon}</div>
              <div className="game-select-name">{game.name}</div>
              <div className="game-select-action">
                {game.installed ? 'Open Marketplace' : 'Install & Browse'}
              </div>
            </div>
          ))}
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
      {/* Game Banner */}
      <div className="market-banner" style={{backgroundImage: `url(${selectedGame.image})`}}>
        <div className="banner-overlay"></div>
        <div className="banner-content">
          <button className="back-btn" onClick={handleBackToGames} title="Back to Games">
            <ArrowLeft size={20} />
          </button>
          <div className="banner-info">
            <img 
              src={selectedGame.logo} 
              alt={selectedGame.name}
              className="game-logo-banner"
              onError={(e) => { e.target.style.display = 'none' }}
            />
            <div className="banner-text-content">
              <h1 className="banner-title">{selectedGame.name} Marketplace</h1>
              <p className="banner-subtitle">Browse and trade items for {selectedGame.name}</p>
            </div>
          </div>
        </div>
      </div>

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
            <div className="stat-value">+5.2%</div>
            <div className="stat-label">MARKET TREND</div>
          </div>
        </div>
      </div>

      {/* Items Grid */}
      <div className="items-grid-controls">
        <div className="view-mode-controls">
          <button 
            className={`view-mode-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
          >
            <Grid size={16} />
          </button>
          <button 
            className={`view-mode-btn ${viewMode === 'row' ? 'active' : ''}`}
            onClick={() => setViewMode('row')}
          >
            <List size={16} />
          </button>
        </div>
      </div>
      
      <div className={`items-grid ${viewMode === 'grid' ? 'grid-view' : 'row-view'}`}>
        {sortedItems.map(item => (
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
        ))}
      </div>

      {/* Sell Item Button */}
      <div className="sell-button-wrapper">
        <button className="sell-item-btn" onClick={handleSellItem}>
          <Plus size={20} />
          Sell Item
        </button>
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