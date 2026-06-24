// ---------------------------------------------------------------------------
// HTTP service — exports API
// POST  /api/v1/exports
// GET   /api/v1/exports/{jobId}
// GET   /api/v1/exports/{jobId}/download
// ---------------------------------------------------------------------------

import { request } from "./api"
import type { ApiResponse, ExportJobDto } from "@/types"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ContentType =
  | "categories"
  | "transactions"
  | "books"
  | "report-daily-total"
  | "report-daily-per-category"
  | "report-monthly-total"
  | "report-monthly-per-category"
  | "report-yearly-total"
  | "report-yearly-per-category"
  | "backup"

export type ExportFormat = "csv" | "xlsx" | "json"

export interface CreateExportRequest {
  format?: ExportFormat
  contentType: ContentType
  bookId?: string
}

export interface CreateExportResponse {
  jobId: string
  status: "pending"
}

// ---------------------------------------------------------------------------
// POST  /api/v1/exports
// ---------------------------------------------------------------------------

export async function createExport(req: CreateExportRequest): Promise<CreateExportResponse> {
  const res = await request<ApiResponse<CreateExportResponse>>("/api/v1/exports", {
    method: "POST",
    body: req,
  })
  return res.data
}

// ---------------------------------------------------------------------------
// GET   /api/v1/exports/{jobId}
// ---------------------------------------------------------------------------

export async function getExportJob(jobId: string): Promise<ExportJobDto> {
  const res = await request<ApiResponse<ExportJobDto>>(`/api/v1/exports/${jobId}`)
  return res.data
}

// ---------------------------------------------------------------------------
// GET   /api/v1/exports/{jobId}/download
// ---------------------------------------------------------------------------

export async function downloadExport(jobId: string): Promise<Blob> {
  return request<Blob>(`/api/v1/exports/${jobId}/download`)
}
