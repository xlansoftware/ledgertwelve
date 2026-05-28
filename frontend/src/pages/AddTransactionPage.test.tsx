import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { MemoryRouter } from "react-router-dom";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import AddTransactionPage from "./AddTransactionPage";
import { useUserStore } from "@/store/userStore";
import { useCategoryStore } from "@/store/categoryStore";
import { useTransactionStore } from "@/store/transactionStore";

// ---------------------------------------------------------------------------
// MSW server
// ---------------------------------------------------------------------------

interface StoredCategory {
  id: string;
  name: string;
  color: string | null;
  displayOrder: number | null;
  icon: string | null;
}

interface StoredTransaction {
  id: string;
  value: number;
  currency: string;
  category: string;
  author: string;
  book: string | null;
  notes: string | null;
  valueInBookCurrency: number | null;
  date: string;
}

let nextTxId = 0;

const seedCategories: StoredCategory[] = [
  { id: "c1", name: "Groceries", color: "#22c55e", displayOrder: 1, icon: null },
  { id: "c2", name: "Transport", color: "#3b82f6", displayOrder: 2, icon: null },
  { id: "c3", name: "Dining", color: "#f59e0b", displayOrder: 3, icon: null },
  { id: "c4", name: "Rent", color: "#ef4444", displayOrder: 4, icon: null },
];

let activeCategories: StoredCategory[] = [];
let transactionCreated = false;
let lastCreatedPayload: object | null = null;
let failNextCreate = false;

