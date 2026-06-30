// ---------------------------------------------------------------------------
// OfflineBooksService — IndexedDB-backed implementation of IBooksService
//
// All data is stored in the "books" and "sharedUsers" object stores.
// Book stats are computed on-the-fly from the transactions store.
// Close book creates a balancing transaction via the factory's transactions service.
// ---------------------------------------------------------------------------

import type { BookDto, BookStatsDto, CloseBookResponse, ReopenBookResponse, ShareResponse, GlobalShareResponse } from "@/types"
import type { IBooksService, CreateBookRequest, UpdateBookRequest, CloseBookRequest, AddShareRequest, UpdateShareRequest, GetBookStatsParams } from "@/features/offline/interfaces/IBooksService"
import * as db from "./db"
import { getFactory } from "@/features/offline/factory"
import { OfflineUserStore } from "./OfflineUserStore"

export class OfflineBooksService implements IBooksService {
  private userStore: OfflineUserStore

  constructor(userStore: OfflineUserStore) {
    this.userStore = userStore
  }

  async getBooks(): Promise<BookDto[]> {
    return db.getAll<BookDto>(db.STORES.books)
  }

  async getBook(bookId: string): Promise<BookDto> {
    const book = await db.getById<BookDto>(db.STORES.books, bookId)
    if (!book) {
      throw new Error("Book not found")
    }
    // Hydrate sharedWith from sharedUsers store
    const sharedEntries = await db.getAllSharedUsersForBook(bookId)
    return {
      ...book,
      sharedWith: sharedEntries.map((e) => ({
        userId: e.userId,
        email: e.email,
        permission: e.permission,
      })),
    }
  }

  async createBook(req: CreateBookRequest): Promise<BookDto> {
    const now = new Date().toISOString()
    const book: BookDto = {
      id: crypto.randomUUID(),
      name: req.name,
      currency: req.currency,
      status: "open",
      ownerId: this.userStore.getUserId(),
      sharedWith: [],
      createdAt: now,
    }
    await db.put(db.STORES.books, book)
    return book
  }

  async updateBook(bookId: string, req: UpdateBookRequest): Promise<BookDto> {
    const book = await db.getById<BookDto>(db.STORES.books, bookId)
    if (!book) {
      throw new Error("Book not found")
    }
    const updated: BookDto = {
      ...book,
      ...(req.name !== undefined ? { name: req.name } : {}),
      ...(req.currency !== undefined ? { currency: req.currency } : {}),
    }
    await db.put(db.STORES.books, updated)
    return updated
  }

  async deleteBook(bookId: string): Promise<void> {
    const book = await db.getById<BookDto>(db.STORES.books, bookId)
    if (!book) {
      throw new Error("Book not found")
    }
    if (book.name === "Main") {
      throw new Error("Cannot delete Main book")
    }
    // Check for transactions
    const txs = await db.getAllByIndex<{ bookId: string }>(db.STORES.transactions, "bookId", bookId)
    if (txs.length > 0) {
      throw new Error("Cannot delete book with existing transactions")
    }
    await db.remove(db.STORES.books, bookId)
    // Clean up shared users
    await db.clearAllSharedUsersForBook(bookId)
  }

  async addShare(bookId: string, req: AddShareRequest): Promise<ShareResponse> {
    const book = await db.getById<BookDto>(db.STORES.books, bookId)
    if (!book) {
      throw new Error("Book not found")
    }
    // For offline mode, we just store the share entry locally
    const userId = crypto.randomUUID()
    const entry: db.SharedUserEntry = {
      bookId,
      userId,
      email: req.email,
      permission: req.permission,
    }
    await db.put(db.STORES.sharedUsers, entry)
    return { userId, permission: req.permission }
  }

  async updateShare(bookId: string, userId: string, req: UpdateShareRequest): Promise<ShareResponse> {
    const entry = await db.getById<db.SharedUserEntry>(db.STORES.sharedUsers, `${bookId}\x00${userId}`)
    if (!entry) {
      throw new Error("Share not found")
    }
    const updated = { ...entry, permission: req.permission }
    // Use compound key [bookId, userId] — need to delete and re-put
    await db.removeSharedUser(bookId, userId)
    await db.put(db.STORES.sharedUsers, updated)
    return { userId, permission: req.permission }
  }

