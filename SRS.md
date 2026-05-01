# Software Requirements Specification (SRS)
## Personal Expense Tracker

**Project**: Expense Tracker Full-Stack Application
**Version**: 1.0
**Date**: May 2026
**Status**: In Development

---

## 1. Executive Summary

The Personal Expense Tracker is a full-stack web application designed to help users record, review, and analyze their personal expenses. The system prioritizes data correctness, idempotency under unreliable networks, and real-world resilience patterns.

---

## 2. Use Cases

### USE CASE 1: User Records a New Expense Entry

**Actor**: User (Expense Tracker User)

**Preconditions**:
- Frontend application is loaded
- Internet connection is available (or cached form data exists)

**Main Flow**:
1. User navigates to the Expense Form section
2. User enters expense details:
   - Amount (e.g., ₹500.50)
   - Category (dropdown: Food, Transport, Entertainment, Utilities, Other)
   - Description (e.g., "Lunch at Pizza Hut")
   - Date (date picker, today by default)
3. System validates all fields client-side (real-time feedback)
4. User clicks "Add Expense" button
5. System generates unique UUID (idempotencyKey) for this submission
6. System sends POST request to `/expenses` endpoint with idempotencyKey
7. Backend validates expense data
8. Backend checks for duplicate idempotencyKey
9. Backend stores expense in database
10. System receives 201 Created response with expense ID
11. System displays success toast notification
12. System clears the form
13. System auto-fetches updated expense list
14. User can see new expense in the list

**Alternate Flow 2A: Validation Error**
- At Step 7: Backend returns 400 Bad Request with error details
- System displays error message to user
- User corrects input and resubmits
- Continue from Step 4

**Alternate Flow 2B: Network Failure (First Attempt)**
- At Step 6: Network request fails (timeout/no connection)
- System shows error toast: "Failed to save. Retrying..."
- System automatically retries (exponential backoff: 1s, 2s, 4s)
- If retry succeeds: Continue from Step 10
- If all retries fail: Show error message with "Retry" button
- User can click "Retry" to manually attempt again

**Alternate Flow 2C: Duplicate Submission (Browser Refresh)**
- User submits form successfully (Step 10 received)
- User refreshes browser before clearing form
- Form still contains data and idempotencyKey
- User clicks "Add Expense" again
- At Step 7: Backend detects duplicate idempotencyKey
- Backend returns 200 OK with existing expense (no new record created)
- System treats this as success and proceeds as if new expense created
- User sees no indication of duplicate (transparent to user)

**Postconditions**:
- New expense record is created (or already exists)
- Database contains exactly one record per unique idempotencyKey
- User sees updated expense list
- Form is cleared and ready for next entry

**Business Rules Involved**: BR1, BR2, BR3, BR5

---

### USE CASE 2: User Views All Expenses

**Actor**: User

**Preconditions**:
- Frontend application is loaded
- At least one expense exists in database

**Main Flow**:
1. System loads expense list on page load
2. System displays GET request to `/expenses` (no filters)
3. Backend returns all expenses sorted by created_at descending
4. System displays expenses in table/card format:
   - Date, Category, Description, Amount
5. System calculates and displays total: "Total: ₹X,XXX.XX"
6. All expenses visible to user

**Alternate Flow 2A: Empty List**
- At Step 3: Backend returns empty array
- System displays "No expenses found" message
- System UI remains functional (user can add first expense)

**Alternate Flow 2B: Network Failure**
- At Step 2: Network request fails
- System displays loading skeleton or cached data (if available)
- After 3 retries, show error: "Unable to load expenses. Retry later."
- User can manually refresh page

**Postconditions**:
- User sees complete list of expenses
- Total matches sum of all displayed amounts

**Business Rules Involved**: BR2, BR4, BR7

---

### USE CASE 3: User Filters Expenses by Category

**Actor**: User

**Preconditions**:
- Expense list is loaded
- At least one expense exists

**Main Flow**:
1. User clicks category filter dropdown
2. System displays options: "All Categories", "Food", "Transport", "Entertainment", "Utilities", "Other"
3. User selects a category (e.g., "Food")
4. System filters expenses list client-side (already loaded)
5. System displays only expenses matching selected category
6. System recalculates total for filtered list
7. System displays: "Total (Food): ₹X,XXX.XX"

