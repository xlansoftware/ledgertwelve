// mocks/handlers.ts
import { http, HttpResponse } from 'msw'

// ---------------------------------------------------------------------------
// In-memory store — resets between test runs, persists within a session
// ---------------------------------------------------------------------------

// Helpers to generate IDs
// let userIdCounter = 0
let categoryIdCounter = 0
let bookIdCounter = 0
let transactionIdCounter = 0
let exportJobIdCounter = 0

// const nextUserId = () => `usr_${++userIdCounter}`
const nextCategoryId = () => `cat_${++categoryIdCounter}`
const nextBookId = () => `book_${++bookIdCounter}`
const nextTransactionId = () => `tx_${++transactionIdCounter}`
const nextExportJobId = () => `exp_${++exportJobIdCounter}`

// User store (simplified: plain password for mock)
interface User {
  id: string
  email: string
  password: string // plaintext for testing
  createdAt: Date
}

const users: User[] = [
  {
    id: 'usr_1',
    email: 'john@example.com',
    password: 'secret-password',
    createdAt: new Date('2026-01-01'),
  },
  {
    id: 'usr_2',
    email: 'friend@example.com',
    password: 'friend-password',
    createdAt: new Date('2026-01-15'),
  },
]

// Current authenticated user (bypasses cookies in mock)
let currentUser: User | undefined
export { currentUser }

// Make the user store mutable for tests
function setCurrentUser(user: User | undefined) {
  currentUser = user
}

/**
 * Pre-seed a session for testing. Called from test-setup.
 */
export function seedSession(userId: string): string {
  currentUser = users.find(u => u.id === userId)
  return userId
}

/**
 * Clear the current authenticated user (for testing).
 */
export function clearAuth(): void {
  currentUser = undefined
}

// Categories
interface Category {
  id: string
  userId: string
  name: string
  recurring: boolean
  color: string
  icon: string
  createdAt: Date
  order?: number
}

const categories: Category[] = [
  { id: 'cat_1', userId: 'usr_1', name: 'Groceries',       recurring: false, color: '#fde68a', icon: 'shopping-cart', createdAt: new Date('2026-01-01'), order: 1 },
  { id: 'cat_2', userId: 'usr_1', name: 'Pets',            recurring: false, color: '#4d22b2', icon: 'heart',         createdAt: new Date('2026-01-01'), order: 2 },
  { id: 'cat_3', userId: 'usr_1', name: 'Maintenance',     recurring: true,  color: '#ad3e00', icon: 'home',          createdAt: new Date('2026-01-01'), order: 3 },
  { id: 'cat_4', userId: 'usr_1', name: 'Utilities',       recurring: true,  color: '#a5b4fc', icon: 'plug',          createdAt: new Date('2026-01-01'), order: 4 },
  { id: 'cat_5', userId: 'usr_1', name: 'Dining Out',      recurring: false, color: '#FFCAD4', icon: 'utensils',      createdAt: new Date('2026-01-01'), order: 5 },
  { id: 'cat_6', userId: 'usr_1', name: 'Transportation',  recurring: false, color: '#bbf7d0', icon: 'car',           createdAt: new Date('2026-01-01'), order: 6 },
  { id: 'cat_7', userId: 'usr_1', name: 'Sport',           recurring: false, color: '#F72585', icon: 'smile',         createdAt: new Date('2026-01-01'), order: 7 },
  { id: 'cat_8', userId: 'usr_1', name: 'Entertainment',   recurring: false, color: '#bae6fd', icon: 'film',          createdAt: new Date('2026-01-01'), order: 8 },
  { id: 'cat_9', userId: 'usr_1', name: 'Miscellaneous',   recurring: false, color: '#FDFFB6', icon: 'dots-horizontal', createdAt: new Date('2026-01-01'), order: 9 },
  { id: 'cat_10', userId: 'usr_1', name: 'Health / Medical', recurring: false, color: '#FF595E', icon: 'heart',       createdAt: new Date('2026-01-01'), order: 10 },
  { id: 'cat_11', userId: 'usr_1', name: 'Personal Care',  recurring: false, color: '#ddd6fe', icon: 'smile',         createdAt: new Date('2026-01-01'), order: 11 },
  { id: 'cat_12', userId: 'usr_1', name: 'Clothing',       recurring: false, color: '#e0f2fe', icon: 'shirt',         createdAt: new Date('2026-01-01'), order: 12 },
  { id: 'cat_13', userId: 'usr_1', name: 'Travel',         recurring: false, color: '#a7f3d0', icon: 'plane',         createdAt: new Date('2026-01-01'), order: 13 },
  { id: 'cat_14', userId: 'usr_1', name: 'Gifts',          recurring: false, color: '#d9f99d', icon: 'gift',          createdAt: new Date('2026-01-01'), order: 14 },
  { id: 'cat_15', userId: 'usr_1', name: 'Education',      recurring: false, color: '#fef9c3', icon: 'book',          createdAt: new Date('2026-01-01'), order: 15 },
  { id: 'cat_16', userId: 'usr_1', name: 'Parents',        recurring: false, color: '#3A86FF', icon: 'file',          createdAt: new Date('2026-01-01'), order: 16 },
  { id: 'cat_17', userId: 'usr_1', name: 'Insurance',      recurring: true,  color: '#fcd34d', icon: 'shield',        createdAt: new Date('2026-01-01'), order: 17 },
  { id: 'cat_18', userId: 'usr_1', name: 'Savings',        recurring: false, color: '#f0abfc', icon: 'piggy-bank',    createdAt: new Date('2026-01-01'), order: 18 },
  { id: 'cat_19', userId: 'usr_1', name: 'Taxes',          recurring: true,  color: '#e22400', icon: 'edit',          createdAt: new Date('2026-01-01'), order: 19 },
  { id: 'cat_20', userId: 'usr_1', name: 'Subscriptions',  recurring: true,  color: '#fde2e4', icon: 'credit-card',   createdAt: new Date('2026-01-01'), order: 20 },
  { id: 'cat_21', userId: 'usr_1', name: 'Rent / Mortgage', recurring: true,  color: '#fca5a5', icon: 'home',          createdAt: new Date('2026-01-01'), order: 21 },
  { id: 'cat_22', userId: 'usr_1', name: 'Kids',           recurring: false, color: '#FF6B6B', icon: 'piggy-bank',    createdAt: new Date('2026-01-01'), order: 22 },
]

// Books
interface SharedUser {
  userId: string
  permission: 'view' | 'edit'
}

interface Book {
  id: string
  name: string
  currency?: string
  status: 'open' | 'closed'
  ownerId: string
  sharedWith: SharedUser[]
  createdAt: Date
  closedAt?: Date
}

const books: Book[] = [
  {
    id: 'book_main',
    name: 'Main',
    currency: 'EUR',
    status: 'open',
    ownerId: 'usr_1',
    sharedWith: [],
    createdAt: new Date('2026-01-01'),
  },
  {
    id: 'book_vacation',
    name: 'Vacation 2026',
    currency: 'EUR',
    status: 'open',
    ownerId: 'usr_1',
    sharedWith: [],
    createdAt: new Date('2026-03-15'),
  },
]

// Transactions
interface Transaction {
  id: string
  bookId: string
  userId: string
  dateTime: Date
  amount: number
  originalCurrency?: string
  originalAmount?: number
  exchangeRate?: number
  categoryName?: string
  note?: string
  createdAt: Date
  isBookClosingEntry?: boolean
  closedBookId?: string
}

// Request body shape for creating/updating a transaction
interface TransactionRequestBody {
  bookId?: string
  dateTime?: string
  amount?: number
  originalCurrency?: string
  originalAmount?: number
  exchangeRate?: number
  categoryName?: string
  note?: string
}

// ---------------------------------------------------------------------------
// Mock transaction generation
// ---------------------------------------------------------------------------

const RECURRING_ENTRIES: { name: string; amount: number }[] = [
  { name: 'Rent / Mortgage', amount: -1200 },
  { name: 'Utilities',       amount: -140 },
  { name: 'Subscriptions',   amount: -25 },
  { name: 'Insurance',       amount: -150 },
]

