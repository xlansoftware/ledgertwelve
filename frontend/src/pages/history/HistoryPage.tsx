import { useEffect } from "react";
import { useTransactionsStore, useBooksStore } from "@/store";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { TransactionDto } from "@/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatAmount(amount: number): string {
  const abs = Math.abs(amount);
  const formatted = abs.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return amount < 0 ? `-${formatted}` : `+${formatted}`;
}

// ---------------------------------------------------------------------------
// Transaction Row
// ---------------------------------------------------------------------------

function TransactionRow({
  transaction,
  bookName,
}: {
  transaction: TransactionDto;
  bookName: string;
}) {
  const isExpense = transaction.amount < 0;

  return (
    <Card size="sm" className="border-b last:border-b-0 rounded-none border-x-0 shadow-none">
      <CardContent className="flex items-center gap-3 px-4 py-3">
        {/* Category icon / indicator */}
        <div
          className={`flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
            isExpense
              ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
              : "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
          }`}
        >
          {transaction.categoryName?.charAt(0).toUpperCase() ?? "?"}
        </div>

        {/* Details */}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-medium">
              {transaction.categoryName ?? "Uncategorized"}
            </span>
            <span
              className={`shrink-0 text-sm font-semibold tabular-nums ${
                isExpense
                  ? "text-red-600 dark:text-red-400"
                  : "text-green-600 dark:text-green-400"
              }`}
            >
              {formatAmount(transaction.amount)}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{formatDate(transaction.dateTime)}</span>
            <span className="text-[0.5rem]">·</span>
            <span>{formatTime(transaction.dateTime)}</span>
            {bookName && (
              <>
                <span className="text-[0.5rem]">·</span>
                <span className="truncate">{bookName}</span>
              </>
            )}
          </div>
          {transaction.note && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground/70">
              {transaction.note}
            </p>
          )}
          {transaction.originalCurrency && transaction.originalAmount !== undefined && (
            <p className="text-xs text-muted-foreground/50">
              {formatAmount(transaction.originalAmount)} {transaction.originalCurrency}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

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
  const fetchTransactions = useTransactionsStore((s) => s.fetchTransactions);

  const books = useBooksStore((s) => s.books);
  const fetchBooks = useBooksStore((s) => s.fetchBooks);

  const bookMap = new Map(books.map((b) => [b.id, b.name]));

  useEffect(() => {
    fetchTransactions();
    fetchBooks();
  }, [fetchTransactions, fetchBooks]);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h1 className="text-lg font-semibold">History</h1>
        <span className="text-sm text-muted-foreground">
          {total} transaction{total !== 1 ? "s" : ""}
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
              bookName={bookMap.get(tx.bookId) ?? ""}
            />
          ))}
        </ScrollArea>
      )}
    </div>
  );
}