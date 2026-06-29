"use client"

import { useQuery, keepPreviousData } from "@tanstack/react-query"
import {
 fetchSupportTicketById,
 fetchSupportTickets,
 type SupportTicketsQuery,
} from "@/lib/api/support.api"

export function useSupportTickets(query: SupportTicketsQuery) {
 return useQuery({
 queryKey: ["support-tickets", query],
 queryFn: () => fetchSupportTickets(query),
      placeholderData: keepPreviousData,
 })
}

export function useSupportTicket(id: string | null) {
 return useQuery({
 queryKey: ["support-tickets", id],
 queryFn: () => fetchSupportTicketById(id!),
 enabled: Boolean(id),
 })
}
