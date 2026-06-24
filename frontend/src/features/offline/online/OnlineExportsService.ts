// ---------------------------------------------------------------------------
// OnlineExportsService — delegates to the existing API-based exportsService
// ---------------------------------------------------------------------------

import * as exportsService from "@/services/exportsService"
import type { IExportsService, CreateExportRequest, CreateExportResponse } from "@/features/offline/interfaces/IExportsService"
import type { ExportJobDto } from "@/types"

export class OnlineExportsService implements IExportsService {
  async createExport(req: CreateExportRequest): Promise<CreateExportResponse> {
    return exportsService.createExport(req)
  }

  async getExportJob(jobId: string): Promise<ExportJobDto> {
    return exportsService.getExportJob(jobId)
  }

  async downloadExport(jobId: string): Promise<Blob> {
    return exportsService.downloadExport(jobId)
  }
}
