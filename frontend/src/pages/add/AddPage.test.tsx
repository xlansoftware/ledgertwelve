// ---------------------------------------------------------------------------
// Component tests — AddPage
// ---------------------------------------------------------------------------

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import AddPage from "./AddPage";
import HistoryPage from "@/pages/history/HistoryPage";
import { useBooksStore, useCategoriesStore } from "@/store";
import { useTransactionsStore } from "@/store/useTransactionsStore";
import { getExchangeRate } from "@/services/ratesService";
import type { Mock } from "vitest";
import type { CategoryDto } from "@/types";

// Pre-seed the categories store to simulate init having run
const seedCategories: CategoryDto[] = [
  { id: "cat_1", name: "Groceries", recurring: false, color: "#fde68a", icon: "shopping-cart", createdAt: "2026-01-01T10:00:00Z", order: 1 },
  { id: "cat_2", name: "Pets", recurring: false, color: "#4d22b2", icon: "heart", createdAt: "2026-01-01T10:00:00Z", order: 2 },
];

// Mock the rates service so we can control its response
vi.mock("@/services/ratesService", () => ({
  getExchangeRate: vi.fn(),
}));

const mockGetExchangeRate = getExchangeRate as Mock;

describe("AddPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetExchangeRate.mockResolvedValue({
      from: "USD",
      to: "EUR",
      rate: 0.91,
    })
    // Seed stores as if initializeApp ran
    useCategoriesStore.setState({ categories: seedCategories, isLoading: false, error: null })
  })

  it("renders the amount input, notes input, and add button", () => {
    render(<AddPage />);

    expect(screen.getByLabelText("Amount")).toBeInTheDocument();
    expect(screen.getByLabelText("Notes")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
  });

  it("loads and displays categories", async () => {
    render(<AddPage />);

    // The notes input is present from the start
    expect(screen.getByPlaceholderText("Notes ...")).toBeInTheDocument();

    // Wait for the categories to load (the MSW handler returns Groceries and Pets)
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Category Groceries" })).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: "Category Pets" })).toBeInTheDocument();
  });

  it("renders categories in sort order", async () => {
    render(<AddPage />);

    // Wait for categories to load
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Category Groceries" })).toBeInTheDocument();
    });

    // Verify categories are rendered
    const categoryButtons = screen.getAllByRole("button").filter((btn) =>
      btn.getAttribute("aria-label")?.startsWith("Category "),
    );

    // Groceries has order 1, Pets has order 2
    expect(categoryButtons[0]).toHaveAttribute("aria-label", "Category Groceries");
    expect(categoryButtons[1]).toHaveAttribute("aria-label", "Category Pets");
  });

  describe("currency conversion dialog", () => {
    beforeEach(() => {
      // Set a current book with a currency
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
      })
    })

    it("opens conversion dialog when entering foreign currency amount", async () => {
      render(<AddPage />)

      // Enter an amount in USD (different from book EUR)
      const amountInput = screen.getByLabelText("Amount")
      fireEvent.change(amountInput, { target: { value: "100 USD" } })

      // Click Add
      const addBtn = screen.getByRole("button", { name: "Add" })
      fireEvent.click(addBtn)

      // Should see the conversion dialog
      await waitFor(() => {
        expect(screen.getByText("Currency Conversion")).toBeInTheDocument()
      })

      // Should show the original amount
      expect(screen.getByDisplayValue("100 USD")).toBeInTheDocument()
    })

    it("skips dialog when entering same currency", async () => {
      render(<AddPage />)

      // Enter an amount in EUR (same as book currency)
      const amountInput = screen.getByLabelText("Amount")
      fireEvent.change(amountInput, { target: { value: "50 EUR" } })

      // Click Add
      const addBtn = screen.getByRole("button", { name: "Add" })
      fireEvent.click(addBtn)

      // Dialog should NOT appear
      expect(screen.queryByText("Currency Conversion")).not.toBeInTheDocument()
    })

    it("skips dialog when book has no currency", async () => {
      useBooksStore.setState({
        currentBook: {
          id: "book_main",
          name: "Main",
          currency: undefined,
          status: "open",
          ownerId: "usr_1",
          sharedWith: [],
          createdAt: "2026-01-01T10:00:00Z",
        },
      })

      render(<AddPage />)

      const amountInput = screen.getByLabelText("Amount")
      fireEvent.change(amountInput, { target: { value: "100 USD" } })

      const addBtn = screen.getByRole("button", { name: "Add" })
      fireEvent.click(addBtn)

      expect(screen.queryByText("Currency Conversion")).not.toBeInTheDocument()
    })

    it("confirming dialog commits transaction with converted values", async () => {
      render(<AddPage />)

      // Enter an amount in USD
      const amountInput = screen.getByLabelText("Amount")
      fireEvent.change(amountInput, { target: { value: "110 USD" } })

      // Click Add to open dialog
      const addBtn = screen.getByRole("button", { name: "Add" })
      fireEvent.click(addBtn)

      // Wait for dialog
      await waitFor(() => {
        expect(screen.getByText("Currency Conversion")).toBeInTheDocument()
      })

      // Wait for rate to be fetched and displayed
      await waitFor(() => {
        expect(screen.getByDisplayValue("0.9100")).toBeInTheDocument()
      })

      // Click Confirm
      const confirmBtn = screen.getByRole("button", { name: "Confirm" })
      fireEvent.click(confirmBtn)

      // Dialog should close
      await waitFor(() => {
        expect(screen.queryByText("Currency Conversion")).not.toBeInTheDocument()
      })

      // Amount input should be cleared
      expect(amountInput).toHaveValue("")
    })

    it("cancelling dialog hides dialog and clears pending transaction", async () => {
      render(<AddPage />)

      const amountInput = screen.getByLabelText("Amount")
      fireEvent.change(amountInput, { target: { value: "100 USD" } })

      const addBtn = screen.getByRole("button", { name: "Add" })
      fireEvent.click(addBtn)

      await waitFor(() => {
        expect(screen.getByText("Currency Conversion")).toBeInTheDocument()
      })

      // Click Cancel
      const cancelBtn = screen.getByRole("button", { name: "Cancel" })
      fireEvent.click(cancelBtn)

      // Dialog should close
      await waitFor(() => {
        expect(screen.queryByText("Currency Conversion")).not.toBeInTheDocument()
      })

      // Amount input was cleared by AmountInput on Add press (same flow)
      // User can now type a new amount
      expect(amountInput).toHaveValue("")
    })
  })

  // ---------------------------------------------------------------------
  // Integration: Add → History
  // ---------------------------------------------------------------------

  describe("add → history integration", () => {
    beforeEach(() => {
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
      })

      // Reset transactions store so the history page fetches fresh
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
      })
    })

    it("adds a transaction and shows it first in the HistoryPage", async () => {
      const UNIQUE_NOTE = "Integration test transaction"

      // ---- Step 1: Add a transaction via AddPage ----

      const { unmount: unmountAdd } = render(<AddPage />)

      // Wait for categories to load (auto-selects first one)
      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Category Groceries" })).toBeInTheDocument()
      })

      // Type the amount (same currency as book — EUR — no conversion dialog)
      const amountInput = screen.getByLabelText("Amount")
      fireEvent.change(amountInput, { target: { value: "42.50" } })

      // Type a unique note so we can find the transaction later
      const notesInput = screen.getByLabelText("Notes")
      fireEvent.change(notesInput, { target: { value: UNIQUE_NOTE } })

      // Click Add
      fireEvent.click(screen.getByRole("button", { name: "Add" }))

      // Wait for the amount input to be cleared (indicates the transaction
      // has been submitted and the store is being updated)
      await waitFor(() => {
        expect(amountInput).toHaveValue("")
      })

      // Give the async createTransaction a moment to complete
      await waitFor(() => {
        const store = useTransactionsStore.getState()
        expect(store.transactions.length).toBeGreaterThan(0)
        expect(store.transactions[0].note).toBe(UNIQUE_NOTE)
      })

      // Clean up AddPage
      unmountAdd()

      // ---- Step 2: Navigate to HistoryPage ----

      render(<MemoryRouter><HistoryPage /></MemoryRouter>)

      // Wait for transactions to load into the HistoryPage
      // The new transaction should be first because the GET handler now
      // sorts by dateTime descending
      await waitFor(() => {
        expect(screen.getByText(UNIQUE_NOTE)).toBeInTheDocument()
      })

      // Verify it appears as the first transaction row
      const items = screen.getAllByTestId(/^Item:/)
      expect(items.length).toBeGreaterThan(0)
      expect(items[0]).toHaveTextContent(UNIQUE_NOTE)
    })
  })
});