// ---------------------------------------------------------------------------
// EditBookPage — edit book metadata, view stats, close/reopen/delete
// ---------------------------------------------------------------------------

import { useEffect, useState, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useBooksStore } from "@/store"
import { getFactory } from "@/features/offline"
import type { BookStatsDto } from "@/types"
import { toast } from "sonner"
import { useConfirmDialog } from "@/components/common/dialog/ConfirmDialogContext"
import CloseBookDialog from "./CloseBookDialog"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${amount.toFixed(2)} ${currency || ""}`
  }
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "long",
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function PageSkeleton() {
  return (
    <div className="container mx-auto max-w-lg px-4 py-6 space-y-8">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-16" />
        </div>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-28" />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function EditBookPage() {
  const { bookId } = useParams<{ bookId: string }>()
  const navigate = useNavigate()
  const { confirm } = useConfirmDialog()

  // Store state
  const currentBook = useBooksStore((s) => s.currentBook)
  const isLoadingBook = useBooksStore((s) => s.isLoading)
  const fetchBookError = useBooksStore((s) => s.error)
  const fetchBook = useBooksStore((s) => s.fetchBook)
  const updateBookAction = useBooksStore((s) => s.updateBook)
  const deleteBookAction = useBooksStore((s) => s.deleteBook)
  const reopenBookAction = useBooksStore((s) => s.reopenBook)
  const clearError = useBooksStore((s) => s.clearError)

  // Page-local state
  const [name, setName] = useState("")
  const [currency, setCurrency] = useState("")
  const [stats, setStats] = useState<BookStatsDto | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [closeDialogOpen, setCloseDialogOpen] = useState(false)

  // Track whether form has been initialized from fetched data
  const formInitialized = useRef(false)

  // Fetch book and stats on mount
  useEffect(() => {
    if (!bookId) return
    clearError()
    formInitialized.current = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStatsLoading(true)

    // Fetch book detail and stats in parallel
    const load = async () => {
      await Promise.all([
        fetchBook(bookId).catch(() => {
          // Error is handled by store — nothing else to do
        }),
        getFactory().books.getBookStats(bookId).then(setStats).catch(() => {
          // Stats are non-critical — silently fail
          setStats(null)
        }),
      ])
      setStatsLoading(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId, fetchBook, clearError])

  // Pre-populate form when book data arrives
  useEffect(() => {
    if (currentBook && !formInitialized.current && !isLoadingBook) {
      setName(currentBook.name)
      setCurrency(currentBook.currency ?? "")
      formInitialized.current = true
    }
  }, [currentBook, isLoadingBook])

  // Reset form initialization when bookId changes
  useEffect(() => {
    formInitialized.current = false
  }, [bookId])

  // --- Handlers ---

  const handleCancel = () => {
    navigate("/books")
  }

  const handleSave = async () => {
    if (!bookId) return
    setSaveError(null)
    setIsSaving(true)

    try {
      await updateBookAction(bookId, {
        name: name.trim(),
        currency: currency.trim() || undefined,
      })
      toast.success("Book updated")
      navigate("/books")
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to update book"
      setSaveError(message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleReopen = () => {
    if (!bookId) return

    confirm({
      title: `Reopen "${currentBook?.name}"?`,
      description:
        "Reopening this book will allow adding new transactions to it.",
      confirmText: "Reopen",
      onConfirm: async () => {
        try {
          await reopenBookAction(bookId)
          toast.success(`Book "${currentBook?.name}" reopened`)
        } catch (err: unknown) {
          const message =
            err instanceof Error ? err.message : "Failed to reopen book"
          toast.error(message)
        }
      },
    })
  }

  const handleDelete = () => {
    if (!bookId) return

    confirm({
      title: `Delete "${currentBook?.name}"?`,
      description:
        "This action permanently deletes this book. It cannot be undone.",
      confirmText: "Delete",
      onConfirm: async () => {
        try {
          await deleteBookAction(bookId)
          toast.success(`Book "${currentBook?.name}" deleted`)
          navigate("/books")
        } catch (err: unknown) {
          const message =
            err instanceof Error ? err.message : "Failed to delete book"
          toast.error(message)
        }
      },
    })
  }

  const handleCloseSuccess = () => {
    // Refresh the book detail to reflect the closed status
    if (bookId) {
      fetchBook(bookId)
    }
  }

  // --- Render: loading state ---

  if (isLoadingBook) {
    return <PageSkeleton />
  }

  // --- Render: fetch error (book not found, not visible) ---

  if (fetchBookError && !currentBook) {
    return (
      <div className="container mx-auto max-w-lg px-4 py-6">
        <div className="flex flex-col items-center gap-4 rounded-lg border border-destructive/20 bg-destructive/5 px-6 py-12 text-center">
          <p className="text-lg font-medium text-destructive">
            {fetchBookError}
          </p>
          <p className="text-sm text-muted-foreground">
            The book you are looking for could not be loaded.
          </p>
          <Button variant="outline" onClick={() => navigate("/books")}>
            Back to books
          </Button>
        </div>
      </div>
    )
  }

  if (!currentBook) return null

  // --- Render: form ---

  const isMainBook = currentBook.name === "Main"
  const isOpen = currentBook.status === "open"

  return (
    <div className="container mx-auto max-w-lg px-4 py-6">
      {/* Page header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Edit Book</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      {/* Save error banner */}
      {saveError && (
        <div
          className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
          data-testid="save-error"
        >
          {saveError}
        </div>
      )}

      {/* Name / Currency form */}
      <div className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="book-name">Name</Label>
          <Input
            id="book-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Book name"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="book-currency">Currency</Label>
          <Input
            id="book-currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          />
          <p className="text-sm text-muted-foreground">
            Optional. You can type any ISO currency code.
          </p>
        </div>
      </div>

      {/* Separator */}
      <Separator className="my-8" />

      {/* Statistics */}
      <div className="space-y-3">
        <h2 className="text-lg font-medium">Statistics</h2>
        {statsLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-36" />
          </div>
        ) : (
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Created</dt>
              <dd>{formatDate(currentBook.createdAt)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Transactions</dt>
              <dd>{stats?.transactionCount ?? "\u2014"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Total sum</dt>
              <dd>
                {stats != null
                  ? formatCurrency(stats.totalSum, currentBook.currency ?? "EUR")
                  : "\u2014"}
              </dd>
            </div>
          </dl>
        )}
      </div>

      {/* Separator */}
      <Separator className="my-8" />

      {/* Status section */}
      <div className="space-y-4">
        <h2 className="text-lg font-medium">Status</h2>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant={isOpen ? "default" : "outline"}>
              {isOpen ? "Open" : "Closed"}
            </Badge>
          </div>
          {isOpen ? (
            <Button
              variant="outline"
              onClick={() => setCloseDialogOpen(true)}
              disabled={isMainBook}
              title={
                isMainBook ? "Cannot close the Main book" : undefined
              }
            >
              Close book
            </Button>
          ) : (
            <Button variant="outline" onClick={handleReopen}>
              Reopen book
            </Button>
          )}
        </div>
        {isMainBook && isOpen && (
          <p className="text-xs text-muted-foreground">
            The Main book cannot be closed.
          </p>
        )}
      </div>

      {/* Separator */}
      <Separator className="my-8" />

      {/* Danger zone */}
      <div className="space-y-4">
        <h2 className="text-lg font-medium text-destructive">Danger Zone</h2>
        <p className="text-sm text-muted-foreground">
          Deleting a book is permanent and cannot be undone.
        </p>
        <Button
          variant="destructive"
          onClick={handleDelete}
          disabled={isMainBook}
          title={isMainBook ? "Cannot delete the Main book" : undefined}
        >
          Delete book
        </Button>
        {isMainBook && (
          <p className="text-xs text-muted-foreground">
            The Main book cannot be deleted.
          </p>
        )}
      </div>

      {/* Close book dialog */}
      <CloseBookDialog
        bookId={bookId ?? ""}
        bookName={currentBook.name}
        open={closeDialogOpen}
        onOpenChange={setCloseDialogOpen}
        onSuccess={handleCloseSuccess}
      />
    </div>
  )
}