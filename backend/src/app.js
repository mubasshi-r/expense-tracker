import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import db, { initializeDatabase } from './db.js';
import Expense from './models/Expense.js';
import User from './models/User.js';
import { generateToken, authMiddleware } from './middleware/auth.js';
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
const userModel = new User(db);

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'API is running' });
});

/**
 * AUTH ENDPOINTS
 */

/**
 * POST /auth/register
 * Register a new user
 */
app.post('/auth/register', (req, res) => {
  try {
    const { username, email, password } = req.body;

    const result = userModel.register({ username, email, password });

    if (!result.success) {
      return res.status(result.statusCode).json({
        error: result.error || 'Registration failed',
        details: result.details || result.errors
      });
    }

    // Generate JWT token
    const token = generateToken(result.user.id, result.user.username);

    return res.status(result.statusCode).json({
      success: true,
      message: 'User registered successfully',
      user: result.user,
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      error: 'Registration failed',
      message: error.message
    });
  }
});

/**
 * POST /auth/login
 * User login
 */
app.post('/auth/login', (req, res) => {
  try {
    const { username, password } = req.body;

    const result = userModel.login({ username, password });

    if (!result.success) {
      return res.status(result.statusCode).json({
        error: result.error || 'Login failed',
        details: result.details
      });
    }

    // Generate JWT token
    const token = generateToken(result.user.id, result.user.username);

    return res.status(result.statusCode).json({
      success: true,
      message: 'Login successful',
      user: result.user,
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      error: 'Login failed',
      message: error.message
    });
  }
});

/**
 * GET /auth/profile
 * Get current user profile (protected)
 */
app.get('/auth/profile', authMiddleware, (req, res) => {
  try {
    const user = userModel.getById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    return res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    return res.status(500).json({
      error: 'Failed to fetch profile'
    });
  }
});

/**
 * PUT /auth/profile
 * Update user profile (protected)
 */
app.put('/auth/profile', authMiddleware, (req, res) => {
  try {
    const result = userModel.updateProfile(req.user.userId, req.body);

    if (!result.success) {
      return res.status(result.statusCode).json({
        error: result.error
      });
    }

    return res.status(result.statusCode).json({
      success: true,
      message: result.message,
      user: result.user
    });
  } catch (error) {
    console.error('Profile update error:', error);
    return res.status(500).json({
      error: 'Failed to update profile'
    });
  }
});

/**
 * EXPENSE ENDPOINTS (Protected - Require Authentication)
 */

/**
 * POST /expenses
 * 
 * Create a new expense entry (Protected)
 */
app.post('/expenses', authMiddleware, (req, res) => {
  try {
    const { amount, category, description, date, idempotencyKey } = req.body;

    // Validate idempotencyKey provided (BR2)
    if (!idempotencyKey) {
      return res.status(400).json({
        error: 'Validation failed',
        details: { idempotencyKey: 'idempotencyKey is required (UUID)' }
      });
    }

    // Create expense with userId (includes validation BR3)
    const result = expenseModel.create({
      userId: req.user.userId,
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
 * Retrieve list of expenses for current user with optional filtering (Protected)
 */
app.get('/expenses', authMiddleware, (req, res) => {
  try {
    const { category, sort } = req.query;

    // Get all expenses for this user (with optional category filter) [BR4]
    const expenses = expenseModel.getAll(req.user.userId, { category });

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
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`✓ Expense Tracker API running on http://localhost:${PORT}`);
    console.log(`✓ Database: expenses.db`);
    console.log('\nBusiness Rules Implemented:');
    Object.entries(BUSINESS_RULES).forEach(([key, rule]) => {
      console.log(`  ${key}: ${rule.name}`);
    });
    console.log('\nAuthentication: JWT tokens required for /expenses endpoints');
    console.log('User Isolation: Each user can only see their own expenses');
  });
}

export default app;
