// ---------------------------------------------------------------------------
// useImport — orchestration hook for the multi-step import workflow
// Coordinates between store, services, and feature modules.
// ---------------------------------------------------------------------------

import { useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { useImportStore } from "@/store/useImportStore"
import { parseFile } from "@/features/import/parser"
import { autoMap } from "@/features/import/mapper"
import { convert } from "@/features/import/converter"
import { getFactory } from "@/features/offline"
import type { ImportEntityType, ImportRequest } from "@/types"

export function useImport() {
  const navigate = useNavigate()
  const store = useImportStore()

  // ---------------------------------------------------------------------------
  // Step 1: Upload page — select entity type and file
  // ---------------------------------------------------------------------------

  const handleEntityTypeChange = useCallback(
    (entityType: ImportEntityType) => {
      store.setEntityType(entityType)
      store.setFileInfo(null)
      store.setMapping({})
      store.setConvertedRows([])
      store.setBackupData(null)
      store.setError(null)
    },
    [store],
  )

  const handleFileParsed = useCallback(
    async (file: File) => {
      store.setError(null)

      try {
        const parsed = await parseFile(file, store.fileInfo?.selectedSheet ?? undefined)

        store.setFileInfo({
          fileName: file.name,
          parsedColumns: parsed.columns,
          parsedRows: parsed.rows,
          sheetNames: parsed.sheetNames,
          selectedSheet: parsed.selectedSheet,
        })

        // Auto-map columns
        if (store.entityType && store.entityType !== "backup") {
          const { mapping } = autoMap(parsed.columns, store.entityType)
          store.setMapping(mapping)
        }

        // Navigate to mapping page (skip for backup)
        if (store.entityType === "backup") {
          navigate("/import/preview")
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
    },
    [store, navigate],
  )

  const handleSheetChange = useCallback(
    async (_sheetName: string) => {
      store.setError(null)
      const file = store.fileInfo
      if (!file) return
      store.setError("Sheet changes require re-uploading the file")
    },
    [store],
  )

  // ---------------------------------------------------------------------------
  // Step 2: Mapping page — update mapping and convert
  // ---------------------------------------------------------------------------

  const handleMappingChange = useCallback(
    (newMapping: Record<string, string | null>) => {
      store.setMapping(newMapping)
    },
    [store],
  )

  const handleMappingConfirm = useCallback(
    (additionalBookId?: string) => {
      const { entityType, fileInfo, mapping } = store

      if (!entityType || !fileInfo) return

      // Apply bookId mapping if set (column mapped to bookId takes priority)
      const rows = fileInfo.parsedRows

      // Convert rows to typed values
      const { convertedRows } = convert(rows, mapping, entityType)

      store.setConvertedRows(convertedRows)

      // Set the bookId from parameter or store
      if (additionalBookId) {
        store.setBookId(additionalBookId)
      }

      // Navigate to preview
      navigate("/import/preview")
    },
    [store, navigate],
  )

  const handlePreviewBackToMapping = useCallback(() => {
    navigate("/import/mapping")
  }, [navigate])

  // ---------------------------------------------------------------------------
  // Step 3: Preview — preview and confirm import
  // ---------------------------------------------------------------------------

  const handlePreview = useCallback(async () => {
    const { entityType, bookId, clearExisting, convertedRows, backupData, mapping } = store
    store.setError(null)

    if (!entityType) return

    try {
      const req: ImportRequest = {
        preview: true,
        entityType,
        ...(entityType !== "backup" ? { bookId: bookId ?? undefined } : {}),
        clearExisting,
        ...(entityType !== "backup" ? { mapping, rows: convertedRows } : {}),
        ...(entityType === "backup" && backupData ? { data: backupData } : {}),
      }

      const result = await getFactory().imports.importData(req)
      store.setImportResult(result)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to preview import"
      store.setError(message)
    }
  }, [store])

  const handleImport = useCallback(async () => {
    const { entityType, bookId, clearExisting, convertedRows, backupData, mapping } = store
    store.setStep("importing")
    store.setError(null)

    if (!entityType) return

    try {
      const req: ImportRequest = {
        preview: false,
        entityType,
        ...(entityType !== "backup" ? { bookId: bookId ?? undefined } : {}),
        clearExisting,
        ...(entityType !== "backup" ? { mapping, rows: convertedRows } : {}),
        ...(entityType === "backup" && backupData ? { data: backupData } : {}),
      }

      const result = await getFactory().imports.importData(req)
      store.setImportResult(result)
      store.setStep("complete")
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to import data"
      store.setError(message)
      store.setStep("preview")
    }
  }, [store])

  const handleReset = useCallback(() => {
    store.reset()
    navigate("/import")
  }, [store, navigate])

  const handleRetry = useCallback(() => {
    store.setStep("preview")
    store.setError(null)
  }, [store])

  // ---------------------------------------------------------------------------
  // Navigation helpers
  // ---------------------------------------------------------------------------

  const goToUpload = useCallback(() => {
    navigate("/import")
  }, [navigate])

  const goToSettings = useCallback(() => {
    navigate("/settings")
  }, [navigate])

  const goToHistory = useCallback(() => {
    navigate("/history")
  }, [navigate])

  return {
    // State
    step: store.step,
    entityType: store.entityType,
    bookId: store.bookId,
    clearExisting: store.clearExisting,
    fileInfo: store.fileInfo,
    mapping: store.mapping,
    convertedRows: store.convertedRows,
    importResult: store.importResult,
    backupData: store.backupData,
    error: store.error,

    // Upload
    handleEntityTypeChange,
    handleFileParsed,
    handleSheetChange,

    // Mapping
    handleMappingChange,
    handleMappingConfirm,

    // Preview
    handlePreview,
    handlePreviewBackToMapping,
    handleImport,
    handleReset,
    handleRetry,

    // Navigation
    goToUpload,
    goToSettings,
    goToHistory,
  }
}
