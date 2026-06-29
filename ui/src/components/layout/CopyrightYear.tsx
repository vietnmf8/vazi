import { connection } from "next/server"

/**
 * Năm bản quyền — async Server Component với `connection()`.
 *
 * PPR (cacheComponents) yêu cầu đọc uncached/request data trước khi gọi `new Date()`
 * trong Server Component; `connection()` đánh dấu boundary dynamic cho phần này.
 */
export async function CopyrightYear() {
  await connection()
  return new Date().getFullYear()
}
