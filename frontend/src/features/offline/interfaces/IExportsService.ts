// ---------------------------------------------------------------------------
// IExportsService — interface for export operations
// ---------------------------------------------------------------------------

import type { ExportJobDto } from "@/types"
import type { ContentType, ExportFormat, CreateExportRequest, CreateExportResponse } from "@/services/exportsService"

export type { ContentType, ExportFormat, CreateExportRequest, CreateExportResponse }

export interface IExportsService {
  createExport(req: CreateExportRequest): Promise<CreateExportResponse>
  getExportJob(jobId: string): Promise<ExportJobDto>
  downloadExport(jobId: string): Promise<Blob>
}
