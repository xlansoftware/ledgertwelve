// ---------------------------------------------------------------------------
// Unit tests — useMonthlyInsight hook
// ---------------------------------------------------------------------------

import { describe, expect, it, vi, beforeEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { useMonthlyInsight } from "./useMonthlyInsight"
import * as reportsService from "@/services/reportsService"
import * as booksService from "@/services/booksService"
import type { CategoryReportRow, MonthlyReportRow, AverageReportDto } from "@/types"

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
// Helpers
// ---------------------------------------------------------------------------

const now = new Date()
const currentYear = now.getFullYear()
const currentMonth = now.getMonth() + 1
const currentMonthStr = `${currentYear}-${String(currentMonth).padStart(2, "0")}`

function monthPeriod(n: number): string {
  return `${currentYear}-${String(n).padStart(2, "0")}`
}

/** Build monthly report rows for Jan through current month */
function buildMonthlyData(): MonthlyReportRow[] {
  const rows: MonthlyReportRow[] = []
  for (let m = 1; m <= currentMonth; m++) {
    rows.push({ period: monthPeriod(m), amount: -(m * 100 + 50) })
  }
  return rows
}

const TODAY_CATEGORIES = [
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

beforeEach(() => {
  vi.clearAllMocks()

  mockGetMonthlyReport.mockResolvedValue(buildMonthlyData())
  mockGetBookStats.mockResolvedValue({ transactionCount: 100, totalSum: -500 })

  // Default: getMonthlyAverage succeeds
  mockGetMonthlyAverage.mockResolvedValue({ average: -1380.0, count: 12 })

  // Default: return today's categories for the initial (current month) fetch
  mockGetCategoryReport.mockImplementation((params) => {
    if (params?.from?.startsWith(currentMonthStr)) {
      return Promise.resolve(TODAY_CATEGORIES)
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
// Tests
// ---------------------------------------------------------------------------

describe("useMonthlyInsight", () => {
  it("fires all three parallel fetches on mount", async () => {
    mockGetMonthlyReport.mockResolvedValue([])
    mockGetBookStats.mockResolvedValue({ transactionCount: 0, totalSum: 0 })
    mockGetCategoryReport.mockResolvedValue([])

    renderHook(() => useMonthlyInsight())

    await waitFor(() => {
      expect(mockGetMonthlyReport).toHaveBeenCalledTimes(1)
      expect(mockGetBookStats).toHaveBeenCalledTimes(1)
      expect(mockGetCategoryReport).toHaveBeenCalledTimes(1)
    })
  })

  it("shows loading states during fetches", () => {
    // Never resolve to keep loading true
    mockGetMonthlyReport.mockReturnValue(new Promise(() => {}))
    mockGetBookStats.mockReturnValue(new Promise(() => {}))
    mockGetCategoryReport.mockReturnValue(new Promise(() => {}))

    const { result } = renderHook(() => useMonthlyInsight())

    expect(result.current.isLoadingPie).toBe(true)
    expect(result.current.isLoadingMonthly).toBe(true)
  })

  it("returns expenses and income split correctly for current month", async () => {
    const { result } = renderHook(() => useMonthlyInsight())

    await waitFor(() => {
      expect(result.current.isLoadingPie).toBe(false)
    })

    expect(result.current.expenses).toEqual({
      Groceries: 45,
      "Dining Out": 30,
    })
    expect(result.current.income).toEqual({
      Salary: 200,
    })
  })

  it("returns monthly totals from the API, filled for all months Jan → current", async () => {
    const { result } = renderHook(() => useMonthlyInsight())

    await waitFor(() => {
      expect(result.current.isLoadingMonthly).toBe(false)
    })

    // Should have currentMonth entries (Jan through current month)
    expect(result.current.monthlyTotals.length).toBe(currentMonth)
    // Last entry should be current month
    expect(result.current.monthlyTotals[result.current.monthlyTotals.length - 1].period).toBe(currentMonthStr)
    // Each month should have a non-zero amount
    result.current.monthlyTotals.forEach((row, index) => {
      const m = index + 1
      expect(row.amount).toBe(-(m * 100 + 50))
    })
  })

  it("returns accumulated data with projection appended", async () => {
    const { result } = renderHook(() => useMonthlyInsight())

    await waitFor(() => {
      expect(result.current.isLoadingMonthly).toBe(false)
    })

    const remainingMonths = 12 - currentMonth
    const total = currentMonth + remainingMonths

    // historical + projected = total
    expect(result.current.accumulatedData.length).toBe(total)

    // First currentMonth should not be projected, last remainingMonths should be projected
    const historical = result.current.accumulatedData.slice(0, currentMonth)
    const projected = result.current.accumulatedData.slice(currentMonth)

    historical.forEach((point) => {
      expect("isProjected" in point).toBe(false)
    })
    projected.forEach((point) => {
      expect("isProjected" in point && point.isProjected).toBe(true)
    })
  })

  it("returns opening balance seeded accumulation", async () => {
    mockGetBookStats.mockResolvedValue({ transactionCount: 5, totalSum: -1000 })

    const { result } = renderHook(() => useMonthlyInsight())

    await waitFor(() => {
      expect(result.current.isLoadingMonthly).toBe(false)
    })

    // First accumulated point should be opening balance + first month's amount
    // openingBalance = -1000, first month = -(1*100+50) = -150
    // cumulative = -1000 + (-150) = -1150
    const firstHistorical = result.current.accumulatedData[0]
    expect(firstHistorical.cumulative).toBe(-1150)
  })

  it("selectedMonth starts as null (current month)", async () => {
    mockGetMonthlyReport.mockResolvedValue([])
    mockGetBookStats.mockResolvedValue({ transactionCount: 0, totalSum: 0 })
    mockGetCategoryReport.mockResolvedValue([])

    const { result } = renderHook(() => useMonthlyInsight())

    await waitFor(() => {
      expect(result.current.isLoadingPie).toBe(false)
    })

    expect(result.current.selectedMonth).toBeNull()
  })

  it("selectMonth updates selectedMonth and triggers category fetch", async () => {
    // First resolve the initial fetch (for current month)
    mockGetCategoryReport.mockResolvedValueOnce(TODAY_CATEGORIES)
    mockGetMonthlyReport.mockResolvedValueOnce(buildMonthlyData())
    mockGetBookStats.mockResolvedValueOnce({ transactionCount: 100, totalSum: -500 })

    const { result } = renderHook(() => useMonthlyInsight())

    // Wait for initial fetches
    await waitFor(() => {
      expect(result.current.isLoadingPie).toBe(false)
      expect(result.current.isLoadingMonthly).toBe(false)
    })

    // Select January
    result.current.selectMonth(monthPeriod(1))

    await waitFor(() => {
      expect(result.current.selectedMonth).toBe(monthPeriod(1))
      expect(result.current.expenses).toEqual({
        Groceries: 60,
        "Rent / Mortgage": 1200,
      })
      expect(result.current.income).toEqual({})
    })
  })

  it("selectMonth(null) resets to current month and fetches its categories", async () => {
    // Initial fetch (current month)
    mockGetCategoryReport.mockResolvedValueOnce(TODAY_CATEGORIES)
    mockGetMonthlyReport.mockResolvedValueOnce(buildMonthlyData())
    mockGetBookStats.mockResolvedValueOnce({ transactionCount: 100, totalSum: -500 })

    const { result } = renderHook(() => useMonthlyInsight())

    await waitFor(() => {
      expect(result.current.isLoadingPie).toBe(false)
    })

    // Select January
    mockGetCategoryReport.mockResolvedValueOnce(JANUARY_CATEGORIES)
    result.current.selectMonth(monthPeriod(1))

    await waitFor(() => {
      expect(result.current.selectedMonth).toBe(monthPeriod(1))
    })

    // Reset to current month
    mockGetCategoryReport.mockResolvedValueOnce(TODAY_CATEGORIES)
    result.current.selectMonth(null)

    await waitFor(() => {
      expect(result.current.selectedMonth).toBeNull()
      expect(result.current.isLoadingPie).toBe(false)
    })

    // A new fetch was triggered for current month data
    expect(mockGetCategoryReport).toHaveBeenCalledTimes(3) // initial + january + reset
  })

  it("handles partial errors — pie fails but monthly still renders", async () => {
    mockGetCategoryReport.mockRejectedValueOnce(new Error("Pie fetch failed"))
    mockGetMonthlyReport.mockResolvedValueOnce(buildMonthlyData())
    mockGetBookStats.mockResolvedValueOnce({ transactionCount: 100, totalSum: -500 })

    const { result } = renderHook(() => useMonthlyInsight())

    await waitFor(() => {
      expect(result.current.isLoadingPie).toBe(false)
      expect(result.current.isLoadingMonthly).toBe(false)
    })

    // Pie data falls back to empty
    expect(result.current.expenses).toEqual({})
    expect(result.current.income).toEqual({})
    // Monthly data still renders
    expect(result.current.monthlyError).toBeNull()
    expect(result.current.monthlyTotals.length).toBe(currentMonth)
  })

  it("handles partial errors — monthly fails but pie still renders", async () => {
    mockGetCategoryReport.mockResolvedValueOnce(TODAY_CATEGORIES)
    mockGetMonthlyReport.mockRejectedValueOnce(new Error("Monthly fetch failed"))
    mockGetBookStats.mockResolvedValueOnce({ transactionCount: 100, totalSum: -500 })

    const { result } = renderHook(() => useMonthlyInsight())

    await waitFor(() => {
      expect(result.current.isLoadingPie).toBe(false)
      expect(result.current.isLoadingMonthly).toBe(false)
    })

    expect(result.current.monthlyError).toBe("Monthly fetch failed")
    expect(result.current.expenses).toEqual({ Groceries: 45, "Dining Out": 30 })
  })

  it("uses the external average for projection when available", async () => {
    mockGetCategoryReport.mockResolvedValueOnce(TODAY_CATEGORIES)
    mockGetMonthlyReport.mockResolvedValueOnce(buildMonthlyData())
    mockGetBookStats.mockResolvedValueOnce({ transactionCount: 100, totalSum: -500 })
    mockGetMonthlyAverage.mockResolvedValueOnce({ average: -1200, count: 12 })

    const { result } = renderHook(() => useMonthlyInsight())

    await waitFor(() => {
      expect(result.current.isLoadingMonthly).toBe(false)
    })

    const remainingMonths = 12 - currentMonth
    const total = currentMonth + remainingMonths

    expect(result.current.accumulatedData.length).toBe(total)
    expect(result.current.averageChange).toBe(-1200)
  })

  it("falls back to short-window projection when average API fails", async () => {
    mockGetCategoryReport.mockResolvedValueOnce(TODAY_CATEGORIES)
    mockGetMonthlyReport.mockResolvedValueOnce(buildMonthlyData())
    mockGetBookStats.mockResolvedValueOnce({ transactionCount: 100, totalSum: -500 })
    mockGetMonthlyAverage.mockRejectedValueOnce(new Error("Average API failed"))

    const { result } = renderHook(() => useMonthlyInsight())

    await waitFor(() => {
      expect(result.current.isLoadingMonthly).toBe(false)
    })

    // averageChange should be null (fell back)
    expect(result.current.averageChange).toBeNull()
    // accumulatedData should still exist (fallback projection)
    expect(result.current.accumulatedData.length).toBeGreaterThan(0)
  })

  it("shows loading average state during fetch", () => {
    mockGetMonthlyReport.mockReturnValue(new Promise(() => {}))
    mockGetBookStats.mockReturnValue(new Promise(() => {}))
    mockGetCategoryReport.mockReturnValue(new Promise(() => {}))
    mockGetMonthlyAverage.mockReturnValue(new Promise(() => {}))

    const { result } = renderHook(() => useMonthlyInsight())

    expect(result.current.isLoadingAverage).toBe(true)
  })
})
