import React, { useState } from 'react';
import { Bell, X, Check, AlertCircle, Info, Gift, Users, MessageSquare } from 'lucide-react';
import './Notifications.css';

const Notifications = () => {
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: 'achievement',
      title: 'Achievement Unlocked!',
      message: 'You\'ve completed your first game session!',
      time: '2 minutes ago',
      read: false,
      icon: Gift
    },
    {
      id: 2,
      type: 'friend',
      title: 'New Friend Request',
      message: 'GamerPro123 wants to be your friend',
      time: '15 minutes ago',
      read: false,
      icon: Users
    },
    {
      id: 3,
      type: 'update',
      title: 'Game Update Available',
      message: 'Pathline v2.1.0 is ready to download',
      time: '1 hour ago',
      read: true,
      icon: AlertCircle
    },
    {
      id: 4,
      type: 'community',
      title: 'New Community Post',
      message: 'Someone replied to your post in the Community',
      time: '3 hours ago',
      read: true,
      icon: MessageSquare
    },
    {
      id: 5,
      type: 'system',
      title: 'System Maintenance',
      message: 'Scheduled maintenance will occur tonight at 2 AM',
      time: '1 day ago',
      read: true,
      icon: Info
    }
  ]);

  const markAsRead = (id) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  const deleteNotification = (id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const getNotificationIcon = (type) => {
    const notification = notifications.find(n => n.type === type);
    return notification ? notification.icon : Bell;
  };

  const getNotificationColor = (type) => {
    const colors = {
      achievement: '#4ade80',
      friend: '#3b82f6',
      update: '#f59e0b',
      community: '#8b5cf6',
      system: '#6b7280'
    };
    return colors[type] || '#6b7280';
  };

  return (
    <div className="notifications">
      <div className="notifications-header">
        <div className="notifications-title">
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

      <div className="notifications-content">
        {notifications.length === 0 ? (
          <div className="empty-state">
            <Bell size={48} />
            <h3>No notifications</h3>
            <p>You're all caught up! Check back later for updates.</p>
          </div>
        ) : (
          <div className="notifications-list">
            {notifications.map(notification => {
              const IconComponent = notification.icon;
              return (
                <div 
                  key={notification.id} 
                  className={`notification-item ${notification.read ? 'read' : 'unread'}`}
                >
                  <div className="notification-icon">
                    <IconComponent 
                      size={20} 
                      color={getNotificationColor(notification.type)}
                    />
                  </div>
                  
                  <div className="notification-content">
                    <div className="notification-header">
                      <h3 className="notification-title">{notification.title}</h3>
                      <div className="notification-actions">
                        {!notification.read && (
                          <button 
                            className="mark-read-btn"
                            onClick={() => markAsRead(notification.id)}
                            title="Mark as read"
                          >
                            <Check size={14} />
                          </button>
                        )}
                        <button 
                          className="delete-btn"
                          onClick={() => deleteNotification(notification.id)}
                          title="Delete notification"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                    
                    <p className="notification-message">{notification.message}</p>
                    <span className="notification-time">{notification.time}</span>
                  </div>
                  
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
