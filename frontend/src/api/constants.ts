/**
 * Frontend Constants
 * 
 * Aligned with backend constants (SRS - BR6)
 */

export const VALID_CATEGORIES = Object.freeze([
  'Food',
  'Transport',
  'Entertainment',
  'Utilities',
  'Other'
]);

export const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  'Food': '🍽️ Groceries, meals, snacks',
  'Transport': '🚗 Fuel, public transport, parking',
  'Entertainment': '🎬 Movies, games, events',
  'Utilities': '💡 Electricity, water, internet',
  'Other': '📌 Miscellaneous'
};

export const VALIDATION_RULES = {
  AMOUNT_MIN: 0.01,
  AMOUNT_MAX: 999999.99,
  DESCRIPTION_MIN_LENGTH: 1,
  DESCRIPTION_MAX_LENGTH: 255
};

export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Connection failed. Please check your internet and try again.',
  VALIDATION_ERROR: 'Please fix the errors below and try again.',
  SERVER_ERROR: 'Something went wrong. Please try again later.',
  DUPLICATE_SUBMISSION: 'This expense was already recorded'
};

export const API_TIMEOUTS = {
  REQUEST: 30000, // 30 seconds
  RETRY_DELAYS: [1000, 2000, 4000] // 1s, 2s, 4s (exponential backoff)
};
