import { useState, useEffect } from 'react';
import { FaSignOutAlt, FaVoteYea, FaCheck, FaTimes, FaHandPaper, FaThumbsUp } from 'react-icons/fa';
import { io } from 'socket.io-client';
import './VotingPage.css';
import { API_URL } from '../config';

const socket = io(API_URL);
export default function VotingPage({ userName, onLogout }) {
  const [thankYouMsg, setThankYouMsg] = useState(null);
  const [activeResolution, setActiveResolution] = useState(null);
  const [activeAuditMember, setActiveAuditMember] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const formatTime = (s) => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
  const [votingState, setVotingState] = useState({ isOpen: false, type: null });
  const [hasVoted, setHasVoted] = useState(false);
  const [hasVotedAudit, setHasVotedAudit] = useState(false);
  const [auditVotesLeft, setAuditVotesLeft] = useState(3); // 3 votes per user
  const [voteCounts, setVoteCounts] = useState({ yes: 0, no: 0 });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuthAndFetchData = async () => {
      try {
        const authCheck = await fetch(`${API_URL}/api/check-vote`, {
          method: 'GET',
          credentials: 'include'
        });

        if (authCheck.status === 401) {
          setError('Session expired. Please login again.');
          setIsLoading(false);
          return;
        }

        await fetchActiveResolution();
        await fetchActiveAuditMember();
        await checkVoteStatus();
        setIsLoading(false);
      } catch (err) {
        console.error('Initialization error:', err);
        setError('Failed to initialize voting page');
        setIsLoading(false);
      }
    };

    checkAuthAndFetchData();

    socket.on('voting-state', (state) => {
      setVotingState(state);
      if (!state.isOpen) {
        setActiveResolution(null);
        setActiveAuditMember(null);
      } else if (state.type === 'resolution') {
        fetchActiveResolution();
        setActiveAuditMember(null);
      } else if (state.type === 'audit') {
        fetchActiveAuditMember();
        setActiveResolution(null);
      }
    });

    socket.on('resolution-update', (res) => {
      setActiveResolution(res);
      if (res) checkVoteStatus();
    });

    socket.on('audit-member-updated', (member) => {
      setActiveAuditMember(member);
      if (member) checkAuditVoteStatus();
    });

    socket.on('vote-updated', ({ yes, no }) => {
      setVoteCounts({ yes, no });
    });

    socket.on('agm-finished', ({ message }) => {
      setThankYouMsg(message);
      // Clear all voting data when AGM ends
      setActiveResolution(null);
      setActiveAuditMember(null);
      setVotingState({ isOpen: false, type: null });
      setTimeLeft(0);
      setHasVoted(false);
      setHasVotedAudit(false);
    });

    return () => {
      socket.off('voting-state');
      socket.off('resolution-update');
      socket.off('audit-member-updated');
      socket.off('vote-updated');
      socket.off('agm-finished');
    };
  }, []);

  useEffect(() => {
    if (!votingState.isOpen || !(activeResolution || activeAuditMember)) {
      setTimeLeft(0);
      return;
    }
    setTimeLeft(60);
    const int = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(int); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(int);
  }, [votingState.isOpen, activeResolution, activeAuditMember]);

  const fetchActiveResolution = async () => {
    const res = await fetch(`${API_URL}/api/active-resolution`);
    const json = await res.json();
    const resolution = json?.success !== undefined ? json.data : json;
    setActiveResolution(resolution || null);
  };

  const fetchActiveAuditMember = async () => {
    const res = await fetch(`${API_URL}/api/audit-committee/active`);
    if (res.ok) {
      const data = await res.json();
      setActiveAuditMember(data);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/api/logout`, {
        method: 'POST',
        credentials: 'include'
      });
      onLogout();
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const checkVoteStatus = async () => {
    const res = await fetch(`${API_URL}/api/check-vote`, {
      credentials: 'include'
    });
    const data = await res.json();
    setHasVoted(data.hasVoted);
  };

  const checkAuditVoteStatus = async () => {
    const res = await fetch(`${API_URL}/api/check-audit-vote`, {
      credentials: 'include'
    });
    const data = await res.json();
    setHasVotedAudit(data.hasVoted);
    if (data.totalVotes !== undefined) {
      setAuditVotesLeft(Math.max(0, 3 - data.totalVotes));
    }
  };

  const handleVote = async (decision) => {
    if (!votingState.isOpen || !activeResolution || hasVoted) return;
  
    try {
      setIsSubmitting(true);
      const response = await fetch(`${API_URL}/api/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          resolutionId: activeResolution.id,
          decision
        })
      });
  
      if (!response.ok) {
        let errMsg = 'Failed to submit vote';
        try {
          const errJson = await response.json();
          if (errJson?.error) errMsg = errJson.error;
        } catch (e) {}
        throw new Error(errMsg);
      }
      setHasVoted(true);
    } catch (error) {
      setError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAuditVote = async () => {
    if (!votingState.isOpen || !activeAuditMember || auditVotesLeft === 0 || hasVotedAudit) return;
    
    try {
      setIsSubmitting(true);
      const response = await fetch(`${API_URL}/api/audit-vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ committeeId: activeAuditMember.id })
      });
      
      if (!response.ok) {
        let errMsg = 'Failed to submit vote';
        try {
          const errJson = await response.json();
          if (errJson?.error) errMsg = errJson.error;
        } catch (e) {}
        throw new Error(errMsg);
      }
      setHasVotedAudit(true);
      setAuditVotesLeft(prev => Math.max(0, prev - 1));
    } catch (error) {
      setError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading voting session...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-message">
          <h3>{error}</h3>
          <button onClick={handleLogout} className="back-button">
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  // Show only thank you message if AGM has ended
  if (thankYouMsg) {
    return (
      <div className="voting-page">
        <div className="thankyou-banner" style={{
          backgroundColor: '#4CAF50',
          color: 'white',
          padding: '30px',
          textAlign: 'center',
          fontSize: '24px',
          fontWeight: 'bold',
          minHeight: '200px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {thankYouMsg}
        </div>
      </div>
    );
  }

  if (!activeResolution && !activeAuditMember) {
    return (
      <div className="no-resolution">
        <div className="no-resolution-content">
          <h3>No active voting session</h3>
          <p>There are currently no active resolutions or committee elections.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="voting-page">
      {thankYouMsg && (
        <div className="thankyou-banner" style={{
          backgroundColor: '#4CAF50',
          color: 'white',
          padding: '15px',
          textAlign: 'center',
          fontSize: '18px',
          fontWeight: 'bold',
          marginBottom: '20px'
        }}>
          {thankYouMsg}
        </div>
      )}
      <div className="voting-container">
      <header className="voting-header">
        <div className="header-content">
          <div className="logo-section">
            <img src="/favicon.png" alt="E-Voting Logo" className="logo-image" />
            <h1>E-Voting Platform</h1>
          </div>
          <div className="user-section">
            <span className="username">{userName}</span>
            <button onClick={handleLogout} className="logout-button">
              <FaSignOutAlt /> Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="voting-main">
        {activeAuditMember ? (
          <div className={`resolution-card ${votingState.isOpen ? 'voting-open' : ''}`}>
            <div className="card-header">
              <h2>Audit Committee Election</h2>
              {votingState.isOpen && (
                <span className="voting-status open">
                  Voting Open ({formatTime(timeLeft)})
                </span>
              )}
            </div>
            
            <div className="resolution-content">
              <h3>{activeAuditMember.name}</h3>
              <p>{activeAuditMember.bio}</p>
            </div>

            {votingState.isOpen && (
              <div className="voting-interface">
                {auditVotesLeft === 0 ? (
                  <button className="vote-btn audit-btn exhausted" disabled style={{backgroundColor:'#f44336'}}>
                    You have voted 3 times, voting power exhausted
                  </button>
                ) : hasVotedAudit ? (
                  <div className="vote-confirmation">
                    <FaCheck className="confirmation-icon" />
                    <h3>Thank you for voting!</h3>
                    
                  </div>
                ) : (
                  <div className="vote-buttons">
                    <button 
                      className="vote-btn audit-btn"
                      onClick={handleAuditVote}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Submitting...' : (
                        <>
                         <FaHandPaper /> Vote for Candidate
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className={`resolution-card ${votingState.isOpen ? 'voting-open' : ''}`}>
            <div className="card-header">
              <h2>{activeResolution.title}</h2>
              {votingState.isOpen && (
                <span className="voting-status open">
                  Voting Open ({formatTime(timeLeft)})
                </span>
              )}
            </div>
            
            <div className="resolution-content">
              <p>{activeResolution.description}</p>
            </div>

            {votingState.isOpen && (
              <div className="voting-interface">
                {hasVoted ? (
                  <div className="vote-confirmation">
                    <FaCheck className="confirmation-icon" />
                    <h3>Thank you for voting!</h3>
                    
                  </div>
                ) : (
                  <div className="vote-buttons">
                    <button 
                      className="vote-btn yes-btn"
                      onClick={() => handleVote(true)}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Submitting...' : (
                        <>
                          <FaCheck /> For
                        </>
                      )}
                    </button>
                    <button 
                      className="vote-btn no-btn"
                      onClick={() => handleVote(false)}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Submitting...' : (
                        <>
                          <FaTimes /> Against
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="voting-footer">
        <p>&copy; {new Date().getFullYear()} E-Voting System. All rights reserved.</p>
      </footer>
      </div>
    </div>
  );
}