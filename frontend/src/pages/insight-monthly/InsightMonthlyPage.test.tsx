// ---------------------------------------------------------------------------
// Component tests — InsightMonthlyPage
// ---------------------------------------------------------------------------

import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { describe, expect, it, vi, beforeEach } from "vitest"
import { MemoryRouter } from "react-router-dom"
import InsightMonthlyPage from "./InsightMonthlyPage"
import * as reportsService from "@/services/reportsService"
import * as booksService from "@/services/booksService"
import { useCategoriesStore } from "@/store"
import { format } from "date-fns"
import type { CategoryDto } from "@/types"

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/services/reportsService", () => ({
  getCategoryReport: vi.fn(),
  getMonthlyReport: vi.fn(),
  getMonthlyAverage: vi.fn(),
}))

vi.mock("@/services/booksService", () => ({
  getBookStats: vi.fn(),
}))

const mockGetCategoryReport = vi.mocked(reportsService.getCategoryReport)
const mockGetMonthlyReport = vi.mocked(reportsService.getMonthlyReport)
const mockGetMonthlyAverage = vi.mocked(reportsService.getMonthlyAverage)
const mockGetBookStats = vi.mocked(booksService.getBookStats)

// ---------------------------------------------------------------------------
// Date helpers (relative to today)
// ---------------------------------------------------------------------------

const now = new Date()
const currentYear = now.getFullYear()
const currentMonth = now.getMonth() + 1
const currentMonthStr = `${currentYear}-${String(currentMonth).padStart(2, "0")}`

function monthPeriod(n: number): string {
  return `${currentYear}-${String(n).padStart(2, "0")}`
}

function formatMonthLabel(n: number): string {
  const d = new Date(currentYear, n - 1, 1)
  return format(d, "MMM")
}

/** Build deterministic monthly data: each month amount = -(100 + n * 50) */
function buildMonthlyData(): { period: string; amount: number }[] {
  const rows: { period: string; amount: number }[] = []
  for (let m = 1; m <= currentMonth; m++) {
    rows.push({ period: monthPeriod(m), amount: -(100 + m * 50) })
  }
  return rows
}

// ── Category report data ──
const CURRENT_MONTH_CATEGORIES = [
  { categoryName: "Groceries", amount: -45 },
  { categoryName: "Dining Out", amount: -30 },
  { categoryName: "Salary", amount: 200 },
]

const JANUARY_CATEGORIES = [
  { categoryName: "Groceries", amount: -60 },
  { categoryName: "Rent / Mortgage", amount: -1200 },
]

const FEBRUARY_CATEGORIES = [
  { categoryName: "Dining Out", amount: -25 },
  { categoryName: "Salary", amount: 150 },
]

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const CATEGORIES: CategoryDto[] = [
  { id: "cat_1", name: "Groceries",       recurring: false, color: "#fde68a", icon: "shopping-cart", createdAt: "2026-01-01T00:00:00Z", order: 1 },
  { id: "cat_5", name: "Dining Out",      recurring: false, color: "#FFCAD4", icon: "utensils",       createdAt: "2026-01-01T00:00:00Z", order: 5 },
  { id: "cat_9", name: "Salary",          recurring: false, color: "#4ade80", icon: "piggy-bank",     createdAt: "2026-01-01T00:00:00Z", order: 9 },
  { id: "cat_21", name: "Rent / Mortgage", recurring: true,  color: "#fca5a5", icon: "home",          createdAt: "2026-01-01T00:00:00Z", order: 21 },
]

