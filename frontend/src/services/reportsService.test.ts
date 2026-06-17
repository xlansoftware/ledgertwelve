// ---------------------------------------------------------------------------
// Unit tests — reportsService
// ---------------------------------------------------------------------------

import { describe, expect, it } from "vitest"
import { getTotals, getCategoryReport } from "./reportsService"
import { login } from "./authService"

describe("reportsService", () => {
  beforeAll(async () => {
    await login({ email: "john@example.com", password: "secret-password" })
  })

  describe("getTotals", () => {
    it("returns totals for a date range", async () => {
      const result = await getTotals({
        from: "2026-01-01",
        to: "2026-12-31",
      })
      expect(result.length).toBeGreaterThanOrEqual(1)
      const row = result[0]
      expect(row).toMatchObject({
        period: expect.any(String),
        income: expect.any(Number),
        expense: expect.any(Number),
        net: expect.any(Number),
      })
    })

    it("returns monthly totals by default", async () => {
      const result = await getTotals({
        period: "month",
        from: "2026-05-01",
        to: "2026-06-30",
      })
      // Should have income/expense data
      const totalExpense = result.reduce((sum, r) => sum + r.expense, 0)
      expect(totalExpense).toBeLessThan(0)
    })

    it("returns empty array when no data in range", async () => {
      const result = await getTotals({
        from: "2025-01-01",
        to: "2025-01-31",
      })
      expect(result).toHaveLength(0)
    })
  })

  describe("getCategoryReport", () => {
    it("returns category breakdown for a date range", async () => {
      const result = await getCategoryReport({
        from: "2026-01-01",
        to: "2026-12-31",
      })
      expect(result.length).toBeGreaterThanOrEqual(1)
      const row = result[0]
      expect(row).toMatchObject({
        categoryName: expect.any(String),
        amount: expect.any(Number),
      })
    })

    it("includes Groceries category in results", async () => {
      const result = await getCategoryReport({
        from: "2026-01-01",
        to: "2026-12-31",
      })
      const categories = result.map((r) => r.categoryName)
      expect(categories).toContain("Groceries")
    })

    it("returns empty array for range with no data", async () => {
      const result = await getCategoryReport({
        from: "2025-01-01",
        to: "2025-01-31",
      })
      expect(result).toHaveLength(0)
    })
  })
})