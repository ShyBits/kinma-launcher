import React from 'react';
import { Play, Download } from 'lucide-react';
import './Home.css';

const Home = () => {
  const newsItems = [
    {
      id: 1,
      type: 'UPDATE',
      time: '2 days ago',
      title: 'Pathline Update 1.0.0 Released',
      description: 'Experience the ultimate gaming adventure with new features and improvements.'
    },
    {
      id: 2,
      type: 'NEW FEATURE',
      time: '1 week ago',
      title: 'New Character: Shadow Walker',
      description: 'Meet the latest addition to the Pathline roster with unique abilities.'
    },
    {
      id: 3,
      type: 'COMMUNITY',
      time: '2 weeks ago',
      title: 'Community Tournament Results',
      description: 'Check out the winners of the latest Pathline tournament and upcoming events.'
    }
  ];

  const getBadgeColor = (type) => {
    switch (type) {
      case 'UPDATE': return 'var(--accent-primary)';
      case 'NEW FEATURE': return 'var(--accent-success)';
      case 'COMMUNITY': return 'var(--accent-tertiary)';
      default: return 'var(--text-muted)';
    }
  };

  return (
    <div className="home">
      <div className="hero-section">
        <div className="game-badge">PATHLINE</div>
        <h1 className="hero-title">Welcome to <span className="gradient-text">Pathline</span></h1>
        <p className="hero-description">Experience the ultimate gaming adventure with stunning visuals, immersive gameplay, and endless possibilities.</p>
        <div className="hero-actions">
          <button className="btn btn-primary">
            <Play size={20} /> Play Pathline
          </button>
          <button className="btn btn-secondary">
            <Download size={20} /> Check for Updates
          </button>
        </div>
      </div>

      <div className="news-section">
        <h2 className="section-title">Latest News</h2>
        <div className="news-list">
          {newsItems.map(news => (
            <div key={news.id} className="news-item">
              <div className="news-meta">
                <span className="news-badge" style={{ backgroundColor: getBadgeColor(news.type) }}>{news.type}</span>
                <span className="news-time">{news.time}</span>
              </div>
              <h3 className="news-title">{news.title}</h3>
              <p className="news-description">{news.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Home;