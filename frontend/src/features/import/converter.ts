// ---------------------------------------------------------------------------
// Converter — date/number/type conversion for import rows
// Takes raw string rows + mapping, returns typed rows.
// ---------------------------------------------------------------------------

import type { ImportEntityType } from "@/types"

export interface ConversionResult {
  convertedRows: Record<string, unknown>[]
  warnings: { row: number; field: string; message: string }[]
}

// ---------------------------------------------------------------------------
// Date parsing
// ---------------------------------------------------------------------------

function parseDate(value: string): Date | null {
  if (!value || value.trim() === "") return null

  const trimmed = value.trim()

  // ISO 8601 (2026-06-24T12:00:00Z, 2026-06-24)
  const isoMatch = trimmed.match(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:\d{2})?)?$/)
  if (isoMatch) {
    const d = new Date(trimmed)
    if (!isNaN(d.getTime())) return d
  }

  // Slash format (06/24/2026, 6/24/2026)
  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (slashMatch) {
    // Try month/date/year
    let d = new Date(`${slashMatch[3]}-${slashMatch[1]}-${slashMatch[2]}`)
    if (!isNaN(d.getTime())) return d
    // Try date/month/year
    d = new Date(`${slashMatch[3]}-${slashMatch[2]}-${slashMatch[1]}`)
    if (!isNaN(d.getTime())) return d
  }

  // Dot format (24.06.2026, 24.6.2026)
  const dotMatch = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  if (dotMatch) {
    const d = new Date(`${dotMatch[3]}-${dotMatch[2].padStart(2, "0")}-${dotMatch[1].padStart(2, "0")}`)
    if (!isNaN(d.getTime())) return d
  }

  // D-MMM-YYYY format (24-Jun-2026)
  const namedMonthMatch = trimmed.match(/^(\d{1,2})[- ]([A-Za-z]{3})[- ](\d{4})$/)
  if (namedMonthMatch) {
    const months: Record<string, string> = {
      jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
      jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
    }
    const monthNum = months[namedMonthMatch[2].toLowerCase()]
    if (monthNum) {
      const d = new Date(`${namedMonthMatch[3]}-${monthNum}-${namedMonthMatch[1].padStart(2, "0")}`)
      if (!isNaN(d.getTime())) return d
    }
  }

  // Excel serial number (integers ~30000–100000)
  const numMatch = trimmed.match(/^(\d+)$/)
  if (numMatch) {
    const serial = parseInt(numMatch[1], 10)
    if (serial >= 30000 && serial <= 100000) {
      // Excel date epoch: January 1, 1900 (with the leap year bug)
      const excelEpoch = new Date(1899, 11, 30) // Dec 30, 1899
      const d = new Date(excelEpoch.getTime() + serial * 86400000)
      if (!isNaN(d.getTime())) return d
    }
  }

  // Last resort: try Date constructor
  const d = new Date(trimmed)
  if (!isNaN(d.getTime())) return d

  return null
}

// ---------------------------------------------------------------------------
// Number parsing
// ---------------------------------------------------------------------------

function parseNumber(value: string): number | null {
  if (!value || value.trim() === "") return null

  let cleaned = value.trim()

  // Handle parenthetical negatives: (100.50) → -100.50
  const parenMatch = cleaned.match(/^\((.+)\)$/)
  if (parenMatch) {
    const inner = parenMatch[1]
    const parsed = parseRawNumber(inner)
    if (parsed !== null) return -parsed
  }

  return parseRawNumber(cleaned)
}

