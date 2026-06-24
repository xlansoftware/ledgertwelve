// ---------------------------------------------------------------------------
// OfflineImportService — validates and imports data into IndexedDB locally.
// Replicates server-side validation and uses existing offline service classes
// for create/update operations.
// ---------------------------------------------------------------------------

import * as db from "./db"
import type { IImportService, ImportRequest, ImportResult } from "@/features/offline/interfaces/IImportService"
import type {
  BookDto,
  CategoryDto,
  TransactionDto,
  ImportResultItem,
  ImportIssue,
} from "@/types"

export class OfflineImportService implements IImportService {
  async importData(req: ImportRequest): Promise<ImportResult> {
    if (req.entityType === "backup") {
      return this.importBackup(req)
    }
    return this.importEntity(req)
  }

  // ---------------------------------------------------------------------------
  // Single entity type import (transactions / categories / books)
  // ---------------------------------------------------------------------------

  private async importEntity(req: ImportRequest): Promise<ImportResult> {
    const { preview, entityType, bookId, clearExisting, rows } = req
    const issues: ImportIssue[] = []
    let created = 0
    let updated = 0
    let deleted = 0

    if (!rows || rows.length === 0) {
      // If clearExisting is requested and no rows, still do the clear
      if (clearExisting && entityType !== "backup") {
        const deletedCount = await this.doClear(entityType, bookId)
        if (preview) {
          return { created: 0, updated: 0, deleted: deletedCount, errors: 0, warnings: 0, issues: [] }
        }
        return { created: 0, updated: 0, deleted: deletedCount, errors: 0, warnings: 0, issues: [] }
      }
      return { created: 0, updated: 0, deleted: 0, errors: 0, warnings: 0, issues: [] }
    }

    // Validate bookId for transactions
    if (entityType === "transactions" && !bookId) {
      issues.push({
        row: null,
        field: null,
        message: "bookId is required for transaction imports",
        severity: "error",
      })
      return { created: 0, updated: 0, deleted: 0, errors: 0, warnings: 0, issues }
    }

    // Validate entity type
    if (!["transactions", "categories", "books"].includes(entityType)) {
      issues.push({
        row: null,
        field: null,
        message: `Unknown entityType: "${entityType}"`,
        severity: "error",
      })
      return { created: 0, updated: 0, deleted: 0, errors: 0, warnings: 0, issues }
    }

    // Load existing data
    const existingTransactions = await db.getAll<TransactionDto>(db.STORES.transactions)
    const existingCategories = await db.getAll<CategoryDto>(db.STORES.categories)
    const existingBooks = await db.getAll<BookDto>(db.STORES.books)

    // Clear existing if requested
    if (clearExisting && !preview) {
      deleted = await this.doClear(entityType, bookId)
    } else if (clearExisting && preview) {
      deleted = await this.countClearable(entityType, bookId)
    }

    // Validate and process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNum = i + 1 // 1-based

      try {
        if (entityType === "transactions") {
          const result = await this.processTransactionRow(
            row,
            rowNum,
            bookId!,
            existingCategories,
            existingBooks,
            existingTransactions,
          )
          if (result.issue) {
            issues.push(result.issue)
          } else if (result.data && !preview) {
            await db.put(db.STORES.transactions, result.data)
            if (result.isUpdate) {
              updated++
            } else {
              created++
            }
          } else if (result.data && preview) {
            if (result.isUpdate) {
              updated++
            } else {
              created++
            }
          } else {
            // Row was skipped (error)
            issues.push({
              row: rowNum,
              field: null,
              message: "Failed to process transaction row",
              severity: "error",
            })
          }
        } else if (entityType === "categories") {
          const result = await this.processCategoryRow(
            row,
            rowNum,
            existingCategories,
          )
          if (result.issue) {
            issues.push(result.issue)
          } else if (result.data && !preview) {
            await db.put(db.STORES.categories, result.data)
            if (result.isUpdate) {
              updated++
            } else {
              created++
            }
          } else if (result.data && preview) {
            if (result.isUpdate) {
              updated++
            } else {
              created++
            }
          }
        } else if (entityType === "books") {
          const result = await this.processBookRow(
            row,
            rowNum,
            existingBooks,
          )
          if (result.issue) {
            issues.push(result.issue)
          } else if (result.data && !preview) {
            await db.put(db.STORES.books, result.data)
            if (result.isUpdate) {
              updated++
            } else {
              created++
            }
          } else if (result.data && preview) {
            if (result.isUpdate) {
              updated++
            } else {
              created++
            }
          }
        }
      } catch (err) {
        issues.push({
          row: rowNum,
          field: null,
          message: err instanceof Error ? err.message : "Unexpected error processing row",
          severity: "error",
        })
      }
    }

