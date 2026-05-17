import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';

import Dashboard from './pages/Dashboard';
import Games from './pages/Games';
import Users from './pages/Users';
import Login from './pages/Login';
import { useAuth, AuthProvider } from './context/AuthContext';
import './App.css';

const ProtectedLayout = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, logout } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#0D0D1A', color: '#C8FF00' }}>
        <h2>Loading...</h2>
      </div>
    );
  }
  
  if (!user) return <Navigate to="/login" />;

  const navItems = [
    { to: '/', label: '📊 Dashboard' },
    { to: '/games', label: '🎮 Games' },
    { to: '/users', label: '👥 Users' },
  ];

  return (
    <div className="admin-container">
      {/* Mobile Header */}
      <header className="mobile-header">
        <span className="mobile-brand">PABG ADMIN</span>
        <div className="mobile-user">
          <span className="mobile-username">@{user.displayName || user.email?.split('@')[0]}</span>
          <button onClick={logout} className="mobile-logout-btn">Logout</button>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <nav className="sidebar">
        <div className="sidebar-header">
          <h2>PABG</h2>
          <p className="app-subtitle">Admin Panel</p>
          <div className="user-info">
            <p>@{user.displayName || user.email?.split('@')[0]}</p>
            <button onClick={logout} className="logout-btn">Logout</button>
          </div>
        </div>
        <ul>
          {navItems.map(item => (
            <li key={item.to}>
              <Link
                to={item.to}
                className={location.pathname === item.to ? 'active' : ''}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Main Content */}
      <main className="content">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-nav">
        {navItems.map(item => (
          <Link
            key={item.to}
            to={item.to}
            className={`mobile-nav-item ${location.pathname === item.to ? 'active' : ''}`}
          >
            <span className="mobile-nav-icon">{item.label.split(' ')[0]}</span>
            <span className="mobile-nav-label">{item.label.split(' ')[1]}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedLayout><Dashboard /></ProtectedLayout>} />
          <Route path="/games" element={<ProtectedLayout><Games /></ProtectedLayout>} />
          <Route path="/users" element={<ProtectedLayout><Users /></ProtectedLayout>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
