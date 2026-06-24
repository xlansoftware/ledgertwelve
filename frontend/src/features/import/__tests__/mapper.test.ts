// ---------------------------------------------------------------------------
// mapper.test.ts — unit tests for the auto-mapping heuristics module
// ---------------------------------------------------------------------------

import { describe, it, expect } from "vitest"
import { autoMap } from "../mapper"

describe("autoMap", () => {
  describe("transactions mapping", () => {
    it("maps exact match column names", () => {
      const { mapping } = autoMap(["dateTime", "amount", "note"], "transactions")
      expect(mapping).toEqual({
        dateTime: "dateTime",
        amount: "amount",
        note: "note",
      })
    })

    it("maps case-insensitive aliases", () => {
      const { mapping } = autoMap(["Date", "Value", "Description"], "transactions")
      expect(mapping).toEqual({
        Date: "dateTime",
        Value: "amount",
        Description: "note",
      })
    })

    it("maps common transaction aliases", () => {
      const { mapping } = autoMap(
        ["Transaction Date", "Total", "Memo"],
        "transactions",
      )
      expect(mapping).toEqual({
        "Transaction Date": "dateTime",
        Total: "amount",
        Memo: "note",
      })
    })

    it("maps id alias", () => {
      const { mapping } = autoMap(["Ref", "Amount"], "transactions")
      expect(mapping).toEqual({
        Ref: "id",
        Amount: "amount",
      })
    })

    it("leaves unknown columns unmapped (null)", () => {
      const { mapping } = autoMap(["Date", "Some Random Column", "Amount"], "transactions")
      expect(mapping).toEqual({
        Date: "dateTime",
        "Some Random Column": null,
        Amount: "amount",
      })
    })

    it("each target field matches at most one column (first wins)", () => {
      const { mapping } = autoMap(["Date", "dateTime", "Amount"], "transactions")
      // "Date" matches first, "dateTime" becomes null
      expect(mapping).toEqual({
        Date: "dateTime",
        dateTime: null,
        Amount: "amount",
      })
    })
  })

  describe("categories mapping", () => {
    it("maps category fields", () => {
      const { mapping } = autoMap(
        ["Name", "Is Recurring", "Color", "Icon"],
        "categories",
      )
      expect(mapping).toEqual({
        Name: "name",
        "Is Recurring": "recurring",
        Color: "color",
        Icon: "icon",
      })
    })
  })

  describe("books mapping", () => {
    it("maps book fields", () => {
      const { mapping } = autoMap(
        ["Name", "Currency", "Status"],
        "books",
      )
      expect(mapping).toEqual({
        Name: "name",
        Currency: "currency",
        Status: "status",
      })
    })
  })

  describe("backup mapping", () => {
    it("returns empty mapping for backup", () => {
      const { mapping } = autoMap(["Date", "Amount"], "backup")
      expect(mapping).toEqual({
        Date: null,
        Amount: null,
      })
    })
  })

  describe("edge cases", () => {
    it("handles empty columns array", () => {
      const { mapping } = autoMap([], "transactions")
      expect(mapping).toEqual({})
    })

    it("handles columns with whitespace in names", () => {
      const { mapping } = autoMap(["  Date  ", " Amount "], "transactions")
      expect(mapping).toEqual({
        "  Date  ": "dateTime",
        " Amount ": "amount",
      })
    })
  })
})
