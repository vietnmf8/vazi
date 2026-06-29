import { apiClient } from "@/lib/api"
import type { AdminDashboardStats } from "@/types/api"

export async function fetchDashboardStats(): Promise<AdminDashboardStats> {
 const { data } = await apiClient.get<AdminDashboardStats>("/admin/dashboard/stats")
 return data
}
