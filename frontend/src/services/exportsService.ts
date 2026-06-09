import { request } from "./api"
import type { ApiResponse, ExportJobDto } from "@/types"

// ---------------------------------------------------------------------------
// POST  /api/v1/exports
// ---------------------------------------------------------------------------

export interface CreateExportRequest {
  format: "csv" | "xlsx"
  bookId: string
  from?: string
  to?: string
}

export interface CreateExportResponse {
  jobId: string
  status: "pending"
}

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