// mocks/handlers.ts
import { http, HttpResponse } from 'msw'

// ---------------------------------------------------------------------------
// In-memory store — resets between test runs, persists within a session
// ---------------------------------------------------------------------------

type Transaction = {
  id: string
  value: number
  currency: string
  category: string
  author: string
  book: string | null
  notes: string | null
  date: string
}

type Category = {
  id: string
  name: string
  color: string | null
  displayOrder: number | null
  icon: string | null
}

type Aggregate = {
  periodStart: string
  book: string
  author: string
  category: string
  currency: string
  sumValue: number
  transactionCount: number
}

let nextTxId = 0

const seedTransactions: Transaction[] = [
  { id: 'a100', value: 42.50,  currency: 'USD', category: 'Groceries',  author: 'Alice', book: 'Personal', notes: null, date: '2026-05-25T10:00:00+00:00' },
  { id: 'a101', value: 15.00,  currency: 'USD', category: 'Transport',  author: 'Alice', book: 'Personal', notes: null, date: '2026-05-25T14:30:00+00:00' },
  { id: 'a102', value: 200.00, currency: 'EUR', category: 'Equipment',  author: 'Bob',   book: 'Business', notes: null, date: '2026-05-26T08:15:00+00:00' },
  { id: 'a103', value: 89.99,  currency: 'USD', category: 'Dining',     author: 'Alice', book: 'Personal', notes: null, date: '2026-05-26T19:45:00+00:00' },
  { id: 'a104', value: 1200.00,currency: 'USD', category: 'Rent',       author: 'Alice', book: 'Personal', notes: null, date: '2026-05-27T09:00:00+00:00' },
  { id: 'a105', value: 55.00,  currency: 'EUR', category: 'Transport',  author: 'Bob',   book: 'Business', notes: null, date: '2026-05-27T11:00:00+00:00' },
]

const transactions: Transaction[] = [...seedTransactions]

let nextCategoryId = 0

const seedCategories: Category[] = [
  { id: 'c1', name: 'Groceries',  color: '#22c55e', displayOrder: 1, icon: null },
  { id: 'c2', name: 'Transport',  color: '#3b82f6', displayOrder: 2, icon: null },
  { id: 'c3', name: 'Dining',     color: '#f59e0b', displayOrder: 3, icon: null },
  { id: 'c4', name: 'Rent',       color: '#ef4444', displayOrder: 4, icon: null },
  { id: 'c5', name: 'Equipment',  color: '#8b5cf6', displayOrder: 5, icon: null },
]

const categories: Category[] = [...seedCategories]

// let loggedInUser: string | null = 'Alice' // start logged-in for convenience
let loggedInUser: string | null = null

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function paginate<T>(items: T[], page: number, pageSize: number) {
  const totalCount = items.length
  const paged = items.slice((page - 1) * pageSize, page * pageSize)
  return { items: paged, totalCount, page, pageSize }
}

