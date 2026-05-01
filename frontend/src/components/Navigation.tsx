import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/authContext';
import '../styles/navigation.css';

export function Navigation() {
  const { user, logout, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!isAuthenticated) {
    return null;
  }

  const isActive = (path: string) => {
    return location.pathname === path ? 'active' : '';
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/dashboard" className="navbar-brand">
          💰 Fenmo Ai
        </Link>

        <button
          className={`mobile-menu-toggle ${mobileMenuOpen ? 'open' : ''}`}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        <div className={`navbar-menu ${mobileMenuOpen ? 'open' : ''}`}>
          <div className="navbar-nav">
            <Link to="/dashboard" className={`nav-link ${isActive('/dashboard')}`}>
              📊 Dashboard
            </Link>
            <Link to="/profile" className={`nav-link ${isActive('/profile')}`}>
              👤 Profile
            </Link>
            <Link to="/settings" className={`nav-link ${isActive('/settings')}`}>
              ⚙️ Settings
            </Link>
          </div>

          <div className="navbar-user">
            <span className="user-info">{user?.username}</span>
            <button className="btn btn-secondary" onClick={handleLogout}>
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
