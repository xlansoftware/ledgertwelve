// ---------------------------------------------------------------------------
// Parser — client-side file parsing for import
// Supports CSV (PapaParse), XLSX (ExcelJS), and JSON
// All libraries are lazy-loaded since the import page is not a hot path.
// ---------------------------------------------------------------------------

export interface ParsedData {
  /** Column names (header row) */
  columns: string[]
  /** Raw rows — each row is a Record of source column name → string value */
  rows: Record<string, string>[]
  /** Sheet names (XLSX only, null for CSV/JSON) */
  sheetNames: string[] | null
  /** The selected sheet (XLSX only, null otherwise) */
  selectedSheet: string | null
}

export interface ParseError {
  message: string
}

// ---------------------------------------------------------------------------
// CSV parsing — uses PapaParse
// ---------------------------------------------------------------------------

async function parseCsv(file: File): Promise<ParsedData> {
  const Papa = await import("papaparse")

  return new Promise((resolve, reject) => {
    Papa.default.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: "UTF-8",
      complete(results) {
        if (results.errors.length > 0) {
          // Non-fatal errors during parsing — still return data if any
          const fatal = results.errors.find(
            (e) => e.type === "FieldMismatch" || e.type === "Quotes",
          )
          if (fatal && results.data.length === 0) {
            reject({ message: `CSV parse error: ${fatal.message}` })
            return
          }
        }

        const columns =
          results.meta.fields && results.meta.fields.length > 0
            ? results.meta.fields
            : []

        if (columns.length === 0) {
          reject({ message: "No columns found in CSV file" })
          return
        }

        const rows = (results.data as Record<string, unknown>[]).map(
          (row) => {
            const stringRow: Record<string, string> = {}
            for (const key of columns) {
              const val = row[key]
              stringRow[key] = val !== null && val !== undefined ? String(val) : ""
            }
            return stringRow
          },
        )

        if (rows.length === 0) {
          reject({ message: "No data rows found in CSV file" })
          return
        }

        resolve({
          columns,
          rows,
          sheetNames: null,
          selectedSheet: null,
        })
      },
      error(err) {
        reject({ message: `CSV parse error: ${err.message}` })
      },
    })
  })
}

// ---------------------------------------------------------------------------
// XLSX parsing — uses ExcelJS
// ---------------------------------------------------------------------------

async function parseXlsx(
  file: File,
  sheetName?: string,
): Promise<ParsedData> {
  const ExcelJS = await import("exceljs")

  const buffer = await file.arrayBuffer()
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)

  const sheetNames: string[] = []
  workbook.eachSheet((sheet) => {
    sheetNames.push(sheet.name)
  })

  if (sheetNames.length === 0) {
    throw { message: "No sheets found in XLSX file" }
  }

  // Determine which sheet to use
  const targetSheet = sheetName || sheetNames[0]
  if (!sheetNames.includes(targetSheet)) {
    throw { message: `Sheet "${targetSheet}" not found in workbook` }
  }

  const worksheet = workbook.getWorksheet(targetSheet)
  if (!worksheet) {
    throw { message: `Sheet "${targetSheet}" not found` }
  }

  // Get header row (first row with data)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows_raw: any[] = []
  worksheet.eachRow({ includeEmpty: false }, (row: any, rowNumber: number) => {
    rows_raw.push({ row, rowNumber })
  })

  let headerRow: { number: number; values: (string | null)[] } | null = null

  for (const { row, rowNumber } of rows_raw) {
    if (!headerRow) {
      const rowValues: unknown[] = Array.isArray(row.values) ? row.values : Object.values(row.values)
      if (rowValues.filter((v: unknown) => v !== null && v !== undefined).length > 0) {
        headerRow = {
          number: rowNumber,
          values: rowValues.map((v: unknown) =>
            v !== null && v !== undefined ? String(v) : null,
          ),
        }
      }
    }
  }

  if (!headerRow) {
    throw { message: "No header row found in XLSX file" }
  }

  const columns = headerRow.values.filter((v): v is string => v !== null)
  if (columns.length === 0) {
    throw { message: "No columns found in XLSX file" }
  }

  // Parse data rows (skip header row)
  const rows: Record<string, string>[] = []
  for (const { row, rowNumber } of rows_raw) {
    if (rowNumber <= headerRow!.number) continue // Skip header
    const rowValues: unknown[] = Array.isArray(row.values) ? row.values.slice(1) : Object.values(row.values).slice(1)
    const stringRow: Record<string, string> = {}

    for (let i = 0; i < columns.length; i++) {
      const val = rowValues[i]
      if (val instanceof Date) {
        stringRow[columns[i]] = val.toISOString()
      } else if (val !== null && val !== undefined) {
        stringRow[columns[i]] = String(val)
      } else {
        stringRow[columns[i]] = ""
      }
    }

    // Only add non-empty rows
    const hasData = Object.values(stringRow).some((v) => v !== "")
    if (hasData) {
      rows.push(stringRow)
    }
  }

  if (rows.length === 0) {
    throw { message: "No data rows found in XLSX file" }
  }

  return {
    columns,
    rows,
    sheetNames,
    selectedSheet: targetSheet,
  }
}

