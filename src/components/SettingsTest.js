// Simple Settings Test Component
import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Palette, Type } from 'lucide-react';

const SettingsTest = () => {
  const [testSetting, setTestSetting] = useState('test-value');
  const [status, setStatus] = useState('');
  const [currentTheme, setCurrentTheme] = useState('dark');
  const [currentFontSize, setCurrentFontSize] = useState('medium');

  const testSave = async () => {
    try {
      // Test localStorage
      localStorage.setItem('test-setting', testSetting);
      
      // Test Electron API if available
      if (window.electronAPI && window.electronAPI.saveSettings) {
        await window.electronAPI.saveSettings({ testSetting });
      }
      
      setStatus('success');
    } catch (error) {
      setStatus('error');
      console.error('Test save failed:', error);
    }
  };

  const testLoad = async () => {
    try {
      // Test localStorage
      const localValue = localStorage.getItem('test-setting');
      
      // Test Electron API if available
      let electronValue = null;
      if (window.electronAPI && window.electronAPI.getSettings) {
        const settings = await window.electronAPI.getSettings();
        electronValue = settings.testSetting;
      }
      
      console.log('LocalStorage value:', localValue);
      console.log('Electron value:', electronValue);
      
      setStatus('success');
    } catch (error) {
      setStatus('error');
      console.error('Test load failed:', error);
    }
  };

  const testTheme = () => {
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setCurrentTheme(newTheme);
    
    // Apply theme immediately
    document.body.setAttribute('data-theme', newTheme);
    
    if (newTheme === 'light') {
      document.body.style.background = 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)';
      document.body.style.color = '#212529';
    } else {
      document.body.style.background = 'linear-gradient(135deg, #1b2838 0%, #2a475e 100%)';
      document.body.style.color = '#c7d5e0';
    }
  };

  const testFontSize = () => {
    const sizes = ['small', 'medium', 'large', 'xlarge'];
    const currentIndex = sizes.indexOf(currentFontSize);
    const nextIndex = (currentIndex + 1) % sizes.length;
    const newSize = sizes[nextIndex];
    
    setCurrentFontSize(newSize);
    
    const sizeMap = {
      small: '12px',
      medium: '14px',
      large: '16px',
      xlarge: '18px'
    };
    
    document.documentElement.style.fontSize = sizeMap[newSize];
    document.body.style.fontSize = sizeMap[newSize];
  };

  return (
    <div style={{ 
      padding: '20px', 
      background: 'rgba(199, 213, 224, 0.05)', 
      borderRadius: '12px', 
      margin: '20px 0',
      border: '1px solid rgba(199, 213, 224, 0.1)'
    }}>
      <h3 style={{ marginBottom: '20px', color: 'white' }}>Settings Test & Live Demo</h3>
      
      {/* Theme Test */}
      <div style={{ marginBottom: '15px', padding: '15px', background: 'rgba(199, 213, 224, 0.05)', borderRadius: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
          <Palette size={20} />
          <strong>Theme Test:</strong>
          <span style={{ color: '#66c0f4' }}>Current: {currentTheme}</span>
        </div>
        <button 
          onClick={testTheme}
          style={{ 
            padding: '8px 16px', 
            background: 'linear-gradient(135deg, #66c0f4 0%, #4a9eff 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Toggle Theme (Dark ↔ Light)
        </button>
      </div>

      {/* Font Size Test */}
      <div style={{ marginBottom: '15px', padding: '15px', background: 'rgba(199, 213, 224, 0.05)', borderRadius: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
          <Type size={20} />
          <strong>Font Size Test:</strong>
          <span style={{ color: '#66c0f4' }}>Current: {currentFontSize}</span>
        </div>
        <button 
          onClick={testFontSize}
          style={{ 
            padding: '8px 16px', 
            background: 'linear-gradient(135deg, #66c0f4 0%, #4a9eff 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Cycle Font Size
        </button>
      </div>

      {/* Basic Settings Test */}
      <div style={{ marginBottom: '15px', padding: '15px', background: 'rgba(199, 213, 224, 0.05)', borderRadius: '8px' }}>
        <div style={{ marginBottom: '10px' }}>
          <strong>Basic Settings Test:</strong>
        </div>
        <div style={{ marginBottom: '10px' }}>
          <input 
            type="text" 
            value={testSetting} 
            onChange={(e) => setTestSetting(e.target.value)}
            style={{ 
              padding: '8px', 
              marginRight: '10px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(199, 213, 224, 0.3)',
              borderRadius: '4px',
              color: 'white'
            }}
            placeholder="Test setting value"
          />
          <button 
            onClick={testSave} 
            style={{ 
              padding: '8px 16px', 
              marginRight: '10px',
              background: 'linear-gradient(135deg, #66c0f4 0%, #4a9eff 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Test Save
          </button>
          <button 
            onClick={testLoad} 
            style={{ 
              padding: '8px 16px',
              background: 'rgba(199, 213, 224, 0.1)',
              color: 'white',
              border: '1px solid rgba(199, 213, 224, 0.3)',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Test Load
          </button>
        </div>
        {status === 'success' && (
          <div style={{ color: '#4ade80', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <CheckCircle size={16} />
            Test successful! Check console for details.
          </div>
        )}
        {status === 'error' && (
          <div style={{ color: '#f87171', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <AlertCircle size={16} />
            Test failed! Check console for details.
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsTest;
