import { apiClient } from "@/lib/api-client"
import type { ApiResponse, ExemptionResult } from "@/types/api"

/**
 * GET /api/v1/exemptions/:country_code — client-side fetch.
 * Thay thế fetchExemptionAction (Server Action POST) bằng GET trực tiếp.
 */
export async function fetchExemption(countryCode: string): Promise<ExemptionResult> {
  const code = encodeURIComponent(countryCode.trim().toUpperCase())
  const res = await apiClient.get<ApiResponse<ExemptionResult>>(`/api/v1/exemptions/${code}`)
  return res.data
}
