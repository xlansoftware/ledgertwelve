// ---------------------------------------------------------------------------
// OfflineExportsService — IndexedDB-backed export implementation
//
// Generates files in-memory, stores as blob URLs, and resolves jobs
// immediately to "completed". Supports CSV and JSON natively.
// XLSX falls back to CSV with a note in offline mode.
// ---------------------------------------------------------------------------

import type { ExportJobDto } from "@/types"
import type { IExportsService, CreateExportRequest, CreateExportResponse, ContentType, ExportFormat } from "@/features/offline/interfaces/IExportsService"
import * as db from "./db"
import type { BookDto, CategoryDto, TransactionDto } from "@/types"
import { getFactory } from "@/features/offline/factory"

// ---------------------------------------------------------------------------
// In-memory job store for offline exports
// ---------------------------------------------------------------------------

interface OfflineExportJob {
  id: string
  status: "pending" | "processing" | "completed" | "failed"
  downloadUrl?: string
  errorMessage?: string
  blob?: Blob
  filename: string
  createdAt: string
}

let jobCounter = 0
const jobs = new Map<string, OfflineExportJob>()

const nextJobId = () => `exp_off_${++jobCounter}`

// ---------------------------------------------------------------------------
// CSV generation helpers
// ---------------------------------------------------------------------------

function escapeCsv(value: unknown): string {
  const str = String(value ?? "")
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function toCsvRow(values: unknown[]): string {
  return values.map(escapeCsv).join(",")
}

function generateCategoriesCsv(categories: CategoryDto[]): string {
  const header = toCsvRow(["id", "name", "recurring", "color", "icon"])
  const rows = categories.map((c) =>
    toCsvRow([c.id, c.name, c.recurring ?? false, c.color ?? "", c.icon ?? ""]),
  )
  return [header, ...rows].join("\n")
}

function generateBooksCsv(books: BookDto[], ownerEmails: Map<string, string>): string {
  const header = toCsvRow(["id", "name", "currency", "status", "owner"])
  const rows = books.map((b) =>
    toCsvRow([b.id, b.name, b.currency ?? "", b.status, ownerEmails.get(b.ownerId) ?? b.ownerId]),
  )
  return [header, ...rows].join("\n")
}

function generateTransactionsCsv(
  transactions: TransactionDto[],
  bookNames: Map<string, string>,
  userEmails: Map<string, string>,
): string {
  const header = toCsvRow([
    "id", "book", "user", "dateTime", "amount",
    "originalCurrency", "originalAmount", "exchangeRate",
    "categoryName", "note", "createdAt",
  ])
  const rows = transactions.map((tx) =>
    toCsvRow([
      tx.id,
      bookNames.get(tx.bookId) ?? tx.bookId,
      userEmails.get(tx.userId) ?? tx.userId,
      tx.dateTime,
      tx.amount,
      tx.originalCurrency ?? "",
      tx.originalAmount ?? "",
      tx.exchangeRate ?? "",
      tx.categoryName ?? "",
      tx.note ?? "",
      tx.createdAt,
    ]),
  )
  return [header, ...rows].join("\n")
}

function generateDailyReportCsv(txs: TransactionDto[]): string {
  const groups = new Map<string, number>()
  for (const tx of txs) {
    const key = new Date(tx.dateTime).toISOString().slice(0, 10)
    const current = groups.get(key) || 0
    groups.set(key, current + tx.amount)
  }
  const header = toCsvRow(["date", "amount"])
  const rows = Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, amount]) => toCsvRow([date, Math.round(amount * 100) / 100]))
  return [header, ...rows].join("\n")
}

function generateMonthlyReportCsv(txs: TransactionDto[]): string {
  const groups = new Map<string, number>()
  for (const tx of txs) {
    const d = new Date(tx.dateTime)
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
    const current = groups.get(key) || 0
    groups.set(key, current + tx.amount)
  }
  const header = toCsvRow(["period", "amount"])
  const rows = Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, amount]) => toCsvRow([period, Math.round(amount * 100) / 100]))
  return [header, ...rows].join("\n")
}

