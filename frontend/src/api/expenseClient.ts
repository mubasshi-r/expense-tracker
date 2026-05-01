/**
 * API Client for Expense Tracker
 * 
 * Implements BR5: Resilience Under Network Issues
 * - Exponential backoff retry: 1s, 2s, 4s (max 3 attempts)
 * - Queue submissions during offline
 * - Auto-sync when connection returns
 * - Authentication with JWT tokens
 * - Transparent retry handling
 * - User feedback for network errors
 */

import axios, { AxiosError } from 'axios';
import { PostExpenseRequest, ExpenseListResponse, ExpenseCreateResponse, Expense } from '../types/expense';
import { OfflineManager } from './offlineManager';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Configure axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 30000 // 30 second timeout
});

/**
 * Set authorization token for API requests
 */
export function setAuthToken(token: string | null) {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
}

/**
 * Retry logic with exponential backoff (BR5)
 * Attempts: 3, Delays: 1s, 2s, 4s
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxAttempts - 1) {
        const delayMs = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        console.log(`Attempt ${attempt + 1} failed. Retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError;
}

/**
 * Create a new expense
 * 
 * Implements:
 * - BR2: Idempotency with idempotencyKey
 * - BR5: Retry logic for network failures, queue when offline
 * - Returns 201 for new, 200 for duplicate
 */
export async function createExpense(
  expense: PostExpenseRequest
): Promise<ExpenseCreateResponse> {
  const manager = OfflineManager.getInstance();

  try {
    const response = await retryWithBackoff(() =>
      api.post<ExpenseCreateResponse>('/expenses', expense)
    );
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError;
    
    if (axiosError.response?.status === 400) {
      throw {
        error: 'Validation failed',
        details: axiosError.response.data
      };
    }

    // Queue for sync if offline or network error
    if (!manager.isOnline || axiosError.code === 'ECONNABORTED' || axiosError.code === 'ERR_NETWORK') {
      console.log('Offline or network failed. Queueing submission for later sync...');
      manager.queueSubmission({
        data: expense,
        timestamp: Date.now()
      });

      throw {
        error: 'Network error - saved locally',
        details: 'Your expense has been saved. It will sync when your connection is restored.',
        isOffline: true
      };
    }

    throw {
      error: 'Failed to create expense',
      details: 'Network error. Please check your connection and try again.'
    };
  }
}

/**
 * Get all expenses with optional filtering
 * 
 * Implements:
 * - BR4: Category filtering
 * - BR9: Date sorting
 * - BR5: Retry logic
 */
export async function getExpenses(
  category?: string,
  sort?: string
): Promise<ExpenseListResponse> {
  try {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (sort) params.append('sort', sort);

    const queryString = params.toString();
    const url = queryString ? `/expenses?${queryString}` : '/expenses';

    const response = await retryWithBackoff(() =>
      api.get<ExpenseListResponse>(url)
    );
    return response.data;
  } catch (error) {
    throw {
      error: 'Failed to fetch expenses',
      message: 'Unable to load expenses. Please try again.'
    };
  }
}

/**
 * Format amount for display with rupee symbol
 * Implements BR1 and BR8 precision
 */
export function formatCurrency(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `₹${num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

/**
 * Generate UUID v4 for idempotency key (BR2)
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Validate amount (BR1, BR3)
 */
export function validateAmount(amount: string | number): boolean {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return num > 0 && num <= 999999.99;
}

/**
 * Format date for API (YYYY-MM-DD)
 */
export function formatDateForAPI(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Parse date from API format
 */
export function parseDateFromAPI(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00Z');
}
