import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

/**
 * User Model
 * 
 * Handles user registration, login, and authentication
 * Passwords are hashed with bcrypt (10 rounds)
 */
export default class User {
  constructor(db) {
    this.db = db;
  }

  /**
   * Register a new user
   */
  register(userData) {
    const { username, email, password } = userData;

    // Validation
    const errors = {};

    if (!username || username.trim().length < 3) {
      errors.username = 'Username must be at least 3 characters';
    }

    if (!email || !this.isValidEmail(email)) {
      errors.email = 'Valid email is required';
    }

    if (!password || password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    if (Object.keys(errors).length > 0) {
      return {
        success: false,
        statusCode: 400,
        errors
      };
    }

    try {
      // Check if user already exists
      const existing = this.db.prepare(
        'SELECT id FROM users WHERE username = ? OR email = ?'
      ).get(username, email);

      if (existing) {
        return {
          success: false,
          statusCode: 409,
          error: 'User already exists',
          details: {
            message: 'Username or email already in use'
          }
        };
      }

      // Hash password
      const hashedPassword = bcrypt.hashSync(password, 10);

      // Create user
      const userId = uuidv4();
      const createdAt = new Date().toISOString();

      const stmt = this.db.prepare(`
        INSERT INTO users (id, username, email, password, created_at)
        VALUES (?, ?, ?, ?, ?)
      `);

      stmt.run(userId, username, email, hashedPassword, createdAt);

      return {
        success: true,
        statusCode: 201,
        user: {
          id: userId,
          username,
          email,
          created_at: createdAt
        },
        message: 'User registered successfully'
      };
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        statusCode: 500,
        error: 'Registration failed',
        details: { message: error.message }
      };
    }
  }

  /**
   * Login user (verify credentials)
   */
  login(credentials) {
    const { username, password } = credentials;

    if (!username || !password) {
      return {
        success: false,
        statusCode: 400,
        error: 'Username and password required'
      };
    }

    try {
      const user = this.db.prepare(
        'SELECT id, username, email, password FROM users WHERE username = ?'
      ).get(username);

      if (!user || !bcrypt.compareSync(password, user.password)) {
        return {
          success: false,
          statusCode: 401,
          error: 'Invalid credentials',
          details: { message: 'Username or password is incorrect' }
        };
      }

      return {
        success: true,
        statusCode: 200,
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        },
        message: 'Login successful'
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        statusCode: 500,
        error: 'Login failed',
        details: { message: error.message }
      };
    }
  }

  /**
   * Get user by ID
   */
  getById(userId) {
    try {
      const user = this.db.prepare(
        'SELECT id, username, email, created_at FROM users WHERE id = ?'
      ).get(userId);

      return user || null;
    } catch (error) {
      console.error('Get user error:', error);
      return null;
    }
  }

  /**
   * Update user profile
   */
  updateProfile(userId, updates) {
    const { email } = updates;

    if (!email || !this.isValidEmail(email)) {
      return {
        success: false,
        statusCode: 400,
        error: 'Valid email required'
      };
    }

    try {
      // Check if email is already used by another user
      const existing = this.db.prepare(
        'SELECT id FROM users WHERE email = ? AND id != ?'
      ).get(email, userId);

      if (existing) {
        return {
          success: false,
          statusCode: 409,
          error: 'Email already in use'
        };
      }

      const stmt = this.db.prepare('UPDATE users SET email = ? WHERE id = ?');
      stmt.run(email, userId);

      const user = this.getById(userId);
      return {
        success: true,
        statusCode: 200,
        user,
        message: 'Profile updated successfully'
      };
    } catch (error) {
      console.error('Update profile error:', error);
      return {
        success: false,
        statusCode: 500,
        error: 'Update failed'
      };
    }
  }

  /**
   * Validate email format
   */
  isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }
}