// ---------------------------------------------------------------------------
// JSON parsing
// ---------------------------------------------------------------------------

async function parseJson(file: File): Promise<ParsedData> {
  const text = await file.text()

  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw { message: "Invalid JSON file" }
  }

  // Handle array of objects
  if (Array.isArray(data)) {
    if (data.length === 0) {
      throw { message: "JSON file contains an empty array" }
    }

    // Check each element is an object
    if (data.some((item) => typeof item !== "object" || item === null)) {
      throw { message: "JSON array must contain only objects" }
    }

    // Extract columns from first object
    const first = data[0] as Record<string, unknown>
    const columns = Object.keys(first)

    if (columns.length === 0) {
      throw { message: "No columns found in JSON data" }
    }

    const rows = data.map((item: unknown) => {
      const obj = item as Record<string, unknown>
      const stringRow: Record<string, string> = {}
      for (const key of columns) {
        const val = obj[key]
        stringRow[key] = val !== null && val !== undefined ? String(val) : ""
      }
      return stringRow
    })

    return {
      columns,
      rows,
      sheetNames: null,
      selectedSheet: null,
    }
  }

  // Handle single object (backup format or single record)
  if (typeof data === "object" && data !== null) {
    const obj = data as Record<string, unknown>

    // Check if it's a backup format (has books/categories/transactions arrays)
    if ("books" in obj || "categories" in obj || "transactions" in obj) {
      // Return as raw data — the caller handles backup format specially
      return {
        columns: Object.keys(obj),
        rows: [obj as Record<string, string>],
        sheetNames: null,
        selectedSheet: null,
      }
    }

    // Single flat object
    const columns = Object.keys(obj)
    if (columns.length === 0) {
      throw { message: "No properties found in JSON object" }
    }

    const stringRow: Record<string, string> = {}
    for (const key of columns) {
      const val = obj[key]
      stringRow[key] = val !== null && val !== undefined ? String(val) : ""
    }

    return {
      columns,
      rows: [stringRow],
      sheetNames: null,
      selectedSheet: null,
    }
  }

  throw { message: "JSON must be an object or array of objects" }
}

// ---------------------------------------------------------------------------
// Main parse function — auto-detects format from file extension
// ---------------------------------------------------------------------------

export async function parseFile(
  file: File,
  sheetName?: string,
): Promise<ParsedData> {
  const extension = file.name.split(".").pop()?.toLowerCase() || ""

  switch (extension) {
    case "csv":
      return parseCsv(file)
    case "xlsx":
    case "xls":
      return parseXlsx(file, sheetName)
    case "json":
      return parseJson(file)
    default:
      throw { message: `Unsupported file format: .${extension}. Supported formats: .csv, .xlsx, .json` }
  }
}
