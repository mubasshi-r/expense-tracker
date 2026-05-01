import request from 'supertest';
import app from '../src/app.js';
import db, { initializeDatabase } from '../src/db.js';

/**
 * INTEGRATION TESTS FOR API ENDPOINTS
 * 
 * Tests end-to-end API behavior:
 * - POST /expenses with idempotency
 * - GET /expenses with filtering and sorting
 * - Error handling and validation
 * - Decimal precision in responses
 */

describe('Expense Tracker API - Integration Tests', () => {
  beforeAll(() => {
    initializeDatabase();
  });

  afterEach(() => {
    // Clear database after each test to prevent state leakage
    try {
      db.exec('DELETE FROM expenses');
    } catch (e) {
      // Ignore errors if db is closed
    }
  });

  // ============================================
  // POST /expenses ENDPOINT
  // ============================================

  describe('POST /expenses', () => {
    test('creates a new expense successfully (201)', async () => {
      const response = await request(app)
        .post('/expenses')
        .send({
          amount: 500.50,
          category: 'Food',
          description: 'Lunch at restaurant',
          date: '2026-05-01',
          idempotencyKey: 'uuid-1'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.isDuplicate).toBe(false);
      expect(response.body.expense.amount).toBe('500.50');
      expect(response.body.expense.id).toBeDefined();
    });

    test('returns 200 for duplicate idempotencyKey (BR2)', async () => {
      const payload = {
        amount: 500.50,
        category: 'Food',
        description: 'Lunch',
        date: '2026-05-01',
        idempotencyKey: 'uuid-dup-1'
      };

      const response1 = await request(app).post('/expenses').send(payload);
      expect(response1.status).toBe(201);

      const response2 = await request(app).post('/expenses').send(payload);
      expect(response2.status).toBe(200);
      expect(response2.body.isDuplicate).toBe(true);
      expect(response2.body.expense.id).toBe(response1.body.expense.id);
    });

    test('returns 400 for validation error - negative amount', async () => {
      const response = await request(app)
        .post('/expenses')
        .send({
          amount: -100,
          category: 'Food',
          description: 'Test',
          date: '2026-05-01',
          idempotencyKey: 'uuid-val-1'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details.amount).toBeDefined();
    });

    test('returns 400 for validation error - invalid category', async () => {
      const response = await request(app)
        .post('/expenses')
        .send({
          amount: 500,
          category: 'InvalidCat',
          description: 'Test',
          date: '2026-05-01',
          idempotencyKey: 'uuid-val-2'
        });

      expect(response.status).toBe(400);
      expect(response.body.details.category).toBeDefined();
    });

    test('returns 400 for validation error - empty description', async () => {
      const response = await request(app)
        .post('/expenses')
        .send({
          amount: 500,
          category: 'Food',
          description: '',
          date: '2026-05-01',
          idempotencyKey: 'uuid-val-3'
        });

      expect(response.status).toBe(400);
      expect(response.body.details.description).toBeDefined();
    });

    test('returns 400 for validation error - missing idempotencyKey', async () => {
      const response = await request(app)
        .post('/expenses')
        .send({
          amount: 500,
          category: 'Food',
          description: 'Test',
          date: '2026-05-01'
          // idempotencyKey missing
        });

      expect(response.status).toBe(400);
      expect(response.body.details.idempotencyKey).toBeDefined();
    });

    test('preserves decimal precision (BR1)', async () => {
      const response = await request(app)
        .post('/expenses')
        .send({
          amount: 99.99,
          category: 'Utilities',
          description: 'Electric bill',
          date: '2026-05-01',
          idempotencyKey: 'uuid-decimal-1'
        });

      expect(response.status).toBe(201);
      expect(response.body.expense.amount).toBe('99.99');
    });

    test('formats amount to 2 decimal places', async () => {
      const response = await request(app)
        .post('/expenses')
        .send({
          amount: 100,
          category: 'Food',
          description: 'Meal',
          date: '2026-05-01',
          idempotencyKey: 'uuid-format-1'
        });

      expect(response.status).toBe(201);
      expect(response.body.expense.amount).toBe('100.00');
    });
  });

  // ============================================
  // GET /expenses ENDPOINT
  // ============================================

  describe('GET /expenses', () => {
    test('returns all expenses', async () => {
      // Create expenses one by one
      const exp1 = await request(app)
        .post('/expenses')
        .send({
          amount: 500,
          category: 'Food',
          description: 'Lunch',
          date: '2026-05-01',
          idempotencyKey: 'get-1-uuid'
        });
      expect(exp1.status).toBe(201);

      const exp2 = await request(app)
        .post('/expenses')
        .send({
          amount: 200,
          category: 'Transport',
          description: 'Taxi',
          date: '2026-05-02',
          idempotencyKey: 'get-2-uuid'
        });
      expect(exp2.status).toBe(201);

      const exp3 = await request(app)
        .post('/expenses')
        .send({
          amount: 150,
          category: 'Food',
          description: 'Dinner',
          date: '2026-04-30',
          idempotencyKey: 'get-3-uuid'
        });
      expect(exp3.status).toBe(201);

      // Now fetch all
      const response = await request(app).get('/expenses');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.expenses.length).toBeGreaterThanOrEqual(3);
      expect(response.body.count).toBeGreaterThanOrEqual(3);
    });

    test('calculates correct total (BR8)', async () => {
      await request(app)
        .post('/expenses')
        .send({
          amount: 500.50,
          category: 'Food',
          description: 'Lunch',
          date: '2026-05-01',
          idempotencyKey: 'total-test-1'
        });

      await request(app)
        .post('/expenses')
        .send({
          amount: 249.50,
          category: 'Transport',
          description: 'Taxi',
          date: '2026-05-02',
          idempotencyKey: 'total-test-2'
        });

      const response = await request(app).get('/expenses');

      expect(response.status).toBe(200);
      expect(response.body.total).toBe('750.00');
    });

    test('returns empty list as valid response', async () => {
      const response = await request(app).get('/expenses');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.expenses)).toBe(true);
      expect(response.body.total).toBeDefined();
      expect(response.body.count).toBeDefined();
    });
  });

  // ============================================
  // HEALTH CHECK
  // ============================================

  describe('GET /health', () => {
    test('health endpoint returns ok status', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
    });
  });

  // ============================================
  // ERROR HANDLING
  // ============================================

  describe('Error Handling (BR10)', () => {
    test('404 for non-existent route', async () => {
      const response = await request(app).get('/non-existent-route');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Not found');
    });

    test('error response has consistent format', async () => {
      const response = await request(app)
        .post('/expenses')
        .send({
          amount: -100,
          category: 'Food',
          description: 'Test',
          date: '2026-05-01',
          idempotencyKey: 'uuid-err-1'
        });

      expect(response.body.error).toBeDefined();
      expect(response.body.details).toBeDefined();
      expect(typeof response.body.details).toBe('object');
    });
  });

  // ============================================
  // REAL-WORLD SCENARIOS
  // ============================================

  describe('Real-World Scenarios', () => {
    test('Scenario 1: User submits form, refreshes page, submits again (no duplicate)', async () => {
      // First submission
      const response1 = await request(app)
        .post('/expenses')
        .send({
          amount: 500,
          category: 'Food',
          description: 'Lunch',
          date: '2026-05-01',
          idempotencyKey: 'scenario-1-key'
        });
      expect(response1.status).toBe(201);
      expect(response1.body.isDuplicate).toBe(false);

      // Page refresh (form still has same idempotencyKey)
      // User accidentally submits again (or form auto-submits)
      const response2 = await request(app)
        .post('/expenses')
        .send({
          amount: 500,
          category: 'Food',
          description: 'Lunch',
          date: '2026-05-01',
          idempotencyKey: 'scenario-1-key'
        });
      expect(response2.status).toBe(200);
      expect(response2.body.isDuplicate).toBe(true);
      expect(response1.body.expense.id).toBe(response2.body.expense.id);
    });

    test('Scenario 2: User adds multiple expenses and views total', async () => {
      await request(app)
        .post('/expenses')
        .send({
          amount: 100,
          category: 'Food',
          description: 'Breakfast',
          date: '2026-05-01',
          idempotencyKey: 'scenario-2a-key'
        });

      await request(app)
        .post('/expenses')
        .send({
          amount: 50.50,
          category: 'Transport',
          description: 'Bus fare',
          date: '2026-05-01',
          idempotencyKey: 'scenario-2b-key'
        });

      const response = await request(app).get('/expenses');

      expect(response.status).toBe(200);
      expect(response.body.count).toBeGreaterThanOrEqual(2);
      expect(response.body.total).toBe('150.50');
    });

    test('Scenario 3: Multiple retries with network failure (same idempotencyKey)', async () => {
      // Simulate retries: all with same key
      const key = 'retry-scenario-key';

      const attempt1 = await request(app)
        .post('/expenses')
        .send({
          amount: 750.25,
          category: 'Utilities',
          description: 'Electric bill',
          date: '2026-05-01',
          idempotencyKey: key
        });

      expect(attempt1.status).toBe(201);
      const expenseId = attempt1.body.expense.id;

      // Retry 1 (400ms later, user clicks retry or auto-retry)
      const attempt2 = await request(app)
        .post('/expenses')
        .send({
          amount: 750.25,
          category: 'Utilities',
          description: 'Electric bill',
          date: '2026-05-01',
          idempotencyKey: key
        });

      expect(attempt2.status).toBe(200);
      expect(attempt2.body.expense.id).toBe(expenseId);

      // Retry 2
      const attempt3 = await request(app)
        .post('/expenses')
        .send({
          amount: 750.25,
          category: 'Utilities',
          description: 'Electric bill',
          date: '2026-05-01',
          idempotencyKey: key
        });

      expect(attempt3.status).toBe(200);
      expect(attempt3.body.expense.id).toBe(expenseId);

      // Verify only ONE record in database despite 3 attempts
      const listResponse = await request(app).get('/expenses');
      const filtered = listResponse.body.expenses.filter(e => e.idempotencyKey === key);
      expect(filtered.length).toBe(1);
    });
  });
});
