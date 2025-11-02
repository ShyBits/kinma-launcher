import React, { useEffect, useMemo, useState } from 'react';
import './Settings.css';

const steps = [
  { id: 'profile', title: 'Profile details' },
  { id: 'verification', title: 'Developer verification' },
  { id: 'payouts', title: 'Payout setup' },
  { id: 'terms', title: 'Accept terms' }
];

const DeveloperOnboarding = ({ navigate }) => {
  const [progress, setProgress] = useState(() => {
    try { return JSON.parse(localStorage.getItem('developerOnboarding') || '{}'); } catch (_) { return {}; }
  });

  const currentStepIndex = useMemo(() => {
    for (let i = 0; i < steps.length; i++) {
      const s = steps[i];
      if (!progress[s.id]?.done) return i;
    }
    return steps.length;
  }, [progress]);

  const markStepDone = (stepId, data = {}) => {
    const next = { ...progress, [stepId]: { done: true, data } };
    setProgress(next);
    try { localStorage.setItem('developerOnboarding', JSON.stringify(next)); } catch (_) {}
    const allDone = steps.every(s => next[s.id]?.done);
    if (allDone) {
      try { localStorage.setItem('developerIntent', 'complete'); } catch (_) {}
    }
  };

  useEffect(() => {
    // Ensure intent flag exists if user came directly
    const intent = localStorage.getItem('developerIntent');
    if (!intent || intent === 'none') {
      try { localStorage.setItem('developerIntent', 'pending'); } catch (_) {}
    }
  }, []);

  const StepContent = () => {
    if (currentStepIndex >= steps.length) {
      return (
        <div className="settings-section">
          <h3>You're all set</h3>
          <p>Your developer account is ready. You can now switch to Studio view.</p>
          <div className="settings-actions" style={{ justifyContent: 'flex-start' }}>
            <button className="save-btn" onClick={() => navigate('/game-studio')}>Open Studio</button>
          </div>
        </div>
      );
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


