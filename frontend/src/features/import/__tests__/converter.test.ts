// ---------------------------------------------------------------------------
// converter.test.ts — unit tests for the data type converter module
// ---------------------------------------------------------------------------

import { describe, it, expect } from "vitest"
import { convert } from "../converter"

describe("convert", () => {
  describe("date parsing", () => {
    it("parses ISO 8601 dates", () => {
      const { convertedRows } = convert(
        [{ dateTime: "2026-01-15T12:00:00Z" }],
        { dateTime: "dateTime" },
        "transactions",
      )
      expect(convertedRows[0].dateTime).toBe("2026-01-15T12:00:00.000Z")
    })

    it("parses date-only ISO strings", () => {
      const { convertedRows } = convert(
        [{ dateTime: "2026-06-24" }],
        { dateTime: "dateTime" },
        "transactions",
      )
      expect(convertedRows[0].dateTime).toMatch(/^2026-06-24/)
    })

    it("parses slash format dates", () => {
      const { convertedRows } = convert(
        [{ dateTime: "06/24/2026" }],
        { dateTime: "dateTime" },
        "transactions",
      )
      expect(convertedRows[0].dateTime).toMatch(/^2026-06-24/)
    })

    it("parses dot format dates", () => {
      const { convertedRows } = convert(
        [{ dateTime: "24.06.2026" }],
        { dateTime: "dateTime" },
        "transactions",
      )
      expect(convertedRows[0].dateTime).toMatch(/^2026-06-24/)
    })

    it("parses named month dates", () => {
      const { convertedRows } = convert(
        [{ dateTime: "24-Jun-2026" }],
        { dateTime: "dateTime" },
        "transactions",
      )
      expect(convertedRows[0].dateTime).toMatch(/^2026-06-24/)
    })

    it("emits warning for unparseable dates", () => {
      const { warnings } = convert(
        [{ dateTime: "yesterday" }],
        { dateTime: "dateTime" },
        "transactions",
      )
      expect(warnings).toHaveLength(1)
      expect(warnings[0].field).toBe("dateTime")
    })
  })

  describe("number parsing", () => {
    it("parses simple numbers", () => {
      const { convertedRows } = convert(
        [{ amount: "-100.50" }],
        { amount: "amount" },
        "transactions",
      )
      expect(convertedRows[0].amount).toBe(-100.5)
    })

    it("strips currency symbols", () => {
      const { convertedRows } = convert(
        [{ amount: "$100.50" }],
        { amount: "amount" },
        "transactions",
      )
      expect(convertedRows[0].amount).toBe(100.5)
    })

    it("handles parenthetical negatives", () => {
      const { convertedRows } = convert(
        [{ amount: "(100.50)" }],
        { amount: "amount" },
        "transactions",
      )
      expect(convertedRows[0].amount).toBe(-100.5)
    })

    it("handles empty string as undefined", () => {
      const { convertedRows } = convert(
        [{ amount: "" }],
        { amount: "amount" },
        "transactions",
      )
      expect(convertedRows[0].amount).toBeUndefined()
    })

    it("handles European decimal format", () => {
      const { convertedRows } = convert(
        [{ amount: "1.234,56" }],
        { amount: "amount" },
        "transactions",
      )
      expect(convertedRows[0].amount).toBe(1234.56)
    })

    it("handles US thousands format", () => {
      const { convertedRows } = convert(
        [{ amount: "1,234.56" }],
        { amount: "amount" },
        "transactions",
      )
      expect(convertedRows[0].amount).toBe(1234.56)
    })
  })

  describe("boolean parsing (recurring)", () => {
    it("parses true values", () => {
      const { convertedRows } = convert(
        [{ recurring: "true" }],
        { recurring: "recurring" },
        "categories",
      )
      expect(convertedRows[0].recurring).toBe(true)
    })

    it("parses false values", () => {
      const { convertedRows } = convert(
        [{ recurring: "no" }],
        { recurring: "recurring" },
        "categories",
      )
      expect(convertedRows[0].recurring).toBe(false)
    })

    it("emits warning for unparseable booleans", () => {
      const { warnings } = convert(
        [{ recurring: "maybe" }],
        { recurring: "recurring" },
        "categories",
      )
      expect(warnings).toHaveLength(1)
    })
  })

  describe("string fields", () => {
    it("passes through string values", () => {
      const { convertedRows } = convert(
        [{ note: "Lunch with friends", categoryName: "Food" }],
        { note: "note", categoryName: "categoryName" },
        "transactions",
      )
      expect(convertedRows[0].note).toBe("Lunch with friends")
      expect(convertedRows[0].categoryName).toBe("Food")
    })
  })

  describe("unmapped columns", () => {
    it("drops unmapped columns from converted rows", () => {
      const { convertedRows } = convert(
        [{ Date: "2026-01-01", Amount: "-100", ExtraCol: "ignored" }],
        { Date: "dateTime", Amount: "amount", ExtraCol: null },
        "transactions",
      )
      expect(convertedRows[0]).toEqual({
        dateTime: expect.any(String),
        amount: -100,
      })
      expect(convertedRows[0]).not.toHaveProperty("ExtraCol")
    })
  })
})
