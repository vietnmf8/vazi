import { apiClient } from "@/lib/api"
import type { AdminFaqDetail, AdminFaqListItem, PaginatedResponse } from "@/types/api"

export type FaqsQuery = {
 page?: number
 limit?: number
 search?: string
 category?: string
}

export async function fetchFaqs(
 query: FaqsQuery,
): Promise<PaginatedResponse<AdminFaqListItem>> {
 const { data } = await apiClient.get<PaginatedResponse<AdminFaqListItem>>("/admin/faqs", {
 params: query,
 })
 return data
}

export async function fetchFaqDetail(id: string): Promise<AdminFaqDetail> {
 const { data } = await apiClient.get<AdminFaqDetail>(`/admin/faqs/${id}`)
 return data
}

type FaqWriteBody = {
 category?: string
 question?: string
 answer?: string
 display_order?: number
 is_active?: boolean
 translations?: Array<{
 language_code: string
 question: string
 answer: string
 }>
}

export async function updateFaq(id: string, body: FaqWriteBody): Promise<AdminFaqDetail> {
 const { data } = await apiClient.put<AdminFaqDetail>(`/admin/faqs/${id}`, body)
 return data
}

export async function createFaq(
 body: FaqWriteBody & { category: string; question: string; answer: string },
): Promise<AdminFaqDetail> {
 const { data } = await apiClient.post<AdminFaqDetail>("/admin/faqs", body)
 return data
}

export async function deleteFaq(id: string): Promise<void> {
 await apiClient.delete(`/admin/faqs/${id}`)
}
