// ---------------------------------------------------------------------------
// Component tests — InsightDailyPage
// ---------------------------------------------------------------------------

import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { describe, expect, it, vi, beforeEach } from "vitest"
import InsightDailyPage from "./InsightDailyPage"
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
  getDailyReport: vi.fn(),
}))

vi.mock("@/services/booksService", () => ({
  getBookStats: vi.fn(),
}))

const mockGetCategoryReport = vi.mocked(reportsService.getCategoryReport)
const mockGetDailyReport = vi.mocked(reportsService.getDailyReport)
const mockGetBookStats = vi.mocked(booksService.getBookStats)

// ---------------------------------------------------------------------------
// Date helpers (relative to today)
// ---------------------------------------------------------------------------

const todayStr = new Date().toISOString().slice(0, 10)

function dayOffset(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

function formatListDay(dateStr: string): string {
  if (dateStr === todayStr) return "Today"
  const d = new Date(dateStr + "T00:00:00")
  return format(d, "EEE d")
}

function formatPieDay(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00")
  return format(d, "EEE, MMM d")
}

// ---------------------------------------------------------------------------
// Deterministic data
// ---------------------------------------------------------------------------

const CATEGORIES: CategoryDto[] = [
  { id: "cat_1", name: "Groceries",     recurring: false, color: "#fde68a", icon: "shopping-cart", createdAt: "2026-01-01T00:00:00Z", order: 1 },
  { id: "cat_5", name: "Dining Out",    recurring: false, color: "#FFCAD4", icon: "utensils",       createdAt: "2026-01-01T00:00:00Z", order: 5 },
  { id: "cat_9", name: "Salary",        recurring: false, color: "#4ade80", icon: "piggy-bank",     createdAt: "2026-01-01T00:00:00Z", order: 9 },
  { id: "cat_8", name: "Entertainment", recurring: false, color: "#bae6fd", icon: "film",           createdAt: "2026-01-01T00:00:00Z", order: 8 },
]

/**
 * Returns deterministic daily data from the 1st of the current month up to today.
 * Each day: amount = -(10 + day-of-month * 3)
 */
function buildDailyData(): { date: string; amount: number }[] {
  const now = new Date()
  const currentDay = now.getDate()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const days: { date: string; amount: number }[] = []
  for (let d = 1; d <= currentDay; d++) {
    const dayStr = `${year}-${month}-${String(d).padStart(2, "0")}`
    days.push({ date: dayStr, amount: -(10 + d * 3) })
  }
  return days
}

// Today — mix of expenses and income
const TODAY_CATEGORIES = [
  { categoryName: "Groceries",  amount: -45 },
  { categoryName: "Dining Out", amount: -30 },
  { categoryName: "Salary",     amount: 200 },
]

// Day yesterday — only expenses, no income
const YESTERDAY_CATEGORIES = [
  { categoryName: "Groceries",     amount: -20 },
  { categoryName: "Entertainment", amount: -15 },
]

// Day two days ago — different breakdown
const TWO_DAYS_AGO_CATEGORIES = [
  { categoryName: "Dining Out", amount: -55 },
  { categoryName: "Salary",     amount: 500 },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract the numeric amount from a DailyList row button. */
function getRowNet(button: HTMLElement): number {
  const amountSpan = button.querySelector(".font-mono.tabular-nums")
  if (!amountSpan) return NaN
  const text = amountSpan.textContent?.replace(/[^0-9.-]/g, "") ?? ""
  return parseFloat(text)
}

/**
 * Find the DailyList <button> whose text contains the given day label.
 * Filters by role="button" to distinguish from SVG/chart text nodes.
 */
function findDayButton(dayLabel: string): HTMLElement | null {
  const buttons = screen.getAllByRole("button")
  return buttons.find((btn) => btn.textContent?.includes(dayLabel)) ?? null
}

/** Find the Today row in DailyList (a <button> whose label starts with "Today"). */
function findTodayButton(): HTMLElement | null {
  const buttons = screen.getAllByRole("button")
  return buttons.find((btn) => {
    const text = btn.textContent?.trim() ?? ""
    return text.startsWith("Today") && /^Today[\s\S]*$/.test(text)
  }) ?? null
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks()

  // Seed categories so InsightComponent can look up colors/icons
  useCategoriesStore.setState({
    categories: CATEGORIES,
    isLoading: false,
    error: null,
  })

  // Mock successful API responses
  mockGetDailyReport.mockResolvedValue(buildDailyData())
  mockGetBookStats.mockResolvedValue({ transactionCount: 100, totalSum: -500 })

  // getCategoryReport returns different data depending on the day requested
  mockGetCategoryReport.mockImplementation((params) => {
    if (params?.from?.startsWith(todayStr)) {
      return Promise.resolve(TODAY_CATEGORIES)
    }
    if (params?.from?.startsWith(dayOffset(-1))) {
      return Promise.resolve(YESTERDAY_CATEGORIES)
    }
    if (params?.from?.startsWith(dayOffset(-2))) {
      return Promise.resolve(TWO_DAYS_AGO_CATEGORIES)
    }
    return Promise.resolve([])
  })
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("InsightDailyPage", () => {
  it("shows a skeleton while daily data is loading", () => {
    mockGetDailyReport.mockReturnValue(new Promise(() => {}))

    render(<InsightDailyPage />)

    const animatePulse = document.querySelectorAll(".animate-pulse")
    expect(animatePulse.length).toBeGreaterThan(0)
  })

  describe("initial load — Today", () => {
    beforeEach(async () => {
      render(<InsightDailyPage />)

      // Wait for all three parallel fetches to settle
      await waitFor(() => {
        expect(mockGetDailyReport).toHaveBeenCalledTimes(1)
        expect(mockGetCategoryReport).toHaveBeenCalledTimes(1)
        expect(mockGetBookStats).toHaveBeenCalledTimes(1)
      })
    })

    it("renders the page heading", () => {
      expect(screen.getByText("Daily Insight")).toBeInTheDocument()
    })

    it("shows the pie chart with today's expenses, income, and title", async () => {
      // Expenses: Groceries 45 + Dining Out 30 = 75  → "75"
      // Income: Salary 200  → "(200)"
      // Title: "Today"
      await waitFor(() => {
        expect(screen.getByText("75")).toBeInTheDocument()
        expect(screen.getByText("(200)")).toBeInTheDocument()
        // "Today" appears in both the pie SVG and DailyList — verify at least once
        expect(screen.getAllByText("Today").length).toBeGreaterThanOrEqual(1)
      })
    })

    it("renders the Running Balance area chart section", () => {
      expect(screen.getByText("Running Balance")).toBeInTheDocument()
    })

    it("shows DailyList with all days of the month so far", async () => {
      await waitFor(() => {
        expect(screen.getByText("Daily Net")).toBeInTheDocument()
      })

      const dayCount = new Date().getDate()

      // Wait for all day buttons to appear in the list
      await waitFor(() => {
        const rows = screen.getAllByRole("button")
        const dayButtons = rows.filter(
          (btn) =>
            btn.textContent?.includes("Today") ||
            /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+\d+/.test(btn.textContent?.trim() ?? ""),
        )
        expect(dayButtons).toHaveLength(dayCount)
      })
    })

    it("shows the correct net sum for Today's row", async () => {
      const dayOfMonth = new Date().getDate()
      const expected = -(10 + dayOfMonth * 3)

      const todayButton = findTodayButton()
      expect(todayButton).toBeInTheDocument()

      await waitFor(() => {
        expect(getRowNet(todayButton!)).toBe(expected)
      })
    })

    it("shows the correct net sum for a past day's row", async () => {
      const yesterdayStr = dayOffset(-1)
      const yesterdayFormatted = formatListDay(yesterdayStr)

      const yesterdayDate = new Date()
      yesterdayDate.setDate(yesterdayDate.getDate() - 1)
      const expected = -(10 + yesterdayDate.getDate() * 3)

      const yesterdayButton = findDayButton(yesterdayFormatted)
      expect(yesterdayButton).toBeInTheDocument()

      await waitFor(() => {
        expect(getRowNet(yesterdayButton!)).toBe(expected)
      })
    })
  })

  describe("day selection", () => {
    it("selecting a day updates the pie chart to that day's transactions", async () => {
      render(<InsightDailyPage />)

      // Wait for initial load (today's data)
      await waitFor(() => {
        expect(screen.getByText("75")).toBeInTheDocument()
        expect(screen.getByText("(200)")).toBeInTheDocument()
        expect(screen.getAllByText("Today").length).toBeGreaterThanOrEqual(1)
      })

      // Select yesterday
      const yesterdayStr = dayOffset(-1)
      const yesterdayFormatted = formatListDay(yesterdayStr)
      const yesterdayPieTitle = formatPieDay(yesterdayStr)

      const yesterdayButton = findDayButton(yesterdayFormatted)!
      fireEvent.click(yesterdayButton)

      // Yesterday's pie: Expenses 20 + 15 = 35, no income
      await waitFor(() => {
        expect(screen.getByText("35")).toBeInTheDocument()
        expect(screen.queryByText(/^\(\d+\)$/)).not.toBeInTheDocument()
      })

      // Pie title shows the selected day
      expect(screen.getByText(yesterdayPieTitle)).toBeInTheDocument()
      expect(yesterdayButton.className).toContain("border-l-primary")
    })

    it("selecting a different day changes the pie chart again", async () => {
      render(<InsightDailyPage />)

      await waitFor(() => {
        expect(screen.getByText("75")).toBeInTheDocument()
      })

      // Select yesterday
      const yesterdayStr = dayOffset(-1)
      const yesterdayFormatted = formatListDay(yesterdayStr)
      fireEvent.click(findDayButton(yesterdayFormatted)!)

      await waitFor(() => {
        expect(screen.getByText("35")).toBeInTheDocument()
      })

      // Now select two days ago
      const twoDaysAgoStr = dayOffset(-2)
      const twoDaysAgoFormatted = formatListDay(twoDaysAgoStr)
      const twoDaysAgoPieTitle = formatPieDay(twoDaysAgoStr)
      fireEvent.click(findDayButton(twoDaysAgoFormatted)!)

      // Two days ago: expenses = 55 (Dining Out), income = 500 (Salary) → "55" + "(500)"
      await waitFor(() => {
        expect(screen.getByText("55")).toBeInTheDocument()
        expect(screen.getByText("(500)")).toBeInTheDocument()
      })
      expect(screen.getByText(twoDaysAgoPieTitle)).toBeInTheDocument()
    })

    it("clicking Today resets the pie chart", async () => {
      render(<InsightDailyPage />)

      await waitFor(() => {
        expect(screen.getByText("75")).toBeInTheDocument()
      })

      // Go to yesterday first
      const yesterdayStr = dayOffset(-1)
      const yesterdayFormatted = formatListDay(yesterdayStr)
      fireEvent.click(findDayButton(yesterdayFormatted)!)

      await waitFor(() => {
        expect(screen.getByText("35")).toBeInTheDocument()
      })

      // Click "Today" to reset
      fireEvent.click(findTodayButton()!)

      await waitFor(() => {
        expect(screen.getByText("75")).toBeInTheDocument()
        expect(screen.getByText("(200)")).toBeInTheDocument()
        expect(screen.getAllByText("Today").length).toBeGreaterThanOrEqual(1)
      })
    })

    it("DailyList row amounts correspond to what the pie chart shows per day", async () => {
      render(<InsightDailyPage />)

      await waitFor(() => {
        expect(screen.getByText("75")).toBeInTheDocument()
      })

      // ── Yesterday: DailyList net vs pie chart ──
      const yesterdayDate = new Date()
      yesterdayDate.setDate(yesterdayDate.getDate() - 1)
      const yesterdayExpectedNet = -(10 + yesterdayDate.getDate() * 3)

      const yesterdayStr = dayOffset(-1)
      const yesterdayFormatted = formatListDay(yesterdayStr)
      const yesterdayButton = findDayButton(yesterdayFormatted)!
      expect(getRowNet(yesterdayButton)).toBe(yesterdayExpectedNet)

      fireEvent.click(yesterdayButton)
      await waitFor(() => {
        expect(screen.getByText("35")).toBeInTheDocument()
      })

      // ── Two days ago: DailyList net vs pie chart ──
      const twoDaysAgoDate = new Date()
      twoDaysAgoDate.setDate(twoDaysAgoDate.getDate() - 2)
      const twoDaysAgoExpectedNet = -(10 + twoDaysAgoDate.getDate() * 3)

      const twoDaysAgoStr = dayOffset(-2)
      const twoDaysAgoFormatted = formatListDay(twoDaysAgoStr)
      const twoDaysAgoButton = findDayButton(twoDaysAgoFormatted)!
      expect(getRowNet(twoDaysAgoButton)).toBe(twoDaysAgoExpectedNet)

      fireEvent.click(twoDaysAgoButton)
      await waitFor(() => {
        expect(screen.getByText("55")).toBeInTheDocument()
        expect(screen.getByText("(500)")).toBeInTheDocument()
      })

      // Verify data sources independently:
      //   - DailyList row shows the day's net from getDailyReport
      //   - Pie chart shows the category breakdown from getCategoryReport
      expect(getRowNet(twoDaysAgoButton)).toBe(twoDaysAgoExpectedNet)
    })
  })

  describe("error states", () => {
    it("shows an error message when the daily fetch fails", async () => {
      mockGetDailyReport.mockRejectedValue(new Error("Could not fetch daily data"))
      mockGetCategoryReport.mockResolvedValue([])
      mockGetBookStats.mockResolvedValue({ transactionCount: 0, totalSum: 0 })

      render(<InsightDailyPage />)

      await waitFor(() => {
        // Error appears in both DailyAreaChart and DailyList sections
        const errors = screen.getAllByText("Could not fetch daily data")
        expect(errors.length).toBeGreaterThanOrEqual(1)
      })
    })
  })
})