import React, { useState, useEffect, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import './SearchModal.css';

const SearchModal = ({ isOpen, onClose, gamesData, navigate }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  // Filter games based on search query
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      return;
    }

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
      .slice(0, 12); // Limit to 12 results

    setSearchResults(results);
  }, [searchQuery, gamesData, isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  const handleResultClick = (gameId) => {
    onClose();
    if (navigate && gameId) {
      navigate(`/game/${gameId}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="search-modal-overlay" onClick={onClose}>
      <div className="search-modal" onClick={(e) => e.stopPropagation()}>
        <div className="search-modal-header">
          <div className="search-input-wrapper">
            <Search size={20} className="search-icon" />
            <input
              type="text"
              placeholder="Search games..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
              className="search-input"
            />
          </div>
          <button className="search-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="search-results">
          {searchResults.length > 0 ? (
            <div className="search-results-grid">
              {searchResults.map((game) => (
                <div
                  key={game.gameId}
                  className="search-result-card"
                  onClick={() => handleResultClick(game.gameId)}
                >
                  <div
                    className="search-result-banner"
                    style={{
                      backgroundImage: game.banner ? `url(${game.banner})` : undefined,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center'
                    }}
                  >
                    {!game.banner && (
                      <div className="search-result-placeholder">
                        {game.name?.charAt(0).toUpperCase() || 'G'}
                      </div>
                    )}
                  </div>
                  <div className="search-result-info">
                    <h3 className="search-result-title">{game.name}</h3>
                    <p className="search-result-developer">{game.developer}</p>
                    <div className="search-result-stats">
                      <span className="search-rating">⭐ {game.rating}</span>
                      {game.trending && (
                        <span className="search-trending">{game.trending}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : searchQuery.trim() && searchResults.length === 0 ? (
            <div className="search-no-results">
              <p>No games found matching "{searchQuery}"</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default SearchModal;

