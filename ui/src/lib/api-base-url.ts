/**
 * Base URL API backend — fallback :5000 khớp Express dev, tránh nhầm UI (:3000) hoặc Admin (:3001).
 *
 * `NEXT_PUBLIC_*` được bake lúc `next build`; production phải set trước khi build.
 */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000"

export const API_V1_URL = `${API_BASE_URL}/api/v1`
