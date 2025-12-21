import React, { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Bell, X, Plus, Clock, AlertCircle, Info } from 'lucide-react';
import './GameStudio.css';

const StudioCalendar = ({ navigate }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [filterType, setFilterType] = useState('all'); // all, error, note, calendar
  const [showNewEventModal, setShowNewEventModal] = useState(false);

  // Sample activity data - errors, notes, calendar notifications
  const activities = [
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

  const getEventsForDate = (date) => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    let filtered = activities.filter(a => a.date === dateStr);
    
    // Apply filter
    if (filterType !== 'all') {
      filtered = filtered.filter(a => a.type === filterType);
    }
    
    return filtered;
  };

  const getFilteredActivities = () => {
    if (filterType === 'all') {
      return activities;
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
                              <div 
                                key={event.id} 
                                className="calendar-event-bar"
                                style={{ backgroundColor: event.color }}
                                title={`${event.time} - ${event.title}`}
                              >
                                <span className="event-time-short">{event.time}</span>
                                <span className="event-title-short">{event.title}</span>
                              </div>
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
                      default:
                        IconComponent = Calendar;
                    }
                    
                    return (
                      <div key={event.id} className="calendar-event-item outlook-event">
                        <div className="event-time">{event.time}</div>
                        <div className="event-content">
                          <div className="event-title-row">
                            <IconComponent size={16} style={{ color: event.color }} />
                            <div className="event-title">{event.title}</div>
                          </div>
                          <div className="event-description">{event.description}</div>
                        </div>
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

