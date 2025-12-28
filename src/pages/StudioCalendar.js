import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Bell, X, Plus, Clock, AlertCircle, Info } from 'lucide-react';
import { getUserData } from '../utils/UserDataManager';
import './GameStudio.css';

const StudioCalendar = ({ navigate }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [filterType, setFilterType] = useState('all'); // all, error, note, calendar
  const [showNewEventModal, setShowNewEventModal] = useState(false);
  const [games, setGames] = useState([]);

  // Load games from storage
  useEffect(() => {
    const loadGames = async () => {
      try {
        const customGames = await getUserData('customGames', []);
        setGames(Array.isArray(customGames) ? customGames : []);
      } catch (error) {
        console.error('Error loading games:', error);
        setGames([]);
      }
    };
    
    loadGames();
    
    // Listen for game updates
    const handleGameUpdate = () => {
      loadGames();
    };
    
    window.addEventListener('customGameUpdate', handleGameUpdate);
    return () => window.removeEventListener('customGameUpdate', handleGameUpdate);
  }, []);

  // Helper function to parse date string to YYYY-MM-DD format
  const formatDateString = (dateInput) => {
    if (!dateInput) return null;
    
    try {
      // Try parsing as date string
      const date = new Date(dateInput);
      if (isNaN(date.getTime())) return null;
      
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (error) {
      return null;
    }
  };

  // Helper function to get image URL
  const getImageUrl = (url) => {
    if (!url) return '';
    // If it's already a valid URL (http/https/data), return as is
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }
    // Handle file:// URLs - browsers block these, so return empty or placeholder
    if (url.startsWith('file://')) {
      // In Electron, we might need to use a different approach
      // For now, return empty to let the browser show no image
      console.warn('file:// URL blocked by browser:', url);
      return '';
    }
    // Otherwise, treat as a relative path
    return url.startsWith('/') ? url : `/${url}`;
  };

  // Extract game events from games
  const gameEvents = useMemo(() => {
    const events = [];
    let eventIdCounter = 1000; // Start from 1000 to avoid conflicts with sample data
    
    games.forEach((game) => {
      const gameName = game.name || game.gameName || 'Unnamed Game';
      // Check multiple possible locations for game cover
      const gameCoverRaw = game.card || game.cardImage || game.banner || game.bannerImage || 
                          (game.fullFormData && (game.fullFormData.cardImage || game.fullFormData.bannerImage)) || null;
      const gameCover = gameCoverRaw ? getImageUrl(gameCoverRaw) : null;
      
      // Release date event
      if (game.releaseDate) {
        const releaseDate = formatDateString(game.releaseDate);
        if (releaseDate) {
          events.push({
            id: eventIdCounter++,
            type: 'game-release',
            title: `${gameName} - Release`,
            description: `Release date for ${gameName}`,
            date: releaseDate,
            time: '00:00', // Default time if not specified
            color: '#10b981', // Green for releases
            gameId: game.gameId || game.id,
            gameName: gameName,
            gameCover: gameCover,
            isGameEvent: true
          });
        }
      }
      
      // Scheduled update event
      if (game.scheduledUpdateDate) {
        const updateDate = formatDateString(game.scheduledUpdateDate);
        if (updateDate) {
          const updateTitle = game.scheduledUpdateTitle || `Update for ${gameName}`;
          events.push({
            id: eventIdCounter++,
            type: 'game-update',
            title: `${gameName} - Update`,
            description: updateTitle,
            date: updateDate,
            time: '00:00', // Default time if not specified
            color: '#3b82f6', // Blue for updates
            gameId: game.gameId || game.id,
            gameName: gameName,
            gameCover: gameCover,
            isGameEvent: true
          });
        }
      }
    });
    
    return events;
  }, [games]);

  // Sample activity data - errors, notes, calendar notifications
  const sampleActivities = [
    {
      id: 1,
      type: 'error',
      title: 'Build failed for "23123"',
      description: 'Compilation error in main.cpp',
      timestamp: '2 hours ago',
      gameName: '23123',
      date: '2025-12-21',
      time: '10:00',
      color: '#ef4444'
    },
    {
      id: 2,
      type: 'note',
      title: 'Important: Update required',
      description: 'API version 2.0 will be deprecated next month',
      timestamp: '5 hours ago',
      date: '2025-12-21',
      time: '14:30',
      color: '#3b82f6'
    },
    {
      id: 3,
      type: 'calendar',
      title: 'Release deadline approaching',
      description: 'Game "1223" release scheduled for Jan 15, 2026',
      timestamp: '1 day ago',
      date: '2026-01-15',
      time: '09:00',
      color: '#f59e0b'
    },
    {
      id: 4,
      type: 'error',
      title: 'Upload failed for "123"',
      description: 'File size exceeds limit',
      timestamp: '2 days ago',
      date: '2025-12-19',
      time: '16:00',
      color: '#ef4444'
    },
    {
      id: 5,
      type: 'note',
      title: 'New feature available',
      description: 'Cloud save functionality is now live',
      timestamp: '3 days ago',
      date: '2025-12-18',
      time: '11:00',
      color: '#3b82f6'
    }
  ];

  // Combine sample activities with game events
  const activities = useMemo(() => {
    return [...sampleActivities, ...gameEvents];
  }, [gameEvents]);

  const getEventsForDate = (date) => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    let filtered = activities.filter(a => a.date === dateStr);
    
    // Apply filter
    if (filterType !== 'all') {
      if (filterType === 'calendar') {
        // Include both 'calendar' type and game events
        filtered = filtered.filter(a => a.type === 'calendar' || a.type === 'game-release' || a.type === 'game-update');
      } else {
        filtered = filtered.filter(a => a.type === filterType);
      }
    }
    
    return filtered;
  };

  const getFilteredActivities = () => {
    if (filterType === 'all') {
      return activities;
    }
    if (filterType === 'calendar') {
      // Include both 'calendar' type and game events
      return activities.filter(a => a.type === 'calendar' || a.type === 'game-release' || a.type === 'game-update');
    }
    return activities.filter(a => a.type === filterType);
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const isSelectedDate = (date) => {
    return date.toDateString() === selectedDate.toDateString();
  };

  const isToday = (date) => {
    return date.toDateString() === new Date().toDateString();
  };

  const selectedDateEvents = getEventsForDate(selectedDate);
  const filteredActivities = getFilteredActivities();

  return (
    <div className="studio-calendar-page outlook-style">
      <div className="studio-calendar-container">
        <div className="studio-calendar-content-wrapper">
          <div className="studio-calendar-main">
            <div className="calendar-toolbar">
              <div className="calendar-filter-section">
                <div className="calendar-filter">
                  <button 
                    className={`calendar-filter-btn ${filterType === 'all' ? 'active' : ''}`}
                    onClick={() => setFilterType('all')}
                  >
                    All
                  </button>
                  <button 
                    className={`calendar-filter-btn ${filterType === 'error' ? 'active' : ''}`}
                    onClick={() => setFilterType('error')}
                  >
                    <AlertCircle size={14} />
                    Errors
                  </button>
                  <button 
                    className={`calendar-filter-btn ${filterType === 'note' ? 'active' : ''}`}
                    onClick={() => setFilterType('note')}
                  >
                    <Info size={14} />
                    Notes
                  </button>
                  <button 
                    className={`calendar-filter-btn ${filterType === 'calendar' ? 'active' : ''}`}
                    onClick={() => setFilterType('calendar')}
                  >
                    <Bell size={14} />
                    Events
                  </button>
                </div>
              </div>
              <div className="calendar-navigation">
                <button 
                  className="calendar-nav-btn"
                  onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, selectedDate.getDate()))}
                >
                  <ChevronLeft size={24} />
                </button>
                <button 
                  className="calendar-month-year-btn"
                  onClick={() => setSelectedDate(new Date())}
                  title="Go to current month"
                >
                  {formatDate(selectedDate)}
                </button>
                <button 
                  className="calendar-nav-btn"
                  onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, selectedDate.getDate()))}
                >
                  <ChevronRight size={24} />
                </button>
              </div>
            </div>

            <div className="calendar-grid outlook-calendar">
              <div className="calendar-weekdays">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => (
                  <div key={day} className="calendar-weekday">{day}</div>
                ))}
              </div>
              <div className="calendar-days">
                {(() => {
                  const year = selectedDate.getFullYear();
                  const month = selectedDate.getMonth();
                  const firstDay = new Date(year, month, 1);
                  const lastDay = new Date(year, month + 1, 0);
                  const daysInMonth = lastDay.getDate();
                  const startingDayOfWeek = firstDay.getDay();
                  
                  const days = [];
                  
                  // Empty cells for days before the first day of the month
                  for (let i = 0; i < startingDayOfWeek; i++) {
                    days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
                  }
                  
                  // Days of the month
                  for (let day = 1; day <= daysInMonth; day++) {
                    const date = new Date(year, month, day);
                    const events = getEventsForDate(date);
                    
                    days.push(
                      <div 
                        key={day} 
                        className={`calendar-day ${isToday(date) ? 'today' : ''} ${isSelectedDate(date) ? 'selected' : ''} ${events.length > 0 ? 'has-events' : ''}`}
                        onClick={() => setSelectedDate(date)}
                      >
                        <div className="calendar-day-number">{day}</div>
                        {events.length > 0 && (
                          <div className="calendar-day-events">
                            {events.slice(0, 2).map((event) => (
                              event.isGameEvent && event.gameCover ? (
                                <div 
                                  key={event.id} 
                                  className="calendar-event-game-cover"
                                  title={`${event.time} - ${event.title}: ${event.description}`}
                                >
                                  <img 
                                    src={event.gameCover} 
                                    alt={event.gameName}
                                    className="calendar-game-cover-img"
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                    }}
                                  />
                                  <div className="calendar-game-cover-overlay">
                                    <span className="event-time-short">{event.time}</span>
                                  </div>
                                </div>
                              ) : (
                                <div 
                                  key={event.id} 
                                  className="calendar-event-bar"
                                  style={{ backgroundColor: event.color }}
                                  title={`${event.time} - ${event.title}`}
                                >
                                  <span className="event-time-short">{event.time}</span>
                                  <span className="event-title-short">{event.title}</span>
                                </div>
                              )
                            ))}
                            {events.length > 2 && (
                              <div className="calendar-event-more">+{events.length - 2} more</div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  }
                  
                  return days;
                })()}
              </div>
            </div>
          </div>

          <div className="studio-calendar-sidebar outlook-sidebar">
            <div className="calendar-selected-date">
              <div className="selected-date-header">
                <div className="selected-date-day">{selectedDate.getDate()}</div>
                <div className="selected-date-info">
                  <div className="selected-date-weekday">
                    {selectedDate.toLocaleDateString('en-US', { weekday: 'long' })}
                  </div>
                  <div className="selected-date-full">
                    {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </div>
                </div>
              </div>
              <button 
                className="calendar-new-event-btn sidebar-btn"
                onClick={() => setShowNewEventModal(true)}
              >
                <Plus size={18} />
                <span>New Event</span>
              </button>
            </div>

            <div className="calendar-events">
              <div className="calendar-events-header">
                <h3>Events</h3>
                <span className="events-count">{selectedDateEvents.length}</span>
              </div>
              <div className="calendar-events-list">
                {selectedDateEvents.length > 0 ? (
                  selectedDateEvents.map((event) => {
                    let IconComponent;
                    switch(event.type) {
                      case 'error':
                        IconComponent = AlertCircle;
                        break;
                      case 'note':
                        IconComponent = Info;
                        break;
                      case 'calendar':
                        IconComponent = Bell;
                        break;
                      case 'game-release':
                        IconComponent = Calendar;
                        break;
                      case 'game-update':
                        IconComponent = Bell;
                        break;
                      default:
                        IconComponent = Calendar;
                    }
                    
                    return (
                      <div key={event.id} className={`calendar-event-item outlook-event ${event.isGameEvent ? 'game-event' : ''}`}>
                        {event.isGameEvent && event.gameCover ? (
                          <>
                            <div className="event-game-cover-wrapper">
                              <img 
                                src={event.gameCover} 
                                alt={event.gameName}
                                className="event-game-cover"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                }}
                              />
                            </div>
                            <div className="event-time">{event.time}</div>
                            <div className="event-content">
                              <div className="event-title-row">
                                <IconComponent size={16} style={{ color: event.color }} />
                                <div className="event-title">{event.title}</div>
                              </div>
                              <div className="event-description">{event.description}</div>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="event-time">{event.time}</div>
                            <div className="event-content">
                              <div className="event-title-row">
                                <IconComponent size={16} style={{ color: event.color }} />
                                <div className="event-title">{event.title}</div>
                              </div>
                              <div className="event-description">{event.description}</div>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="calendar-no-events">
                    <Calendar size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
                    <p>No events scheduled</p>
                  </div>
                )}
              </div>
            </div>

            <div className="calendar-recent-activity">
              <h3>Upcoming</h3>
              <div className="calendar-activity-list">
                {filteredActivities
                  .filter(a => {
                    const eventDate = new Date(a.date);
                    return eventDate >= new Date();
                  })
                  .slice(0, 5)
                  .map((activity) => (
                    <div key={activity.id} className="calendar-activity-item outlook-activity">
                      <div className="activity-date-badge">
                        <div className="activity-month">{new Date(activity.date).toLocaleDateString('en-US', { month: 'short' })}</div>
                        <div className="activity-day">{new Date(activity.date).getDate()}</div>
                      </div>
                      <div className="activity-content">
                        <div className="activity-title">{activity.title}</div>
                        <div className="activity-time">{activity.time}</div>
                      </div>
                    </div>
                  ))}
                {filteredActivities.filter(a => {
                  const eventDate = new Date(a.date);
                  return eventDate >= new Date();
                }).length === 0 && (
                  <div className="calendar-no-upcoming">No upcoming events</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showNewEventModal && (
        <div className="calendar-modal-overlay" onClick={() => setShowNewEventModal(false)}>
          <div className="calendar-modal" onClick={(e) => e.stopPropagation()}>
            <div className="calendar-header">
              <h2>New Event</h2>
              <button onClick={() => setShowNewEventModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="calendar-modal-content">
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>
                Event creation form will be implemented here.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudioCalendar;

