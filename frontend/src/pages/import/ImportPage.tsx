// ---------------------------------------------------------------------------
// ImportPage — step 1 of the import workflow
// Entity type selection, file upload, sheet selector (XLSX), clearExisting checkbox
// ---------------------------------------------------------------------------

import { useRef, useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useImportStore } from "@/store/useImportStore"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useBooksStore } from "@/store"
import { Upload, FileText, Database, BookOpen, ArrowLeft } from "lucide-react"
import type { ImportEntityType } from "@/types"

export default function ImportPage() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  const store = useImportStore()
  const books = useBooksStore((s) => s.books)
  const fetchBooks = useBooksStore((s) => s.fetchBooks)

  useEffect(() => {
    if (books.length === 0) {
      fetchBooks()
    }
  }, [books.length, fetchBooks])

  const entityTypes: { value: ImportEntityType; label: string; icon: React.ReactNode; description: string }[] = [
    {
      value: "transactions",
      label: "Transactions",
      icon: <FileText className="size-5" />,
      description: "Import transactions from CSV, XLSX, or JSON",
    },
    {
      value: "categories",
      label: "Categories",
      icon: <Database className="size-5" />,
      description: "Import categories from CSV, XLSX, or JSON",
    },
    {
      value: "books",
      label: "Books",
      icon: <BookOpen className="size-5" />,
      description: "Import books from CSV, XLSX, or JSON",
    },
    {
      value: "backup",
      label: "Restore Backup",
      icon: <Upload className="size-5" />,
      description: "Restore a full backup JSON file",
    },
  ]

  const handleEntityTypeClick = (type: ImportEntityType) => {
    store.setEntityType(type)
    store.setFileInfo(null)
    store.setMapping({})
    store.setConvertedRows([])
    store.setBackupData(null)
    store.setError(null)
  }

  const handleFileSelect = async (file: File) => {
    // Validate extension
    const ext = file.name.split(".").pop()?.toLowerCase()
    const allowedExts = ["csv", "xlsx", "xls", "json"]
    if (!ext || !allowedExts.includes(ext)) {
      store.setError(`Unsupported file format: .${ext}. Supported formats: .csv, .xlsx, .json`)
      return
    }

    store.setError(null)
    store.setFileInfo(null)

    try {
      // Dynamic import of parser
      const { parseFile } = await import("@/features/import/parser")

      const parsed = await parseFile(file)

      store.setFileInfo({
        fileName: file.name,
        parsedColumns: parsed.columns,
        parsedRows: parsed.rows,
        sheetNames: parsed.sheetNames,
        selectedSheet: parsed.selectedSheet,
      })

      // Auto-map columns for non-backup
      if (store.entityType && store.entityType !== "backup") {
        const { autoMap } = await import("@/features/import/mapper")
        const { mapping } = autoMap(parsed.columns, store.entityType)
        store.setMapping(mapping)
      }

      // For backup, parse the JSON and extract backup data
      if (store.entityType === "backup") {
        try {
          const text = await file.text()
          const jsonData = JSON.parse(text)
          store.setBackupData(jsonData as Record<string, unknown>)
          // Navigate directly to preview for backups
          navigate("/import/preview")
        } catch {
          store.setError("Invalid JSON file for backup restore")
          return
        }
      } else {
        navigate("/import/mapping")
      }
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? (err as { message: string }).message
          : "Failed to parse file"
      store.setError(message)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileSelect(file)
    // Reset input so the same file can be re-selected
    e.target.value = ""
  }

  const handleClearExistingToggle = () => {
    if (!store.clearExisting) {
      setShowClearConfirm(true)
    } else {
      store.setClearExisting(false)
    }
  }

  const handleClearConfirm = () => {
    store.setClearExisting(true)
    setShowClearConfirm(false)
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Import Data</h1>

      {/* Entity type selection */}
      {!store.entityType && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">What would you like to import?</p>
          {entityTypes.map(({ value, label, icon, description }) => (
            <button
              key={value}
              onClick={() => handleEntityTypeClick(value)}
              className="flex w-full items-center gap-4 rounded-none border border-border bg-card p-4 text-left text-sm transition-all hover:bg-muted"
            >
              <span className="flex size-10 shrink-0 items-center justify-center bg-muted text-muted-foreground">
                {icon}
              </span>
              <div className="flex-1">
                <div className="font-semibold tracking-wider uppercase">{label}</div>
                <div className="text-xs text-muted-foreground">{description}</div>
              </div>
            </button>
          ))}

          <div className="pt-4">
            <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="size-3.5" />
              Back
            </Button>
          </div>
        </div>
      )}

      {/* File upload */}
      {store.entityType && (
        <div className="space-y-6">
          {/* Selected entity type indicator */}
          <div className="flex items-center gap-2 text-sm">
            <Button
              variant="outline"
              size="xs"
              onClick={() => {
                store.setEntityType(null)
                store.setError(null)
              }}
            >
              Change type
            </Button>
            <span className="text-muted-foreground">
              Importing:{" "}
              <span className="font-semibold text-foreground uppercase">
                {entityTypes.find((t) => t.value === store.entityType)?.label}
              </span>
            </span>
          </div>

          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center border-2 border-dashed p-8 transition-colors ${
              isDragging
                ? "border-primary bg-primary/5"
                : "border-border hover:border-muted-foreground/50"
            }`}
          >
            <Upload className="mb-4 size-8 text-muted-foreground" />
            <p className="text-sm font-medium">
              {isDragging ? "Drop file here" : "Drag & drop file here, or click to browse"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {store.entityType === "backup"
                ? "Supports .json (backup files)"
                : "Supports .csv, .xlsx, .json"}
            </p>
            <Input
              ref={fileInputRef}
              type="file"
              accept={
                store.entityType === "backup"
                  ? ".json"
                  : ".csv,.xlsx,.xls,.json"
              }
              className="hidden"
              onChange={handleInputChange}
            />
          </div>

          {/* Error message */}
          {store.error && (
            <div className="rounded-none border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {store.error}
            </div>
          )}

          {/* Sheet selector for XLSX (shown after file is parsed) */}
          {store.fileInfo?.sheetNames && store.fileInfo.sheetNames.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Sheet</CardTitle>
                <CardDescription>
                  Select which sheet to import from. The file contains{" "}
                  {store.fileInfo.sheetNames.length} sheets.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Select
                  value={store.fileInfo.selectedSheet ?? store.fileInfo.sheetNames[0]}
                  onValueChange={(_val) => {
                    // Re-parse with new sheet — for now show info
                    store.setError("Sheet selection requires re-uploading the file. Please select the correct sheet first.")
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a sheet…" />
                  </SelectTrigger>
                  <SelectContent>
                    {store.fileInfo.sheetNames.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          )}

          {/* File parsed info */}
          {store.fileInfo && (
            <div className="rounded-none border border-border bg-card p-4 text-sm">
              <div className="flex items-center gap-2">
                <FileText className="size-4 text-muted-foreground" />
                <span className="font-medium">{store.fileInfo.fileName}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {store.fileInfo.parsedColumns.length} columns,{" "}
                {store.fileInfo.parsedRows.length} rows found
              </p>
              {store.fileInfo.selectedSheet && (
                <p className="text-xs text-muted-foreground">
                  Sheet: {store.fileInfo.selectedSheet}
                </p>
              )}
            </div>
          )}

          {/* clearExisting checkbox (not for backup) */}
          {store.entityType !== "backup" && (
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={store.clearExisting}
                onChange={handleClearExistingToggle}
                className="mt-0.5 size-4 accent-primary"
              />
              <div>
                <span className="text-sm font-medium">
                  Clear existing data before importing
                </span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {store.entityType === "transactions" &&
                    "Deletes all transactions in the target book before importing"}
                  {store.entityType === "categories" &&
                    "Deletes all user categories before importing"}
                  {store.entityType === "books" &&
                    "Deletes all user books (except Main) before importing"}
                </p>
              </div>
            </label>
          )}

          {/* Book picker for transactions */}
          {store.entityType === "transactions" && (
            <Card>
              <CardHeader>
                <CardTitle>Target Book</CardTitle>
                <CardDescription>
                  Select which book to import transactions into. This is the
                  fallback book if no bookId column is mapped.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Select
                  value={store.bookId ?? ""}
                  onValueChange={(val) => store.setBookId(val)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a book…" />
                  </SelectTrigger>
                  <SelectContent>
                    {books.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          )}

          {/* Confirm clearExisting dialog */}
          <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear Existing Data?</AlertDialogTitle>
                <AlertDialogDescription>
                  {store.entityType === "transactions" &&
                    "This will delete ALL transactions in the selected book before importing. This action cannot be undone."}
                  {store.entityType === "categories" &&
                    "This will delete ALL user categories before importing. This action cannot be undone."}
                  {store.entityType === "books" &&
                    "This will delete ALL books (except Main) before importing. This action cannot be undone."}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearConfirm}>
                  Clear & Import
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  )
}
