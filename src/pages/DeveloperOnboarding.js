import React, { useEffect, useMemo, useState } from 'react';
import { getUserData, saveUserData, getCurrentUserId } from '../utils/UserDataManager';
import './Settings.css';

const steps = [
  { id: 'profile', title: 'Profile details' },
  { id: 'verification', title: 'Developer verification' },
  { id: 'payouts', title: 'Payout setup' },
  { id: 'terms', title: 'Accept terms' }
];

const DeveloperOnboarding = ({ navigate }) => {
  const [progress, setProgress] = useState(() => {
    try { 
      // Load user-specific onboarding progress
      return getUserData('developerOnboarding', {}); 
    } catch (_) { 
      return {}; 
    }
  });

  const currentStepIndex = useMemo(() => {
    for (let i = 0; i < steps.length; i++) {
      const s = steps[i];
      if (!progress[s.id]?.done) return i;
    }
    return steps.length;
  }, [progress]);

  const markStepDone = async (stepId, data = {}) => {
    const next = { ...progress, [stepId]: { done: true, data } };
    setProgress(next);
    // Save to user-specific storage
    saveUserData('developerOnboarding', next);
    
    const allDone = steps.every(s => next[s.id]?.done);
    if (allDone) {
      // Set status to pending - waiting for admin approval
      const userId = getCurrentUserId();
      if (userId) {
        // Save pending status instead of granting access immediately
        saveUserData('developerAccessStatus', 'pending', userId);
        saveUserData('developerAccess', false); // Not granted yet
        saveUserData('gameStudioAccess', false); // Not granted yet
        
        // Add to pending requests list for admin review
        try {
          const pendingRequests = JSON.parse(localStorage.getItem('developerAccessRequests') || '[]');
          const existingIndex = pendingRequests.findIndex(r => r.userId === userId);
          
          // Get user info
          const api = window.electronAPI;
          let userInfo = { id: userId, name: 'Unknown', email: '' };
          if (api?.getUsers) {
            const result = await api.getUsers();
            if (result?.success && result?.users) {
              const user = result.users.find(u => u.id === userId);
              if (user) {
                userInfo = {
                  id: user.id,
                  name: user.name || user.username || 'Unknown',
                  email: user.email || ''
                };
              }
            }
          }
          
          const request = {
            userId: userId,
            userName: userInfo.name,
            userEmail: userInfo.email,
            requestedAt: new Date().toISOString(),
            status: 'pending',
            onboardingData: next
          };
          
          if (existingIndex >= 0) {
            pendingRequests[existingIndex] = request;
          } else {
            pendingRequests.push(request);
          }
          
          localStorage.setItem('developerAccessRequests', JSON.stringify(pendingRequests));
        } catch (_) {}
      }
      
      // Trigger user-changed event to update UI
      window.dispatchEvent(new CustomEvent('user-changed'));
    }
  };

  useEffect(() => {
    // Load user-specific onboarding progress on mount
    const userProgress = getUserData('developerOnboarding', {});
    setProgress(userProgress);
    
    // Check if user has developer access already
    const hasAccess = getUserData('developerAccess', false);
    if (hasAccess && steps.every(s => userProgress[s.id]?.done)) {
      // User already has access, onboarding is complete
      return;
    }
  }, []);

  const StepContent = () => {
    if (currentStepIndex >= steps.length) {
      // Check if access is pending or granted
      const userId = getCurrentUserId();
      const accessStatus = userId ? getUserData('developerAccessStatus', null, userId) : null;
      const hasAccess = userId ? getUserData('developerAccess', false, userId) : false;
      
      if (hasAccess) {
        // Access granted
        return (
          <div className="settings-section">
            <h3>You're all set</h3>
            <p>Your developer account has been approved. You can now switch to Studio view.</p>
            <div className="settings-actions" style={{ justifyContent: 'flex-start' }}>
              <button className="save-btn" onClick={() => navigate('/game-studio')}>Open Studio</button>
            </div>
          </div>
        );
      } else if (accessStatus === 'pending') {
        // Waiting for approval
        return (
          <div className="settings-section">
            <h3>Request Submitted</h3>
            <p>Your developer access request has been submitted and is pending admin approval. You will be notified once your request is reviewed.</p>
            <div className="settings-actions" style={{ justifyContent: 'flex-start' }}>
              <button className="save-btn" onClick={() => navigate('/library')}>Return to Library</button>
            </div>
          </div>
        );
      } else {
        // Just completed
        return (
          <div className="settings-section">
            <h3>Request Submitted</h3>
            <p>Your developer access request has been submitted and is pending admin approval. You will be notified once your request is reviewed.</p>
            <div className="settings-actions" style={{ justifyContent: 'flex-start' }}>
              <button className="save-btn" onClick={() => navigate('/library')}>Return to Library</button>
            </div>
          </div>
        );
      }
    }

    const step = steps[currentStepIndex];
    return (
      <div className="settings-section">
        <h3>{step.title}</h3>
        <p>Provide the required information to continue.</p>
        <div className="settings-actions" style={{ justifyContent: 'flex-start' }}>
          <button className="save-btn" onClick={() => markStepDone(step.id)}>Mark as Done</button>
        </div>
      </div>
    );
  };

  return (
    <div className="settings">
      <div className="settings-header">
        <h1>Developer Onboarding</h1>
        <p>Complete these steps to start publishing games</p>
      </div>
      <div className="settings-content">
        <div className="settings-sidebar">
          {steps.map((s, idx) => (
            <button key={s.id} className={`settings-tab ${idx === currentStepIndex ? 'active' : ''}`}>
              {progress[s.id]?.done ? '✓ ' : ''}{s.title}
            </button>
          ))}
        </div>
        <div className="settings-main">
          <StepContent />
        </div>
      </div>
    </div>
  );
};

export default DeveloperOnboarding;


