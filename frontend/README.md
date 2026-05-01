# Expense Tracker Frontend

React + TypeScript + Vite web UI for the Personal Expense Tracker.

## 🎯 Features Implemented

### Components
- **ExpenseForm**: Add new expense with real-time validation (BR3)
- **ExpenseList**: Display expenses with category badges and timestamps
- **FilterSort**: Category filter (BR4) and date sort (BR9) controls
- **App**: Main layout and state coordination

### Business Rules Implemented
- **BR1**: Decimal precision (displayed with ₹ symbol, 2 decimal places)
- **BR2**: Idempotency (UUID generated for each submission)
- **BR3**: Full form validation with inline error messages
- **BR4**: Category filtering (client-side post-fetch)
- **BR5**: Network resilience with exponential backoff retry (1s, 2s, 4s)
- **BR6**: Category enum (dropdown with all valid categories)
- **BR8**: Total calculation displayed in summary
- **BR9**: Date sorting (newest first / oldest first toggle)
- **BR10**: Error handling with user-friendly messages

### Use Cases Implemented
- **UC1**: Record new expense ✓
- **UC2**: View expense list ✓
- **UC3**: Filter by category ✓
- **UC4**: Sort by date ✓
- **UC5**: View total ✓
- **UC6**: Network failure handling ✓
- **UC7**: Page refresh handling ✓

## 🚀 Setup & Running

### Install Dependencies
```bash
npm install
```

### Development Server
```bash
npm run dev
```
Opens at `http://localhost:5173`

### Build for Production
```bash
npm run build
```

Outputs to `dist/` directory.

### Preview Production Build
```bash
npm run preview
```

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── ExpenseForm.tsx      # Form for adding expense
│   │   ├── ExpenseList.tsx      # List display with table
│   │   └── FilterSort.tsx       # Filter & sort controls
│   ├── hooks/
│   │   └── useExpense.ts        # Custom hooks (useExpenses, useExpenseForm)
│   ├── api/
│   │   ├── expenseClient.ts     # API client with retry logic (BR5)
│   │   └── constants.ts         # Frontend constants
│   ├── types/
│   │   └── expense.ts           # TypeScript type definitions
│   ├── styles/
│   │   ├── index.css            # Global styles
│   │   ├── app.css              # App layout
│   │   └── components.css       # Component styles
│   ├── App.tsx                  # Main app component
│   └── main.tsx                 # Entry point
├── index.html                   # HTML template
├── vite.config.ts              # Vite configuration
├── tsconfig.json               # TypeScript config
├── package.json
├── .env.example
└── README.md
```

## 🔧 Key Implementation Details

### BR5: Network Resilience
```typescript
// Automatic retry with exponential backoff
retryWithBackoff(() => api.post('/expenses', data))
// Attempts: 3, Delays: 1s, 2s, 4s
```

### BR2: Idempotency
```typescript
// Generate UUID for each submission
const idempotencyKey = generateUUID();
// First submission: 201 Created
// Duplicate: 200 OK (no new record)
```

### BR3: Validation
```typescript
// Real-time validation on blur
// Field-specific error messages
// Submit button disabled until valid
```

### BR8: Total Calculation
```typescript
// Display total of filtered/sorted expenses
// Always 2 decimal places
// Updates immediately on filter/sort change
```

## 📦 Dependencies

- **react** (18.2.0): UI library
- **react-dom** (18.2.0): React DOM rendering
- **axios** (1.6.0): HTTP client with interceptors
- **decimal.js** (10.4.3): Precise decimal arithmetic
- **vite** (4.4.9): Build tool and dev server
- **typescript** (5.2.0): Type safety

## 🎨 Styling

- **Pure CSS** (no dependencies)
- **CSS Variables** for theming
- **Responsive Design** (mobile-first)
- **Color Scheme**: Blue primary, with category-specific badges

### Color Palette
- Food:🟨 Amber
- Transport: 🟦 Blue
- Entertainment: 🟪 Purple
- Utilities: 🟩 Green
- Other: ⬜ Gray

## 🧪 Testing

Run tests:
```bash
npm run test
```

## 📝 Environment Variables

Create `.env.local`:
```env
VITE_API_URL=http://localhost:3000
```

## 🚀 Deployment

### Build & Deploy to Vercel
```bash
npm run build
# Deploy dist/ folder
```

### Deploy to Netlify
```bash
npm run build
# Deploy dist/ folder via Netlify CLI or web UI
```

### Deploy to GitHub Pages
```bash
npm run build
# Push dist/ to gh-pages branch
```

## ⚡ Performance Notes

- **Client-side filtering**: All expenses downloaded, filtered client-side (OK for <10k items)
- **Optimistic updates**: Form clears on success (data refetches)
- **Lazy loading**: Expenses fetched on mount and filter/sort change
- **No polling**: Manual refresh or user-triggered

## 🐛 Known Limitations

1. **No offline support**: Requires internet connection
2. **No caching**: Every page refresh fetches fresh data
3. **No edit/delete**: Expenses are immutable (by design - BR7)
4. **Single-user**: No authentication or multi-user support
5. **Small dataset assumption**: < 10,000 expenses (no pagination)

## 🔐 Security Notes

- **No sensitive data in localStorage**: Only form draft in session
- **HTTPS required in production**: For secure API communication
- **CORS configured**: Backend must allow frontend origin
- **No token storage**: Single-user (no authentication)

## 📚 References

- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vite Documentation](https://vitejs.dev)
- [Axios Documentation](https://axios-http.com)

---

**Version**: 1.0.0
**Author**: mubasshi-r
**Last Updated**: May 2026
