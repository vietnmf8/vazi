import { apiClient } from "@/lib/api-client"
import type { ApiResponse, ExtractPassportResponse } from "@/types/api"

const BASE_PATH = "/api/v1/applications"

/**
 * Gửi file nhị phân lên backend để OCR bằng Gemini Vision qua multer in-memory.
 */
export async function extractPassportFormData(
  file: Blob
): Promise<ExtractPassportResponse> {
  const formData = new FormData()
  formData.append("image", file, "passport.jpg")

  const res = await apiClient.post<ApiResponse<ExtractPassportResponse>>(
    `${BASE_PATH}/extract-passport`,
    formData
  )
  return res.data
}
