// ---------------------------------------------------------------------------
// Unit tests — insightUtils
// ---------------------------------------------------------------------------

import { describe, expect, it } from "vitest"
import {
  computeAccumulation,
  computeProjection,
} from "./insightUtils"
import type { AccumulatedRow } from "./insightUtils"

describe("computeAccumulation", () => {
  it("returns empty array for empty input", () => {
    expect(computeAccumulation([])).toEqual([])
  })

  it("returns single row with cumulative equal to flipped daily", () => {
    const result = computeAccumulation([{ date: "2026-06-11", amount: -45 }])
    expect(result).toEqual([
      { date: "2026-06-11", daily: -45, cumulative: 45 },
    ])
  })

  it("computes running sum for multiple rows", () => {
    const result = computeAccumulation([
      { date: "2026-06-11", amount: -45 },
      { date: "2026-06-12", amount: -30 },
      { date: "2026-06-13", amount: -20 },
    ])
    expect(result).toEqual([
      { date: "2026-06-11", daily: -45, cumulative: 45 },
      { date: "2026-06-12", daily: -30, cumulative: 75 },
      { date: "2026-06-13", daily: -20, cumulative: 95 },
    ])
  })

  it("negative expenses contribute upward (sign flipped)", () => {
    const result = computeAccumulation([
      { date: "2026-06-11", amount: -100 },
      { date: "2026-06-12", amount: -50 },
    ])
    // -(-100) = +100, -(-50) = +50
    expect(result).toEqual([
      { date: "2026-06-11", daily: -100, cumulative: 100 },
      { date: "2026-06-12", daily: -50, cumulative: 150 },
    ])
  })

  it("positive income pulls accumulation downward", () => {
    const result = computeAccumulation([
      { date: "2026-06-11", amount: 120 },
      { date: "2026-06-12", amount: 50 },
    ])
    // -(120) = -120, -(50) = -50
    expect(result).toEqual([
      { date: "2026-06-11", daily: 120, cumulative: -120 },
      { date: "2026-06-12", daily: 50, cumulative: -170 },
    ])
  })

  it("sorts input by date ascending before accumulating", () => {
    const result = computeAccumulation([
      { date: "2026-06-13", amount: -20 },
      { date: "2026-06-11", amount: -45 },
      { date: "2026-06-12", amount: -30 },
    ])
    expect(result).toEqual([
      { date: "2026-06-11", daily: -45, cumulative: 45 },
      { date: "2026-06-12", daily: -30, cumulative: 75 },
      { date: "2026-06-13", daily: -20, cumulative: 95 },
    ])
  })

  it("handles mixed expenses and income", () => {
    const result = computeAccumulation([
      { date: "2026-06-11", amount: -45 },
      { date: "2026-06-12", amount: 120 },
      { date: "2026-06-13", amount: -30 },
    ])
    expect(result).toEqual([
      { date: "2026-06-11", daily: -45, cumulative: 45 },
      { date: "2026-06-12", daily: 120, cumulative: -75 },
      { date: "2026-06-13", daily: -30, cumulative: -45 },
    ])
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
    // 2 days between first and last: cumulative goes from 45 to 100 = +55 over 2 days = +27.5/day
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
    // 100 + 27.5 = 127.5, 127.5 + 27.5 = 155, 155 + 27.5 = 182.5
    expect(result[0].cumulative).toBe(127.5)
    expect(result[1].cumulative).toBe(155)
    expect(result[2].cumulative).toBe(182.5)
  })

  it("projects correctly with negative average rate (income exceeds expenses)", () => {
    const data: AccumulatedRow[] = [
      { date: "2026-06-11", daily: -45, cumulative: 45 },
      { date: "2026-06-12", daily: 200, cumulative: -155 },
    ]
    // 1 day: cumulative goes from 45 to -155 = -200 over 1 day = -200/day
    const result = computeProjection(data, 2)
    expect(result).toHaveLength(2)

    expect(result[0].date).toBe("2026-06-13")
    expect(result[1].date).toBe("2026-06-14")

    // -155 + (-200) = -355, -355 + (-200) = -555
    expect(result[0].cumulative).toBe(-355)
    expect(result[1].cumulative).toBe(-555)
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
    // avg daily change = (66.66 - 33.33) / 1 = 33.33
    // cumulative = 66.66 + 33.33 = 99.99
    expect(result[0].cumulative).toBe(99.99)
  })

  it("sorts input by date ascending before computing", () => {
    const data: AccumulatedRow[] = [
      { date: "2026-06-13", daily: -25, cumulative: 100 },
      { date: "2026-06-11", daily: -45, cumulative: 45 },
      { date: "2026-06-12", daily: -30, cumulative: 75 },
    ]
    const result = computeProjection(data, 1)
    expect(result[0].date).toBe("2026-06-14")
    // avg daily = (100 - 45) / 2 = 27.5
    expect(result[0].cumulative).toBe(127.5)
  })
})