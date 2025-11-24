import React, { useState, useEffect, useCallback } from 'react';
import { 
  Check, X, User, Mail, Clock, CheckCircle, XCircle, AlertCircle, 
  Settings, Users, Gamepad2, Shield, BarChart3, FileText, Database,
  Package, Trash2, Edit, Eye, EyeOff, Lock, Unlock
} from 'lucide-react';
import { getUserData, saveUserData, getCurrentUserId } from '../utils/UserDataManager';
import TitleBar from '../components/TitleBar';
import './Settings.css';

const AdminWindow = () => {
  const [activeSection, setActiveSection] = useState('publishing');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Publishing section state
  const [pendingRequests, setPendingRequests] = useState([]);
  const [approvedRequests, setApprovedRequests] = useState([]);
  const [deniedRequests, setDeniedRequests] = useState([]);
  const [publishingTab, setPublishingTab] = useState('pending');
  
  // Users section state
  const [allUsers, setAllUsers] = useState([]);
  const [usersTab, setUsersTab] = useState('all');
  
  // Games section state
  const [allGames, setAllGames] = useState([]);
  const [gamesTab, setGamesTab] = useState('all');

  const loadRequests = useCallback(() => {
    try {
      const allRequests = JSON.parse(localStorage.getItem('developerAccessRequests') || '[]');
      const pending = allRequests.filter(r => r.status === 'pending');
      const approved = allRequests.filter(r => r.status === 'approved');
      const denied = allRequests.filter(r => r.status === 'denied');
      
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

  const loadUsers = useCallback(async () => {
    try {
      const api = window.electronAPI;
      if (api?.getUsers) {
        const result = await api.getUsers();
        if (result?.success && result?.users) {
          setAllUsers(result.users);
        }
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  }, []);

  const loadGames = useCallback(() => {
    try {
      // Load all custom games from all users
      const allCustomGames = [];
      const userIds = new Set();
      
      // Get all user IDs from localStorage keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.includes('customGames')) {
          const userId = key.split('_')[1] || 'default';
          userIds.add(userId);
        }
      }
      
      userIds.forEach(userId => {
        try {
          const userGames = getUserData('customGames', [], userId);
          if (Array.isArray(userGames)) {
            userGames.forEach(game => {
              allCustomGames.push({
                ...game,
                ownerId: userId,
                ownerName: getUserData('name', 'Unknown', userId) || getUserData('username', 'Unknown', userId)
              });
            });
          }
        } catch (e) {
          console.error('Error loading games for user:', userId, e);
        }
      });
      
      setAllGames(allCustomGames);
    } catch (error) {
      console.error('Error loading games:', error);
    }
  }, []);

  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        setIsLoading(true);
        const api = window.electronAPI;
        if (!api) {
          setIsAuthorized(false);
          setIsLoading(false);
          return;
        }

        const authUser = JSON.parse(localStorage.getItem('authUser') || '{}');
        if (!authUser || !authUser.id) {
          setIsAuthorized(false);
          setIsLoading(false);
          return;
        }

        const usersResult = await api.getUsers();
        if (!usersResult?.success || !usersResult?.users) {
          setIsAuthorized(false);
          setIsLoading(false);
          return;
        }

        const userData = usersResult.users.find(u => u.id === authUser.id || u.email === authUser.email);
        if (!userData) {
          setIsAuthorized(false);
          setIsLoading(false);
          return;
        }

        const ADMIN_CREDENTIALS = {
          email: 'admin@kinma.app',
          username: 'admin',
          password: 'admin123'
        };

        const emailMatch = userData.email && userData.email.toLowerCase() === ADMIN_CREDENTIALS.email.toLowerCase();
        const usernameMatch = (userData.username && userData.username.toLowerCase() === ADMIN_CREDENTIALS.username.toLowerCase()) ||
                             (userData.name && userData.name.toLowerCase() === ADMIN_CREDENTIALS.username.toLowerCase());
        const passwordMatch = userData.password === ADMIN_CREDENTIALS.password;

        if (emailMatch && usernameMatch && passwordMatch) {
          setIsAuthorized(true);
          loadRequests();
          loadUsers();
          loadGames();
        } else {
          setIsAuthorized(false);
        }
      } catch (error) {
        console.error('Error checking admin access:', error);
        setIsAuthorized(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminAccess();
    
    const interval = setInterval(() => {
      if (isAuthorized) {
        loadRequests();
        loadUsers();
        loadGames();
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [isAuthorized, loadRequests, loadUsers, loadGames]);

  const updateRequestStatus = async (userId, status) => {
    try {
      const allRequests = JSON.parse(localStorage.getItem('developerAccessRequests') || '[]');
      const requestIndex = allRequests.findIndex(r => r.userId === userId);
      
      if (requestIndex >= 0) {
        allRequests[requestIndex].status = status;
        allRequests[requestIndex].reviewedAt = new Date().toISOString();
        allRequests[requestIndex].reviewedBy = getCurrentUserId();
        
        localStorage.setItem('developerAccessRequests', JSON.stringify(allRequests));
        
        if (status === 'approved') {
          saveUserData('developerAccess', true, userId);
          saveUserData('gameStudioAccess', true, userId);
          saveUserData('developerAccessStatus', 'approved', userId);
          
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
        
        window.dispatchEvent(new CustomEvent('user-changed'));
        loadRequests();
        loadUsers();
      }
    } catch (error) {
      console.error('Error updating request status:', error);
    }
  };

  const toggleUserAccess = async (userId, accessType) => {
    try {
      const api = window.electronAPI;
      if (api?.getUsers) {
        const result = await api.getUsers();
        if (result?.success && result?.users) {
          const users = result.users;
          const userIndex = users.findIndex(u => u.id === userId);
          if (userIndex !== -1) {
            if (accessType === 'developer') {
              users[userIndex].hasDeveloperAccess = !users[userIndex].hasDeveloperAccess;
              users[userIndex].hasGameStudioAccess = users[userIndex].hasDeveloperAccess;
              saveUserData('developerAccess', users[userIndex].hasDeveloperAccess, userId);
              saveUserData('gameStudioAccess', users[userIndex].hasGameStudioAccess, userId);
            }
            if (api?.saveUsers) {
              await api.saveUsers(users);
            }
            loadUsers();
          }
        }
      }
    } catch (error) {
      console.error('Error toggling user access:', error);
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

  const renderPublishingSection = () => {
    const requests = publishingTab === 'pending' ? pendingRequests : 
                     publishingTab === 'approved' ? approvedRequests : deniedRequests;
    const showActions = publishingTab === 'pending';

    return (
      <div>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          <button
            className={`settings-tab ${publishingTab === 'pending' ? 'active' : ''}`}
            onClick={() => setPublishingTab('pending')}
            style={{ padding: '8px 16px' }}
          >
            <Clock size={16} />
            Pending ({pendingRequests.length})
          </button>
          <button
            className={`settings-tab ${publishingTab === 'approved' ? 'active' : ''}`}
            onClick={() => setPublishingTab('approved')}
            style={{ padding: '8px 16px' }}
          >
            <CheckCircle size={16} />
            Approved ({approvedRequests.length})
          </button>
          <button
            className={`settings-tab ${publishingTab === 'denied' ? 'active' : ''}`}
            onClick={() => setPublishingTab('denied')}
            style={{ padding: '8px 16px' }}
          >
            <XCircle size={16} />
            Denied ({deniedRequests.length})
          </button>
        </div>

        {requests.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <AlertCircle size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
            <p>No requests found</p>
          </div>
        ) : (
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
                </div>
                
                {showActions && (
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
                        fontWeight: 600
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
                        fontWeight: 600
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
        )}
      </div>
    );
  };

  const renderUsersSection = () => {
    const filteredUsers = usersTab === 'all' ? allUsers :
                          usersTab === 'developers' ? allUsers.filter(u => u.hasDeveloperAccess || u.hasGameStudioAccess) :
                          allUsers.filter(u => !u.hasDeveloperAccess && !u.hasGameStudioAccess);

    return (
      <div>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          <button
            className={`settings-tab ${usersTab === 'all' ? 'active' : ''}`}
            onClick={() => setUsersTab('all')}
            style={{ padding: '8px 16px' }}
          >
            All Users ({allUsers.length})
          </button>
          <button
            className={`settings-tab ${usersTab === 'developers' ? 'active' : ''}`}
            onClick={() => setUsersTab('developers')}
            style={{ padding: '8px 16px' }}
          >
            Developers ({allUsers.filter(u => u.hasDeveloperAccess || u.hasGameStudioAccess).length})
          </button>
          <button
            className={`settings-tab ${usersTab === 'regular' ? 'active' : ''}`}
            onClick={() => setUsersTab('regular')}
            style={{ padding: '8px 16px' }}
          >
            Regular Users ({allUsers.filter(u => !u.hasDeveloperAccess && !u.hasGameStudioAccess).length})
          </button>
        </div>

        {filteredUsers.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <Users size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
            <p>No users found</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredUsers.map((user) => (
              <div
                key={user.id}
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
                      {user.name || user.username || 'Unknown User'}
                    </h3>
                    {user.hasDeveloperAccess && (
                      <span style={{
                        padding: '4px 8px',
                        background: 'rgba(16, 185, 129, 0.1)',
                        border: '1px solid #10b981',
                        borderRadius: '4px',
                        color: '#10b981',
                        fontSize: '11px',
                        fontWeight: 600
                      }}>
                        Developer
                      </span>
                    )}
                  </div>
                  {user.email && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <Mail size={16} style={{ color: 'var(--text-secondary)' }} />
                      <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                        {user.email}
                      </span>
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                      ID: {user.id}
                    </span>
                    {user.lastLoginTime && (
                      <>
                        <span style={{ color: 'var(--text-secondary)', margin: '0 8px' }}>•</span>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                          Last login: {formatDate(user.lastLoginTime)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => toggleUserAccess(user.id, 'developer')}
                    style={{
                      padding: '8px 16px',
                      background: user.hasDeveloperAccess ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                      border: `1px solid ${user.hasDeveloperAccess ? '#ef4444' : '#10b981'}`,
                      borderRadius: '8px',
                      color: user.hasDeveloperAccess ? '#ef4444' : '#10b981',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '14px',
                      fontWeight: 600
                    }}
                  >
                    {user.hasDeveloperAccess ? <Lock size={16} /> : <Unlock size={16} />}
                    {user.hasDeveloperAccess ? 'Revoke Access' : 'Grant Access'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderGamesSection = () => {
    return (
      <div>
        <div style={{ marginBottom: '24px', padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Total Games</h3>
            <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--accent-primary)' }}>
              {allGames.length}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '24px', marginTop: '16px' }}>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Published</div>
              <div style={{ fontSize: '18px', fontWeight: 600 }}>
                {allGames.filter(g => g.status !== 'draft').length}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Drafts</div>
              <div style={{ fontSize: '18px', fontWeight: 600 }}>
                {allGames.filter(g => g.status === 'draft').length}
              </div>
            </div>
          </div>
        </div>

        {allGames.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <Gamepad2 size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
            <p>No games found</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {allGames.map((game, index) => (
              <div
                key={game.gameId || game.id || index}
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
                    <Gamepad2 size={20} style={{ color: 'var(--text-secondary)' }} />
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
                      {game.name || game.gameName || 'Untitled Game'}
                    </h3>
                    {game.status && (
                      <span style={{
                        padding: '4px 8px',
                        background: game.status === 'public' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        border: `1px solid ${game.status === 'public' ? '#10b981' : '#ef4444'}`,
                        borderRadius: '4px',
                        color: game.status === 'public' ? '#10b981' : '#ef4444',
                        fontSize: '11px',
                        fontWeight: 600
                      }}>
                        {game.status}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <User size={16} style={{ color: 'var(--text-secondary)' }} />
                    <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                      Owner: {game.ownerName || 'Unknown'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                      ID: {game.gameId || game.id || 'N/A'}
                    </span>
                    {game.version && (
                      <>
                        <span style={{ color: 'var(--text-secondary)', margin: '0 8px' }}>•</span>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                          Version: {game.version}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
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
                      fontWeight: 600
                    }}
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
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
          <div style={{ fontSize: '16px', color: 'var(--text-secondary)' }}>Loading...</div>
        </div>
      </div>
    );
  }

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
          <h1>Admin Management Panel</h1>
          <p>Manage users, games, and system settings</p>
        </div>
        
        <div className="settings-content">
          <div className="settings-sidebar">
            <button
              className={`settings-tab ${activeSection === 'publishing' ? 'active' : ''}`}
              onClick={() => setActiveSection('publishing')}
            >
              <FileText size={18} />
              Game Publishing
            </button>
            <button
              className={`settings-tab ${activeSection === 'users' ? 'active' : ''}`}
              onClick={() => setActiveSection('users')}
            >
              <Users size={18} />
              User Management
            </button>
            <button
              className={`settings-tab ${activeSection === 'games' ? 'active' : ''}`}
              onClick={() => setActiveSection('games')}
            >
              <Gamepad2 size={18} />
              Game Management
            </button>
            <button
              className={`settings-tab ${activeSection === 'analytics' ? 'active' : ''}`}
              onClick={() => setActiveSection('analytics')}
            >
              <BarChart3 size={18} />
              Analytics
            </button>
            <button
              className={`settings-tab ${activeSection === 'system' ? 'active' : ''}`}
              onClick={() => setActiveSection('system')}
            >
              <Settings size={18} />
              System Settings
            </button>
          </div>
          
          <div className="settings-main">
            <div className="settings-section">
              {activeSection === 'publishing' && (
                <>
                  <h3>Game Publishing Approval</h3>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
                    Review and approve developer access requests to grant Game Studio access
                  </p>
                  {renderPublishingSection()}
                </>
              )}
              
              {activeSection === 'users' && (
                <>
                  <h3>User Management</h3>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
                    Manage all users, grant or revoke developer access
                  </p>
                  {renderUsersSection()}
                </>
              )}
              
              {activeSection === 'games' && (
                <>
                  <h3>Game Management</h3>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
                    View and manage all games published on the platform
                  </p>
                  {renderGamesSection()}
                </>
              )}
              
              {activeSection === 'analytics' && (
                <>
                  <h3>Analytics & Statistics</h3>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
                    Platform statistics and analytics
                  </p>
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <BarChart3 size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                    <p>Analytics dashboard coming soon</p>
                  </div>
                </>
              )}
              
              {activeSection === 'system' && (
                <>
                  <h3>System Settings</h3>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
                    System configuration and maintenance
                  </p>
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <Settings size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                    <p>System settings coming soon</p>
                  </div>
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
