// ---------------------------------------------------------------------------
// HTTP service — import API
// POST  /api/v1/imports
// ---------------------------------------------------------------------------

import { request } from "./api"
import type { ApiResponse, ImportRequest, ImportResult } from "@/types"

// ---------------------------------------------------------------------------
// POST  /api/v1/imports
// ---------------------------------------------------------------------------

export async function importData(req: ImportRequest): Promise<ImportResult> {
  const res = await request<ApiResponse<ImportResult>>("/api/v1/imports", {
    method: "POST",
    body: req,
  })
  return res.data
}
