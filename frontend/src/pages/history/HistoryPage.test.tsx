// ---------------------------------------------------------------------------
// Component tests — HistoryPage (load-more paging)
// ---------------------------------------------------------------------------

import { act, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { server } from "@/test-setup";
import HistoryPage from "./HistoryPage";
import { useBooksStore } from "@/store";
import { useTransactionsStore } from "@/store/useTransactionsStore";
import type { FilterRequest } from "@/types";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function setCurrentBook() {
  useBooksStore.setState({
    currentBook: {
      id: "book_main",
      name: "Main",
      currency: "EUR",
      status: "open",
      ownerId: "usr_1",
      sharedWith: [],
      createdAt: "2026-01-01T10:00:00Z",
    },
  });
}

let txCounter = 0;

function makeTransactionDto(id: string) {
  txCounter++;
  // Use a counter-based approach for dates to avoid NaN from complex ids
  const day = (txCounter % 28) + 1;
  const dayStr = String(day).padStart(2, "0");
  return {
    id,
    bookId: "book_main",
    userId: "usr_1",
    dateTime: `2026-06-${dayStr}T12:00:00Z`,
    amount: -50,
    createdAt: `2026-06-${dayStr}T12:00:00Z`,
  };
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  // Reset store to defaults
  useTransactionsStore.setState({
    transactions: [],
    currentTransaction: null,
    isLoading: false,
    error: null,
    page: 1,
    pageSize: 50,
    total: 0,
    hasMore: false,
    isLoadingMore: false,
    epoch: 0,
    loadMoreError: null,
    lastParams: {},
    currentFilter: {},
  });
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("HistoryPage", () => {
  it("shows transactions once loaded", async () => {
    setCurrentBook();
    render(<MemoryRouter><HistoryPage /></MemoryRouter>);

    // Wait for transactions to appear
    await waitFor(() => {
      expect(screen.getByText(/transaction/i)).toBeInTheDocument();
    });

    // Transaction count should be shown
    expect(screen.getByText(/transactions?$/)).toBeInTheDocument();

    // At least one transaction row should render
    const items = screen.getAllByTestId(/^Item:/);
    expect(items.length).toBeGreaterThan(0);
  });

  it("shows the transaction count in the header", async () => {
    setCurrentBook();
    render(<MemoryRouter><HistoryPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText(/\d+ transaction/)).toBeInTheDocument();
    });
  });

  it('shows "Show more…" button when hasMore is true', async () => {
    setCurrentBook();
    render(<MemoryRouter><HistoryPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByTestId("load-more-button")).toBeInTheDocument();
    });

    expect(screen.getByTestId("load-more-button")).toHaveTextContent("Show more…");
  });

  it("clicking Show more appends new transactions", async () => {
    setCurrentBook();
    render(<MemoryRouter><HistoryPage /></MemoryRouter>);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId("load-more-button")).toBeInTheDocument();
    });

    const initialCount = screen.getAllByTestId(/^Item:/).length;

    // Click Show more
    fireEvent.click(screen.getByTestId("load-more-button"));

    // Wait for new items to appear
    await waitFor(() => {
      const items = screen.getAllByTestId(/^Item:/);
      expect(items.length).toBeGreaterThan(initialCount);
    });
  });

  it('shows "Loading…" on button while loadMore is in progress', async () => {
    // Hold the response so we can check the loading state
    let resolveResponse!: (v: unknown) => void;
    const responsePromise = new Promise((resolve) => {
      resolveResponse = resolve;
    });

    server.use(
      http.get("/api/v1/transactions", ({ request }) => {
        const url = new URL(request.url);
        const page = parseInt(url.searchParams.get("page") || "1", 10);

        if (page === 1) {
          // First page — normal response
          const items = Array.from({ length: 50 }, (_, i) =>
            makeTransactionDto(`tx_first_${i + 1}`)
          );
          return HttpResponse.json({
            data: items,
            meta: { page: 1, pageSize: 50, total: 100 },
          });
        }

        // Stalled response for page 2+
        return responsePromise.then(() => {
          const items = Array.from({ length: 50 }, (_, i) =>
            makeTransactionDto(`tx_page${page}_${i + 1}`)
          );
          return HttpResponse.json({
            data: items,
            meta: { page, pageSize: 50, total: 100 },
          });
        }) as Promise<Response>;
      })
    );

    setCurrentBook();
    render(<MemoryRouter><HistoryPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByTestId("load-more-button")).toBeInTheDocument();
    });

    // Click load more — should show loading state
    fireEvent.click(screen.getByTestId("load-more-button"));

    await waitFor(() => {
      const btn = screen.getByTestId("load-more-button");
      expect(btn).toBeDisabled();
      expect(btn).toHaveTextContent("Loading…");
    });

    // Resolve the stalled request
    resolveResponse(undefined);

    // Wait for the all-loaded message since we exhausted the 100 items
    await waitFor(() => {
      expect(screen.getByText(/All 100 transactions loaded/)).toBeInTheDocument();
    });

    expect(screen.queryByTestId("load-more-button")).not.toBeInTheDocument();
  });

  it('shows "All N transactions loaded" when hasMore is false', async () => {
    // Override handler to return a single page with all items
    server.use(
      http.get("/api/v1/transactions", () => {
        const items = Array.from({ length: 3 }, (_, i) =>
          makeTransactionDto(`tx_exhausted_${i + 1}`)
        );
        return HttpResponse.json({
          data: items,
          meta: { page: 1, pageSize: 50, total: 3 },
        });
      })
    );

    setCurrentBook();
    render(<MemoryRouter><HistoryPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText(/All 3 transactions loaded/)).toBeInTheDocument();
    });

    expect(screen.queryByTestId("load-more-button")).not.toBeInTheDocument();
  });

  it('shows "Failed to load. Retry?" on loadMore failure', async () => {
    // First page succeeds
    let shouldFail = false;

    server.use(
      http.get("/api/v1/transactions", ({ request }) => {
        const url = new URL(request.url);
        const page = parseInt(url.searchParams.get("page") || "1", 10);

        if (page === 1) {
          const items = Array.from({ length: 50 }, (_, i) =>
            makeTransactionDto(`tx_fail_${i + 1}`)
          );
          return HttpResponse.json({
            data: items,
            meta: { page: 1, pageSize: 50, total: 100 },
          });
        }

        if (shouldFail) {
          return HttpResponse.json({ error: "Server error" }, { status: 500 });
        }

        const items = Array.from({ length: 50 }, (_, i) =>
          makeTransactionDto(`tx_fail_p${page}_${i + 1}`)
        );
        return HttpResponse.json({
          data: items,
          meta: { page, pageSize: 50, total: 100 },
        });
      })
    );

    setCurrentBook();
    render(<MemoryRouter><HistoryPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByTestId("load-more-button")).toBeInTheDocument();
    });

    // Make the next request fail
    shouldFail = true;

    // Click Show more
    fireEvent.click(screen.getByTestId("load-more-button"));

    // Wait for retry button
    await waitFor(() => {
      expect(screen.getByTestId("load-more-retry")).toBeInTheDocument();
    });

    expect(screen.getByTestId("load-more-retry")).toHaveTextContent(
      "Failed to load. Retry?"
    );

    // Existing transactions should still be visible
    const items = screen.getAllByTestId(/^Item:/);
    expect(items.length).toBe(50);

    // Make the next request succeed and retry
    shouldFail = false;
    fireEvent.click(screen.getByTestId("load-more-retry"));

    await waitFor(() => {
      const itemsAfter = screen.getAllByTestId(/^Item:/);
      expect(itemsAfter.length).toBeGreaterThan(50);
    });
  });

  // ---- Filter tests ----

  it("shows a Filter button with magnifying glass icon in the header", async () => {
    setCurrentBook();
    render(<MemoryRouter><HistoryPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText("Filter")).toBeInTheDocument();
    });

    const filterButton = screen.getByText("Filter").closest("button");
    expect(filterButton).toBeInTheDocument();
  });

  it("shows transaction count in the header", async () => {
    setCurrentBook();
    render(<MemoryRouter><HistoryPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByTestId("transaction-count")).toBeInTheDocument();
    });

    expect(screen.getByTestId("transaction-count")).toHaveTextContent(/\d+ transaction/);
  });

  it("shows 'filtered' suffix when a filter is active", async () => {
    setCurrentBook();
    render(<MemoryRouter><HistoryPage /></MemoryRouter>);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId("transaction-count")).toBeInTheDocument();
    });

    // Simulate setting a filter directly on the store
    act(() => {
      useTransactionsStore.setState({
        currentFilter: { note: "test" } as FilterRequest,
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId("transaction-count")).toHaveTextContent(
        /filtered/
      );
    });
  });

  it("shows 'transactions' (without 'filtered') when no filter is active", async () => {
    setCurrentBook();
    render(<MemoryRouter><HistoryPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByTestId("transaction-count")).toBeInTheDocument();
    });

    const countEl = screen.getByTestId("transaction-count");
    expect(countEl).toHaveTextContent(/\d+ transactions?$/);
    expect(countEl).not.toHaveTextContent(/filtered/);
  });

  it("opens the filter dialog when clicking the Filter button", async () => {
    setCurrentBook();
    render(<MemoryRouter><HistoryPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText("Filter")).toBeInTheDocument();
    });

    // Click the Filter button
    fireEvent.click(screen.getByText("Filter").closest("button")!);

    // The filter dialog should open with "Filter Transactions" heading
    await waitFor(() => {
      expect(screen.getByText("Filter Transactions")).toBeInTheDocument();
    });
  });
});