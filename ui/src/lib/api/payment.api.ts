import { apiClient } from "@/lib/api-client"
import type {
  ApiResponse,
  CaptureOrderRequest,
  CaptureOrderResponse,
  CreatePaymentSessionResponse,
} from "@/types/api"

const BASE_PATH = "/api/v1/payments"

/**
 * Tạo phiên PayPal Hosted Checkout từ draft — redirect user tới `session_url`.
 */
export async function createPaymentSession(
  draftId: string
): Promise<CreatePaymentSessionResponse> {
  const res = await apiClient.post<ApiResponse<CreatePaymentSessionResponse>>(
    `${BASE_PATH}/create-session`,
    { draft_id: draftId }
  )
  return res.data
}

/**
 * Capture order sau khi PayPal redirect về `/apply/success?token=...`.
 */
export async function captureOrder(
  token: string,
  draftId?: string | null
): Promise<CaptureOrderResponse> {
  const body: CaptureOrderRequest = { token }
  if (draftId?.trim()) {
    body.draft_id = draftId.trim()
  }
  const res = await apiClient.post<ApiResponse<CaptureOrderResponse>>(
    `${BASE_PATH}/capture-order`,
    body
  )
  return res.data
}
