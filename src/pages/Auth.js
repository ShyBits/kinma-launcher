import React, { useEffect, useState } from 'react';
import AuthModal from '../components/AuthModal';

// Function to clear all users (can be called from console: window.clearAllUsers())
const clearAllUsers = async () => {
  try {
    console.log('🗑️ Starting to clear all users...');
    
    // Clear from file system first
    const api = window.electronAPI;
    if (api && api.clearAllUsers) {
      const result = await api.clearAllUsers();
      console.log('File system clear result:', result);
    } else {
      console.warn('Electron API not available');
    }
    
    // Clear from localStorage - remove all user-related keys
    try {
      localStorage.removeItem('users');
      localStorage.removeItem('authUser');
      localStorage.removeItem('developerIntent');
      
      // Also check and remove any other user-related keys
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.toLowerCase().includes('user') || key.toLowerCase().includes('auth'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => {
        try {
          localStorage.removeItem(key);
          console.log('Removed localStorage key:', key);
        } catch (e) {
          console.warn('Could not remove key:', key, e);
        }
      });
      
      console.log('✅ All users cleared from localStorage');
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
    
    // Verify that users are actually cleared
    if (api && api.getUsers) {
      const verifyResult = await api.getUsers();
      console.log('Verification - Users remaining:', verifyResult?.users?.length || 0);
      
      if (verifyResult?.users?.length > 0) {
        console.warn('⚠️ Warning: Some users still exist after clearing!', verifyResult.users);
      }
    }
    
    console.log('✅ All users cleared successfully');
    alert('All users have been cleared from file system and cache!\n\nPlease refresh the page.');
    
    // Reload the page to ensure fresh state
    window.location.reload();
  } catch (error) {
    console.error('Error clearing all users:', error);
    alert('Error clearing users: ' + error.message);
  }
};

// Expose function globally for easy access
if (typeof window !== 'undefined') {
  window.clearAllUsers = clearAllUsers;
}

const Auth = ({ navigate }) => {
  const [ready, setReady] = useState(false);
  const [windowHeight, setWindowHeight] = useState(900); // Default height for better spacing
  
  useEffect(() => {
    const init = async () => {
      const api = window.electronAPI || window.electron;
      let forceAuth = false;
      try { forceAuth = await api?.isForceAuth?.(); } catch (_) {}
      try {
        const saved = await api?.getAuthUser?.();
        if (saved && !forceAuth) {
          navigate('/library');
          return;
        }
      } catch (_) {}
      // Resize window for auth modal and center (start with minimal height)
      try {
        api?.resizeWindow && api.resizeWindow(600, windowHeight);
        api?.centerWindow && api.centerWindow();
      } catch (_) {}
      setReady(true);
    };
    init();
  }, [navigate, windowHeight]);

  // Update window height when modal height changes
  const handleHeightChange = (newHeight) => {
    setWindowHeight(newHeight);
    const api = window.electronAPI || window.electron;
    try {
      api?.resizeWindow && api.resizeWindow(600, newHeight);
    } catch (_) {}
  };

  if (!ready) return null;
  return (
    <AuthModal
      isOpen={true}
      onClose={() => navigate('/library')}
      onAuthenticated={({ user, developerChosen }) => {
        const api = window.electronAPI;
        try {
          api?.setAuthUser && api.setAuthUser(user);
        } catch (_) {}
        try {
          api?.authSuccess && api.authSuccess(user);
        } catch (_) {}
        if (developerChosen) navigate('/developer-onboarding');
        else navigate('/library');
      }}
      fullscreen
      variant="page"
      onHeightChange={handleHeightChange}
    />
  );
};

export default Auth;


