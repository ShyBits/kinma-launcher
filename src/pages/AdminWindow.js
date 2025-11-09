import React, { useState, useEffect, useCallback } from 'react';
import { Check, X, User, Mail, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { getUserData, saveUserData, getCurrentUserId } from '../utils/UserDataManager';
import TitleBar from '../components/TitleBar';
import './Settings.css';

const AdminWindow = () => {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [approvedRequests, setApprovedRequests] = useState([]);
  const [deniedRequests, setDeniedRequests] = useState([]);
  const [activeTab, setActiveTab] = useState('pending');
  const [isAuthorized, setIsAuthorized] = useState(false);

  const loadRequests = useCallback(() => {
    try {
      const allRequests = JSON.parse(localStorage.getItem('developerAccessRequests') || '[]');
      const pending = allRequests.filter(r => r.status === 'pending');
      const approved = allRequests.filter(r => r.status === 'approved');
      const denied = allRequests.filter(r => r.status === 'denied');
      
      // Sort by requested date (newest first)
      pending.sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));
      approved.sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));
      denied.sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));
      
      setPendingRequests(pending);
      setApprovedRequests(approved);
      setDeniedRequests(denied);
    } catch (error) {
      console.error('Error loading requests:', error);
    }
  }, []);

  useEffect(() => {
    // Check if user is admin by verifying credentials
    const checkAdminAccess = async () => {
      try {
        const api = window.electronAPI;
        if (!api) {
          setIsAuthorized(false);
          return;
        }

        // Get current authenticated user
        const authUser = JSON.parse(localStorage.getItem('authUser') || '{}');
        if (!authUser || !authUser.id) {
          setIsAuthorized(false);
          return;
        }

        // Get users to verify admin credentials
        const usersResult = await api.getUsers();
        if (!usersResult?.success || !usersResult?.users) {
          setIsAuthorized(false);
          return;
        }

        const userData = usersResult.users.find(u => u.id === authUser.id || u.email === authUser.email);
        if (!userData) {
          setIsAuthorized(false);
          return;
        }

        // Admin credentials - must match exactly
        const ADMIN_CREDENTIALS = {
          email: 'admin@kinma.app',
          username: 'admin',
          password: 'admin123' // Change this to your secure password
        };

        const emailMatch = userData.email && userData.email.toLowerCase() === ADMIN_CREDENTIALS.email.toLowerCase();
        const usernameMatch = (userData.username && userData.username.toLowerCase() === ADMIN_CREDENTIALS.username.toLowerCase()) ||
                             (userData.name && userData.name.toLowerCase() === ADMIN_CREDENTIALS.username.toLowerCase());
        const passwordMatch = userData.password === ADMIN_CREDENTIALS.password;

        if (emailMatch && usernameMatch && passwordMatch) {
          setIsAuthorized(true);
          loadRequests();
        } else {
          setIsAuthorized(false);
        }
      } catch (error) {
        console.error('Error checking admin access:', error);
        setIsAuthorized(false);
      }
    };

    checkAdminAccess();
    
    // Listen for new requests
    const interval = setInterval(() => {
      if (isAuthorized) {
        loadRequests();
      }
    }, 2000); // Check every 2 seconds
    
    return () => clearInterval(interval);
  }, [isAuthorized, loadRequests]);

  const updateRequestStatus = async (userId, status) => {
    try {
      const allRequests = JSON.parse(localStorage.getItem('developerAccessRequests') || '[]');
      const requestIndex = allRequests.findIndex(r => r.userId === userId);
      
      if (requestIndex >= 0) {
        allRequests[requestIndex].status = status;
        allRequests[requestIndex].reviewedAt = new Date().toISOString();
        allRequests[requestIndex].reviewedBy = getCurrentUserId();
        
        localStorage.setItem('developerAccessRequests', JSON.stringify(allRequests));
        
        // Update user's access status
        if (status === 'approved') {
          saveUserData('developerAccess', true, userId);
          saveUserData('gameStudioAccess', true, userId);
          saveUserData('developerAccessStatus', 'approved', userId);
          
          // Update user in users.json
          const api = window.electronAPI;
          if (api?.getUsers) {
            const result = await api.getUsers();
            if (result?.success && result?.users) {
              const users = result.users;
              const userIndex = users.findIndex(u => u.id === userId);
              if (userIndex !== -1) {
                users[userIndex].devIntent = true;
                users[userIndex].hasDeveloperAccess = true;
                users[userIndex].hasGameStudioAccess = true;
                if (api?.saveUsers) {
                  await api.saveUsers(users);
                }
              }
            }
          }
        } else if (status === 'denied') {
          saveUserData('developerAccess', false, userId);
          saveUserData('gameStudioAccess', false, userId);
          saveUserData('developerAccessStatus', 'denied', userId);
        }
        
        // Trigger user-changed event for the affected user
        window.dispatchEvent(new CustomEvent('user-changed'));
        
        loadRequests();
      }
    } catch (error) {
      console.error('Error updating request status:', error);
    }
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch (_) {
      return dateString;
    }
  };

  const renderRequestList = (requests, showActions = true) => {
    if (requests.length === 0) {
      return (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <AlertCircle size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
          <p>No requests found</p>
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {requests.map((request) => (
          <div
            key={request.userId}
            style={{
              padding: '20px',
              background: 'var(--bg-secondary)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '20px'
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <User size={20} style={{ color: 'var(--text-secondary)' }} />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
                  {request.userName || 'Unknown User'}
                </h3>
              </div>
              {request.userEmail && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Mail size={16} style={{ color: 'var(--text-secondary)' }} />
                  <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                    {request.userEmail}
                  </span>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={14} style={{ color: 'var(--text-secondary)' }} />
                <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                  Requested: {formatDate(request.requestedAt)}
                </span>
              </div>
              {request.reviewedAt && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                    Reviewed: {formatDate(request.reviewedAt)}
                  </span>
                </div>
              )}
            </div>
            
            {showActions && request.status === 'pending' && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => updateRequestStatus(request.userId, 'approved')}
                  style={{
                    padding: '8px 16px',
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid #10b981',
                    borderRadius: '8px',
                    color: '#10b981',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '14px',
                    fontWeight: 600,
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(16, 185, 129, 0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)';
                  }}
                >
                  <Check size={16} />
                  Approve
                </button>
                <button
                  onClick={() => updateRequestStatus(request.userId, 'denied')}
                  style={{
                    padding: '8px 16px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid #ef4444',
                    borderRadius: '8px',
                    color: '#ef4444',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '14px',
                    fontWeight: 600,
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                  }}
                >
                  <X size={16} />
                  Deny
                </button>
              </div>
            )}
            
            {!showActions && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {request.status === 'approved' && (
                  <CheckCircle size={20} style={{ color: '#10b981' }} />
                )}
                {request.status === 'denied' && (
                  <XCircle size={20} style={{ color: '#ef4444' }} />
                )}
                <span style={{ 
                  color: request.status === 'approved' ? '#10b981' : '#ef4444',
                  fontSize: '14px',
                  fontWeight: 600
                }}>
                  {request.status === 'approved' ? 'Approved' : 'Denied'}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  if (!isAuthorized) {
    return (
      <div style={{ 
        width: '100%', 
        height: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        background: 'var(--bg-primary)'
      }}>
        <TitleBar navigate={() => {}} onToggleSidebar={() => {}} />
        <div style={{ 
          flex: 1, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <AlertCircle size={64} style={{ color: '#ef4444', opacity: 0.7 }} />
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>Unauthorized Access</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '16px' }}>
            You do not have permission to access the admin panel.
          </p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', opacity: 0.7 }}>
            This window will close automatically.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      width: '100%', 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      background: 'var(--bg-primary)'
    }}>
      <TitleBar navigate={() => {}} onToggleSidebar={() => {}} />
      <div className="settings" style={{ flex: 1, overflow: 'auto' }}>
        <div className="settings-header">
          <h1>Admin Panel</h1>
          <p>Review and manage developer access requests</p>
        </div>
        
        <div className="settings-content">
          <div className="settings-sidebar">
            <button
              className={`settings-tab ${activeTab === 'pending' ? 'active' : ''}`}
              onClick={() => setActiveTab('pending')}
            >
              <Clock size={18} />
              Pending ({pendingRequests.length})
            </button>
            <button
              className={`settings-tab ${activeTab === 'approved' ? 'active' : ''}`}
              onClick={() => setActiveTab('approved')}
            >
              <CheckCircle size={18} />
              Approved ({approvedRequests.length})
            </button>
            <button
              className={`settings-tab ${activeTab === 'denied' ? 'active' : ''}`}
              onClick={() => setActiveTab('denied')}
            >
              <XCircle size={18} />
              Denied ({deniedRequests.length})
            </button>
          </div>
          
          <div className="settings-main">
            <div className="settings-section">
              {activeTab === 'pending' && (
                <>
                  <h3>Pending Requests</h3>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
                    Review and approve or deny developer access requests
                  </p>
                  {renderRequestList(pendingRequests, true)}
                </>
              )}
              
              {activeTab === 'approved' && (
                <>
                  <h3>Approved Requests</h3>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
                    Users who have been granted developer access
                  </p>
                  {renderRequestList(approvedRequests, false)}
                </>
              )}
              
              {activeTab === 'denied' && (
                <>
                  <h3>Denied Requests</h3>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
                    Users whose developer access requests were denied
                  </p>
                  {renderRequestList(deniedRequests, false)}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminWindow;