const WEIGHTED_CATS = [
  { name: 'Groceries',       min: -200, max: -15, w: 0.14 },
  { name: 'Dining Out',      min: -75,  max: -8,  w: 0.10 },
  { name: 'Transportation',  min: -60,  max: -5,  w: 0.09 },
  { name: 'Entertainment',   min: -50,  max: -5,  w: 0.07 },
  { name: 'Miscellaneous',   min: -100, max: -3,  w: 0.06 },
  { name: 'Health / Medical',min: -200, max: -10, w: 0.04 },
  { name: 'Personal Care',   min: -80,  max: -5,  w: 0.04 },
  { name: 'Clothing',        min: -150, max: -15, w: 0.03 },
  { name: 'Gifts',           min: -100, max: -10, w: 0.03 },
  { name: 'Education',       min: -400, max: -15, w: 0.03 },
  { name: 'Sport',           min: -80,  max: -5,  w: 0.03 },
  { name: 'Pets',            min: -120, max: -10, w: 0.03 },
  { name: 'Maintenance',     min: -500, max: -30, w: 0.02 },
  { name: 'Parents',         min: -300, max: -20, w: 0.02 },
  { name: 'Kids',            min: -200, max: -10, w: 0.02 },
  { name: 'Travel',          min: -2000,max: -50, w: 0.02 },
  // { name: 'Savings',         min: 100,  max: 800, w: 0.02 },
  // { name: 'Freelance',       min: 200,  max: 2500,w: 0.01 },
  // { name: 'Salary',          min: 2800, max: 5000,w: 0.02 },
  { name: 'Taxes',           min: -3000,max: -400, w: 0.01 },
]

const TOTAL_WEIGHT = WEIGHTED_CATS.reduce((s, c) => s + c.w, 0)
const CUMULATIVE = (() => {
  const arr: { name: string; min: number; max: number; threshold: number }[] = []
  let acc = 0
  for (const c of WEIGHTED_CATS) {
    acc += c.w / TOTAL_WEIGHT
    arr.push({ name: c.name, min: c.min, max: c.max, threshold: acc })
  }
  return arr
})()

function pickRandomCategory(): { name: string; min: number; max: number } {
  const r = Math.random()
  return CUMULATIVE.find(c => r <= c.threshold)!
}

const SAMPLE_NOTES = [
  '', '', '', '', '', '', '',
  'Weekly shopping', 'Monthly bill', 'Quick lunch', 'Coffee run',
  'Gas station', 'Online order', 'Pharmacy', 'Doctor visit',
  'Gym membership', 'Haircut', 'Book purchase', 'Streaming service',
  'Public transport pass', 'Parking', 'Birthday gift', 'Donation',
]

function randomNote(): string | undefined {
  const n = SAMPLE_NOTES[Math.floor(Math.random() * SAMPLE_NOTES.length)]
  return n || undefined
}

/**
 * Generate mock transactions distributed between `start` (newest) and `end` (oldest).
 *
 * @param start  Most recent date boundary (default: now)
 * @param end    Oldest date boundary   (default: one year before now)
 * @param count  Number of transactions to generate (default: 3000)
 */
function generateMockTransactions(
  start: Date = new Date(),
  end: Date = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
  count: number = 3000,
  bookId: string = 'book_main',
): Transaction[] {
  const result: Transaction[] = []
  const timeRange = start.getTime() - end.getTime()
  if (timeRange <= 0) return result

  // Generate recurring monthly transactions first
  const startMonth = new Date(end.getFullYear(), end.getMonth(), 1)
  const endMonth = new Date(start.getFullYear(), start.getMonth(), 1)
  const months: Date[] = []
  for (let d = new Date(startMonth); d <= endMonth; d.setMonth(d.getMonth() + 1)) {
    months.push(new Date(d))
  }

  for (const month of months) {
    for (const entry of RECURRING_ENTRIES) {
      const dayOfMonth = 1 + Math.floor(Math.random() * 28)
      const date = new Date(month)
      date.setDate(dayOfMonth)
      date.setHours(8 + Math.floor(Math.random() * 12), Math.floor(Math.random() * 60))

      if (date >= end && date <= start) {
        result.push({
          id: nextTransactionId(),
          bookId,
          userId: 'usr_1',
          dateTime: date,
          amount: entry.amount,
          categoryName: entry.name,
          createdAt: date,
        })
      }
    }
  }

  // Fill remaining with random transactions
  const remaining = count - result.length
  for (let i = 0; i < remaining; i++) {
    const offset = Math.random() * timeRange
    const date = new Date(end.getTime() + offset)
    const cat = pickRandomCategory()
    const amount = Math.round((cat.min + Math.random() * (cat.max - cat.min)) * 100) / 100
    const hasMultiCurrency = Math.random() < 0.08

    result.push({
      id: nextTransactionId(),
      bookId,
      userId: 'usr_1',
      dateTime: date,
      amount,
      ...(hasMultiCurrency
        ? {
            originalCurrency: 'USD',
            originalAmount: Math.round((amount / 0.91) * 100) / 100,
            exchangeRate: 0.91,
          }
        : {}),
      categoryName: cat.name,
      note: randomNote(),
      createdAt: date,
    })
  }

  // Sort by dateTime descending
  result.sort((a, b) => b.dateTime.getTime() - a.dateTime.getTime())
  return result
}

// Generate 1000 mock transactions in book_main spanning the last year
const transactions: Transaction[] = generateMockTransactions(
  new Date(),
  new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
  1000,
  'book_main',
)

// Current book selection — persists per user within a session
// (mirrors the future backend behaviour where the selection is stored server-side)
const currentBookSelection = new Map<string, string>()

// Export jobs
interface ExportJob {
  id: string
  format: ExportFormat
  contentType: ExportContentType
  bookId?: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  downloadUrl?: string
  errorMessage?: string
  createdAt: Date
}

const exportJobs: ExportJob[] = []

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function paginate<T>(items: T[], page: number, pageSize: number) {
  const totalCount = items.length
  const paged = items.slice((page - 1) * pageSize, page * pageSize)
  return { items: paged, totalCount, page, pageSize }
}

// Extract current user (checks stored login state instead of cookies)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getUserFromRequest(_request: Request): User | undefined {
  return currentUser
}

function requireAuth(request: Request) {
  const user = getUserFromRequest(request)
  if (!user) {
    return { error: true, response: new HttpResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }) }
  }
  return { error: false, user }
}

// Convert book to DTO
function toBookDto(book: Book) {
  return {
    id: book.id,
    name: book.name,
    currency: book.currency,
    status: book.status,
    ownerId: book.ownerId,
    sharedWith: book.sharedWith.map(s => ({
      userId: s.userId,
      email: users.find(u => u.id === s.userId)?.email || '',
      permission: s.permission,
    })),
    createdAt: book.createdAt.toISOString(),
    closedAt: book.closedAt?.toISOString() ?? null,
  }
}

// Convert transaction to DTO
function toTransactionDto(tx: Transaction) {
  return {
    id: tx.id,
    bookId: tx.bookId,
    userId: tx.userId,
    dateTime: tx.dateTime.toISOString(),
    amount: tx.amount,
    originalCurrency: tx.originalCurrency,
    originalAmount: tx.originalAmount,
    exchangeRate: tx.exchangeRate,
    categoryName: tx.categoryName,
    note: tx.note,
    createdAt: tx.createdAt.toISOString(),
    isBookClosingEntry: tx.isBookClosingEntry,
    closedBookId: tx.closedBookId,
  }
}

// Generate simple CSV for transactions
function generateCsv(transactions: Transaction[]): string {
  const header = 'id,book,user,dateTime,amount,originalCurrency,originalAmount,exchangeRate,categoryName,note,createdAt'
  const rows = transactions.map(tx => {
    const book = books.find(b => b.id === tx.bookId)
    const user = users.find(u => u.id === tx.userId)
    return [
      tx.id,
      book?.name ?? tx.bookId,
      user?.email ?? tx.userId,
      tx.dateTime.toISOString(),
      tx.amount,
      tx.originalCurrency ?? '',
      tx.originalAmount ?? '',
      tx.exchangeRate ?? '',
      tx.categoryName ?? '',
      tx.note ?? '',
      tx.createdAt.toISOString(),
    ].join(',')
  })
  return [header, ...rows].join('\n')
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

// ---- Export helper functions ----

type ExportContentType =
  | 'categories'
  | 'transactions'
  | 'books'
  | 'report-daily-total'
  | 'report-daily-per-category'
  | 'report-monthly-total'
  | 'report-monthly-per-category'
  | 'report-yearly-total'
  | 'report-yearly-per-category'
  | 'backup'

type ExportFormat = 'csv' | 'xlsx' | 'json'

/** Generate CSV for categories */
function generateCategoriesCsv(cats: Category[]): string {
  const header = 'id,name,recurring,color,icon'
  const rows = cats.map(c =>
    [c.id, c.name, c.recurring, c.color, c.icon].join(','),
  )
  return [header, ...rows].join('\n')
}

/** Generate CSV for books */
function generateBooksCsv(bs: Book[]): string {
  const header = 'id,name,currency,status,owner'
  const rows = bs.map(b => {
    const owner = users.find(u => u.id === b.ownerId)
    return [b.id, b.name, b.currency ?? '', b.status, owner?.email ?? b.ownerId].join(',')
  })
  return [header, ...rows].join('\n')
}

/** Generate CSV for daily report */
function generateDailyReportCsv(txs: Transaction[]): string {
  const groups = new Map<string, number>()
  for (const tx of txs) {
    const key = tx.dateTime.toISOString().slice(0, 10)
    const current = groups.get(key) || 0
    groups.set(key, current + tx.amount)
  }
  const header = 'date,amount'
  const rows = Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, amount]) => `${date},${Math.round(amount * 100) / 100}`)
  return [header, ...rows].join('\n')
}

