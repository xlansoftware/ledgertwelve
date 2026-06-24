// ---------------------------------------------------------------------------
// useExport — hook for form state, export orchestration, job polling
// ---------------------------------------------------------------------------

import { useState, useRef, useCallback, useEffect } from "react"
import { getFactory } from "@/features/offline"
import type { ContentType, ExportFormat, CreateExportRequest } from "@/features/offline/interfaces/IExportsService"

export interface ExportFormState {
  format: ExportFormat
  contentType: ContentType | null
  bookId: string | null
  reportPeriod: "daily" | "monthly" | "yearly" | null
  reportGroupBy: "total" | "per-category" | null
}

export type JobStatus = "idle" | "pending" | "processing" | "completed" | "failed"

export interface ExportJobState {
  status: JobStatus
  jobId: string | null
  downloadUrl: string | null
  errorMessage: string | null
}

export function useExport() {
  const [form, setForm] = useState<ExportFormState>({
    format: "csv",
    contentType: null,
    bookId: null,
    reportPeriod: null,
    reportGroupBy: null,
  })

  const [job, setJob] = useState<ExportJobState>({
    status: "idle",
    jobId: null,
    downloadUrl: null,
    errorMessage: null,
  })

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
      }
    }
  }, [])

  const updateForm = useCallback((partial: Partial<ExportFormState>) => {
    setForm((prev) => ({ ...prev, ...partial }))
  }, [])

  const setFormat = useCallback((format: ExportFormat) => {
    setForm((prev) => ({ ...prev, format }))
  }, [])

  const setContentType = useCallback((contentType: ContentType) => {
    setForm((prev) => ({
      ...prev,
      contentType,
      // Reset sub-options when content type changes
      reportPeriod: contentType.startsWith("report-") ? "daily" : null,
      reportGroupBy: contentType.startsWith("report-") ? "total" : null,
    }))
  }, [])

  const setBookId = useCallback((bookId: string | null) => {
    setForm((prev) => ({ ...prev, bookId }))
  }, [])

  const setReportPeriod = useCallback((reportPeriod: "daily" | "monthly" | "yearly") => {
    setForm((prev) => ({ ...prev, reportPeriod }))
  }, [])

  const setReportGroupBy = useCallback((reportGroupBy: "total" | "per-category") => {
    setForm((prev) => ({ ...prev, reportGroupBy }))
  }, [])

  const isBackup = form.contentType === "backup"

  /**
   * Map form state to a flat contentType value for the API.
   */
  const getApiContentType = useCallback((): ContentType | null => {
    const { contentType, reportPeriod, reportGroupBy } = form

    if (contentType === "backup") return "backup"
    if (contentType === "categories") return "categories"
    if (contentType === "transactions") return "transactions"
    if (contentType === "books") return "books"

    if (contentType?.startsWith("report-")) {
      if (reportPeriod === "daily") {
        return reportGroupBy === "per-category"
          ? "report-daily-per-category"
          : "report-daily-total"
      }
      if (reportPeriod === "monthly") {
        return reportGroupBy === "per-category"
          ? "report-monthly-per-category"
          : "report-monthly-total"
      }
      if (reportPeriod === "yearly") {
        return reportGroupBy === "per-category"
          ? "report-yearly-per-category"
          : "report-yearly-total"
      }
    }

    return null
  }, [form])

  /**
   * Start the export. Validates form state and creates the export job.
   */
  const startExport = useCallback(async () => {
    const apiContentType = getApiContentType()
    if (!apiContentType) return

    // Stop any previous polling
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }

    const req: CreateExportRequest = {
      format: isBackup ? undefined : form.format,
      contentType: apiContentType,
      bookId: apiContentType === "transactions" ? form.bookId ?? undefined : undefined,
    }

    setJob({ status: "pending", jobId: null, downloadUrl: null, errorMessage: null })

    try {
      const result = await getFactory().exports.createExport(req)
      setJob((prev) => ({ ...prev, status: "pending", jobId: result.jobId }))

      // Start polling
      pollingRef.current = setInterval(async () => {
        try {
          const status = await getFactory().exports.getExportJob(result.jobId)
          setJob((prev) => ({
            ...prev,
            status: status.status,
            downloadUrl: status.downloadUrl ?? null,
            errorMessage: status.errorMessage ?? null,
          }))

          if (status.status === "completed" || status.status === "failed") {
            if (pollingRef.current) {
              clearInterval(pollingRef.current)
              pollingRef.current = null
            }
          }
        } catch {
          if (pollingRef.current) {
            clearInterval(pollingRef.current)
            pollingRef.current = null
          }
          setJob((prev) => ({
            ...prev,
            status: "failed",
            errorMessage: "Failed to check export status",
          }))
        }
      }, 500)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to start export"
      setJob({ status: "failed", jobId: null, downloadUrl: null, errorMessage: message })
    }
  }, [form, isBackup, getApiContentType])

  /**
   * Download the completed export.
   */
  const download = useCallback(async () => {
    if (!job.jobId) return

    try {
      const blob = await getFactory().exports.downloadExport(job.jobId)
      const filename = getDownloadFilename(form, job.jobId)
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Download failed"
      setJob((prev) => ({ ...prev, status: "failed", errorMessage: message }))
    }
  }, [job.jobId, form])

  /**
   * Reset the export form to start a new export.
   */
  const reset = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
    setJob({ status: "idle", jobId: null, downloadUrl: null, errorMessage: null })
  }, [])

  return {
    form,
    job,
    isBackup,
    setFormat,
    setContentType,
    setBookId,
    setReportPeriod,
    setReportGroupBy,
    updateForm,
    startExport,
    download,
    reset,
  }
}

/**
 * Generate a descriptive filename for the download.
 */
function getDownloadFilename(form: ExportFormState, jobId: string): string {
  const date = new Date().toISOString().slice(0, 10)
  const contentType = form.contentType
  const format = form.format

  if (contentType === "backup") return `ledger12-backup-${date}.json`
  if (contentType === "categories") return `categories-${date}.${format}`
  if (contentType === "books") return `books-${date}.${format}`
  if (contentType === "transactions") {
    const bookId = form.bookId || "unknown"
    return `transactions-${bookId}-${date}.${format}`
  }
  if (contentType === "report-daily-total") return `report-daily-total-${date}.${format}`
  if (contentType === "report-daily-per-category") return `report-daily-per-category-${date}.${format}`
  if (contentType === "report-monthly-total") return `report-monthly-total-${date}.${format}`
  if (contentType === "report-monthly-per-category") return `report-monthly-per-category-${date}.${format}`
  if (contentType === "report-yearly-total") return `report-yearly-total-${date}.${format}`
  if (contentType === "report-yearly-per-category") return `report-yearly-per-category-${date}.${format}`

  return `export-${jobId}.${format}`
}
