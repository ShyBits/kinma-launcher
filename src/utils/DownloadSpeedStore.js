// Simple global store for per-game download speeds (in MB/s) and progress
// Provides setSpeed/getSpeed and subscribe(gameId, cb) -> unsubscribe

const gameIdToSpeed = new Map();
const gameIdToProgress = new Map();
const gameIdToSubscribers = new Map();
const gameIdToPaused = new Map();
const gameIdToIntervals = new Map(); // Track active download intervals

export function setSpeed(gameId, speedMbPerSec, progress = null) {
  gameIdToSpeed.set(gameId, typeof speedMbPerSec === 'number' ? speedMbPerSec : 0);
  if (progress !== null) {
    gameIdToProgress.set(gameId, progress);
  }
  const subs = gameIdToSubscribers.get(gameId);
  if (subs) {
    subs.forEach((cb) => {
      try {
        cb({ 
          speed: gameIdToSpeed.get(gameId) || 0, 
          progress: gameIdToProgress.get(gameId) || 0,
          isPaused: gameIdToPaused.get(gameId) || false
        });
      } catch (_) {
        // ignore subscriber errors
      }
    });
  }
}

export function clearSpeed(gameId) {
  stopDownload(gameId); // Stop any running interval
  gameIdToSpeed.delete(gameId);
  gameIdToProgress.delete(gameId);
  gameIdToPaused.delete(gameId);
  const subs = gameIdToSubscribers.get(gameId);
  if (subs) {
    subs.forEach((cb) => {
      try {
        cb({ speed: 0, progress: 0, isPaused: false });
      } catch (_) {}
    });
  }
}

export function getSpeed(gameId) {
  return gameIdToSpeed.get(gameId) || 0;
}

export function getProgress(gameId) {
  return gameIdToProgress.get(gameId) || 0;
}

export function setPaused(gameId, isPaused) {
  gameIdToPaused.set(gameId, isPaused);
  const subs = gameIdToSubscribers.get(gameId);
  if (subs) {
    subs.forEach((cb) => {
      try {
        cb({ 
          speed: gameIdToSpeed.get(gameId) || 0, 
          progress: gameIdToProgress.get(gameId) || 0,
          isPaused: isPaused
        });
      } catch (_) {}
    });
  }
}

export function getPaused(gameId) {
  return gameIdToPaused.get(gameId) || false;
}

export function subscribe(gameId, callback) {
  if (!gameIdToSubscribers.has(gameId)) {
    gameIdToSubscribers.set(gameId, new Set());
  }
  const set = gameIdToSubscribers.get(gameId);
  set.add(callback);

  // Immediately emit current value
  callback({ 
    speed: getSpeed(gameId), 
    progress: getProgress(gameId),
    isPaused: getPaused(gameId)
  });

  return () => {
    const subs = gameIdToSubscribers.get(gameId);
    if (subs) {
      subs.delete(callback);
      if (subs.size === 0) gameIdToSubscribers.delete(gameId);
    }
  };
}

export function startDownload(gameId, resetProgress = false) {
  // Clear any existing interval for this game
  if (gameIdToIntervals.has(gameId)) {
    clearInterval(gameIdToIntervals.get(gameId));
  }
  
  // Reset progress to 0 if starting fresh download
  if (resetProgress) {
    gameIdToProgress.set(gameId, 0);
  } else if (!gameIdToProgress.has(gameId)) {
    // No existing progress, start from 0
    gameIdToProgress.set(gameId, 0);
  }
  gameIdToPaused.set(gameId, false);
  
  // Start a new interval that updates progress
  const interval = setInterval(() => {
    // Check if paused: keep speed at 0 and do not advance
    if (getPaused(gameId)) {
      setSpeed(gameId, 0, getProgress(gameId));
      return;
    }
    
    const currentProgress = getProgress(gameId);
    
    if (currentProgress >= 100) {
      // Download complete
      clearInterval(gameIdToIntervals.get(gameId));
      gameIdToIntervals.delete(gameId);
      setSpeed(gameId, 0, 100);
      // Clear after a moment
      setTimeout(() => clearSpeed(gameId), 1200);
      return;
    }
    
    // Simulate download - increment progress
    const speed = (Math.random() * 0.5 + 0.3).toFixed(2);
    const newProgress = Math.min(currentProgress + 0.5, 100);
    setSpeed(gameId, parseFloat(speed), newProgress);
  }, 100);
  
  gameIdToIntervals.set(gameId, interval);
}

export function stopDownload(gameId) {
  if (gameIdToIntervals.has(gameId)) {
    clearInterval(gameIdToIntervals.get(gameId));
    gameIdToIntervals.delete(gameId);
  }
}


