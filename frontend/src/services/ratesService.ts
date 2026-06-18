import { request } from "./api"
import type { ApiResponse, ExchangeRateDto } from "@/types"

// ---------------------------------------------------------------------------
// GET   /api/v1/rates/exchange?from=XXX&to=YYY
// ---------------------------------------------------------------------------

export interface ExchangeRateParams {
  from: string
  to: string
}

export async function getExchangeRate(params: ExchangeRateParams): Promise<ExchangeRateDto> {
  const res = await request<ApiResponse<ExchangeRateDto>>("/api/v1/rates/exchange", {
    params: {
      from: params.from.toUpperCase(),
      to: params.to.toUpperCase(),
    },
  })
  return res.data
}