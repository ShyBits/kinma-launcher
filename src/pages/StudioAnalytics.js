import React, { useState, useEffect } from 'react';
import { BarChart, TrendingUp, Users, DollarSign, Download } from 'lucide-react';
import { getCurrentUserId, getUserData } from '../utils/UserDataManager';
import './GameStudio.css';

const StudioAnalytics = ({ navigate }) => {
  const [timeFilter, setTimeFilter] = useState('1M');
  const [analyticsData, setAnalyticsData] = useState({
    totalRevenue: 0,
    monthlyRevenue: 0,
    totalDownloads: 0,
    activeUsers: 0,
    gamesCount: 0
  });

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
    const loadAnalyticsData = async () => {
      try {
        const userId = await getCurrentUserId();
        const customGames = await getUserData('customGames', []);
        
        const totalDownloads = customGames.reduce((sum, game) => sum + (game.downloads || 0), 0);
        const totalRevenue = customGames.reduce((sum, game) => sum + ((game.downloads || 0) * 2.5), 0);
        const monthlyRevenue = totalRevenue * 0.3;
        const activeUsers = customGames.reduce((sum, game) => sum + (parseInt(game.currentPlaying || game.playerCount || '0', 10) || 0), 0);
        
        setAnalyticsData({
          totalRevenue,
          monthlyRevenue,
          totalDownloads,
          activeUsers,
          gamesCount: customGames.length
        });
      } catch (error) {
        console.error('Error loading analytics data:', error);
      }
    };
    
    loadAnalyticsData();
    
    // Listen for game updates
    const handleCustomGameUpdate = () => {
      loadAnalyticsData();
    };
    
    const handleUserChange = () => {
      loadAnalyticsData();
    };
    
    window.addEventListener('customGameUpdate', handleCustomGameUpdate);
    window.addEventListener('user-changed', handleUserChange);
    
    return () => {
      window.removeEventListener('customGameUpdate', handleCustomGameUpdate);
      window.removeEventListener('user-changed', handleUserChange);
    };
  }, []);

  return (
    <div className="studio-page">
      <div className="studio-header">
        <div className="studio-header-content">
          <h1 className="studio-title">
            <BarChart size={24} />
            Analytics
          </h1>
          <p className="studio-subtitle">Track your game performance and revenue</p>
        </div>
      </div>
      
      <div className="studio-content">
        <div className="analytics-main-grid">
          <div className="analytics-primary-metrics">
            <div className="analytics-metric-large">
              <div className="analytics-metric-label">Total Revenue</div>
              <div className="analytics-metric-value-large">${analyticsData.totalRevenue.toFixed(2)}</div>
              {analyticsData.gamesCount > 0 && (
                <div className="analytics-metric-trend positive">
                  <TrendingUp size={14} />
                  <span>{analyticsData.gamesCount} {analyticsData.gamesCount === 1 ? 'game' : 'games'} published</span>
                </div>
              )}
            </div>
            
            <div className="analytics-metrics-row">
              <div className="analytics-metric-item">
                <div className="analytics-metric-icon">
                  <Download size={18} />
                </div>
                <div className="analytics-metric-content">
                  <div className="analytics-metric-label-small">Total Downloads</div>
                  <div className="analytics-metric-value-medium">{analyticsData.totalDownloads.toLocaleString()}</div>
                </div>
              </div>
              
              <div className="analytics-metric-item">
                <div className="analytics-metric-icon">
                  <Users size={18} />
                </div>
                <div className="analytics-metric-content">
                  <div className="analytics-metric-label-small">Active Users</div>
                  <div className="analytics-metric-value-medium">{analyticsData.activeUsers.toLocaleString()}</div>
                </div>
              </div>
              
              <div className="analytics-metric-item">
                <div className="analytics-metric-icon">
                  <DollarSign size={18} />
                </div>
                <div className="analytics-metric-content">
                  <div className="analytics-metric-label-small">Monthly Revenue</div>
                  <div className="analytics-metric-value-medium">${analyticsData.monthlyRevenue.toFixed(2)}</div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="analytics-chart-section">
            <div className="analytics-chart-header">
              <h2>Revenue Overview</h2>
              <div className="analytics-chart-controls">
                <button 
                  className={`analytics-time-filter ${timeFilter === '1M' ? 'active' : ''}`}
                  onClick={() => setTimeFilter('1M')}
                >
                  1M
                </button>
                <button 
                  className={`analytics-time-filter ${timeFilter === '3M' ? 'active' : ''}`}
                  onClick={() => setTimeFilter('3M')}
                >
                  3M
                </button>
                <button 
                  className={`analytics-time-filter ${timeFilter === '1Y' ? 'active' : ''}`}
                  onClick={() => setTimeFilter('1Y')}
                >
                  1Y
                </button>
              </div>
            </div>
            <div className="analytics-chart-container">
              <div className="analytics-chart-placeholder-minimal">
                <BarChart size={40} />
                <p>Revenue chart visualization</p>
              </div>
            </div>
          </div>
          
          <div className="analytics-games-section">
            <div className="analytics-games-header">
              <h2>Top Performing Games</h2>
              <span className="analytics-games-count">{analyticsData.gamesCount} games</span>
            </div>
            <div className="analytics-games-list">
              {analyticsData.gamesCount > 0 ? (
                <div className="analytics-games-placeholder">
                  <p>Game performance data will be displayed here</p>
                </div>
              ) : (
                <div className="analytics-empty-state">
                  <BarChart size={32} />
                  <p>No games published yet</p>
                  <button className="analytics-action-btn" onClick={() => navigate('/game-studio')}>
                    Create Your First Game
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudioAnalytics;

