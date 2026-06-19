import { useEffect, useState } from "react";
import { useTransactionsStore, useBooksStore, useCategoriesStore, useUsersStore } from "@/store";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Loader2, Search } from "lucide-react";
import TransactionRow from "./TransactionRow";
import FilterDialog from "./FilterDialog";

// ---------------------------------------------------------------------------
// Skeleton while loading
// ---------------------------------------------------------------------------

function TransactionSkeleton() {
  return (
    <div className="space-y-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i} size="sm" className="border-b last:border-b-0 rounded-none border-x-0 shadow-none">
          <CardContent className="flex items-center gap-3 px-4 py-3">
            <Skeleton className="size-10 shrink-0 rounded-full" />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-2/3" />
            </div>
            <Skeleton className="h-4 w-16 shrink-0" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function HistoryPage() {
  const transactions = useTransactionsStore((s) => s.transactions);
  const isLoading = useTransactionsStore((s) => s.isLoading);
  const error = useTransactionsStore((s) => s.error);
  const total = useTransactionsStore((s) => s.total);
  const hasMore = useTransactionsStore((s) => s.hasMore);
  const isLoadingMore = useTransactionsStore((s) => s.isLoadingMore);
  const loadMoreError = useTransactionsStore((s) => s.loadMoreError);
  const currentFilter = useTransactionsStore((s) => s.currentFilter);
  const loadMore = useTransactionsStore((s) => s.loadMore);
  const setFilter = useTransactionsStore((s) => s.setFilter);
  const clearFilter = useTransactionsStore((s) => s.clearFilter);

  const currentBook = useBooksStore((s) => s.currentBook);
  const categories = useCategoriesStore((s) => s.categories);
  const fetchCategories = useCategoriesStore((s) => s.fetchCategories);
  const users = useUsersStore((s) => s.users);
  const fetchUsers = useUsersStore((s) => s.fetchUsers);

  const [filterOpen, setFilterOpen] = useState(false);

  const hasActiveFilter = Object.keys(currentFilter).length > 0;

  // Fetch data on mount and when book changes
  useEffect(() => {
    clearFilter(currentBook?.id);
    fetchCategories();
    fetchUsers();
  }, [currentBook, clearFilter, fetchCategories, fetchUsers]);

  // Extract user emails for the Filter component
  const userEmails = users.map((u) => u.email);

  const showLoadMore =
    !isLoading &&
    !error &&
    transactions.length > 0;

  const handleClearFilter = () => {
    clearFilter(currentBook?.id);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setFilterOpen(true)}
          className="gap-1.5"
        >
          <Search className="size-4" />
          Filter
        </Button>

        <span
          className="text-sm text-muted-foreground cursor-pointer"
          onClick={hasActiveFilter ? handleClearFilter : undefined}
          title={hasActiveFilter ? "Clear filter" : undefined}
          data-testid="transaction-count"
        >
          {total} transaction{total !== 1 ? "s" : ""}
          {hasActiveFilter && ", filtered"}
        </span>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-4 mt-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && transactions.length === 0 && (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 text-center">
          <p className="text-lg font-medium text-muted-foreground">No transactions yet</p>
          <p className="max-w-xs text-sm text-muted-foreground/70">
            Transactions you add will appear here.
          </p>
        </div>
      )}

      {/* Transaction list */}
      {isLoading ? (
        <div className="px-2 py-2">
          <TransactionSkeleton />
        </div>
      ) : (
        <ScrollArea className="flex-1 px-2 py-2">
          {transactions.map((tx) => (
            <TransactionRow
              key={tx.id}
              transaction={tx}
            />
          ))}

          {/* Load-more area */}
          {showLoadMore && (
            <div className="flex items-center justify-center py-6" data-testid="load-more-area">
              {!hasMore ? (
                <span className="text-sm text-muted-foreground">
                  All {total} transaction{total !== 1 ? "s" : ""} loaded
                </span>
              ) : loadMoreError ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadMore}
                  data-testid="load-more-retry"
                >
                  Failed to load. Retry?
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isLoadingMore}
                  onClick={loadMore}
                  data-testid="load-more-button"
                >
                  {isLoadingMore ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      Loading…
                    </>
                  ) : (
                    "Show more…"
                  )}
                </Button>
              )}
            </div>
          )}
        </ScrollArea>
      )}

      {/* Filter dialog */}
      <FilterDialog
        open={filterOpen}
        onOpenChange={setFilterOpen}
        categories={categories}
        users={userEmails}
        filter={currentFilter}
        onApply={setFilter}
      />
    </div>
  );
}