**Alternate Flow 3A: No Expenses in Selected Category**
- At Step 5: No expenses match filter
- System displays "No expenses in this category"
- Total shows: "Total: ₹0.00"

**Alternate Flow 3B: User Selects "All Categories"**
- At Step 3: User selects "All Categories"
- System displays all expenses again
- Total recalculates for all expenses

**Postconditions**:
- Filtered list shows only selected category
- Total reflects filtered results only
- User can change filter at any time

**Business Rules Involved**: BR4, BR6, BR8

---

### USE CASE 4: User Sorts Expenses by Date

**Actor**: User

**Preconditions**:
- Expense list is displayed

**Main Flow**:
1. User clicks "Sort by Date" button
2. Current sort state is "Newest First" (default)
3. System applies sort: newest expenses first (date DESC)
4. List re-renders with sorted order
5. Button changes to show current sort state
6. User can click button again to toggle to "Oldest First"

**Alternate Flow 4A: Toggle to Oldest First**
- At Step 6: User clicks button again
- System applies reverse sort (date ASC)
- Button text updates to "Oldest First"

**Postconditions**:
- Expenses are displayed in selected sort order
- Sort persists until user changes it
- Sort is independent of filters

**Business Rules Involved**: BR4, BR9

---

### USE CASE 5: User Views Expense Summary/Total

**Actor**: User

**Preconditions**:
- At least one expense exists
- Expense list is displayed

**Main Flow**:
1. System automatically calculates sum of all visible expenses (after filters/sort)
2. System displays total prominently: "Total: ₹X,XXX.XX"
3. Total updates whenever:
   - New expense is added
   - Filter is changed
   - Sort order is changed
   - Page is refreshed with new data

**Alternate Flow 5A: With Multiple Categories Filtered**
- User has filtered to "Food" category only
- System shows "Total (Food): ₹2,500.00"

**Alternate Flow 5B: Decimal Precision**
- Total correctly handles decimals: ₹2,500.50 (not ₹2,500.5)
- Money calculations never lose precision

**Postconditions**:
- Total is always visible and accurate
- Total reflects exact sum of visible expenses
- No rounding errors in calculation

**Business Rules Involved**: BR1, BR2, BR8

---

### USE CASE 6: User Experiences Network Failure and Retries

**Actor**: User (in unreliable network conditions)

**Preconditions**:
- User is submitting expense or loading list
- Network is unstable (slow, intermittent, or offline)

**Main Flow**:
1. User submits form or navigates
2. System attempts HTTP request
3. Network times out or fails
4. System shows: "Connection failed. Retrying in 1 second..."
5. System waits 1 second, then retries (exponential backoff)
6. If retry fails: "Retrying in 2 seconds..."
7. System retries up to 3 times total
8. If final retry fails: Show error with "Manual Retry" button
9. User can click button to attempt again

**Alternate Flow 6A: Successful Retry**
- At Step 5 or later: Network recovers
- Request succeeds
- System proceeds normally (user unaware of retries)
- Toast shows: "✓ Saved successfully"

**Alternate Flow 6B: Offline Scenario**
- User goes offline during form submission
- System shows: "You're offline. Your data is saved locally. We'll sync when you're back online."
- Form data persists in browser localStorage
- When network returns: System auto-syncs with idempotencyKey

**Postconditions**:
- System handles network failures gracefully
- User never loses data
- User sees clear feedback about what's happening

**Business Rules Involved**: BR2, BR5, BR10

---

### USE CASE 7: User Refreshes Page After Successful Submission

**Actor**: User (browser refresh)

**Preconditions**:
- User has just submitted an expense successfully
- Page refresh is triggered (F5, Ctrl+R, or button click)

**Main Flow**:
1. User refreshes page (intentionally or accidentally)
2. Browser clears form (default behavior)
3. Frontend application reinitializes
4. System sends GET request to `/expenses`
5. Backend returns complete list from database
6. System displays all expenses with latest data
7. Recently submitted expense is visible in list

**Alternate Flow 7A: Refresh During Submission**
- User submits form
- Before response:User refreshes page
- Form is cleared (in-progress data lost, but Backend commits expense)
- Page reloads and fetches expense list
- Recently submitted expense appears (idempotencyKey ensures single record)

