import { apiClient } from "@/lib/api"
import type { AdminNewsletterListItem, AdminNewsletterCampaignListItem, PaginatedResponse } from "@/types/api"

export async function fetchNewsletter(
 query: { page?: number; limit?: number; search?: string },
): Promise<PaginatedResponse<AdminNewsletterListItem>> {
 const { data } = await apiClient.get<PaginatedResponse<AdminNewsletterListItem>>(
 "/admin/newsletter",
 { params: query },
 )
 return data
}

export async function deleteNewsletter(id: string): Promise<void> {
 await apiClient.delete(`/admin/newsletter/${id}`)
}

export async function fetchCampaigns(
 query: { page?: number; limit?: number; search?: string; sort?: string },
): Promise<PaginatedResponse<AdminNewsletterCampaignListItem>> {
 const { data } = await apiClient.get<PaginatedResponse<AdminNewsletterCampaignListItem>>(
 "/admin/newsletter/campaigns",
 { params: query },
 )
 return data
}

export async function deleteCampaign(id: string): Promise<void> {
 await apiClient.delete(`/admin/newsletter/campaigns/${id}`)
}

export async function generateCampaign(): Promise<{ subject: string; htmlContent: string }> {
 const { data } = await apiClient.post<{ subject: string; htmlContent: string }>("/admin/newsletter/campaigns/generate")
 return data
}

export async function updateCampaign(id: string, body: { subject?: string, htmlContent?: string }): Promise<AdminNewsletterCampaignListItem> {
 const { data } = await apiClient.patch<AdminNewsletterCampaignListItem>(`/admin/newsletter/campaigns/${id}`, body)
 return data
}

export async function createCampaign(body: { subject?: string, htmlContent?: string }): Promise<AdminNewsletterCampaignListItem> {
 const { data } = await apiClient.post<AdminNewsletterCampaignListItem>(`/admin/newsletter/campaigns`, body)
 return data
}
