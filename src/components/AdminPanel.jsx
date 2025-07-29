import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import ResolutionForm from './ResolutionManager';
import './AdminPanel.css';
import { useParams } from 'react-router-dom';
import { API_URL } from '../config';
import { useProxy } from '../contexts/ProxyContext';

const socket = io(API_URL);
export default function AdminPanel() {
  const { proxyEnabled, setProxyEnabled } = useProxy();
  const [resolutions, setResolutions] = useState([]);
  const [activeResolution, setActiveResolution] = useState(null);
  const [votingState, setVotingState] = useState({ isOpen: false, type: null });
  const [showResolutionForm, setShowResolutionForm] = useState(false);
  const [editingResolution, setEditingResolution] = useState(null);
  const { tab } = useParams();
  const [showAuditCommittee, setShowAuditCommittee] = useState(tab === 'audit-committee');
  const [auditMembers, setAuditMembers] = useState([]);
  const [activeAuditMember, setActiveAuditMember] = useState(null);
  const [showAuditForm, setShowAuditForm] = useState(false);
  const [editingAuditMember, setEditingAuditMember] = useState(null);

  useEffect(() => {
    fetchResolutions();
    fetchVotingState();
    fetchAuditCommittee();

    socket.on('voting-state', (state) => {
      setVotingState(state);
    });

    socket.on('resolution-update', (res) => {
      setActiveResolution(res);
    });

    socket.on('audit-member-updated', (member) => {
      setActiveAuditMember(member);
    });

    return () => {
      socket.off('voting-state');
      socket.off('resolution-update');
      socket.off('audit-member-updated');
    };
  }, []);

  useEffect(() => {
    if (showAuditCommittee) {
      fetchAuditCommittee();
    } else {
      fetchResolutions();
    }
  }, [showAuditCommittee]);

  const fetchResolutions = async () => {
    try {
      const res = await fetch(`${API_URL}/api/resolutions`);
      const data = await res.json();
      setResolutions(data);
      const active = data.find(r => r.isActive);
      setActiveResolution(active || null);
    } catch (error) {
      console.error('Error fetching resolutions:', error);
    }
  };

  const fetchAuditCommittee = async () => {
    try {
      const res = await fetch(`${API_URL}/api/audit-committee`);
      const data = await res.json();
      setAuditMembers(data);
      const active = data.find(m => m.isActive);
      setActiveAuditMember(active || null);
    } catch (error) {
      console.error('Error fetching audit committee:', error);
    }
  };

  const fetchVotingState = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/voting/state`);
      const data = await res.json();
      setVotingState(data);
    } catch (error) {
      console.error('Error fetching voting state:', error);
    }
  };

  const activateResolution = async (id) => {
    try {
      // First deactivate any active audit member
      await fetch(`${API_URL}/api/admin/audit-committee/deactivate-all`, {
        method: 'POST'
      });

      // Then activate the resolution
      const res = await fetch(`${API_URL}/api/admin/resolutions/${id}/activate`, {
        method: 'PUT'
      });
      
      if (res.ok) {
        const updated = await res.json();
        setActiveResolution(updated);
        setActiveAuditMember(null);
        socket.emit('resolution-activated', updated);
      }
    } catch (error) {
      console.error('Error activating resolution:', error);
    }
  };

  const activateAuditMember = async (id) => {
    try {
      // First deactivate any active resolution
      await fetch('${API_URL}/api/admin/resolutions/close', {
        method: 'POST'
      });

      // Then activate the audit member
      const res = await fetch(`${API_URL}/api/admin/audit-committee/${id}/activate`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });
      
      if (res.ok) {
        const updated = await res.json();
        setActiveAuditMember(updated);
        setActiveResolution(null);
        socket.emit('audit-member-activated', updated);
      }
    } catch (error) {
      console.error('Error activating audit member:', error);
    }
  };

  const closeCurrent = async () => {
    try {
      if (activeResolution) {
        await fetch(`${API_URL}/api/admin/resolutions/close`, { 
          method: 'POST' 
        });
        setActiveResolution(null);
      } else if (activeAuditMember) {
        await fetch(`${API_URL}/api/admin/audit-committee/${activeAuditMember.id}/deactivate`, {
          method: 'PUT'
        });
        setActiveAuditMember(null);
      }
    } catch (error) {
      console.error('Error closing current:', error);
    }
  };

  const endAGM = async () => {
    try {
      await fetch(`${API_URL}/api/admin/agm/end`, { method: 'POST' });
      alert('AGM ended - thank you message sent to all voters');
    } catch (err) {
      console.error('Failed to end AGM:', err);
    }
  };

  const toggleVoting = async () => {
    const activeId = showAuditCommittee ? activeAuditMember?.id : activeResolution?.id;
    if (!activeId) return;
  
    try {
      const type = showAuditCommittee ? 'audit' : 'resolution';
  
      const res = await fetch(`${API_URL}/api/admin/voting/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, activeId })
      });
  
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Failed to toggle voting');
        return;
      }
  
      // Optional: refresh local copy
      const state = await res.json();      // { isOpen, type }
      setVotingState(state);               // updates UI
    } catch (e) {
      console.error(e);
      alert('Error toggling voting');
    }
  };
  const deleteResolution = async (id) => {
    if (!window.confirm('Are you sure you want to delete this resolution?')) return;
    try {
      await fetch(`${API_URL}/api/resolutions/${id}`, { method: 'DELETE' });
      fetchResolutions();
    } catch (error) {
      console.error('Error deleting resolution:', error);
    }
  };

  const deleteAuditMember = async (id) => {
    if (!window.confirm('Are you sure you want to delete this committee member?')) return;
    try {
      await fetch(`${API_URL}/api/audit-committee/${id}`, { method: 'DELETE' });
      fetchAuditCommittee();
    } catch (error) {
      console.error('Error deleting audit member:', error);
    }
  };

  const handleTabChange = (showAudit) => {
    setShowAuditCommittee(showAudit);
    window.history.pushState(null, '', showAudit ? '/admin/audit-committee' : '/admin');
  };

  const handleAuditFormSubmit = async (formData) => {
    try {
      const url = editingAuditMember 
        ? `${API_URL}/api/audit-committee/${editingAuditMember.id}`
        : `${API_URL}/api/audit-committee`;
      const method = editingAuditMember ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Failed to save committee member');
      }

      setShowAuditForm(false);
      fetchAuditCommittee();
    } catch (error) {
      console.error('Error saving committee member:', error);
      alert(error.message);
    }
  };

  return (
    <div className="admin-panel">
      <h1>Voting Control Panel</h1>
      <div className="panel-header">
        <div className="admin-tabs">
          <button 
            onClick={() => handleTabChange(false)}
            className={`tab-btn ${!showAuditCommittee ? 'active' : ''}`}
          >
            Resolutions
          </button>
          <button 
            onClick={() => handleTabChange(true)}
            className={`tab-btn ${showAuditCommittee ? 'active' : ''}`}
          >
            Audit Committee
          </button>
        </div>
        
        {!showAuditCommittee ? (
          <button 
            onClick={() => { setEditingResolution(null); setShowResolutionForm(true); }}
            className="add-resolution-btn"
          >
            Add New Resolution
          </button>
        ) : (
          <button 
            onClick={() => { setEditingAuditMember(null); setShowAuditForm(true); }}
            className="add-resolution-btn"
          >
            Add Committee Member
          </button>
        )}
      </div>

      {showResolutionForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button 
              className="close-btn" 
              onClick={() => setShowResolutionForm(false)}
            >
              ×
            </button>
            <ResolutionForm 
              resolution={editingResolution}
              onSuccess={() => {
                setShowResolutionForm(false);
                fetchResolutions();
              }}
              onCancel={() => setShowResolutionForm(false)} 
            />
          </div>
        </div>
      )}

      {showAuditForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button 
              className="close-btn" 
              onClick={() => setShowAuditForm(false)}
            >
              ×
            </button>
            <div className="audit-form">
              <h2>{editingAuditMember ? 'Edit Committee Member' : 'Add Committee Member'}</h2>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = {
                  name: e.target.name.value,
                  bio: e.target.bio.value
                };
                handleAuditFormSubmit(formData);
              }}>
                <div className="form-group">
                  <label>Name *</label>
                  <input
                    type="text"
                    name="name"
                    defaultValue={editingAuditMember?.name || ''}
                    required
                    minLength="3"
                  />
                </div>
                <div className="form-group">
                  <label>Bio</label>
                  <textarea
                    name="bio"
                    defaultValue={editingAuditMember?.bio || ''}
                    rows={4}
                  />
                </div>
                <button type="submit">Save</button>
                <button 
                  type="button" 
                  className="cancel-btn" 
                  onClick={() => setShowAuditForm(false)}
                >
                  Cancel
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      <div className="active-resolution-controls">
        {(activeResolution || activeAuditMember) && (
          <div className="resolution-controls">
            <button 
              onClick={closeCurrent}
              className="close-resolution-btn"
            >
              Close {showAuditCommittee ? 'Election' : 'Resolution'}
            </button>
            <button
              onClick={toggleVoting}
              className={`voting-toggle-btn ${votingState.isOpen ? 'open' : 'closed'}`}
            >
              {votingState.isOpen ? 'Close Voting' : 'Open Voting'}
            </button>
            <button
              onClick={endAGM}
              className="end-agm-btn"
            >
              End AGM
            </button>
          </div>
        )}
      </div>

      {!showAuditCommittee ? (
        <div className="resolution-list">
          <h3>Available Resolutions</h3>
          {resolutions.map((res) => (
            <div
              key={res.id}
              className={`resolution-item ${activeResolution?.id === res.id ? 'active' : ''}`}
            >
              <h4>{res.title}</h4>
              <p>{res.description}</p>
              <div className="resolution-actions">
                {activeResolution?.id !== res.id && (
                  <button onClick={() => activateResolution(res.id)}>Activate</button>
                )}
                <button onClick={() => { setEditingResolution(res); setShowResolutionForm(true); }}>Edit</button>
                <button onClick={() => deleteResolution(res.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="resolution-list">
          <h3>Audit Committee Members</h3>
          {auditMembers.map((member) => (
            <div
              key={member.id}
              className={`resolution-item ${activeAuditMember?.id === member.id ? 'active' : ''}`}
            >
              <h4>{member.name}</h4>
              <p>{member.bio}</p>
              <p>Votes: {member.votesFor || 0}</p>
              <div className="resolution-actions">
                {activeAuditMember?.id !== member.id && (
                  <button onClick={() => activateAuditMember(member.id)}>Activate</button>
                )}
                <button onClick={() => { setEditingAuditMember(member); setShowAuditForm(true); }}>Edit</button>
                <button onClick={() => deleteAuditMember(member.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="proxy-toggle-buttons">
        <button onClick={() => setProxyEnabled(false)}>
          Disable Proxy Votes and Holdings
        </button>
        <button onClick={() => setProxyEnabled(true)}>
          Enable Proxy Votes and Holdings
        </button>
      </div>
      <p>
        Proxy Votes and Holdings are <b>{proxyEnabled ? 'Enabled' : 'Disabled'}</b>
      </p>
    </div>
  );
}