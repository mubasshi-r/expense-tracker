# Expense Tracker Backend API

Node.js + Express + SQLite API for the Personal Expense Tracker.

## 🏗️ Architecture

### Tech Stack
- **Runtime**: Node.js (ES6 modules)
- **Framework**: Express.js
- **Database**: SQLite with better-sqlite3
- **Money Handling**: Decimal.js (prevents floating-point errors)
- **Idempotency**: UUID v4 + database UNIQUE constraint

### Project Structure
```
backend/
├── src/
│   ├── app.js              # Express app setup, routes, error handling
│   ├── db.js               # SQLite initialization and schema
│   ├── constants.js        # Business rules & validation constants
│   └── models/
│       └── Expense.js      # Expense model with CRUD operations
├── tests/                  # Unit & integration tests
├── package.json
├── .env.example
└── README.md
```

## 🎯 Business Rules Implementation

### BR1: Money Handling - Decimal Precision
- **Implementation**: Decimal.js library + DECIMAL(10,2) database type
- **Impact**: No floating-point rounding errors
- **Example**: Always stores ₹1,234.56 precisely (never 1234.5600000001)

### BR2: Idempotency - Duplicate Prevention
- **Implementation**: UUID v4 idempotencyKey + UNIQUE constraint
- **Flow**:
  1. Client generates UUID for each submission
  2. Backend checks if UUID exists in database
  3. If exists: Return 200 OK with existing record (no duplicate created)
  4. If new: Create record and return 201 Created
- **Impact**: Safe to retry on network failures or page refresh

### BR3: Expense Validation
- **Rules Enforced**:
  - Amount: > 0 and ≤ 999,999.99, max 2 decimal places
  - Category: One of [Food, Transport, Entertainment, Utilities, Other]
  - Description: 1-255 characters
  - Date: Valid ISO 8601 date, not in future
- **Response**: 400 Bad Request with field-specific error messages

### BR4: Filtering and Sorting
- **GET /expenses?category=Food** - Filter by category (applied in database)
- **GET /expenses?sort=date_asc** - Sort oldest first (default: newest first)
- **Frontend**: Client-side filtering for fine-tuned UX

### BR6: Category Enum
- **Constraint**: Database CHECK constraint ensures only valid categories
- **Valid**: Food, Transport, Entertainment, Utilities, Other

### BR7: Immutability
- **No PUT/PATCH endpoints** - Expenses are immutable after creation
- **No DELETE endpoint** - Data is permanent (audit trail)
- **Result**: Data integrity and audit compliance

### BR8: Summary Calculations
- **Endpoint**: GET /expenses response includes `total` field
- **Calculation**: SUM of all filtered/sorted amounts using Decimal.js
- **Format**: Always 2 decimal places (e.g., "₹1,234.56")

### BR10: Error Handling
- **Format**: Consistent JSON response with error and details
- **Response**:
  ```json
  {
    "error": "Validation failed",
    "details": {
      "amount": "Amount must be greater than 0",
      "category": "Category is required"
    }
  }
  ```

## 🚀 API Endpoints

### POST /expenses
**Create a new expense**

**Request**:
```bash
curl -X POST http://localhost:3000/expenses \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 500.50,
    "category": "Food",
    "description": "Lunch at Pizza Hut",
    "date": "2026-05-01",
    "idempotencyKey": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

**Success Response (201 Created)**:
```json
{
  "success": true,
  "isDuplicate": false,
  "message": "Expense created successfully",
  "expense": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "amount": "500.50",
    "category": "Food",
    "description": "Lunch at Pizza Hut",
    "date": "2026-05-01",
    "created_at": "2026-05-01T10:30:45.123Z"
  }
}
```

**Duplicate Response (200 OK)**:
```json
{
  "success": true,
  "isDuplicate": true,
  "message": "Expense already exists (duplicate submission handled)",
  "expense": { ... }
}
```

**Validation Error (400 Bad Request)**:
```json
{
  "error": "Validation failed",
  "details": {
    "amount": "Amount must be greater than 0",
    "category": "Category is required"
  }
}
```

### GET /expenses
**Retrieve all expenses with optional filtering**

**Request**:
```bash
# Get all expenses
curl http://localhost:3000/expenses

# Filter by category
curl http://localhost:3000/expenses?category=Food

# Sort oldest first
curl http://localhost:3000/expenses?sort=date_asc
```

**Response**:
```json
{
  "success": true,
  "expenses": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "amount": "500.50",
      "category": "Food",
      "description": "Lunch",
      "date": "2026-05-01",
      "created_at": "2026-05-01T10:30:45.123Z"
    }
  ],
  "total": "500.50",
  "count": 1
}
```

## 🔧 Setup & Running

### Install Dependencies
```bash
npm install
```

### Start Development Server
```bash
npm run dev          # Watch mode
npm start            # Production
```

### Run Tests
```bash
npm test             # Single run
npm run test:watch   # Watch mode
```

## 🛠️ Design Decisions

### Why SQLite?
- ✅ Zero-setup, single-file database
- ✅ Perfect for single-user expense tracker
- ✅ Easy to version control and test
- ✅ No external dependencies like PostgreSQL
- ✅ Simple to deploy (just copy .db file)

### Why Decimal.js?
- ✅ Prevents floating-point errors (0.1 + 0.2 ≠ 0.3 in IEEE 754)
- ✅ Financial accuracy critical for money
- ✅ JavaScript's native Number type is unsafe for currency

### Why UUID for Idempotency?
- ✅ Client-generated (no backend coordination needed)
- ✅ Globally unique across retries
- ✅ Transparent to user (no manual confirmation needed)
- ✅ Simple to implement (just add to UNIQUE constraint)

### Why No UPDATE/DELETE?
- ✅ Audit trail (all records preserved)
- ✅ Data integrity (no accidental deletions)
- ✅ Simplifies API (fewer edge cases)
- ✅ Financial compliance (immutable records)

## ⚠️ Trade-offs & Limitations

### Immutability
- **Trade-off**: User cannot fix typos or change expenses
- **Rationale**: Financial correctness > User convenience (can add correcting expense)
- **Future**: Could add soft-delete or amendment feature

### Single User
- **Trade-off**: No authentication or multi-user support
- **Rationale**: Doubles complexity without core business value
- **Future**: Add user column + authentication when needed

### Client-side Filtering
- **Trade-off**: All expenses downloaded, filtered client-side
- **Rationale**: Typical dataset < 10k items (fast client-side)
- **Future**: Add pagination or server-side filtering for large datasets

## 🧪 Testing Strategy

See `/tests` directory for:
- POST /expenses validation tests
- Duplicate submission handling (BR2)
- Total calculation tests (BR8)
- Error response format tests (BR10)

## 📝 Environment Variables

```env
PORT=3000              # Server port
NODE_ENV=development   # Environment (development/production)
```

See `.env.example` for configuration template.

## 🚀 Deployment

### Deployment Checklist
- [ ] NODE_ENV=production
- [ ] Database backed up
- [ ] Network timeout configured (3s)
- [ ] Request logging enabled
- [ ] Error monitoring active
- [ ] Health check endpoint available

### Deployment Platforms
- Render.com (recommended for free tier)
- Railway.app
- Heroku (upgraded to paid)
- Self-hosted Node.js server

## 📚 References

- [Express.js Documentation](https://expressjs.com)
- [better-sqlite3 Docs](https://github.com/WiseLibs/better-sqlite3)
- [Decimal.js Docs](http://mikemcl.github.io/decimal.js/)

---

**Version**: 1.0.0  
**Author**: mubasshi-r  
**Last Updated**: May 2026

