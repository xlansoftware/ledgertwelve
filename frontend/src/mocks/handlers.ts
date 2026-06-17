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
  {
    id: 'cat_1',
    userId: 'usr_1',
    name: 'Food',
    recurring: false,
    color: '#FF5733',
    icon: 'utensils',
    createdAt: new Date('2026-01-01'),
    order: 1,
  },
  {
    id: 'cat_2',
    userId: 'usr_1',
    name: 'Rent',
    recurring: true,
    color: '#3366FF',
    icon: 'house',
    createdAt: new Date('2026-01-01'),
    order: 2,
  },
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

const transactions: Transaction[] = [
  {
    id: 'tx_1',
    bookId: 'book_main',
    userId: 'usr_1',
    dateTime: new Date('2026-05-01T12:00:00Z'),
    amount: -100,
    originalCurrency: 'USD',
    originalAmount: -110,
    exchangeRate: 0.91,
    categoryName: 'Food',
    note: 'Lunch',
    createdAt: new Date('2026-05-01T12:00:00Z'),
  },
  {
    id: 'tx_2',
    bookId: 'book_vacation',
    userId: 'usr_1',
    dateTime: new Date('2026-06-01T10:00:00Z'),
    amount: -50,
    categoryName: 'Food',
    note: 'Ice cream',
    createdAt: new Date('2026-06-01T10:00:00Z'),
  },
]

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
