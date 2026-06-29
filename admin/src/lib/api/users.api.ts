import { apiClient } from "@/lib/api"
import type { AdminUserListItem, PaginatedResponse } from "@/types/api"

export async function fetchUsers(
 query: { page?: number; limit?: number; search?: string; role?: string; accountStatus?: string; sort?: string },
): Promise<PaginatedResponse<AdminUserListItem>> {
 const { data } = await apiClient.get<PaginatedResponse<AdminUserListItem>>("/admin/users", {
 params: query,
 })
 return data
}

export async function approveUser(id: string): Promise<void> {
 await apiClient.post(`/admin/users/${id}/approve`)
}

export async function rejectUser(id: string): Promise<void> {
 await apiClient.post(`/admin/users/${id}/reject`)
}

export async function deleteUser(id: string): Promise<void> {
 await apiClient.delete(`/admin/users/${id}`)
}
