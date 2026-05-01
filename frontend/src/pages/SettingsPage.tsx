import React, { useState, useEffect } from 'react';
import '../styles/settings-page.css';

export function SettingsPage() {
  const [darkMode, setDarkMode] = useState(false);

  // Load dark mode preference
  useEffect(() => {
    const saved = localStorage.getItem('dark_mode');
    if (saved) {
      setDarkMode(saved === 'true');
      if (saved === 'true') {
        document.documentElement.classList.add('dark-mode');
      }
    }
  }, []);

  const handleDarkModeToggle = (checked: boolean) => {
    setDarkMode(checked);
    localStorage.setItem('dark_mode', String(checked));
    
    if (checked) {
      document.documentElement.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark-mode');
    }
  };

  return (
    <div className="settings-page">
      <div className="settings-container">
        <h1>⚙️ Settings</h1>

        <div className="settings-card">
          <h2>Appearance</h2>
          
          <div className="setting-item">
            <div className="setting-label">
              <div>
                <h3>Dark Mode</h3>
                <p>Enable dark theme for the application</p>
              </div>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={darkMode}
                onChange={(e) => handleDarkModeToggle(e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>

        <div className="settings-card">
          <h2>Expense Settings</h2>
          
          <div className="setting-item">
            <div className="setting-label">
              <div>
                <h3>Default Currency</h3>
                <p>All amounts will be displayed in INR (₹)</p>
              </div>
            </div>
            <span className="setting-value">₹ INR</span>
          </div>

          <div className="setting-item">
            <div className="setting-label">
              <div>
                <h3>Offline Sync</h3>
                <p>Automatically sync expenses when connection is restored</p>
              </div>
            </div>
            <span className="setting-value">Enabled</span>
          </div>
        </div>

        <div className="settings-card">
          <h2>About</h2>
          <p><strong>Fenmo Ai Expense Tracker</strong></p>
          <p>Version 1.0.0</p>
          <p className="text-muted">Track your spending and understand where your money goes.</p>
        </div>
      </div>
    </div>
  );
}