const server = setupServer(
  http.get("/api/categories", () => {
    const sorted = [...activeCategories].sort((a, b) => {
      const orderA = a.displayOrder ?? Infinity;
      const orderB = b.displayOrder ?? Infinity;
      if (orderA !== orderB) return orderA - orderB;
      return a.name.localeCompare(b.name);
    });
    return HttpResponse.json(sorted);
  }),

  http.get('/api/ledger/transactions', async () => {
    return HttpResponse.json({ items: [], totalCount: 0, page: 1, pageSize: 20 });
  }),

  http.post("/api/ledger/transaction", async ({ request }) => {
    // Small delay so submitting state can be observed in tests
    await new Promise((r) => setTimeout(r, 100));

    if (failNextCreate) {
      failNextCreate = false;
      return HttpResponse.json(
        { error: "Transaction value cannot be zero." },
        { status: 400 },
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    transactionCreated = true;
    lastCreatedPayload = body;

    const tx: StoredTransaction = {
      id: `m-${++nextTxId}`,
      value: body.value as number,
      currency: body.currency as string,
      category: body.category as string,
      author: (body.author as string) ?? "TestUser",
      book: null,
      notes: null,
      valueInBookCurrency: null,
      date: new Date().toISOString(),
    };
    return HttpResponse.json(tx, { status: 201 });
  }),
);

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterAll(() => server.close());

beforeEach(() => {
  // Reset stores
  useUserStore.setState({
    user: "Alice",
    isAuthenticated: true,
    isLoading: false,
  });

  useCategoryStore.setState({
    categories: [],
    isLoading: false,
    error: null,
    hasLoadedOnce: false,
  });

  useTransactionStore.setState({
    transactions: [],
    totalCount: 0,
    page: 1,
    pageSize: 20,
    filters: {},
    isLoading: false,
    error: null,
  });

  // Reset mock state
  activeCategories = [...seedCategories];
  transactionCreated = false;
  lastCreatedPayload = null;
  failNextCreate = false;
  nextTxId = 0;
});

afterEach(() => {
  server.resetHandlers();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/add"]}>
      <AddTransactionPage />
    </MemoryRouter>,
  );
}

/** Type a value into the amount input */
async function typeAmount(user: ReturnType<typeof userEvent.setup>, value: string) {
  const input = screen.getByPlaceholderText(/amount/i);
  await user.clear(input);
  await user.type(input, value);
}

/** Select a category by name */
async function selectCategory(user: ReturnType<typeof userEvent.setup>, name: string) {
  const btn = screen.getByRole("button", { name: new RegExp(name, "i") });
  await user.click(btn);
}

/** Click the submit button */
async function clickSubmit(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /add/i }));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AddTransactionPage", () => {
  it("renders AmountInput, notes field, category grid, and add button", async () => {
    renderPage();

    // Wait for categories to load
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/amount/i)).toBeInTheDocument();
    });

    expect(
      screen.getByPlaceholderText(/notes/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /add/i }),
    ).toBeInTheDocument();

    // Categories should be rendered
    expect(
      screen.getByRole("button", { name: /groceries/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /transport/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /dining/i }),
    ).toBeInTheDocument();
  });

  it("shows validation error when submitting with empty amount", async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/amount/i)).toBeInTheDocument();
    });

    await clickSubmit(user);

    expect(
      screen.getByText(/please enter a valid amount/i),
    ).toBeInTheDocument();
  });

  it("calls addTransaction with correct payload on valid submit", async () => {
    const user = userEvent.setup();
    renderPage();

    // Wait for categories to load
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /groceries/i }),
      ).toBeInTheDocument();
    });

    // Fill in form
    await typeAmount(user, "33 EUR");
    await selectCategory(user, "Groceries");

    // Submit
    await clickSubmit(user);

    await waitFor(() => {
      expect(transactionCreated).toBe(true);
    });

    expect(lastCreatedPayload).toMatchObject({
      value: 33,
      currency: "EUR",
      category: "Groceries",
      author: "Alice",
    });
  });

  it("resets form after successful submit", async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /groceries/i }),
      ).toBeInTheDocument();
    });

    // Fill and submit
    await typeAmount(user, "15 USD");
    await selectCategory(user, "Transport");
    await clickSubmit(user);

    await waitFor(() => {
      expect(transactionCreated).toBe(true);
    });

    // Amount input should be cleared
    const amountInput = screen.getByPlaceholderText(/amount/i);
    await waitFor(() => {
      expect(amountInput).toHaveValue("");
    });
  });

  it("shows error message when API call fails", async () => {
    failNextCreate = true;

    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /groceries/i }),
      ).toBeInTheDocument();
    });

    await typeAmount(user, "50 USD");
    await selectCategory(user, "Dining");
    await clickSubmit(user);

    await waitFor(() => {
      expect(
        screen.getByText(/failed to save transaction/i),
      ).toBeInTheDocument();
    });
  });

  it("disables add button while submitting", async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /groceries/i }),
      ).toBeInTheDocument();
    });

    await typeAmount(user, "99 USD");
    await selectCategory(user, "Rent");

    const addBtn = screen.getByRole("button", { name: /add/i });
    expect(addBtn).not.toBeDisabled();

    await user.click(addBtn);

    // Button should show "Saving…" while submitting
    expect(screen.getByRole("button", { name: /saving/i })).toBeDisabled();

    await waitFor(() => {
      expect(transactionCreated).toBe(true);
    });
  });

  it("pre-fills author from userStore", async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /groceries/i }),
      ).toBeInTheDocument();
    });

    await typeAmount(user, "10 USD");
    await selectCategory(user, "Groceries");
    await clickSubmit(user);

    await waitFor(() => {
      expect(transactionCreated).toBe(true);
    });

    expect(lastCreatedPayload).toMatchObject({
      author: "Alice",
    });
  });

  it("shows loading state while categories are fetching", () => {
    // Don't let the categories load by not starting the server
    renderPage();

    expect(screen.getByText(/loading categories/i)).toBeInTheDocument();
  });

  it("shows category error state with retry", async () => {
    server.use(
      http.get("/api/categories", () => {
        return HttpResponse.json(
          { error: "Server error" },
          { status: 500 },
        );
      }),
    );

    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /retry/i }),
      ).toBeInTheDocument();
    });

    // Clicking retry should work (restore handler)
    server.resetHandlers();
    await user.click(screen.getByRole("button", { name: /retry/i }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /groceries/i }),
      ).toBeInTheDocument();
    });
  });
});