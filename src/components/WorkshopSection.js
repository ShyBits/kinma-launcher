import React, { useState, useEffect } from 'react';
import { Download, Star, Clock, Heart, TrendingUp, Filter, Search, Package, FileText, Image as ImageIcon } from 'lucide-react';
import steamAPI from '../utils/SteamAPI';
import { getAllUsersData, getUserData, saveUserData } from '../utils/UserDataManager';
import './WorkshopSection.css';

const WorkshopSection = ({ gameId }) => {
  const [workshopItems, setWorkshopItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('popular');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = ['all', 'mods', 'maps', 'items', 'skins', 'other'];

  useEffect(() => {
    loadWorkshopItems();
  }, [gameId]);

  useEffect(() => {
    filterItems();
  }, [workshopItems, searchQuery, sortBy, selectedCategory]);

  const loadWorkshopItems = async () => {
    setLoading(true);
    try {
      // Get all workshop items from all users (shared marketplace)
      const allItems = getAllUsersData('workshopItems');
      
      // Filter to only show published items
      const publishedItems = allItems.filter(item => {
        const status = item.status || 'published';
        return status === 'public' || status === 'published';
      });

      // Filter by gameId if specified
      let filteredByGame = publishedItems;
      if (gameId && gameId !== 'all') {
        filteredByGame = publishedItems.filter(item => item.gameId === gameId);
      }

      // Load user's subscriptions (account-separated)
      const userSubscriptions = getUserData('workshopSubscriptions', []);

      // Mark items as subscribed if user has subscribed
      const itemsWithSubscriptionStatus = filteredByGame.map(item => ({
        ...item,
        subscribed: userSubscriptions.includes(item.id)
      }));

      // If no items found, use mock data as fallback
      if (itemsWithSubscriptionStatus.length === 0) {
        const mockItems = [
          {
            id: 1,
            title: 'Realistic Weapon Pack',
            author: 'ModMaster',
            subscribers: 45230,
            rating: 4.8,
            downloads: 125000,
            size: '250 MB',
            updated: '2 days ago',
            category: 'mods',
            tags: ['weapons', 'realistic', 'combat'],
            description: 'Adds 50+ realistic weapons with detailed models and animations.',
            thumbnail: '/api/placeholder/300/200',
            type: 'mod',
            status: 'published'
          },
          {
            id: 2,
            title: 'Custom Map: Desert Fortress',
            author: 'LevelDesigner',
            subscribers: 28900,
            rating: 4.9,
            downloads: 78000,
            size: '150 MB',
            updated: '5 days ago',
            category: 'maps',
            tags: ['map', 'desert', 'pvp'],
            description: 'An intense desert fortress map perfect for PvP battles.',
            thumbnail: '/api/placeholder/300/200',
            type: 'map',
            status: 'published'
          }
        ];
        const mockWithSubscriptions = mockItems.map(item => ({
          ...item,
          subscribed: userSubscriptions.includes(item.id)
        }));
        setWorkshopItems(mockWithSubscriptions);
        setFilteredItems(mockWithSubscriptions);
      } else {
        setWorkshopItems(itemsWithSubscriptionStatus);
        setFilteredItems(itemsWithSubscriptionStatus);
      }
    } catch (error) {
      console.error('Error loading workshop items:', error);
      setWorkshopItems([]);
      setFilteredItems([]);
    } finally {
      setLoading(false);
    }
  };

  // Reload workshop items when user changes or items are updated
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key && e.key.startsWith('workshopItems_')) {
        loadWorkshopItems();
      }
    };

    window.addEventListener('user-changed', loadWorkshopItems);
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('user-changed', loadWorkshopItems);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [gameId]);

  const filterItems = () => {
    let filtered = [...workshopItems];

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(item => 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Sort items
    filtered = filtered.sort((a, b) => {
      switch (sortBy) {
        case 'popular':
          return b.subscribers - a.subscribers;
        case 'rating':
          return b.rating - a.rating;
        case 'recent':
          // Mock: sort by id descending
          return b.id - a.id;
        case 'downloads':
          return b.downloads - a.downloads;
        default:
          return 0;
      }
    });

    setFilteredItems(filtered);
  };

  const handleDownload = (itemId) => {
    // In production, this would call Steam Workshop API to download
    console.log('Downloading workshop item:', itemId);
    // Example: await steamAPI.downloadWorkshopItem(itemId);
  };

  const handleSubscribe = (itemId) => {
    console.log('Subscribing to workshop item:', itemId);
    
    // Get current subscriptions (account-separated)
    const subscriptions = getUserData('workshopSubscriptions', []);
    
    // Toggle subscription
    let updatedSubscriptions;
    if (subscriptions.includes(itemId)) {
      updatedSubscriptions = subscriptions.filter(id => id !== itemId);
    } else {
      updatedSubscriptions = [...subscriptions, itemId];
    }
    
    // Save subscriptions (account-separated)
    saveUserData('workshopSubscriptions', updatedSubscriptions);
    
    // Update local state to show subscribed status
    setWorkshopItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, subscribed: updatedSubscriptions.includes(itemId) } : item
    ));
    setFilteredItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, subscribed: updatedSubscriptions.includes(itemId) } : item
    ));
  };

  return (
    <div className="workshop-section">
      <div className="workshop-header">
        <div className="workshop-title-section">
          <Package size={24} />
          <div>
            <h2>Workshop</h2>
            <p>Browse and download community-created content</p>
          </div>
        </div>
        <div className="workshop-search-bar">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search workshop items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="workshop-content">
        {/* Filters */}
        <div className="workshop-filters">
          <div className="filter-group">
            <Filter size={16} />
            <span>Category:</span>
            {categories.map(category => (
              <button
                key={category}
                className={`filter-btn ${selectedCategory === category ? 'active' : ''}`}
                onClick={() => setSelectedCategory(category)}
              >
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </button>
            ))}
          </div>

          <div className="filter-group">
            <span>Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="sort-select"
            >
              <option value="popular">Most Popular</option>
              <option value="rating">Highest Rated</option>
              <option value="recent">Most Recent</option>
              <option value="downloads">Most Downloads</option>
            </select>
          </div>
        </div>

        {/* Workshop Items Grid */}
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading workshop items...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="empty-state">
            <Package size={48} />
            <h3>No workshop items found</h3>
            <p>Try adjusting your filters or search query</p>
          </div>
        ) : (
          <div className="workshop-grid">
            {filteredItems.map(item => (
              <div key={item.id} className="workshop-item-card">
                <div className="workshop-item-image">
                  <div className="image-placeholder">
                    <ImageIcon size={32} />
                    <span>{item.type}</span>
                  </div>
                  <div className="workshop-item-badge">
                    {item.category}
                  </div>
                </div>

                <div className="workshop-item-content">
                  <h3 className="workshop-item-title">{item.title}</h3>
                  <p className="workshop-item-description">{item.description}</p>

                  <div className="workshop-item-stats">
                    <div className="stat">
                      <Download size={14} />
                      <span>{item.downloads.toLocaleString()}</span>
                    </div>
                    <div className="stat">
                      <Star size={14} />
                      <span>{item.rating}</span>
                    </div>
                    <div className="stat">
                      <TrendingUp size={14} />
                      <span>{item.subscribers.toLocaleString()}</span>
                    </div>
                    <div className="stat">
                      <Clock size={14} />
                      <span>{item.size}</span>
                    </div>
                  </div>

                  <div className="workshop-item-tags">
                    {item.tags.map((tag, index) => (
                      <span key={index} className="tag">{tag}</span>
                    ))}
                  </div>

                  <div className="workshop-item-footer">
                    <div className="workshop-item-author">
                      <span>by</span>
                      <strong>{item.author}</strong>
                    </div>
                    <div className="workshop-item-actions">
                      <button
                        className="action-btn subscribe-btn"
                        onClick={() => handleSubscribe(item.id)}
                      >
                        <Heart size={16} />
                      </button>
                      <button
                        className="action-btn download-btn"
                        onClick={() => handleDownload(item.id)}
                      >
                        <Download size={16} />
                        Subscribe
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {filteredItems.length > 0 && (
        <div className="workshop-pagination">
          <button className="pagination-btn" disabled>Previous</button>
          <span className="pagination-info">Page 1 of 5</span>
          <button className="pagination-btn">Next</button>
        </div>
      )}
    </div>
  );
};

export default WorkshopSection;

