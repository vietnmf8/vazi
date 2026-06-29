import { apiClient } from "@/lib/api-client"
import { cacheLife, cacheTag } from "next/cache"
import type { ApiResponse, Faq } from "@/types/api"

const FAQS_PATH = "/api/v1/faqs"

export async function getFaqs(locale: string = "en"): Promise<Faq[]> {
  "use cache"
  cacheLife("hours")
  cacheTag("faqs")
  const res = await apiClient.get<ApiResponse<Faq[]>>(`${FAQS_PATH}?locale=${locale}`)
  return res.data
}
