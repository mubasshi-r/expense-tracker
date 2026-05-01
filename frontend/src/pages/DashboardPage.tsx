import React, { useCallback } from 'react';
import { useAuth } from '../contexts/authContext';
import { useExpenses } from '../hooks/useExpense';
import ExpenseForm from '../components/ExpenseForm';
import ExpenseList from '../components/ExpenseList';
import FilterSort from '../components/FilterSort';
import ConnectionStatus from '../components/ConnectionStatus';
import '../styles/dashboard.css';

export function DashboardPage() {
  const { user } = useAuth();
  const {
    expenses,
    total,
    loading,
    error,
    filter,
    sort,
    fetchExpenses,
    updateFilter,
    toggleSort
  } = useExpenses();

  const handleExpenseAdded = useCallback(() => {
    setTimeout(() => fetchExpenses(), 500);
  }, [fetchExpenses]);

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>💰 Expense Dashboard</h1>
        <p className="welcome-text">Welcome, {user?.username}!</p>
      </div>

      <main className="dashboard-main">
        <div className="container-grid">
          {/* Left Column: Form */}
          <div className="form-section">
            <ExpenseForm onExpenseAdded={handleExpenseAdded} />
          </div>

          {/* Right Column: List & Controls */}
          <div className="list-section">
            <FilterSort
              selectedCategory={filter}
              sortOrder={sort}
              onCategoryChange={updateFilter}
              onSortToggle={toggleSort}
            />

            <ExpenseList
              expenses={expenses}
              total={total}
              loading={loading}
              error={error}
              onRefresh={fetchExpenses}
            />
          </div>
        </div>
      </main>

      <ConnectionStatus />
    </div>
  );
}
