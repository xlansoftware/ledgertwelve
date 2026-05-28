import { useEffect, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { SkeletonList } from '@/components/ui/skeleton'
import TransactionList from '@/components/transactions/transaction-list'
import TransactionGroupRow from '@/components/transactions/transaction-group-row'
import TransactionRow from '@/components/transactions/transaction-row'
import LoadMoreButton from '@/components/transactions/load-more-button'
import { groupTransactionsByDay } from '@/lib/transaction-utils'
import { useTransactionStore } from '@/store/transactionStore'
import { useCategoryStore } from '@/store/categoryStore'

export default function HistoryPage() {
  const transactions = useTransactionStore((s) => s.transactions)
  const totalCount = useTransactionStore((s) => s.totalCount)
  const page = useTransactionStore((s) => s.page)
  const pageSize = useTransactionStore((s) => s.pageSize)
  const isLoading = useTransactionStore((s) => s.isLoading)
  const error = useTransactionStore((s) => s.error)
  const fetchTransactions = useTransactionStore((s) => s.fetchTransactions)

  const categories = useCategoryStore((s) => s.categories)
  const ensureCategoriesLoaded = useCategoryStore((s) => s.ensureLoaded)

  // Load on mount
  useEffect(() => {
    ensureCategoriesLoaded()
    fetchTransactions()
  }, [ensureCategoriesLoaded, fetchTransactions])

  // Build a lookup map from category name → color
  const categoryColorMap = useMemo(() => {
    const map: Record<string, string | null> = {}
    for (const cat of categories) {
      map[cat.name] = cat.color
    }
    return map
  }, [categories])

  // Group transactions by relative day
  const groupedItems = useMemo(
    () => groupTransactionsByDay(transactions),
    [transactions],
  )

  const hasMore = page * pageSize < totalCount

  const handleLoadMore = useCallback(() => {
    fetchTransactions({ append: true })
  }, [fetchTransactions])

  const handleRetry = useCallback(() => {
    fetchTransactions()
  }, [fetchTransactions])

  // -------------------------------------------------------------------
  // Loading state (no cached data yet)
  // -------------------------------------------------------------------

  if (isLoading && transactions.length === 0) {
    return (
      <div>
        <div className="px-4 py-3 border-b">
          <h1 className="text-lg font-semibold">History</h1>
        </div>
        <SkeletonList count={6} />
      </div>
    )
  }

  // -------------------------------------------------------------------
  // Error state (no cached data)
  // -------------------------------------------------------------------

  if (error && transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-lg font-medium">Something went wrong</p>
        <p className="text-sm text-muted-foreground mt-1">{error}</p>
        <Button variant="outline" className="mt-4" onClick={handleRetry}>
          Retry
        </Button>
      </div>
    )
  }

  // -------------------------------------------------------------------
  // Empty state
  // -------------------------------------------------------------------

  if (!isLoading && totalCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-lg font-medium">No transactions yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Create your first transaction to get started.
        </p>
        <a
          href="/add"
          className="inline-flex shrink-0 items-center justify-center rounded-md border border-transparent bg-clip-padding text-xs/relaxed font-medium whitespace-nowrap transition-all outline-none select-none bg-primary text-primary-foreground hover:bg-primary/80 h-7 gap-1 px-2 mt-4"
        >
          Add Transaction
        </a>
      </div>
    )
  }

  // -------------------------------------------------------------------
  // Main content
  // -------------------------------------------------------------------

  return (
    <div>
      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <h1 className="text-lg font-semibold">History</h1>
        <div className="flex items-center gap-2">
          {/* Search icon — non-functional placeholder */}
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Search"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
              />
            </svg>
          </button>
          {/* Filter icon — non-functional placeholder */}
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Filter"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Error banner (cached data still visible) */}
      {error && transactions.length > 0 && (
        <div className="px-4 py-2 bg-destructive/10 border-b border-destructive/20 flex items-center justify-between">
          <p className="text-sm text-destructive">{error}</p>
          <Button
            variant="outline"
            size="xs"
            onClick={handleRetry}
          >
            Retry
          </Button>
        </div>
      )}

      {/* Transaction list */}
      <TransactionList>
        {groupedItems.map((item) => {
          if (typeof item === 'string') {
            return <TransactionGroupRow key={item} label={item} />
          }

          const categoryColor = categoryColorMap[item.category] ?? null

          return (
            <TransactionRow
              key={item.id}
              transaction={item}
              categoryColor={categoryColor}
            />
          )
        })}
      </TransactionList>

      {/* Load more */}
      <LoadMoreButton
        onClick={handleLoadMore}
        isLoading={isLoading}
        hasMore={hasMore}
      />
    </div>
  )
}
