// ---------------------------------------------------------------------------
// Unit tests — useMonthlyInsight hook
// ---------------------------------------------------------------------------

import { describe, expect, it, vi, beforeEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { useMonthlyInsight } from "./useMonthlyInsight"
import * as reportsService from "@/services/reportsService"
import type { MonthlyReportRow, TotalsReportRow } from "@/types"

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
// Helpers
// ---------------------------------------------------------------------------

const now = new Date()
const currentYear = now.getFullYear()
const currentYearStr = String(currentYear)
const currentMonth = now.getMonth() + 1
const currentMonthStr = `${currentYear}-${String(currentMonth).padStart(2, "0")}`
const prevYear = currentYear - 1
const prevYearStr = String(prevYear)

function monthPeriod(year: number, n: number): string {
  return `${year}-${String(n).padStart(2, "0")}`
}

/** Build monthly report rows for Jan through current month of the current year. */
function buildMonthlyData(): MonthlyReportRow[] {
  const rows: MonthlyReportRow[] = []
  for (let m = 1; m <= currentMonth; m++) {
    rows.push({ period: monthPeriod(currentYear, m), amount: -(m * 100 + 50) })
  }
  return rows
}

/** Build sparse monthly rows for a past year (months 1, 3, 6, 12). */
function buildPrevYearData(): MonthlyReportRow[] {
  return [
    { period: monthPeriod(prevYear, 1), amount: -100 },
    { period: monthPeriod(prevYear, 3), amount: -200 },
    { period: monthPeriod(prevYear, 6), amount: 300 },
    { period: monthPeriod(prevYear, 12), amount: -400 },
  ]
}

/** Default year list: only the current year has transactions. */
function defaultYearTotals(): TotalsReportRow[] {
  return [{ period: currentYearStr, income: 5000, expense: -4000, net: 1000 }]
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

const PREV_DECEMBER_CATEGORIES = [
  { categoryName: "Gifts", amount: -250 },
]

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks()

  mockGetTotals.mockResolvedValue(defaultYearTotals())
  mockGetMonthlyReport.mockResolvedValue(buildMonthlyData())
  mockGetMonthlyAverage.mockResolvedValue({ average: -1380.0, count: 12 })

  // getCategoryReport returns different data depending on the month
  mockGetCategoryReport.mockImplementation((params) => {
    if (params?.from?.startsWith(currentMonthStr)) {
      return Promise.resolve(TODAY_CATEGORIES)
    }
    if (params?.from?.startsWith(monthPeriod(prevYear, 12))) {
      return Promise.resolve(PREV_DECEMBER_CATEGORIES)
    }
    if (params?.from?.startsWith(monthPeriod(currentYear, 1))) {
      return Promise.resolve(JANUARY_CATEGORIES)
    }
    return Promise.resolve([])
  })
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useMonthlyInsight", () => {
  it("fetches the year list, monthly totals, average, and pie on mount", async () => {
    mockGetMonthlyReport.mockResolvedValue([])
    mockGetCategoryReport.mockResolvedValue([])

    renderHook(() => useMonthlyInsight())

    await waitFor(() => {
      expect(mockGetTotals).toHaveBeenCalledTimes(1)
      expect(mockGetTotals).toHaveBeenCalledWith({ period: "year" })
      expect(mockGetMonthlyReport).toHaveBeenCalledTimes(1)
      expect(mockGetMonthlyAverage).toHaveBeenCalledTimes(1)
      expect(mockGetCategoryReport).toHaveBeenCalledTimes(1)
    })
  })

  it("shows loading states during fetches", () => {
    // Never resolve to keep loading true
    mockGetTotals.mockReturnValue(new Promise(() => {}))
    mockGetMonthlyReport.mockReturnValue(new Promise(() => {}))
    mockGetMonthlyAverage.mockReturnValue(new Promise(() => {}))
    mockGetCategoryReport.mockReturnValue(new Promise(() => {}))

    const { result } = renderHook(() => useMonthlyInsight())

    expect(result.current.isLoadingPie).toBe(true)
    expect(result.current.isLoadingMonthly).toBe(true)
    expect(result.current.isLoadingYears).toBe(true)
  })

  it("exposes the year list and nets from the totals endpoint", async () => {
    mockGetTotals.mockResolvedValue([
      { period: String(prevYear - 1), income: 3000, expense: -2500, net: 500 },
      { period: prevYearStr, income: 2000, expense: -1500, net: 500 },
      { period: currentYearStr, income: 5000, expense: -4000, net: 1000 },
    ])

    const { result } = renderHook(() => useMonthlyInsight())

    await waitFor(() => {
      expect(result.current.isLoadingYears).toBe(false)
    })

    expect(result.current.years).toEqual([String(prevYear - 1), prevYearStr, currentYearStr])
    expect(result.current.yearNets[prevYearStr]).toBe(500)
  })

  it("defaults the active year to the most recent year with transactions", async () => {
    mockGetTotals.mockResolvedValue([
      { period: String(prevYear - 1), income: 3000, expense: -2500, net: 500 },
      { period: prevYearStr, income: 2000, expense: -1500, net: 500 },
    ])
    // No current-year rows: the current year has no transactions yet.
    mockGetMonthlyReport.mockImplementation((params) => {
      if (params?.from?.startsWith(prevYearStr)) {
        return Promise.resolve(buildPrevYearData())
      }
      return Promise.resolve([])
    })

    const { result } = renderHook(() => useMonthlyInsight())

    await waitFor(() => {
      expect(result.current.activeYear).toBe(prevYearStr)
    })
    expect(result.current.isCurrentYear).toBe(false)
    expect(result.current.selectedYear).toBeNull()

    // Pie defaults to the previous year's last month with transactions.
    await waitFor(() => {
      expect(result.current.pieMonth).toBe(monthPeriod(prevYear, 12))
    })
    // Monthly list shows all 12 months of that year.
    expect(result.current.monthlyTotals).toHaveLength(12)
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

  it("returns accumulated data with projection appended for the current year", async () => {
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

  it("accumulation starts from a zero seed (each year stands on its own)", async () => {
    const { result } = renderHook(() => useMonthlyInsight())

    await waitFor(() => {
      expect(result.current.isLoadingMonthly).toBe(false)
    })

    // seed = 0, first month = -(1*100+50) = -150
    const firstHistorical = result.current.accumulatedData[0]
    expect(firstHistorical.cumulative).toBe(-150)
  })

  it("selectedMonth starts as null (default month for the active year)", async () => {
    mockGetMonthlyReport.mockResolvedValue([])
    mockGetCategoryReport.mockResolvedValue([])

    const { result } = renderHook(() => useMonthlyInsight())

    await waitFor(() => {
      expect(result.current.isLoadingPie).toBe(false)
    })

    expect(result.current.selectedMonth).toBeNull()
  })

  it("selectMonth updates selectedMonth and triggers category fetch", async () => {
    mockGetCategoryReport.mockResolvedValueOnce(TODAY_CATEGORIES)
    mockGetMonthlyReport.mockResolvedValueOnce(buildMonthlyData())

    const { result } = renderHook(() => useMonthlyInsight())

    // Wait for initial fetches
    await waitFor(() => {
      expect(result.current.isLoadingPie).toBe(false)
      expect(result.current.isLoadingMonthly).toBe(false)
    })

    // Select January
    result.current.selectMonth(monthPeriod(currentYear, 1))

    await waitFor(() => {
      expect(result.current.selectedMonth).toBe(monthPeriod(currentYear, 1))
      expect(result.current.expenses).toEqual({
        Groceries: 60,
        "Rent / Mortgage": 1200,
      })
      expect(result.current.income).toEqual({})
    })
  })

  it("selectMonth(null) resets to the current month and fetches its categories", async () => {
    mockGetCategoryReport.mockResolvedValueOnce(TODAY_CATEGORIES)
    mockGetMonthlyReport.mockResolvedValueOnce(buildMonthlyData())

    const { result } = renderHook(() => useMonthlyInsight())

    await waitFor(() => {
      expect(result.current.isLoadingPie).toBe(false)
    })

    // Select January
    mockGetCategoryReport.mockResolvedValueOnce(JANUARY_CATEGORIES)
    result.current.selectMonth(monthPeriod(currentYear, 1))

    await waitFor(() => {
      expect(result.current.selectedMonth).toBe(monthPeriod(currentYear, 1))
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

  it("selectYear refetches monthly totals for that year and resets the month", async () => {
    mockGetMonthlyReport.mockImplementation((params) => {
      if (params?.from?.startsWith(prevYearStr)) {
        return Promise.resolve(buildPrevYearData())
      }
      return Promise.resolve(buildMonthlyData())
    })

    const { result } = renderHook(() => useMonthlyInsight())

    await waitFor(() => {
      expect(result.current.isLoadingMonthly).toBe(false)
    })

    // Switch to the previous year
    result.current.selectYear(prevYearStr)

    await waitFor(() => {
      expect(result.current.activeYear).toBe(prevYearStr)
      expect(mockGetMonthlyReport).toHaveBeenCalledWith(
        expect.objectContaining({ from: `${prevYearStr}-01-01`, to: `${currentYearStr}-01-01` }),
      )
    })

    // Month selection is reset and the pie defaults to the year's last month with transactions
    await waitFor(() => {
      expect(result.current.pieMonth).toBe(monthPeriod(prevYear, 12))
    })
    expect(result.current.selectedMonth).toBeNull()

    // All 12 months are filled for the past year
    await waitFor(() => {
      expect(result.current.monthlyTotals).toHaveLength(12)
    })
    expect(result.current.monthlyTotals[11].period).toBe(monthPeriod(prevYear, 12))

    // The pie shows that year's last month with transactions
    await waitFor(() => {
      expect(mockGetCategoryReport).toHaveBeenCalledWith(
        expect.objectContaining({ from: `${monthPeriod(prevYear, 12)}-01` }),
      )
    })
  })

  it("suppresses projection and skips the rolling average for past years", async () => {
    mockGetMonthlyReport.mockImplementation((params) => {
      if (params?.from?.startsWith(prevYearStr)) {
        return Promise.resolve(buildPrevYearData())
      }
      return Promise.resolve(buildMonthlyData())
    })

    const { result } = renderHook(() => useMonthlyInsight())

    await waitFor(() => {
      expect(result.current.isLoadingMonthly).toBe(false)
    })

    const averageCallsOnMount = mockGetMonthlyAverage.mock.calls.length
    expect(averageCallsOnMount).toBe(1)

    result.current.selectYear(prevYearStr)

    await waitFor(() => {
      expect(result.current.activeYear).toBe(prevYearStr)
    })
    await waitFor(() => {
      expect(result.current.monthlyTotals).toHaveLength(12)
    })

    // No further rolling-average fetch for the past year
    expect(mockGetMonthlyAverage).toHaveBeenCalledTimes(averageCallsOnMount)
    expect(result.current.isLoadingAverage).toBe(false)

    // No projected rows — the accumulated curve ends at December
    expect(result.current.accumulatedData).toHaveLength(12)
    result.current.accumulatedData.forEach((point) => {
      expect("isProjected" in point && point.isProjected).toBe(false)
    })

    // Chart header uses the year's own stats: sum = -400, avg = -100
    expect(result.current.chartAverage).toBe(-100)
    expect(result.current.chartEndValue).toBe(-400)
  })

  it("switching back to the current year restores the default month and projection", async () => {
    mockGetMonthlyReport.mockImplementation((params) => {
      if (params?.from?.startsWith(prevYearStr)) {
        return Promise.resolve(buildPrevYearData())
      }
      return Promise.resolve(buildMonthlyData())
    })

    const { result } = renderHook(() => useMonthlyInsight())

    await waitFor(() => {
      expect(result.current.isLoadingMonthly).toBe(false)
    })

    // Go to the previous year, then back to the current year
    result.current.selectYear(prevYearStr)
    await waitFor(() => {
      expect(result.current.activeYear).toBe(prevYearStr)
    })

    result.current.selectYear(null)

    await waitFor(() => {
      expect(result.current.activeYear).toBe(currentYearStr)
    })

    // Month selection resets to null → pie returns to "This Month"
    expect(result.current.selectedMonth).toBeNull()
    expect(result.current.pieMonth).toBe(currentMonthStr)

    // Projection returns
    const remainingMonths = 12 - currentMonth
    expect(result.current.accumulatedData).toHaveLength(12)
    const projected = result.current.accumulatedData.slice(currentMonth)
    expect(projected).toHaveLength(remainingMonths)
    projected.forEach((point) => {
      expect("isProjected" in point && point.isProjected).toBe(true)
    })
  })

  it("handles partial errors — pie fails but monthly still renders", async () => {
    mockGetCategoryReport.mockRejectedValueOnce(new Error("Pie fetch failed"))
    mockGetMonthlyReport.mockResolvedValueOnce(buildMonthlyData())

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

    const { result } = renderHook(() => useMonthlyInsight())

    await waitFor(() => {
      expect(result.current.isLoadingPie).toBe(false)
      expect(result.current.isLoadingMonthly).toBe(false)
    })

    expect(result.current.monthlyError).toBe("Monthly fetch failed")
    expect(result.current.expenses).toEqual({ Groceries: 45, "Dining Out": 30 })
  })

  it("handles partial errors — year list fails but the page still shows the current year", async () => {
    mockGetTotals.mockRejectedValueOnce(new Error("Year list failed"))
    mockGetMonthlyReport.mockResolvedValueOnce(buildMonthlyData())

    const { result } = renderHook(() => useMonthlyInsight())

    await waitFor(() => {
      expect(result.current.isLoadingYears).toBe(false)
    })

    expect(result.current.yearsError).toBe("Year list failed")
    expect(result.current.years).toEqual([])
    // Falls back to the current year
    expect(result.current.activeYear).toBe(currentYearStr)
    expect(result.current.monthlyTotals.length).toBe(currentMonth)
  })

  it("uses the external average for projection when available", async () => {
    mockGetCategoryReport.mockResolvedValueOnce(TODAY_CATEGORIES)
    mockGetMonthlyReport.mockResolvedValueOnce(buildMonthlyData())
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
    mockGetTotals.mockReturnValue(new Promise(() => {}))
    mockGetMonthlyReport.mockReturnValue(new Promise(() => {}))
    mockGetMonthlyAverage.mockReturnValue(new Promise(() => {}))
    mockGetCategoryReport.mockReturnValue(new Promise(() => {}))

    const { result } = renderHook(() => useMonthlyInsight())

    expect(result.current.isLoadingAverage).toBe(true)
  })
})
