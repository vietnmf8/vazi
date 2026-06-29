import { apiClient } from "@/lib/api-client"
import type { ApiResponse, NewsletterSubscribeResponse } from "@/types/api"

const NEWSLETTER_PATH = "/api/v1/newsletter/subscribe"

export async function subscribeNewsletter(
  email: string,
): Promise<NewsletterSubscribeResponse> {
  const res = await apiClient.post<ApiResponse<NewsletterSubscribeResponse>>(
    NEWSLETTER_PATH,
    { email },
  )
  return res.data
}