function computeAggregates(
  granularity: string,
  from?: string | null,
  to?: string | null,
  book?: string | null,
  author?: string | null,
  category?: string | null,
  currency?: string | null,
): Aggregate[] {
  let filtered = [...transactions]

  if (from) filtered = filtered.filter(t => t.date >= from!)
  if (to)   filtered = filtered.filter(t => t.date <= to!)
  if (book)     filtered = filtered.filter(t => t.book === book)
  if (author)   filtered = filtered.filter(t => t.author === author)
  if (category) filtered = filtered.filter(t => t.category === category)
  if (currency) filtered = filtered.filter(t => t.currency === currency)

  const bucketKey = (dateStr: string) => {
    const d = new Date(dateStr)
    const y = d.getUTCFullYear()
    const m = String(d.getUTCMonth() + 1).padStart(2, '0')
    const day = String(d.getUTCDate()).padStart(2, '0')
    // ISO 8601 week start (Monday)
    const getWeekStart = (dt: Date) => {
      const dayOfWeek = dt.getUTCDay()
      const diff = (dayOfWeek === 0 ? 6 : dayOfWeek - 1) // Monday=0 offset
      const start = new Date(dt)
      start.setUTCDate(dt.getUTCDate() - diff)
      return `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, '0')}-${String(start.getUTCDate()).padStart(2, '0')}`
    }

    switch (granularity) {
      case 'daily':   return `${y}-${m}-${day}`
      case 'weekly':  return getWeekStart(d)
      case 'monthly': return `${y}-${m}-01`
      case 'yearly':  return `${y}-01-01`
      default:        return `${y}-${m}-${day}`
    }
  }

  const groups = new Map<string, { book: string; author: string; category: string; currency: string; sumValue: number; count: number }>()

  for (const tx of filtered) {
    const key = bucketKey(tx.date) + '|' + (tx.book ?? '') + '|' + tx.author + '|' + tx.category + '|' + tx.currency
    const existing = groups.get(key)
    if (existing) {
      existing.sumValue += tx.value
      existing.count++
    } else {
      groups.set(key, {
        book: tx.book ?? '',
        author: tx.author,
        category: tx.category,
        currency: tx.currency,
        sumValue: tx.value,
        count: 1,
      })
    }
  }

  return Array.from(groups.entries()).map(([key, g]) => ({
    periodStart: key.split('|')[0],
    book: g.book,
    author: g.author,
    category: g.category,
    currency: g.currency,
    sumValue: Math.round(g.sumValue * 100) / 100,
    transactionCount: g.count,
  }))
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

export const handlers = [
  // ------------- Echo -------------
  http.get('/api/echo', async ({ request }) => {
    const url = new URL(request.url)
    const message = url.searchParams.get('message') ?? ''
    return HttpResponse.json(message)
  }),

  // ------------- Auth -------------
  http.post('/api/auth/login', async ({ request }) => {
    const body = (await request.json()) as { user?: string; password?: string }
    if (!body.user || !body.password) {
      return HttpResponse.json({ error: 'Invalid username or password.' }, { status: 401 })
    }
    loggedInUser = body.user
    return HttpResponse.json({ message: 'Login successful.' })
  }),

  http.post('/api/auth/logout', async () => {
    loggedInUser = null
    return HttpResponse.json({ message: 'Logged out successfully.' })
  }),

  http.get('/api/auth/whoami', async () => {
    return HttpResponse.json({ user: loggedInUser ?? 'anonymous' })
  }),

  // ------------- Ledger / Transactions -------------
  http.get('/api/ledger/transactions', async ({ request }) => {
    const url = new URL(request.url)
    const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10))
    const pageSize = Math.min(1000, Math.max(1, parseInt(url.searchParams.get('pageSize') ?? '20', 10)))
    const book = url.searchParams.get('book')
    const author = url.searchParams.get('author')
    const category = url.searchParams.get('category')
    const currency = url.searchParams.get('currency')

    let filtered = [...transactions]
    if (book)     filtered = filtered.filter(t => t.book === book)
    if (author)   filtered = filtered.filter(t => t.author === author)
    if (category) filtered = filtered.filter(t => t.category === category)
    if (currency) filtered = filtered.filter(t => t.currency === currency)

    return HttpResponse.json(paginate(filtered, page, pageSize))
  }),

  http.get('/api/ledger/transactions/:id', async ({ params }) => {
    const tx = transactions.find(t => t.id === params.id)
    if (!tx) {
      return HttpResponse.json({ error: `Transaction with id '${params.id}' not found.` }, { status: 404 })
    }
    return HttpResponse.json(tx)
  }),

  http.post('/api/ledger/transaction', async ({ request }) => {
    const body = (await request.json()) as {
      value?: number
      currency?: string
      category?: string
      author?: string
      book?: string | null
      notes?: string | null
      date?: string | null
    }

    if (!body.value || body.value === 0) {
      return HttpResponse.json({ error: 'Transaction value cannot be zero.' }, { status: 400 })
    }
    if (!body.currency || !body.category) {
      return HttpResponse.json({ error: 'Currency and category are required.' }, { status: 400 })
    }

    const tx: Transaction = {
      id: `m-${++nextTxId}`,
      value: body.value,
      currency: body.currency,
      category: body.category,
      author: body.author ?? loggedInUser ?? 'anonymous',
      book: body.book ?? null,
      notes: body.notes ?? null,
      date: body.date ?? new Date().toISOString(),
    }
    transactions.unshift(tx)
    return HttpResponse.json(tx, { status: 201 })
  }),

  http.put('/api/ledger/transactions/:id', async ({ params, request }) => {
    const idx = transactions.findIndex(t => t.id === params.id)
    if (idx === -1) {
      return HttpResponse.json({ error: `Transaction with id '${params.id}' not found.` }, { status: 404 })
    }

    const body = (await request.json()) as {
      value?: number
      currency?: string
      category?: string
      author?: string
      book?: string | null
      notes?: string | null
      date?: string
    }

    if (!body.value || body.value === 0) {
      return HttpResponse.json({ error: 'Transaction value cannot be zero.' }, { status: 400 })
    }

    transactions[idx] = {
      ...transactions[idx],
      value: body.value,
      currency: body.currency ?? transactions[idx].currency,
      category: body.category ?? transactions[idx].category,
      author: body.author ?? transactions[idx].author,
      book: body.book ?? transactions[idx].book,
      notes: body.notes ?? transactions[idx].notes,
      date: body.date ?? transactions[idx].date,
    }
    return HttpResponse.json(transactions[idx])
  }),

  http.delete('/api/ledger/transactions/:id', async ({ params }) => {
    const idx = transactions.findIndex(t => t.id === params.id)
    if (idx === -1) {
      return HttpResponse.json({ error: `Transaction with id '${params.id}' not found.` }, { status: 404 })
    }
    transactions.splice(idx, 1)
    return new HttpResponse(null, { status: 204 })
  }),

  // ------------- Categories -------------
  http.get('/api/categories', async () => {
    const sorted = [...categories].sort((a, b) => {
      const orderA = a.displayOrder ?? Infinity
      const orderB = b.displayOrder ?? Infinity
      if (orderA !== orderB) return orderA - orderB
      return a.name.localeCompare(b.name)
    })
    return HttpResponse.json(sorted)
  }),

  http.post('/api/categories', async ({ request }) => {
    const body = (await request.json()) as {
      name?: string
      color?: string | null
      displayOrder?: number | null
      icon?: string | null
    }

    if (!body.name) {
      return HttpResponse.json({ error: 'Name is required.' }, { status: 400 })
    }

    const exists = categories.some((c) => c.name.toLowerCase() === body.name!.toLowerCase())
    if (exists) {
      return HttpResponse.json({ error: 'Category already exists.' }, { status: 409 })
    }

    const cat: Category = {
      id: `c-${++nextCategoryId}`,
      name: body.name,
      color: body.color ?? null,
      displayOrder: body.displayOrder ?? null,
      icon: body.icon ?? null,
    }
    categories.push(cat)
    return HttpResponse.json(cat, { status: 201 })
  }),

  http.put('/api/categories/:id', async ({ params, request }) => {
    const idx = categories.findIndex((c) => c.id === params.id)
    if (idx === -1) {
      return HttpResponse.json({ error: `Category with id '${params.id}' not found.` }, { status: 404 })
    }

    const body = (await request.json()) as {
      name?: string
      color?: string | null
      displayOrder?: number | null
      icon?: string | null
    }

    if (!body.name) {
      return HttpResponse.json({ error: 'Name is required.' }, { status: 400 })
    }

    const duplicate = categories.findIndex(
      (c) => c.name.toLowerCase() === body.name!.toLowerCase() && c.id !== params.id,
    )
    if (duplicate !== -1) {
      return HttpResponse.json({ error: 'Category already exists.' }, { status: 409 })
    }

    categories[idx] = {
      ...categories[idx],
      name: body.name,
      color: body.color ?? categories[idx].color,
      displayOrder: body.displayOrder ?? categories[idx].displayOrder,
      icon: body.icon ?? categories[idx].icon,
    }
    return HttpResponse.json(categories[idx])
  }),

  http.delete('/api/categories/:id', async ({ params }) => {
    const idx = categories.findIndex((c) => c.id === params.id)
    if (idx === -1) {
      return HttpResponse.json({ error: `Category with id '${params.id}' not found.` }, { status: 404 })
    }
    categories.splice(idx, 1)
    return new HttpResponse(null, { status: 204 })
  }),

  // ------------- Dashboard -------------
  http.get('/api/dashboard', async ({ request }) => {
    const url = new URL(request.url)
    const granularity = url.searchParams.get('granularity')
    const valid = ['daily', 'weekly', 'monthly', 'yearly']
    if (!granularity || !valid.includes(granularity)) {
      return HttpResponse.json(
        { error: `Invalid granularity '${granularity}'. Valid values: daily, weekly, monthly, yearly.` },
        { status: 400 },
      )
    }

    const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10))
    const pageSize = Math.min(1000, Math.max(1, parseInt(url.searchParams.get('pageSize') ?? '20', 10)))
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')

    if (from && to && from > to) {
      return HttpResponse.json({ error: "The 'from' date must not be after the 'to' date." }, { status: 400 })
    }

    const aggregates = computeAggregates(
      granularity,
      from,
      to,
      url.searchParams.get('book'),
      url.searchParams.get('author'),
      url.searchParams.get('category'),
      url.searchParams.get('currency'),
    )

    return HttpResponse.json(paginate(aggregates, page, pageSize))
  }),
]