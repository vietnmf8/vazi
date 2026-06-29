/**
 * API client dùng cho tất cả requests từ UI → backend.
 *
 * Base URL lấy từ env NEXT_PUBLIC_API_URL để dễ swap giữa local / staging / production.
 * GET có retry tối đa 3 lần (exponential backoff) — POST/PUT/PATCH/DELETE không retry
 * để tránh duplicate submission khi server đã xử lý nhưng client timeout.
 */

import { API_BASE_URL } from "@/lib/api-base-url"

const BASE_URL = API_BASE_URL

/** Số lần retry sau request đầu — delay 500ms → 1000ms → 2000ms */
const MAX_RETRIES = 3
const RETRY_DELAYS_MS = [500, 1000, 2000] as const

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE"

interface RequestOptions extends Omit<RequestInit, "method" | "body"> {
  params?: Record<string, string | number | boolean | undefined>
}

interface ApiErrorBody {
  message?: string
  code?: string
  details?: Record<string, string[]>
}

interface ApiErrorEnvelope {
  error?: ApiErrorBody
  message?: string
}

/**
 * Lỗi HTTP từ backend — giữ status + code để UI phân nhánh (404 vs 500 vs validation).
 */
export class ApiClientError extends Error {
  readonly status: number
  readonly code?: string
  readonly details?: Record<string, string[]>

  constructor(
    message: string,
    status: number,
    code?: string,
    details?: Record<string, string[]>
  ) {
    super(message)
    this.name = "ApiClientError"
    this.status = status
    this.code = code
    this.details = details
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Chỉ retry GET idempotent — network fail hoặc 5xx */
function shouldRetry(method: HttpMethod, status?: number, error?: unknown): boolean {
  if (method !== "GET") return false
  if (error instanceof TypeError) return true
  if (status !== undefined && status >= 500) return true
  return false
}

function parseErrorMessage(body: ApiErrorEnvelope, fallback: string): string {
  return body.error?.message ?? body.message ?? fallback
}

async function request<T>(
  method: HttpMethod,
  path: string,
  body?: unknown,
  options?: RequestOptions
): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`)

  if (options?.params) {
    Object.entries(options.params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.set(key, String(value))
      }
    })
  }

  let lastError: unknown

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await sleep(RETRY_DELAYS_MS[attempt - 1]!)
    }

    try {
      const isFormData = body instanceof FormData;
      const headers = new Headers(options?.headers);
      if (!isFormData && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
      }

      const res = await fetch(url.toString(), {
        method,
        headers,
        body: body !== undefined ? (isFormData ? body : JSON.stringify(body)) : undefined,
        credentials: "include",
        ...options,
      })

      if (!res.ok) {
        const errorBody = (await res
          .json()
          .catch(() => ({}))) as ApiErrorEnvelope

        if (shouldRetry(method, res.status) && attempt < MAX_RETRIES) {
          lastError = new ApiClientError(
            parseErrorMessage(errorBody, res.statusText),
            res.status,
            errorBody.error?.code,
            errorBody.error?.details
          )
          continue
        }

        throw new ApiClientError(
          parseErrorMessage(errorBody, res.statusText),
          res.status,
          errorBody.error?.code,
          errorBody.error?.details
        )
      }

      // 204 No Content không có body
      if (res.status === 204) return undefined as T

      return res.json() as Promise<T>
    } catch (err) {
      if (shouldRetry(method, undefined, err) && attempt < MAX_RETRIES) {
        lastError = err
        continue
      }
      throw err
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Request failed after retries")
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>("GET", path, undefined, options),

  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("POST", path, body, options),

  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("PUT", path, body, options),

  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("PATCH", path, body, options),

  delete: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("DELETE", path, body, options),
}