**Postconditions**:
- Page refresh doesn't cause duplicate expenses
- User data is preserved on server
- List reflects server state accurately

**Business Rules Involved**: BR2, BR5, BR7

---

## 3. Business Rules

### BR1: Money Handling - Decimal Precision
**Description**: All monetary amounts must be stored and calculated using DECIMAL(10,2) type, never floating-point numbers.

**Rationale**: Floating-point arithmetic causes rounding errors. Example: 0.1 + 0.2 ≠ 0.3 in IEEE 754.

**Implementation**:
- Database: DECIMAL(10,2) column type
- Backend: Use Decimal library (e.g., decimal.js in Node.js)
- Frontend: Store amounts as cents (integer) or use Dinero.js library
- Validation: Enforce 2 decimal places always

**Impact**: Ensures financial accuracy, prevents audit issues.

---

### BR2: Idempotency - Duplicate Prevention
**Description**: Each expense submission must have a unique idempotencyKey. Duplicate submissions with the same key return existing record (HTTP 200) instead of creating a new one.

**Rationale**: Handles browser refresh, network retries, and accidental double-clicks without duplicate records.

**Implementation**:
- Frontend: Generate UUID v4 for each form submission, store in form state
- Backend: Create UNIQUE constraint on (idempotencyKey) column
- Backend: Check for existing idempotencyKey before INSERT
- If exists: Return existing expense record (200 OK)
- If new: Create record (201 Created)

**Impact**: Ensures data consistency, makes API safe for retries.

---

### BR3: Expense Validation
**Description**: All expense entries must pass validation before being stored.

**Validation Rules**:
- **Amount**: Must be > 0 and ≤ 999,999.99
- **Category**: Must be one of predefined enum values (Food, Transport, Entertainment, Utilities, Other)
- **Description**: Length 1-255 characters, no null values
- **Date**: Must be a valid date, cannot be in the future

**Implementation**:
- Frontend: Real-time validation in form component (show inline errors)
- Backend: Server-side validation (never trust client input)
- Backend: Return 400 Bad Request with specific error messages for each field

**Impact**: Maintains data quality, user-friendly error messages.

---

### BR4: Expense Filtering and Sorting
**Description**: System must support filtering by category and sorting by date. Filters and sorting are independent and composable.

**Rules**:
- Default sort: Newest first (date DESC)
- Default filter: All categories (no filter)
- User can apply category filter and sort simultaneously
- Filtering happens client-side post-fetch (when dataset is small)
- Total always reflects filtered/sorted view

**Implementation**:
- GET /expenses always returns all expenses or filtered (via query param)
- Frontend applies category filter and sort to client-side dataset
- Total calculation includes only visible (filtered/sorted) items

**Impact**: User control over expense view, accurate totals.

---

### BR5: Resilience Under Network Issues
**Description**: System must function correctly even with unreliable networks, dropped requests, page refreshes, and browser retries.

**Rules**:
- Implement exponential backoff retry: 1s, 2s, 4s (max 3 attempts)
- Use idempotencyKey to prevent duplicate processing
- Store form data locally (localStorage) during submission
- Show user clear feedback: loading, error, success states
- Retry logic is transparent to user on success

**Implementation**:
- Frontend: Axios interceptor or custom fetch wrapper with retry
- Frontend: Save form state to localStorage before submit
- Backend: Proper response codes (201, 200, 400, 500)
- Frontend: Toast notifications for user feedback

**Impact**: Works in real-world conditions, reduces user frustration.

---

### BR6: Category Management
**Description**: Expenses must be categorized from a predefined list.

**Valid Categories**:
- Food (groceries, meals, snacks)
- Transport (fuel, public transport, parking)
- Entertainment (movies, games, events)
- Utilities (electricity, water, internet)
- Other (miscellaneous)

**Implementation**:
- Backend: Enforce enum in database (ENUM or CHECK constraint)
- Frontend: Dropdown select in form
- Frontend: Display category tags/badges in list

**Impact**: Enables filtering and categorization logic.

---

### BR7: Data Persistence and Audit Trail
**Description**: All expenses are immutable after creation (no update/delete). Maintains complete audit trail.

**Rules**:
- Expenses are created once and never modified
- Only creation timestamp exists (no updated_at field)
- Deletion is permanently forbidden
- Every record has created_at for audit purposes

