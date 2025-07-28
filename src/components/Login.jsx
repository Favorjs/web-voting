import { useState } from 'react';
import { FaVoteYea, FaSignInAlt, FaEnvelope, FaPhone, FaHeadphones } from 'react-icons/fa';
import './Login.css';
import { API_URL } from '../config';

export default function LoginPage({ onLogin }) {
  const [identifier, setIdentifier] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inputIcon, setInputIcon] = useState(<FaEnvelope />);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setIdentifier(value);
    
    // Auto-detect input type
    if (/@/.test(value)) {
      setInputIcon(<FaEnvelope />);
    } else if (/^[\d+() -]+$/.test(value)) {
      setInputIcon(<FaPhone />);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    

    
    try {
      const response = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier }),
        credentials: 'include'
      });
      if (response.status === 409) {
        const data = await response.json();
        setError(data.error || 'User is already logged in elsewhere. Please sign out from the other device/browser first.');
        setIsSubmitting(false);
        return;
      }
      const data = await response.json();
      if (data.success) {
        onLogin(data.message.replace('Welcome ', ''));
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('Error connecting to server');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-container">
      <header className="login-header">
        <div className="header-content">
          <div className="logo">
            <FaVoteYea className="logo-icon" />
            <span>E-Voting System</span>
          </div>
          <nav className="main-nav">
            <a href="https://wa.me/2347046126698" className="nav-link"><FaHeadphones /> Support</a>
          </nav>
        </div>
      </header>
  
      <main className="login-main wide-layout">
        <div className="login-card">
          <div className="card-header">
            <div className="icon-circle">
              <FaSignInAlt className="login-icon" />
            </div>
            <p className="subtext">Enter your email or phone number to access the voting portal</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="input-container">
              <div className="form-group smart-input">
                <input
                  id="identifier"
                  type="text"
                  value={identifier}
                  onChange={handleInputChange}
                  placeholder="Email or phone number"
                  required
                  className="smart-input-field"
                />
                <div className="input-hint">
                  {/@/.test(identifier) ? 'your.email@example.com' : '+234 (123) 456-7890'}
                </div>
              </div>
            </div>

            {error && (
              <div className="error-message">
                <p>{error}</p>
              </div>
            )}

            <button type="submit" className="login-button" disabled={isSubmitting}>
              {isSubmitting ? (
                <span className="spinner"></span>
              ) : (
                <>
                  <FaSignInAlt className="button-icon" />
                  <span>Continue to Voting</span>
                </>
              )}
            </button>
          </form>
        </div>
      </main>

      <footer className="login-footer">
        <div className="footer-content">
          <p>&copy; {new Date().getFullYear()} E-Voting System. All rights reserved. Apel Capital Registrars Limited</p>
        </div>
      </footer>
    </div>
  );
}