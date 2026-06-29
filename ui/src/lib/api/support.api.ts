import { apiClient } from "@/lib/api-client"
import type { ApiResponse, ContactRequest, ContactResponse } from "@/types/api"

const CONTACT_PATH = "/api/v1/support/contact"

/**
 * Gửi form liên hệ — trả ticket_id để hiển thị xác nhận cho user.
 */
export async function submitContact(
  req: ContactRequest
): Promise<ContactResponse> {
  const res = await apiClient.post<ApiResponse<ContactResponse>>(
    CONTACT_PATH,
    req
  )
  return res.data
}