**Implementation**:
- No PUT/PATCH endpoints for expenses
- No DELETE endpoint for expenses
- Database constraints prevent modification

**Impact**: Audit trail, financial compliance, prevents accidental data loss.

---

### BR8: Summary Calculations
**Description**: System displays total of visible expenses, reflecting current filters and sorting.

**Rules**:
- Total = SUM of all filtered/sorted amounts
- Total always uses DECIMAL precision (2 places)
- Total updates immediately when filter/sort changes
- Total updates when new expense is added

**Implementation**:
- Frontend: Calculate after fetch + filter + sort
- Backend: Can optionally return total in response
- Display format: "Total: ₹X,XXX.XX"

**Impact**: User visibility into spending, immediate feedback.

---

### BR9: Date Sorting
**Description**: Expenses are sorted by date in two directions: newest first (default) or oldest first.

**Rules**:
- Default: Sort by date DESC (newest first)
- Toggle available: Sort by date ASC (oldest first)
- Sorting ignores time component (date only, not timestamp)
- Sorting is independent of filtering

**Implementation**:
- Frontend: JavaScript sort after fetch
- Sorting key: date field (YYYY-MM-DD format)

**Impact**: User control over expense chronology.

---

### BR10: Error Handling and User Communication
**Description**: System must communicate errors clearly without exposing technical details.

**Rules**:
- Validation errors: Show specific field messages ("Amount must be positive")
- Network errors: Show friendly message ("Connection failed. Retrying...")
- Server errors: Show generic message ("Something went wrong. Please try again.")
- All error messages include retry/action option

**Implementation**:
- Frontend: Toast notifications with error messages
- Frontend: Inline form validation messages
- Backend: Consistent error response format:
  ```json
  {
    "error": "Validation failed",
    "details": {
      "amount": "Must be greater than 0",
      "category": "Invalid category"
    }
  }
  ```

**Impact**: User understands what went wrong and what to do next.

---

## 4. Workflows

### WORKFLOW 1: Create New Expense Successfully

**Actors**: User, Frontend System, Backend API, Database

**Sequence**:
```
User
  ↓ (enters form data)
Frontend: Validate client-side
  ↓ (if valid)
Frontend: Generate UUID (idempotencyKey)
  ↓
Frontend: Show loading state, disable submit button
  ↓
Frontend: POST /expenses with idempotencyKey
  ↓ (network request)
Backend: Receives request
  ↓
Backend: Validate all fields (amount, category, description, date)
  ↓ (if invalid)
Backend: Return 400 Bad Request
  ↓
Frontend: Show error toast with details
  ↓
Frontend: Enable submit button, keep form data
  ↓ (user corrects and tries again)
[Retry from "Frontend: Generate UUID"]

Backend: Check for existing idempotencyKey
  ↓ (if found)
Backend: Return 200 OK with existing expense
  ↓
Frontend: Show success toast (user unaware of duplicate)

  ↓ (if not found, continue)
Backend: Store new expense in database
  ↓
Backend: Return 201 Created with expense object
  ↓
Frontend: Show success toast "✓ Expense added"
  ↓
Frontend: Clear form fields
  ↓
Frontend: Disable submit button temporarily
  ↓
Frontend: Fetch updated expense list (GET /expenses)
  ↓
Backend: Return all expenses
  ↓
Frontend: Display list with new expense visible
  ↓
Frontend: Enable submit button, ready for next entry
  ↓ (end)
User: Sees new expense in list
```

**Error Points & Recovery**:
- Network timeout at POST: Auto-retry up to 3 times with exponential backoff
- Database constraint violation (unlikely): Backend returns 500, user sees error
- Client-side validation fails: Form shows inline errors, no API call

---

### WORKFLOW 2: Duplicate Submission via Browser Refresh

**Actors**: User (with browser refresh), Frontend System, Backend API, Database

