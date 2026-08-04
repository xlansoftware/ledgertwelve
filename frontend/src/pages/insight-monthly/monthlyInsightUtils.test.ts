// ---------------------------------------------------------------------------
// Unit tests — monthlyInsightUtils (pure functions)
// ---------------------------------------------------------------------------

import { describe, expect, it } from "vitest"
import {
  fillYearMonths,
  lastMonthWithTransactions,
  yearStats,
  resolveDefaultYear,
} from "./monthlyInsightUtils"
import type { MonthlyReportRow } from "@/types"

const YEAR = "2024"

function row(period: string, amount: number): MonthlyReportRow {
  return { period, amount }
}

describe("fillYearMonths", () => {
  it("fills Jan → currentMonth for the current year", () => {
    const rows = [row("2026-01", -100), row("2026-03", 50)]
    const filled = fillYearMonths(rows, "2026", true, 4)

    expect(filled).toEqual([
      { period: "2026-01", amount: -100 },
      { period: "2026-02", amount: 0 },
      { period: "2026-03", amount: 50 },
      { period: "2026-04", amount: 0 },
    ])
  })

  it("fills all 12 months for a past year (Jan–Dec)", () => {
    const rows = [row("2024-12", -300)]
    const filled = fillYearMonths(rows, YEAR, false, 7 /* current month irrelevant */)

    expect(filled).toHaveLength(12)
    expect(filled[0]).toEqual({ period: "2024-01", amount: 0 })
    expect(filled[11]).toEqual({ period: "2024-12", amount: -300 })
  })

  it("discards periods outside the requested year", () => {
    const rows = [row("2024-06", -50), row("2025-06", 999), row("2023-06", 999)]
    const filled = fillYearMonths(rows, YEAR, false, 12)

    const total = filled.reduce((sum, r) => sum + r.amount, 0)
    expect(total).toBe(-50)
    expect(filled.find((r) => r.period === "2025-06")).toBeUndefined()
  })

  it("zero-fills when no rows exist for the year", () => {
    const filled = fillYearMonths([], YEAR, false, 12)
    expect(filled).toHaveLength(12)
    filled.forEach((r) => expect(r.amount).toBe(0))
  })

  it("returns an empty list when the year has no months and the current month is 0", () => {
    // Degenerate input — defensive: no months produced when the range is empty.
    const filled = fillYearMonths([], "2026", true, 0)
    expect(filled).toEqual([])
  })
})

describe("lastMonthWithTransactions", () => {
  it("returns the highest YYYY-MM period for the year", () => {
    const rows = [row("2024-01", 1), row("2024-06", 1), row("2024-03", 1)]
    expect(lastMonthWithTransactions(rows, YEAR)).toBe("2024-06")
  })

  it("ignores periods from other years", () => {
    const rows = [row("2023-12", 1), row("2025-01", 1)]
    expect(lastMonthWithTransactions(rows, YEAR)).toBeNull()
  })

  it("returns null for a year with no transactions", () => {
    expect(lastMonthWithTransactions([], YEAR)).toBeNull()
  })
})

describe("yearStats", () => {
  it("computes average over months with transactions and year-end net", () => {
    const rows = [
      row("2024-01", -100),
      row("2024-02", -200),
      row("2024-03", -300),
    ]
    const stats = yearStats(rows, YEAR)

    expect(stats.averageMonthlyNet).toBe(-200)
    expect(stats.yearEndNet).toBe(-600)
  })

  it("excludes months without transactions from the divisor", () => {
    // Only 2 of the 12 months have transactions.
    const rows = [row("2024-01", -100), row("2024-12", 300)]
    const stats = yearStats(rows, YEAR)

    expect(stats.averageMonthlyNet).toBe(100) // (300 - 100) / 2
    expect(stats.yearEndNet).toBe(200)
  })

  it("ignores periods outside the year", () => {
    const rows = [row("2024-06", -50), row("2025-06", 5000)]
    const stats = yearStats(rows, YEAR)

    expect(stats.averageMonthlyNet).toBe(-50)
    expect(stats.yearEndNet).toBe(-50)
  })

  it("returns zeros when the year has no rows", () => {
    const stats = yearStats([], YEAR)
    expect(stats).toEqual({ averageMonthlyNet: 0, yearEndNet: 0 })
  })
})

describe("resolveDefaultYear", () => {
  it("returns the most recent year with transactions", () => {
    expect(resolveDefaultYear(["2024", "2025", "2026"], "2026")).toBe("2026")
  })

  it("returns the newest year even when the list is unsorted", () => {
    expect(resolveDefaultYear(["2025", "2023", "2024"], "2026")).toBe("2025")
  })

  it("returns the current year when the list is empty (loading / no data)", () => {
    expect(resolveDefaultYear([], "2026")).toBe("2026")
  })

  it("falls back to the most recent year when the current year has no transactions", () => {
    expect(resolveDefaultYear(["2024", "2025"], "2026")).toBe("2025")
  })
})
