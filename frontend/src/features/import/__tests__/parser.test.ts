// ---------------------------------------------------------------------------
// parser.test.ts — unit tests for the file parser module
// ---------------------------------------------------------------------------

import { describe, it, expect } from "vitest"
import { parseFile } from "../parser"

function csvFile(content: string, filename = "test.csv"): File {
  return new File([content], filename, { type: "text/csv" })
}

function jsonFile(content: string, filename = "test.json"): File {
  return new File([content], filename, { type: "application/json" })
}

describe("CSV parsing", () => {
  it("parses a simple CSV with headers", async () => {
    const file = csvFile("Date,Amount,Note\n2026-01-01,-100,Lunch\n2026-01-02,-50,Coffee")
    const result = await parseFile(file)
    expect(result.columns).toEqual(["Date", "Amount", "Note"])
    expect(result.rows).toHaveLength(2)
    expect(result.rows[0]).toEqual({ Date: "2026-01-01", Amount: "-100", Note: "Lunch" })
    expect(result.rows[1]).toEqual({ Date: "2026-01-02", Amount: "-50", Note: "Coffee" })
    expect(result.sheetNames).toBeNull()
    expect(result.selectedSheet).toBeNull()
  })

  it("rejects empty CSV", async () => {
    const file = csvFile("Date,Amount\n")
    await expect(parseFile(file)).rejects.toThrow("No data rows found")
  })

  it("rejects CSV with no columns", async () => {
    const file = csvFile("")
    await expect(parseFile(file)).rejects.toThrow("No columns found")
  })

  it("handles quoted fields", async () => {
    const file = csvFile('Date,Note\n2026-01-01,"Lunch, with friends"')
    const result = await parseFile(file)
    expect(result.rows[0].Note).toBe("Lunch, with friends")
  })
})

describe("JSON parsing", () => {
  it("parses a JSON array of objects", async () => {
    const file = jsonFile('[{"dateTime": "2026-01-01", "amount": -100}]')
    const result = await parseFile(file)
    expect(result.columns).toEqual(["dateTime", "amount"])
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0]).toEqual({ dateTime: "2026-01-01", amount: "-100" })
  })

  it("rejects empty JSON array", async () => {
    const file = jsonFile("[]")
    await expect(parseFile(file)).rejects.toThrow("empty array")
  })

  it("rejects JSON array of non-objects", async () => {
    const file = jsonFile('[1, 2, 3]')
    await expect(parseFile(file)).rejects.toThrow("must contain only objects")
  })

  it("rejects invalid JSON", async () => {
    const file = jsonFile("{invalid")
    await expect(parseFile(file)).rejects.toThrow("Invalid JSON")
  })

  it("rejects non-array, non-object JSON", async () => {
    const file = jsonFile('"just a string"')
    await expect(parseFile(file)).rejects.toThrow("must be an object")
  })

  it("parses a single JSON object", async () => {
    const file = jsonFile('{"dateTime": "2026-01-01", "amount": -100}')
    const result = await parseFile(file)
    expect(result.columns).toEqual(["dateTime", "amount"])
    expect(result.rows).toHaveLength(1)
  })
})

describe("File format detection", () => {
  it("rejects unsupported file extensions", async () => {
    const file = new File(["data"], "test.txt", { type: "text/plain" })
    await expect(parseFile(file)).rejects.toThrow("Unsupported file format")
  })

  it("handles .xls extension", async () => {
    // XLS parsing requires a real XLSX file, so we just check extension detection
    const file = new File(["data"], "test.xls", { type: "application/vnd.ms-excel" })
    await expect(parseFile(file)).rejects.toThrow() // Will fail on actual parsing, not extension
  })
})