/** Generate CSV for monthly report */
function generateMonthlyReportCsv(txs: Transaction[]): string {
  const groups = new Map<string, number>()
  for (const tx of txs) {
    const d = tx.dateTime
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
    const current = groups.get(key) || 0
    groups.set(key, current + tx.amount)
  }
  const header = 'period,amount'
  const rows = Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, amount]) => `${period},${Math.round(amount * 100) / 100}`)
  return [header, ...rows].join('\n')
}

/** Generate CSV for yearly report */
function generateYearlyReportCsv(txs: Transaction[]): string {
  const groups = new Map<string, number>()
  for (const tx of txs) {
    const key = tx.dateTime.getUTCFullYear().toString()
    const current = groups.get(key) || 0
    groups.set(key, current + tx.amount)
  }
  const header = 'year,amount'
  const rows = Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([year, amount]) => `${year},${Math.round(amount * 100) / 100}`)
  return [header, ...rows].join('\n')
}

/** Generate per-category report CSV */
function generatePerCategoryReportCsv(txs: Transaction[]): string {
  const groups = new Map<string, number>()
  for (const tx of txs) {
    const cat = tx.categoryName || 'Uncategorized'
    const current = groups.get(cat) || 0
    groups.set(cat, current + tx.amount)
  }
  const header = 'category,amount'
  const rows = Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([cat, amount]) => `${cat},${Math.round(amount * 100) / 100}`)
  return [header, ...rows].join('\n')
}

/** Get the content type label for filenames */
function getExportFilename(contentType: ExportContentType, format: ExportFormat, bookId?: string): string {
  const date = new Date().toISOString().slice(0, 10)
  // Use book name in filenames for human-readable formats (CSV, XLSX)
  let displayBook: string | undefined
  if (bookId) {
    const book = books.find(b => b.id === bookId)
    displayBook = book?.name
  }
  const bookPart = displayBook ?? bookId ?? 'unknown'
  switch (contentType) {
    case 'categories': return `categories-${date}.${format}`
    case 'transactions': return `transactions-${bookPart}-${date}.${format}`
    case 'books': return `books-${date}.${format}`
    case 'report-daily-total': return `report-daily-total-${date}.${format}`
    case 'report-daily-per-category': return `report-daily-per-category-${date}.${format}`
    case 'report-monthly-total': return `report-monthly-total-${date}.${format}`
    case 'report-monthly-per-category': return `report-monthly-per-category-${date}.${format}`
    case 'report-yearly-total': return `report-yearly-total-${date}.${format}`
    case 'report-yearly-per-category': return `report-yearly-per-category-${date}.${format}`
    case 'backup': return `ledger12-backup-${date}.${format}`
  }
}

/** Build the main book's transactions */
function getMainBookTransactions(): Transaction[] {
  const mainBook = books.find(b => b.ownerId === currentUser?.id && b.name === 'Main')
  if (!mainBook) return []
  return transactions.filter(tx => tx.bookId === mainBook.id)
}

const VALID_CONTENT_TYPES: ExportContentType[] = [
  'categories', 'transactions', 'books',
  'report-daily-total', 'report-daily-per-category',
  'report-monthly-total', 'report-monthly-per-category',
  'report-yearly-total', 'report-yearly-per-category',
  'backup',
]

const VALID_FORMATS: ExportFormat[] = ['csv', 'xlsx', 'json']

