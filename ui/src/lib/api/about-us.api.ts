import { apiClient } from "@/lib/api-client"
import { cacheLife, cacheTag } from "next/cache"
import type { ApiResponse } from "@/types/api"

export async function getAboutUsSettings() {
  "use cache"
  cacheLife("hours")
  cacheTag("about-us")
  
  try {
    const res = await apiClient.get<ApiResponse<any>>("/api/v1/settings/about-us")
    return res.data
  } catch (error) {
    console.error("Failed to fetch about-us settings", error)
    return null;
  }
}
