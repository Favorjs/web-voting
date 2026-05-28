import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import ResolutionForm from './ResolutionManager';
import './AdminPanel.css';
import { useParams } from 'react-router-dom';
import { API_URL } from '../config';

const socket = io(API_URL);

export default function AdminPanel({ adminUser, onAdminLogout }) {
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
  const [proxyEdits, setProxyEdits] = useState({});

  useEffect(() => {
    fetchResolutions();
    fetchVotingState();
    fetchAuditCommittee();

    socket.on('voting-state', (state) => setVotingState(state));
    socket.on('resolution-update', (res) => setActiveResolution(res));
    socket.on('audit-member-updated', (member) => setActiveAuditMember(member));

    return () => {
      socket.off('voting-state');
      socket.off('resolution-update');
      socket.off('audit-member-updated');
    };
  }, []);

  useEffect(() => {
    if (showAuditCommittee) fetchAuditCommittee();
    else fetchResolutions();
  }, [showAuditCommittee]);

  const fetchResolutions = async () => {
    try {
      const res = await fetch(`${API_URL}/api/resolutions`, { credentials: 'include' });
      const data = await res.json();
      setResolutions(data);
      setActiveResolution(data.find(r => r.isActive) || null);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAuditCommittee = async () => {
    try {
      const res = await fetch(`${API_URL}/api/audit-committee`, { credentials: 'include' });
      const data = await res.json();
      setAuditMembers(data);
      setActiveAuditMember(data.find(m => m.isActive) || null);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchVotingState = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/voting/state`, { credentials: 'include' });
      const data = await res.json();
      setVotingState(data);
    } catch (err) {
      console.error(err);
    }
  };

  const activateResolution = async (id) => {
    try {
      await fetch(`${API_URL}/api/admin/audit-committee/deactivate-all`, { method: 'POST', credentials: 'include' });
      const res = await fetch(`${API_URL}/api/admin/resolutions/${id}/activate`, { method: 'PUT', credentials: 'include' });
      if (res.ok) {
        const updated = await res.json();
        setActiveResolution(updated);
        setActiveAuditMember(null);
        socket.emit('resolution-activated', updated);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const activateAuditMember = async (id) => {
    try {
      await fetch(`${API_URL}/api/admin/resolutions/close`, { method: 'POST', credentials: 'include' });
      const res = await fetch(`${API_URL}/api/admin/audit-committee/${id}/activate`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      if (res.ok) {
        const updated = await res.json();
        setActiveAuditMember(updated);
        setActiveResolution(null);
        socket.emit('audit-member-activated', updated);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const closeCurrent = async () => {
    try {
      if (activeResolution) {
        await fetch(`${API_URL}/api/admin/resolutions/close`, { method: 'POST', credentials: 'include' });
        setActiveResolution(null);
      } else if (activeAuditMember) {
        await fetch(`${API_URL}/api/admin/audit-committee/${activeAuditMember.id}/deactivate`, {
          method: 'PUT', credentials: 'include'
        });
        setActiveAuditMember(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const endAGM = async () => {
    if (!window.confirm('End the AGM and send a thank-you message to all voters?')) return;
    try {
      await fetch(`${API_URL}/api/admin/agm/end`, { method: 'POST', credentials: 'include' });
    } catch (err) {
      console.error(err);
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
        credentials: 'include',
        body: JSON.stringify({ type, activeId })
      });
      if (res.ok) setVotingState(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  const saveProxyVotes = async (id) => {
    const value = proxyEdits[id];
    if (value === undefined || value === '') return;
    try {
      await fetch(`${API_URL}/api/admin/resolutions/${id}/proxy`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ proxyVotes: Number(value) })
      });
      fetchResolutions();
      setProxyEdits(prev => { const n = { ...prev }; delete n[id]; return n; });
    } catch (err) {
      console.error(err);
    }
  };

  const deleteResolution = async (id) => {
    if (!window.confirm('Delete this resolution?')) return;
    try {
      await fetch(`${API_URL}/api/resolutions/${id}`, { method: 'DELETE', credentials: 'include' });
      fetchResolutions();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteAuditMember = async (id) => {
    if (!window.confirm('Delete this committee member?')) return;
    try {
      await fetch(`${API_URL}/api/audit-committee/${id}`, { method: 'DELETE', credentials: 'include' });
      fetchAuditCommittee();
    } catch (err) {
      console.error(err);
    }
  };

  const handleTabChange = (showAudit) => {
    setShowAuditCommittee(showAudit);
    window.history.pushState(null, '', showAudit ? '/admin/audit-committee' : '/admin');
  };

  const handleAdminLogout = async () => {
    try {
      await fetch(`${API_URL}/api/admin/auth/logout`, { method: 'POST', credentials: 'include' });
    } catch (err) {}
    onAdminLogout();
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
        credentials: 'include',
        body: JSON.stringify(formData)
      });
      if (!response.ok) throw new Error('Failed to save');
      setShowAuditForm(false);
      fetchAuditCommittee();
    } catch (err) {
      alert(err.message);
    }
  };

  const activeItem = showAuditCommittee ? activeAuditMember : activeResolution;
  const activeLabel = showAuditCommittee ? 'Audit Election' : 'Resolution';

  return (
    <div className="ap-root">
      <header className="ap-header">
        <div className="ap-header-inner">
          <div className="ap-brand">
            <img src="/logo.png" alt="APEL" className="ap-logo" />
            <span className="ap-title">Voting Control Panel</span>
          </div>
          <div className="ap-header-right">
            <span className="ap-admin-badge">{adminUser}</span>
            <button onClick={handleAdminLogout} className="ap-logout-btn">Sign Out</button>
          </div>
        </div>
      </header>

      <main className="ap-main">
        <div className="ap-toolbar">
          <div className="ap-tabs">
            <button className={`ap-tab ${!showAuditCommittee ? 'active' : ''}`} onClick={() => handleTabChange(false)}>
              Resolutions
            </button>
            <button className={`ap-tab ${showAuditCommittee ? 'active' : ''}`} onClick={() => handleTabChange(true)}>
              Audit Committee
            </button>
          </div>
          <button
            className="ap-add-btn"
            onClick={() => {
              if (showAuditCommittee) { setEditingAuditMember(null); setShowAuditForm(true); }
              else { setEditingResolution(null); setShowResolutionForm(true); }
            }}
          >
            + {showAuditCommittee ? 'Add Member' : 'Add Resolution'}
          </button>
        </div>

        {activeItem && (
          <div className="ap-active-bar">
            <div className="ap-active-info">
              <span className="ap-active-dot" />
              <span>Active {activeLabel}: <strong>{activeItem.title || activeItem.name}</strong></span>
            </div>
            <div className="ap-active-actions">
              <button onClick={closeCurrent} className="ap-btn ap-btn-danger">
                Close {activeLabel}
              </button>
              <button
                onClick={toggleVoting}
                className={`ap-btn ${votingState.isOpen ? 'ap-btn-warning' : 'ap-btn-success'}`}
              >
                {votingState.isOpen ? 'Close Voting' : 'Open Voting'}
              </button>
              <button onClick={endAGM} className="ap-btn ap-btn-dark">
                End AGM
              </button>
            </div>
          </div>
        )}

        {!showAuditCommittee ? (
          <div className="ap-list">
            {resolutions.length === 0 && (
              <div className="ap-empty">No resolutions yet. Add one to get started.</div>
            )}
            {resolutions.map(res => (
              <div key={res.id} className={`ap-card ${activeResolution?.id === res.id ? 'ap-card-active' : ''}`}>
                <div className="ap-card-top">
                  {activeResolution?.id === res.id && <span className="ap-status-badge active">Active</span>}
                  <h3 className="ap-card-title">{res.title}</h3>
                  <p className="ap-card-desc">{res.description}</p>
                </div>

                <div className="ap-proxy-row">
                  <span className="ap-proxy-label">Proxy Votes</span>
                  <div className="ap-proxy-control">
                    <input
                      type="number"
                      min="0"
                      className="ap-proxy-input"
                      value={proxyEdits[res.id] !== undefined ? proxyEdits[res.id] : (res.proxyVotes || 0)}
                      onChange={e => setProxyEdits(prev => ({ ...prev, [res.id]: e.target.value }))}
                    />
                    <button
                      className="ap-btn ap-btn-sm ap-btn-primary"
                      onClick={() => saveProxyVotes(res.id)}
                      disabled={proxyEdits[res.id] === undefined}
                    >
                      Save
                    </button>
                  </div>
                </div>

                <div className="ap-card-actions">
                  {activeResolution?.id !== res.id && (
                    <button className="ap-btn ap-btn-sm ap-btn-primary" onClick={() => activateResolution(res.id)}>
                      Activate
                    </button>
                  )}
                  <button className="ap-btn ap-btn-sm ap-btn-outline" onClick={() => { setEditingResolution(res); setShowResolutionForm(true); }}>
                    Edit
                  </button>
                  <button className="ap-btn ap-btn-sm ap-btn-danger-outline" onClick={() => deleteResolution(res.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="ap-list">
            {auditMembers.length === 0 && (
              <div className="ap-empty">No committee members yet.</div>
            )}
            {auditMembers.map(member => (
              <div key={member.id} className={`ap-card ${activeAuditMember?.id === member.id ? 'ap-card-active' : ''}`}>
                <div className="ap-card-top">
                  {activeAuditMember?.id === member.id && <span className="ap-status-badge active">Active</span>}
                  <h3 className="ap-card-title">{member.name}</h3>
                  {member.bio && <p className="ap-card-desc">{member.bio}</p>}
                  <p className="ap-votes-count">Votes: <strong>{member.votesFor || 0}</strong></p>
                </div>
                <div className="ap-card-actions">
                  {activeAuditMember?.id !== member.id && (
                    <button className="ap-btn ap-btn-sm ap-btn-primary" onClick={() => activateAuditMember(member.id)}>
                      Activate
                    </button>
                  )}
                  <button className="ap-btn ap-btn-sm ap-btn-outline" onClick={() => { setEditingAuditMember(member); setShowAuditForm(true); }}>
                    Edit
                  </button>
                  <button className="ap-btn ap-btn-sm ap-btn-danger-outline" onClick={() => deleteAuditMember(member.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showResolutionForm && (
        <div className="ap-modal-overlay" onClick={() => setShowResolutionForm(false)}>
          <div className="ap-modal" onClick={e => e.stopPropagation()}>
            <button className="ap-modal-close" onClick={() => setShowResolutionForm(false)}>×</button>
            <ResolutionForm
              resolution={editingResolution}
              onSuccess={() => { setShowResolutionForm(false); fetchResolutions(); }}
              onCancel={() => setShowResolutionForm(false)}
            />
          </div>
        </div>
      )}

      {showAuditForm && (
        <div className="ap-modal-overlay" onClick={() => setShowAuditForm(false)}>
          <div className="ap-modal" onClick={e => e.stopPropagation()}>
            <button className="ap-modal-close" onClick={() => setShowAuditForm(false)}>×</button>
            <h2 className="ap-modal-title">{editingAuditMember ? 'Edit Member' : 'Add Member'}</h2>
            <form
              onSubmit={e => {
                e.preventDefault();
                handleAuditFormSubmit({ name: e.target.name.value, bio: e.target.bio.value });
              }}
              className="ap-audit-form"
            >
              <div className="ap-field">
                <label>Name *</label>
                <input type="text" name="name" defaultValue={editingAuditMember?.name || ''} required minLength="3" />
              </div>
              <div className="ap-field">
                <label>Bio</label>
                <textarea name="bio" defaultValue={editingAuditMember?.bio || ''} rows={4} />
              </div>
              <div className="ap-form-actions">
                <button type="submit" className="ap-btn ap-btn-primary">Save</button>
                <button type="button" className="ap-btn ap-btn-outline" onClick={() => setShowAuditForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
