/**
 * ExpenseList Component
 * 
 * Implements:
 * - UC2: User views list of expenses
 * - UC5: User sees total of visible expenses
 * - BR8: Total calculation with decimal precision
 * - Loading and empty states
 */

import React from 'react';
import { Expense } from '../types/expense';
import { formatCurrency, parseDateFromAPI } from '../api/expenseClient';
import '../styles/components.css';

interface ExpenseListProps {
  expenses: Expense[];
  total: string;
  loading: boolean;
  error?: string | null;
  onRefresh?: () => void;
}

export const ExpenseList: React.FC<ExpenseListProps> = ({
  expenses,
  total,
  loading,
  error,
  onRefresh
}) => {
  // Format date for display
  const formatDate = (dateStr: string): string => {
    const date = parseDateFromAPI(dateStr);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Format time from created_at
  const formatTime = (isoDate: string): string => {
    const date = new Date(isoDate);
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="expense-list-container">
        <div className="loading">
          <p>⏳ Loading expenses...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="expense-list-container">
        <div className="alert alert-error">
          {error}
          {onRefresh && (
            <button onClick={onRefresh} className="btn btn-small">
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  if (expenses.length === 0) {
    return (
      <div className="expense-list-container">
        <div className="empty-state">
          <p>📭 No expenses yet</p>
          <p>Add your first expense to get started!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="expense-list-container">
      <div className="list-header">
        <h2>Recent Expenses</h2>
        <span className="count">({expenses.length})</span>
      </div>

      <div className="expense-table-wrapper">
        <table className="expense-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Category</th>
              <th>Description</th>
              <th className="amount-column">Amount</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((expense) => (
              <tr key={expense.id} className="expense-row">
                <td className="date-cell">
                  <div className="date">{formatDate(expense.date)}</div>
                  <div className="time">{formatTime(expense.created_at)}</div>
                </td>
                <td>
                  <span className={`category-badge ${expense.category.toLowerCase()}`}>
                    {expense.category}
                  </span>
                </td>
                <td className="description-cell">
                  {expense.description}
                </td>
                <td className="amount-cell">
                  {formatCurrency(expense.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Total Summary */}
      <div className="total-summary">
        <div className="total-row">
          <span className="total-label">Total:</span>
          <span className="total-amount">{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  );
};

export default ExpenseList;
