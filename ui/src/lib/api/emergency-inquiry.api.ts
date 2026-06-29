import { apiClient } from "@/lib/api-client"
import { cacheLife, cacheTag } from "next/cache"
import type { ApiResponse } from "@/types/api"

export async function getEmergencyInquirySettings() {
  "use cache"
  cacheLife("hours")
  cacheTag("emergency-inquiry")
  
  try {
    const res = await apiClient.get<ApiResponse<any>>("/api/v1/settings/emergency-inquiry")
    return res.data
  } catch (error) {
    console.error("Failed to fetch emergency-inquiry settings", error)
    return null;
  }
}
