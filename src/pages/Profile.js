import React, { useState, useEffect } from 'react';
import { User, Activity, Trophy, Clock, Gamepad2, Star, TrendingUp } from 'lucide-react';
import { getUserData, saveUserData } from '../utils/UserDataManager';
import './Profile.css';

const Profile = ({ navigate }) => {
  // Load user data from account-separated storage
  const [authUser, setAuthUser] = useState(() => {
    try {
      const u = localStorage.getItem('authUser');
      return u ? JSON.parse(u) : null;
    } catch (_) {
      return null;
    }
  });

  // Load user stats (account-separated)
  const [userStats, setUserStats] = useState(() => {
    try {
      const stats = getUserData('userStats', {
        level: 1,
        exp: 0,
        expToNext: 100,
        totalGames: 0,
        achievements: 0,
        totalPlaytime: 0,
        rank: 'Novice'
      });
      return stats;
    } catch (_) {
      return {
        level: 1,
        exp: 0,
        expToNext: 100,
        totalGames: 0,
        achievements: 0,
        totalPlaytime: 0,
        rank: 'Novice'
      };
    }
  });

  // Load user games (account-separated)
  const [customGames, setCustomGames] = useState(() => {
    try {
      return getUserData('customGames', []);
    } catch (_) {
      return [];
    }
  });

  // Load recent achievements (account-separated)
  const [recentAchievements, setRecentAchievements] = useState(() => {
    try {
      return getUserData('recentAchievements', []);
    } catch (_) {
      return [];
    }
  });

  // Load recent activity (account-separated)
  const [recentActivity, setRecentActivity] = useState(() => {
    try {
      return getUserData('recentActivity', []);
    } catch (_) {
      return [];
    }
  });

  // Reload data when user changes
  useEffect(() => {
    const handleUserChange = () => {
      try {
        const u = localStorage.getItem('authUser');
        setAuthUser(u ? JSON.parse(u) : null);
        setUserStats(getUserData('userStats', {
          level: 1,
          exp: 0,
          expToNext: 100,
          totalGames: 0,
          achievements: 0,
          totalPlaytime: 0,
          rank: 'Novice'
        }));
        setCustomGames(getUserData('customGames', []));
        setRecentAchievements(getUserData('recentAchievements', []));
        setRecentActivity(getUserData('recentActivity', []));
      } catch (_) {}
    };

    window.addEventListener('user-changed', handleUserChange);
    return () => window.removeEventListener('user-changed', handleUserChange);
  }, []);

  // Calculate stats from actual games
  useEffect(() => {
    if (customGames.length > 0) {
      const totalPlaytime = customGames.reduce((sum, game) => sum + (parseInt(game.playtime) || 0), 0);
      const updatedStats = {
        ...userStats,
        totalGames: customGames.length,
        totalPlaytime: totalPlaytime
      };
      setUserStats(updatedStats);
      saveUserData('userStats', updatedStats);
    }
  }, [customGames]);

  const userName = authUser?.name || authUser?.username || authUser?.email?.split('@')[0] || 'Player';
  const expPercentage = userStats.expToNext > 0 ? (userStats.exp / userStats.expToNext) * 100 : 0;

  // Get library games (user's games with playtime info)
  const gameLibrary = customGames.slice(0, 3).map(game => ({
    id: game.gameId || game.id,
    name: game.name || game.gameName || 'Untitled Game',
    hours: parseInt(game.playtime) || 0,
    lastPlayed: game.lastPlayed || 'Never',
    progress: game.progress || 0,
    favorite: game.favorite || false
  }));

  return (
    <div className="profile">
      <div className="profile-container">
        {/* Header Section */}
        <div className="profile-header">
          <div className="profile-header-left">
            <div className="profile-avatar">
              <User size={40} />
            </div>
            <div className="profile-header-info">
              <div className="profile-username">{userName}</div>
              <div className="profile-badges">
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
          </div>
          <div className="profile-header-right">
            <div className="profile-quick-stat">
              <Gamepad2 size={20} />
              <span>{userStats.totalGames}</span>
            </div>
            <div className="profile-quick-stat">
              <Trophy size={20} />
              <span>{userStats.achievements}</span>
            </div>
            <div className="profile-quick-stat">
              <Clock size={20} />
              <span>{userStats.totalPlaytime}h</span>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="profile-grid">
          {/* Left Column */}
          <div className="profile-left">
            {/* Stats Overview */}
            <div className="profile-section">
              <h2 className="profile-section-title">
                <TrendingUp size={18} />
                STATS OVERVIEW
              </h2>
              <div className="stats-grid">
                <div className="stat-card">
                  <Gamepad2 size={24} />
                  <div className="stat-value">{userStats.totalGames}</div>
                  <div className="stat-label">GAMES OWNED</div>
                </div>
                <div className="stat-card">
                  <Trophy size={24} />
                  <div className="stat-value">{userStats.achievements}</div>
                  <div className="stat-label">ACHIEVEMENTS</div>
                </div>
                <div className="stat-card">
                  <Clock size={24} />
                  <div className="stat-value">{userStats.totalPlaytime}h</div>
                  <div className="stat-label">PLAYTIME</div>
                </div>
                <div className="stat-card">
                  <Star size={24} />
                  <div className="stat-value">{userStats.rank}</div>
                  <div className="stat-label">RANK</div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="profile-section">
              <h2 className="profile-section-title">
                <Activity size={18} />
                RECENT ACTIVITY
              </h2>
              <div className="activity-list">
                {recentActivity.length > 0 ? (
                  recentActivity.slice(0, 3).map((activity, index) => (
                    <div key={activity.id || index} className="activity-item">
                      <div className="activity-dot" />
                      <div className="activity-content">
                        <p>{activity.text || activity.message}</p>
                        <span>{activity.time || activity.date}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="activity-empty">No recent activity</div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="profile-right">
            {/* Your Library */}
            <div className="profile-section">
              <h2 className="profile-section-title">
                <Gamepad2 size={18} />
                YOUR LIBRARY
              </h2>
              <div className="library-list">
                {gameLibrary.length > 0 ? (
                  gameLibrary.map(game => (
                    <div key={game.id} className="library-card">
                      <div className="library-card-header">
                        <div className="library-game-info">
                          <h3>{game.name}</h3>
                          {game.favorite && <Star size={16} className="favorite-icon" fill="currentColor" />}
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
                        <span>Last played: {game.lastPlayed}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="library-empty">No games in library</div>
                )}
              </div>
            </div>

            {/* Recent Achievements */}
            <div className="profile-section">
              <h2 className="profile-section-title">
                <Trophy size={18} />
                RECENT ACHIEVEMENTS
              </h2>
              <div className="achievements-list">
                {recentAchievements.length > 0 ? (
                  recentAchievements.slice(0, 3).map((achievement, index) => (
                    <div key={achievement.id || index} className="achievement-card">
                      <div className="achievement-icon">{achievement.icon || '🏆'}</div>
                      <div className="achievement-info">
                        <h3>{achievement.name}</h3>
                        <p>{achievement.date || achievement.time}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="achievements-empty">No achievements yet</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