beforeEach(() => {
  vi.clearAllMocks()

  // Seed categories so InsightComponent can look up colors/icons
  useCategoriesStore.setState({
    categories: CATEGORIES,
    isLoading: false,
    error: null,
  })

  // Mock successful API responses
  mockGetMonthlyReport.mockResolvedValue(buildMonthlyData())
  mockGetBookStats.mockResolvedValue({ transactionCount: 100, totalSum: -500 })
  mockGetMonthlyAverage.mockResolvedValue({ average: -1380.0, count: 12 })

  // getCategoryReport returns different data depending on the month
  mockGetCategoryReport.mockImplementation((params) => {
    if (params?.from?.startsWith(currentMonthStr)) {
      return Promise.resolve(CURRENT_MONTH_CATEGORIES)
    }
    if (params?.from?.startsWith(monthPeriod(1))) {
      return Promise.resolve(JANUARY_CATEGORIES)
    }
    if (params?.from?.startsWith(monthPeriod(2))) {
      return Promise.resolve(FEBRUARY_CATEGORIES)
    }
    return Promise.resolve([])
  })
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract the numeric amount from a MonthList row button. */
function getRowNet(button: HTMLElement): number {
  const amountSpan = button.querySelector(".font-mono.tabular-nums")
  if (!amountSpan) return NaN
  const raw = amountSpan.textContent ?? ""
  // Bracket format: (55.00) means -55.00
  const isNegative = raw.startsWith("(") && raw.endsWith(")")
  const digits = raw.replace(/[^0-9.]/g, "")
  const val = parseFloat(digits)
  return isNegative ? -val : val
}

/** Find a button whose text content matches the given month label. */
function findMonthButton(monthLabel: string): HTMLElement | null {
  const buttons = screen.getAllByRole("button")
  return buttons.find((btn) => btn.textContent?.includes(monthLabel)) ?? null
}

/** Find "This Month" button. */
function findThisMonthButton(): HTMLElement | null {
  const buttons = screen.getAllByRole("button")
  return buttons.find((btn) => {
    const text = btn.textContent?.trim() ?? ""
    return text.startsWith("This Month") && /^This Month[\s\S]*$/.test(text)
  }) ?? null
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("InsightMonthlyPage", () => {
  it("shows a skeleton while monthly data is loading", () => {
    mockGetMonthlyReport.mockReturnValue(new Promise(() => {}))

    render(<MemoryRouter><InsightMonthlyPage /></MemoryRouter>)

    const animatePulse = document.querySelectorAll(".animate-pulse")
    expect(animatePulse.length).toBeGreaterThan(0)
  })

  describe("initial load — current month", () => {
    beforeEach(async () => {
      render(<MemoryRouter><InsightMonthlyPage /></MemoryRouter>)

      // Wait for all three parallel fetches to settle
      await waitFor(() => {
        expect(mockGetMonthlyReport).toHaveBeenCalledTimes(1)
        expect(mockGetCategoryReport).toHaveBeenCalledTimes(1)
        expect(mockGetBookStats).toHaveBeenCalledTimes(1)
      })
    })

    it("shows the pie chart with current month's expenses, income, and title", async () => {
      // Expenses: Groceries 45 + Dining Out 30 = 75  → "75"
      // Income: Salary 200  → "(200)"
      // Title: "This Month"
      await waitFor(() => {
        expect(screen.getByText("75")).toBeInTheDocument()
        expect(screen.getByText("(200)")).toBeInTheDocument()
        // "This Month" appears in the pie SVG — verify at least once
        expect(screen.getAllByText("This Month").length).toBeGreaterThanOrEqual(1)
      })
    })

    it("shows MonthlyList with all months from Jan to current", async () => {
      await waitFor(() => {
        expect(screen.getByText("Monthly Net")).toBeInTheDocument()
      })

      // Count month buttons (all months Jan → current)
      const monthsShown = currentMonth
      await waitFor(() => {
        const rows = screen.getAllByRole("button")
        // Filter to only month-labeled buttons
        const monthButtons = rows.filter((btn) => {
          const text = btn.textContent?.trim() ?? ""
          return text.startsWith("This Month") || /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/.test(text)
        })
        expect(monthButtons).toHaveLength(monthsShown)
      })
    })

    it("shows the correct net sum for a given month's row", async () => {
      const expected = -(100 + currentMonth * 50)

      const thisMonthButton = findThisMonthButton()
      expect(thisMonthButton).toBeInTheDocument()

      await waitFor(() => {
        expect(getRowNet(thisMonthButton!)).toBe(expected)
      })
    })
  })

  describe("month selection", () => {
    it("selecting a month updates the pie chart", async () => {
      render(<MemoryRouter><InsightMonthlyPage /></MemoryRouter>)

      // Wait for initial load (current month data)
      await waitFor(() => {
        expect(screen.getByText("75")).toBeInTheDocument()
        expect(screen.getByText("(200)")).toBeInTheDocument()
      })

      // Select January
      const janLabel = formatMonthLabel(1)
      const janButton = findMonthButton(janLabel)!
      fireEvent.click(janButton)

      // January: expenses = 60 + 1200 = 1260, no income
      await waitFor(() => {
        expect(screen.getByText("1,260")).toBeInTheDocument()
        expect(screen.queryByText(/^\(\d+\)$/)).not.toBeInTheDocument()
      })

      // Pie title shows the selected month
      expect(screen.getByText("Jan 2026")).toBeInTheDocument()
      expect(janButton.className).toContain("border-primary")
    })

    it("selecting a different month changes the pie chart again", async () => {
      render(<MemoryRouter><InsightMonthlyPage /></MemoryRouter>)

      await waitFor(() => {
        expect(screen.getByText("75")).toBeInTheDocument()
      })

      // Select January
      const janLabel = formatMonthLabel(1)
      fireEvent.click(findMonthButton(janLabel)!)

      await waitFor(() => {
        expect(screen.getByText("1,260")).toBeInTheDocument()
      })

      // Now select February
      const febLabel = formatMonthLabel(2)
      fireEvent.click(findMonthButton(febLabel)!)

      // February: expenses = 25 (Dining Out), income = 150 (Salary) → "25" + "(150)"
      await waitFor(() => {
        expect(screen.getByText("25")).toBeInTheDocument()
        expect(screen.getByText("(150)")).toBeInTheDocument()
      })
      expect(screen.getByText("Feb 2026")).toBeInTheDocument()
    })

    it("clicking 'This Month' resets the pie chart", async () => {
      render(<MemoryRouter><InsightMonthlyPage /></MemoryRouter>)

      await waitFor(() => {
        expect(screen.getByText("75")).toBeInTheDocument()
      })

      // Go to January first
      const janLabel = formatMonthLabel(1)
      fireEvent.click(findMonthButton(janLabel)!)

      await waitFor(() => {
        expect(screen.getByText("1,260")).toBeInTheDocument()
      })

      // Click "This Month" to reset
      fireEvent.click(findThisMonthButton()!)

      await waitFor(() => {
        expect(screen.getByText("75")).toBeInTheDocument()
        expect(screen.getByText("(200)")).toBeInTheDocument()
        expect(screen.getAllByText("This Month").length).toBeGreaterThanOrEqual(1)
      })
    })
  })

  describe("error states", () => {
    it("shows an error message when the monthly fetch fails", async () => {
      mockGetMonthlyReport.mockRejectedValue(new Error("Could not fetch monthly data"))
      mockGetCategoryReport.mockResolvedValue([])
      mockGetBookStats.mockResolvedValue({ transactionCount: 0, totalSum: 0 })

      render(<MemoryRouter><InsightMonthlyPage /></MemoryRouter>)

      await waitFor(() => {
        // Error appears in both MonthlyAreaChart and MonthlyList sections
        const errors = screen.getAllByText("Could not fetch monthly data")
        expect(errors.length).toBeGreaterThanOrEqual(1)
      })
    })
  })
})
