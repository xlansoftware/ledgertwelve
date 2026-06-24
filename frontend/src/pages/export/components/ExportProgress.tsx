// ---------------------------------------------------------------------------
// ExportProgress — displays export job progress, status, download button, and errors
// ---------------------------------------------------------------------------

import type { JobStatus } from "../useExport"
import { Button } from "@/components/ui/button"

interface ExportProgressProps {
  status: JobStatus
  errorMessage: string | null
  onDownload: () => void
  onReset: () => void
}

export function ExportProgress({ status, errorMessage, onDownload, onReset }: ExportProgressProps) {
  if (status === "idle") {
    return null
  }

  return (
    <div className="mt-6 rounded-lg border p-4 space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground">Export Progress</h3>

      {/* Pending / Processing */}
      {(status === "pending" || status === "processing") && (
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-sm">
            {status === "pending" ? "Starting export…" : "Generating export file…"}
          </span>
        </div>
      )}

      {/* Completed */}
      {status === "completed" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span>Export completed</span>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={onDownload}>
              Download
            </Button>
            <Button size="sm" variant="outline" onClick={onReset}>
              Start New Export
            </Button>
          </div>
        </div>
      )}

      {/* Failed */}
      {status === "failed" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>Export failed</span>
          </div>
          {errorMessage && (
            <p className="text-sm text-muted-foreground">{errorMessage}</p>
          )}
          <Button size="sm" variant="outline" onClick={onReset}>
            Try Again
          </Button>
        </div>
      )}
    </div>
  )
}
