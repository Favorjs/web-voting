import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './components/Login';
import LandingPage from './components/LandingPage';
import VotingPage from './components/VotingPage';
import Results from './components/Results';
import AdminPanel from './components/AdminPanel';
// import SummaryPage from './components/summaryPage';
import ResultsPage from './components/ResultsPage';

export default function App() {
  const [user, setUser] = useState(null);
  const [currentPage, setCurrentPage] = useState('login');

  const handleLogin = (userName) => {
    setUser(userName);
    setCurrentPage('landing');
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { credentials: 'include' });
      setUser(null);
      setCurrentPage('login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <Router>
      <div className="app">
        <Routes>
          {/* <Route path="/summary" element={<SummaryPage />} />
           */}
          {/* Admin routes */}
          <Route path="/adminPa$$w0rd!" element={<AdminPanel />} />
          <Route path="/adminPa$$w0rd!/:tab?" element={<AdminPanel />} />
          
          <Route path="/resultsPa$$w0rd!" element={<ResultsPage />} />
          
          {/* Main app flow */}
          <Route path="/" element={
            currentPage === 'login' ? <Login onLogin={handleLogin} /> :
            currentPage === 'landing' ? <LandingPage userName={user} onLogout={handleLogout} onStartVoting={() => setCurrentPage('voting')} /> :
            currentPage === 'voting' ? <VotingPage userName={user} onLogout={handleLogout} onVoteComplete={() => setCurrentPage('results')} /> :
            <Results onLogout={handleLogout} />
          } />
        </Routes>
      </div>
    </Router>
  );
}