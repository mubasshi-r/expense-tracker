/**
 * Offline/Sync Hooks
 * 
 * Manages offline state and sync status in React components
 */

import { useState, useEffect, useCallback } from 'react';
import { OfflineManager, FormDraftManager, PendingSubmission } from '../api/offlineManager';

interface SyncStatus {
  isSyncing: boolean;
  lastSyncTime?: number;
  pendingCount: number;
  errors: string[];
}

/**
 * Hook: useOfflineStatus
 * 
 * Provides:
 * - Current online/offline state
 * - Pending submission count
 * - Sync status
 */
export function useOfflineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isSyncing: false,
    pendingCount: 0,
    errors: []
  });

  useEffect(() => {
    const manager = OfflineManager.getInstance();

    // Subscribe to sync status changes
    const unsubscribe = manager.subscribe((status) => {
      setSyncStatus(status);
    });

    // Listen to online/offline events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial status
    setSyncStatus(manager.getSyncStatus());

    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const manualSync = useCallback(async () => {
    const manager = OfflineManager.getInstance();
    await manager.syncPendingSubmissions();
  }, []);

  return {
    isOnline,
    isConnected: isOnline,
    isSyncing: syncStatus.isSyncing,
    pendingCount: syncStatus.pendingCount,
    lastSyncTime: syncStatus.lastSyncTime,
    syncErrors: syncStatus.errors,
    manualSync
  };
}

/**
 * Hook: useFormDraft
 * 
 * Manages form draft persistence
 * Returns utility functions for manual save/load/clear
 */
export function useFormDraft() {
  const saveDraft = useCallback((formData: any) => {
    FormDraftManager.saveDraft({
      ...formData,
      _timestamp: Date.now()
    });
  }, []);

  const loadDraft = useCallback(() => {
    return FormDraftManager.loadDraft();
  }, []);

  const clearDraft = useCallback(() => {
    FormDraftManager.clearDraft();
  }, []);

  return { saveDraft, loadDraft, clearDraft };
}

/**
 * Hook: usePendingSubmissions
 * 
 * Provides access to pending (offline) submissions
 */
export function usePendingSubmissions() {
  const [pending, setPending] = useState<PendingSubmission[]>([]);

  useEffect(() => {
    const manager = OfflineManager.getInstance();
    setPending(manager.getPendingSubmissions());

    const unsubscribe = manager.subscribe((status) => {
      setPending(manager.getPendingSubmissions());
    });

    return unsubscribe;
  }, []);

  return pending;
}
