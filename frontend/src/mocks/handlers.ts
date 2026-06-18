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

/**
 * Pre-seed a session for testing. Called from test-setup.
 */
export function seedSession(userId: string): string {
  currentUser = users.find(u => u.id === userId)
  return userId
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
  { name: 'Savings',         min: 100,  max: 800, w: 0.02 },
  { name: 'Freelance',       min: 200,  max: 2500,w: 0.01 },
  { name: 'Salary',          min: 2800, max: 5000,w: 0.02 },
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

  // Sort by dateTime ascending
  result.sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime())
  return result
}

// Generate 1000 mock transactions in book_main spanning the last year
const transactions: Transaction[] = generateMockTransactions(
  new Date(),
  new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
  1000,
  'book_main',
)

// Export jobs
interface ExportJob {
  id: string
  format: 'csv' | 'xlsx'
  bookId: string
  from?: string
  to?: string
  status: 'pending' | 'processing' | 'completed'
  downloadUrl?: string
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
  const header = 'id,bookId,dateTime,amount,originalCurrency,originalAmount,exchangeRate,categoryName,note,createdAt'
  const rows = transactions.map(tx =>
    [
      tx.id,
      tx.bookId,
      tx.dateTime.toISOString(),
      tx.amount,
      tx.originalCurrency ?? '',
      tx.originalAmount ?? '',
      tx.exchangeRate ?? '',
      tx.categoryName ?? '',
      tx.note ?? '',
      tx.createdAt.toISOString(),
    ].join(','),
  )
  return [header, ...rows].join('\n')
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

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

  // ---- Categories ----
  http.get('/api/v1/categories', ({ request }) => {
    const auth = requireAuth(request)
    if (auth.error) return auth.response
    const user = auth.user!
    const userCategories = categories.filter(c => c.userId === user.id)
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
      })),
    })
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
    const newBook: Book = {
      id: nextBookId(),
      name: body.name,
      currency: body.currency,
      status: 'open',
      ownerId: user.id,
      sharedWith: [],
      createdAt: new Date(),
    }
    books.push(newBook)
    return HttpResponse.json(
      {
        data: {
          id: newBook.id,
          name: newBook.name,
          currency: newBook.currency,
          status: newBook.status,
        },
      },
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

  // ---- Book Close / Reopen ----
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
    const category = url.searchParams.get('category')
    const createdBy = url.searchParams.get('createdBy')
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
      filtered = filtered.filter(tx => tx.dateTime <= toDate)
    }
    if (category) filtered = filtered.filter(tx => tx.categoryName === category)
    if (createdBy) filtered = filtered.filter(tx => tx.userId === createdBy)

    const { items, totalCount } = paginate(filtered, page, pageSize)
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
      txs = txs.filter(tx => tx.dateTime <= toDate)
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
    if (to) txs = txs.filter(tx => tx.dateTime <= new Date(to))

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
    const body = (await request.json()) as { format?: string; bookId?: string; from?: string; to?: string }
    if (!body.format || !['csv', 'xlsx'].includes(body.format)) {
      return HttpResponse.json({ error: 'Format must be csv or xlsx' }, { status: 400 })
    }
    // Book must be visible
    const book = books.find(
      b => b.id === body.bookId && (b.ownerId === user.id || b.sharedWith.some(s => s.userId === user.id)),
    )
    if (!book) {
      return HttpResponse.json({ error: 'Book not found' }, { status: 404 })
    }

    const job: ExportJob = {
      id: nextExportJobId(),
      format: body.format as 'csv' | 'xlsx',
      bookId: body.bookId!,
      from: body.from,
      to: body.to,
      status: 'pending',
      createdAt: new Date(),
    }
    exportJobs.push(job)

    // Simulate async processing: job completes after a short delay
    setTimeout(() => {
      job.status = 'completed'
      job.downloadUrl = `/api/v1/exports/${job.id}/download`
    }, 50)

    return HttpResponse.json({ data: { jobId: job.id, status: 'pending' } }, { status: 202 })
  }),

  http.get('/api/v1/exports/:jobId', ({ request, params }) => {
    const auth = requireAuth(request)
    if (auth.error) return auth.response
    const { jobId } = params
    const job = exportJobs.find(j => j.id === jobId)
    if (!job) {
      return HttpResponse.json({ error: 'Export job not found' }, { status: 404 })
    }
    return HttpResponse.json({
      data: {
        jobId: job.id,
        status: job.status,
        downloadUrl: job.downloadUrl,
      },
    })
  }),

  http.get('/api/v1/exports/:jobId/download', ({ request, params }) => {
    const auth = requireAuth(request)
    if (auth.error) return auth.response
    const { jobId } = params
    const job = exportJobs.find(j => j.id === jobId)
    if (!job || job.status !== 'completed') {
      return HttpResponse.json({ error: 'Export not ready' }, { status: 404 })
    }
    // Determine which transactions to include
    let txs = transactions.filter(tx => tx.bookId === job.bookId)
    if (job.from) {
      const fromDate = new Date(job.from)
      txs = txs.filter(tx => tx.dateTime >= fromDate)
    }
    if (job.to) {
      const toDate = new Date(job.to)
      txs = txs.filter(tx => tx.dateTime <= toDate)
    }

    if (job.format === 'csv') {
      const csv = generateCsv(txs)
      return new HttpResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="export-${job.id}.csv"`,
        },
      })
    } else {
      // For XLSX we return a minimal valid ZIP header as a dummy binary
      const dummyXlsx = new Uint8Array([0x50, 0x4b, 0x03, 0x04])
      return new HttpResponse(dummyXlsx, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="export-${job.id}.xlsx"`,
        },
      })
    }
  }),
]
