// Settings Manager for persistent settings
class SettingsManager {
  constructor() {
    this.defaultSettings = {
      // Appearance
      theme: 'dark',
      language: 'en',
      fontSize: 'medium',
      
      // Application
      autoLaunch: false,
      minimizeToTray: true,
      startMinimized: false,
      closeToTray: true,
      
      // Gaming
      autoUpdateGames: true,
      showGameNotifications: true,
      recordPlayTime: true,
      
      // Privacy
      profileVisibility: 'public',
      gameActivity: 'friends',
      onlineStatus: 'public',
      inventory: 'private',
      
      // Storage
      dataPath: '',
      cacheSize: 0,
      maxCacheSize: 1024, // MB
      
      // Advanced
      hardwareAcceleration: true,
      enableLogging: false,
      logLevel: 'info',
      developerMode: false
    };
    
    this.settings = { ...this.defaultSettings };
    this.loadSettings();
  }

  async loadSettings() {
    try {
      if (window.electronAPI && window.electronAPI.getSettings) {
        const savedSettings = await window.electronAPI.getSettings();
        this.settings = { ...this.defaultSettings, ...savedSettings };
      } else {
        // Fallback to localStorage for web version
        const savedSettings = localStorage.getItem('pathline-settings');
        if (savedSettings) {
          this.settings = { ...this.defaultSettings, ...JSON.parse(savedSettings) };
        }
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  async saveSettings() {
    try {
      if (window.electronAPI && window.electronAPI.saveSettings) {
        await window.electronAPI.saveSettings(this.settings);
      } else {
        // Fallback to localStorage for web version
        localStorage.setItem('pathline-settings', JSON.stringify(this.settings));
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }

  get(key) {
    return this.settings[key];
  }

  async set(key, value) {
    this.settings[key] = value;
    await this.saveSettings();
    
    // Apply setting immediately
    this.applySetting(key, value);
  }

  applySetting(key, value) {
    switch (key) {
      case 'theme':
        this.applyTheme(value);
        break;
      case 'language':
        this.applyLanguage(value);
        break;
      case 'fontSize':
        this.applyFontSize(value);
        break;
      case 'autoLaunch':
        this.applyAutoLaunch(value);
        break;
      case 'minimizeToTray':
        this.applyMinimizeToTray(value);
        break;
      case 'hardwareAcceleration':
        this.applyHardwareAcceleration(value);
        break;
    }
  }

  applyTheme(theme) {
    document.body.setAttribute('data-theme', theme);
    
    // Update CSS variables
    const root = document.documentElement;
    if (theme === 'light') {
      root.style.setProperty('--bg-primary', '#ffffff');
      root.style.setProperty('--bg-secondary', '#f8f9fa');
      root.style.setProperty('--text-primary', '#212529');
      root.style.setProperty('--text-secondary', '#6c757d');
    } else {
      root.style.setProperty('--bg-primary', '#1b2838');
      root.style.setProperty('--bg-secondary', '#2a475e');
      root.style.setProperty('--text-primary', '#c7d5e0');
      root.style.setProperty('--text-secondary', 'rgba(199, 213, 224, 0.6)');
    }
  }

  applyLanguage(language) {
    // This would integrate with i18n system
    console.log('Language changed to:', language);
  }

  applyFontSize(size) {
    const sizes = {
      small: '12px',
      medium: '14px',
      large: '16px',
      xlarge: '18px'
    };
    document.documentElement.style.fontSize = sizes[size] || sizes.medium;
  }

  applyAutoLaunch(enabled) {
    if (window.electronAPI && window.electronAPI.setAutoLaunch) {
      window.electronAPI.setAutoLaunch(enabled);
    }
  }

  applyMinimizeToTray(enabled) {
    if (window.electronAPI && window.electronAPI.setMinimizeToTray) {
      window.electronAPI.setMinimizeToTray(enabled);
    }
  }

  applyHardwareAcceleration(enabled) {
    if (window.electronAPI && window.electronAPI.setHardwareAcceleration) {
      window.electronAPI.setHardwareAcceleration(enabled);
    }
  }

  resetToDefaults() {
    this.settings = { ...this.defaultSettings };
    this.saveSettings();
    
    // Apply all default settings
    Object.keys(this.defaultSettings).forEach(key => {
      this.applySetting(key, this.defaultSettings[key]);
    });
  }

  exportSettings() {
    return JSON.stringify(this.settings, null, 2);
  }

  importSettings(settingsJson) {
    try {
      const importedSettings = JSON.parse(settingsJson);
      this.settings = { ...this.defaultSettings, ...importedSettings };
      this.saveSettings();
      
      // Apply all imported settings
      Object.keys(importedSettings).forEach(key => {
        this.applySetting(key, importedSettings[key]);
      });
      
      return true;
    } catch (error) {
      console.error('Failed to import settings:', error);
      return false;
    }
  }
}

// Create global settings manager instance
window.settingsManager = new SettingsManager();

export default SettingsManager;
