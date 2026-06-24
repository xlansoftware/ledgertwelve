// ---------------------------------------------------------------------------
// MappingPage — step 2 of the import workflow
// Column mapping table (card layout on mobile), auto-mapping pre-fills.
// Users can adjust mappings with dropdowns.
// ---------------------------------------------------------------------------

import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useImportStore } from "@/store/useImportStore"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Select as BookSelect,
  SelectContent as BookSelectContent,
  SelectItem as BookSelectItem,
  SelectTrigger as BookSelectTrigger,
  SelectValue as BookSelectValue,
} from "@/components/ui/select"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useBooksStore } from "@/store"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { convert } from "@/features/import/converter"

// ---------------------------------------------------------------------------
// Target field options per entity type
// ---------------------------------------------------------------------------

const TARGET_FIELDS: Record<string, { value: string; label: string; required: boolean }[]> = {
  transactions: [
    { value: "dateTime", label: "Date/Time", required: false },
    { value: "amount", label: "Amount", required: true },
    { value: "note", label: "Note / Description", required: false },
    { value: "categoryName", label: "Category", required: false },
    { value: "id", label: "ID (for upsert)", required: false },
    { value: "originalCurrency", label: "Original Currency", required: false },
    { value: "originalAmount", label: "Original Amount", required: false },
    { value: "exchangeRate", label: "Exchange Rate", required: false },
    { value: "bookId", label: "Book ID", required: false },
  ],
  categories: [
    { value: "name", label: "Name", required: true },
    { value: "recurring", label: "Recurring", required: false },
    { value: "color", label: "Color", required: false },
    { value: "icon", label: "Icon", required: false },
    { value: "id", label: "ID (for upsert)", required: false },
  ],
  books: [
    { value: "name", label: "Name", required: true },
    { value: "currency", label: "Currency", required: false },
    { value: "status", label: "Status", required: false },
    { value: "id", label: "ID (for upsert)", required: false },
  ],
  backup: [],
}

// ---------------------------------------------------------------------------
// MappingPage component
// ---------------------------------------------------------------------------

export default function MappingPage() {
  const navigate = useNavigate()
  const store = useImportStore()
  const books = useBooksStore((s) => s.books)
  const [localMapping, setLocalMapping] = useState<Record<string, string | null>>({})
  const [validationError, setValidationError] = useState<string | null>(null)

  // Initialize local mapping from store
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocalMapping({ ...store.mapping })
  }, [store.mapping])

  const fileInfo = store.fileInfo
  const entityType = store.entityType

  if (!fileInfo || !entityType || entityType === "backup") {
    navigate("/import", { replace: true })
    return null
  }

  const fields = TARGET_FIELDS[entityType] || []
  const usedFields = new Set(Object.values(localMapping).filter((v): v is string => v !== null))

  const handleFieldChange = (sourceCol: string, targetField: string | null) => {
    setLocalMapping((prev) => ({
      ...prev,
      [sourceCol]: targetField === "--ignore--" ? null : targetField,
    }))
    setValidationError(null)
  }

  const handleConfirm = () => {
    // Validate: at least one column must be mapped
    const mappedCount = Object.values(localMapping).filter((v) => v !== null).length
    if (mappedCount === 0) {
      setValidationError("At least one column must be mapped")
      return
    }

    // Validate: required fields must be mapped
    const requiredFields = fields.filter((f) => f.required).map((f) => f.value)
    for (const required of requiredFields) {
      const hasMapping = Object.values(localMapping).includes(required)
      if (!hasMapping) {
        setValidationError(
          `Required field "${fields.find((f) => f.value === required)?.label}" is not mapped`,
        )
        return
      }
    }

    store.setMapping(localMapping)

    const { convertedRows } = convert(
      fileInfo.parsedRows,
      localMapping,
      entityType,
    )
    store.setConvertedRows(convertedRows)

    navigate("/import/preview")
  }

  // Preview values: show first 3 values for each column
  const getPreviewValues = (col: string): string[] => {
    return fileInfo.parsedRows.slice(0, 3).map((row) => row[col] || "")
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Map Columns</h1>

      {/* File info bar */}
      <div className="mb-6 flex items-center justify-between rounded-none border border-border bg-card p-3 text-sm">
        <span>
          <span className="text-muted-foreground">File:</span>{" "}
          <span className="font-medium">{fileInfo.fileName}</span>
        </span>
        <span className="text-muted-foreground">
          {fileInfo.parsedRows.length} rows
        </span>
      </div>

      {/* Book picker for transactions (fallback book) */}
      {entityType === "transactions" && !Object.values(localMapping).includes("bookId") && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Target Book</CardTitle>
            <CardDescription>
              Fallback book for transactions (used when no bookId column is mapped).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BookSelect
              value={store.bookId ?? ""}
              onValueChange={(val) => store.setBookId(val)}
            >
              <BookSelectTrigger className="w-full">
                <BookSelectValue placeholder="Select a book…" />
              </BookSelectTrigger>
              <BookSelectContent>
                {books.map((b) => (
                  <BookSelectItem key={b.id} value={b.id}>
                    {b.name}
                  </BookSelectItem>
                ))}
              </BookSelectContent>
            </BookSelect>
          </CardContent>
        </Card>
      )}

      {/* Column mapping */}
      <div className="space-y-3">
        {/* Header row — desktop only */}
        <div className="hidden md:grid md:grid-cols-[1fr_1fr_1.5fr] md:gap-4 md:px-3 md:py-2">
          <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Source Column
          </span>
          <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Preview
          </span>
          <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Maps To
          </span>
        </div>

        {fileInfo.parsedColumns.map((col) => {
          const currentMapping = localMapping[col] ?? null
          const previewValues = getPreviewValues(col)

          return (
            <div
              key={col}
              className="rounded-none border border-border bg-card p-4 md:grid md:grid-cols-[1fr_1fr_1.5fr] md:gap-4 md:items-center"
            >
              {/* Source column name */}
              <div className="mb-2 md:mb-0">
                <span className="text-sm font-medium break-all">{col}</span>
              </div>

              {/* Preview values */}
              <div className="mb-3 md:mb-0">
                <div className="text-xs text-muted-foreground space-y-0.5">
                  {previewValues.map((val, i) => (
                    <div key={i} className="truncate max-w-[200px]" title={val}>
                      {val || (
                        <span className="italic text-muted-foreground/50">
                          (empty)
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Target field dropdown */}
              <div>
                <Select
                  value={currentMapping ?? "--ignore--"}
                  onValueChange={(val) => handleFieldChange(col, val)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Ignore column" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="--ignore--">
                      — Ignore column —
                    </SelectItem>
                    {fields.map((field) => (
                      <SelectItem
                        key={field.value}
                        value={field.value}
                        disabled={field.value !== currentMapping && usedFields.has(field.value)}
                      >
                        {field.label}
                        {field.required && " *"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )
        })}
      </div>

      {/* Validation error */}
      {validationError && (
        <div className="mt-4 rounded-none border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {validationError}
        </div>
      )}

      {/* Navigation buttons */}
      <div className="mt-8 flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => navigate("/import")}>
          <ArrowLeft className="size-3.5" />
          Back to Upload
        </Button>
        <Button size="sm" onClick={handleConfirm}>
          Continue
          <ArrowRight className="size-3.5" />
        </Button>
      </div>
    </div>
  )
}
