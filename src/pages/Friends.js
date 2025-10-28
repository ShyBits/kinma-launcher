import React, { useState } from 'react';
import { Users, UserPlus, Search, MoreHorizontal, MessageCircle, UserMinus } from 'lucide-react';
import './Friends.css';

const Friends = () => {
  const [selectedTab, setSelectedTab] = useState('online');
  const [searchQuery, setSearchQuery] = useState('');

  const friends = [
    {
      id: 1,
      name: 'GamerPro123',
      status: 'online',
      game: 'Playing Pathline',
      lastSeen: 'Now',
      avatar: '👤',
      isPlaying: true
    },
    {
      id: 2,
      name: 'SpeedRunner',
      status: 'online',
      game: 'In Menu',
      lastSeen: '2 minutes ago',
      avatar: '⚡',
      isPlaying: false
    },
    {
      id: 3,
      name: 'ArtCreator',
      status: 'away',
      game: 'Away',
      lastSeen: '1 hour ago',
      avatar: '🎨',
      isPlaying: false
    },
    {
      id: 4,
      name: 'PathlineFan',
      status: 'offline',
      game: 'Last seen 2 days ago',
      lastSeen: '2 days ago',
      avatar: '🎮',
      isPlaying: false
    },
    {
      id: 5,
      name: 'ProGamer',
      status: 'online',
      game: 'Playing Pathline',
      lastSeen: 'Now',
      avatar: '🏆',
      isPlaying: true
    }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return '#22c55e';
      case 'away': return '#f59e0b';
      case 'offline': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'online': return 'Online';
      case 'away': return 'Away';
      case 'offline': return 'Offline';
      default: return 'Unknown';
    }
  };

  const filteredFriends = friends.filter(friend => 
    friend.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const onlineFriends = filteredFriends.filter(friend => friend.status === 'online');
  const awayFriends = filteredFriends.filter(friend => friend.status === 'away');
  const offlineFriends = filteredFriends.filter(friend => friend.status === 'offline');

  const renderFriend = (friend) => (
    <div key={friend.id} className="friend-item">
      <div className="friend-avatar">
        <div className="avatar-icon">{friend.avatar}</div>
        <div 
          className="status-indicator"
          style={{ backgroundColor: getStatusColor(friend.status) }}
        />
      </div>
      
      <div className="friend-info">
        <div className="friend-header">
          <span className="friend-name">{friend.name}</span>
          <span className="friend-status">{getStatusText(friend.status)}</span>
        </div>
        <p className="friend-game">{friend.game}</p>
        <p className="friend-last-seen">{friend.lastSeen}</p>
      </div>
      
      <div className="friend-actions">
        {friend.status === 'online' && (
          <button className="action-btn" title="Send Message">
            <MessageCircle size={16} />
          </button>
        )}
        <button className="action-btn" title="More Options">
          <MoreHorizontal size={16} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="friends">
      <div className="friends-header">
        <h1>Friends</h1>
        <p>Connect and play with your gaming friends</p>
      </div>

      <div className="friends-content">
        <div className="friends-search">
          <div className="search-container">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search friends..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
          <button className="add-friend-btn">
            <UserPlus size={16} />
            Add Friend
          </button>
        </div>

        <div className="friends-tabs">
          <button 
            className={`tab-btn ${selectedTab === 'online' ? 'active' : ''}`}
            onClick={() => setSelectedTab('online')}
          >
            <Users size={16} />
            Online ({onlineFriends.length})
          </button>
          <button 
            className={`tab-btn ${selectedTab === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedTab('all')}
          >
            <Users size={16} />
            All Friends ({filteredFriends.length})
          </button>
        </div>

        <div className="friends-list">
          {selectedTab === 'online' ? (
            <>
              {onlineFriends.length > 0 ? (
                onlineFriends.map(renderFriend)
              ) : (
                <div className="empty-state">
                  <Users size={48} />
                  <h3>No friends online</h3>
                  <p>Your friends will appear here when they come online</p>
                </div>
              )}
            </>
          ) : (
            <>
              {onlineFriends.length > 0 && (
                <div className="friend-group">
                  <h3 className="group-title">Online</h3>
                  {onlineFriends.map(renderFriend)}
                </div>
              )}
              
              {awayFriends.length > 0 && (
                <div className="friend-group">
                  <h3 className="group-title">Away</h3>
                  {awayFriends.map(renderFriend)}
                </div>
              )}
              
              {offlineFriends.length > 0 && (
                <div className="friend-group">
                  <h3 className="group-title">Offline</h3>
                  {offlineFriends.map(renderFriend)}
                </div>
              )}
              
              {filteredFriends.length === 0 && (
                <div className="empty-state">
                  <Users size={48} />
                  <h3>No friends found</h3>
                  <p>Try adjusting your search or add some friends</p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="friends-stats">
          <div className="stat-item">
            <span className="stat-label">Total Friends</span>
            <span className="stat-value">{friends.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Online Now</span>
            <span className="stat-value">{onlineFriends.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Playing Pathline</span>
            <span className="stat-value">{friends.filter(f => f.isPlaying).length}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Friends;