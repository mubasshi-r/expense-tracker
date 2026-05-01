import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import db, { initializeDatabase } from './db.js';
import Expense from './models/Expense.js';
import { BUSINESS_RULES } from './constants.js';

/**
 * BUSINESS RULES IMPLEMENTATION REFERENCE
 * 
 * BR1: Money Handling - Decimal.js for precision
 * BR2: Idempotency - idempotencyKey UNIQUE constraint
 * BR3: Validation - Request body validation middleware
 * BR10: Error Handling - Consistent error response format
 */

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database tables on startup
initializeDatabase();
const expenseModel = new Expense(db);

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'API is running' });
});

/**
 * POST /expenses
 * 
 * Create a new expense entry
 * 
 * Request Body:
 * {
 *   "amount": number (>0, ≤999999.99, 2 decimal places),
 *   "category": string (Food|Transport|Entertainment|Utilities|Other),
 *   "description": string (1-255 chars),
 *   "date": string (YYYY-MM-DD format),
 *   "idempotencyKey": string (UUID, required for BR2)
 * }
 * 
 * Responses:
 * - 201 Created: New expense successfully created
 * - 200 OK: Duplicate submission (idempotencyKey already exists) [BR2]
 * - 400 Bad Request: Validation error (specific field messages)
 * - 500 Internal Server Error: Server error
 * 
 * Business Rules:
 * - BR1: Amount validated as DECIMAL(10,2)
 * - BR2: Idempotency via idempotencyKey
 * - BR3: All fields validated
 * - BR6: Category enum check
 * - BR10: Consistent error response format
 */
app.post('/expenses', (req, res) => {
  try {
    const { amount, category, description, date, idempotencyKey } = req.body;

    // Validate idempotencyKey provided (BR2)
    if (!idempotencyKey) {
      return res.status(400).json({
        error: 'Validation failed',
        details: { idempotencyKey: 'idempotencyKey is required (UUID)' }
      });
    }

    // Create expense (includes validation BR3)
    const result = expenseModel.create({
      amount,
      category,
      description,
      date,
      idempotencyKey
    });

    if (!result.success) {
      return res.status(result.statusCode).json({
        error: 'Validation failed',
        details: result.errors
      });
    }

    // Return appropriate status code (BR2)
    return res.status(result.statusCode).json({
      success: true,
      isDuplicate: result.isDuplicate,
      message: result.message || 'Expense created successfully',
      expense: result.expense
    });
  } catch (error) {
    console.error('Error creating expense:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create expense (see logs)'
    });
  }
});

/**
 * GET /expenses
 * 
 * Retrieve list of expenses with optional filtering
 * 
 * Query Parameters:
 * - category: Filter by category (Food|Transport|Entertainment|Utilities|Other) [BR4]
 * - sort: Sort order (date_desc for newest first) [BR9]
 * 
 * Response:
 * {
 *   "success": true,
 *   "expenses": [
 *     {
 *       "id": string (UUID),
 *       "amount": string (DECIMAL),
 *       "category": string,
 *       "description": string,
 *       "date": string (YYYY-MM-DD),
 *       "created_at": string (ISO 8601)
 *     }
 *   ],
 *   "total": string (sum with 2 decimal places) [BR8]
 * }
 * 
 * Business Rules:
 * - BR4: Category filtering
 * - BR8: Total calculation with Decimal.js precision
 * - BR9: Date sorting (newest first)
 */
app.get('/expenses', (req, res) => {
  try {
    const { category, sort } = req.query;

    // Get all expenses (with optional category filter) [BR4]
    const expenses = expenseModel.getAll({ category });

    // Apply sorting [BR9]
    let sorted = [...expenses];
    if (sort === 'date_asc') {
      sorted.sort((a, b) => new Date(a.date) - new Date(b.date));
    } else {
      // Default: newest first
      sorted.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    // Calculate total (BR8 + BR1: Decimal precision)
    const total = Expense.calculateTotal(sorted);

    return res.status(200).json({
      success: true,
      expenses: sorted,
      total: total,
      count: sorted.length
    });
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch expenses (see logs)'
    });
  }
});

/**
 * Error handling middleware (BR10)
 */
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: 'An unexpected error occurred'
  });
});

/**
 * 404 Not Found handler
 */
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`✓ Expense Tracker API running on http://localhost:${PORT}`);
  console.log(`✓ Database: expenses.db`);
  console.log('\nBusiness Rules Implemented:');
  Object.entries(BUSINESS_RULES).forEach(([key, rule]) => {
    console.log(`  ${key}: ${rule.name}`);
  });
});

export default app;
