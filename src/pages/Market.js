import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShoppingCart, Plus, ShoppingBag, Eye, EyeOff, Grid, List, ArrowLeft, Crown } from 'lucide-react';
import './Market.css';


// User inventory will be loaded from API or localStorage
const getUserInventory = (gameId) => {
  try {
    const stored = localStorage.getItem(`inventory_${gameId}`);
    return stored ? JSON.parse(stored) : [];
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
  const [marketView, setMarketView] = useState('browse'); // browse, petitions, featured, trending, favorites
  const [customGames, setCustomGames] = useState([]);
  const [watchedGames, setWatchedGames] = useState(new Set());
  const [expandedCards, setExpandedCards] = useState(new Set());
  const [petitions, setPetitions] = useState(() => {
    try {
      const stored = localStorage.getItem('marketPetitions');
      return stored ? JSON.parse(stored) : {};
    } catch (e) {
      return {};
    }
  });
  
  // Investments data loaded from localStorage
  const [investments] = useState(() => {
    try {
      const stored = localStorage.getItem('marketInvestments');
      return stored ? JSON.parse(stored) : {};
    } catch (e) {
      return {};
    }
  });

  // Load custom games and watched games from localStorage
  useEffect(() => {
    const loadCustomGames = () => {
      try {
        const stored = localStorage.getItem('customGames');
        if (stored) {
          const games = JSON.parse(stored);
          setCustomGames(games);
        }
      } catch (e) {
        console.error('Error loading custom games:', e);
      }
    };

    const loadWatchedGames = () => {
      try {
        const stored = localStorage.getItem('watchedGames');
        if (stored) {
          const gameIds = JSON.parse(stored);
          setWatchedGames(new Set(gameIds));
        }
      } catch (e) {
        console.error('Error loading watched games:', e);
      }
    };

    loadCustomGames();
    loadWatchedGames();
    const handleUpdate = () => loadCustomGames();
    window.addEventListener('customGameUpdate', handleUpdate);
    
    return () => window.removeEventListener('customGameUpdate', handleUpdate);
  }, []);

  // Get all games with market settings
  const allGamesData = React.useMemo(() => {
    // Custom games from localStorage
    const customGamesData = customGames.map((game) => {
      const hasMarket = game.fullFormData?.marketEnabled !== false; // Default to true
      // Load market data from localStorage or API
      let marketData = {};
      try {
        const stored = localStorage.getItem(`market_${game.gameId || game.id}`);
        if (stored) {
          marketData = JSON.parse(stored);
        }
      } catch (_) {}
      
      return {
        id: game.gameId || `custom-${game.id}`,
        name: game.name,
        icon: game.name?.charAt(0)?.toUpperCase() || 'G',
        image: game.banner || game.bannerImage,
        logo: game.logo || game.gameLogo,
        installed: true,
        hasMarket,
        signatures: marketData.signatures || 0,
        myToken: marketData.myToken || null,
        isCustom: true,
        cardImage: game.card || game.cardImage,
        marketRank: marketData.marketRank || null,
        totalVolume: marketData.totalVolume || '$0',
        marketTrend: marketData.marketTrend || '+0%'
      };
    });

    return [...customGamesData];
  }, [customGames]);

  // Get games with markets and games without markets
  const gamesWithMarkets = allGamesData.filter(g => g.hasMarket !== false);
  const gamesWithoutMarkets = allGamesData.filter(g => g.hasMarket === false);

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

  // Load market items from localStorage or API
  const marketItems = React.useMemo(() => {
    if (!selectedGame) return [];
    
    try {
      const stored = localStorage.getItem(`marketItems_${selectedGame.id}`);
      return stored ? JSON.parse(stored) : [];
    } catch (_) {
      return [];
    }
  }, [selectedGame]);

  // Calculate market statistics from localStorage data
  const marketStats = React.useMemo(() => {
    try {
      const transactions = JSON.parse(localStorage.getItem('marketTransactions') || '[]');
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
      const game = prev[gameId];
      if (!game) return prev;
      
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
      
      // Save to localStorage
      try {
        localStorage.setItem('marketPetitions', JSON.stringify(updated));
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
    localStorage.setItem('watchedGames', JSON.stringify(Array.from(newWatched)));
  };

  // If no game is selected, show game selection
  if (!selectedGame) {
    return (
      <div className="market">
        {/* Market Statistics Bar - Always Visible at Top */}
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

        {/* Market Navigation */}
        <div className="market-navigation">
          <div className="market-nav-tabs">
            <button 
              className={`market-nav-tab ${marketView === 'browse' ? 'active' : ''}`}
              onClick={() => setMarketView('browse')}
            >
              Market
            </button>
            <button 
              className={`market-nav-tab ${marketView === 'petitions' ? 'active' : ''}`}
              onClick={() => setMarketView('petitions')}
            >
              Petitions
            </button>
            <button 
              className={`market-nav-tab ${marketView === 'featured' ? 'active' : ''}`}
              onClick={() => setMarketView('featured')}
            >
              Featured
            </button>
            <button 
              className={`market-nav-tab ${marketView === 'trending' ? 'active' : ''}`}
              onClick={() => setMarketView('trending')}
            >
              Trending
            </button>
            <button 
              className={`market-nav-tab ${marketView === 'favorites' ? 'active' : ''}`}
              onClick={() => setMarketView('favorites')}
            >
              Watch
            </button>
          </div>
        </div>

        {/* Watch Analytics Dashboard */}
        {marketView === 'favorites' && watchedGames.size > 0 ? (
          <div className="watch-dashboard">
            <h2 className="watch-dashboard-title">Watch Analytics</h2>
            <div className="watch-analytics-grid">
              {[...watchedGames].map(gameId => {
                const game = gamesWithMarkets.find(g => g.id === gameId);
                if (!game) return null;
                const isExpanded = expandedCards.has(game.id);
                return (
                  <div 
                    key={game.id} 
                    className={`watch-analytics-card ${isExpanded ? 'expanded' : ''}`}
                    onClick={() => {
                      const newExpanded = new Set(expandedCards);
                      if (newExpanded.has(game.id)) {
                        newExpanded.delete(game.id);
                      } else {
                        newExpanded.add(game.id);
                      }
                      setExpandedCards(newExpanded);
                    }}
                  >
                    <div className="watch-card-left">
                      <img 
                        src={game.image || game.cardImage || game.banner} 
                        alt={game.name}
                        className="watch-game-banner"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                      <div className="watch-game-banner-placeholder" style={{ display: 'none' }}>
                        <div className="watch-game-icon">{game.icon}</div>
                      </div>
                    </div>
                    <div className="watch-card-right">
                      <div className="watch-card-header">
                        <div className="watch-card-header-left">
                          <h3>{game.name}</h3>
                          {investments[game.id] && (
                            <span className="watch-investment-badge" title={`Invested: $${investments[game.id].amount}`}>
                              💰 Invested
                            </span>
                          )}
                        </div>
                        <div className="watch-card-actions">
                          <button 
                            className="watch-remove-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleWatchGame(game.id, e);
                            }}
                            title="Remove from watchlist"
                          >
                            <Eye size={16} strokeWidth={2} />
                          </button>
                          <span className="watch-expand-arrow">{isExpanded ? '▼' : '▶'}</span>
                        </div>
                      </div>
                      <div className="watch-charts-section">
                        <div className="watch-chart-container">
                          <div className="watch-chart-header">
                            <span className="watch-chart-title">Price Trend (7D)</span>
                            <span className="watch-chart-subtitle">Average $45.23</span>
                          </div>
                          <svg className="watch-line-chart" viewBox="0 0 400 180">
                            <defs>
                              <linearGradient id={`gradient-${game.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" style={{ stopColor: '#4a9eff', stopOpacity: 0.4 }} />
                                <stop offset="100%" style={{ stopColor: '#4a9eff', stopOpacity: 0 }} />
                              </linearGradient>
                            </defs>
                            <path
                              d="M 0 160 Q 50 100, 100 60 T 200 70 T 300 65 T 400 50"
                              fill={`url(#gradient-${game.id})`}
                            />
                            <polyline
                              points="0,160 50,100 100,60 150,70 200,80 250,65 300,70 350,55 400,50"
                              fill="none"
                              stroke="#4a9eff"
                              strokeWidth="2.5"
                            />
                          </svg>
                        </div>
                        <div className="watch-mini-charts">
                          <div className="watch-mini-chart">
                            <span className="watch-mini-label">Volume</span>
                            <div className="watch-bar-chart">
                              <div className="watch-bar" style={{ width: '72%' }}></div>
                            </div>
                            <span className="watch-mini-value">$2.1M</span>
                          </div>
                          <div className="watch-mini-chart">
                            <span className="watch-mini-label">Listings</span>
                            <div className="watch-bar-chart">
                              <div className="watch-bar" style={{ width: '45%' }}></div>
                            </div>
                            <span className="watch-mini-value">1,234</span>
                          </div>
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="watch-stats-grid">
                          <div className="watch-stat">
                            <span className="watch-stat-label">Market Rank</span>
                            <span className="watch-stat-value">#{game.marketRank || 1}</span>
                          </div>
                          <div className="watch-stat">
                            <span className="watch-stat-label">Total Volume</span>
                            <span className="watch-stat-value">{game.totalVolume || '$0'}</span>
                          </div>
                          <div className="watch-stat">
                            <span className="watch-stat-label">24H Trend</span>
                            <span className="watch-stat-value">{game.marketTrend || '+0%'}</span>
                          </div>
                          <div className="watch-stat">
                            <span className="watch-stat-label">Active Listings</span>
                            <span className="watch-stat-value">1,234</span>
                          </div>
                          <div className="watch-stat">
                            <span className="watch-stat-label">Price Range</span>
                            <span className="watch-stat-value">$3.25 - $89.99</span>
                          </div>
                          <div className="watch-stat">
                            <span className="watch-stat-label">Avg. Price</span>
                            <span className="watch-stat-value">$45.23</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : marketView === 'favorites' && watchedGames.size === 0 ? (
          <div className="watch-empty-state">
            <Eye size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
            <h3>No watched games</h3>
            <p>Add games to your watchlist to see analytics and trends</p>
          </div>
        ) : (
          <div className="games-selection-grid">
            {(() => {
              let gamesToShow = marketView === 'petitions' ? gamesWithoutMarkets : gamesWithMarkets;
            
              return gamesToShow.map(game => {
            const rankClass = game.marketRank <= 3 ? `rank-${game.marketRank}` : '';
            const isWatched = watchedGames.has(game.id);
            return (
            <div
              key={game.id}
              className={`game-select-card ${rankClass}`}
              onClick={() => {
                if (marketView === 'petitions') {
                  // Handle petition signing
                  handlePetitionSign(game.id);
                } else {
                  if (gameId) {
                    navigate(`/game/${game.id}/market`);
                  } else {
                    navigate(`/game/${game.id}/market`);
                  }
                }
              }}
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
                    {marketView === 'petitions' ? (game.myToken ? 'Signed ✓' : 'Sign Petition') : (game.installed ? 'Open Marketplace' : 'Install & Browse')}
                  </div>
                </div>
              </div>

              {/* Market Info Bar */}
              {marketView === 'petitions' ? (
                <div className="game-select-market-bar">
                  <div className="game-select-market-stat">
                    <div className="game-select-market-stat-value">{game.signatures?.toLocaleString() || '0'}</div>
                    <div className="game-select-market-stat-label">SIGNATURES</div>
                  </div>
                  <div className="game-select-market-stat">
                    <div className="game-select-market-stat-value">{game.myToken ? '1' : '0'}</div>
                    <div className="game-select-market-stat-label">YOUR TOKEN</div>
                  </div>
                  <div className="game-select-market-stat">
                    <div className="game-select-market-stat-value">{game.myToken ? '✓' : '○'}</div>
                    <div className="game-select-market-stat-label">STATUS</div>
                  </div>
                </div>
              ) : (
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
              )}
            </div>
          );
            })
            })()}
          </div>
        )
      }
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
      {/* Market Statistics Bar - Always Visible at Top */}
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