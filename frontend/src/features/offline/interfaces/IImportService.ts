// ---------------------------------------------------------------------------
// IImportService — interface for import operations
// ---------------------------------------------------------------------------

import type { ImportRequest, ImportResult } from "@/types"

export type { ImportRequest, ImportResult }

export interface IImportService {
  importData(req: ImportRequest): Promise<ImportResult>
}