function generateYearlyReportCsv(txs: TransactionDto[]): string {
  const groups = new Map<string, number>()
  for (const tx of txs) {
    const key = new Date(tx.dateTime).getUTCFullYear().toString()
    const current = groups.get(key) || 0
    groups.set(key, current + tx.amount)
  }
  const header = toCsvRow(["year", "amount"])
  const rows = Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([year, amount]) => toCsvRow([year, Math.round(amount * 100) / 100]))
  return [header, ...rows].join("\n")
}

function generatePerCategoryReportCsv(txs: TransactionDto[]): string {
  const groups = new Map<string, number>()
  for (const tx of txs) {
    const cat = tx.categoryName || "Uncategorized"
    const current = groups.get(cat) || 0
    groups.set(cat, current + tx.amount)
  }
  const header = toCsvRow(["category", "amount"])
  const rows = Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([cat, amount]) => toCsvRow([cat, Math.round(amount * 100) / 100]))
  return [header, ...rows].join("\n")
}

// ---------------------------------------------------------------------------
// Filename helper
// ---------------------------------------------------------------------------

function getExportFilename(contentType: ContentType, format: ExportFormat, bookName?: string): string {
  const date = new Date().toISOString().slice(0, 10)
  switch (contentType) {
    case "categories":
      return `categories-${date}.${format}`
    case "transactions":
      return `transactions-${bookName || "unknown"}-${date}.${format}`
    case "books":
      return `books-${date}.${format}`
    case "report-daily-total":
      return `report-daily-total-${date}.${format}`
    case "report-daily-per-category":
      return `report-daily-per-category-${date}.${format}`
    case "report-monthly-total":
      return `report-monthly-total-${date}.${format}`
    case "report-monthly-per-category":
      return `report-monthly-per-category-${date}.${format}`
    case "report-yearly-total":
      return `report-yearly-total-${date}.${format}`
    case "report-yearly-per-category":
      return `report-yearly-per-category-${date}.${format}`
    case "backup":
      return `ledger12-backup-${date}.json`
  }
}

// ---------------------------------------------------------------------------
// OfflineExportsService
// ---------------------------------------------------------------------------

export class OfflineExportsService implements IExportsService {
  async createExport(req: CreateExportRequest): Promise<CreateExportResponse> {
    const jobId = nextJobId()
    const { contentType, format, bookId } = req

    // Determine actual format (backup forces JSON)
    const actualFormat: ExportFormat = contentType === "backup" ? "json" : (format ?? "csv")

    // Process the export immediately
    try {
      const blob = await this.generateBlob(contentType, actualFormat, bookId)
      // Resolve book name for human-readable filenames
      let bookName: string | undefined
      if (bookId && actualFormat !== "json") {
        try {
          const book = await getFactory().books.getBook(bookId)
          bookName = book.name
        } catch {
          bookName = bookId
        }
      }
      const filename = getExportFilename(contentType, actualFormat, bookName ?? bookId)
      const downloadUrl = URL.createObjectURL(blob)

      const job: OfflineExportJob = {
        id: jobId,
        status: "completed",
        downloadUrl,
        blob,
        filename,
        createdAt: new Date().toISOString(),
      }
      jobs.set(jobId, job)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Export failed"
      const job: OfflineExportJob = {
        id: jobId,
        status: "failed",
        errorMessage,
        filename: "",
        createdAt: new Date().toISOString(),
      }
      jobs.set(jobId, job)
    }

    return { jobId, status: "pending" }
  }

  async getExportJob(jobId: string): Promise<ExportJobDto> {
    const job = jobs.get(jobId)
    if (!job) {
      throw new Error("Export job not found")
    }

    const dto: ExportJobDto = {
      jobId: job.id,
      status: job.status,
    }

    if (job.status === "completed" && job.downloadUrl) {
      dto.downloadUrl = job.downloadUrl
    }
    if (job.status === "failed" && job.errorMessage) {
      dto.errorMessage = job.errorMessage
    }

    return dto
  }