**Sequence**:
```
User: Submits expense form
  ↓
Frontend: Generate UUID (idempotencyKey = "abc123")
  ↓
Frontend: POST /expenses with idempotencyKey
  ↓
Backend: Stores expense in database (id=1)
  ↓
Backend: Returns 201 Created
  ↓
Frontend: Receives 201 OK response
  ↓
Frontend: Shows success toast
  ↓
Frontend: Starts to clear form
  ↓
User: Presses F5 or Ctrl+R (page refresh)
  ↓
Browser: Cancels in-flight requests / clears UI state
  ↓
Browser: Reloads page HTML/JS/CSS
  ↓
Frontend: App reinitializes
  ↓
Frontend: Sends GET /expenses
  ↓
Backend: Returns all expenses (including expense id=1 from earlier)
  ↓
Frontend: Displays expense list including the recent expense
  ↓
User: Sees the expense is there (page refresh didn't cause duplicate)
  ↓ (end)
```

**Key Point**: Even if refresh happened mid-transaction, idempotencyKey prevents duplicate.

---

### WORKFLOW 3: Network Failure with Automatic Retry

**Actors**: User, Frontend System, Network, Backend API

**Sequence** (pessimistic scenario):
```
User: Submits form
  ↓
Frontend: Generate UUID, POST request
  ↓ (network slow/unstable)
Request: Times out (30s timeout]
  ↓
Frontend: Catches error, shows "Connection failed"
  ↓
Frontend: Waits 1 second
  ↓
Frontend: Retries POST /expenses (1st retry)
  ↓ (network still down)
Request: Times out again
  ↓
Frontend: Waits 2 seconds
  ↓
Frontend: Retries POST /expenses (2nd retry)
  ↓ (network slow recovering)
Request: Times out again
  ↓
Frontend: Waits 4 seconds
  ↓
Frontend: Retries POST /expenses (3rd retry, final)
  ↓ (network now available)
Request: Succeeds
  ↓
Backend: Checks idempotencyKey (still "abc123" from original attempt)
  ↓ (database shows no record yet)
Backend: Creates new expense
  ↓
Backend: Returns 201 Created
  ↓
Frontend: Shows success toast "✓ Saved successfully"
  ↓
Frontend: Fetches and displays updated list
  ↓ (end)
```

**Important**: User sees ONE success notification at the end (retries are transparent).

---

### WORKFLOW 4: Filter and Sort Combined

**Actors**: User, Frontend System, Database

**Sequence**:
```
User: Opens app
  ↓
Frontend: GET /expenses (no params)
  ↓
Backend: Returns all 15 expenses
  ↓
Frontend: Displays all expenses, sort default = "Newest First"
  ↓
Frontend: Calculates total = ₹5,000.00
  ↓
User: Clicks category filter dropdown, selects "Food"
  ↓
Frontend: Filters in-memory list: [food1, food2, food3, food4] (4 items)
  ↓
Frontend: Applies current sort (Newest First) to filtered list
  ↓
Frontend: Recalculates total = ₹1,200.00 (only food items)
  ↓
Frontend: Displays: "Total (Food): ₹1,200.00"
  ↓
User: Clicks "Sort" button to toggle "Oldest First"
  ↓
Frontend: Reverses sort order on same filtered list
  ↓
Frontend: Food expenses now in reverse date order
  ↓
Frontend: Total remains ₹1,200.00 (unchanged)
  ↓
User: Clicks filter, selects "All Categories"
  ↓
Frontend: Removes filter (all 15 expenses shown)
  ↓
Frontend: Keeps sort = "Oldest First" (doesn't reset)
  ↓
Frontend: Displays all expenses, oldest first
  ↓
Frontend: Recalculates total = ₹5,000.00
  ↓ (end)
```

**Key Points**: 
- Filtering and sorting are independent
- Total always reflects visible items
- No additional API calls (all client-side)

---

### WORKFLOW 5: Validate Expense Before Submission

**Actors**: User, Frontend System

**Sequence** (form validation):
```
User: Loads form
  ↓
Frontend: Displays empty form with all fields
  ↓
User: Types amount = "-50"
  ↓
Frontend: Real-time validation triggers
  ↓
Frontend: Shows error: "Amount must be positive"
  ↓
Frontend: Submit button is DISABLED
  ↓
User: Corrects amount = "50.50"
  ↓
Frontend: Validation passes for amount
  ↓
Frontend: Checks other fields
  ↓
User: Hasn't selected category
  ↓
Frontend: Shows error: "Category is required"
  ↓
Frontend: Submit button remains DISABLED
  ↓
User: Selects category = "Food"
  ↓
Frontend: All validations pass
  ↓
Frontend: Enables submit button (color changes)
  ↓
User: Enters description = "Lunch"
  ↓
Frontend: Date auto-filled with today
  ↓
Frontend: All fields valid, submit button active
  ↓
User: Clicks submit
  ↓
[Proceed to WORKFLOW 1: Create New Expense Successfully]
  ↓ (end)
```

