import React, { useState, useEffect } from 'react';
import { X, MessageSquare, Users, Settings, Home, Monitor, FileText, Download } from 'lucide-react';
import './InGameOverlay.css';

const InGameOverlay = ({ isVisible, onClose }) => {
  const [activeTab, setActiveTab] = useState('overlay');
  const [isMinimized, setIsMinimized] = useState(false);

  // Listen for overlay toggle hotkey (default: Shift + O)
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Shift + O to toggle overlay
      if (e.shiftKey && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        // This would be controlled by parent
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  if (!isVisible) return null;

  return (
    <div className={`ingame-overlay ${isMinimized ? 'minimized' : ''}`}>
      {/* Header */}
      <div className="overlay-header">
        <div className="overlay-title">
          <Monitor size={18} />
          <span>Kinma Game Overlay</span>
        </div>
        <div className="overlay-actions">
          <button 
            className="overlay-btn" 
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? 'Restore' : 'Minimize'}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Tabs */}
          <div className="overlay-tabs">
            <button 
              className={`overlay-tab ${activeTab === 'overlay' ? 'active' : ''}`}
              onClick={() => setActiveTab('overlay')}
            >
              <Monitor size={16} />
              <span>Overlay</span>
            </button>
            <button 
              className={`overlay-tab ${activeTab === 'chat' ? 'active' : ''}`}
              onClick={() => setActiveTab('chat')}
            >
              <MessageSquare size={16} />
              <span>Chat</span>
            </button>
            <button 
              className={`overlay-tab ${activeTab === 'friends' ? 'active' : ''}`}
              onClick={() => setActiveTab('friends')}
            >
              <Users size={16} />
              <span>Friends</span>
            </button>
            <button 
              className={`overlay-tab ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              <Settings size={16} />
              <span>Settings</span>
            </button>
          </div>

          {/* Content */}
          <div className="overlay-content">
            {activeTab === 'overlay' && (
              <div className="overlay-section">
                <h3>Game Overlay</h3>
                <div className="overlay-quick-actions">
                  <button className="quick-action-btn">
                    <FileText size={18} />
                    <span>View Achievements</span>
                  </button>
                  <button className="quick-action-btn">
                    <Download size={18} />
                    <span>Screenshot</span>
                  </button>
                  <button className="quick-action-btn">
                    <Settings size={18} />
                    <span>Game Settings</span>
                  </button>
                  <button className="quick-action-btn">
                    <Home size={18} />
                    <span>Return to Home</span>
                  </button>
                </div>
                <div className="overlay-info">
                  <p>Press <kbd>Shift + O</kbd> to toggle overlay</p>
                  <p>Press <kbd>Alt + Tab</kbd> to minimize</p>
                </div>
              </div>
            )}

            {activeTab === 'chat' && (
              <div className="overlay-section">
                <h3>Chat</h3>
                <div className="overlay-messages">
                  <div className="overlay-message">
                    <span className="message-author">Player1:</span>
                    <span className="message-text">Great game!</span>
                  </div>
                  <div className="overlay-message">
                    <span className="message-author">Player2:</span>
                    <span className="message-text">Let's team up?</span>
                  </div>
                </div>
                <div className="overlay-chat-input">
                  <input 
                    type="text" 
                    placeholder="Type message..." 
                    className="overlay-input"
                  />
                  <button className="overlay-send-btn">Send</button>
                </div>
              </div>
            )}

            {activeTab === 'friends' && (
              <div className="overlay-section">
                <h3>Friends Online</h3>
                <div className="overlay-friends-list">
                  <div className="overlay-friend-item online">
                    <div className="friend-avatar">A</div>
                    <div className="friend-info">
                      <span className="friend-name">Player1</span>
                      <span className="friend-status">In Game</span>
                    </div>
                  </div>
                  <div className="overlay-friend-item online">
                    <div className="friend-avatar">B</div>
                    <div className="friend-info">
                      <span className="friend-name">Player2</span>
                      <span className="friend-status">In Game</span>
                    </div>
                  </div>
                  <div className="overlay-friend-item away">
                    <div className="friend-avatar">C</div>
                    <div className="friend-info">
                      <span className="friend-name">Player3</span>
                      <span className="friend-status">Away</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="overlay-section">
                <h3>Overlay Settings</h3>
                <div className="overlay-settings-list">
                  <label className="overlay-setting-item">
                    <input type="checkbox" defaultChecked />
                    <span>Show FPS Counter</span>
                  </label>
                  <label className="overlay-setting-item">
                    <input type="checkbox" defaultChecked />
                    <span>Show Frame Time</span>
                  </label>
                  <label className="overlay-setting-item">
                    <input type="checkbox" />
                    <span>Show Network Stats</span>
                  </label>
                  <label className="overlay-setting-item">
                    <input type="checkbox" defaultChecked />
                    <span>Enable Notifications</span>
                  </label>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Quick Close Button */}
      <button className="overlay-close-btn" onClick={onClose}>
        <X size={16} />
        Close
      </button>
    </div>
  );
};

export default InGameOverlay;

