/**
 * Custom React Hooks for Expense Tracker
 * 
 * Manages API calls, state, and business logic
 */

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../contexts/authContext';
import { setAuthToken, createExpense, getExpenses, generateUUID, validateAmount, formatDateForAPI } from '../api/expenseClient';
import { Expense, PostExpenseRequest, CategoryType, ValidationError } from '../types/expense';

/**
 * Hook: useExpenses
 * 
 * Manages expense list with filtering and sorting
 */
export function useExpenses() {
  const { token } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [total, setTotal] = useState<string>('0.00');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('');
  const [sort, setSort] = useState<'date_desc' | 'date_asc'>('date_desc');

  // Set auth token when it changes
  useEffect(() => {
    setAuthToken(token);
  }, [token]);

  // Fetch expenses with current filters
  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await getExpenses(
        filter || undefined,
        sort === 'date_asc' ? 'date_asc' : undefined
      );

      setExpenses(response.expenses);
      setTotal(response.total);
    } catch (err: any) {
      setError(err.message || 'Failed to load expenses');
      console.error('Error fetching expenses:', err);
    } finally {
      setLoading(false);
    }
  }, [filter, sort]);

  // Fetch on mount and when filters/sort change
  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const updateFilter = (category: string) => {
    setFilter(category);
  };

  const toggleSort = () => {
    setSort(sort === 'date_desc' ? 'date_asc' : 'date_desc');
  };

  return {
    expenses,
    total,
    loading,
    error,
    filter,
    sort,
    fetchExpenses,
    updateFilter,
    toggleSort
  };
}

/**
 * Hook: useExpenseForm
 * 
 * Manages form state, validation, and submission
 * Implements BR3 (validation) and BR2 (idempotency)
 */
export function useExpenseForm(onSuccess?: () => void) {
  const [formData, setFormData] = useState({
    amount: '',
    category: 'Food' as CategoryType,
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [errors, setErrors] = useState<ValidationError>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Validation (BR3)
  const validate = useCallback((): boolean => {
    const newErrors: ValidationError = {};

    // Amount validation
    if (!formData.amount) {
      newErrors.amount = 'Amount is required';
    } else if (isNaN(parseFloat(formData.amount))) {
      newErrors.amount = 'Amount must be a number';
    } else if (!validateAmount(formData.amount)) {
      newErrors.amount = 'Amount must be between 0.01 and 999,999.99';
    } else if (parseFloat(formData.amount).toString().split('.')[1]?.length > 2) {
      newErrors.amount = 'Amount must have at most 2 decimal places';
    }

    // Category validation
    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

    // Description validation
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.length > 255) {
      newErrors.description = 'Description must not exceed 255 characters';
    }

    // Date validation
    if (!formData.date) {
      newErrors.date = 'Date is required';
    } else {
      const expenseDate = new Date(formData.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (expenseDate > today) {
        newErrors.date = 'Date cannot be in the future';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // Handle input changes
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field when user starts typing
    setErrors(prev => ({
      ...prev,
      [name]: ''
    }));
  }, []);

  // Submit form (BR2: Idempotency with UUID, BR5: Offline support)
  const submit = useCallback(async (): Promise<boolean> => {
    setSubmitError(null);
    setSuccessMessage(null);

    if (!validate()) {
      return false;
    }

    setIsSubmitting(true);

    try {
      // Generate idempotency key (BR2)
      const idempotencyKey = generateUUID();

      const expenseData: PostExpenseRequest = {
        amount: parseFloat(formData.amount),
        category: formData.category,
        description: formData.description.trim(),
        date: formData.date,
        idempotencyKey
      };

      const response = await createExpense(expenseData);

      if (response.success) {
        setSuccessMessage(
          response.isDuplicate
            ? '✓ This expense was already recorded'
            : '✓ Expense added successfully'
        );

        // Clear form (but not date)
        setFormData({
          amount: '',
          category: 'Food',
          description: '',
          date: new Date().toISOString().split('T')[0]
        });

        if (onSuccess) {
          setTimeout(onSuccess, 500);
        }

        return true;
      }
    } catch (err: any) {
      // Handle offline scenario (BR5)
      if (err.isOffline) {
        // Treat offline submission as success since it's queued
        setSuccessMessage('✓ Expense saved locally. Will sync when online.');

        // Clear form
        setFormData({
          amount: '',
          category: 'Food',
          description: '',
          date: new Date().toISOString().split('T')[0]
        });

        if (onSuccess) {
          setTimeout(onSuccess, 500);
        }

        return true;
      }

      setSubmitError(err.error || 'Failed to create expense. Please try again.');
      console.error('Error submitting expense:', err);
      return false;
    } finally {
      setIsSubmitting(false);
    }

    return false;
  }, [formData, validate, onSuccess]);

  // Load draft from localStorage on mount (BR5: Offline resilience)
  useEffect(() => {
    try {
      const DRAFT_KEY = 'expense_form_draft';
      const savedDraft = localStorage.getItem(DRAFT_KEY);
      
      if (savedDraft) {
        const draft = JSON.parse(savedDraft);
        // Only load if it's a partial draft (not empty)
        if (draft.amount || draft.description) {
          setFormData(draft);
        }
      }
    } catch (error) {
      console.error('Error loading form draft:', error);
    }
  }, []);

  // Clear messages after 3 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (submitError) {
      const timer = setTimeout(() => setSubmitError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [submitError]);

  return {
    formData,
    errors,
    isSubmitting,
    submitError,
    successMessage,
    handleChange,
    submit,
    validate
  };
}
