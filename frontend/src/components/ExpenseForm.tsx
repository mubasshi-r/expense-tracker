/**
 * ExpenseForm Component
 * 
 * Implements:
 * - UC1: User records new expense
 * - BR3: Validation with inline error messages
 * - BR2: Idempotency key generation
 * - BR5: Form draft persistence (offline resilience)
 * - Real-time validation feedback
 */

import React, { useEffect } from 'react';
import { useExpenseForm } from '../hooks/useExpense';
import { useFormDraft } from '../hooks/useOffline';
import { CategoryType } from '../types/expense';
import '../styles/components.css';

interface ExpenseFormProps {
  onExpenseAdded?: () => void;
}

const CATEGORIES: CategoryType[] = ['Food', 'Transport', 'Entertainment', 'Utilities', 'Other'];

export const ExpenseForm: React.FC<ExpenseFormProps> = ({ onExpenseAdded }) => {
  const {
    formData,
    errors,
    isSubmitting,
    submitError,
    successMessage,
    handleChange,
    submit,
    validate
  } = useExpenseForm(onExpenseAdded);

  const { saveDraft, clearDraft } = useFormDraft();

  // Save form draft as user types (debounced by calling saveDraft)
  useEffect(() => {
    const timer = setTimeout(() => {
      saveDraft(formData);
    }, 500); // Debounce 500ms

    return () => clearTimeout(timer);
  }, [formData, saveDraft]);

  // Clear draft on successful submission
  useEffect(() => {
    if (successMessage) {
      clearDraft();
    }
  }, [successMessage, clearDraft]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await submit();
    if (success && onExpenseAdded) {
      onExpenseAdded();
    }
  };

  // Real-time validation on blur
  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    e.target.name; // Field that lost focus
    validate();
  };

  const isFormValid = !errors.amount && !errors.category && !errors.description && !errors.date &&
    formData.amount && formData.description && formData.date;

  return (
    <div className="expense-form-container">
      <h2>Add New Expense</h2>

      {successMessage && (
        <div className="alert alert-success">
          {successMessage}
        </div>
      )}

      {submitError && (
        <div className="alert alert-error">
          {submitError}
          {isSubmitting && ' (Retrying...)'}
        </div>
      )}

      <form onSubmit={handleSubmit} className="expense-form">
        {/* Amount Field */}
        <div className="form-group">
          <label htmlFor="amount">Amount (₹)</label>
          <input
            type="number"
            id="amount"
            name="amount"
            value={formData.amount}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="0.00"
            step="0.01"
            min="0"
            max="999999.99"
            className={`form-input ${errors.amount ? 'error' : ''}`}
            disabled={isSubmitting}
          />
          {errors.amount && (
            <span className="error-message">{errors.amount}</span>
          )}
        </div>

        {/* Category Field */}
        <div className="form-group">
          <label htmlFor="category">Category</label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`form-input ${errors.category ? 'error' : ''}`}
            disabled={isSubmitting}
          >
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          {errors.category && (
            <span className="error-message">{errors.category}</span>
          )}
        </div>

        {/* Description Field */}
        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="What did you spend this on?"
            maxLength={255}
            className={`form-input ${errors.description ? 'error' : ''}`}
            disabled={isSubmitting}
            rows={3}
          />
          <span className="char-count">
            {formData.description.length}/255
          </span>
          {errors.description && (
            <span className="error-message">{errors.description}</span>
          )}
        </div>

        {/* Date Field */}
        <div className="form-group">
          <label htmlFor="date">Date</label>
          <input
            type="date"
            id="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`form-input ${errors.date ? 'error' : ''}`}
            disabled={isSubmitting}
          />
          {errors.date && (
            <span className="error-message">{errors.date}</span>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className={`btn btn-primary ${!isFormValid || isSubmitting ? 'disabled' : ''}`}
          disabled={!isFormValid || isSubmitting}
        >
          {isSubmitting ? 'Adding...' : 'Add Expense'}
        </button>
      </form>
    </div>
  );
};

export default ExpenseForm;
