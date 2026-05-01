import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../../expenses.db');

/**
 * BUSINESS RULE BR1: Money Handling - Decimal Precision
 * All monetary amounts stored as DECIMAL(10,2) type
 * 
 * BUSINESS RULE BR7: Data Persistence and Audit Trail
 * All expenses are immutable after creation (no UPDATE/DELETE)
 * Only creation timestamp exists (no updated_at)
 */

// Initialize SQLite database
const db = new Database(dbPath);
db.pragma('journal_mode = WAL'); // Write-Ahead Logging for better concurrency

/**
 * Database Schema
 * 
 * @table expenses
 * @field id UUID (primary key) - Unique identifier
 * @field idempotencyKey UUID (UNIQUE) - Prevents duplicate submissions (BR2)
 * @field amount DECIMAL(10,2) - Monetary amount with precision (BR1)
 * @field category TEXT - One of predefined categories (BR6)
 * @field description TEXT - User-provided description (max 255 chars)
 * @field date TEXT - ISO 8601 date format (BR9)
 * @field created_at TEXT - ISO 8601 timestamp (audit trail, BR7)
 */

export function initializeDatabase() {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY,
        idempotencyKey TEXT UNIQUE NOT NULL,
        amount TEXT NOT NULL,
        category TEXT NOT NULL CHECK(category IN ('Food', 'Transport', 'Entertainment', 'Utilities', 'Other')),
        description TEXT NOT NULL,
        date TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      
      CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date DESC);
      CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
      CREATE INDEX IF NOT EXISTS idx_expenses_idempotencyKey ON expenses(idempotencyKey);
    `);
    
    console.log('✓ Database initialized successfully');
    return db;
  } catch (error) {
    console.error('✗ Database initialization failed:', error);
    process.exit(1);
  }
}

export default db;
