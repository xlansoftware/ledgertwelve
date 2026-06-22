// ---------------------------------------------------------------------------
// Unit tests — insightUtils
// ---------------------------------------------------------------------------

import { describe, expect, it } from "vitest"
import {
  computeAccumulation,
  computeProjection,
  computeProjectionFromAverage,
} from "./insightUtils"
import type { AccumulatedRow } from "./insightUtils"

describe("computeAccumulation", () => {
  it("returns empty array for empty input", () => {
    expect(computeAccumulation([])).toEqual([])
  })

  it("returns single row with cumulative equal to amount (no sign flip)", () => {
    const result = computeAccumulation([{ date: "2026-06-11", amount: -45 }])
    expect(result).toEqual([
      { date: "2026-06-11", daily: -45, cumulative: -45 },
    ])
  })

  it("computes running sum for multiple rows (negative expenses decrease balance)", () => {
    const result = computeAccumulation([
      { date: "2026-06-11", amount: -45 },
      { date: "2026-06-12", amount: -30 },
      { date: "2026-06-13", amount: -20 },
    ])
    expect(result).toEqual([
      { date: "2026-06-11", daily: -45, cumulative: -45 },
      { date: "2026-06-12", daily: -30, cumulative: -75 },
      { date: "2026-06-13", daily: -20, cumulative: -95 },
    ])
  })

  it("expenses (negative) decrease the balance", () => {
    const result = computeAccumulation([
      { date: "2026-06-11", amount: -100 },
      { date: "2026-06-12", amount: -50 },
    ])
    expect(result).toEqual([
      { date: "2026-06-11", daily: -100, cumulative: -100 },
      { date: "2026-06-12", daily: -50, cumulative: -150 },
    ])
  })

  it("positive income increases the balance", () => {
    const result = computeAccumulation([
      { date: "2026-06-11", amount: 120 },
      { date: "2026-06-12", amount: 50 },
    ])
    expect(result).toEqual([
      { date: "2026-06-11", daily: 120, cumulative: 120 },
      { date: "2026-06-12", daily: 50, cumulative: 170 },
    ])
  })

  it("sorts input by date ascending before accumulating", () => {
    const result = computeAccumulation([
      { date: "2026-06-13", amount: -20 },
      { date: "2026-06-11", amount: -45 },
      { date: "2026-06-12", amount: -30 },
    ])
    expect(result).toEqual([
      { date: "2026-06-11", daily: -45, cumulative: -45 },
      { date: "2026-06-12", daily: -30, cumulative: -75 },
      { date: "2026-06-13", daily: -20, cumulative: -95 },
    ])
  })

  it("handles mixed expenses and income", () => {
    const result = computeAccumulation([
      { date: "2026-06-11", amount: -45 },
      { date: "2026-06-12", amount: 120 },
      { date: "2026-06-13", amount: -30 },
    ])
    expect(result).toEqual([
      { date: "2026-06-11", daily: -45, cumulative: -45 },
      { date: "2026-06-12", daily: 120, cumulative: 75 },
      { date: "2026-06-13", daily: -30, cumulative: 45 },
    ])
  })

  it("seeds accumulation with initialCumulative when provided", () => {
    const result = computeAccumulation(
      [
        { date: "2026-06-11", amount: -45 },
        { date: "2026-06-12", amount: -30 },
      ],
      1000,
    )
    expect(result).toEqual([
      { date: "2026-06-11", daily: -45, cumulative: 955 },
      { date: "2026-06-12", daily: -30, cumulative: 925 },
    ])
  })

  it("defaults to zero when initialCumulative is omitted (backward compatible)", () => {
    const result = computeAccumulation([
      { date: "2026-06-11", amount: -45 },
    ])
    expect(result[0].cumulative).toBe(-45)
  })
})

