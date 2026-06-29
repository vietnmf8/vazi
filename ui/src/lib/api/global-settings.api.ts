import { apiClient } from "@/lib/api-client"
import { cacheLife, cacheTag } from "next/cache"
import type { ApiResponse } from "@/types/api"

const SETTINGS_PATH = "/api/v1/settings"

export async function getGlobalSettings(params?: { isPublic?: boolean }): Promise<Record<string, any>> {
  "use cache"
  cacheLife("hours")
  cacheTag("footer")
  const res = await apiClient.get<ApiResponse<Record<string, any>>>(SETTINGS_PATH, { params })
  return res.data
}
