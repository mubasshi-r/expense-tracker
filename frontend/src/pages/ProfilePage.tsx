import React, { useState } from 'react';
import { useAuth } from '../contexts/authContext';
import { useNavigate } from 'react-router-dom';
import '../styles/settings-page.css';

export function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState(user?.email || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleSave = async () => {
    setSaving(true);
    // TODO: Implement profile update API call
    setMessage('Profile updated (feature coming soon)');
    setSaving(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="settings-page">
      <div className="settings-container">
        <h1>👤 My Profile</h1>

        <div className="settings-card">
          <div className="profile-section">
            <h2>Account Information</h2>
            
            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                value={user?.username || ''}
                disabled
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
              />
            </div>

            {message && (
              <div className="alert alert-success">
                {message}
              </div>
            )}

            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        <div className="settings-card danger-zone">
          <h2>Danger Zone</h2>
          <p>Sign out of your account on this device.</p>
          <button
            className="btn btn-danger"
            onClick={handleLogout}
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
