import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings as SettingsIcon, DollarSign, Users, Globe, Shield, Mail, Bell, LogOut } from 'lucide-react';
import './Settings.css';

const GameStudioSettings = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('studio');
  const [settings, setSettings] = useState({
    // Studio Settings
    autoPublish: false,
    notifyNewGames: true,
    publicProfile: true,
    showRevenue: true,
    
    // Payments
    paymentMethod: 'paypal',
    payoutFrequency: 'monthly',
    minimumPayout: 50,
    taxInfo: '',
    
    // Notifications
    emailNotifications: true,
    newReviewNotification: true,
    downloadMilestoneNotification: true,
    earningsNotification: false,
    
    // Profile
    studioName: 'My Studio',
    studioDescription: '',
    website: '',
    contactEmail: '',
    
    // Privacy
    analyticsOptOut: false,
    dataSharing: true
  });

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const savedSettings = localStorage.getItem('gameStudioSettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      localStorage.setItem('gameStudioSettings', JSON.stringify(settings));
      setTimeout(() => setIsSaving(false), 1000);
    } catch (error) {
      console.error('Failed to save settings:', error);
      setIsSaving(false);
    }
  };

  const resetSettings = () => {
    if (window.confirm('Are you sure you want to reset all settings to default?')) {
      setSettings({
        autoPublish: false,
        notifyNewGames: true,
        publicProfile: true,
        showRevenue: true,
        paymentMethod: 'paypal',
        payoutFrequency: 'monthly',
        minimumPayout: 50,
        taxInfo: '',
        emailNotifications: true,
        newReviewNotification: true,
        downloadMilestoneNotification: true,
        earningsNotification: false,
        studioName: 'My Studio',
        studioDescription: '',
        website: '',
        contactEmail: '',
        analyticsOptOut: false,
        dataSharing: true
      });
    }
  };

  const tabs = [
    { id: 'studio', name: 'Studio', icon: SettingsIcon },
    { id: 'payments', name: 'Payments', icon: DollarSign },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'profile', name: 'Profile', icon: Users },
    { id: 'privacy', name: 'Privacy', icon: Shield }
  ];

  const renderStudioSettings = () => (
    <div className="settings-section">
      <h3>Studio Preferences</h3>
      <div className="setting-item">
        <div className="setting-info">
          <label>Auto-publish updates</label>
          <p>Automatically publish game updates without manual approval</p>
        </div>
        <label className="toggle">
          <input
            type="checkbox"
            checked={settings.autoPublish}
            onChange={(e) => handleSettingChange('autoPublish', e.target.checked)}
          />
          <span className="slider"></span>
        </label>
      </div>

      <div className="setting-item">
        <div className="setting-info">
          <label>Notify on new games</label>
          <p>Get notified when your games are approved and published</p>
        </div>
        <label className="toggle">
          <input
            type="checkbox"
            checked={settings.notifyNewGames}
            onChange={(e) => handleSettingChange('notifyNewGames', e.target.checked)}
          />
          <span className="slider"></span>
        </label>
      </div>

      <div className="setting-item">
        <div className="setting-info">
          <label>Public profile</label>
          <p>Make your studio profile visible to other users</p>
        </div>
        <label className="toggle">
          <input
            type="checkbox"
            checked={settings.publicProfile}
            onChange={(e) => handleSettingChange('publicProfile', e.target.checked)}
          />
          <span className="slider"></span>
        </label>
      </div>

      <div className="setting-item">
        <div className="setting-info">
          <label>Show revenue publicly</label>
          <p>Display earnings on your public studio profile</p>
        </div>
        <label className="toggle">
          <input
            type="checkbox"
            checked={settings.showRevenue}
            onChange={(e) => handleSettingChange('showRevenue', e.target.checked)}
          />
          <span className="slider"></span>
        </label>
      </div>
    </div>
  );

  const renderPaymentsSettings = () => (
    <div className="settings-section">
      <h3>Payment Settings</h3>
      <div className="setting-item">
        <div className="setting-info">
          <label>Payment Method</label>
          <p>Choose how you want to receive earnings</p>
        </div>
        <select
          value={settings.paymentMethod}
          onChange={(e) => handleSettingChange('paymentMethod', e.target.value)}
          className="setting-select"
        >
          <option value="paypal">PayPal</option>
          <option value="bank">Bank Transfer</option>
          <option value="crypto">Cryptocurrency</option>
        </select>
      </div>

      <div className="setting-item">
        <div className="setting-info">
          <label>Payout Frequency</label>
          <p>How often you want to receive payments</p>
        </div>
        <select
          value={settings.payoutFrequency}
          onChange={(e) => handleSettingChange('payoutFrequency', e.target.value)}
          className="setting-select"
        >
          <option value="weekly">Weekly</option>
          <option value="biweekly">Bi-weekly</option>
          <option value="monthly">Monthly</option>
          <option value="quarterly">Quarterly</option>
        </select>
      </div>

      <div className="setting-item">
        <div className="setting-info">
          <label>Minimum Payout</label>
          <p>Minimum amount required for payout</p>
        </div>
        <select
          value={settings.minimumPayout}
          onChange={(e) => handleSettingChange('minimumPayout', parseInt(e.target.value))}
          className="setting-select"
        >
          <option value={25}>$25</option>
          <option value={50}>$50</option>
          <option value={100}>$100</option>
          <option value={250}>$250</option>
        </select>
      </div>
    </div>
  );

  const renderNotificationsSettings = () => (
    <div className="settings-section">
      <h3>Notification Preferences</h3>
      <div className="setting-item">
        <div className="setting-info">
          <label>Email notifications</label>
          <p>Receive email updates about your games</p>
        </div>
        <label className="toggle">
          <input
            type="checkbox"
            checked={settings.emailNotifications}
            onChange={(e) => handleSettingChange('emailNotifications', e.target.checked)}
          />
          <span className="slider"></span>
        </label>
      </div>

      <div className="setting-item">
        <div className="setting-info">
          <label>New review notification</label>
          <p>Get notified when users post reviews on your games</p>
        </div>
        <label className="toggle">
          <input
            type="checkbox"
            checked={settings.newReviewNotification}
            onChange={(e) => handleSettingChange('newReviewNotification', e.target.checked)}
          />
          <span className="slider"></span>
        </label>
      </div>

      <div className="setting-item">
        <div className="setting-info">
          <label>Download milestones</label>
          <p>Notify when your games reach download milestones</p>
        </div>
        <label className="toggle">
          <input
            type="checkbox"
            checked={settings.downloadMilestoneNotification}
            onChange={(e) => handleSettingChange('downloadMilestoneNotification', e.target.checked)}
          />
          <span className="slider"></span>
        </label>
      </div>

      <div className="setting-item">
        <div className="setting-info">
          <label>Earnings updates</label>
          <p>Get notified about earnings and payout updates</p>
        </div>
        <label className="toggle">
          <input
            type="checkbox"
            checked={settings.earningsNotification}
            onChange={(e) => handleSettingChange('earningsNotification', e.target.checked)}
          />
          <span className="slider"></span>
        </label>
      </div>
    </div>
  );

  const renderProfileSettings = () => (
    <div className="settings-section">
      <h3>Studio Profile</h3>
      <div className="setting-item">
        <div className="setting-info">
          <label>Studio Name</label>
          <p>Display name for your game studio</p>
        </div>
        <input
          type="text"
          value={settings.studioName}
          onChange={(e) => handleSettingChange('studioName', e.target.value)}
          className="setting-input"
          style={{ minWidth: '200px' }}
        />
      </div>

      <div className="setting-item">
        <div className="setting-info">
          <label>Website</label>
          <p>Your official studio website URL</p>
        </div>
        <input
          type="url"
          value={settings.website}
          onChange={(e) => handleSettingChange('website', e.target.value)}
          className="setting-input"
          placeholder="https://example.com"
          style={{ minWidth: '200px' }}
        />
      </div>

      <div className="setting-item">
        <div className="setting-info">
          <label>Contact Email</label>
          <p>Email address for business inquiries</p>
        </div>
        <input
          type="email"
          value={settings.contactEmail}
          onChange={(e) => handleSettingChange('contactEmail', e.target.value)}
          className="setting-input"
          placeholder="contact@example.com"
          style={{ minWidth: '200px' }}
        />
      </div>

      <div className="setting-item" style={{ alignItems: 'flex-start' }}>
        <div className="setting-info" style={{ flex: 1 }}>
          <label>Studio Description</label>
          <p>Tell users about your studio and your games</p>
        </div>
        <textarea
          value={settings.studioDescription}
          onChange={(e) => handleSettingChange('studioDescription', e.target.value)}
          className="setting-textarea"
          placeholder="Describe your studio..."
          rows={4}
        />
      </div>
    </div>
  );

  const renderPrivacySettings = () => (
    <div className="settings-section">
      <h3>Privacy & Data</h3>
      <div className="setting-item">
        <div className="setting-info">
          <label>Opt out of analytics</label>
          <p>Stop sharing usage analytics to help improve the platform</p>
        </div>
        <label className="toggle">
          <input
            type="checkbox"
            checked={settings.analyticsOptOut}
            onChange={(e) => handleSettingChange('analyticsOptOut', e.target.checked)}
          />
          <span className="slider"></span>
        </label>
      </div>

      <div className="setting-item">
        <div className="setting-info">
          <label>Data sharing</label>
          <p>Allow anonymized data to be used for improving game recommendations</p>
        </div>
        <label className="toggle">
          <input
            type="checkbox"
            checked={settings.dataSharing}
            onChange={(e) => handleSettingChange('dataSharing', e.target.checked)}
          />
          <span className="slider"></span>
        </label>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'studio': return renderStudioSettings();
      case 'payments': return renderPaymentsSettings();
      case 'notifications': return renderNotificationsSettings();
      case 'profile': return renderProfileSettings();
      case 'privacy': return renderPrivacySettings();
      default: return renderStudioSettings();
    }
  };

  const handleBackToStudio = () => {
    navigate('/game-studio');
  };

  const handleSwitchToNormalView = () => {
    navigate('/library');
  };

  return (
    <div className="settings">
      <div className="settings-header">
        <h1>Game Studio Settings</h1>
        <p>Configure your game development studio preferences</p>
      </div>

      <div className="settings-content">
        <div className="settings-sidebar">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                className={`settings-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={18} />
                {tab.name}
              </button>
            );
          })}
          
          {/* Navigation toggle at bottom of sidebar */}
          <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <button 
              onClick={handleSwitchToNormalView}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                width: '100%',
                padding: '12px 16px',
                background: 'rgba(0, 212, 255, 0.1)',
                border: '1px solid var(--accent-primary)',
                borderRadius: '8px',
                color: 'var(--accent-primary)',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 600,
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(0, 212, 255, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(0, 212, 255, 0.1)';
              }}
            >
              <LogOut size={18} />
              Switch to Player View
            </button>
          </div>
        </div>

        <div className="settings-main">
          {renderTabContent()}
          
          <div className="settings-actions">
            <button 
              className="reset-btn"
              onClick={resetSettings}
            >
              Reset to Default
            </button>
            <button 
              className={`save-btn ${isSaving ? 'saving' : ''}`}
              onClick={saveSettings}
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameStudioSettings;