export const handlers = [
  // ---- Auth ----
  http.post('/api/v1/auth/login', async ({ request }) => {
    const body = (await request.json()) as { email?: string; password?: string }
    if (!body.email || !body.password) {
      return HttpResponse.json({ error: 'Email and password required' }, { status: 400 })
    }
    const user = users.find(u => u.email === body.email && u.password === body.password)
    if (!user) {
      return HttpResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }
    // Store authenticated user (bypasses cookies in mock)
    currentUser = user
    return HttpResponse.json({
      data: { id: user.id, email: user.email },
    })
  }),

  http.get('/api/v1/auth/whoami', ({ request }) => {
    const user = getUserFromRequest(request)
    if (!user) {
      return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return HttpResponse.json({ data: { id: user.id, email: user.email } })
  }),

  http.post('/api/v1/auth/logout', () => {
    setCurrentUser(undefined)
    return HttpResponse.json({ data: { success: true } })
  }),

  // ---- Categories ----
  http.get('/api/v1/categories', ({ request }) => {
    const auth = requireAuth(request)
    if (auth.error) return auth.response
    const user = auth.user!
    const userCategories = categories
      .filter(c => c.userId === user.id)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    return HttpResponse.json({
      data: userCategories.map(c => ({
        id: c.id,
        name: c.name,
        recurring: c.recurring,
        color: c.color,
        icon: c.icon,
        createdAt: c.createdAt.toISOString(),
        order: c.order,
      })),
    })
  }),

  http.post('/api/v1/categories', async ({ request }) => {
    const auth = requireAuth(request)
    if (auth.error) return auth.response
    const user = auth.user!
    const body = (await request.json()) as {
      name?: string
      recurring?: boolean
      color?: string
      icon?: string
      order?: number
    }
    if (!body.name) {
      return HttpResponse.json({ error: 'Name required' }, { status: 400 })
    }
    const newCat: Category = {
      id: nextCategoryId(),
      userId: user.id,
      name: body.name,
      recurring: body.recurring ?? false,
      color: body.color ?? '#000000',
      icon: body.icon ?? 'question',
      createdAt: new Date(),
      order: body.order
    }
    categories.push(newCat)
    return HttpResponse.json(
      {
        data: {
          id: newCat.id,
          name: newCat.name,
          recurring: newCat.recurring,
          color: newCat.color,
          icon: newCat.icon,
          createdAt: newCat.createdAt.toISOString(),
          order: newCat.order,
        },
      },
      { status: 201 },
    )
  }),

  http.put('/api/v1/categories/reorder', async ({ request }) => {
    const auth = requireAuth(request)
    if (auth.error) return auth.response
    const user = auth.user!
    const body = (await request.json()) as { orderedIds?: string[] }
    if (!body.orderedIds || !Array.isArray(body.orderedIds)) {
      return HttpResponse.json({ error: 'orderedIds required' }, { status: 400 })
    }

    const userCategories = categories.filter(c => c.userId === user.id)
    if (body.orderedIds.length !== userCategories.length) {
      return HttpResponse.json({ error: 'orderedIds must contain all user categories' }, { status: 400 })
    }

    // Validate all IDs belong to the user
    const userCatIds = new Set(userCategories.map(c => c.id))
    for (const id of body.orderedIds) {
      if (!userCatIds.has(id)) {
        return HttpResponse.json({ error: 'orderedIds contains invalid category id' }, { status: 400 })
      }
    }

    // Update the order
    const idToOrder = new Map(body.orderedIds.map((id, idx) => [id, idx + 1]))
    userCategories.forEach(c => {
      c.order = idToOrder.get(c.id) ?? c.order
    })

    return HttpResponse.json({ data: { success: true } })
  }),

  http.put('/api/v1/categories/:categoryId', async ({ request, params }) => {
    const auth = requireAuth(request)
    if (auth.error) return auth.response
    const user = auth.user!
    const { categoryId } = params
    const cat = categories.find(c => c.id === categoryId && c.userId === user.id)
    if (!cat) {
      return HttpResponse.json({ error: 'Category not found' }, { status: 404 })
    }
    const body = (await request.json()) as {
      name?: string
      recurring?: boolean
      color?: string
      icon?: string
      order?: number
    }
    if (body.name !== undefined) cat.name = body.name
    if (body.recurring !== undefined) cat.recurring = body.recurring
    if (body.color !== undefined) cat.color = body.color
    if (body.icon !== undefined) cat.icon = body.icon
    return HttpResponse.json({
      data: {
        id: cat.id,
        name: cat.name,
        recurring: cat.recurring,
        color: cat.color,
        icon: cat.icon,
        createdAt: cat.createdAt.toISOString(),
        order: cat.order,
      },
    })
  }),

  http.delete('/api/v1/categories/:categoryId', ({ request, params }) => {
    const auth = requireAuth(request)
    if (auth.error) return auth.response
    const user = auth.user!
    const { categoryId } = params
    const catIndex = categories.findIndex(c => c.id === categoryId && c.userId === user.id)
    if (catIndex === -1) {
      return HttpResponse.json({ error: 'Category not found' }, { status: 404 })
    }
    const cat = categories[catIndex]

    const url = new URL(request.url)
    const replacementName = url.searchParams.get('replacementCategoryName')
    let reassignedCount = 0

    if (replacementName) {
      transactions.forEach(tx => {
        if (tx.userId === user.id && tx.categoryName === cat.name) {
          tx.categoryName = replacementName
          reassignedCount++
        }
      })
    }

    categories.splice(catIndex, 1)
    return HttpResponse.json({
      data: { reassignedTransactions: reassignedCount },
    })
  }),

  http.post('/api/v1/categories/reassign', async ({ request }) => {
    const auth = requireAuth(request)
    if (auth.error) return auth.response
    const user = auth.user!
    const body = (await request.json()) as { fromCategoryName?: string; toCategoryName?: string }
    if (!body.fromCategoryName || !body.toCategoryName) {
      return HttpResponse.json({ error: 'fromCategoryName and toCategoryName required' }, { status: 400 })
    }
    let affected = 0
    transactions.forEach(tx => {
      if (tx.userId === user.id && tx.categoryName === body.fromCategoryName) {
        tx.categoryName = body.toCategoryName
        affected++
      }
    })
    return HttpResponse.json({ data: { affectedTransactions: affected } })
  }),

  // ---- Books ----
  http.get('/api/v1/books', ({ request }) => {
    const auth = requireAuth(request)
    if (auth.error) return auth.response
    const user = auth.user!
    const visible = books.filter(
      b => b.ownerId === user.id || b.sharedWith.some(s => s.userId === user.id),
    )
    return HttpResponse.json({
      data: visible.map(b => ({
        id: b.id,
        name: b.name,
        currency: b.currency,
        status: b.status,
        ownerId: b.ownerId,
        sharedWith: b.sharedWith.map(s => ({
          userId: s.userId,
          email: users.find(u => u.id === s.userId)?.email || '',
          permission: s.permission,
        })),
        createdAt: b.createdAt.toISOString(),
        closedAt: b.closedAt?.toISOString() ?? null,
      })),
    })
  }),

  // ---- Current Book ----
  http.get('/api/v1/books/current', ({ request }) => {
    const auth = requireAuth(request)
    if (auth.error) return auth.response
    const user = auth.user!

    const selectedId = currentBookSelection.get(user.id)
    if (selectedId) {
      const book = books.find(
        b => b.id === selectedId && (b.ownerId === user.id || b.sharedWith.some(s => s.userId === user.id)),
      )
      if (book) {
        return HttpResponse.json({ data: toBookDto(book) })
      }
    }

    // No explicit selection — return the first visible book ordered by creation date
    const visible = books
      .filter(b => b.ownerId === user.id || b.sharedWith.some(s => s.userId === user.id))
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())

    if (visible.length === 0) {
      return HttpResponse.json({ error: 'No books found' }, { status: 404 })
    }

    return HttpResponse.json({ data: toBookDto(visible[0]) })
  }),

  http.put('/api/v1/books/current', async ({ request }) => {
    const auth = requireAuth(request)
    if (auth.error) return auth.response
    const user = auth.user!

    const body = (await request.json()) as { bookId?: string }
    if (!body.bookId) {
      return HttpResponse.json({ error: 'bookId is required' }, { status: 400 })
    }

    const book = books.find(
      b => b.id === body.bookId && (b.ownerId === user.id || b.sharedWith.some(s => s.userId === user.id)),
    )
    if (!book) {
      return HttpResponse.json({ error: 'Book not found or not visible' }, { status: 404 })
    }

    currentBookSelection.set(user.id, book.id)
    return HttpResponse.json({ data: toBookDto(book) })
  }),

  http.get('/api/v1/books/:bookId', ({ request, params }) => {
    const auth = requireAuth(request)
    if (auth.error) return auth.response
    const user = auth.user!
    const { bookId } = params
    const book = books.find(
      b => b.id === bookId && (b.ownerId === user.id || b.sharedWith.some(s => s.userId === user.id)),
    )
    if (!book) {
      return HttpResponse.json({ error: 'Book not found' }, { status: 404 })
    }
    return HttpResponse.json({ data: toBookDto(book) })
  }),

  http.post('/api/v1/books', async ({ request }) => {
    const auth = requireAuth(request)
    if (auth.error) return auth.response
    const user = auth.user!
    const body = (await request.json()) as { name?: string; currency?: string }
    if (!body.name) {
      return HttpResponse.json({ error: 'Name required' }, { status: 400 })
    }

    // Per the API contract: when a new book is created, all globally
    // shared users (those with edit permission on every owned book)
    // automatically receive edit access to the new book.
    const ownedBooks = books.filter(b => b.ownerId === user.id)
    const globalShareUserIds = new Set<string>()
    if (ownedBooks.length > 0) {
      for (const book of ownedBooks) {
        for (const share of book.sharedWith) {
          if (share.permission === 'edit') {
            globalShareUserIds.add(share.userId)
          }
        }
      }
      // Only keep users that appear on ALL owned books with edit permission
      for (const userId of globalShareUserIds) {
        const appearsOnAll = ownedBooks.every(b =>
          b.sharedWith.some(s => s.userId === userId && s.permission === 'edit'),
        )
        if (!appearsOnAll) {
          globalShareUserIds.delete(userId)
        }
      }
    }

    const newBook: Book = {
      id: nextBookId(),
      name: body.name,
      currency: body.currency,
      status: 'open',
      ownerId: user.id,
      sharedWith: Array.from(globalShareUserIds).map(userId => ({
        userId,
        permission: 'edit' as const,
      })),
      createdAt: new Date(),
    }
    books.push(newBook)
    return HttpResponse.json(
      { data: toBookDto(newBook) },
      { status: 201 },
    )
  }),

  http.put('/api/v1/books/:bookId', async ({ request, params }) => {
    const auth = requireAuth(request)
    if (auth.error) return auth.response
    const user = auth.user!
    const { bookId } = params
    const book = books.find(
      b => b.id === bookId && (b.ownerId === user.id || b.sharedWith.some(s => s.userId === user.id && s.permission === 'edit')),
    )
    if (!book) {
      return HttpResponse.json({ error: 'Book not found' }, { status: 404 })
    }
    const body = (await request.json()) as { name?: string; currency?: string }
    if (body.name !== undefined) book.name = body.name
    if (body.currency !== undefined) book.currency = body.currency
    return HttpResponse.json({ data: toBookDto(book) })
  }),

  http.delete('/api/v1/books/:bookId', ({ request, params }) => {
    const auth = requireAuth(request)
    if (auth.error) return auth.response
    const user = auth.user!
    const { bookId } = params
    const bookIndex = books.findIndex(b => b.id === bookId && b.ownerId === user.id)
    if (bookIndex === -1) {
      return HttpResponse.json({ error: 'Book not found' }, { status: 404 })
    }
    const book = books[bookIndex]
    // Cannot delete Main book
    if (book.name === 'Main') {
      return HttpResponse.json({ error: 'Cannot delete Main book' }, { status: 400 })
    }
    // Cannot delete non-empty book
    const hasTx = transactions.some(tx => tx.bookId === book.id)
    if (hasTx) {
      return HttpResponse.json({ error: 'Cannot delete book with existing transactions' }, { status: 409 })
    }
    books.splice(bookIndex, 1)
    return HttpResponse.json({ data: { deleted: true } })
  }),

  // ---- Book Sharing ----
  http.post('/api/v1/books/:bookId/shares', async ({ request, params }) => {
    const auth = requireAuth(request)
    if (auth.error) return auth.response
    const user = auth.user!
    const { bookId } = params
    const book = books.find(b => b.id === bookId && b.ownerId === user.id)
    if (!book) {
      return HttpResponse.json({ error: 'Book not found or not authorized' }, { status: 404 })
    }
    const body = (await request.json()) as { email?: string; permission?: 'view' | 'edit' }
    if (!body.email || !body.permission || !['view', 'edit'].includes(body.permission)) {
      return HttpResponse.json({ error: 'Valid email and permission (view/edit) required' }, { status: 400 })
    }
    const targetUser = users.find(u => u.email === body.email)
    if (!targetUser) {
      return HttpResponse.json({ error: 'User not found' }, { status: 404 })
    }
    if (targetUser.id === user.id) {
      return HttpResponse.json({ error: 'Cannot share with yourself' }, { status: 400 })
    }
    if (book.sharedWith.some(s => s.userId === targetUser.id)) {
      return HttpResponse.json({ error: 'Already shared with this user' }, { status: 409 })
    }
    book.sharedWith.push({ userId: targetUser.id, permission: body.permission })
    return HttpResponse.json(
      { data: { userId: targetUser.id, permission: body.permission } },
      { status: 201 },
    )
  }),

  http.put('/api/v1/books/:bookId/shares/:userId', async ({ request, params }) => {
    const auth = requireAuth(request)
    if (auth.error) return auth.response
    const user = auth.user!
    const { bookId, userId } = params
    const book = books.find(b => b.id === bookId && b.ownerId === user.id)
    if (!book) {
      return HttpResponse.json({ error: 'Book not found' }, { status: 404 })
    }
    const share = book.sharedWith.find(s => s.userId === userId)
    if (!share) {
      return HttpResponse.json({ error: 'Share not found' }, { status: 404 })
    }
    const body = (await request.json()) as { permission?: 'view' | 'edit' }
    if (!body.permission || !['view', 'edit'].includes(body.permission)) {
      return HttpResponse.json({ error: 'Valid permission required' }, { status: 400 })
    }
    share.permission = body.permission
    return HttpResponse.json({ data: { userId: share.userId, permission: share.permission } })
  }),

  http.delete('/api/v1/books/:bookId/shares/:userId', ({ request, params }) => {
    const auth = requireAuth(request)
    if (auth.error) return auth.response
    const user = auth.user!
    const { bookId, userId } = params
    const book = books.find(b => b.id === bookId && b.ownerId === user.id)
    if (!book) {
      return HttpResponse.json({ error: 'Book not found' }, { status: 404 })
    }
    const shareIndex = book.sharedWith.findIndex(s => s.userId === userId)
    if (shareIndex === -1) {
      return HttpResponse.json({ error: 'Share not found' }, { status: 404 })
    }
    book.sharedWith.splice(shareIndex, 1)
    return HttpResponse.json({ data: { removed: true } })
  }),

  // ---- Global Shares ----
  http.post('/api/v1/shares', async ({ request }) => {
    const auth = requireAuth(request)
    if (auth.error) return auth.response
    const user = auth.user!
    const body = (await request.json()) as { email?: string }
    if (!body.email) {
      return HttpResponse.json({ error: 'Email required' }, { status: 400 })
    }
    const targetUser = users.find(u => u.email === body.email)
    if (!targetUser) {
      return HttpResponse.json({ error: 'User not found' }, { status: 404 })
    }
    if (targetUser.id === user.id) {
      return HttpResponse.json({ error: 'Cannot share with yourself' }, { status: 400 })
    }
    // Check if already shared on any owned book
    const ownedBooks = books.filter(b => b.ownerId === user.id)
    const alreadyShared = ownedBooks.some(b => b.sharedWith.some(s => s.userId === targetUser.id))
    if (alreadyShared) {
      return HttpResponse.json({ error: 'Already shared with this user' }, { status: 409 })
    }
    // Propagate to all owned books
    let affectedBooks = 0
    for (const book of ownedBooks) {
      book.sharedWith.push({ userId: targetUser.id, permission: 'edit' })
      affectedBooks++
    }
    return HttpResponse.json(
      {
        data: {
          userId: targetUser.id,
          email: targetUser.email,
          affectedBooks,
        },
      },
      { status: 201 },
    )
  }),

  http.delete('/api/v1/shares/:userId', ({ request, params }) => {
    const auth = requireAuth(request)
    if (auth.error) return auth.response
    const user = auth.user!
    const { userId } = params
    // Find and remove from all owned books
    const ownedBooks = books.filter(b => b.ownerId === user.id)
    let found = false
    let affectedBooks = 0
    for (const book of ownedBooks) {
      const idx = book.sharedWith.findIndex(s => s.userId === userId)
      if (idx !== -1) {
        book.sharedWith.splice(idx, 1)
        found = true
        affectedBooks++
      }
    }
    if (!found) {
      return HttpResponse.json({ error: 'Share not found' }, { status: 404 })
    }
    return HttpResponse.json({ data: { removed: true, affectedBooks } })
  }),

  // ---- Book Stats ----
  http.get('/api/v1/books/:bookId/stats', ({ request, params }) => {
    const auth = requireAuth(request)
    if (auth.error) return auth.response
    const user = auth.user!
    const { bookId } = params
    const book = books.find(
      b => b.id === bookId && (b.ownerId === user.id || b.sharedWith.some(s => s.userId === user.id)),
    )
    if (!book) {
      return HttpResponse.json({ error: 'Book not found' }, { status: 404 })
    }

    // Build base set of non-closing transactions
    let relevantTx = transactions.filter(tx => tx.bookId === book.id && !tx.isBookClosingEntry)

    // If asOf parameter is provided, filter to transactions on or before that date
    const url = new URL(request.url)
    const asOf = url.searchParams.get('asOf')
    if (asOf) {
      // asOf is inclusive: treat as "end of day" by using next day midnight as exclusive bound
      const asOfDate = new Date(asOf + 'T00:00:00.000Z')
      asOfDate.setDate(asOfDate.getDate() + 1)
      relevantTx = relevantTx.filter(tx => tx.dateTime < asOfDate)
    }

    const transactionCount = relevantTx.length
    const totalSum = relevantTx.reduce((sum, tx) => sum + tx.amount, 0)
    return HttpResponse.json({
      data: { transactionCount, totalSum },
    })
  }),

  // ---- Book Close / Reopen
  http.post('/api/v1/books/:bookId/close', async ({ request, params }) => {
    const auth = requireAuth(request)
    if (auth.error) return auth.response
    const user = auth.user!
    const { bookId } = params
    const book = books.find(b => b.id === bookId && b.ownerId === user.id)
    if (!book) {
      return HttpResponse.json({ error: 'Book not found' }, { status: 404 })
    }
    if (book.status === 'closed') {
      return HttpResponse.json({ error: 'Book already closed' }, { status: 400 })
    }
    if (book.name === 'Main') {
      return HttpResponse.json({ error: 'Cannot close Main book' }, { status: 400 })
    }
    const body = (await request.json()) as { closingCategoryName?: string }
    if (!body.closingCategoryName) {
      return HttpResponse.json({ error: 'closingCategoryName required' }, { status: 400 })
    }

    // Calculate net balance
    const netBalance = transactions
      .filter(tx => tx.bookId === book.id)
      .reduce((sum, tx) => sum + tx.amount, 0)

    // Find Main book
    const mainBook = books.find(b => b.ownerId === user.id && b.name === 'Main')
    if (!mainBook) {
      return HttpResponse.json({ error: 'Main book not found' }, { status: 500 })
    }

    // Create closing transaction in Main book
    const closingTx: Transaction = {
      id: nextTransactionId(),
      bookId: mainBook.id,
      userId: user.id,
      dateTime: new Date(),
      amount: netBalance,
      categoryName: body.closingCategoryName,
      note: `Close ${book.name}`,
      createdAt: new Date(),
      isBookClosingEntry: true,
      closedBookId: book.id,
    }
    transactions.push(closingTx)

    // Mark book as closed
    book.status = 'closed'
    book.closedAt = new Date()

    return HttpResponse.json({
      data: {
        bookId: book.id,
        status: 'closed',
        closingTransactionId: closingTx.id,
        netBalance,
      },
    })
  }),

  http.post('/api/v1/books/:bookId/reopen', ({ request, params }) => {
    const auth = requireAuth(request)
    if (auth.error) return auth.response
    const user = auth.user!
    const { bookId } = params
    const book = books.find(b => b.id === bookId && b.ownerId === user.id)
    if (!book) {
      return HttpResponse.json({ error: 'Book not found' }, { status: 404 })
    }
    if (book.status !== 'closed') {
      return HttpResponse.json({ error: 'Book is not closed' }, { status: 400 })
    }
    book.status = 'open'
    book.closedAt = undefined
    // Closing transaction remains untouched
    return HttpResponse.json({ data: { bookId: book.id, status: 'open' } })
  }),

  // ---- Transactions ----
  http.get('/api/v1/transactions', ({ request }) => {
    const auth = requireAuth(request)
    if (auth.error) return auth.response
    const user = auth.user!
    const url = new URL(request.url)
    const bookId = url.searchParams.get('bookId')
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')
    const note = url.searchParams.get('note')
    const minValue = url.searchParams.get('minValue')
    const maxValue = url.searchParams.get('maxValue')
    const categories = url.searchParams.getAll('category')
    const createdBys = url.searchParams.getAll('createdBy')
    const page = parseInt(url.searchParams.get('page') || '1', 10)
    const pageSize = parseInt(url.searchParams.get('pageSize') || '50', 10)

    // Only transactions in books visible to user
    const visibleBookIds = books
      .filter(b => b.ownerId === user.id || b.sharedWith.some(s => s.userId === user.id))
      .map(b => b.id)

    let filtered = transactions.filter(tx => visibleBookIds.includes(tx.bookId))

    if (bookId) filtered = filtered.filter(tx => tx.bookId === bookId)
    if (from) {
      const fromDate = new Date(from)
      filtered = filtered.filter(tx => tx.dateTime >= fromDate)
    }
    if (to) {
      const toDate = new Date(to)
      filtered = filtered.filter(tx => tx.dateTime < toDate)
    }
    if (categories.length > 0) {
      filtered = filtered.filter(tx => tx.categoryName && categories.includes(tx.categoryName))
    }
    if (createdBys.length > 0) {
      filtered = filtered.filter(tx => createdBys.includes(tx.userId))
    }
    if (note) {
      const lowerNote = note.toLowerCase()
      filtered = filtered.filter(tx => tx.note && tx.note.toLowerCase().includes(lowerNote))
    }
    if (minValue !== null && minValue !== undefined) {
      const min = parseFloat(minValue)
      if (!isNaN(min)) {
        filtered = filtered.filter(tx => tx.amount >= min)
      }
    }
    if (maxValue !== null && maxValue !== undefined) {
      const max = parseFloat(maxValue)
      if (!isNaN(max)) {
        filtered = filtered.filter(tx => tx.amount <= max)
      }
    }

    // Sort by dateTime descending so newest transactions appear first
    const sorted = [...filtered].sort(
      (a, b) => b.dateTime.getTime() - a.dateTime.getTime(),
    )

    const { items, totalCount } = paginate(sorted, page, pageSize)
    return HttpResponse.json({
      data: items.map(toTransactionDto),
      meta: { page, pageSize, total: totalCount },
    })
  }),

  http.get('/api/v1/transactions/:transactionId', ({ request, params }) => {
    const auth = requireAuth(request)
    if (auth.error) return auth.response
    const user = auth.user!
    const { transactionId } = params
    const tx = transactions.find(t => t.id === transactionId)
    if (!tx) {
      return HttpResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }
    // Check visibility
    const book = books.find(b => b.id === tx.bookId)
    if (!book || !(book.ownerId === user.id || book.sharedWith.some(s => s.userId === user.id))) {
      return HttpResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }
    return HttpResponse.json({ data: toTransactionDto(tx) })
  }),

  http.post('/api/v1/transactions', async ({ request }) => {
    const auth = requireAuth(request)
    if (auth.error) return auth.response
    const user = auth.user!
    const body = (await request.json()) as TransactionRequestBody
    // Validate book existence and permissions
    const book = books.find(
      b => b.id === body.bookId && (b.ownerId === user.id || b.sharedWith.some(s => s.userId === user.id && s.permission === 'edit')),
    )
    if (!book) {
      return HttpResponse.json({ error: 'Book not found or not writable' }, { status: 404 })
    }
    if (book.status === 'closed') {
      return HttpResponse.json({ error: 'Cannot add transactions to a closed book' }, { status: 400 })
    }
    // Multi-currency validation
    if (body.originalCurrency) {
      if (body.originalAmount === undefined || body.exchangeRate === undefined) {
        return HttpResponse.json(
          { error: 'originalAmount and exchangeRate required when originalCurrency is set' },
          { status: 400 },
        )
      }
    }
    const tx: Transaction = {
      id: nextTransactionId(),
      bookId: body.bookId!,
      userId: user.id,
      dateTime: new Date(body.dateTime || Date.now()),
      amount: body.amount ?? 0,
      originalCurrency: body.originalCurrency,
      originalAmount: body.originalAmount,
      exchangeRate: body.exchangeRate,
      categoryName: body.categoryName,
      note: body.note,
      createdAt: new Date(),
    }
    transactions.push(tx)
    return HttpResponse.json({ data: toTransactionDto(tx) }, { status: 201 })
  }),

  http.put('/api/v1/transactions/:transactionId', async ({ request, params }) => {
    const auth = requireAuth(request)
    if (auth.error) return auth.response
    const user = auth.user!
    const { transactionId } = params
    const tx = transactions.find(t => t.id === transactionId)
    if (!tx) {
      return HttpResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }
    // Check write access to the original book
    const book = books.find(
      b => b.id === tx.bookId && (b.ownerId === user.id || b.sharedWith.some(s => s.userId === user.id && s.permission === 'edit')),
    )
    if (!book) {
      return HttpResponse.json({ error: 'Transaction not found or not writable' }, { status: 404 })
    }
    const body = (await request.json()) as TransactionRequestBody
    // If bookId changed, validate new book
    if (body.bookId && body.bookId !== tx.bookId) {
      const newBook = books.find(
        b => b.id === body.bookId && (b.ownerId === user.id || b.sharedWith.some(s => s.userId === user.id && s.permission === 'edit')),
      )
      if (!newBook) {
        return HttpResponse.json({ error: 'New book not found or not writable' }, { status: 404 })
      }
      if (newBook.status === 'closed') {
        return HttpResponse.json({ error: 'Cannot add transactions to a closed book' }, { status: 400 })
      }
      tx.bookId = newBook.id
    }
    if (body.dateTime) tx.dateTime = new Date(body.dateTime)
    if (body.amount !== undefined) tx.amount = body.amount
    if (body.originalCurrency !== undefined) tx.originalCurrency = body.originalCurrency
    if (body.originalAmount !== undefined) tx.originalAmount = body.originalAmount
    if (body.exchangeRate !== undefined) tx.exchangeRate = body.exchangeRate
    if (body.categoryName !== undefined) tx.categoryName = body.categoryName
    if (body.note !== undefined) tx.note = body.note

    // Re-validate multi-currency consistency
    if (tx.originalCurrency) {
      if (tx.originalAmount === undefined || tx.exchangeRate === undefined) {
        return HttpResponse.json(
          { error: 'originalAmount and exchangeRate required when originalCurrency is set' },
          { status: 400 },
        )
      }
    }

    return HttpResponse.json({ data: toTransactionDto(tx) })
  }),

  http.delete('/api/v1/transactions/:transactionId', ({ request, params }) => {
    const auth = requireAuth(request)
    if (auth.error) return auth.response
    const user = auth.user!
    const { transactionId } = params
    const txIndex = transactions.findIndex(t => t.id === transactionId)
    if (txIndex === -1) {
      return HttpResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }
    const tx = transactions[txIndex]
    // Check write access (owner or editor share)
    const book = books.find(
      b => b.id === tx.bookId && (b.ownerId === user.id || b.sharedWith.some(s => s.userId === user.id && s.permission === 'edit')),
    )
    if (!book) {
      return HttpResponse.json({ error: 'Transaction not found or not deletable' }, { status: 404 })
    }
    transactions.splice(txIndex, 1)
    return HttpResponse.json({ data: { deleted: true } })
  }),

  // ---- Reporting ----
  http.get('/api/v1/reports/totals', ({ request }) => {
    const auth = requireAuth(request)
    if (auth.error) return auth.response
    const user = auth.user!
    const url = new URL(request.url)
    const period = url.searchParams.get('period') || 'month'
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')

    // Only Main book transactions
    const mainBook = books.find(b => b.ownerId === user.id && b.name === 'Main')
    if (!mainBook) return HttpResponse.json({ error: 'Main book not found' }, { status: 500 })

    let txs = transactions.filter(tx => tx.bookId === mainBook.id)
    if (from) {
      const fromDate = new Date(from)
      txs = txs.filter(tx => tx.dateTime >= fromDate)
    }
    if (to) {
      const toDate = new Date(to)
      txs = txs.filter(tx => tx.dateTime < toDate)
    }

    // Group by period
    const groups = new Map<string, { income: number; expense: number }>()
    txs.forEach(tx => {
      let key: string
      const d = tx.dateTime
      if (period === 'day') key = d.toISOString().slice(0, 10) // YYYY-MM-DD
      else if (period === 'week') {
        // ISO week: get Monday of the week
        const day = d.getUTCDay()
        const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1) // adjust when day is sunday
        const monday = new Date(d.getTime())
        monday.setUTCDate(diff)
        key = monday.toISOString().slice(0, 10)
      } else if (period === 'year') key = d.getUTCFullYear().toString()
      else key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}` // month

      const group = groups.get(key) || { income: 0, expense: 0 }
      if (tx.amount >= 0) group.income += tx.amount
      else group.expense += tx.amount
      groups.set(key, group)
    })

    const data = Array.from(groups.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([p, v]) => ({
        period: p,
        income: v.income,
        expense: v.expense,
        net: v.income + v.expense,
      }))

    return HttpResponse.json({ data })
  }),

  http.get('/api/v1/reports/daily', ({ request }) => {
    const auth = requireAuth(request)
    if (auth.error) return auth.response
    const user = auth.user!
    const url = new URL(request.url)
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')

    if (!from || !to) {
      return HttpResponse.json({ error: 'from and to query parameters are required' }, { status: 400 })
    }

    const mainBook = books.find(b => b.ownerId === user.id && b.name === 'Main')
    if (!mainBook) return HttpResponse.json({ error: 'Main book not found' }, { status: 500 })

    const fromDate = new Date(from + "T00:00:00.000Z")
    const toDate = new Date(to + "T00:00:00.000Z")

    let txs = transactions.filter(tx => tx.bookId === mainBook.id && !tx.isBookClosingEntry)
    txs = txs.filter(tx => tx.dateTime >= fromDate && tx.dateTime < toDate)

    // Group by date (YYYY-MM-DD) and sum amounts
    const groups = new Map<string, number>()
    txs.forEach(tx => {
      const key = tx.dateTime.toISOString().slice(0, 10) // YYYY-MM-DD
      const current = groups.get(key) || 0
      groups.set(key, current + tx.amount)
    })

    const data = Array.from(groups.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, amount]) => ({ date, amount: Math.round(amount * 100) / 100 }))

    return HttpResponse.json({ data })
  }),

  http.get('/api/v1/reports/monthly', ({ request }) => {
    const auth = requireAuth(request)
    if (auth.error) return auth.response
    const user = auth.user!
    const url = new URL(request.url)
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')

    if (!from || !to) {
      return HttpResponse.json({ error: 'from and to query parameters are required' }, { status: 400 })
    }

    const mainBook = books.find(b => b.ownerId === user.id && b.name === 'Main')
    if (!mainBook) return HttpResponse.json({ error: 'Main book not found' }, { status: 500 })

    const fromDate = new Date(from + "T00:00:00.000Z")
    const toDate = new Date(to + "T00:00:00.000Z")

    let txs = transactions.filter(tx => tx.bookId === mainBook.id && !tx.isBookClosingEntry)
    txs = txs.filter(tx => tx.dateTime >= fromDate && tx.dateTime < toDate)

    // Group by YYYY-MM and sum amounts
    const groups = new Map<string, number>()
    txs.forEach(tx => {
      const d = tx.dateTime
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
      const current = groups.get(key) || 0
      groups.set(key, current + tx.amount)
    })

    const data = Array.from(groups.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, amount]) => ({ period, amount: Math.round(amount * 100) / 100 }))

    return HttpResponse.json({ data })
  }),

  http.get('/api/v1/reports/categories', ({ request }) => {
    const auth = requireAuth(request)
    if (auth.error) return auth.response
    const user = auth.user!
    const url = new URL(request.url)
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')

    const mainBook = books.find(b => b.ownerId === user.id && b.name === 'Main')
    if (!mainBook) return HttpResponse.json({ error: 'Main book not found' }, { status: 500 })

    let txs = transactions.filter(tx => tx.bookId === mainBook.id)
    if (from) txs = txs.filter(tx => tx.dateTime >= new Date(from))
    if (to) txs = txs.filter(tx => tx.dateTime < new Date(to))

    const groups = new Map<string, number>()
    txs.forEach(tx => {
      const cat = tx.categoryName || 'Uncategorized'
      const current = groups.get(cat) || 0
      groups.set(cat, current + tx.amount)
    })

    const data = Array.from(groups.entries()).map(([categoryName, amount]) => ({
      categoryName,
      amount,
    }))

    return HttpResponse.json({ data })
  }),

  // ---- Average Reports ----
  http.get('/api/v1/reports/average/daily', ({ request }) => {
    const auth = requireAuth(request)
    if (auth.error) return auth.response
    const user = auth.user!
    const url = new URL(request.url)
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')

    if (!from || !to) {
      return HttpResponse.json({ error: 'from and to query parameters are required' }, { status: 400 })
    }

    const mainBook = books.find(b => b.ownerId === user.id && b.name === 'Main')
    if (!mainBook) return HttpResponse.json({ error: 'Main book not found' }, { status: 500 })

    const fromDate = new Date(from + 'T00:00:00.000Z')
    const toDate = new Date(to + 'T00:00:00.000Z')

    let txs = transactions.filter(tx => tx.bookId === mainBook.id && !tx.isBookClosingEntry)
    txs = txs.filter(tx => tx.dateTime >= fromDate && tx.dateTime < toDate)

    // Group by date and sum
    const groups = new Map<string, number>()
    txs.forEach(tx => {
      const key = tx.dateTime.toISOString().slice(0, 10)
      const current = groups.get(key) || 0
      groups.set(key, current + tx.amount)
    })

    const daysWithTx = groups.size
    const totalSum = Array.from(groups.values()).reduce((s, v) => s + v, 0)
    const average = daysWithTx > 0 ? Math.round((totalSum / daysWithTx) * 100) / 100 : 0

    return HttpResponse.json({
      data: { average, count: daysWithTx },
    })
  }),

  http.get('/api/v1/reports/average/monthly', ({ request }) => {
    const auth = requireAuth(request)
    if (auth.error) return auth.response
    const user = auth.user!
    const url = new URL(request.url)
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')

    if (!from || !to) {
      return HttpResponse.json({ error: 'from and to query parameters are required' }, { status: 400 })
    }

    const mainBook = books.find(b => b.ownerId === user.id && b.name === 'Main')
    if (!mainBook) return HttpResponse.json({ error: 'Main book not found' }, { status: 500 })

    const fromDate = new Date(from + 'T00:00:00.000Z')
    const toDate = new Date(to + 'T00:00:00.000Z')

    let txs = transactions.filter(tx => tx.bookId === mainBook.id && !tx.isBookClosingEntry)
    txs = txs.filter(tx => tx.dateTime >= fromDate && tx.dateTime < toDate)

    // Group by YYYY-MM and sum
    const groups = new Map<string, number>()
    txs.forEach(tx => {
      const d = tx.dateTime
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
      const current = groups.get(key) || 0
      groups.set(key, current + tx.amount)
    })

    const monthsWithTx = groups.size
    const totalSum = Array.from(groups.values()).reduce((s, v) => s + v, 0)
    const average = monthsWithTx > 0 ? Math.round((totalSum / monthsWithTx) * 100) / 100 : 0

    return HttpResponse.json({
      data: { average, count: monthsWithTx },
    })
  }),

  // ---- Users ----
  http.get('/api/v1/users', ({ request }) => {
    const auth = requireAuth(request)
    if (auth.error) return auth.response
    const user = auth.user!

    // Return the current user plus all users that share books with them
    const collaboratorIds = new Set<string>()
    collaboratorIds.add(user.id)
    books.forEach((b) => {
      if (b.ownerId === user.id) {
        b.sharedWith.forEach((s) => collaboratorIds.add(s.userId))
      }
      if (b.sharedWith.some((s) => s.userId === user.id)) {
        collaboratorIds.add(b.ownerId)
      }
    })

    const result = users
      .filter((u) => collaboratorIds.has(u.id))
      .map((u) => ({ id: u.id, email: u.email }))

    return HttpResponse.json({ data: result })
  }),

  // ---- Rates ----
  http.get('/api/v1/rates/exchange', ({ request }) => {
    const url = new URL(request.url)
    const fromRaw = url.searchParams.get('from')
    const toRaw = url.searchParams.get('to')

    if (!fromRaw || !toRaw) {
      return HttpResponse.json(
        { error: 'from and to query parameters are required' },
        { status: 400 },
      )
    }

    const from = fromRaw.toUpperCase()
    const to = toRaw.toUpperCase()

    // Validate currency codes (3-letter alphabetic)
    const currencyRegex = /^[A-Z]{3}$/
    if (!currencyRegex.test(from)) {
      return HttpResponse.json(
        { error: `Invalid currency code: ${fromRaw}` },
        { status: 400 },
      )
    }
    if (!currencyRegex.test(to)) {
      return HttpResponse.json(
        { error: `Invalid currency code: ${toRaw}` },
        { status: 400 },
      )
    }

    // Static rate lookup table
    const rates: Record<string, Record<string, number>> = {
      USD: { EUR: 0.91 },
      EUR: { USD: 1.10 },
    }

    // Same currency → rate 1
    if (from === to) {
      return HttpResponse.json({
        data: { from, to, rate: 1 },
      })
    }

    // Look up from→to, fallback to 1
    const rate = rates[from]?.[to] ?? 1

    return HttpResponse.json({
      data: { from, to, rate },
    })
  }),

  // ---- Exports ----
  http.post('/api/v1/exports', async ({ request }) => {
    const auth = requireAuth(request)
    if (auth.error) return auth.response
    const user = auth.user!
    const body = (await request.json()) as {
      format?: string
      contentType?: string
      bookId?: string
    }

    const contentType = body.contentType as ExportContentType
    if (!contentType || !VALID_CONTENT_TYPES.includes(contentType)) {
      return HttpResponse.json({ error: 'Invalid or missing contentType' }, { status: 400 })
    }

    // Format validation (skip for backup)
    const format = contentType === 'backup' ? 'json' : (body.format as ExportFormat)
    if (contentType !== 'backup' && (!format || !VALID_FORMATS.includes(format))) {
      return HttpResponse.json({ error: 'Format must be csv, xlsx, or json' }, { status: 400 })
    }

    // Book validation (only for transactions)
    if (contentType === 'transactions') {
      if (!body.bookId) {
        return HttpResponse.json({ error: 'bookId is required for transaction exports' }, { status: 400 })
      }
      const book = books.find(
        b => b.id === body.bookId && (b.ownerId === user.id || b.sharedWith.some(s => s.userId === user.id)),
      )
      if (!book) {
        return HttpResponse.json({ error: 'Book not found' }, { status: 404 })
      }
    }

    const job: ExportJob = {
      id: nextExportJobId(),
      format,
      contentType,
      bookId: body.bookId,
      status: 'pending',
      createdAt: new Date(),
    }
    exportJobs.push(job)

    // Simulate async processing: job completes after a short delay
    setTimeout(() => {
      job.status = 'completed'
      job.downloadUrl = `/api/v1/exports/${job.id}/download`
    }, 50)

    return HttpResponse.json({
      data: { jobId: job.id, status: 'pending' },
    }, { status: 201 })
  }),

  http.get('/api/v1/exports/:jobId', ({ request, params }) => {
    const auth = requireAuth(request)
    if (auth.error) return auth.response
    const { jobId } = params
    const job = exportJobs.find(j => j.id === jobId)
    if (!job) {
      return HttpResponse.json({ error: 'Export job not found' }, { status: 404 })
    }
    const data: Record<string, unknown> = {
      jobId: job.id,
      status: job.status,
    }
    if (job.status === 'completed') {
      data.downloadUrl = job.downloadUrl
    }
    if (job.status === 'failed') {
      data.errorMessage = job.errorMessage
    }
    return HttpResponse.json({ data })
  }),

  http.get('/api/v1/exports/:jobId/download', ({ request, params }) => {
    const auth = requireAuth(request)
    if (auth.error) return auth.response
    const { jobId } = params
    const job = exportJobs.find(j => j.id === jobId)
    if (!job || job.status !== 'completed') {
      return HttpResponse.json({ error: 'Export not ready' }, { status: 404 })
    }

    const { contentType, format, bookId } = job
    const filename = getExportFilename(contentType, format, bookId)
    const userCategories = categories.filter(c => c.userId === currentUser?.id)

    // Content type-specific generation
    if (format === 'json') {
      // JSON generation
      let jsonData: unknown

      if (contentType === 'backup') {
        const allBooks = books.filter(b => b.ownerId === currentUser?.id || b.sharedWith.some(s => s.userId === currentUser?.id))
        jsonData = {
          exportedAt: new Date().toISOString(),
          version: 1,
          books: allBooks.map(b => ({
            id: b.id,
            name: b.name,
            currency: b.currency,
            status: b.status,
            ownerId: b.ownerId,
            sharedWith: b.sharedWith,
            createdAt: b.createdAt.toISOString(),
          })),
          categories: userCategories.map(c => ({
            id: c.id,
            name: c.name,
            recurring: c.recurring,
            color: c.color,
            icon: c.icon,
            createdAt: c.createdAt.toISOString(),
          })),
          transactions: transactions
            .filter(tx => tx.userId === currentUser?.id)
            .map(toTransactionDto),
        }
      } else if (contentType === 'categories') {
        jsonData = userCategories.map(c => ({
          id: c.id,
          name: c.name,
          recurring: c.recurring,
          color: c.color,
          icon: c.icon,
          createdAt: c.createdAt.toISOString(),
        }))
      } else if (contentType === 'transactions' && bookId) {
        jsonData = transactions
          .filter(tx => tx.bookId === bookId)
          .map(toTransactionDto)
      } else if (contentType === 'books') {
        const visibleBooks = books.filter(b => b.ownerId === currentUser?.id || b.sharedWith.some(s => s.userId === currentUser?.id))
        jsonData = visibleBooks.map(toBookDto)
      } else {
        jsonData = { error: 'JSON not supported for this content type' }
      }

      const jsonStr = JSON.stringify(jsonData, null, 2)
      return new HttpResponse(jsonStr, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      })
    }

    // CSV / XLSX generation
    if (contentType === 'categories') {
      const csv = generateCategoriesCsv(userCategories)
      return new HttpResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      })
    }

    if (contentType === 'books') {
      const visibleBooks = books.filter(b => b.ownerId === currentUser?.id || b.sharedWith.some(s => s.userId === currentUser?.id))
      const csv = generateBooksCsv(visibleBooks)
      return new HttpResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      })
    }

    if (contentType === 'transactions' && bookId) {
      const txs = transactions.filter(tx => tx.bookId === bookId)
      if (format === 'csv') {
        const csv = generateCsv(txs)
        return new HttpResponse(csv, {
          status: 200,
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="${filename}"`,
          },
        })
      } else {
        // XLSX dummy
        const dummyXlsx = new Uint8Array([0x50, 0x4b, 0x03, 0x04])
        return new HttpResponse(dummyXlsx, {
          status: 200,
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${filename}"`,
          },
        })
      }
    }

    // Report content types — use Main book only
    const mainBookTxs = getMainBookTransactions()

    if (
      contentType === 'report-daily-total' ||
      contentType === 'report-daily-per-category'
    ) {
      if (contentType === 'report-daily-per-category') {
        const csv = generatePerCategoryReportCsv(mainBookTxs)
        return new HttpResponse(csv, {
          status: 200,
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="${filename}"`,
          },
        })
      }
      const csv = generateDailyReportCsv(mainBookTxs)
      return new HttpResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      })
    }

    if (
      contentType === 'report-monthly-total' ||
      contentType === 'report-monthly-per-category'
    ) {
      if (contentType === 'report-monthly-per-category') {
        const csv = generatePerCategoryReportCsv(mainBookTxs)
        return new HttpResponse(csv, {
          status: 200,
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="${filename}"`,
          },
        })
      }
      const csv = generateMonthlyReportCsv(mainBookTxs)
      return new HttpResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      })
    }

    if (
      contentType === 'report-yearly-total' ||
      contentType === 'report-yearly-per-category'
    ) {
      if (contentType === 'report-yearly-per-category') {
        const csv = generatePerCategoryReportCsv(mainBookTxs)
        return new HttpResponse(csv, {
          status: 200,
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="${filename}"`,
          },
        })
      }
      const csv = generateYearlyReportCsv(mainBookTxs)
      return new HttpResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      })
    }

    return HttpResponse.json({ error: 'Export not ready' }, { status: 404 })
  }),

  // ---- Import ----
  http.post('/api/v1/imports', async ({ request }) => {
    const auth = requireAuth(request)
    if (auth.error) return auth.response

    const body = (await request.json()) as {
      preview?: boolean
      entityType?: string
      rows?: Record<string, unknown>[]
      data?: Record<string, unknown>
    }

    const entityType = body.entityType

    if (!entityType) {
      return HttpResponse.json({ error: 'entityType is required' }, { status: 400 })
    }

    if (!['transactions', 'categories', 'books', 'backup'].includes(entityType)) {
      return HttpResponse.json(
        { error: `Unknown entityType: "${entityType}". Must be transactions, categories, books, or backup.` },
        { status: 400 },
      )
    }

    // Preview mode validation
    if (entityType !== 'backup') {
      if (!body.rows) {
        return HttpResponse.json(
          { error: `rows array is required for ${entityType} entityType` },
          { status: 400 },
        )
      }
    } else {
      if (!body.data) {
        return HttpResponse.json(
          { error: 'data field is required for backup entityType' },
          { status: 400 },
        )
      }

      // Version check for backup
      const version = body.data.version as number | undefined
      if (version === undefined) {
        return HttpResponse.json(
          { error: 'Backup data is missing version field' },
          { status: 400 },
        )
      }
      if (version !== 1) {
        return HttpResponse.json(
          { error: `Unsupported backup version: ${version}. This app supports version 1.` },
          { status: 400 },
        )
      }

      // Schema validation
      const bks = body.data.books
      const cats = body.data.categories
      const txs = body.data.transactions
      if (!Array.isArray(bks) || !Array.isArray(cats) || !Array.isArray(txs)) {
        return HttpResponse.json(
          { error: "Backup data is malformed: missing 'books', 'categories', or 'transactions' array" },
          { status: 400 },
        )
      }
    }

    const rows = body.rows || []
    const issues: {
      row: number | null
      field: string | null
      message: string
      severity: 'error' | 'warning'
    }[] = []
    let errors = 0
    const warnings = 0

    // Light simulation: check for 'error' values
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      if (row.amount === 'error' || row.amount === undefined) {
        issues.push({
          row: i + 1,
          field: 'amount',
          message: 'Amount is required and must be a number',
          severity: 'error',
        })
        errors++
      }
    }

    // Simulated counts based on request size
    const validCount = rows.length - errors
    const created = Math.floor(validCount * 0.9)
    const updated = validCount - created

    if (entityType !== 'backup') {
      return HttpResponse.json({
        data: {
          created,
          updated,
          deleted: 0,
          errors,
          warnings,
          issues,
        },
      })
    }

    // Backup response
    const bks = body.data!.books as Record<string, unknown>[]
    const cats = body.data!.categories as Record<string, unknown>[]

    return HttpResponse.json({
      data: {
        books: {
          created: bks.filter((b: Record<string, unknown>) => b.name !== 'Main').length,
          updated: bks.filter((b: Record<string, unknown>) => b.name === 'Main').length,
          deleted: 0,
          errors: 0,
          warnings: 0,
          issues: [],
        },
        categories: {
          created: cats.length,
          updated: 0,
          deleted: 0,
          errors: 0,
          warnings: 0,
          issues: [],
        },
        transactions: {
          created,
          updated,
          deleted: 0,
          errors,
          warnings,
          issues,
        },
      },
    })
  }),
]