describe("computeProjection", () => {
  it("returns empty array for empty accumulated input", () => {
    expect(computeProjection([], 10)).toEqual([])
  })

  it("returns empty array for single data point", () => {
    const data: AccumulatedRow[] = [
      { date: "2026-06-11", daily: -45, cumulative: 45 },
    ]
    expect(computeProjection(data, 10)).toEqual([])
  })

  it("projects M points forward based on average daily rate", () => {
    const data: AccumulatedRow[] = [
      { date: "2026-06-11", daily: -45, cumulative: 45 },
      { date: "2026-06-12", daily: -30, cumulative: 75 },
      { date: "2026-06-13", daily: -25, cumulative: 100 },
    ]
    // 3 data points: cumulative goes from 45 to 100 = +55 over 3 points = +18.33/day
    const result = computeProjection(data, 3)
    expect(result).toHaveLength(3)

    // Every projected point should have isProjected: true
    result.forEach((point) => {
      expect(point.isProjected).toBe(true)
    })

    // Date should increment from last known date
    expect(result[0].date).toBe("2026-06-14")
    expect(result[1].date).toBe("2026-06-15")
    expect(result[2].date).toBe("2026-06-16")

    // Cumulative should extend by avg daily rate
    // 100 + 18.333 = 118.333 → 118.33, 118.33 + 18.333 = 136.667 → 136.67, 136.67 + 18.333 = 155
    expect(result[0].cumulative).toBe(118.33)
    expect(result[1].cumulative).toBe(136.67)
    expect(result[2].cumulative).toBe(155)
  })

  it("projects correctly with negative average rate (income exceeds expenses)", () => {
    const data: AccumulatedRow[] = [
      { date: "2026-06-11", daily: -45, cumulative: 45 },
      { date: "2026-06-12", daily: 200, cumulative: -155 },
    ]
    // 2 data points: cumulative goes from 45 to -155 = -200 over 2 points = -100/point
    const result = computeProjection(data, 2)
    expect(result).toHaveLength(2)

    expect(result[0].date).toBe("2026-06-13")
    expect(result[1].date).toBe("2026-06-14")

    // -155 + (-100) = -255, -255 + (-100) = -355
    expect(result[0].cumulative).toBe(-255)
    expect(result[1].cumulative).toBe(-355)
  })

  it("handles flat data (zero daily change)", () => {
    const data: AccumulatedRow[] = [
      { date: "2026-06-11", daily: 0, cumulative: 50 },
      { date: "2026-06-12", daily: 0, cumulative: 50 },
    ]
    // 1 day, change = 0, so projection is flat
    const result = computeProjection(data, 2)
    expect(result[0].cumulative).toBe(50)
    expect(result[1].cumulative).toBe(50)
  })

  it("rounds cumulative to 2 decimal places", () => {
    const data: AccumulatedRow[] = [
      { date: "2026-06-11", daily: -33.33, cumulative: 33.33 },
      { date: "2026-06-12", daily: -33.33, cumulative: 66.66 },
    ]
    const result = computeProjection(data, 1)
    // avg daily change = (66.66 - 33.33) / 2 = 16.665
    // cumulative = 66.66 + 16.665 ≈ 83.32 (floating point rounds down)
    expect(result[0].cumulative).toBe(83.32)
  })

  it("sorts input by date ascending before computing", () => {
    const data: AccumulatedRow[] = [
      { date: "2026-06-13", daily: -25, cumulative: 100 },
      { date: "2026-06-11", daily: -45, cumulative: 45 },
      { date: "2026-06-12", daily: -30, cumulative: 75 },
    ]
    const result = computeProjection(data, 1)
    expect(result[0].date).toBe("2026-06-14")
    // avg daily = (100 - 45) / 3 = 18.33
    expect(result[0].cumulative).toBe(118.33)
  })
})

describe("computeProjectionFromAverage", () => {
  it("returns empty array when M is 0", () => {
    const result = computeProjectionFromAverage(100, -50, 0, "2026-06-22")
    expect(result).toEqual([])
  })

  it("returns empty array when M is negative", () => {
    const result = computeProjectionFromAverage(100, -50, -1, "2026-06-22")
    expect(result).toEqual([])
  })

  it("projects M points forward using avgChange", () => {
    const result = computeProjectionFromAverage(100, -45.5, 3, "2026-06-22")
    expect(result).toHaveLength(3)

    result.forEach((point) => {
      expect(point.isProjected).toBe(true)
    })

    // Dates increment from last date
    expect(result[0].date).toBe("2026-06-23")
    expect(result[1].date).toBe("2026-06-24")
    expect(result[2].date).toBe("2026-06-25")

    // Cumulative extends by avgChange each step
    expect(result[0].cumulative).toBe(54.5)   // 100 + (-45.5)
    expect(result[1].cumulative).toBe(9)      // 54.5 + (-45.5) = 9
    expect(result[2].cumulative).toBe(-36.5)  // 9 + (-45.5)
  })

  it("handles positive avgChange (net income)", () => {
    const result = computeProjectionFromAverage(500, 200, 2, "2026-06-22")
    expect(result[0].cumulative).toBe(700)    // 500 + 200
    expect(result[1].cumulative).toBe(900)    // 700 + 200
  })

  it("handles zero avgChange (flat)", () => {
    const result = computeProjectionFromAverage(50, 0, 2, "2026-06-22")
    expect(result[0].cumulative).toBe(50)
    expect(result[1].cumulative).toBe(50)
  })

  it("rounds cumulative to 2 decimal places", () => {
    const result = computeProjectionFromAverage(100, -33.333, 1, "2026-06-22")
    expect(result[0].cumulative).toBe(66.67)  // 100 - 33.333 = 66.667 → rounds to 66.67
  })

  it("sets daily field to avgChange for every projected point", () => {
    const result = computeProjectionFromAverage(200, -50, 2, "2026-06-22")
    expect(result[0].daily).toBe(-50)
    expect(result[1].daily).toBe(-50)
  })
})