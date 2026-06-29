import { apiClient } from "@/lib/api-client"
import { cacheLife, cacheTag } from "next/cache"
import type { ApiResponse, Review } from "@/types/api"

const REVIEWS_PATH = "/api/v1/reviews"

export async function getReviews(params?: { featured?: boolean }): Promise<Review[]> {
  "use cache"
  cacheLife("hours")
  cacheTag("reviews")
  const res = await apiClient.get<ApiResponse<Review[]>>(REVIEWS_PATH, { params })
  return res.data
}


