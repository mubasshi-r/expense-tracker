/**
 * Type Definitions for Expense Tracker
 * 
 * These types ensure type safety throughout the frontend
 * and match the backend API schema
 */

export type CategoryType = 'Food' | 'Transport' | 'Entertainment' | 'Utilities' | 'Other';

export interface Expense {
  id: string;
  idempotencyKey: string;
  amount: string; // DECIMAL as string for precision (BR1)
  category: CategoryType;
  description: string;
  date: string; // YYYY-MM-DD format
  created_at: string; // ISO 8601 timestamp
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  details?: Record<string, string>;
}

export interface PostExpenseRequest {
  amount: number;
  category: CategoryType;
  description: string;
  date: string;
  idempotencyKey: string;
}

export interface ValidationError {
  [key: string]: string;
}

export interface ExpenseListResponse {
  success: boolean;
  expenses: Expense[];
  total: string; // DECIMAL as string (BR8)
  count: number;
}

export interface ExpenseCreateResponse {
  success: boolean;
  isDuplicate: boolean;
  message: string;
  expense: Expense;
}
