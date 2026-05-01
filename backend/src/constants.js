/**
 * BUSINESS RULES IMPLEMENTATION REFERENCE
 * 
 * This file documents how business rules from SRS.md are implemented.
 * Each BR has implementation notes in the code.
 */

export const BUSINESS_RULES = {
  // BR1: Money Handling - Decimal Precision
  BR1: {
    name: 'Money Handling - Decimal Precision',
    rule: 'All monetary amounts must be stored and calculated using DECIMAL(10,2) type, never floating-point',
    implementation: [
      'Database: DECIMAL(10,2) column type',
      'Backend: Decimal.js library for calculations',
      'Validation: Enforce 2 decimal places always',
      'Frontend: Store amounts as cents or use Dinero.js'
    ]
  },

  // BR2: Idempotency - Duplicate Prevention
  BR2: {
    name: 'Idempotency - Duplicate Prevention',
    rule: 'Duplicate submissions with same idempotencyKey return existing record (200) not new (201)',
    implementation: [
      'Frontend: Generate UUID v4 for each form submission',
      'Backend: UNIQUE constraint on idempotencyKey column',
      'Backend: Check for existing key before INSERT',
      'If exists: Return 200 OK with expense',
      'If new: Create record and return 201 Created'
    ]
  },

  // BR3: Expense Validation
  BR3: {
    name: 'Expense Validation',
    rule: 'All expense entries must pass validation before storage',
    validation_rules: {
      amount: 'Must be > 0 and ≤ 999,999.99, DECIMAL(10,2) format',
      category: 'One of [Food, Transport, Entertainment, Utilities, Other]',
      description: 'Length 1-255 characters, required',
      date: 'Valid ISO 8601 date, cannot be in future'
    },
    implementation: [
      'Frontend: Real-time validation with inline errors',
      'Backend: Server-side validation (never trust client)',
      'Backend: Return 400 Bad Request with specific error messages'
    ]
  },

  // BR4: Filtering and Sorting
  BR4: {
    name: 'Expense Filtering and Sorting',
    rule: 'Support filtering by category and sorting by date independently',
    implementation: [
      'Default sort: Newest first (date DESC)',
      'Default filter: All categories (no filter)',
      'GET /expenses returns all expenses',
      'Frontend applies category filter client-side post-fetch',
      'Total calculation includes only filtered/sorted items'
    ]
  },

  // BR5: Resilience Under Network Issues
  BR5: {
    name: 'Resilience Under Network Issues',
    rule: 'System must function with unreliable networks, dropped requests, page refreshes',
    implementation: [
      'Frontend: Exponential backoff retry - 1s, 2s, 4s (max 3 attempts)',
      'Backend: Use idempotencyKey to prevent duplicate processing',
      'Frontend: Store form data in localStorage during submission',
      'Frontend: Clear error/success states with user feedback',
      'Retry logic is transparent to user on success'
    ]
  },

  // BR6: Category Management
  BR6: {
    name: 'Category Management',
    rule: 'Expenses categorized from predefined list only',
    valid_categories: ['Food', 'Transport', 'Entertainment', 'Utilities', 'Other'],
    implementation: [
      'Backend: ENUM/CHECK constraint in database',
      'Frontend: Dropdown select in form component',
      'Validation: Reject unknown categories with 400 error'
    ]
  },

  // BR7: Data Persistence and Audit Trail
  BR7: {
    name: 'Data Persistence and Audit Trail',
    rule: 'All expenses immutable after creation (no update/delete), maintains audit trail',
    implementation: [
      'No PUT/PATCH endpoints for expenses',
      'No DELETE endpoint for expenses',
      'Database constraints prevent modification',
      'Every record has created_at for audit (immutable after insert)'
    ]
  },

  // BR8: Summary Calculations
  BR8: {
    name: 'Summary Calculations',
    rule: 'Display total of visible expenses reflecting current filters and sorting',
    implementation: [
      'Total = SUM of all filtered/sorted amounts',
      'Use DECIMAL precision (2 places)',
      'Update immediately when filter/sort changes',
      'Display format: "Total: ₹X,XXX.XX"'
    ]
  },

  // BR9: Date Sorting
  BR9: {
    name: 'Date Sorting',
    rule: 'Expenses sorted by date in two directions: newest first (default) or oldest first',
    implementation: [
      'Default: Sort by date DESC (newest first)',
      'Toggle available: Sort by date ASC (oldest first)',
      'Sorting ignores time component (date only)',
      'Independent of filtering'
    ]
  },

  // BR10: Error Handling and User Communication
  BR10: {
    name: 'Error Handling and User Communication',
    rule: 'Communicate errors clearly without exposing technical details',
    error_responses: {
      validation: '400 Bad Request with field-specific messages',
      network: '5xx with user-friendly message (no tech details)',
      server: '500 with generic message (Silent logging backend)'
    },
    implementation: [
      'Consistent error response format: { error, details }',
      'Frontend: Toast notifications',
      'Frontend: Inline form validation messages',
      'Include retry/action option in error messages'
    ]
  }
};

export const EXPENSE_CATEGORIES = Object.freeze({
  FOOD: 'Food',
  TRANSPORT: 'Transport',
  ENTERTAINMENT: 'Entertainment',
  UTILITIES: 'Utilities',
  OTHER: 'Other'
});

export const VALID_CATEGORIES = Object.values(EXPENSE_CATEGORIES);

export const VALIDATION_RULES = {
  AMOUNT_MIN: 0.01,
  AMOUNT_MAX: 999999.99,
  DESCRIPTION_MIN_LENGTH: 1,
  DESCRIPTION_MAX_LENGTH: 255,
  DATE_FORMAT: /^\d{4}-\d{2}-\d{2}$/
};
