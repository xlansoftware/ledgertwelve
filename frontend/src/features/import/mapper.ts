// ---------------------------------------------------------------------------
// Mapper — auto-mapping heuristics + alias table
// Takes parsed columns and entity type, returns suggested field mappings.
// ---------------------------------------------------------------------------

import type { ImportEntityType } from "@/types"

// ---------------------------------------------------------------------------
// Target field alias table
// Priority-ordered: first alias in list has highest priority.
// ---------------------------------------------------------------------------

const ALIASES: Record<string, string[]> = {
  // Common fields
  dateTime: ["date", "datetime", "date time", "transaction date", "posting date", "date_posted", "value date", "trans date", "tx date", "dateutc"],
  amount: ["amount", "value", "sum", "price", "total", "debit", "credit", "transaction amount", "tx amount", "net amount"],
  note: ["note", "description", "memo", "details", "comment", "remarks", "narration", "notes"],
  id: ["id", "transaction id", "tx id", "reference", "ref", "identifier", "record id"],

  // Category-specific
  categoryName: ["category", "category name", "type", "group", "classification", "category"],
  name: ["name", "title", "label", "item"],

  // Multi-currency
  originalCurrency: ["original currency", "original currency", "currency", "currency code", "cur", "foreign currency"],
  originalAmount: ["original amount", "foreign amount", "orig amount", "original value"],
  exchangeRate: ["exchange rate", "rate", "fx rate", "fx", "forex rate"],

  // Book-specific
  bookId: ["book id", "book", "book name", "ledger", "ledger name"],
  currency: ["currency", "book currency", "base currency"],

  // Category-specific
  recurring: ["recurring", "is recurring", "recurring?"],
  color: ["color", "colour", "hex", "hex color"],
  icon: ["icon", "icon name", "icon"],

  // Book-specific
  status: ["status", "book status", "state"],
}

// ---------------------------------------------------------------------------
// Target fields per entity type
// ---------------------------------------------------------------------------

const FIELDS_BY_TYPE: Record<ImportEntityType, string[]> = {
  transactions: ["dateTime", "amount", "note", "categoryName", "id", "originalCurrency", "originalAmount", "exchangeRate", "bookId"],
  categories: ["name", "recurring", "color", "icon", "id"],
  books: ["name", "currency", "status", "id"],
  backup: [],
}

// ---------------------------------------------------------------------------
// Auto-mapping function
// ---------------------------------------------------------------------------

export interface MappingResult {
  /** Source column → target field (null = ignored) */
  mapping: Record<string, string | null>
}

/**
 * Auto-detect column mappings based on alias table matching.
 * Case-insensitive exact match + alias lookup.
 * Each target field can match at most one column (first match wins).
 */
export function autoMap(
  columns: string[],
  entityType: ImportEntityType,
): MappingResult {
  const mapping: Record<string, string | null> = {}
  const usedTargets = new Set<string>()

  for (const col of columns) {
    const colLower = col.toLowerCase().trim()

    // Check each target field's aliases
    let matched = false
    const fields = FIELDS_BY_TYPE[entityType] || []

    for (const targetField of fields) {
      if (usedTargets.has(targetField)) continue

      const aliases = ALIASES[targetField] || []

      // Check exact match on column name
      if (colLower === targetField.toLowerCase()) {
        mapping[col] = targetField
        usedTargets.add(targetField)
        matched = true
        break
      }

      // Check alias matches
      for (const alias of aliases) {
        if (colLower === alias.toLowerCase()) {
          mapping[col] = targetField
          usedTargets.add(targetField)
          matched = true
          break
        }
      }

      if (matched) break
    }

    if (!matched) {
      mapping[col] = null
    }
  }

  return { mapping }
}
