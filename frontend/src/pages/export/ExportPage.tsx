// ---------------------------------------------------------------------------
// ExportPage — export data page at /export
// Supports /export?preset=backup for direct backup mode
// ---------------------------------------------------------------------------

import { useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import { useExport } from "./useExport"
import { ExportProgress } from "./components/ExportProgress"
import { useBooksStore } from "@/store"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { ExportFormat, ContentType } from "@/features/offline/interfaces/IExportsService"

const FORMATS: { value: ExportFormat; label: string }[] = [
  { value: "csv", label: "CSV" },
  { value: "xlsx", label: "XLSX" },
  { value: "json", label: "JSON" },
]

export default function ExportPage() {
  const [searchParams] = useSearchParams()
  const preset = searchParams.get("preset")

  const {
    form,
    job,
    isBackup,
    setFormat,
    setContentType,
    setBookId,
    setReportPeriod,
    setReportGroupBy,
    startExport,
    download,
    reset,
  } = useExport()

  const books = useBooksStore((s) => s.books)
  const currentBook = useBooksStore((s) => s.currentBook)
  const fetchBooks = useBooksStore((s) => s.fetchBooks)

  // Load books on mount
  useEffect(() => {
    if (books.length === 0) {
      fetchBooks()
    }
  }, [books.length, fetchBooks])

  // Handle backup preset from query params
  useEffect(() => {
    if (preset === "backup") {
      setContentType("backup")
    }
  }, [preset, setContentType])

  // Default bookId to current book for transaction exports
  useEffect(() => {
    if (currentBook && form.contentType === "transactions" && !form.bookId) {
      setBookId(currentBook.id)
    }
  }, [currentBook, form.contentType, form.bookId, setBookId])

  const isReport = form.contentType?.startsWith("report-") ?? false
  const showFormatSelector = !isBackup
  const showBookPicker = form.contentType === "transactions"
  const showReportOptions = isReport
  const showForm = job.status === "idle"

  const contentTypeBase = isReport ? "report" : form.contentType

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">
        {isBackup ? "Backup Your Data" : "Export Data"}
      </h1>

      {showForm ? (
        <div className="space-y-6">
          {/* Content Type Selection */}
          <Card>
            <CardHeader>
              <CardTitle>What to export</CardTitle>
              <CardDescription>
                {isBackup
                  ? "All books, categories, and transactions will be exported as a single JSON file."
                  : "Select the type of data you want to export."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isBackup ? (
                <p className="text-sm text-muted-foreground">
                  Full backup — all books, categories, and transactions as JSON.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={contentTypeBase === "categories" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setContentType("categories")}
                  >
                    Categories
                  </Button>
                  <Button
                    variant={contentTypeBase === "transactions" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setContentType("transactions")}
                  >
                    Transactions
                  </Button>
                  <Button
                    variant={contentTypeBase === "books" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setContentType("books")}
                  >
                    Books
                  </Button>
                  <Button
                    variant={contentTypeBase === "report" ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setContentType("report-daily-total")
                    }}
                  >
                    Reports
                  </Button>
                  <Button
                    variant={contentTypeBase === "backup" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setContentType("backup")}
                  >
                    Backup
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Format selector (hidden for backup) */}
          {showFormatSelector && (
            <Card>
              <CardHeader>
                <CardTitle>Format</CardTitle>
                <CardDescription>Choose the output format.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {FORMATS.map((f) => (
                    <Button
                      key={f.value}
                      variant={form.format === f.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFormat(f.value)}
                    >
                      {f.label}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Book picker (shown only for transactions) */}
          {showBookPicker && (
            <Card>
              <CardHeader>
                <CardTitle>Book</CardTitle>
                <CardDescription>Select which book to export transactions from.</CardDescription>
              </CardHeader>
              <CardContent>
                <Select
                  value={form.bookId ?? ""}
                  onValueChange={(val) => setBookId(val)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a book…" />
                  </SelectTrigger>
                  <SelectContent>
                    {books.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          )}

          {/* Report sub-options (shown only for reports) */}
          {showReportOptions && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Period</CardTitle>
                  <CardDescription>Select the reporting period.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={form.reportPeriod === "daily" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setReportPeriod("daily")}
                    >
                      Daily
                    </Button>
                    <Button
                      variant={form.reportPeriod === "monthly" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setReportPeriod("monthly")}
                    >
                      Monthly
                    </Button>
                    <Button
                      variant={form.reportPeriod === "yearly" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setReportPeriod("yearly")}
                    >
                      Yearly
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Group By</CardTitle>
                  <CardDescription>How to group the report data.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={form.reportGroupBy === "total" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setReportGroupBy("total")}
                    >
                      Total
                    </Button>
                    <Button
                      variant={form.reportGroupBy === "per-category" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setReportGroupBy("per-category")}
                    >
                      Per Category
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Export button */}
          <Button
            className="w-full"
            size="lg"
            disabled={!form.contentType}
            onClick={startExport}
          >
            {isBackup ? "Start Backup" : "Export"}
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary of what was exported */}
          <Card>
            <CardHeader>
              <CardTitle>Export Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Content</dt>
                  <dd>{contentTypeLabel(form.contentType)}</dd>
                </div>
                {!isBackup && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Format</dt>
                    <dd className="uppercase">{form.format}</dd>
                  </div>
                )}
                {showBookPicker && form.bookId && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Book</dt>
                    <dd>{books.find((b) => b.id === form.bookId)?.name ?? form.bookId}</dd>
                  </div>
                )}
                {isReport && (
                  <>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Period</dt>
                      <dd className="capitalize">{form.reportPeriod}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Group By</dt>
                      <dd>{form.reportGroupBy === "total" ? "Total" : "Per Category"}</dd>
                    </div>
                  </>
                )}
              </dl>
            </CardContent>
          </Card>

          {/* Progress */}
          <ExportProgress
            status={job.status}
            errorMessage={job.errorMessage}
            onDownload={download}
            onReset={reset}
          />
        </div>
      )}
    </div>
  )
}

function contentTypeLabel(contentType: ContentType | null): string {
  if (!contentType) return "—"
  const map: Record<string, string> = {
    categories: "Categories",
    transactions: "Transactions",
    books: "Books",
    backup: "Full Backup",
    "report-daily-total": "Daily Report (Total)",
    "report-daily-per-category": "Daily Report (Per Category)",
    "report-monthly-total": "Monthly Report (Total)",
    "report-monthly-per-category": "Monthly Report (Per Category)",
    "report-yearly-total": "Yearly Report (Total)",
    "report-yearly-per-category": "Yearly Report (Per Category)",
  }
  return map[contentType] ?? contentType
}
