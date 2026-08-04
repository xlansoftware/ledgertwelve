// ---------------------------------------------------------------------------
// Component tests — InsightMonthlyPage
// ---------------------------------------------------------------------------

import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { describe, expect, it, vi, beforeEach, beforeAll, afterAll } from "vitest"
import { MemoryRouter } from "react-router-dom"
import InsightMonthlyPage from "./InsightMonthlyPage"
import * as reportsService from "@/services/reportsService"
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
  getTotals: vi.fn(),
}))

const mockGetCategoryReport = vi.mocked(reportsService.getCategoryReport)
const mockGetMonthlyReport = vi.mocked(reportsService.getMonthlyReport)
const mockGetMonthlyAverage = vi.mocked(reportsService.getMonthlyAverage)
const mockGetTotals = vi.mocked(reportsService.getTotals)

// ---------------------------------------------------------------------------
// Date helpers (relative to the faked "today" — initialized in beforeAll)
// ---------------------------------------------------------------------------

let now: Date
let currentYear: number
let currentMonth: number
let currentMonthStr: string
const PAST_YEAR = 2025

function monthPeriod(year: number, n: number): string {
  return `${year}-${String(n).padStart(2, "0")}`
}

function formatMonthLabel(n: number): string {
  const d = new Date(currentYear, n - 1, 1)
  return format(d, "MMM")
}

/** Build deterministic monthly data: each month amount = -(100 + n * 50) */
function buildMonthlyData(): { period: string; amount: number }[] {
  const rows: { period: string; amount: number }[] = []
  for (let m = 1; m <= currentMonth; m++) {
    rows.push({ period: monthPeriod(currentYear, m), amount: -(100 + m * 50) })
  }
  return rows
}

/** Build sparse monthly data for a past year (months 1, 3, 6, 12). */
function buildPastYearData(): { period: string; amount: number }[] {
  return [
    { period: monthPeriod(PAST_YEAR, 1), amount: -250 },
    { period: monthPeriod(PAST_YEAR, 3), amount: -150 },
    { period: monthPeriod(PAST_YEAR, 6), amount: -300 },
    { period: monthPeriod(PAST_YEAR, 12), amount: -400 },
  ]
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

const PAST_DECEMBER_CATEGORIES = [
  { categoryName: "Gifts", amount: -400 },
]

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const CATEGORIES: CategoryDto[] = [
  { id: "cat_1", name: "Groceries",       recurring: false, color: "#fde68a", icon: "shopping-cart", createdAt: "2026-01-01T00:00:00Z", order: 1 },
  { id: "cat_5", name: "Dining Out",      recurring: false, color: "#FFCAD4", icon: "utensils",       createdAt: "2026-01-01T00:00:00Z", order: 5 },
  { id: "cat_9", name: "Salary",          recurring: false, color: "#4ade80", icon: "piggy-bank",     createdAt: "2026-01-01T00:00:00Z", order: 9 },
  { id: "cat_21", name: "Rent / Mortgage", recurring: true,  color: "#fca5a5", icon: "home",          createdAt: "2026-01-01T00:00:00Z", order: 21 },
  { id: "cat_22", name: "Gifts",          recurring: false, color: "#FF6B6B", icon: "piggy-bank",     createdAt: "2026-01-01T00:00:00Z", order: 22 },
]

beforeAll(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(new Date("2026-07-15"))

  // Derive date constants from the faked clock so they stay in sync with
  // the component's notion of "this month" (July 2026). Computing them at
  // module scope would use the real system date and drift out of sync.
  now = new Date()
  currentYear = now.getFullYear()
  currentMonth = now.getMonth() + 1
  currentMonthStr = `${currentYear}-${String(currentMonth).padStart(2, "0")}`
})

afterAll(() => {
  vi.useRealTimers()
})

