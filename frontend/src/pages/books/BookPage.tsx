import { useEffect } from "react";
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

  useEffect(() => {
    if (books.length === 0) {
      fetchBooks();
    }
  }, [fetchBooks, books.length]);

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
  return (
    <div className="max-w-2xl mx-auto px-4">
      <h1 className="text-2xl font-bold mb-6">Books</h1>

      <div className="space-y-3">
        {books.map((book) => {
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
                <Button
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  onClick={() => fetchBook(book.id)}
                  disabled={isSelected}
                >
                  {isSelected ? "Current book" : "Select"}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

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