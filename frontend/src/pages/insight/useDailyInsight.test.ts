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

    expect(result.current.isLoadingPie).toBe(true)
    expect(result.current.isLoadingDaily).toBe(true)
  })

  it("returns expenses and income split correctly for today", async () => {
    mockGetCategoryReport.mockResolvedValue([
      { categoryName: "Groceries", amount: -45 },
      { categoryName: "Dining Out", amount: -30 },
      { categoryName: "Salary", amount: 200 },
    ])
    mockGetDailyReport.mockResolvedValue([])

    const { result } = renderHook(() => useDailyInsight())

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

    const dayOfMonth = new Date().getDate()
    // Should fill gaps from start of month to today
    expect(result.current.dailyTotals.length).toBe(dayOfMonth)
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

    const dayOfMonth = new Date().getDate()
    const lastDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
    const daysRemaining = lastDayOfMonth - dayOfMonth
    const total = dayOfMonth + daysRemaining

    // historical + projected = total
    expect(result.current.accumulatedData.length).toBe(total)

    // First dayOfMonth should not be projected, last daysRemaining should be projected
    const historical = result.current.accumulatedData.slice(0, dayOfMonth)
    const projected = result.current.accumulatedData.slice(dayOfMonth)

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
      expect(result.current.isLoadingPie).toBe(false)
    })

    expect(result.current.selectedDay).toBeNull()
  })

  it("selectDay updates selectedDay and fetches categories for that day", async () => {
    // First resolve the initial fetch (for today)
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
      expect(result.current.isLoadingPie).toBe(false)
      expect(result.current.isLoadingDaily).toBe(false)
    })

    // Select a specific day
    const targetDate = daysAgo(2)
    result.current.selectDay(targetDate)

    await waitFor(() => {
      expect(result.current.selectedDay).toBe(targetDate)
      expect(result.current.expenses).toEqual({ Food: 30 })
      expect(result.current.income).toEqual({ Salary: 100 })
    })
  })

  it("selectDay(null) resets to today and fetches today's categories", async () => {
    // Initial fetch (today)
    mockGetCategoryReport.mockResolvedValueOnce([
      { categoryName: "Groceries", amount: -45 },
    ])
    mockGetDailyReport.mockResolvedValueOnce([])

    const { result } = renderHook(() => useDailyInsight())

    await waitFor(() => {
      expect(result.current.isLoadingPie).toBe(false)
    })

    // Select a specific day
    const targetDate = daysAgo(1)
    mockGetCategoryReport.mockResolvedValueOnce([])
    result.current.selectDay(targetDate)

    await waitFor(() => {
      expect(result.current.selectedDay).toBe(targetDate)
    })

    // Reset to today — triggers a new fetch for today's categories
    mockGetCategoryReport.mockResolvedValueOnce([
      { categoryName: "Groceries", amount: -45 },
    ])
    result.current.selectDay(null)

    await waitFor(() => {
      expect(result.current.selectedDay).toBeNull()
      expect(result.current.isLoadingPie).toBe(false)
    })

    // A new fetch was triggered for today's data
    expect(mockGetCategoryReport).toHaveBeenCalledTimes(3) // initial + day + today reset
  })

  it("handles partial errors — pie fails but daily still renders", async () => {
    mockGetCategoryReport.mockRejectedValueOnce(new Error("Pie fetch failed"))
    mockGetDailyReport.mockResolvedValueOnce([
      { date: todayStr, amount: -45 },
    ])

    const { result } = renderHook(() => useDailyInsight())

    await waitFor(() => {
      expect(result.current.isLoadingPie).toBe(false)
      expect(result.current.isLoadingDaily).toBe(false)
    })

    // Pie data falls back to empty
    expect(result.current.expenses).toEqual({})
    expect(result.current.income).toEqual({})
    // Daily data still renders
    const dayOfMonth = new Date().getDate()
    expect(result.current.dailyError).toBeNull()
    expect(result.current.dailyTotals.length).toBe(dayOfMonth)
  })

  it("handles partial errors — daily fails but pie still renders", async () => {
    mockGetCategoryReport.mockResolvedValueOnce([
      { categoryName: "Groceries", amount: -45 },
    ])
    mockGetDailyReport.mockRejectedValueOnce(new Error("Daily fetch failed"))

    const { result } = renderHook(() => useDailyInsight())

    await waitFor(() => {
      expect(result.current.isLoadingPie).toBe(false)
      expect(result.current.isLoadingDaily).toBe(false)
    })

    expect(result.current.dailyError).toBe("Daily fetch failed")
    expect(result.current.expenses).toEqual({ Groceries: 45 })
  })
})