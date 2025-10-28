import React, { useState } from 'react';
import { User, Activity, Trophy, Clock, Gamepad2, Calendar, TrendingUp, Star, Building } from 'lucide-react';
import './Profile.css';

const Profile = ({ navigate }) => {
  const handleGameStudioClick = () => {
    navigate('/game-studio');
  };
  const userStats = {
    username: 'Player',
    level: 42,
    exp: 1250,
    expToNext: 1500,
    totalGames: 156,
    achievements: 23,
    totalPlaytime: 1240, // hours
    rank: 'Elite'
  };

  const recentAchievements = [
    { id: 1, name: 'First Victory', icon: '🏆', date: '2 days ago' },
    { id: 2, name: 'Speed Runner', icon: '⚡', date: '1 week ago' },
    { id: 3, name: 'Collector', icon: '💎', date: '2 weeks ago' },
  ];

  const gameLibrary = [
    { id: 1, name: 'Pathline', hours: 450, lastPlayed: '3 days ago', progress: 87, favorite: true },
    { id: 2, name: 'Cyber Arena', hours: 320, lastPlayed: '1 week ago', progress: 65 },
    { id: 3, name: 'Racing Thunder', hours: 180, lastPlayed: '2 weeks ago', progress: 42 },
  ];

  const recentActivity = [
    { id: 1, type: 'achievement', text: 'Unlocked "First Victory" achievement', time: '2 days ago' },
    { id: 2, type: 'playtime', text: 'Played Pathline for 3 hours', time: '3 days ago' },
    { id: 3, type: 'level', text: 'Reached Level 42', time: '5 days ago' },
  ];

  const expPercentage = (userStats.exp / userStats.expToNext) * 100;

  return (
    <div className="profile">
      <div className="profile-container">
        {/* Hero Section with Gradient Background */}
        <div className="profile-hero">
          <div className="profile-avatar-large">
            <User size={80} />
          </div>
          <div className="profile-hero-content">
            <div className="profile-username">{userStats.username}</div>
            <div className="profile-meta">
              <span className="profile-rank-badge">{userStats.rank}</span>
              <span className="profile-level-badge">Level {userStats.level}</span>
            </div>
            <div className="profile-progress-bar">
              <div 
                className="profile-progress-fill" 
                style={{ width: `${expPercentage}%` }}
              />
              <div className="profile-progress-text">
                {userStats.exp} / {userStats.expToNext} EXP
              </div>
            </div>
          </div>
          <div className="profile-stats-quick">
            <div className="quick-stat">
              <Gamepad2 size={20} />
              <span>{userStats.totalGames}</span>
            </div>
            <div className="quick-stat">
              <Trophy size={20} />
              <span>{userStats.achievements}</span>
            </div>
            <div className="quick-stat">
              <Clock size={20} />
              <span>{userStats.totalPlaytime}h</span>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="profile-grid">
          {/* Left Column */}
          <div className="profile-left">
            {/* Stats Cards */}
            <div className="stats-section">
              <h2 className="section-title">
                <TrendingUp size={20} />
                Stats Overview
              </h2>
              <div className="stats-grid">
                <div className="stat-card stat-card-primary">
                  <div className="stat-card-icon">
                    <Gamepad2 size={24} />
                  </div>
                  <div className="stat-card-content">
                    <div className="stat-value">{userStats.totalGames}</div>
                    <div className="stat-label">Games Owned</div>
                  </div>
                </div>
                <div className="stat-card stat-card-success">
                  <div className="stat-card-icon">
                    <Trophy size={24} />
                  </div>
                  <div className="stat-card-content">
                    <div className="stat-value">{userStats.achievements}</div>
                    <div className="stat-label">Achievements</div>
                  </div>
                </div>
                <div className="stat-card stat-card-warning">
                  <div className="stat-card-icon">
                    <Clock size={24} />
                  </div>
                  <div className="stat-card-content">
                    <div className="stat-value">{userStats.totalPlaytime}h</div>
                    <div className="stat-label">Playtime</div>
                  </div>
                </div>
                <div className="stat-card stat-card-info">
                  <div className="stat-card-icon">
                    <Star size={24} />
                  </div>
                  <div className="stat-card-content">
                    <div className="stat-value">{userStats.rank}</div>
                    <div className="stat-label">Rank</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="activity-section">
              <h2 className="section-title">
                <Activity size={20} />
                Recent Activity
              </h2>
              <div className="activity-list">
                {recentActivity.map(activity => (
                  <div key={activity.id} className="activity-item">
                    <div className="activity-dot" />
                    <div className="activity-content">
                      <p>{activity.text}</p>
                      <span>{activity.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="profile-right">
            {/* Game Library */}
            <div className="library-section">
              <h2 className="section-title">
                <Gamepad2 size={20} />
                Your Library
              </h2>
              <div className="library-list">
                {gameLibrary.map(game => (
                  <div key={game.id} className="library-card">
                    <div className="library-card-header">
                      <div className="library-game-info">
                        <h3>{game.name}</h3>
                        {game.favorite && <Star size={16} className="favorite-icon" />}
                      </div>
                      <div className="library-hours">{game.hours}h</div>
                    </div>
                    <div className="library-progress">
                      <div 
                        className="library-progress-bar"
                        style={{ width: `${game.progress}%` }}
                      />
                    </div>
                    <div className="library-footer">
                      <Calendar size={14} />
                      <span>Last played: {game.lastPlayed}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Achievements */}
            <div className="achievements-section">
              <h2 className="section-title">
                <Trophy size={20} />
                Recent Achievements
              </h2>
              <div className="achievements-list">
                {recentAchievements.map(achievement => (
                  <div key={achievement.id} className="achievement-card">
                    <div className="achievement-icon-large">{achievement.icon}</div>
                    <div className="achievement-info">
                      <h3>{achievement.name}</h3>
                      <p>{achievement.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Game Studio Button */}
        <div className="profile-studio-section">
          <button className="game-studio-btn" onClick={handleGameStudioClick}>
            <Building size={24} />
            <span>Game Studio</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
