import Expense from '../src/models/Expense.js';
import db, { initializeDatabase } from '../src/db.js';
import { VALID_CATEGORIES } from '../src/constants.js';

/**
 * UNIT TESTS FOR EXPENSE MODEL
 * 
 * Tests all business rules:
 * - BR1: Decimal precision for money
 * - BR2: Idempotency & duplicate prevention
 * - BR3: Validation for all fields
 * - BR6: Category enum
 * - BR8: Total calculation
 */

describe('Expense Model - Business Rules', () => {
  let expenseModel;
  const testUserId = 'test-user-id';

  beforeAll(() => {
    // Initialize fresh database for tests
    initializeDatabase();
    db.prepare(`
      INSERT OR IGNORE INTO users (id, username, email, password, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(testUserId, 'expense_model_test', 'expense_model_test@example.com', 'hashed-password', new Date().toISOString());
    expenseModel = new Expense(db);

    const create = expenseModel.create.bind(expenseModel);
    expenseModel.create = (data) => create({ userId: testUserId, ...data });

    const getAll = expenseModel.getAll.bind(expenseModel);
    expenseModel.getAll = (userIdOrFilters, filters) => {
      if (typeof userIdOrFilters === 'string') {
        return getAll(userIdOrFilters, filters);
      }
      return getAll(testUserId, userIdOrFilters || {});
    };
  });

  afterEach(() => {
    // Clear all expenses between tests
    db.exec('DELETE FROM expenses');
  });

  // ============================================
  // BR1: DECIMAL PRECISION FOR MONEY
  // ============================================

  describe('BR1: Money Handling - Decimal Precision', () => {
    test('stores amount with exactly 2 decimal places', () => {
      const result = expenseModel.create({
        amount: 100.5,
        category: 'Food',
        description: 'Test',
        date: '2026-05-01',
        idempotencyKey: 'test-1'
      });

      expect(result.success).toBe(true);
      expect(result.expense.amount).toBe('100.50'); // Formatted to 2 places
    });

    test('handles very small decimal amounts correctly', () => {
      const result = expenseModel.create({
        amount: 0.01,
        category: 'Food',
        description: 'Test',
        date: '2026-05-01',
        idempotencyKey: 'test-2'
      });

      expect(result.success).toBe(true);
      expect(result.expense.amount).toBe('0.01');
    });

    test('handles large decimal amounts correctly', () => {
      const result = expenseModel.create({
        amount: 999999.99,
        category: 'Food',
        description: 'Test',
        date: '2026-05-01',
        idempotencyKey: 'test-3'
      });

      expect(result.success).toBe(true);
      expect(result.expense.amount).toBe('999999.99');
    });

    test('rejects amounts with more than 2 decimal places', () => {
      const result = expenseModel.create({
        amount: 100.123,
        category: 'Food',
        description: 'Test',
        date: '2026-05-01',
        idempotencyKey: 'test-4'
      });

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(400);
      expect(result.errors.amount).toContain('2 decimal places');
    });

    test('calculates total with perfect precision (no floating-point errors)', () => {
      expenseModel.create({
        amount: 0.1,
        category: 'Food',
        description: 'Test 1',
        date: '2026-05-01',
        idempotencyKey: 'test-5a'
      });

      expenseModel.create({
        amount: 0.2,
        category: 'Food',
        description: 'Test 2',
        date: '2026-05-01',
        idempotencyKey: 'test-5b'
      });

      const expenses = expenseModel.getAll();
      const total = Expense.calculateTotal(expenses);

      // With floating-point: 0.1 + 0.2 = 0.30000000000000004
      // With Decimal.js: 0.1 + 0.2 = 0.30
      expect(total).toBe('0.30');
    });
  });

  // ============================================
  // BR2: IDEMPOTENCY & DUPLICATE PREVENTION
  // ============================================

  describe('BR2: Idempotency - Duplicate Prevention', () => {
    test('first submission returns 201 Created', () => {
      const result = expenseModel.create({
        amount: 500,
        category: 'Food',
        description: 'First submission',
        date: '2026-05-01',
        idempotencyKey: 'unique-key-1'
      });

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(201);
      expect(result.isDuplicate).toBe(false);
    });

    test('duplicate request with same idempotencyKey returns 200 OK', () => {
      const key = 'unique-key-2';
      const data = {
        amount: 500,
        category: 'Food',
        description: 'Test expense',
        date: '2026-05-01',
        idempotencyKey: key
      };

      const result1 = expenseModel.create(data);
      expect(result1.statusCode).toBe(201);

      // Duplicate submission with same key
      const result2 = expenseModel.create(data);
      expect(result2.success).toBe(true);
      expect(result2.statusCode).toBe(200);
      expect(result2.isDuplicate).toBe(true);
    });

    test('duplicate returns the SAME expense (no new record created)', () => {
      const key = 'unique-key-3';
      const data = {
        amount: 750,
        category: 'Transport',
        description: 'Taxi ride',
        date: '2026-05-01',
        idempotencyKey: key
      };

      const result1 = expenseModel.create(data);
      const id1 = result1.expense.id;

      const result2 = expenseModel.create(data);
      const id2 = result2.expense.id;

      expect(id1).toBe(id2); // Same ID, not a new record
    });

    test('only ONE record is created despite multiple duplicate submissions', () => {
      const key = 'unique-key-4';
      const data = {
        amount: 500,
        category: 'Food',
        description: 'Test',
        date: '2026-05-01',
        idempotencyKey: key
      };

      expenseModel.create(data); // 1st: created (201)
      expenseModel.create(data); // 2nd: duplicate (200)
      expenseModel.create(data); // 3rd: duplicate (200)
      expenseModel.create(data); // 4th: duplicate (200)

      const expenses = expenseModel.getAll();
      expect(expenses.length).toBe(1); // Only 1 record in database
    });

    test('different idempotencyKeys create separate records even with identical data', () => {
      const data = {
        amount: 500,
        category: 'Food',
        description: 'Lunch',
        date: '2026-05-01'
      };

      const result1 = expenseModel.create({ ...data, idempotencyKey: 'key-1' });
      const result2 = expenseModel.create({ ...data, idempotencyKey: 'key-2' });

      expect(result1.statusCode).toBe(201);
      expect(result2.statusCode).toBe(201);
      expect(result1.expense.id).not.toBe(result2.expense.id);

      const expenses = expenseModel.getAll();
      expect(expenses.length).toBe(2); // Two separate records
    });
  });

  // ============================================
  // BR3: EXPENSE VALIDATION
  // ============================================

  describe('BR3: Expense Validation', () => {
    test('rejects negative amount', () => {
      const result = expenseModel.create({
        amount: -500,
        category: 'Food',
        description: 'Test',
        date: '2026-05-01',
        idempotencyKey: 'test-neg-1'
      });

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(400);
      expect(result.errors.amount).toBeDefined();
    });

    test('rejects zero amount', () => {
      const result = expenseModel.create({
        amount: 0,
        category: 'Food',
        description: 'Test',
        date: '2026-05-01',
        idempotencyKey: 'test-zero-1'
      });

      expect(result.success).toBe(false);
      expect(result.errors.amount).toBeDefined();
    });

    test('rejects amount exceeding max (999999.99)', () => {
      const result = expenseModel.create({
        amount: 1000000.00,
        category: 'Food',
        description: 'Test',
        date: '2026-05-01',
        idempotencyKey: 'test-max-1'
      });

      expect(result.success).toBe(false);
      expect(result.errors.amount).toContain('cannot exceed');
    });

    test('rejects invalid category', () => {
      const result = expenseModel.create({
        amount: 500,
        category: 'InvalidCategory',
        description: 'Test',
        date: '2026-05-01',
        idempotencyKey: 'test-cat-1'
      });

      expect(result.success).toBe(false);
      expect(result.errors.category).toBeDefined();
    });

    test('accepts all valid categories', () => {
      VALID_CATEGORIES.forEach((category, index) => {
        const result = expenseModel.create({
          amount: 500,
          category: category,
          description: 'Test',
          date: '2026-05-01',
          idempotencyKey: `test-valid-cat-${index}`
        });

        expect(result.success).toBe(true);
      });
    });

    test('rejects empty description', () => {
      const result = expenseModel.create({
        amount: 500,
        category: 'Food',
        description: '',
        date: '2026-05-01',
        idempotencyKey: 'test-desc-1'
      });

      expect(result.success).toBe(false);
      expect(result.errors.description).toBeDefined();
    });

    test('rejects description exceeding 255 characters', () => {
      const longDesc = 'x'.repeat(256);
      const result = expenseModel.create({
        amount: 500,
        category: 'Food',
        description: longDesc,
        date: '2026-05-01',
        idempotencyKey: 'test-desc-2'
      });

      expect(result.success).toBe(false);
      expect(result.errors.description).toContain('255');
    });

    test('rejects invalid date format', () => {
      const result = expenseModel.create({
        amount: 500,
        category: 'Food',
        description: 'Test',
        date: '2026/05/01', // Wrong format
        idempotencyKey: 'test-date-1'
      });

      expect(result.success).toBe(false);
      expect(result.errors.date).toBeDefined();
    });

    test('rejects future date', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const futureDateStr = futureDate.toISOString().split('T')[0];

      const result = expenseModel.create({
        amount: 500,
        category: 'Food',
        description: 'Test',
        date: futureDateStr,
        idempotencyKey: 'test-future-1'
      });

      expect(result.success).toBe(false);
      expect(result.errors.date).toContain('cannot be in the future');
    });

    test('accepts today\'s date', () => {
      const today = new Date().toISOString().split('T')[0];

      const result = expenseModel.create({
        amount: 500,
        category: 'Food',
        description: 'Test',
        date: today,
        idempotencyKey: 'test-today-1'
      });

      expect(result.success).toBe(true);
    });

    test('rejects missing required fields', () => {
      const result = expenseModel.create({
        category: 'Food',
        description: 'Test',
        date: '2026-05-01',
        idempotencyKey: 'test-missing-1'
        // amount is missing
      });

      expect(result.success).toBe(false);
      expect(result.errors.amount).toBeDefined();
    });
  });

  // ============================================
  // BR6: CATEGORY ENUM
  // ============================================

  describe('BR6: Category Management', () => {
    test('all valid categories can be stored', () => {
      const validCategories = VALID_CATEGORIES;

      validCategories.forEach((cat, i) => {
        const result = expenseModel.create({
          amount: 100,
          category: cat,
          description: `Category: ${cat}`,
          date: '2026-05-01',
          idempotencyKey: `cat-${i}`
        });

        expect(result.success).toBe(true);
      });
    });

    test('filtering by category returns only matching expenses', () => {
      expenseModel.create({
        amount: 100,
        category: 'Food',
        description: 'Lunch',
        date: '2026-05-01',
        idempotencyKey: 'filter-1'
      });

      expenseModel.create({
        amount: 200,
        category: 'Transport',
        description: 'Taxi',
        date: '2026-05-01',
        idempotencyKey: 'filter-2'
      });

      expenseModel.create({
        amount: 150,
        category: 'Food',
        description: 'Dinner',
        date: '2026-05-01',
        idempotencyKey: 'filter-3'
      });

      const foodExpenses = expenseModel.getAll({ category: 'Food' });
      expect(foodExpenses.length).toBe(2);
      expect(foodExpenses.every(e => e.category === 'Food')).toBe(true);
    });
  });

  // ============================================
  // BR8: SUMMARY CALCULATIONS
  // ============================================

  describe('BR8: Summary Calculations', () => {
    test('calculates correct total for single expense', () => {
      expenseModel.create({
        amount: 500.50,
        category: 'Food',
        description: 'Test',
        date: '2026-05-01',
        idempotencyKey: 'total-1'
      });

      const expenses = expenseModel.getAll();
      const total = Expense.calculateTotal(expenses);

      expect(total).toBe('500.50');
    });

    test('calculates correct total for multiple expenses', () => {
      expenseModel.create({
        amount: 100,
        category: 'Food',
        description: 'Test 1',
        date: '2026-05-01',
        idempotencyKey: 'total-2a'
      });

      expenseModel.create({
        amount: 250.50,
        category: 'Transport',
        description: 'Test 2',
        date: '2026-05-01',
        idempotencyKey: 'total-2b'
      });

      expenseModel.create({
        amount: 149.50,
        category: 'Entertainment',
        description: 'Test 3',
        date: '2026-05-01',
        idempotencyKey: 'total-2c'
      });

      const expenses = expenseModel.getAll();
      const total = Expense.calculateTotal(expenses);

      expect(total).toBe('500.00');
    });

    test('total is always formatted with 2 decimal places', () => {
      expenseModel.create({
        amount: 100.10,
        category: 'Food',
        description: 'Test',
        date: '2026-05-01',
        idempotencyKey: 'total-3'
      });

      const expenses = expenseModel.getAll();
      const total = Expense.calculateTotal(expenses);

      expect(total).toBe('100.10');
      expect(total.split('.')[1].length).toBe(2);
    });
  });
});
