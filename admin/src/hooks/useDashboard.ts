"use client"

import { useQuery } from "@tanstack/react-query"
import { fetchDashboardStats } from "@/lib/api/dashboard.api"

export function useDashboardStats() {
 return useQuery({
 queryKey: ["dashboard", "stats"],
 queryFn: fetchDashboardStats,
 refetchInterval: 60_000,
 })
}
