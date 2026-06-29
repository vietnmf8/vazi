import { apiClient } from "@/lib/api"
import type {
 AdminCommentListItem,
 AdminReviewListItem,
 AdminStepGuidelineDetail,
 AdminStepGuidelineListItem,
 AdminTeamMemberListItem,
 AdminFaqListItem,
 AdminFaqDetail,
 AdminCommentDetailItem,
 PaginatedResponse,
} from "@/types/api"

type ListQuery = { page?: number; limit?: number; search?: string }

// ─── Step guidelines ─────────────────────────────────────────────────────────

export async function fetchStepGuidelines(
 query: ListQuery,
): Promise<PaginatedResponse<AdminStepGuidelineListItem>> {
 const { data } = await apiClient.get<PaginatedResponse<AdminStepGuidelineListItem>>(
 "/admin/step-guidelines",
 { params: query },
 )
 return data
}

export async function fetchStepGuidelineDetail(id: string): Promise<AdminStepGuidelineDetail> {
 const { data } = await apiClient.get<AdminStepGuidelineDetail>(`/admin/step-guidelines/${id}`)
 return data
}

export async function createStepGuideline(body: {
 step_number: number
 icon?: string
 display_order?: number
 is_active?: boolean
 translations?: Array<{ language_code: string; title: string; description: string }>
}): Promise<AdminStepGuidelineDetail> {
 const { data } = await apiClient.post<AdminStepGuidelineDetail>("/admin/step-guidelines", body)
 return data
}

export async function updateStepGuideline(
 id: string,
 body: Partial<{
 step_number: number
 icon: string
 display_order: number
 is_active: boolean
 translations: Array<{ language_code: string; title: string; description: string }>
 }>,
): Promise<AdminStepGuidelineDetail> {
 const { data } = await apiClient.put<AdminStepGuidelineDetail>(
 `/admin/step-guidelines/${id}`,
 body,
 )
 return data
}

export async function deleteStepGuideline(id: string): Promise<void> {
 await apiClient.delete(`/admin/step-guidelines/${id}`)
}

// ─── Team members ────────────────────────────────────────────────────────────

export async function fetchTeamMembers(
 query: ListQuery,
): Promise<PaginatedResponse<AdminTeamMemberListItem>> {
 const { data } = await apiClient.get<PaginatedResponse<AdminTeamMemberListItem>>(
 "/admin/team-members",
 { params: query },
 )
 return data
}

export async function fetchTeamMemberDetail(id: string): Promise<AdminTeamMemberListItem> {
 const { data } = await apiClient.get<AdminTeamMemberListItem>(`/admin/team-members/${id}`)
 return data
}

export async function createTeamMember(body: {
 name: string
 role: string
 description: string
 image_url: string
 thumb_bg: string
 display_order?: number
 is_active?: boolean
}): Promise<AdminTeamMemberListItem> {
 const { data } = await apiClient.post<AdminTeamMemberListItem>("/admin/team-members", body)
 return data
}

export async function updateTeamMember(
 id: string,
 body: Partial<{
 name: string
 role: string
 description: string
 image_url: string
 thumb_bg: string
 display_order: number
 is_active: boolean
 }>,
): Promise<AdminTeamMemberListItem> {
 const { data } = await apiClient.put<AdminTeamMemberListItem>(`/admin/team-members/${id}`, body)
 return data
}

export async function deleteTeamMember(id: string): Promise<void> {
 await apiClient.delete(`/admin/team-members/${id}`)
}

// ─── Reviews ─────────────────────────────────────────────────────────────────

export async function fetchReviews(
 query: ListQuery & { country_code?: string; rating?: number; sort_by?: string; sort_dir?: string },
): Promise<PaginatedResponse<AdminReviewListItem>> {
 const { data } = await apiClient.get<PaginatedResponse<AdminReviewListItem>>(
 "/admin/reviews",
 { params: query },
 )
 return data
}

export async function fetchReviewDetail(id: string): Promise<AdminReviewListItem> {
 const { data } = await apiClient.get<AdminReviewListItem>(`/admin/reviews/${id}`)
 return data
}

export async function createReview(body: {
 author_name: string
 country_code: string
 content: string
 rating?: number
 avatar_url?: string
 is_featured?: boolean
}): Promise<AdminReviewListItem> {
 const { data } = await apiClient.post<AdminReviewListItem>("/admin/reviews", body)
 return data
}

export async function updateReview(
 id: string,
 body: Partial<{
 author_name: string
 country_code: string
 content: string
 rating: number
 avatar_url: string
 is_featured: boolean
 }>,
): Promise<AdminReviewListItem> {
 const { data } = await apiClient.put<AdminReviewListItem>(`/admin/reviews/${id}`, body)
 return data
}

export async function deleteReview(id: string): Promise<void> {
 await apiClient.delete(`/admin/reviews/${id}`)
}

// ─── Comments (read + delete only) ───────────────────────────────────────────

export async function fetchComments(
 query: ListQuery,
): Promise<PaginatedResponse<AdminCommentListItem>> {
 const { data } = await apiClient.get<PaginatedResponse<AdminCommentListItem>>(
 "/admin/comments",
 { params: query },
 )
 return data
}

export async function fetchCommentDetail(id: string): Promise<AdminCommentDetailItem> {
 const { data } = await apiClient.get<AdminCommentDetailItem>(`/admin/comments/${id}`)
 return data
}

export async function replyToComment(id: string, content?: string, images?: string[]): Promise<AdminCommentListItem> {
 const { data } = await apiClient.post<AdminCommentListItem>(`/admin/comments/${id}/reply`, { content, images })
 return data
}

export async function editComment(id: string, content?: string, images?: string[]): Promise<AdminCommentListItem> {
 const { data } = await apiClient.patch<AdminCommentListItem>(`/admin/comments/${id}`, { content, images })
 return data
}

export async function deleteComment(id: string): Promise<void> {
 await apiClient.delete(`/admin/comments/${id}`)
}

// ─── FAQs ────────────────────────────────────────────────────────────────────

export async function fetchFaqs(
 query: ListQuery,
): Promise<PaginatedResponse<AdminFaqListItem>> {
 const { data } = await apiClient.get<PaginatedResponse<AdminFaqListItem>>(
 "/admin/faqs",
 { params: query },
 )
 return data
}

export async function fetchFaqDetail(id: string): Promise<AdminFaqDetail> {
 const { data } = await apiClient.get<AdminFaqDetail>(`/admin/faqs/${id}`)
 return data
}

export async function createFaq(body: {
 category: string
 question: string
 answer: string
 display_order?: number
 is_active?: boolean
 translations?: Array<{ language_code: string; question: string; answer: string }>
}): Promise<AdminFaqDetail> {
 const { data } = await apiClient.post<AdminFaqDetail>("/admin/faqs", body)
 return data
}

export async function updateFaq(
 id: string,
 body: Partial<{
 category: string
 question: string
 answer: string
 display_order: number
 is_active: boolean
 translations: Array<{ language_code: string; question: string; answer: string }>
 }>,
): Promise<AdminFaqDetail> {
 const { data } = await apiClient.put<AdminFaqDetail>(`/admin/faqs/${id}`, body)
 return data
}

export async function deleteFaq(id: string): Promise<void> {
 await apiClient.delete(`/admin/faqs/${id}`)
}

