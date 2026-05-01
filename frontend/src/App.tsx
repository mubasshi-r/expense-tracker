/**
 * App Component - Main Application
 * 
 * Coordinates:
 * - ExpenseForm: Create new expenses
 * - ExpenseList: Display expenses
 * - FilterSort: Filter and sort controls
 * 
 * Implements all use cases and business rules
 */

import React, { useCallback } from 'react';
import { useExpenses } from './hooks/useExpense';
import ExpenseForm from './components/ExpenseForm';
import ExpenseList from './components/ExpenseList';
import FilterSort from './components/FilterSort';
import './styles/app.css';

function App() {
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

  // Handle successful expense creation - refetch list
  const handleExpenseAdded = useCallback(() => {
    setTimeout(() => fetchExpenses(), 500);
  }, [fetchExpenses]);

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1>💰 Personal Expense Tracker</h1>
          <p className="subtitle">Track your spending and understand where your money goes</p>
        </div>
      </header>

      <main className="app-main">
        <div className="container">
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

      <footer className="app-footer">
        <p>
          🏦 Stay on top of your finances • Built with React & TypeScript
        </p>
      </footer>
    </div>
  );
}

export default App;