  async removeShare(bookId: string, userId: string): Promise<void> {
    const existing = await db.getAllSharedUsersForBook(bookId)
    const entry = existing.find((e) => e.userId === userId)
    if (!entry) {
      throw new Error("Share not found")
    }
    await db.removeSharedUser(bookId, userId)
  }

  async addGlobalShare(_email: string): Promise<GlobalShareResponse> {
    throw new Error("Global sharing is not available in offline mode")
  }

  async removeGlobalShare(_userId: string): Promise<void> {
    throw new Error("Global sharing is not available in offline mode")
  }

  async getCurrentBook(): Promise<BookDto> {
    const books = await this.getBooks()
    if (books.length === 0) {
      throw new Error("No books found")
    }

    // Try the persisted preference first
    const userId = this.userStore.getUserId()
    const pref = await db.getUserPreference(userId)
    if (pref) {
      const preferred = books.find((b) => b.id === pref.selectedBookId)
      if (preferred) return preferred
    }

    // Fall back to first open book
    const firstOpenBook = books.find((b) => b.status !== "closed")
    if (firstOpenBook) return firstOpenBook

    return books[0]
  }

  async setCurrentBook(bookId: string): Promise<BookDto> {
    const book = await this.getBook(bookId)
    const userId = this.userStore.getUserId()
    await db.setUserPreference({ userId, selectedBookId: bookId })
    return book
  }

  async getBookStats(bookId: string, params?: GetBookStatsParams): Promise<BookStatsDto> {
    const book = await db.getById<BookDto>(db.STORES.books, bookId)
    if (!book) {
      throw new Error("Book not found")
    }

    let txs = await db.getAllByIndex<{ bookId: string; dateTime: string; amount: number; isBookClosingEntry?: boolean }>(
      db.STORES.transactions,
      "bookId",
      bookId,
    )

    // Filter out closing entries
    txs = txs.filter((tx) => !tx.isBookClosingEntry)

    // Apply asOf filter
    if (params?.asOf) {
      const asOfDate = new Date(params.asOf + "T00:00:00.000Z")
      asOfDate.setDate(asOfDate.getDate() + 1) // end-of-day semantics: exclusive next day
      txs = txs.filter((tx) => new Date(tx.dateTime) < asOfDate)
    }

    const transactionCount = txs.length
    const totalSum = txs.reduce((sum, tx) => sum + tx.amount, 0)

    return { transactionCount, totalSum }
  }

  async closeBook(bookId: string, req: CloseBookRequest): Promise<CloseBookResponse> {
    const book = await db.getById<BookDto>(db.STORES.books, bookId)
    if (!book) {
      throw new Error("Book not found")
    }
    if (book.status === "closed") {
      throw new Error("Book already closed")
    }
    if (book.name === "Main") {
      throw new Error("Cannot close Main book")
    }

    // Calculate net balance
    const txs = await db.getAllByIndex<{ bookId: string; amount: number }>(
      db.STORES.transactions,
      "bookId",
      bookId,
    )
    const netBalance = txs.reduce((sum, tx) => sum + tx.amount, 0)

    // Find Main book
    const allBooks = await this.getBooks()
    const mainBook = allBooks.find((b) => b.name === "Main")
    if (!mainBook) {
      throw new Error("Main book not found")
    }

    // Create balancing transaction in Main book
    const closingTx = await getFactory().transactions.createTransaction({
      bookId: mainBook.id,
      amount: netBalance,
      dateTime: new Date().toISOString(),
      categoryName: req.closingCategoryName,
      note: `Close ${book.name}`,
    })

    // Update book status
    const updated: BookDto = {
      ...book,
      status: "closed",
      closedAt: new Date().toISOString(),
    }
    await db.put(db.STORES.books, updated)

    return {
      bookId: book.id,
      status: "closed",
      closingTransactionId: closingTx.id,
      netBalance,
    }
  }

  async reopenBook(bookId: string): Promise<ReopenBookResponse> {
    const book = await db.getById<BookDto>(db.STORES.books, bookId)
    if (!book) {
      throw new Error("Book not found")
    }
    if (book.status !== "closed") {
      throw new Error("Book is not closed")
    }

    const updated: BookDto = {
      ...book,
      status: "open",
      closedAt: undefined,
    }
    await db.put(db.STORES.books, updated)

    return { bookId: book.id, status: "open" }
  }
}