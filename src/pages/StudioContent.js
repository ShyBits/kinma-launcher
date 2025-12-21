import React, { useState, useEffect } from 'react';
import { Package, Upload, FileText, Image, Video, Music, Plus, Edit, Trash2, MoreVertical } from 'lucide-react';
import { getCurrentUserId, getUserData, saveUserData } from '../utils/UserDataManager';
import './GameStudio.css';

const StudioContent = ({ navigate }) => {
  const [games, setGames] = useState([]);
  const [assets, setAssets] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const userId = await getCurrentUserId();
        if (!userId) {
          navigate('/auth');
          return;
        }
        // Allow access - if user can navigate here, they should be able to see it
        // The main GameStudio page handles access control
      } catch (error) {
        console.error('Error checking access:', error);
      }
    };
    
    checkAccess();
    
    const handleUserChange = () => {
      checkAccess();
    };
    
    window.addEventListener('user-changed', handleUserChange);
    return () => {
      window.removeEventListener('user-changed', handleUserChange);
    };
  }, [navigate]);

  useEffect(() => {
    const loadContent = async () => {
      try {
        const userId = await getCurrentUserId();
        const customGames = await getUserData('customGames', []);
        
        setGames(customGames.map((game, index) => ({
          id: game.gameId || game.id || index,
          name: game.name || game.gameName || 'Untitled Game',
          status: game.status || 'draft',
          lastUpdated: game.lastUpdated || 'just now',
          banner: game.banner || game.bannerImage || '/public/images/games/pathline-banner.jpg',
          downloads: game.downloads || 0
        })));
        
        // Load user's assets from storage (if implemented in the future)
        // For now, show empty state
        setAssets([]);
      } catch (error) {
        console.error('Error loading content:', error);
      }
    };
    
    loadContent();
    
    // Listen for game updates
    const handleCustomGameUpdate = () => {
      loadContent();
    };
    
    const handleUserChange = () => {
      loadContent();
    };
    
    window.addEventListener('customGameUpdate', handleCustomGameUpdate);
    window.addEventListener('user-changed', handleUserChange);
    
    return () => {
      window.removeEventListener('customGameUpdate', handleCustomGameUpdate);
      window.removeEventListener('user-changed', handleUserChange);
    };
  }, []);

  const handleDeleteGame = async (gameId) => {
    try {
      const userId = await getCurrentUserId();
      const customGames = await getUserData('customGames', []);
      const gameToDelete = customGames.find(game => (game.gameId || game.id) === gameId);
      
      if (!gameToDelete) {
        console.error('Game not found');
        return;
      }
      
      // Delete game folder if Electron API is available
      if (window.electronAPI && window.electronAPI.deleteGameFolder && gameToDelete.gameId) {
        try {
          await window.electronAPI.deleteGameFolder(gameToDelete.gameId);
        } catch (error) {
          console.warn('Could not delete game folder:', error);
        }
      }
      
      const updatedGames = customGames.filter(game => (game.gameId || game.id) !== gameId);
      await saveUserData('customGames', updatedGames);
      window.dispatchEvent(new Event('customGameUpdate'));
      setShowDeleteConfirm(null);
      
      // Reload games
      const reloadedGames = updatedGames.map((game, index) => ({
        id: game.gameId || game.id || index,
        name: game.name || game.gameName || 'Untitled Game',
        status: game.status || 'draft',
        lastUpdated: game.lastUpdated || 'just now',
        banner: game.banner || game.bannerImage || '/public/images/games/pathline-banner.jpg',
        downloads: game.downloads || 0
      }));
      setGames(reloadedGames);
    } catch (error) {
      console.error('Error deleting game:', error);
      alert('Failed to delete game. Please try again.');
    }
  };

  const handleAssetUpload = async (files) => {
    try {
      // Convert files to asset objects
      const newAssets = await Promise.all(
        Array.from(files).map(async (file) => {
          const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
          return {
            id: Date.now() + Math.random(),
            name: file.name,
            type: file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'audio',
            size: `${sizeMB} MB`,
            uploaded: 'just now',
            file: file
          };
        })
      );
      
      // Add to assets list
      setAssets(prev => [...prev, ...newAssets]);
      
      // Here you could also save to storage/database
      console.log('Assets uploaded:', newAssets);
    } catch (error) {
      console.error('Error uploading assets:', error);
      alert('Failed to upload assets. Please try again.');
    }
  };

  const handleEditAsset = (asset) => {
    // Open file picker to replace asset
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,video/*,audio/*';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
        setAssets(prev => prev.map(a => 
          a.id === asset.id 
            ? { ...a, name: file.name, size: `${sizeMB} MB`, file: file }
            : a
        ));
      }
    };
    input.click();
  };

  const handleDeleteAsset = (assetId) => {
    if (window.confirm('Are you sure you want to delete this asset?')) {
      setAssets(prev => prev.filter(a => a.id !== assetId));
    }
  };

  return (
    <div className="studio-page">
      <div className="studio-header">
        <div className="studio-header-content">
          <h1 className="studio-title">
            <Package size={24} />
            Content
          </h1>
          <p className="studio-subtitle">Manage your games and assets</p>
        </div>
        <button className="studio-header-action" onClick={() => navigate('/game-studio')}>
          <Plus size={18} />
          <span>New Game</span>
        </button>
      </div>
      
      <div className="studio-content">
        <div className="content-main-section">
          <div className="content-section-header">
            <div>
              <h2>Your Games</h2>
              <span className="content-count">{games.length} {games.length === 1 ? 'game' : 'games'}</span>
            </div>
            <button className="content-action-button" onClick={() => navigate('/game-studio')}>
              <Plus size={16} />
              <span>Add Game</span>
            </button>
          </div>
          
          {games.length > 0 ? (
            <div className="content-games-list">
              {games.map((game) => (
                <div key={game.id} className="content-game-item">
                  <div className="content-game-thumbnail" style={{ backgroundImage: `url(${game.banner})` }}>
                    <div className="content-game-status-badge">{game.status}</div>
                  </div>
                  <div className="content-game-details">
                    <div className="content-game-name">{game.name}</div>
                    <div className="content-game-meta">
                      <span>{game.downloads.toLocaleString()} downloads</span>
                      <span>•</span>
                      <span>Updated {game.lastUpdated}</span>
                    </div>
                  </div>
                  <div className="content-game-actions">
                    <button 
                      className="content-icon-btn" 
                      onClick={(e) => {
                        e.stopPropagation();
                        // Navigate to game studio with game ID to edit
                        navigate(`/game-studio?edit=${game.id}`);
                      }} 
                      title="Edit"
                    >
                      <Edit size={16} />
                    </button>
                    <button 
                      className="content-icon-btn" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDeleteConfirm(game.id);
                      }}
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="content-empty-state">
              <Package size={40} />
              <p>No games yet</p>
              <button className="content-primary-btn" onClick={() => navigate('/game-studio')}>
                Create Your First Game
              </button>
            </div>
          )}
        </div>
        
        <div className="content-main-section">
          <div className="content-section-header">
            <div>
              <h2>Assets</h2>
              <span className="content-count">{assets.length} {assets.length === 1 ? 'asset' : 'assets'}</span>
            </div>
            <button 
              className="content-action-button"
              onClick={() => {
                // Trigger file input for asset upload
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*,video/*,audio/*';
                input.multiple = true;
                input.onchange = (e) => {
                  const files = Array.from(e.target.files);
                  if (files.length > 0) {
                    // Handle asset upload
                    handleAssetUpload(files);
                  }
                };
                input.click();
              }}
            >
              <Upload size={16} />
              <span>Upload Asset</span>
            </button>
          </div>
          
          {assets.length > 0 ? (
            <div className="content-assets-list-minimal">
              {assets.map((asset) => (
                <div key={asset.id} className="content-asset-item-minimal">
                  <div className="content-asset-type-icon">
                    {asset.type === 'image' && <Image size={18} />}
                    {asset.type === 'video' && <Video size={18} />}
                    {asset.type === 'audio' && <Music size={18} />}
                  </div>
                  <div className="content-asset-details">
                    <div className="content-asset-name-minimal">{asset.name}</div>
                    <div className="content-asset-meta-minimal">{asset.size} • {asset.uploaded}</div>
                  </div>
                  <div className="content-asset-actions-minimal">
                    <button 
                      className="content-icon-btn" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditAsset(asset);
                      }}
                      title="Edit"
                    >
                      <Edit size={16} />
                    </button>
                    <button 
                      className="content-icon-btn" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteAsset(asset.id);
                      }}
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="content-empty-state">
              <Upload size={40} />
              <p>No assets uploaded yet</p>
              <button 
                className="content-primary-btn"
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*,video/*,audio/*';
                  input.multiple = true;
                  input.onchange = (e) => {
                    const files = Array.from(e.target.files);
                    if (files.length > 0) {
                      handleAssetUpload(files);
                    }
                  };
                  input.click();
                }}
              >
                Upload Your First Asset
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="content-delete-modal-overlay" onClick={() => setShowDeleteConfirm(null)}>
          <div className="content-delete-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Delete Game</h3>
            <p>Are you sure you want to delete this game? This action cannot be undone.</p>
            <div className="content-delete-modal-actions">
              <button 
                className="content-delete-cancel"
                onClick={() => setShowDeleteConfirm(null)}
              >
                Cancel
              </button>
              <button 
                className="content-delete-confirm"
                onClick={() => handleDeleteGame(showDeleteConfirm)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudioContent;

