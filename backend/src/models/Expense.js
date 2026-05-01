import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import Decimal from 'decimal.js';
import { VALID_CATEGORIES, VALIDATION_RULES } from '../constants.js';

/**
 * Expense Model
 * 
 * Implements:
 * - BR1: Decimal precision for money (using Decimal.js)
 * - BR2: Idempotency via idempotencyKey UNIQUE constraint
 * - BR3: Validation for all fields
 * - BR6: Category enum validation
 * - BR7: Immutable records (only CREATE, no UPDATE/DELETE)
 * - BR8: Total calculations with precision
 */

class Expense {
  constructor(db) {
    this.db = db;
    this.insertStmt = db.prepare(`
      INSERT INTO expenses (id, idempotencyKey, amount, category, description, date, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    this.selectAllStmt = db.prepare(`
      SELECT id, idempotencyKey, amount, category, description, date, created_at
      FROM expenses
      ORDER BY date DESC, created_at DESC
    `);
    
    this.selectByIdempotencyKeyStmt = db.prepare(`
      SELECT id, idempotencyKey, amount, category, description, date, created_at
      FROM expenses
      WHERE idempotencyKey = ?
    `);

    this.selectByFilterStmt = db.prepare(`
      SELECT id, idempotencyKey, amount, category, description, date, created_at
      FROM expenses
      WHERE category = ?
      ORDER BY date DESC, created_at DESC
    `);
  }

  /**
   * Validate expense data (BR3)
   * @throws {Object} error object with field: message mappings
   */
  static validate(data) {
    const errors = {};

    // Validate amount (BR1 - Decimal precision)
    if (typeof data.amount !== 'number' && typeof data.amount !== 'string') {
      errors.amount = 'Amount is required and must be a number';
    } else {
      try {
        const decimal = new Decimal(data.amount);
        if (decimal.lessThanOrEqualTo(VALIDATION_RULES.AMOUNT_MIN)) {
          errors.amount = `Amount must be greater than ${VALIDATION_RULES.AMOUNT_MIN}`;
        }
        if (decimal.greaterThan(VALIDATION_RULES.AMOUNT_MAX)) {
          errors.amount = `Amount cannot exceed ${VALIDATION_RULES.AMOUNT_MAX}`;
        }
        // Check decimal places (max 2)
        if (decimal.decimalPlaces() > 2) {
          errors.amount = 'Amount must have at most 2 decimal places';
        }
      } catch (e) {
        errors.amount = 'Amount must be a valid number';
      }
    }

    // Validate category (BR6)
    if (!data.category) {
      errors.category = 'Category is required';
    } else if (!VALID_CATEGORIES.includes(data.category)) {
      errors.category = `Category must be one of: ${VALID_CATEGORIES.join(', ')}`;
    }

    // Validate description
    if (!data.description || typeof data.description !== 'string') {
      errors.description = 'Description is required and must be text';
    } else if (data.description.length < VALIDATION_RULES.DESCRIPTION_MIN_LENGTH) {
      errors.description = 'Description must not be empty';
    } else if (data.description.length > VALIDATION_RULES.DESCRIPTION_MAX_LENGTH) {
      errors.description = `Description must not exceed ${VALIDATION_RULES.DESCRIPTION_MAX_LENGTH} characters`;
    }

    // Validate date
    if (!data.date || typeof data.date !== 'string') {
      errors.date = 'Date is required and must be in YYYY-MM-DD format';
    } else if (!VALIDATION_RULES.DATE_FORMAT.test(data.date)) {
      errors.date = 'Date must be in YYYY-MM-DD format';
    } else {
      // Check if date is valid and not in future
      const expenseDate = new Date(data.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (isNaN(expenseDate.getTime())) {
        errors.date = 'Date is invalid';
      } else if (expenseDate > today) {
        errors.date = 'Date cannot be in the future';
      }
    }

    return errors;
  }

  /**
   * Create a new expense (BR2: Idempotency)
   * 
   * Steps:
   * 1. Validate expense data (BR3)
   * 2. Check for existing idempotencyKey (BR2)
   * 3. If found: return existing expense (200 OK)
   * 4. If not: create new expense (201 Created)
   * 
   * @param {Object} expenseData - { amount, category, description, date, idempotencyKey }
   * @returns {Object} { success, statusCode, expense, isDuplicate }
   */
  create(expenseData) {
    // Step 1: Validate (BR3)
    const validationErrors = Expense.validate(expenseData);
    if (Object.keys(validationErrors).length > 0) {
      return {
        success: false,
        statusCode: 400,
        errors: validationErrors
      };
    }

    // Step 2: Check for duplicate idempotencyKey (BR2)
    const existing = this.selectByIdempotencyKeyStmt.get(expenseData.idempotencyKey);
    if (existing) {
      return {
        success: true,
        statusCode: 200,
        expense: this._formatExpense(existing),
        isDuplicate: true,
        message: 'Expense already exists (duplicate submission handled)'
      };
    }

    // Step 3: Create new expense (BR1: Decimal precision)
    try {
      const id = uuidv4();
      const amount = new Decimal(expenseData.amount).toFixed(2); // Ensures 2 decimal places
      const created_at = new Date().toISOString();
      
      this.insertStmt.run(
        id,
        expenseData.idempotencyKey,
        amount, // Store as DECIMAL string
        expenseData.category,
        expenseData.description.trim(),
        expenseData.date,
        created_at
      );

      return {
        success: true,
        statusCode: 201,
        expense: {
          id,
          idempotencyKey: expenseData.idempotencyKey,
          amount: amount,
          category: expenseData.category,
          description: expenseData.description,
          date: expenseData.date,
          created_at
        },
        isDuplicate: false
      };
    } catch (error) {
      // Catch database constraint violations
      if (error.code === 'SQLITE_CONSTRAINT') {
        return {
          success: false,
          statusCode: 409,
          errors: { general: 'Duplicate entry detected' }
        };
      }
      throw error;
    }
  }

  /**
   * Get all expenses (BR4: Filtering & BR9: Sorting)
   * 
   * @param {Object} filters - { category }
   * @returns {Array} expenses sorted by date DESC
   */
  getAll(filters = {}) {
    try {
      let expenses = [];

      if (filters.category && VALID_CATEGORIES.includes(filters.category)) {
        expenses = this.selectByFilterStmt.all(filters.category);
      } else {
        expenses = this.selectAllStmt.all();
      }

      return expenses.map(exp => this._formatExpense(exp));
    } catch (error) {
      throw new Error(`Failed to fetch expenses: ${error.message}`);
    }
  }

  /**
   * Calculate total of all expenses (BR8: Summary Calculations)
   * Uses Decimal.js for precision (BR1)
   * 
   * @param {Array} expenses - expenses array
   * @returns {string} total as DECIMAL string with 2 places
   */
  static calculateTotal(expenses) {
    const total = expenses.reduce((sum, exp) => {
      return sum.plus(new Decimal(exp.amount));
    }, new Decimal(0));

    return total.toFixed(2);
  }

  /**
   * Format expense for API response
   * @private
   */
  _formatExpense(exp) {
    return {
      id: exp.id,
      idempotencyKey: exp.idempotencyKey,
      amount: exp.amount,
      category: exp.category,
      description: exp.description,
      date: exp.date,
      created_at: exp.created_at
    };
  }
}

export default Expense;