**Validation Rules Checked**:
- Amount: > 0, ≤ 999,999.99, 2 decimal places
- Category: One of [Food, Transport, Entertainment, Utilities, Other]
- Description: 1-255 chars, not empty
- Date: Valid date, not in future

---

### WORKFLOW 6: Display Expense Total

**Actors**: User, Frontend System

**Sequence**:
```
User: Opens app
  ↓
Frontend: Fetches expenses (5 items: ₹100, ₹250, ₹75, ₹500, ₹150)
  ↓
Frontend: Calculates sum: 100 + 250 + 75 + 500 + 150 = 1075
  ↓
Frontend: Formats with precision: "₹1,075.00"
  ↓
Frontend: Displays at bottom of list: "Total: ₹1,075.00"
  ↓
User: Adds new expense ₹125
  ↓
Frontend: Fetches updated list (6 items)
  ↓
Frontend: Recalculates: 1075 + 125 = 1200
  ↓
Frontend: Updates display: "Total: ₹1,200.00"
  ↓
User: Applies filter "Food" (filters to 2 items: ₹250, ₹500)
  ↓
Frontend: Filtered total = 750
  ↓
Frontend: Displays: "Total (Food): ₹750.00"
  ↓
User: Removes filter ("All Categories")
  ↓
Frontend: Recalculates full total = 1200
  ↓
Frontend: Displays: "Total: ₹1,200.00"
  ↓ (end)
```

**Golden Rules**:
- Total = SUM of visible items only (respects filters)
- Decimal precision always maintained (2 places)
- Total updates immediately on any change

---

### WORKFLOW 7: Handle Empty State

**Actors**: User, Frontend System

**Sequence**:
```
User: Opens app for first time
  ↓
Frontend: Fetches GET /expenses
  ↓
Backend: Database is empty, returns: []
  ↓
Frontend: Checks if expenses.length === 0
  ↓
Frontend: Shows empty state message: "No expenses yet. Add one below!"
  ↓
Frontend: Hides table/list (no items to display)
  ↓
Frontend: Shows total: "Total: ₹0.00"
  ↓
Frontend: Form is ready and enabled
  ↓
User: Fills form and submits
  ↓
[WORKFLOW 1: Create New Expense Successfully]
  ↓
Frontend: After first expense, list now shows 1 item (empty state gone)
  ↓ (end)
```

---

## 5. Acceptance Criteria (Mapped to Use Cases)

| Criterion | Use Case | Status |
|-----------|----------|--------|
| User can create expense with amount, category, description, date | UC1 | Implemented |
| User can view list of all expenses | UC2 | Implemented |
| User can filter expenses by category | UC3 | Implemented |
| User can sort expenses by date (newest first) | UC4 | Implemented |
| User can see total of visible expenses | UC5 | Implemented |
| System handles network failures with retries | UC6 | Implemented |
| Duplicate submissions don't create duplicate records | UC1, UC2B | Implemented |
| Page refresh after submit doesn't break anything | UC7 | Implemented |
| No rounding errors in money calculations | BR1 | Implemented |
| All validations work (amount, category, date) | BR3 | Implemented |

---

## 6. Technical Constraints & Assumptions

**Constraints**:
- Single-user application (no authentication/multi-user)
- SQLite database (local or managed cloud instance)
- Chrome, Firefox, Safari (modern browsers)
- No real-time sync (page refresh to see others' data)

**Assumptions**:
- User has stable internet (after network issues resolve)
- User trusts browser localStorage
- Amounts are in Indian Rupees (₹) but extensible to other currencies
- No concurrent edits (immutable records + no concurrent access control needed)

---

## 7. Out of Scope

- User authentication & multi-user support
- Expense editing or deletion
- Category customization
- Budget limits/alerts
- Recurring expenses
- CSV export/import
- Mobile app (responsive web only)
- Real-time notifications
- Expense attachments

---

**SRS Version Control**:
- **v1.0** (May 2026): Initial release with core features

