/**
 * Offline/Sync Manager
 * 
 * Implements BR5: Resilience Under Network Issues
 * 
 * Features:
 * - Detect online/offline state
 * - Queue pending submissions when offline
 * - Auto-sync when connection returns
 * - localStorage persistence
 * - Transparent to user
 */

import { PostExpenseRequest, Expense } from '../types/expense';
import { createExpense, getExpenses } from './expenseClient';

const STORAGE_KEYS = {
  PENDING_SUBMISSIONS: 'expense_pending_submissions',
  SYNC_QUEUE: 'expense_sync_queue',
  FORM_DRAFT: 'expense_form_draft',
  LAST_SYNC: 'expense_last_sync',
  SYNC_STATUS: 'expense_sync_status'
};

export interface PendingSubmission {
  id: string; // UUID
  data: PostExpenseRequest;
  timestamp: number;
  attempts: number;
  lastError?: string;
}

interface SyncStatus {
  isSyncing: boolean;
  lastSyncTime?: number;
  pendingCount: number;
  errors: string[];
}

/**
 * Offline Manager Class
 * 
 * Manages offline state, sync queue, and background synchronization
 */
export class OfflineManager {
  private static instance: OfflineManager;
  private isOnline: boolean = navigator.onLine;
  private syncQueue: PendingSubmission[] = [];
  private isSyncing: boolean = false;
  private listeners: Set<(status: SyncStatus) => void> = new Set();

  private constructor() {
    this.loadQueue();
    this.setupListeners();
  }

  /**
   * Singleton instance
   */
  static getInstance(): OfflineManager {
    if (!OfflineManager.instance) {
      OfflineManager.instance = new OfflineManager();
    }
    return OfflineManager.instance;
  }

  /**
   * Setup online/offline event listeners
   */
  private setupListeners(): void {
    window.addEventListener('online', () => {
      console.log('📡 Connection restored');
      this.isOnline = true;
      this.notifyListeners();
      this.syncPendingSubmissions();
    });

    window.addEventListener('offline', () => {
      console.log('📡 Connection lost');
      this.isOnline = false;
      this.notifyListeners();
    });
  }

  /**
   * Check if online
   */
  isConnected(): boolean {
    return this.isOnline;
  }

  /**
   * Get current sync status
   */
  getSyncStatus(): SyncStatus {
    return {
      isSyncing: this.isSyncing,
      lastSyncTime: this.getLastSyncTime(),
      pendingCount: this.syncQueue.length,
      errors: this.getSyncErrors()
    };
  }

  /**
   * Add a submission to sync queue (for offline scenario)
   * 
   * Called when:
   * - User is offline
   * - API fails even after retries
   */
  queueSubmission(submission: PendingSubmission): void {
    console.log('⏳ Queued submission:', submission.id);
    this.syncQueue.push(submission);
    this.saveQueue();
    this.notifyListeners();
  }

  /**
   * Get pending submissions
   */
  getPendingSubmissions(): PendingSubmission[] {
    return [...this.syncQueue];
  }

  /**
   * Sync all pending submissions when connection returns
   * 
   * Implements:
   * - Retry logic per submission
   * - Transparent to user
   * - Clear errors after successful sync
   */
  async syncPendingSubmissions(): Promise<void> {
    if (!this.isOnline || this.isSyncing || this.syncQueue.length === 0) {
      return;
    }

    this.isSyncing = true;
    this.notifyListeners();

    const syncedIds = new Set<string>();
    const failedIds = new Map<string, string>();

    // Sync each pending submission
    for (const submission of this.syncQueue) {
      try {
        console.log(`📤 Syncing submission ${submission.id}...`);
        
        const response = await createExpense(submission.data);

        if (response.success) {
          console.log(`✓ Synced ${submission.id}`);
          syncedIds.add(submission.id);
        }
      } catch (error: any) {
        console.error(`✗ Failed to sync ${submission.id}:`, error);
        failedIds.set(submission.id, error.message || 'Sync failed');
        submission.attempts++;
        submission.lastError = error.message;
      }
    }

    // Remove synced submissions from queue
    this.syncQueue = this.syncQueue.filter(s => !syncedIds.has(s.id));
    this.saveQueue();
    this.updateLastSyncTime();

    this.isSyncing = false;
    this.notifyListeners();

    // Log sync results
    if (syncedIds.size > 0) {
      console.log(`✓ Successfully synced ${syncedIds.size} submissions`);
    }
    if (failedIds.size > 0) {
      console.log(`✗ Failed to sync ${failedIds.size} submissions`);
    }
  }

  /**
   * Get last sync timestamp
   */
  private getLastSyncTime(): number | undefined {
    const time = localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
    return time ? parseInt(time) : undefined;
  }

  /**
   * Update last sync time
   */
  private updateLastSyncTime(): void {
    localStorage.setItem(STORAGE_KEYS.LAST_SYNC, Date.now().toString());
  }

  /**
   * Get sync errors
   */
  private getSyncErrors(): string[] {
    return this.syncQueue
      .filter(s => s.lastError)
      .map(s => `${s.id}: ${s.lastError}`);
  }

  /**
   * Save queue to localStorage
   */
  private saveQueue(): void {
    localStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(this.syncQueue));
  }

  /**
   * Load queue from localStorage
   */
  private loadQueue(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SYNC_QUEUE);
      if (stored) {
        this.syncQueue = JSON.parse(stored);
        console.log(`Loaded ${this.syncQueue.length} pending submissions from storage`);
      }
    } catch (error) {
      console.error('Failed to load sync queue:', error);
      this.syncQueue = [];
    }
  }

  /**
   * Subscribe to sync status changes
   */
  subscribe(listener: (status: SyncStatus) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of status change
   */
  private notifyListeners(): void {
    const status = this.getSyncStatus();
    this.listeners.forEach(listener => listener(status));
  }

  /**
   * Clear all pending submissions and cache
   */
  clear(): void {
    this.syncQueue = [];
    this.saveQueue();
    localStorage.removeItem(STORAGE_KEYS.LAST_SYNC);
    this.notifyListeners();
  }
}

/**
 * Form Draft Manager
 * 
 * Persists form data so user doesn't lose it on refresh
 */
export class FormDraftManager {
  private static readonly STORAGE_KEY = STORAGE_KEYS.FORM_DRAFT;

  /**
   * Save form draft to localStorage
   */
  static saveDraft(formData: any): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(formData));
    } catch (error) {
      console.warn('Failed to save form draft:', error);
    }
  }

  /**
   * Load form draft from localStorage
   */
  static loadDraft(): any | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.warn('Failed to load form draft:', error);
      return null;
    }
  }

  /**
   * Clear form draft
   */
  static clearDraft(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }
}

export default OfflineManager;
