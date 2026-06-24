// ---------------------------------------------------------------------------
// PreviewPage — step 3 of the import workflow
// Shows preview results, issue list, confirm import button, and completion state.
// ---------------------------------------------------------------------------

import { useEffect, useState, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { useImportStore } from "@/store/useImportStore"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  RefreshCw,
  FileText,
  Home,
  Upload,
} from "lucide-react"
import { getFactory } from "@/features/offline"
import type { ImportRequest, ImportResult, ImportIssue } from "@/types"

// ---------------------------------------------------------------------------
// IssueBadge — shows severity icon
// ---------------------------------------------------------------------------

function IssueBadge({ severity }: { severity: "error" | "warning" }) {
  if (severity === "error") {
    return <XCircle className="size-4 shrink-0 text-destructive" />
  }
  return <AlertTriangle className="size-4 shrink-0 text-amber-500" />
}

// ---------------------------------------------------------------------------
// PreviewPage component
// ---------------------------------------------------------------------------

export default function PreviewPage() {
  const navigate = useNavigate()
  const store = useImportStore()
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [importCompleted, setImportCompleted] = useState(false)

  const entityType = store.entityType
  const fileInfo = store.fileInfo

  // Run preview on mount
  useEffect(() => {
    if (!entityType || (!fileInfo && entityType !== "backup")) {
      navigate("/import", { replace: true })
      return
    }

    if (store.importResult) {
      // Already have preview results
      return
    }

    const runPreview = async () => {
      setIsLoadingPreview(true)
      store.setError(null)

      try {
        const req: ImportRequest = {
          preview: true,
          entityType,
          ...(entityType !== "backup" ? { bookId: store.bookId ?? undefined } : {}),
          clearExisting: store.clearExisting,
          ...(entityType !== "backup" ? { mapping: store.mapping, rows: store.convertedRows } : {}),
          ...(entityType === "backup" && store.backupData ? { data: store.backupData } : {}),
        }

        const result = await getFactory().imports.importData(req)
        store.setImportResult(result)
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to preview import"
        store.setError(message)
      } finally {
        setIsLoadingPreview(false)
      }
    }

    runPreview()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Run once on mount

  // ---------------------------------------------------------------------------
  // Import handler
  // ---------------------------------------------------------------------------

  const doImport = useCallback(async () => {
    setIsImporting(true)
    setImportError(null)
    store.setStep("importing")

    try {
      const req: ImportRequest = {
        preview: false,
        entityType: entityType!,
        ...(entityType !== "backup" ? { bookId: store.bookId ?? undefined } : {}),
        clearExisting: store.clearExisting,
        ...(entityType !== "backup" ? { mapping: store.mapping, rows: store.convertedRows } : {}),
        ...(entityType === "backup" && store.backupData ? { data: store.backupData } : {}),
      }

      const result = await getFactory().imports.importData(req)
      store.setImportResult(result)
      store.setStep("complete")
      setImportCompleted(true)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to import data"
      setImportError(message)
      store.setStep("preview")
    } finally {
      setIsImporting(false)
    }
  }, [entityType, store])

  const handleImport = useCallback(async () => {
    if (store.clearExisting) {
      setShowClearConfirm(true)
      return
    }
    await doImport()
  }, [doImport, store.clearExisting])

  const handleConfirmClear = useCallback(async () => {
    setShowClearConfirm(false)
    await doImport()
  }, [doImport])

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------

  if (isLoadingPreview) {
    return (
      <div className="mx-auto max-w-xl px-4 py-8">
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
          <p className="mt-4 text-sm text-muted-foreground">Analyzing file...</p>
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Error state (preview failed)
  // ---------------------------------------------------------------------------

  if (store.error && !store.importResult) {
    return (
      <div className="mx-auto max-w-xl px-4 py-8">
        <div className="flex flex-col items-center justify-center py-16">
          <XCircle className="size-8 text-destructive" />
          <p className="mt-4 text-sm text-destructive">{store.error}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => navigate("/import/mapping")}
          >
            Back to Mapping
          </Button>
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Completion state
  // ---------------------------------------------------------------------------

  if (importCompleted) {
    return renderCompletion(store.importResult)
  }

  // ---------------------------------------------------------------------------
  // Preview state
  // ---------------------------------------------------------------------------

  const result = store.importResult

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">
        {importCompleted ? "Import Complete" : "Preview"}
      </h1>

      {/* Summary counts */}
      {result && (
        <div className="space-y-6">
          {/* Single entity type summary */}
          {entityType !== "backup" && (
            <PreviewSummary
              created={result.created ?? 0}
              updated={result.updated ?? 0}
              deleted={result.deleted ?? 0}
              errors={result.errors ?? 0}
              warnings={result.warnings ?? 0}
            />
          )}

          {/* Backup nested summary */}
          {entityType === "backup" && result.books && result.categories && result.transactions && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Books</CardTitle>
                </CardHeader>
                <CardContent>
                  <PreviewSummary {...result.books} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Categories</CardTitle>
                </CardHeader>
                <CardContent>
                  <PreviewSummary {...result.categories} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                  <PreviewSummary {...result.transactions} />
                </CardContent>
              </Card>
            </div>
          )}

          {/* Issues list */}
          {renderIssues(result)}

          {/* Import error */}
          {importError && (
            <div className="rounded-none border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {importError}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/import/mapping")}
            >
              <ArrowLeft className="size-3.5" />
              Back to Mapping
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Re-fetch preview
                  store.setImportResult(null)
                  window.location.reload()
                }}
              >
                <RefreshCw className="size-3.5" />
                Refresh
              </Button>
              <Button
                size="sm"
                onClick={handleImport}
                disabled={isImporting}
              >
                {isImporting ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Importing...
                  </>
                ) : (
                  "Confirm Import"
                )}
              </Button>
            </div>
          </div>

          {/* Clear existing confirmation dialog */}
          <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear Existing Data?</AlertDialogTitle>
                <AlertDialogDescription>
                  {entityType === "transactions" &&
                    "This will delete ALL transactions in the selected book before importing. This action cannot be undone."}
                  {entityType === "categories" &&
                    "This will delete ALL user categories before importing. This action cannot be undone."}
                  {entityType === "books" &&
                    "This will delete ALL books (except Main) before importing. This action cannot be undone."}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmClear}>
                  Clear & Import
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      {!result && !store.error && (
        <div className="flex items-center justify-center py-16">
          <p className="text-sm text-muted-foreground">No preview data available.</p>
        </div>
      )}
    </div>
  )

  // ---------------------------------------------------------------------------
  // DONE: Completion state
  // ---------------------------------------------------------------------------

  function renderCompletion(result: ImportResult | null) {
    const hasErrors = result && (
      entityType !== "backup"
        ? (result.errors ?? 0) > 0
        : (result.transactions?.errors ?? 0) > 0
    )

    return (
      <div className="mx-auto max-w-xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold">Import Complete</h1>

        <div className="flex flex-col items-center justify-center py-8">
          {hasErrors ? (
            <AlertTriangle className="size-12 text-amber-500" />
          ) : (
            <CheckCircle2 className="size-12 text-green-500" />
          )}
          <p className="mt-4 text-lg font-medium">
            {hasErrors
              ? "Import completed with some errors"
              : "Import completed successfully"}
          </p>
        </div>

        {/* Final counts */}
        {result && (
          <div className="space-y-6">
            {entityType !== "backup" && (
              <PreviewSummary
                created={result.created ?? 0}
                updated={result.updated ?? 0}
                deleted={result.deleted ?? 0}
                errors={result.errors ?? 0}
                warnings={result.warnings ?? 0}
              />
            )}

            {entityType === "backup" && result.books && result.categories && result.transactions && (
              <div className="space-y-4">
                <Card>
                  <CardHeader><CardTitle>Books</CardTitle></CardHeader>
                  <CardContent><PreviewSummary {...result.books} /></CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle>Categories</CardTitle></CardHeader>
                  <CardContent><PreviewSummary {...result.categories} /></CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle>Transactions</CardTitle></CardHeader>
                  <CardContent><PreviewSummary {...result.transactions} /></CardContent>
                </Card>
              </div>
            )}

            {/* Issues list */}
            {renderIssues(result)}

            {/* Navigation links */}
            <div className="flex flex-wrap gap-3 pt-4">
              <Button variant="outline" size="sm" onClick={() => navigate("/history")}>
                <FileText className="size-3.5" />
                Go to History
              </Button>
              <Button variant="outline" size="sm" onClick={() => {
                store.reset()
                navigate("/import")
              }}>
                <Upload className="size-3.5" />
                Import More
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate("/settings")}>
                <Home className="size-3.5" />
                Back to Settings
              </Button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Helper: render issues list
  // ---------------------------------------------------------------------------

  function renderIssues(result: ImportResult) {
    const issues: ImportIssue[] = []

    if (entityType !== "backup" && result.issues) {
      issues.push(...result.issues)
    }

    if (entityType === "backup") {
      if (result.books?.issues) issues.push(...result.books.issues)
      if (result.categories?.issues) issues.push(...result.categories.issues)
      if (result.transactions?.issues) issues.push(...result.transactions.issues)
    }

    if (issues.length === 0) return null

    return (
      <Card>
        <CardHeader>
          <CardTitle>Issues</CardTitle>
          <CardDescription>
            {issues.filter((i) => i.severity === "error").length} errors,{" "}
            {issues.filter((i) => i.severity === "warning").length} warnings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {issues.map((issue, idx) => (
              <div
                key={idx}
                className={`flex items-start gap-2 rounded-none p-2 text-sm ${
                  issue.severity === "error"
                    ? "bg-destructive/5"
                    : "bg-amber-500/5"
                }`}
              >
                <IssueBadge severity={issue.severity} />
                <div className="flex-1">
                  <span>
                    {issue.row !== null && `Row ${issue.row}: `}
                    {issue.message}
                  </span>
                  {issue.field && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      (field: {issue.field})
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }
}

// ---------------------------------------------------------------------------
// PreviewSummary — count display
// ---------------------------------------------------------------------------

function PreviewSummary({
  created,
  updated,
  deleted,
  errors,
  warnings,
}: {
  created: number
  updated: number
  deleted: number
  errors: number
  warnings: number
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Results</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
          <div className="rounded-none bg-muted p-3 text-center">
            <dt className="text-xs text-muted-foreground uppercase tracking-wider">
              Created
            </dt>
            <dd className="mt-1 text-lg font-semibold text-green-600 dark:text-green-400">
              {created}
            </dd>
          </div>
          <div className="rounded-none bg-muted p-3 text-center">
            <dt className="text-xs text-muted-foreground uppercase tracking-wider">
              Updated
            </dt>
            <dd className="mt-1 text-lg font-semibold text-blue-600 dark:text-blue-400">
              {updated}
            </dd>
          </div>
          <div className="rounded-none bg-muted p-3 text-center">
            <dt className="text-xs text-muted-foreground uppercase tracking-wider">
              Deleted
            </dt>
            <dd className="mt-1 text-lg font-semibold text-orange-600 dark:text-orange-400">
              {deleted}
            </dd>
          </div>
          <div className="rounded-none bg-muted p-3 text-center">
            <dt className="text-xs text-muted-foreground uppercase tracking-wider">
              Errors
            </dt>
            <dd className="mt-1 text-lg font-semibold text-destructive">
              {errors}
            </dd>
          </div>
          <div className="rounded-none bg-muted p-3 text-center">
            <dt className="text-xs text-muted-foreground uppercase tracking-wider">
              Warnings
            </dt>
            <dd className="mt-1 text-lg font-semibold text-amber-600 dark:text-amber-400">
              {warnings}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  )
}