  async downloadExport(jobId: string): Promise<Blob> {
    const job = jobs.get(jobId)
    if (!job || job.status !== "completed" || !job.blob) {
      throw new Error("Export not ready")
    }
    return job.blob
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async generateBlob(
    contentType: ContentType,
    format: ExportFormat,
    bookId?: string,
  ): Promise<Blob> {
    if (format === "xlsx") {
      // XLSX not supported offline — fall back to CSV
      return this.generateCsvBlob(contentType, bookId)
    }

    if (format === "json") {
      return this.generateJsonBlob(contentType, bookId)
    }

    return this.generateCsvBlob(contentType, bookId)
  }

  private async generateCsvBlob(contentType: ContentType, bookId?: string): Promise<Blob> {
    let csv: string

    // Resolve IDs to display names via the ServiceFactory
    const factory = getFactory()
    const [allBooks, allUsers] = await Promise.all([
      factory.books.getBooks(),
      factory.users.getUsers(),
    ])
    const bookNames = new Map(allBooks.map((b) => [b.id, b.name]))
    const userEmails = new Map(allUsers.map((u) => [u.id, u.email]))

    switch (contentType) {
      case "categories": {
        const cats = await db.getAll<CategoryDto>(db.STORES.categories)
        csv = generateCategoriesCsv(cats)
        break
      }
      case "books": {
        const books = await db.getAll<BookDto>(db.STORES.books)
        csv = generateBooksCsv(books, userEmails)
        break
      }
      case "transactions": {
        if (!bookId) throw new Error("bookId is required for transaction exports")
        const txs = await db.getAllByIndex<TransactionDto>(db.STORES.transactions, "bookId", bookId)
        csv = generateTransactionsCsv(txs, bookNames, userEmails)
        break
      }
      case "backup": {
        // Backup is JSON-only, but generate JSON blob instead
        return this.generateJsonBlob(contentType, bookId)
      }
      case "report-daily-total":
      case "report-daily-per-category": {
        const txs = await this.getBookTransactions(bookId)
        if (contentType === "report-daily-per-category") {
          csv = generatePerCategoryReportCsv(txs)
        } else {
          csv = generateDailyReportCsv(txs)
        }
        break
      }
      case "report-monthly-total":
      case "report-monthly-per-category": {
        const txs = await this.getBookTransactions(bookId)
        if (contentType === "report-monthly-per-category") {
          csv = generatePerCategoryReportCsv(txs)
        } else {
          csv = generateMonthlyReportCsv(txs)
        }
        break
      }
      case "report-yearly-total":
      case "report-yearly-per-category": {
        const txs = await this.getBookTransactions(bookId)
        if (contentType === "report-yearly-per-category") {
          csv = generatePerCategoryReportCsv(txs)
        } else {
          csv = generateYearlyReportCsv(txs)
        }
        break
      }
      default:
        throw new Error(`Unsupported content type: ${contentType}`)
    }

    return new Blob([csv], { type: "text/csv" })
  }

  private async generateJsonBlob(contentType: ContentType, bookId?: string): Promise<Blob> {
    let jsonData: unknown

    if (contentType === "backup") {
      const allBooks = await db.getAll<BookDto>(db.STORES.books)
      const allCategories = await db.getAll<CategoryDto>(db.STORES.categories)
      const allTransactions = await db.getAll<TransactionDto>(db.STORES.transactions)

      jsonData = {
        exportedAt: new Date().toISOString(),
        version: 1,
        books: allBooks,
        categories: allCategories,
        transactions: allTransactions,
      }
    } else if (contentType === "categories") {
      jsonData = await db.getAll<CategoryDto>(db.STORES.categories)
    } else if (contentType === "books") {
      jsonData = await db.getAll<BookDto>(db.STORES.books)
    } else if (contentType === "transactions") {
      if (!bookId) throw new Error("bookId is required for transaction exports")
      jsonData = await db.getAllByIndex<TransactionDto>(db.STORES.transactions, "bookId", bookId)
    } else {
      throw new Error(`JSON not supported for content type: ${contentType}`)
    }

    const jsonStr = JSON.stringify(jsonData, null, 2)
    return new Blob([jsonStr], { type: "application/json" })
  }

  private async getBookTransactions(bookId?: string): Promise<TransactionDto[]> {
    let targetBookId: string

    if (bookId) {
      targetBookId = bookId
    } else {
      const allBooks = await db.getAll<{ id: string; name: string }>(db.STORES.books)
      const mainBook = allBooks.find((b) => b.name === "Main")
      if (!mainBook) {
        throw new Error("Main book not found")
      }
      targetBookId = mainBook.id
    }

    const allTxs = await db.getAllByIndex<TransactionDto>(db.STORES.transactions, "bookId", targetBookId)
    return allTxs.filter((tx) => !tx.isBookClosingEntry)
  }
}
