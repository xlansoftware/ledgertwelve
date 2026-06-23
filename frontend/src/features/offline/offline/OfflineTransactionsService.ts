// ---------------------------------------------------------------------------
// OfflineTransactionsService — IndexedDB-backed implementation of ITransactionsService
//
// Supports: CRUD, paginated list with date-range, category, note, value filters.
// Uses compound index [bookId, dateTime] for efficient range queries, then
// applies remaining filters in memory.
// ---------------------------------------------------------------------------

import type { TransactionDto } from "@/types"
import type { ITransactionsService, GetTransactionsParams, CreateTransactionRequest, UpdateTransactionRequest, PaginatedTransactions } from "@/features/offline/interfaces/ITransactionsService"
import * as db from "./db"
import { OfflineUserStore } from "./OfflineUserStore"

export class OfflineTransactionsService implements ITransactionsService {
  private userStore: OfflineUserStore

  constructor(userStore: OfflineUserStore) {
    this.userStore = userStore
  }

  async getTransactions(params: GetTransactionsParams = {}): Promise<PaginatedTransactions> {
    const { bookId, from, to, category, createdBy, note, minValue, maxValue, page = 1, pageSize = 50 } = params

    // Start with all transactions, using the compound index if we have a bookId
    let allTxs: TransactionDto[]

    if (bookId) {
      if (from && to) {
        // Use compound index [bookId, dateTime] with key range
        const lower = [bookId, from]
        const upper = [bookId, to]
        allTxs = await db.getAllByIndexRange<TransactionDto>(
          db.STORES.transactions,
          "bookId_dateTime",
          IDBKeyRange.bound(lower, upper, false, true), // to is exclusive
        )
      } else if (from) {
        const lower = [bookId, from]
        allTxs = await db.getAllByIndexRange<TransactionDto>(
          db.STORES.transactions,
          "bookId_dateTime",
          IDBKeyRange.lowerBound(lower),
        )
      } else if (to) {
        const upper = [bookId, to]
        allTxs = await db.getAllByIndexRange<TransactionDto>(
          db.STORES.transactions,
          "bookId_dateTime",
          IDBKeyRange.upperBound(upper, true), // to is exclusive
        )
      } else {
        allTxs = await db.getAllByIndex<TransactionDto>(db.STORES.transactions, "bookId", bookId)
      }
    } else {
      allTxs = await db.getAll<TransactionDto>(db.STORES.transactions)
    }

    // Apply in-memory filters

    // Date range filtering (additional safety when not using compound index)
    if (from && !bookId) {
      const fromDate = new Date(from)
      allTxs = allTxs.filter((tx) => new Date(tx.dateTime) >= fromDate)
    }
    if (to && !bookId) {
      const toDate = new Date(to)
      allTxs = allTxs.filter((tx) => new Date(tx.dateTime) < toDate)
    }

    // Category filter (OR match)
    if (category && category.length > 0) {
      allTxs = allTxs.filter((tx) => tx.categoryName && category.includes(tx.categoryName))
    }

    // CreatedBy filter (OR match on userId)
    if (createdBy && createdBy.length > 0) {
      allTxs = allTxs.filter((tx) => createdBy.includes(tx.userId))
    }

    // Note substring search (case-insensitive)
    if (note) {
      const lowerNote = note.toLowerCase()
      allTxs = allTxs.filter((tx) => tx.note && tx.note.toLowerCase().includes(lowerNote))
    }

    // Min/max value filters (inclusive)
    if (minValue !== undefined) {
      allTxs = allTxs.filter((tx) => tx.amount >= minValue)
    }
    if (maxValue !== undefined) {
      allTxs = allTxs.filter((tx) => tx.amount <= maxValue)
    }

    // Sort by dateTime descending
    allTxs.sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime())

    // Paginate
    const total = allTxs.length
    const startIndex = (page - 1) * pageSize
    const items = allTxs.slice(startIndex, startIndex + pageSize)

    return { items, page, pageSize, total }
  }

  async getTransaction(transactionId: string): Promise<TransactionDto> {
    const tx = await db.getById<TransactionDto>(db.STORES.transactions, transactionId)
    if (!tx) {
      throw new Error("Transaction not found")
    }
    return tx
  }

  async createTransaction(req: CreateTransactionRequest): Promise<TransactionDto> {
    const now = new Date().toISOString()
    const transaction: TransactionDto = {
      id: crypto.randomUUID(),
      bookId: req.bookId,
      userId: this.userStore.getUserId(),
      dateTime: req.dateTime || now,
      amount: req.amount,
      originalCurrency: req.originalCurrency,
      originalAmount: req.originalAmount,
      exchangeRate: req.exchangeRate,
      categoryName: req.categoryName,
      note: req.note,
      createdAt: now,
    }

    // Validate multi-currency consistency
    if (transaction.originalCurrency) {
      if (transaction.originalAmount === undefined || transaction.exchangeRate === undefined) {
        throw new Error("originalAmount and exchangeRate are required when originalCurrency is set")
      }
    }

    await db.put(db.STORES.transactions, transaction)
    return transaction
  }

  async updateTransaction(transactionId: string, req: UpdateTransactionRequest): Promise<TransactionDto> {
    const tx = await db.getById<TransactionDto>(db.STORES.transactions, transactionId)
    if (!tx) {
      throw new Error("Transaction not found")
    }

    const updated: TransactionDto = {
      ...tx,
      ...(req.bookId !== undefined ? { bookId: req.bookId } : {}),
      ...(req.dateTime !== undefined ? { dateTime: req.dateTime } : {}),
      ...(req.amount !== undefined ? { amount: req.amount } : {}),
      ...(req.originalCurrency !== undefined ? { originalCurrency: req.originalCurrency } : {}),
      ...(req.originalAmount !== undefined ? { originalAmount: req.originalAmount } : {}),
      ...(req.exchangeRate !== undefined ? { exchangeRate: req.exchangeRate } : {}),
      ...(req.categoryName !== undefined ? { categoryName: req.categoryName } : {}),
      ...(req.note !== undefined ? { note: req.note } : {}),
    }

    // Re-validate multi-currency consistency
    if (updated.originalCurrency) {
      if (updated.originalAmount === undefined || updated.exchangeRate === undefined) {
        throw new Error("originalAmount and exchangeRate are required when originalCurrency is set")
      }
    }

    await db.put(db.STORES.transactions, updated)
    return updated
  }

  async deleteTransaction(transactionId: string): Promise<void> {
    const tx = await db.getById<TransactionDto>(db.STORES.transactions, transactionId)
    if (!tx) {
      throw new Error("Transaction not found")
    }
    await db.remove(db.STORES.transactions, transactionId)
  }
}