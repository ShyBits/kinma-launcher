import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X, User, Mail, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { getUserData, saveUserData, getCurrentUserId } from '../utils/UserDataManager';
import './Settings.css';

// Check if current user is admin
const isAdmin = () => {
  try {
    const userId = getCurrentUserId();
    if (!userId) return false;
    
    // Check if user has admin flag in their data
    const isAdminUser = getUserData('isAdmin', false, userId);
    if (isAdminUser) return true;
    
    // Check if user matches admin credentials
    const authUser = JSON.parse(localStorage.getItem('authUser') || '{}');
    if (!authUser || !authUser.id) return false;
    
    // Admin credentials - must match exactly
    const ADMIN_CREDENTIALS = {
      email: 'admin@kinma.app',
      username: 'admin'
    };
    
    // Check email and username match (password will be verified by electronAPI when opening admin window)
    const emailMatch = authUser.email && authUser.email.toLowerCase() === ADMIN_CREDENTIALS.email.toLowerCase();
    const usernameMatch = (authUser.username && authUser.username.toLowerCase() === ADMIN_CREDENTIALS.username.toLowerCase()) ||
                         (authUser.name && authUser.name.toLowerCase() === ADMIN_CREDENTIALS.username.toLowerCase());
    
    if (emailMatch && usernameMatch) {
      return true; // Password will be verified by electronAPI when opening admin window
    }
    
    return false;
  } catch (_) {
    return false;
  }
};

const Admin = () => {
  const navigate = useNavigate();
  const [pendingRequests, setPendingRequests] = useState([]);
  const [approvedRequests, setApprovedRequests] = useState([]);
  const [deniedRequests, setDeniedRequests] = useState([]);
  const [activeTab, setActiveTab] = useState('pending');

  useEffect(() => {
    // Check if user is admin
    if (!isAdmin()) {
      navigate('/library');
      return;
    }
    
    loadRequests();
    
    // Listen for new requests
    const interval = setInterval(loadRequests, 2000); // Check every 2 seconds
    return () => clearInterval(interval);
  }, [navigate]);

  const loadRequests = () => {
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
  };

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
                    transition: 'none'
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
                    transition: 'none'
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

  return (
    <div className="settings">
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
  );
};

export default Admin;

