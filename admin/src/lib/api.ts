import axios from "axios"
import { getToken, clearSession } from "@/lib/auth"
import type { ApiEnvelope, PaginatedResponse } from "@/types/api"

/** Fallback khớp api dev (:5000) — tránh trỏ nhầm UI (:3000) khi thiếu env */
export const API_BASE_URL =
 process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000"

const BASE_URL = API_BASE_URL

export const apiClient = axios.create({
 baseURL: `${BASE_URL}/api/v1`,
 headers: { "Content-Type": "application/json" },
})

apiClient.interceptors.request.use((config) => {
 const token = getToken()
 if (token) {
 config.headers.Authorization = `Bearer ${token}`
 }
 return config
})

apiClient.interceptors.response.use(
 (response) => {
 const body = response.data as ApiEnvelope<unknown>
 if (body && body.success === true) {
 if (body.pagination) {
 response.data = {
 data: body.data as unknown[],
 pagination: body.pagination,
 } satisfies PaginatedResponse<unknown>
 } else if (body.data !== undefined) {
 response.data = body.data
 }
 }
 return response
 },
 (error: unknown) => {
 if (axios.isAxiosError(error) && error.response?.status === 401) {
 void clearSession()
 if (typeof window !== "undefined") {
 window.location.href = "/login"
 }
 }
 return Promise.reject(error)
 },
)
