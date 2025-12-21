import React, { useState, useEffect } from 'react';
import { Settings, Check, X, RefreshCw } from 'lucide-react';
import steamAPI from '../utils/SteamAPI';

const SteamConnection = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [steamId, setSteamId] = useState('');
  const [loading, setLoading] = useState(false);
  const [gamesCount, setGamesCount] = useState(0);

  useEffect(() => {
    // Auto-initialize on mount
    checkConnection();
  }, []);

  const checkConnection = async () => {
    setLoading(true);
    try {
      const steamId64 = await steamAPI.resolveVanityURL('ShyBits');
      setSteamId(steamId64);
      setIsConnected(true);
      
      // Try to get games count
      try {
        const games = await steamAPI.getOwnedGames();
        setGamesCount(games.length);
      } catch (err) {
        console.log('Games not accessible yet:', err);
      }
    } catch (error) {
      setIsConnected(false);
      console.log('Steam connection check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    setLoading(true);
    try {
      const result = await steamAPI.initialize();
      if (result.success) {
        setIsConnected(true);
        setGamesCount(result.gamesCount);
      } else {
        alert('Failed to connect: ' + result.error);
      }
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="steam-connection-card">
      <div className="connection-header">
        <Settings size={20} />
        <h3>Steam Integration</h3>
      </div>
      
      <div className="connection-status">
        {loading ? (
          <div className="status-loading">
            <RefreshCw size={18} className="spinner" />
            <span>Checking connection...</span>
          </div>
        ) : isConnected ? (
          <div className="status-connected">
            <Check size={18} />
            <div>
              <strong>Connected to Steam</strong>
              {steamId && <p className="steam-id">ID: {steamId}</p>}
              {gamesCount > 0 && <p className="games-count">{gamesCount} games available</p>}
            </div>
          </div>
        ) : (
          <div className="status-disconnected">
            <X size={18} />
            <div>
              <strong>Not Connected</strong>
              <p>Click to connect to Steam</p>
            </div>
          </div>
        )}
      </div>

      {!isConnected && !loading && (
        <button 
          className="connect-btn" 
          onClick={handleConnect}
          disabled={loading}
        >
          Connect to Steam
        </button>
      )}

      {isConnected && (
        <div className="connection-actions">
          <button className="action-btn" onClick={checkConnection}>
            <RefreshCw size={16} />
            Refresh
          </button>
          <button className="action-btn" onClick={() => setSteamId('')}>
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
};

export default SteamConnection;

