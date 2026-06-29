import { apiClient } from "@/lib/api"
import type { CloudinaryUploadResult, PresignedUrlResponse } from "@/types/api"

/**
 * Xin tham số ký upload — browser POST multipart thẳng lên Cloudinary.
 */
export async function getPresignedUrl(
 filename: string,
 fileType: string,
): Promise<PresignedUrlResponse> {
 const res = await apiClient.post<PresignedUrlResponse>("/uploads/presigned-url", {
 filename,
 file_type: fileType,
 })
 return res.data as unknown as PresignedUrlResponse
}

/**
 * Upload file lên Cloudinary bằng signed params từ backend.
 */
export async function uploadToCloudinary(
 file: File,
 presigned: PresignedUrlResponse,
 maxRetries = 3
): Promise<string> {
 const formData = new FormData()

 Object.entries(presigned.upload_params).forEach(([key, value]) => {
  formData.append(key, String(value))
 })
 formData.append("file", file)

 let attempt = 0;
 while (attempt < maxRetries) {
  const res = await fetch(presigned.upload_endpoint, {
   method: "POST",
   body: formData,
  })

  if (!res.ok) {
   const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } }
   const errorMessage = body.error?.message || "";
   
   if (res.status === 429 || (res.status === 400 && errorMessage.includes("Slow Down"))) {
    attempt++;
    if (attempt < maxRetries) {
     const delay = Math.pow(2, attempt) * 1000; // 2s, 4s
     await new Promise((resolve) => setTimeout(resolve, delay));
     continue;
    }
   }
   throw new Error(errorMessage || "Upload failed")
  }

  const data = (await res.json()) as CloudinaryUploadResult

  if (data.secure_url) {
   return data.secure_url
  }

  if (data.version && presigned.secure_url_pattern) {
   return presigned.secure_url_pattern.replace("{version}", String(data.version))
  }

  throw new Error("Upload succeeded but no URL returned")
 }

 throw new Error("Upload failed after retries")
}
