import { useNavigate } from "react-router-dom";
import { useBooksStore } from "@/store";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useClosedBookBalances } from "@/features/books/hooks/useClosedBookBalances";
import { formatCurrency } from "@/lib/utils";

export default function BookPage() {
  const navigate = useNavigate();
  const {
    books,
    currentBook,
    isLoading,
    error,
    fetchBooks,
    fetchBook,
  } = useBooksStore();

  const { balances, isLoading: isBalancesLoading } = useClosedBookBalances(books);

  // --- Loading state (no cached data) ---
  if (isLoading && books.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4">
        <h1 className="text-2xl font-bold mb-6">Books</h1>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-20 mt-1" />
              </CardHeader>
              <CardFooter>
                <Skeleton className="h-9 w-20" />
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // --- Error state (no cached data) ---
  if (error && books.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <p className="text-destructive text-sm mb-4">{error}</p>
        <Button variant="outline" onClick={() => fetchBooks()}>
          Retry
        </Button>
      </div>
    );
  }

  // --- Empty state ---
  if (!isLoading && books.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4">
        <h1 className="text-2xl font-bold mb-6">Books</h1>
        <p className="text-muted-foreground text-sm mb-4">
          No books found. Create a book to get started.
        </p>
        <Button variant="outline" onClick={() => navigate("/books/new")}>
          New book
        </Button>
      </div>
    );
  }

  // --- Books list ---
  const openBooks = books.filter((b) => b.status === "open");
  const closedBooks = books.filter((b) => b.status === "closed");

  // Sort closed books by closedAt descending
  const sortedClosedBooks = [...closedBooks].sort((a, b) => {
    const aTime = a.closedAt ? new Date(a.closedAt).getTime() : 0;
    const bTime = b.closedAt ? new Date(b.closedAt).getTime() : 0;
    return bTime - aTime;
  });

  const showSeparator = openBooks.length > 0 && closedBooks.length > 0;

  return (
    <div className="max-w-2xl mx-auto px-4">
      <h1 className="text-2xl font-bold mb-6">Books</h1>

      {/* Open books section */}
      {openBooks.length > 0 && (
        <div className="space-y-3">
          {openBooks.map((book) => {
            const isSelected = currentBook?.id === book.id;

            return (
              <Card
                key={book.id}
                className={
                  isSelected
                    ? "ring-2 ring-primary transition-all"
                    : "transition-all hover:ring-1 hover:ring-foreground/10"
                }
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {book.name}
                    {book.status === "closed" && (
                      <Badge variant="outline">Closed</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {book.currency ?? "\u2014"}
                  </CardDescription>
                </CardHeader>

                <CardFooter>
                  <div className="flex gap-2">
                    <Button
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      onClick={() => fetchBook(book.id)}
                      disabled={isSelected}
                    >
                      {isSelected ? "Current book" : "Select"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/edit-book/${book.id}`)}
                    >
                      Edit
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Separator between sections */}
      {showSeparator && <Separator className="my-6" />}

      {/* Closed books section */}
      {sortedClosedBooks.length > 0 && (
        <div className="space-y-2">
          {sortedClosedBooks.map((book) => {
            const balance = balances[book.id];
            const balanceDisplay =
              balance !== undefined && balance !== null && !isBalancesLoading
                ? formatCurrency(balance)
                : "\u2014";

            return (
              <Card key={book.id} className="py-2 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-medium truncate">
                      {book.name}
                    </span>
                    <Badge variant="outline" className="shrink-0 text-xs">
                      Closed
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm tabular-nums text-muted-foreground">
                      {balanceDisplay}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/edit-book/${book.id}`)}
                    >
                      Edit
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <div className="mt-6">
        <Button variant="outline" onClick={() => navigate("/books/new")}>
          New book
        </Button>
      </div>

      {error && (
        <p className="text-destructive text-xs mt-4">{error}</p>
      )}
    </div>
  );
}
