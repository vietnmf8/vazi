import { apiClient } from "@/lib/api"
import type {
 AdminSupportTicketDetail,
 AdminSupportTicketListItem,
 PaginatedResponse,
 SupportTicketStatus,
} from "@/types/api"

export type SupportTicketsQuery = {
 page?: number
 limit?: number
 status?: SupportTicketStatus
 search?: string
}

export async function fetchSupportTickets(
 query: SupportTicketsQuery,
): Promise<PaginatedResponse<AdminSupportTicketListItem>> {
 const { data } = await apiClient.get<PaginatedResponse<AdminSupportTicketListItem>>(
 "/admin/support-tickets",
 { params: query },
 )
 return data
}

export async function fetchSupportTicketById(id: string): Promise<AdminSupportTicketDetail> {
 const { data } = await apiClient.get<AdminSupportTicketDetail>(
 `/admin/support-tickets/${id}`,
 )
 return data
}

export async function updateSupportTicketStatus(
 id: string,
 status: SupportTicketStatus,
): Promise<{ id: string; status: SupportTicketStatus }> {
 const { data } = await apiClient.patch<{ id: string; status: SupportTicketStatus }>(
 `/admin/support-tickets/${id}`,
 { status },
 )
 return data
}