beforeEach(() => {
  vi.clearAllMocks()

  // Seed categories so InsightComponent can look up colors/icons
  useCategoriesStore.setState({
    categories: CATEGORIES,
    isLoading: false,
    error: null,
  })

  // Both the current and previous year have transactions (default view = current year)
  mockGetTotals.mockResolvedValue([
    { period: String(PAST_YEAR), income: 2000, expense: -1100, net: 900 },
    { period: String(currentYear), income: 5000, expense: -4000, net: 1000 },
  ])

  // Mock successful API responses
  mockGetMonthlyReport.mockImplementation((params) => {
    if (params?.from?.startsWith(String(PAST_YEAR))) {
      return Promise.resolve(buildPastYearData())
    }
    return Promise.resolve(buildMonthlyData())
  })
  mockGetMonthlyAverage.mockResolvedValue({ average: -1380.0, count: 12 })

  // getCategoryReport returns different data depending on the month
  mockGetCategoryReport.mockImplementation((params) => {
    if (params?.from?.startsWith(`${PAST_YEAR}-12`)) {
      return Promise.resolve(PAST_DECEMBER_CATEGORIES)
    }
    if (params?.from?.startsWith(currentMonthStr)) {
      return Promise.resolve(CURRENT_MONTH_CATEGORIES)
    }
    if (params?.from?.startsWith(monthPeriod(currentYear, 1))) {
      return Promise.resolve(JANUARY_CATEGORIES)
    }
    if (params?.from?.startsWith(monthPeriod(currentYear, 2))) {
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
  // formatExpense(-x) returns positive (no sign) → original is -parsed
  // formatExpense(x) returns -x (with "-" prefix) → original is parsed
  const isNegative = raw.startsWith("-")
  const digits = raw.replace(/[^0-9.]/g, "")
  const val = parseFloat(digits)
  return isNegative ? val : -val
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

/** Find a year row button whose label starts with the given year. */
function findYearButton(year: string): HTMLElement | null {
  const buttons = screen.getAllByRole("button")
  return buttons.find((btn) => btn.textContent?.trim().startsWith(year)) ?? null
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("InsightMonthlyPage", () => {
  describe("initial load — current month", () => {
    beforeEach(async () => {
      render(<MemoryRouter><InsightMonthlyPage /></MemoryRouter>)

      // Wait for all fetches to settle
      await waitFor(() => {
        expect(mockGetTotals).toHaveBeenCalledTimes(1)
        expect(mockGetMonthlyReport).toHaveBeenCalledTimes(1)
        expect(mockGetCategoryReport).toHaveBeenCalledTimes(1)
        expect(mockGetMonthlyAverage).toHaveBeenCalledTimes(1)
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

  describe("year navigation", () => {
    it("renders the year list at the bottom with yearly nets", async () => {
      render(<MemoryRouter><InsightMonthlyPage /></MemoryRouter>)

      await waitFor(() => {
        expect(screen.getByText("Yearly Net")).toBeInTheDocument()
      })

      expect(findYearButton("2025")).not.toBeNull()
      expect(findYearButton("2026")).not.toBeNull()
    })

    it("switching to a past year updates the chart, list, and labels", async () => {
      render(<MemoryRouter><InsightMonthlyPage /></MemoryRouter>)

      await waitFor(() => {
        expect(screen.getByText("This Year")).toBeInTheDocument()
        expect(findThisMonthButton()).not.toBeNull()
      })

      // Switch to the previous year
      fireEvent.click(findYearButton(String(PAST_YEAR))!)

      // The pie defaults to that year's last month with transactions
      await waitFor(() => {
        expect(screen.getByText("Dec 2025")).toBeInTheDocument()
      })

      // Chart header switches to the year's own stats
      expect(screen.getByText("Year End")).toBeInTheDocument()
      expect(screen.queryByText("This Year")).not.toBeInTheDocument()
      expect(screen.queryByText("This Month")).not.toBeInTheDocument()

      // Monthly list shows all 12 months (Jan–Dec), no "This Month" row
      const rows = screen.getAllByRole("button")
      const monthButtons = rows.filter((btn) => {
        const text = btn.textContent?.trim() ?? ""
        return /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/.test(text)
      })
      expect(monthButtons).toHaveLength(12)
    })

    it("switching back to the current year restores 'This Year' and 'This Month'", async () => {
      render(<MemoryRouter><InsightMonthlyPage /></MemoryRouter>)

      await waitFor(() => {
        expect(screen.getByText("This Year")).toBeInTheDocument()
      })

      // Go to the previous year, then back to the current year
      fireEvent.click(findYearButton(String(PAST_YEAR))!)
      await waitFor(() => {
        expect(screen.getByText("Dec 2025")).toBeInTheDocument()
      })

      fireEvent.click(findYearButton(String(currentYear))!)

      await waitFor(() => {
        expect(screen.getByText("This Year")).toBeInTheDocument()
        expect(screen.getAllByText("This Month").length).toBeGreaterThanOrEqual(1)
      })
      expect(screen.queryByText("Year End")).not.toBeInTheDocument()
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

})
