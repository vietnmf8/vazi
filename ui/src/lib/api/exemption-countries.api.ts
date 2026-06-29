import { apiClient } from "@/lib/api-client"
import { cacheLife, cacheTag } from "next/cache"
import type { ApiResponse } from "@/types/api"

const EXEMPTION_COUNTRIES_PATH = "/api/v1/exemption-countries"

export interface VisaExemptionCountry {
  id: string
  country_code: string
  exemption_days: number
  display_order: number
  is_active: boolean
}

export async function getExemptionCountries(): Promise<VisaExemptionCountry[]> {
  "use cache"
  cacheLife("hours")
  cacheTag("exemption-countries")
  const res = await apiClient.get<ApiResponse<VisaExemptionCountry[]>>(
    EXEMPTION_COUNTRIES_PATH
  )
  return res.data
}