function parseRawNumber(value: string): number | null {
  let cleaned = value.trim()

  // Handle Excel accounting dash for zero
  if (cleaned === "-" || cleaned === "--") return 0

  // Strip currency symbols ($, €, £, etc.)
  cleaned = cleaned.replace(/[^\d,.\s\-\+\(\)eE]/g, "").trim()

  if (cleaned === "" || cleaned === "-") return null

  // Detect comma vs dot decimal separator
  // If there's a dot followed by max 2 digits and a comma exists, dot is decimal
  const hasComma = cleaned.includes(",")
  const hasDot = cleaned.includes(".")

  if (hasComma && hasDot) {
    // European format: 1.234,56 or 1,234.56
    const lastDot = cleaned.lastIndexOf(".")
    const lastComma = cleaned.lastIndexOf(",")

    if (lastComma > lastDot) {
      // Comma is last → European: 1.234,56 (dot=thousands, comma=decimal)
      cleaned = cleaned.replace(/\./g, "").replace(",", ".")
    } else {
      // Dot is last → US: 1,234.56 (comma=thousands, dot=decimal)
      cleaned = cleaned.replace(/,/g, "")
    }
  } else if (hasComma) {
    // Only comma — could be European decimal or US thousands
    // If comma is followed by exactly 2 digits at end → decimal
    const commaParts = cleaned.split(",")
    const lastPart = commaParts[commaParts.length - 1]
    if (/^\d{1,2}$/.test(lastPart) && commaParts.length > 1) {
      // Likely decimal (European)
      cleaned = cleaned.replace(/\./g, "").replace(",", ".")
    } else {
      // Likely thousands — remove all commas
      cleaned = cleaned.replace(/,/g, "")
    }
  }

  // Remove any remaining spaces (used as thousands separators)
  cleaned = cleaned.replace(/\s/g, "")

  const num = parseFloat(cleaned)
  if (isNaN(num)) return null

  return num
}

// ---------------------------------------------------------------------------
// Main convert function
// ---------------------------------------------------------------------------

function convertValue(
  value: string,
  targetField: string,
): { value: unknown; warning?: string } {
  if (!value || value.trim() === "") {
    return { value: undefined }
  }

  switch (targetField) {
    case "dateTime": {
      const d = parseDate(value)
      if (d) {
        return { value: d.toISOString() }
      }
      return { value: value, warning: `Could not parse date: "${value}"` }
    }

    case "amount":
    case "originalAmount":
    case "exchangeRate": {
      if (targetField === "exchangeRate") {
        const n = parseNumber(value)
        if (n !== null) return { value: n }
        return { value: undefined, warning: `Could not parse number: "${value}"` }
      }
      const n = parseNumber(value)
      if (n !== null) return { value: n }
      return { value: undefined, warning: `Could not parse number: "${value}"` }
    }

    case "recurring": {
      const lower = value.toLowerCase().trim()
      if (["true", "yes", "1", "y"].includes(lower)) return { value: true }
      if (["false", "no", "0", "n"].includes(lower)) return { value: false }
      return { value: undefined, warning: `Could not parse boolean: "${value}"` }
    }

    case "id":
    case "bookId":
    case "categoryName":
    case "name":
    case "note":
    case "originalCurrency":
    case "currency":
    case "color":
    case "icon":
    case "status":
      return { value }

    default:
      return { value }
  }
}

/**
 * Convert raw string rows to typed rows using the provided column mapping.
 * Unmapped columns are dropped. Each row is an object keyed by target field names.
 */
export function convert(
  rawRows: Record<string, string>[],
  mapping: Record<string, string | null>,
  _entityType: ImportEntityType,
): ConversionResult {
  const convertedRows: Record<string, unknown>[] = []
  const warnings: { row: number; field: string; message: string }[] = []

  for (let i = 0; i < rawRows.length; i++) {
    const rawRow = rawRows[i]
    const convertedRow: Record<string, unknown> = {}

    for (const [sourceCol, targetField] of Object.entries(mapping)) {
      if (targetField === null) continue // Ignored column

      const rawValue = rawRow[sourceCol] || ""
      const result = convertValue(rawValue, targetField)

      if (result.value !== undefined) {
        convertedRow[targetField] = result.value
      }

      if (result.warning) {
        warnings.push({
          row: i + 1, // 1-based
          field: targetField,
          message: result.warning,
        })
      }
    }

    convertedRows.push(convertedRow)
  }

  return { convertedRows, warnings }
}