    const errors = issues.filter((i) => i.severity === "error").length
    const warnings = issues.filter((i) => i.severity === "warning").length

    return { created, updated, deleted, errors, warnings, issues }
  }

  // ---------------------------------------------------------------------------
  // Backup import
  // ---------------------------------------------------------------------------

  private async importBackup(req: ImportRequest): Promise<ImportResult> {
    const { preview, data } = req
    const issues: ImportIssue[] = []

    if (!data) {
      issues.push({
        row: null,
        field: null,
        message: "data field is required for backup entityType",
        severity: "error",
      })
      return {
        books: { created: 0, updated: 0, deleted: 0, errors: 1, warnings: 0, issues },
        categories: { created: 0, updated: 0, deleted: 0, errors: 0, warnings: 0, issues: [] },
        transactions: { created: 0, updated: 0, deleted: 0, errors: 0, warnings: 0, issues: [] },
      }
    }

    // Validate version
    const version = data.version as number | undefined
    if (version === undefined || version !== 1) {
      issues.push({
        row: null,
        field: null,
        message: version === undefined
          ? "Backup data is missing version field"
          : `Unsupported backup version: ${version}. This app supports version 1.`,
        severity: "error",
      })
      return {
        books: { created: 0, updated: 0, deleted: 0, errors: 1, warnings: 0, issues },
        categories: { created: 0, updated: 0, deleted: 0, errors: 0, warnings: 0, issues: [] },
        transactions: { created: 0, updated: 0, deleted: 0, errors: 0, warnings: 0, issues: [] },
      }
    }

    // Validate schema
    const backupBooks = data.books as Record<string, unknown>[] | undefined
    const backupCategories = data.categories as Record<string, unknown>[] | undefined
    const backupTransactions = data.transactions as Record<string, unknown>[] | undefined

    if (!Array.isArray(backupBooks) || !Array.isArray(backupCategories) || !Array.isArray(backupTransactions)) {
      issues.push({
        row: null,
        field: null,
        message: "Backup data is malformed: missing 'books', 'categories', or 'transactions' array",
        severity: "error",
      })
      return {
        books: { created: 0, updated: 0, deleted: 0, errors: 1, warnings: 0, issues },
        categories: { created: 0, updated: 0, deleted: 0, errors: 0, warnings: 0, issues: [] },
        transactions: { created: 0, updated: 0, deleted: 0, errors: 0, warnings: 0, issues: [] },
      }
    }

    // Clear existing data for backup (transactions & categories only)
    if (!preview) {
      await db.clearStore(db.STORES.transactions)
      await db.clearStore(db.STORES.categories)
    }

    // Process in order: books → categories → transactions
    const booksResult = await this.processBackupBooks(backupBooks as unknown as BookDto[], preview)
    const categoriesResult = await this.processBackupCategories(backupCategories as unknown as CategoryDto[], preview)
    const transactionsResult = await this.processBackupTransactions(backupTransactions as unknown as TransactionDto[], preview)

    return {
      books: booksResult,
      categories: categoriesResult,
      transactions: transactionsResult,
    }
  }

  private async processBackupBooks(
    backupBooks: BookDto[],
    preview: boolean,
  ): Promise<ImportResultItem> {
    const existingBooks = await db.getAll<BookDto>(db.STORES.books)
    const issues: ImportIssue[] = []
    let created = 0
    let updated = 0

    for (const book of backupBooks) {
      // Skip Main book — never cleared, always merged
      if (book.name === "Main") {
        existingBooks.find((b) => b.name === "Main")
        // Just update the Main book's metadata if it exists
        const existing = existingBooks.find((b) => b.id === book.id)
        if (existing) {
          updated++
        } else {
          // Try to find by name
          const existingByName = existingBooks.find((b) => b.name === "Main")
          if (existingByName) {
            updated++
          }
        }
        continue
      }

      const existing = existingBooks.find((b) => b.id === book.id || b.name === book.name)

      if (existing) {
        // Merge by ID — update existing
        if (!preview) {
          await db.put(db.STORES.books, { ...existing, ...book, id: existing.id })
        }
        updated++
      } else {
        // Create new book
        if (!preview) {
          await db.put(db.STORES.books, book)
        }
        created++
      }
    }

    const errors = issues.filter((i) => i.severity === "error").length
    const warnings = issues.filter((i) => i.severity === "warning").length
    return { created, updated, deleted: 0, errors, warnings, issues }
  }

  private async processBackupCategories(
    backupCategories: CategoryDto[],
    preview: boolean,
  ): Promise<ImportResultItem> {
    const existingCategories = await db.getAll<CategoryDto>(db.STORES.categories)
    const issues: ImportIssue[] = []
    let created = 0
    let updated = 0

    for (const cat of backupCategories) {
      const existing = existingCategories.find((c) => c.id === cat.id)
      if (existing) {
        if (!preview) {
          await db.put(db.STORES.categories, { ...existing, ...cat } as CategoryDto)
        }
        updated++
      } else {
        if (!preview) {
          // Use the backup's id if provided, or generate one
          if (!cat.id) {
            (cat as unknown as Record<string, unknown>).id = `cat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
          }
          await db.put(db.STORES.categories, cat as CategoryDto)
        }
        created++
      }
    }

    const errors = issues.filter((i) => i.severity === "error").length
    const warnings = issues.filter((i) => i.severity === "warning").length
    return { created, updated, deleted: 0, errors, warnings, issues }
  }

  private async processBackupTransactions(
    backupTransactions: TransactionDto[],
    preview: boolean,
  ): Promise<ImportResultItem> {
    const existingTransactions = await db.getAll<TransactionDto>(db.STORES.transactions)
    const existingBooks = await db.getAll<BookDto>(db.STORES.books)
    const existingCategories = await db.getAll<CategoryDto>(db.STORES.categories)
    const issues: ImportIssue[] = []
    let created = 0
    let updated = 0

    for (let i = 0; i < backupTransactions.length; i++) {
      const tx = backupTransactions[i]
      const rowNum = i + 1

      // Validate book reference
      const bookExists = existingBooks.some((b) => b.id === tx.bookId)
      if (!bookExists) {
        issues.push({
          row: rowNum,
          field: "bookId",
          message: `Book "${tx.bookId}" not found`,
          severity: "error",
        })
        continue
      }

      // Validate category reference if set
      if (tx.categoryName) {
        const categoryExists = existingCategories.some((c) => c.name === tx.categoryName)
        if (!categoryExists) {
          issues.push({
            row: rowNum,
            field: "categoryName",
            message: `Category "${tx.categoryName}" not found`,
            severity: "error",
          })
          continue
        }
      }

      const existing = existingTransactions.find((t) => t.id === tx.id)

      if (existing) {
        if (!preview) {
          await db.put(db.STORES.transactions, { ...existing, ...tx } as TransactionDto)
        }
        updated++
      } else {
        if (!preview) {
          if (!tx.id) {
            (tx as unknown as Record<string, unknown>).id = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
          }
          await db.put(db.STORES.transactions, tx as TransactionDto)
        }
        created++
      }
    }

    const errors = issues.filter((i) => i.severity === "error").length
    const warnings = issues.filter((i) => i.severity === "warning").length
    return { created, updated, deleted: 0, errors, warnings, issues }
  }

  // ---------------------------------------------------------------------------
  // Per-row processing helpers
  // ---------------------------------------------------------------------------

  private async processTransactionRow(
    row: Record<string, unknown>,
    rowNum: number,
    fallbackBookId: string,
    existingCategories: CategoryDto[],
    existingBooks: BookDto[],
    existingTransactions: TransactionDto[],
  ): Promise<{ data?: TransactionDto; issue?: ImportIssue; isUpdate?: boolean }> {
    // Validate required fields
    const amount = row.amount as number | undefined
    if (amount === undefined || amount === null || typeof amount !== "number" || isNaN(amount)) {
      return { issue: { row: rowNum, field: "amount", message: "Amount is required and must be a number", severity: "error" } }
    }

    // Validate book reference
    const rowBookId = (row.bookId as string) || fallbackBookId
    if (!rowBookId) {
      return { issue: { row: rowNum, field: "bookId", message: "bookId is required", severity: "error" } }
    }
    const bookExists = existingBooks.some((b) => b.id === rowBookId)
    if (!bookExists) {
      return { issue: { row: rowNum, field: "bookId", message: `Book "${rowBookId}" not found`, severity: "error" } }
    }

    // Validate category reference
    const categoryName = row.categoryName as string | undefined
    if (categoryName) {
      const categoryExists = existingCategories.some((c) => c.name === categoryName)
      if (!categoryExists) {
        return { issue: { row: rowNum, field: "categoryName", message: `Category "${categoryName}" not found`, severity: "error" } }
      }
    }

    // Validate multi-currency
    const originalCurrency = row.originalCurrency as string | undefined
    const originalAmount = row.originalAmount as number | undefined
    const exchangeRate = row.exchangeRate as number | undefined
    if (originalCurrency) {
      if (originalAmount === undefined) {
        return { issue: { row: rowNum, field: "originalAmount", message: "originalAmount is required when originalCurrency is set", severity: "error" } }
      }
      if (exchangeRate === undefined) {
        return { issue: { row: rowNum, field: "exchangeRate", message: "exchangeRate is required when originalCurrency is set", severity: "error" } }
      }
      if (typeof exchangeRate !== "number" || exchangeRate <= 0) {
        return { issue: { row: rowNum, field: "exchangeRate", message: "exchangeRate must be a positive number", severity: "error" } }
      }
    }

    // Check for Id-based upsert
    const rowId = row.id as string | undefined
    const existing = rowId ? existingTransactions.find((t) => t.id === rowId) : undefined
    const isUpdate = !!existing

    // Default dateTime
    const dateTime = (row.dateTime as string) || new Date().toISOString()

    const tx: TransactionDto = {
      id: rowId || `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      bookId: rowBookId,
      userId: existing?.userId || "",
      dateTime,
      amount,
      originalCurrency: originalCurrency,
      originalAmount: originalAmount,
      exchangeRate: exchangeRate,
      categoryName: categoryName,
      note: row.note as string | undefined,
      createdAt: existing?.createdAt || new Date().toISOString(),
      isBookClosingEntry: row.isBookClosingEntry as boolean | undefined,
      closedBookId: row.closedBookId as string | undefined,
    }

    return { data: tx, isUpdate }
  }

  private async processCategoryRow(
    row: Record<string, unknown>,
    rowNum: number,
    existingCategories: CategoryDto[],
  ): Promise<{ data?: CategoryDto; issue?: ImportIssue; isUpdate?: boolean }> {
    const name = row.name as string | undefined
    if (!name || typeof name !== "string" || name.trim() === "") {
      return { issue: { row: rowNum, field: "name", message: "Category name is required", severity: "error" } }
    }

    const rowId = row.id as string | undefined
    const existing = rowId ? existingCategories.find((c) => c.id === rowId) : undefined
    const isUpdate = !!existing

    const cat: CategoryDto = {
      id: rowId || `cat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: name.trim(),
      recurring: typeof row.recurring === "boolean" ? row.recurring : false,
      color: row.color as string | undefined,
      icon: row.icon as string | undefined,
      createdAt: existing?.createdAt || new Date().toISOString(),
      order: typeof row.order === "number" ? row.order : undefined,
    }

    return { data: cat, isUpdate }
  }

  private async processBookRow(
    row: Record<string, unknown>,
    rowNum: number,
    existingBooks: BookDto[],
  ): Promise<{ data?: BookDto; issue?: ImportIssue; isUpdate?: boolean }> {
    const name = row.name as string | undefined
    if (!name || typeof name !== "string" || name.trim() === "") {
      return { issue: { row: rowNum, field: "name", message: "Book name is required", severity: "error" } }
    }

    const trimmedName = name.trim()

    // Protect Main book
    if (trimmedName === "Main") {
      return { issue: { row: rowNum, field: "name", message: "Cannot create or modify Main book via import", severity: "error" } }
    }

    const rowId = row.id as string | undefined
    const existing = rowId ? existingBooks.find((b) => b.id === rowId) : undefined
    const isUpdate = !!existing

    const status = (row.status as string) === "closed" ? "closed" : "open"

    const book: BookDto = {
      id: rowId || `book_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: trimmedName,
      currency: row.currency as string | undefined,
      status,
      ownerId: existing?.ownerId || "",
      sharedWith: existing?.sharedWith || [],
      createdAt: existing?.createdAt || new Date().toISOString(),
    }

    return { data: book, isUpdate }
  }

  // ---------------------------------------------------------------------------
  // Clearing helpers
  // ---------------------------------------------------------------------------

  private async doClear(entityType: string, bookId?: string): Promise<number> {
    if (entityType === "transactions" && bookId) {
      const txs = await db.getAllByIndex<TransactionDto>(db.STORES.transactions, "bookId", bookId)
      for (const tx of txs) {
        await db.remove(db.STORES.transactions, tx.id)
      }
      return txs.length
    }
    if (entityType === "transactions") {
      const txs = await db.getAll<TransactionDto>(db.STORES.transactions)
      for (const tx of txs) {
        await db.remove(db.STORES.transactions, tx.id)
      }
      return txs.length
    }
    if (entityType === "categories") {
      const cats = await db.getAll<CategoryDto>(db.STORES.categories)
      for (const cat of cats) {
        await db.remove(db.STORES.categories, cat.id)
      }
      return cats.length
    }
    if (entityType === "books") {
      const books = await db.getAll<BookDto>(db.STORES.books)
      let deletedCount = 0
      for (const book of books) {
        if (book.name !== "Main") {
          await db.remove(db.STORES.books, book.id)
          deletedCount++
        }
      }
      return deletedCount
    }
    return 0
  }

  private async countClearable(entityType: string, bookId?: string): Promise<number> {
    if (entityType === "transactions" && bookId) {
      const txs = await db.getAllByIndex<TransactionDto>(db.STORES.transactions, "bookId", bookId)
      return txs.length
    }
    if (entityType === "transactions") {
      const txs = await db.getAll<TransactionDto>(db.STORES.transactions)
      return txs.length
    }
    if (entityType === "categories") {
      const cats = await db.getAll<CategoryDto>(db.STORES.categories)
      return cats.length
    }
    if (entityType === "books") {
      const books = await db.getAll<BookDto>(db.STORES.books)
      return books.filter((b) => b.name !== "Main").length
    }
    return 0
  }
}
