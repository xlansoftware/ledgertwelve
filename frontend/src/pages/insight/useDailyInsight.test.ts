// ---------------------------------------------------------------------------
// Unit tests — useDailyInsight hook
// ---------------------------------------------------------------------------

import { describe, expect, it, vi, beforeEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { useDailyInsight } from "./useDailyInsight"
import * as reportsService from "@/services/reportsService"
import type { CategoryReportRow } from "@/types"

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/services/reportsService", () => ({
  getCategoryReport: vi.fn(),
  getDailyReport: vi.fn(),
}))

const mockGetCategoryReport = vi.mocked(reportsService.getCategoryReport)
const mockGetDailyReport = vi.mocked(reportsService.getDailyReport)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const todayStr = new Date().toISOString().slice(0, 10)

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useDailyInsight", () => {
  it("fires both initial fetches on mount", async () => {
    mockGetCategoryReport.mockResolvedValue([])
    mockGetDailyReport.mockResolvedValue([])

    renderHook(() => useDailyInsight())

    await waitFor(() => {
      expect(mockGetCategoryReport).toHaveBeenCalledTimes(1)
      expect(mockGetDailyReport).toHaveBeenCalledTimes(1)
    })
  })

  it("shows loading states during fetches", () => {
    // Never resolve to keep loading true
    mockGetCategoryReport.mockReturnValue(new Promise(() => {}))
    mockGetDailyReport.mockReturnValue(new Promise(() => {}))

    const { result } = renderHook(() => useDailyInsight())

    expect(result.current.isLoadingToday).toBe(true)
    expect(result.current.isLoadingDaily).toBe(true)
  })

  it("returns today's expenses and income split correctly", async () => {
    mockGetCategoryReport.mockResolvedValue([
      { categoryName: "Groceries", amount: -45 },
      { categoryName: "Dining Out", amount: -30 },
      { categoryName: "Salary", amount: 200 },
    ])
    mockGetDailyReport.mockResolvedValue([])

    const { result } = renderHook(() => useDailyInsight())

    await waitFor(() => {
      expect(result.current.isLoadingToday).toBe(false)
    })

    expect(result.current.todayExpenses).toEqual({
      Groceries: 45,
      "Dining Out": 30,
    })
    expect(result.current.todayIncome).toEqual({
      Salary: 200,
    })
  })

  it("returns daily totals from the API", async () => {
    mockGetCategoryReport.mockResolvedValue([])
    mockGetDailyReport.mockResolvedValue([
      { date: daysAgo(1), amount: -45 },
      { date: todayStr, amount: -30 },
    ])

    const { result } = renderHook(() => useDailyInsight())

    await waitFor(() => {
      expect(result.current.isLoadingDaily).toBe(false)
    })

    // Should fill gaps to have exactly LAST_N_DAYS entries
    expect(result.current.dailyTotals.length).toBe(10)
    // Latest entry should be today
    expect(result.current.dailyTotals[result.current.dailyTotals.length - 1].date).toBe(todayStr)
  })

  it("returns accumulated data with projection appended", async () => {
    mockGetCategoryReport.mockResolvedValue([])
    mockGetDailyReport.mockResolvedValue([
      { date: daysAgo(9), amount: -45 },
      { date: daysAgo(8), amount: -30 },
      { date: daysAgo(7), amount: -20 },
      { date: daysAgo(6), amount: -25 },
      { date: daysAgo(5), amount: -40 },
      { date: daysAgo(4), amount: -35 },
      { date: daysAgo(3), amount: -50 },
      { date: daysAgo(2), amount: -30 },
      { date: daysAgo(1), amount: -45 },
      { date: todayStr, amount: -25 },
    ])

    const { result } = renderHook(() => useDailyInsight())

    await waitFor(() => {
      expect(result.current.isLoadingDaily).toBe(false)
    })

    // 10 historical + 10 projected = 20
    expect(result.current.accumulatedData.length).toBe(20)

    // First 10 should not be projected, last 10 should be projected
    const historical = result.current.accumulatedData.slice(0, 10)
    const projected = result.current.accumulatedData.slice(10)

    historical.forEach((point) => {
      expect("isProjected" in point).toBe(false)
    })
    projected.forEach((point) => {
      expect("isProjected" in point && point.isProjected).toBe(true)
    })
  })

  it("selectedDay starts as null (today)", async () => {
    mockGetCategoryReport.mockResolvedValue([])
    mockGetDailyReport.mockResolvedValue([])

    const { result } = renderHook(() => useDailyInsight())

    await waitFor(() => {
      expect(result.current.isLoadingToday).toBe(false)
    })

    expect(result.current.selectedDay).toBeNull()
  })

  it("selectDay updates selectedDay and fetches categories for that day", async () => {
    // First resolve the initial fetches
    mockGetCategoryReport.mockResolvedValueOnce([])
    mockGetDailyReport.mockResolvedValueOnce([])

    // Then handle the selected-day fetch
    const selectedCategoryData: CategoryReportRow[] = [
      { categoryName: "Food", amount: -30 },
      { categoryName: "Salary", amount: 100 },
    ]
    mockGetCategoryReport.mockResolvedValueOnce(selectedCategoryData)

    const { result } = renderHook(() => useDailyInsight())

    // Wait for initial fetches
    await waitFor(() => {
      expect(result.current.isLoadingToday).toBe(false)
      expect(result.current.isLoadingDaily).toBe(false)
    })

    // Select a specific day
    const targetDate = daysAgo(2)
    result.current.selectDay(targetDate)

    await waitFor(() => {
      expect(result.current.selectedDay).toBe(targetDate)
      expect(result.current.selectedDayExpenses).toEqual({ Food: 30 })
      expect(result.current.selectedDayIncome).toEqual({ Salary: 100 })
    })
  })

  it("selectDay(null) resets to today without a new fetch", async () => {
    mockGetCategoryReport.mockResolvedValueOnce([
      { categoryName: "Groceries", amount: -45 },
    ])
    mockGetDailyReport.mockResolvedValueOnce([])

    const { result } = renderHook(() => useDailyInsight())

    await waitFor(() => {
      expect(result.current.isLoadingToday).toBe(false)
    })

    // Select a day
    const targetDate = daysAgo(1)
    mockGetCategoryReport.mockResolvedValueOnce([])
    result.current.selectDay(targetDate)

    await waitFor(() => {
      expect(result.current.selectedDay).toBe(targetDate)
    })

    // Reset to today
    mockGetCategoryReport.mockClear() // clear the call count
    result.current.selectDay(null)

    await waitFor(() => {
      expect(result.current.selectedDay).toBeNull()
    })

    // Today's data stays unchanged, no extra fetch
    expect(mockGetCategoryReport).not.toHaveBeenCalled()
  })

  it("handles partial errors — today fails but daily still renders", async () => {
    mockGetCategoryReport.mockRejectedValueOnce(new Error("Today fetch failed"))
    mockGetDailyReport.mockResolvedValueOnce([
      { date: todayStr, amount: -45 },
    ])

    const { result } = renderHook(() => useDailyInsight())

    await waitFor(() => {
      expect(result.current.isLoadingToday).toBe(false)
      expect(result.current.isLoadingDaily).toBe(false)
    })

    expect(result.current.todayError).toBe("Today fetch failed")
    expect(result.current.dailyError).toBeNull()
    expect(result.current.dailyTotals.length).toBe(10)
  })

  it("handles partial errors — daily fails but today still renders", async () => {
    mockGetCategoryReport.mockResolvedValueOnce([
      { categoryName: "Groceries", amount: -45 },
    ])
    mockGetDailyReport.mockRejectedValueOnce(new Error("Daily fetch failed"))

    const { result } = renderHook(() => useDailyInsight())

    await waitFor(() => {
      expect(result.current.isLoadingToday).toBe(false)
      expect(result.current.isLoadingDaily).toBe(false)
    })

    expect(result.current.todayError).toBeNull()
    expect(result.current.dailyError).toBe("Daily fetch failed")
    expect(result.current.todayExpenses).toEqual({ Groceries: 45 })
  })
})