import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings as SettingsIcon, Monitor, Volume2, Wifi, Shield, Palette, Globe, Building } from 'lucide-react';
import './Settings.css';

const Settings = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState({
    // General Settings
    autoLaunch: false,
    minimizeToTray: true,
    closeToTray: true,
    notifications: true,
    soundEffects: true,
    
    // Display Settings
    theme: 'dark',
    fontSize: 'medium',
    language: 'en',
    resolution: '1920x1080',
    fullscreen: false,
    
    // Audio Settings
    masterVolume: 80,
    musicVolume: 60,
    sfxVolume: 70,
    voiceVolume: 50,
    muteWhenMinimized: false,
    
    // Network Settings
    autoUpdate: true,
    downloadRegion: 'auto',
    bandwidthLimit: 'unlimited',
    proxyEnabled: false,
    
    // Privacy Settings
    profileVisibility: 'friends',
    activityStatus: true,
    dataCollection: false,
    analytics: false
  });

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Load settings from localStorage or electron store
    const savedSettings = localStorage.getItem('launcherSettings');
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
      localStorage.setItem('launcherSettings', JSON.stringify(settings));
      // Also save to electron store if available
      if (window.electron?.saveSettings) {
        await window.electron.saveSettings(settings);
      }
      setTimeout(() => setIsSaving(false), 1000);
    } catch (error) {
      console.error('Failed to save settings:', error);
      setIsSaving(false);
    }
  };

  const resetSettings = () => {
    if (window.confirm('Are you sure you want to reset all settings to default?')) {
      setSettings({
        autoLaunch: false,
        minimizeToTray: true,
        closeToTray: true,
        notifications: true,
        soundEffects: true,
        theme: 'dark',
        fontSize: 'medium',
        language: 'en',
        resolution: '1920x1080',
        fullscreen: false,
        masterVolume: 80,
        musicVolume: 60,
        sfxVolume: 70,
        voiceVolume: 50,
        muteWhenMinimized: false,
        autoUpdate: true,
        downloadRegion: 'auto',
        bandwidthLimit: 'unlimited',
        proxyEnabled: false,
        profileVisibility: 'friends',
        activityStatus: true,
        dataCollection: false,
        analytics: false
      });
    }
  };

  const tabs = [
    { id: 'general', name: 'General', icon: SettingsIcon },
    { id: 'display', name: 'Display', icon: Monitor },
    { id: 'audio', name: 'Audio', icon: Volume2 },
    { id: 'network', name: 'Network', icon: Wifi },
    { id: 'privacy', name: 'Privacy', icon: Shield }
  ];

  const renderGeneralSettings = () => (
    <div className="settings-section">
      <h3>General</h3>
      <div className="setting-item">
        <div className="setting-info">
          <label>Auto-launch on startup</label>
          <p>Start the launcher when Windows starts</p>
        </div>
        <label className="toggle">
          <input
            type="checkbox"
            checked={settings.autoLaunch}
            onChange={(e) => handleSettingChange('autoLaunch', e.target.checked)}
          />
          <span className="slider"></span>
        </label>
      </div>

      <div className="setting-item">
        <div className="setting-info">
          <label>Minimize to system tray</label>
          <p>Keep the launcher running in the background</p>
        </div>
        <label className="toggle">
          <input
            type="checkbox"
            checked={settings.minimizeToTray}
            onChange={(e) => handleSettingChange('minimizeToTray', e.target.checked)}
          />
          <span className="slider"></span>
        </label>
      </div>

      <div className="setting-item">
        <div className="setting-info">
          <label>Close to system tray</label>
          <p>Don't exit when clicking the close button</p>
        </div>
        <label className="toggle">
          <input
            type="checkbox"
            checked={settings.closeToTray}
            onChange={(e) => handleSettingChange('closeToTray', e.target.checked)}
          />
          <span className="slider"></span>
        </label>
      </div>

      <div className="setting-item">
        <div className="setting-info">
          <label>Enable notifications</label>
          <p>Show desktop notifications for updates and messages</p>
        </div>
        <label className="toggle">
          <input
            type="checkbox"
            checked={settings.notifications}
            onChange={(e) => handleSettingChange('notifications', e.target.checked)}
          />
          <span className="slider"></span>
        </label>
      </div>

      <div className="setting-item">
        <div className="setting-info">
          <label>Sound effects</label>
          <p>Play sounds for button clicks and notifications</p>
        </div>
        <label className="toggle">
          <input
            type="checkbox"
            checked={settings.soundEffects}
            onChange={(e) => handleSettingChange('soundEffects', e.target.checked)}
          />
          <span className="slider"></span>
        </label>
      </div>
    </div>
  );

  const renderDisplaySettings = () => (
    <div className="settings-section">
      <h3>Display</h3>
      <div className="setting-item">
        <div className="setting-info">
          <label>Theme</label>
          <p>Choose your preferred color scheme</p>
        </div>
        <select
          value={settings.theme}
          onChange={(e) => handleSettingChange('theme', e.target.value)}
          className="setting-select"
        >
          <option value="dark">Dark</option>
          <option value="light">Light</option>
          <option value="auto">Auto</option>
        </select>
      </div>

      <div className="setting-item">
        <div className="setting-info">
          <label>Font size</label>
          <p>Adjust the text size for better readability</p>
        </div>
        <select
          value={settings.fontSize}
          onChange={(e) => handleSettingChange('fontSize', e.target.value)}
          className="setting-select"
        >
          <option value="small">Small</option>
          <option value="medium">Medium</option>
          <option value="large">Large</option>
        </select>
      </div>

      <div className="setting-item">
        <div className="setting-info">
          <label>Language</label>
          <p>Select your preferred language</p>
        </div>
        <select
          value={settings.language}
          onChange={(e) => handleSettingChange('language', e.target.value)}
          className="setting-select"
        >
          <option value="en">English</option>
          <option value="de">Deutsch</option>
          <option value="fr">Français</option>
          <option value="es">Español</option>
        </select>
      </div>

      <div className="setting-item">
        <div className="setting-info">
          <label>Resolution</label>
          <p>Set the launcher window resolution</p>
        </div>
        <select
          value={settings.resolution}
          onChange={(e) => handleSettingChange('resolution', e.target.value)}
          className="setting-select"
        >
          <option value="1280x720">1280x720</option>
          <option value="1366x768">1366x768</option>
          <option value="1920x1080">1920x1080</option>
          <option value="2560x1440">2560x1440</option>
        </select>
      </div>
    </div>
  );

  const renderAudioSettings = () => (
    <div className="settings-section">
      <h3>Audio</h3>
      <div className="setting-item">
        <div className="setting-info">
          <label>Master Volume</label>
          <p>{settings.masterVolume}%</p>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={settings.masterVolume}
          onChange={(e) => handleSettingChange('masterVolume', parseInt(e.target.value))}
          className="volume-slider"
        />
      </div>

      <div className="setting-item">
        <div className="setting-info">
          <label>Music Volume</label>
          <p>{settings.musicVolume}%</p>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={settings.musicVolume}
          onChange={(e) => handleSettingChange('musicVolume', parseInt(e.target.value))}
          className="volume-slider"
        />
      </div>

      <div className="setting-item">
        <div className="setting-info">
          <label>Sound Effects Volume</label>
          <p>{settings.sfxVolume}%</p>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={settings.sfxVolume}
          onChange={(e) => handleSettingChange('sfxVolume', parseInt(e.target.value))}
          className="volume-slider"
        />
      </div>

      <div className="setting-item">
        <div className="setting-info">
          <label>Voice Volume</label>
          <p>{settings.voiceVolume}%</p>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={settings.voiceVolume}
          onChange={(e) => handleSettingChange('voiceVolume', parseInt(e.target.value))}
          className="volume-slider"
        />
      </div>

      <div className="setting-item">
        <div className="setting-info">
          <label>Mute when minimized</label>
          <p>Automatically mute audio when launcher is minimized</p>
        </div>
        <label className="toggle">
          <input
            type="checkbox"
            checked={settings.muteWhenMinimized}
            onChange={(e) => handleSettingChange('muteWhenMinimized', e.target.checked)}
          />
          <span className="slider"></span>
        </label>
      </div>
    </div>
  );

  const renderNetworkSettings = () => (
    <div className="settings-section">
      <h3>Network</h3>
      <div className="setting-item">
        <div className="setting-info">
          <label>Auto-update games</label>
          <p>Automatically download and install game updates</p>
        </div>
        <label className="toggle">
          <input
            type="checkbox"
            checked={settings.autoUpdate}
            onChange={(e) => handleSettingChange('autoUpdate', e.target.checked)}
          />
          <span className="slider"></span>
        </label>
      </div>

      <div className="setting-item">
        <div className="setting-info">
          <label>Download Region</label>
          <p>Choose the server region for downloads</p>
        </div>
        <select
          value={settings.downloadRegion}
          onChange={(e) => handleSettingChange('downloadRegion', e.target.value)}
          className="setting-select"
        >
          <option value="auto">Auto (Recommended)</option>
          <option value="us-east">US East</option>
          <option value="us-west">US West</option>
          <option value="europe">Europe</option>
          <option value="asia">Asia</option>
        </select>
      </div>

      <div className="setting-item">
        <div className="setting-info">
          <label>Bandwidth Limit</label>
          <p>Limit download speed to avoid affecting other applications</p>
        </div>
        <select
          value={settings.bandwidthLimit}
          onChange={(e) => handleSettingChange('bandwidthLimit', e.target.value)}
          className="setting-select"
        >
          <option value="unlimited">Unlimited</option>
          <option value="1">1 MB/s</option>
          <option value="5">5 MB/s</option>
          <option value="10">10 MB/s</option>
          <option value="25">25 MB/s</option>
        </select>
      </div>

      <div className="setting-item">
        <div className="setting-info">
          <label>Use Proxy</label>
          <p>Configure proxy settings for network connections</p>
        </div>
        <label className="toggle">
          <input
            type="checkbox"
            checked={settings.proxyEnabled}
            onChange={(e) => handleSettingChange('proxyEnabled', e.target.checked)}
          />
          <span className="slider"></span>
        </label>
      </div>
    </div>
  );

  const renderPrivacySettings = () => (
    <div className="settings-section">
      <h3>Privacy</h3>
      <div className="setting-item">
        <div className="setting-info">
          <label>Profile Visibility</label>
          <p>Control who can see your profile and activity</p>
        </div>
        <select
          value={settings.profileVisibility}
          onChange={(e) => handleSettingChange('profileVisibility', e.target.value)}
          className="setting-select"
        >
          <option value="public">Public</option>
          <option value="friends">Friends Only</option>
          <option value="private">Private</option>
        </select>
      </div>

      <div className="setting-item">
        <div className="setting-info">
          <label>Show Activity Status</label>
          <p>Let friends see when you're online and what you're playing</p>
        </div>
        <label className="toggle">
          <input
            type="checkbox"
            checked={settings.activityStatus}
            onChange={(e) => handleSettingChange('activityStatus', e.target.checked)}
          />
          <span className="slider"></span>
        </label>
      </div>

      <div className="setting-item">
        <div className="setting-info">
          <label>Data Collection</label>
          <p>Allow collection of usage data to improve the launcher</p>
        </div>
        <label className="toggle">
          <input
            type="checkbox"
            checked={settings.dataCollection}
            onChange={(e) => handleSettingChange('dataCollection', e.target.checked)}
          />
          <span className="slider"></span>
        </label>
      </div>

      <div className="setting-item">
        <div className="setting-info">
          <label>Analytics</label>
          <p>Help improve the launcher by sharing anonymous usage statistics</p>
        </div>
        <label className="toggle">
          <input
            type="checkbox"
            checked={settings.analytics}
            onChange={(e) => handleSettingChange('analytics', e.target.checked)}
          />
          <span className="slider"></span>
        </label>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general': return renderGeneralSettings();
      case 'display': return renderDisplaySettings();
      case 'audio': return renderAudioSettings();
      case 'network': return renderNetworkSettings();
      case 'privacy': return renderPrivacySettings();
      default: return renderGeneralSettings();
    }
  };

  return (
    <div className="settings">
      <div className="settings-header">
        <h1>Settings</h1>
        <p>Configure your launcher preferences</p>
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
          
          {/* Game Studio toggle at bottom of sidebar */}
          <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <button 
              onClick={() => navigate('/game-studio')}
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
              <Building size={18} />
              Switch to Studio View
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

export default Settings;