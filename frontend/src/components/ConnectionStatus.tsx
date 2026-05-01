/**
 * ConnectionStatus Component
 * 
 * Shows user connection status, pending submissions, and sync progress
 * 
 * Implements BR5: Resilience Under Network Issues
 */

import React from 'react';
import { useOfflineStatus } from '../hooks/useOffline';
import '../styles/connection-status.css';

export const ConnectionStatus: React.FC = () => {
  const {
    isOnline,
    isSyncing,
    pendingCount,
    lastSyncTime,
    syncErrors,
    manualSync
  } = useOfflineStatus();

  // Format last sync time
  const formatSyncTime = (timestamp?: number): string => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    return date.toLocaleDateString();
  };

  // Don't show anything if online and no pending
  if (isOnline && pendingCount === 0 && !isSyncing) {
    return null;
  }

  // Offline indicator
  if (!isOnline) {
    return (
      <div className="connection-status offline-banner">
        <div className="status-content">
          <span className="status-icon">📡</span>
          <div className="status-text">
            <strong>You're offline</strong>
            <p>Your data is saved locally. We'll sync when you're back online.</p>
          </div>
          {pendingCount > 0 && (
            <span className="pending-badge">
              {pendingCount} pending
            </span>
          )}
        </div>
      </div>
    );
  }

  // Syncing indicator
  if (isSyncing) {
    return (
      <div className="connection-status syncing-banner">
        <div className="status-content">
          <span className="status-icon spinning">📤</span>
          <div className="status-text">
            <strong>Syncing your expenses...</strong>
            <p>Please don't close this window.</p>
          </div>
        </div>
      </div>
    );
  }

  // Pending submissions indicator
  if (pendingCount > 0) {
    return (
      <div className="connection-status pending-banner">
        <div className="status-content">
          <span className="status-icon">⏳</span>
          <div className="status-text">
            <strong>{pendingCount} expense{pendingCount !== 1 ? 's' : ''} pending</strong>
            <p>Last synced: {formatSyncTime(lastSyncTime)}</p>
          </div>
          <button
            onClick={manualSync}
            className="btn btn-small"
            title="Manually sync pending submissions"
          >
            Sync Now
          </button>
        </div>

        {/* Sync Errors */}
        {syncErrors.length > 0 && (
          <div className="sync-errors">
            <strong>Sync issues:</strong>
            <ul>
              {syncErrors.map((error, idx) => (
                <li key={idx}>{error}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  return null;
};

export default ConnectionStatus;
