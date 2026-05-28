import { describe, expect, it, vi, beforeEach } from 'vitest'
import { useBookStore } from './bookStore'
import { useTransactionStore } from './transactionStore'

// ---------------------------------------------------------------------------
// Mock the API module so stores don't make real HTTP calls
// ---------------------------------------------------------------------------

vi.mock('@/services/api', () => ({
  getBooks: vi.fn().mockResolvedValue([
    { id: 'b1', name: 'Personal', currency: 'USD', color: '#22c55e', status: 'active' },
    { id: 'b2', name: 'Business', currency: 'EUR', color: '#3b82f6', status: 'active' },
  ]),
  createBook: vi.fn(),
  updateBook: vi.fn(),
  deleteBook: vi.fn(),
  getTransactions: vi.fn().mockResolvedValue({
    items: [],
    totalCount: 0,
    page: 1,
    pageSize: 20,
  }),
  createTransaction: vi.fn(),
  updateTransaction: vi.fn(),
  deleteTransaction: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Reset stores before each test
// ---------------------------------------------------------------------------

beforeEach(() => {
  useBookStore.setState({
    books: [
      { id: 'b1', name: 'Personal', currency: 'USD', color: '#22c55e', status: 'active' },
      { id: 'b2', name: 'Business', currency: 'EUR', color: '#3b82f6', status: 'active' },
    ],
    currentBook: null,
    isLoading: false,
    error: null,
  })

  useTransactionStore.setState({
    transactions: [],
    totalCount: 0,
    page: 1,
    pageSize: 20,
    filters: {},
    isLoading: false,
    error: null,
  })
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('bookStore → transactionStore cross-store dependency', () => {
  // -----------------------------------------------------------------------
  // openBook (matching name)
  // -----------------------------------------------------------------------

  it('sets transaction filter to book name when openBook finds a match', async () => {
    const { openBook } = useBookStore.getState()

    await openBook('Personal')

    const txFilters = useTransactionStore.getState().filters
    expect(txFilters.book).toBe('Personal')
  })

  // -----------------------------------------------------------------------
  // openBook (case-insensitive match)
  // -----------------------------------------------------------------------

  it('matches book name case-insensitively', async () => {
    const { openBook } = useBookStore.getState()

    await openBook('personal')

    const txFilters = useTransactionStore.getState().filters
    expect(txFilters.book).toBe('Personal')
  })

  // -----------------------------------------------------------------------
  // openBook (null clears filter)
  // -----------------------------------------------------------------------

  it('clears transaction filter when openBook is called with null', async () => {
    // Pre-set a filter to ensure it gets cleared
    useTransactionStore.getState().setFilters({ book: 'Personal' })

    const { openBook } = useBookStore.getState()
    await openBook(null)

    const txFilters = useTransactionStore.getState().filters
    expect(txFilters.book).toBeUndefined()
  })

  // -----------------------------------------------------------------------
  // openBook (no match clears filter)
  // -----------------------------------------------------------------------

  it('clears transaction filter when openBook finds no matching book', async () => {
    useTransactionStore.getState().setFilters({ book: 'Personal' })

    const { openBook } = useBookStore.getState()
    await openBook('NonExistent')

    const txFilters = useTransactionStore.getState().filters
    expect(txFilters.book).toBeUndefined()
  })

  // -----------------------------------------------------------------------
  // openBook sets currentBook
  // -----------------------------------------------------------------------

  it('sets currentBook in bookStore when a match is found', async () => {
    const { openBook } = useBookStore.getState()

    await openBook('Business')

    const currentBook = useBookStore.getState().currentBook
    expect(currentBook).not.toBeNull()
    expect(currentBook!.name).toBe('Business')
    expect(currentBook!.id).toBe('b2')
  })

  // -----------------------------------------------------------------------
  // openBook sets currentBook to null when no match
  // -----------------------------------------------------------------------

  it('sets currentBook to null when no matching book is found', async () => {
    // Pre-set a currentBook to ensure it gets cleared
    useBookStore.setState({
      currentBook: { id: 'b1', name: 'Personal', currency: 'USD', color: '#22c55e', status: 'active' },
    })

    const { openBook } = useBookStore.getState()
    await openBook('Vacation')

    expect(useBookStore.getState().currentBook).toBeNull()
  })

  // -----------------------------------------------------------------------
  // setFilters resets page to 1
  // -----------------------------------------------------------------------

  it('resets transaction page to 1 when filter is applied via openBook', async () => {
    // Set page to something other than 1
    useTransactionStore.getState().setPage(3)

    const { openBook } = useBookStore.getState()
    await openBook('Personal')

    expect(useTransactionStore.getState().page).toBe(1)
  })
})
