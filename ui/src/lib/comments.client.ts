import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/types/api"

export interface ApiComment {
  id: string
  content: string | null
  images: string[] | null
  authorName: string
  authorNationality: string | null
  authorToken: string
  parentId: string | null
  helpfulCount: number
  createdAt: string
  originalLanguage?: string | null
  translatedContent?: string | null
}

export interface CreateCommentPayload {
  content?: string
  images?: string[]
  authorName: string
  authorEmail: string
  authorNationality?: string
  parentId?: string
}

export const commentsClient = {
  async getAll(): Promise<ApiComment[]> {
    const res = await apiClient.get<ApiResponse<ApiComment[]>>("/api/v1/comments")
    return res.data
  },

  async create(payload: CreateCommentPayload): Promise<ApiComment> {
    const res = await apiClient.post<ApiResponse<ApiComment>>("/api/v1/comments", payload)
    return res.data
  },

  async delete(id: string, authorToken: string): Promise<void> {
    await apiClient.delete<ApiResponse<null>>(`/api/v1/comments/${id}`, { authorToken })
  },

  async helpful(id: string): Promise<{ id: string; helpfulCount: number }> {
    const res = await apiClient.post<ApiResponse<{ id: string; helpfulCount: number }>>(`/api/v1/comments/${id}/helpful`)
    return res.data
  },

  async edit(id: string, token: string, payload: { content?: string; images?: string[] }): Promise<ApiComment> {
    const res = await apiClient.patch<ApiResponse<ApiComment>>(`/api/v1/comments/${id}`, {
      authorToken: token,
      ...payload,
    })
    return res.data
  },
}

/** Hash email client-side bằng Web Crypto API (không cần thư viện) */
export async function hashEmailToToken(email: string): Promise<string> {
  const normalized = email.toLowerCase().trim()
  const encoded = new TextEncoder().encode(normalized)
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

const TOKEN_KEY = "fastvisa_comment_token"

export function getStoredAuthorToken(): string | null {
  if (typeof window === "undefined") return null
  return sessionStorage.getItem(TOKEN_KEY)
}

export function storeAuthorToken(token: string): void {
  sessionStorage.setItem(TOKEN_KEY, token)
}

function base64ToBlob(base64: string): Blob {
  const arr = base64.split(",")
  const mimeMatch = arr[0].match(/:(.*?);/)
  const mime = mimeMatch ? mimeMatch[1] : "image/jpeg"
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  return new Blob([u8arr], { type: mime })
}

export async function uploadImagesToCloudinary(base64Images: string[]): Promise<string[]> {
  const uploadedUrls: string[] = []
  
  for (const b64 of base64Images) {
    if (!b64.startsWith("data:")) {
      uploadedUrls.push(b64) // Already a URL
      continue
    }

    try {
      const blob = base64ToBlob(b64)
      const mimeType = blob.type

      // 1. Get presigned URL
      const { data: presigned } = await apiClient.post<ApiResponse<{
        upload_endpoint: string
        upload_params: Record<string, string | number>
        secure_url_pattern: string
        public_id: string
      }>>("/api/v1/uploads/presigned-url", { file_type: mimeType, filename: `image_${Date.now()}.jpg` })

      // 2. Upload to Cloudinary
      const formData = new FormData()
      formData.append("file", blob)
      for (const [key, value] of Object.entries(presigned.upload_params)) {
        formData.append(key, String(value))
      }

      const uploadRes = await fetch(presigned.upload_endpoint, {
        method: "POST",
        body: formData,
      })
      const uploadData = await uploadRes.json()

      if (!uploadRes.ok) {
        throw new Error(uploadData.error?.message || "Failed to upload")
      }

      uploadedUrls.push(uploadData.secure_url)
    } catch (error) {
      console.error("Cloudinary upload error:", error)
      // Optionally continue or throw. We continue to try others if one fails.
    }
  }

  return uploadedUrls
}
