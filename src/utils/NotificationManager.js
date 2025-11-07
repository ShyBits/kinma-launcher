/**
 * Shared Notification Manager
 * Provides a centralized way to manage notifications across components
 */

const NOTIFICATION_STORAGE_KEY = 'kinmaNotifications';
const NOTIFICATION_CHANGE_EVENT = 'kinmaNotificationsChanged';

/**
 * Load notifications from localStorage
 */
export const loadNotifications = () => {
  const saved = localStorage.getItem(NOTIFICATION_STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (error) {
      console.error('Error loading notifications:', error);
      return [];
    }
  }
  return [];
};

/**
 * Save notifications to localStorage and dispatch change event
 */
export const saveNotifications = (notifications) => {
  try {
    // Clean up notifications for storage (remove React components, keep only serializable data)
    const toSave = notifications.map(({ iconType, preview, ...rest }) => {
      const savedPreview = preview ? {
        ...preview,
        // Remove icon component if it exists (it's a function/component)
        iconType: preview.iconType || null
      } : null;
      return {
        ...rest,
        iconType: iconType || rest.type || 'info',
        preview: savedPreview
      };
    });
    localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(toSave));
    
    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent(NOTIFICATION_CHANGE_EVENT, {
      detail: { notifications: toSave }
    }));
    
    return true;
  } catch (error) {
    console.error('Error saving notifications:', error);
    return false;
  }
};

/**
 * Mark a notification as read
 */
export const markNotificationAsRead = (id, currentNotifications) => {
  const updated = currentNotifications.map(notification => 
    notification.id === id 
      ? { ...notification, read: true }
      : notification
  );
  saveNotifications(updated);
  return updated;
};

/**
 * Mark all notifications as read
 */
export const markAllNotificationsAsRead = (currentNotifications) => {
  const updated = currentNotifications.map(notification => ({ ...notification, read: true }));
  saveNotifications(updated);
  return updated;
};

/**
 * Delete a notification
 */
export const deleteNotification = (id, currentNotifications) => {
  const updated = currentNotifications.filter(notification => notification.id !== id);
  saveNotifications(updated);
  return updated;
};

/**
 * Add a new notification
 */
export const addNotification = (notification, currentNotifications) => {
  const updated = [notification, ...currentNotifications];
  saveNotifications(updated);
  return updated;
};

/**
 * Subscribe to notification changes
 */
export const subscribeToNotifications = (callback) => {
  const handleChange = (event) => {
    if (event.detail && event.detail.notifications) {
      callback(event.detail.notifications);
    } else {
      // Fallback: reload from localStorage
      callback(loadNotifications());
    }
  };

  window.addEventListener(NOTIFICATION_CHANGE_EVENT, handleChange);
  
  // Also listen to storage events (for cross-tab sync)
  window.addEventListener('storage', (e) => {
    if (e.key === NOTIFICATION_STORAGE_KEY) {
      callback(loadNotifications());
    }
  });

  return () => {
    window.removeEventListener(NOTIFICATION_CHANGE_EVENT, handleChange);
  };
};

