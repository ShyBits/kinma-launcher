import React, { useState } from 'react';
import { Play, MoreVertical, Trash2, Heart, Star, Clock, Download } from 'lucide-react';
import './GameCard.css';

const GameCard = ({ game, onLaunch, onRemove }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const handleLaunch = () => {
    onLaunch(game.path);
  };

  const handleRemove = () => {
    onRemove(game.id);
    setShowMenu(false);
  };

  const getGameIcon = () => {
    const firstLetter = game.name.charAt(0).toUpperCase();
    return firstLetter;
  };

  const getGameColor = () => {
    const colors = [
      '#6366f1', '#8b5cf6', '#06b6d4', '#10b981', 
      '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'
    ];
    const index = game.name.length % colors.length;
    return colors[index];
  };

  return (
    <div 
      className="game-card"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ '--game-color': getGameColor() }}
    >
      {/* Game Image/Icon */}
      <div className="game-image">
        <div className="game-icon" style={{ backgroundColor: getGameColor() }}>
          {getGameIcon()}
        </div>
        
        {/* Hover Overlay */}
        <div className="game-overlay">
          <button className="play-button" onClick={handleLaunch}>
            <Play size={24} />
          </button>
        </div>
        
        {/* Game Actions */}
        <div className="game-actions">
          <button className="action-btn favorite-btn">
            <Heart size={14} />
          </button>
          <button 
            className="action-btn menu-btn"
            onClick={() => setShowMenu(!showMenu)}
          >
            <MoreVertical size={14} />
          </button>
        </div>
        
        {/* Game Menu */}
        {showMenu && (
          <div className="game-menu">
            <button className="menu-item" onClick={handleRemove}>
              <Trash2 size={12} />
              Remove Game
            </button>
          </div>
        )}
      </div>

      {/* Game Info */}
      <div className="game-info">
        <div className="game-header">
          <h3 className="game-title">{game.name}</h3>
          <div className="game-rating">
            <Star size={12} />
            <span>4.2</span>
          </div>
        </div>
        
        <div className="game-details">
          <span className="game-genre">Action Game</span>
          <span className="game-size">2.5 GB</span>
        </div>
        
        <div className="game-stats">
          <div className="stat-item">
            <Clock size={12} />
            <span>2 days ago</span>
          </div>
          <div className="stat-item">
            <Download size={12} />
            <span>12.5h</span>
          </div>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="game-decoration">
        <div className="decoration-corner decoration-corner-tl" />
        <div className="decoration-corner decoration-corner-tr" />
        <div className="decoration-corner decoration-corner-bl" />
        <div className="decoration-corner decoration-corner-br" />
      </div>

      {/* Hover Glow */}
      <div className="game-glow" />
    </div>
  );
};

export default GameCard;