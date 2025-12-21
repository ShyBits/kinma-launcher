import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Mail, Crown, Shield, Trash2, Edit, Check, X } from 'lucide-react';
import { getCurrentUserId, getUserData, saveUserData } from '../utils/UserDataManager';
import './GameStudio.css';

const StudioTeam = ({ navigate }) => {
  const [teamMembers, setTeamMembers] = useState([]);
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('member');
  const [editingMember, setEditingMember] = useState(null);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const userId = await getCurrentUserId();
        if (!userId) {
          navigate('/auth');
          return;
        }
      } catch (error) {
        console.error('Error checking access:', error);
      }
    };
    
    checkAccess();
    
    const handleUserChange = () => {
      checkAccess();
    };
    
    window.addEventListener('user-changed', handleUserChange);
    return () => {
      window.removeEventListener('user-changed', handleUserChange);
    };
  }, [navigate]);

  useEffect(() => {
    const loadTeamMembers = async () => {
      try {
        const userId = await getCurrentUserId();
        const savedTeam = await getUserData('studioTeam', []);
        setTeamMembers(savedTeam);
      } catch (error) {
        console.error('Error loading team members:', error);
      }
    };
    
    loadTeamMembers();
  }, []);

  const handleAddMember = async () => {
    if (!newMemberEmail.trim()) return;
    
    const newMember = {
      id: Date.now(),
      email: newMemberEmail.trim(),
      role: newMemberRole,
      status: 'pending',
      invitedAt: new Date().toISOString()
    };
    
    const updatedTeam = [...teamMembers, newMember];
    setTeamMembers(updatedTeam);
    await saveUserData('studioTeam', updatedTeam);
    
    setNewMemberEmail('');
    setNewMemberRole('member');
    setShowAddMember(false);
  };

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('Are you sure you want to remove this team member?')) return;
    
    const updatedTeam = teamMembers.filter(m => m.id !== memberId);
    setTeamMembers(updatedTeam);
    await saveUserData('studioTeam', updatedTeam);
  };

  const handleUpdateRole = async (memberId, newRole) => {
    const updatedTeam = teamMembers.map(m => 
      m.id === memberId ? { ...m, role: newRole } : m
    );
    setTeamMembers(updatedTeam);
    await saveUserData('studioTeam', updatedTeam);
    setEditingMember(null);
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'owner':
        return <Crown size={16} />;
      case 'admin':
        return <Shield size={16} />;
      default:
        return <Users size={16} />;
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'owner':
        return '#FFD700';
      case 'admin':
        return '#4a9eff';
      default:
        return 'rgba(255, 255, 255, 0.6)';
    }
  };

  return (
    <div className="studio-page">
      <div className="studio-header">
        <div className="studio-header-content">
          <h1 className="studio-title">
            <Users size={24} />
            Team
          </h1>
          <p className="studio-subtitle">Manage your studio team members and permissions</p>
        </div>
        <div className="studio-header-actions">
          <button 
            className="studio-header-action"
            onClick={() => setShowAddMember(true)}
          >
            <UserPlus size={18} />
            <span>Invite Member</span>
          </button>
        </div>
      </div>
      
      <div className="studio-content">
        <div className="team-members-section">
          <div className="team-members-header">
            <h2>Team Members</h2>
            <span className="team-count">{teamMembers.length} {teamMembers.length === 1 ? 'member' : 'members'}</span>
          </div>
          
          {teamMembers.length > 0 ? (
            <div className="team-members-list">
              {teamMembers.map((member) => (
                <div key={member.id} className="team-member-item">
                  <div className="team-member-avatar">
                    {member.email.charAt(0).toUpperCase()}
                  </div>
                  <div className="team-member-info">
                    <div className="team-member-email">{member.email}</div>
                    <div className="team-member-meta">
                      <span className="team-member-status">{member.status}</span>
                      {member.invitedAt && (
                        <>
                          <span>•</span>
                          <span>Invited {new Date(member.invitedAt).toLocaleDateString()}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="team-member-role">
                    {editingMember === member.id ? (
                      <div className="team-role-editor">
                        <select
                          value={member.role}
                          onChange={(e) => handleUpdateRole(member.id, e.target.value)}
                          className="team-role-select"
                        >
                          <option value="member">Member</option>
                          <option value="admin">Admin</option>
                          <option value="owner">Owner</option>
                        </select>
                        <button
                          className="team-role-save"
                          onClick={() => setEditingMember(null)}
                        >
                          <Check size={14} />
                        </button>
                      </div>
                    ) : (
                      <div 
                        className="team-role-badge"
                        style={{ color: getRoleColor(member.role) }}
                        onClick={() => setEditingMember(member.id)}
                      >
                        {getRoleIcon(member.role)}
                        <span>{member.role.charAt(0).toUpperCase() + member.role.slice(1)}</span>
                      </div>
                    )}
                  </div>
                  <div className="team-member-actions">
                    <button
                      className="team-action-btn"
                      onClick={() => handleRemoveMember(member.id)}
                      title="Remove member"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="team-empty-state">
              <Users size={40} />
              <p>No team members yet</p>
              <button 
                className="team-invite-btn"
                onClick={() => setShowAddMember(true)}
              >
                Invite Your First Member
              </button>
            </div>
          )}
        </div>

        {showAddMember && (
          <div className="team-add-modal-overlay" onClick={() => setShowAddMember(false)}>
            <div className="team-add-modal" onClick={(e) => e.stopPropagation()}>
              <div className="team-add-modal-header">
                <h3>Invite Team Member</h3>
                <button 
                  className="team-add-modal-close"
                  onClick={() => setShowAddMember(false)}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="team-add-modal-content">
                <div className="team-add-field">
                  <label>Email Address</label>
                  <input
                    type="email"
                    placeholder="member@example.com"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    className="team-add-input"
                  />
                </div>
                <div className="team-add-field">
                  <label>Role</label>
                  <select
                    value={newMemberRole}
                    onChange={(e) => setNewMemberRole(e.target.value)}
                    className="team-add-select"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                    <option value="owner">Owner</option>
                  </select>
                </div>
              </div>
              <div className="team-add-modal-actions">
                <button 
                  className="team-add-cancel"
                  onClick={() => setShowAddMember(false)}
                >
                  Cancel
                </button>
                <button 
                  className="team-add-submit"
                  onClick={handleAddMember}
                >
                  Send Invitation
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudioTeam;

