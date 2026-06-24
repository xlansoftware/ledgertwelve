// ---------------------------------------------------------------------------
// OnlineImportService — delegates to the existing API-based importsService
// ---------------------------------------------------------------------------

import * as importsService from "@/services/importsService"
import type { IImportService, ImportRequest, ImportResult } from "@/features/offline/interfaces/IImportService"

export class OnlineImportService implements IImportService {
  async importData(req: ImportRequest): Promise<ImportResult> {
    return importsService.importData(req)
  }
}
