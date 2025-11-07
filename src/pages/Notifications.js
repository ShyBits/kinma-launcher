import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, X, Check, AlertCircle, Info, Gift, Users, MessageSquare, ShoppingBag, Package, Award, Sparkles } from 'lucide-react';
import { loadNotifications, subscribeToNotifications, markNotificationAsRead as markRead, markAllNotificationsAsRead as markAllRead, deleteNotification as deleteNotif } from '../utils/NotificationManager';
import './Notifications.css';

const Notifications = () => {
  const location = useLocation();
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all', 'unread', 'read'
  const [highlightedNotificationId, setHighlightedNotificationId] = useState(null);
  const notificationRefs = useRef({});
  const highlightTimeoutRef = useRef(null);
  const isNotificationsPage = location.pathname === '/notifications';
  
  // Get notification ID from URL parameter
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const notificationId = searchParams.get('id');
    if (notificationId) {
      const id = parseInt(notificationId, 10);
      
      // Clear any existing timeout to ensure independent selection timing
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
        highlightTimeoutRef.current = null;
      }
      
      setHighlightedNotificationId(id);
      
      // Scroll to the notification after a short delay to ensure it's rendered
      setTimeout(() => {
        const element = notificationRefs.current[id];
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      
      // Remove highlight after 3 seconds - each selection gets full 3 seconds
      highlightTimeoutRef.current = setTimeout(() => {
        setHighlightedNotificationId(null);
        highlightTimeoutRef.current = null;
        // Clean up URL parameter
        window.history.replaceState({}, '', '/notifications');
      }, 3000);
    }
    
    // Cleanup timeout on unmount
    return () => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
        highlightTimeoutRef.current = null;
      }
    };
  }, [location.search]);

  // Icon mapping
  const iconMap = {
    gift: Gift,
    users: Users,
    alertCircle: AlertCircle,
    messageSquare: MessageSquare,
    info: Info,
    bell: Bell,
    shoppingBag: ShoppingBag,
    package: Package,
    award: Award
  };

  const getIconComponent = (iconType) => {
    return iconMap[iconType] || Bell;
  };

  // Get smart source text
  const getSourceText = (notification) => {
    if (notification.source) {
      return notification.source;
    }
    
    if (notification.type === 'achievement') {
      return 'Achievement Unlocked';
    }
    if (notification.type === 'friend') {
      return 'Friend Request';
    }
    if (notification.type === 'update') {
      return 'Game Update';
    }
    if (notification.type === 'community') {
      return 'Community';
    }
    if (notification.type === 'system') {
      return 'System';
    }
    return 'Notification';
  };

  // Get preview content for notification
  const getPreviewContent = (notification) => {
    if (notification.preview) {
      // Map iconType to component if needed
      if (notification.preview.iconType && !notification.preview.icon) {
        const previewIconMap = {
          award: Award,
          package: Package,
          shoppingBag: ShoppingBag
        };
        const iconComponent = previewIconMap[notification.preview.iconType];
        if (iconComponent) {
          return {
            ...notification.preview,
            icon: iconComponent
          };
        }
      }
      // If icon is already set, ensure it's a component
      if (notification.preview.icon && typeof notification.preview.icon !== 'function') {
        // If icon is an object (not a component), try to convert from iconType
        if (notification.preview.iconType) {
          const previewIconMap = {
            award: Award,
            package: Package,
            shoppingBag: ShoppingBag
          };
          return {
            ...notification.preview,
            icon: previewIconMap[notification.preview.iconType] || null
          };
        }
        return {
          ...notification.preview,
          icon: null
        };
      }
      return notification.preview;
    }
    
    // Default preview based on type
    if (notification.type === 'achievement') {
      return {
        type: 'badge',
        icon: Award,
        color: '#4ade80',
        label: 'Badge'
      };
    }
    if (notification.itemType) {
      return {
        type: 'item',
        icon: Package,
        color: '#3b82f6',
        label: notification.itemType
      };
    }
    
    return null;
  };

  // Helper function to map notification data to components
  const mapNotificationData = (notifications) => {
    return notifications.map(n => {
      const preview = n.preview ? {
        ...n.preview,
        icon: n.preview.iconType ? (() => {
          const previewIconMap = {
            award: Award,
            package: Package,
            shoppingBag: ShoppingBag
          };
          return previewIconMap[n.preview.iconType] || null;
        })() : null
      } : null;
      return {
        ...n,
        iconType: n.iconType || n.type || 'info',
        preview: preview
      };
    });
  };

  // Load notifications from localStorage on mount
  useEffect(() => {
    const loaded = loadNotifications();
    setNotifications(mapNotificationData(loaded));
  }, []);

  // Subscribe to notification changes from TopNavigation and other sources
  useEffect(() => {
    const unsubscribe = subscribeToNotifications((updatedNotifications) => {
      setNotifications(mapNotificationData(updatedNotifications));
    });

    return unsubscribe;
  }, []);

  const markAsRead = (id) => {
    setNotifications(prev => {
      const updated = markRead(id, prev);
      return mapNotificationData(updated);
    });
  };

  const markAllAsRead = () => {
    setNotifications(prev => {
      const updated = markAllRead(prev);
      return mapNotificationData(updated);
    });
  };

  const deleteNotification = (id) => {
    setNotifications(prev => {
      const updated = deleteNotif(id, prev);
      return mapNotificationData(updated);
    });
  };

  const getNotificationColor = (type, priority) => {
    // Priority-based colors (if priority is set, use it)
    if (priority === 'error' || type === 'error') return '#ef4444'; // Red
    if (priority === 'warning' || type === 'warning') return '#f59e0b'; // Yellow
    if (priority === 'item' || type === 'item' || type === 'purchase' || type === 'inventory' || type === 'market') return '#3b82f6'; // Blue
    if (priority === 'success' || type === 'achievement' || type === 'success' || type === 'confirmation') return '#4ade80'; // Green
    
    // Type-based colors
    const colors = {
      error: '#ef4444', // Red - errors
      warning: '#f59e0b', // Yellow - warnings
      item: '#3b82f6', // Blue - item related
      purchase: '#3b82f6', // Blue - purchases
      inventory: '#3b82f6', // Blue - inventory
      market: '#3b82f6', // Blue - market
      achievement: '#4ade80', // Green - confirmations/achievements
      success: '#4ade80', // Green - success
      confirmation: '#4ade80', // Green - confirmations
      friend: '#3b82f6', // Blue - friend requests (item-related)
      update: '#6b7280', // Grey - updates (not so important)
      community: '#6b7280', // Grey - community (not so important)
      system: '#6b7280' // Grey - system (not so important)
    };
    return colors[type] || '#6b7280'; // Default to grey
  };

  // Helper function to convert hex to rgba
  const hexToRgba = (hex, alpha) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // Get background color for unread notifications
  const getNotificationBackgroundColor = (type, priority, hover = false) => {
    const color = getNotificationColor(type, priority);
    const opacity = hover ? 0.12 : 0.08;
    return hexToRgba(color, opacity);
  };

  // Get border color for unread notifications
  const getNotificationBorderColor = (type, priority, hover = false) => {
    const color = getNotificationColor(type, priority);
    const opacity = hover ? 0.3 : 0.2;
    return hexToRgba(color, opacity);
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  
  const filteredNotifications = notifications.filter(n => {
    // Always include highlighted notification regardless of filter
    if (highlightedNotificationId === n.id) return true;
    
    if (filter === 'unread') return !n.read;
    if (filter === 'read') return n.read;
    return true;
  });

  return (
    <div className={`notifications ${isNotificationsPage ? 'page-active' : ''}`}>
      <div className="notifications-header">
        <div className={`notifications-title ${isNotificationsPage ? 'active' : ''} ${unreadCount > 0 ? 'has-unread' : ''}`}>
          <Bell size={24} />
          <h1>Notifications</h1>
          {unreadCount > 0 && (
            <span className="unread-badge">{unreadCount}</span>
          )}
        </div>
        {unreadCount > 0 && (
          <button className="mark-all-read-btn" onClick={markAllAsRead}>
            <Check size={16} />
            Mark all as read
          </button>
        )}
      </div>

      {notifications.length > 0 && (
        <div className="notifications-filters">
          <button
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({notifications.length})
          </button>
          <button
            className={`filter-btn ${filter === 'unread' ? 'active' : ''}`}
            onClick={() => setFilter('unread')}
          >
            Unread ({unreadCount})
          </button>
          <button
            className={`filter-btn ${filter === 'read' ? 'active' : ''}`}
            onClick={() => setFilter('read')}
          >
            Read ({notifications.length - unreadCount})
          </button>
        </div>
      )}

      <div className="notifications-content">
        {filteredNotifications.length === 0 ? (
          <div className="empty-state">
            <Bell size={48} />
            <h3>
              {filter === 'unread' 
                ? 'No unread notifications' 
                : filter === 'read'
                ? 'No read notifications'
                : 'No notifications'}
            </h3>
            <p>
              {filter === 'unread'
                ? 'You\'re all caught up! Check back later for updates.'
                : filter === 'read'
                ? 'You haven\'t read any notifications yet.'
                : 'You\'re all caught up! Check back later for updates.'}
            </p>
          </div>
        ) : (
          <div className="notifications-list">
            {filteredNotifications.map(notification => {
              const IconComponent = getIconComponent(notification.iconType);
              const preview = getPreviewContent(notification);
              const sourceText = getSourceText(notification);
              
              const isHighlighted = highlightedNotificationId === notification.id;
              
              return (
                <div 
                  key={notification.id}
                  ref={(el) => { notificationRefs.current[notification.id] = el; }}
                  className={`notification-item ${notification.read ? 'read' : 'unread'} ${isHighlighted ? 'highlighted' : ''}`}
                  style={{ 
                    '--notification-color': getNotificationColor(notification.type, notification.priority),
                    ...(notification.read ? {} : { 
                      background: getNotificationBackgroundColor(notification.type, notification.priority),
                      borderColor: getNotificationBorderColor(notification.type, notification.priority)
                    })
                  }}
                  onMouseEnter={(e) => {
                    if (!notification.read) {
                      e.currentTarget.style.background = getNotificationBackgroundColor(notification.type, notification.priority, true);
                      e.currentTarget.style.borderColor = getNotificationBorderColor(notification.type, notification.priority, true);
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!notification.read) {
                      e.currentTarget.style.background = getNotificationBackgroundColor(notification.type, notification.priority, false);
                      e.currentTarget.style.borderColor = getNotificationBorderColor(notification.type, notification.priority, false);
                    }
                  }}
                  onClick={() => {
                    if (!notification.read) {
                      markAsRead(notification.id);
                    }
                  }}
                >
                  <div className="notification-main-content">
                    <div className="notification-text-content">
                      <h3 className="notification-title">{notification.title}</h3>
                      <p className="notification-message">{notification.message}</p>
                      <div className="notification-meta">
                        <span className="notification-time">{notification.time}</span>
                        {sourceText && (
                          <span className="notification-source">{sourceText}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {preview && (
                    <div className="notification-preview-box">
                      <div 
                        className="notification-preview-content"
                        style={{ backgroundColor: `${preview.color}15`, borderColor: `${preview.color}40` }}
                      >
                        {preview.icon && typeof preview.icon === 'function' && (() => {
                          const PreviewIcon = preview.icon;
                          return React.createElement(PreviewIcon, {
                            size: 32,
                            color: preview.color,
                            style: { opacity: 0.9 }
                          });
                        })()}
                        {preview.image && (
                          <img 
                            src={preview.image} 
                            alt={preview.label || 'Preview'}
                            className="notification-preview-image"
                          />
                        )}
                        {preview.label && (
                          <span className="notification-preview-label">{preview.label}</span>
                        )}
                      </div>
                      {notification.sourceIcon && (
                        <div className="notification-source-badge">
                          {notification.sourceIcon === 'gift' && <Gift size={12} />}
                          {notification.sourceIcon === 'store' && <ShoppingBag size={12} />}
                          {notification.sourceIcon === 'market' && <Package size={12} />}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {!notification.read && <div className="unread-indicator"></div>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
