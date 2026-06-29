import { apiClient } from "@/lib/api-client"
import type {
  ApiResponse,
  ApplicationDetail,
  ApplicationStatusResult,
  CalculatePriceRequest,
  PriceBreakdown,
  SubmitApplicationRequest,
  SubmitApplicationResponse,
  CreatePaymentSessionResponse,
} from "@/types/api"

const BASE_PATH = "/api/v1/applications"

/**
 * Báo giá realtime theo lựa chọn form — debounce ở caller (Step 7.2).
 */
export async function calculatePrice(
  req: CalculatePriceRequest
): Promise<PriceBreakdown> {
  const res = await apiClient.post<ApiResponse<PriceBreakdown>>(
    `${BASE_PATH}/calculate-price`,
    req
  )
  return res.data
}

/**
 * Gửi đơn apply sau Step 1 + 2 — trả draft_id để tạo payment session.
 */
export async function submitApplication(
  req: SubmitApplicationRequest
): Promise<SubmitApplicationResponse> {
  const res = await apiClient.post<ApiResponse<SubmitApplicationResponse>>(
    `${BASE_PATH}/submit`,
    req
  )
  return res.data
}

/**
 * Chi tiết đơn cho Review & Checkout / Resume magic link.
 */
export async function getApplication(id: string): Promise<ApplicationDetail> {
  const res = await apiClient.get<ApiResponse<ApplicationDetail>>(
    `${BASE_PATH}/${encodeURIComponent(id)}`
  )
  return res.data
}

/**
 * Tra cứu trạng thái theo mã đơn + email — 404 khi không khớp.
 */
export async function checkStatus(
  bookingNumber: string,
  email: string
): Promise<ApplicationStatusResult> {
  const res = await apiClient.get<ApiResponse<ApplicationStatusResult>>(
    `${BASE_PATH}/status`,
    {
      params: {
        booking_number: bookingNumber,
        email,
      },
    }
  )
  return res.data
}

/**
 * Thử lại thanh toán — tạo payment session mới cho đơn lỗi/hủy.
 */
export async function retryPayment(
  draftId: string
): Promise<CreatePaymentSessionResponse> {
  const res = await apiClient.post<ApiResponse<CreatePaymentSessionResponse>>(
    `${BASE_PATH}/retry-payment`,
    { draft_id: draftId }
  )
  return res.data
}
