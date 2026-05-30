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
  const [isHovered, setIsHovered] = React.useState(false);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#0D0D1A', color: '#C8FF00' }}>
        <h2>Loading...</h2>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" />;

  const navItems = [
    { to: '/', label: 'Dashboard', icon: '📊' },
    { to: '/games', label: 'Games', icon: '🎮' },
    { to: '/users', label: 'Users', icon: '👥' },
  ];

  return (
    <div className="admin-container">
      <nav
        className={`sidebar ${isHovered ? 'expanded' : 'collapsed'}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >

        <div className="sidebar-header">
          {isHovered && (
            <>
              <h2>PABG</h2>
              <p className="app-subtitle">Admin Panel</p>
            </>
          )}
        </div>

        <ul>
          {navItems.map(item => (
            <li key={item.to}>
              <Link
                to={item.to}
                className={location.pathname === item.to ? 'active' : ''}
              >
                <span className="nav-icon">{item.icon}</span>
                {isHovered && <span className="nav-label">{item.label}</span>}
              </Link>
            </li>
          ))}
        </ul>

        {/* User info moved here – below navigation, above logout */}
        <div className="user-info">
          {isHovered && <p>@{user.displayName || user.email?.split('@')[0]}</p>}
        </div>

        <button onClick={() => { if (window.confirm('Are you sure you want to logout?')) logout(); }} className="logout-btn">
          <span className="nav-icon">❌</span>
          {isHovered && <span className="nav-label">Logout</span>}
        </button>
      </nav>
      <main className="content">
        {children}
      </main>
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
