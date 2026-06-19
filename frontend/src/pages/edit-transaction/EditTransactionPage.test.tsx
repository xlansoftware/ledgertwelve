// ---------------------------------------------------------------------------
// Component tests — EditTransactionPage
// ---------------------------------------------------------------------------

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { server } from "@/test-setup";
import EditTransactionPage from "./EditTransactionPage";
import { useTransactionsStore, useCategoriesStore } from "@/store";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Simple history page stub for testing navigation. */
function HistoryPageStub() {
  return <div data-testid="history-page">History Page</div>;
}

/**
 * Create a router with the edit transaction page and a history stub,
 * then render it via RouterProvider.
 */
function renderWithRouter(transactionId = "tx_test") {
  const router = createMemoryRouter(
    [
      {
        path: "/edit-transaction/:transactionId",
        element: <EditTransactionPage />,
      },
      {
        path: "/history",
        element: <HistoryPageStub />,
      },
    ],
    {
      initialEntries: [`/edit-transaction/${transactionId}`],
    },
  );

  return render(<RouterProvider router={router} />);
}

const MOCK_TRANSACTION = {
  id: "tx_test",
  bookId: "book_main",
  userId: "usr_1",
  dateTime: "2026-06-15T14:30:00Z",
  amount: -42.5,
  originalCurrency: "USD",
  originalAmount: -50.0,
  exchangeRate: 0.85,
  categoryName: "Groceries",
  note: "Weekly shopping",
  createdAt: "2026-06-15T14:30:00Z",
};

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();

  // Reset store state
  useTransactionsStore.setState({
    currentTransaction: null,
    isLoading: false,
    error: null,
  });

  // Seed categories so they're available
  useCategoriesStore.setState({
    categories: [
      { id: "cat_1", name: "Groceries", recurring: false, color: "#fde68a", icon: "shopping-cart", createdAt: "2026-01-01T00:00:00Z", order: 1 },
      { id: "cat_2", name: "Pets", recurring: false, color: "#4d22b2", icon: "heart", createdAt: "2026-01-01T00:00:00Z", order: 2 },
    ],
    isLoading: false,
    error: null,
  });
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("EditTransactionPage", () => {
  it("shows a loading skeleton while fetching the transaction", () => {
    useTransactionsStore.setState({ isLoading: true });

    renderWithRouter();

    const skeletons = document.querySelectorAll("[data-slot='skeleton']");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("pre-populates form fields with fetched transaction data", async () => {
    server.use(
      http.get("/api/v1/transactions/:transactionId", () => {
        return HttpResponse.json({ data: MOCK_TRANSACTION });
      }),
    );

    renderWithRouter("tx_test");

    // Wait for the form to be populated
    await waitFor(() => {
      const amountInput = screen.getByLabelText("Amount");
      expect(amountInput).toHaveValue(-42.5);
    });

    // Check date/time — compare the date part and accept any timezone offset
    const dateInput = screen.getByLabelText("Date & Time") as HTMLInputElement;
    expect(dateInput.value).toMatch(/^2026-06-15/);

    // Check original currency
    const currencyInput = screen.getByLabelText(/Original Currency/);
    expect(currencyInput).toHaveValue("USD");

    // Check original amount (shown when currency is set)
    const originalAmountInput = screen.getByLabelText("Original Amount");
    expect(originalAmountInput).toHaveValue(-50);

    // Check exchange rate
    const rateInput = screen.getByLabelText("Exchange Rate");
    expect(rateInput).toHaveValue(0.85);

    // Check note
    const noteInput = screen.getByLabelText("Note");
    expect(noteInput).toHaveValue("Weekly shopping");

    // Page title should be visible
    expect(screen.getByText("Edit Transaction")).toBeInTheDocument();

    // Save and Cancel buttons should be present
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("shows multi-currency fields when original currency is entered", async () => {
    server.use(
      http.get("/api/v1/transactions/:transactionId", () => {
        return HttpResponse.json({ data: MOCK_TRANSACTION });
      }),
    );

    renderWithRouter("tx_test");

    await waitFor(() => {
      expect(screen.getByLabelText("Original Amount")).toBeInTheDocument();
    });

    expect(screen.getByLabelText("Exchange Rate")).toBeInTheDocument();
  });

  it("hides multi-currency fields when original currency is cleared", async () => {
    server.use(
      http.get("/api/v1/transactions/:transactionId", () => {
        return HttpResponse.json({
          data: {
            ...MOCK_TRANSACTION,
            originalCurrency: undefined,
            originalAmount: undefined,
            exchangeRate: undefined,
          },
        });
      }),
    );

    renderWithRouter("tx_test");

    await waitFor(() => {
      expect(screen.getByLabelText("Amount")).toHaveValue(-42.5);
    });

    expect(screen.queryByLabelText("Original Amount")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Exchange Rate")).not.toBeInTheDocument();
  });

  it("navigates to /history on save success", async () => {
    // Spy on the store's updateTransaction to make it resolve
    const updateSpy = vi
      .spyOn(useTransactionsStore.getState(), "updateTransaction")
      .mockResolvedValue(MOCK_TRANSACTION as any);

    server.use(
      http.get("/api/v1/transactions/:transactionId", () => {
        return HttpResponse.json({ data: MOCK_TRANSACTION });
      }),
    );

    renderWithRouter("tx_test");

    await waitFor(() => {
      expect(screen.getByLabelText("Amount")).toHaveValue(-42.5);
    });

    // Click Save
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    // Wait for navigation to /history
    await waitFor(() => {
      expect(screen.getByTestId("history-page")).toBeInTheDocument();
    });

    updateSpy.mockRestore();
  });

  it("navigates to /history when Cancel is clicked", async () => {
    server.use(
      http.get("/api/v1/transactions/:transactionId", () => {
        return HttpResponse.json({ data: MOCK_TRANSACTION });
      }),
    );

    renderWithRouter("tx_test");

    await waitFor(() => {
      expect(screen.getByLabelText("Amount")).toHaveValue(-42.5);
    });

    // Click Cancel
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    // Wait for navigation to /history
    expect(screen.getByTestId("history-page")).toBeInTheDocument();
  });

  it("shows an error banner when save fails and stays on page", async () => {
    server.use(
      http.get("/api/v1/transactions/:transactionId", () => {
        return HttpResponse.json({ data: MOCK_TRANSACTION });
      }),
    );

    // Override PUT to return 500
    server.use(
      http.put("/api/v1/transactions/:transactionId", () => {
        return HttpResponse.json(
          { error: "Failed to update transaction" },
          { status: 500 },
        );
      }),
    );

    renderWithRouter("tx_test");

    await waitFor(() => {
      expect(screen.getByLabelText("Amount")).toHaveValue(-42.5);
    });

    // Click Save
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    // Wait for error banner to appear
    await waitFor(() => {
      expect(screen.getByTestId("save-error")).toBeInTheDocument();
    });

    expect(screen.getByTestId("save-error")).toHaveTextContent(
      "Failed to update transaction",
    );

    // Form should still be populated (user can retry)
    expect(screen.getByLabelText("Amount")).toHaveValue(-42.5);

    // Should NOT have navigated to history
    expect(screen.queryByTestId("history-page")).not.toBeInTheDocument();
  });

  it('shows "Transaction not found" when 404 is returned', async () => {
    server.use(
      http.get("/api/v1/transactions/:transactionId", () => {
        return HttpResponse.json(
          { error: "Transaction not found" },
          { status: 404 },
        );
      }),
    );

    renderWithRouter("tx_not_found");

    await waitFor(() => {
      expect(screen.getByText("Transaction not found")).toBeInTheDocument();
    });

    // Should show a link back to history
    expect(screen.getByText("Go to History")).toBeInTheDocument();
  });

  it("renders the category combobox with placeholder", async () => {
    server.use(
      http.get("/api/v1/transactions/:transactionId", () => {
        return HttpResponse.json({ data: MOCK_TRANSACTION });
      }),
    );

    renderWithRouter("tx_test");

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText("Select category…"),
      ).toBeInTheDocument();
    });
  });
});