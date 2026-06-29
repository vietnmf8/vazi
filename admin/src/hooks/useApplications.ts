"use client"

import { useQuery, keepPreviousData } from "@tanstack/react-query"
import {
 fetchApplicationById,
 fetchApplications,
 type ApplicationsQuery,
} from "@/lib/api/applications.api"

export function useApplications(query: ApplicationsQuery) {
  const result = useQuery({
    queryKey: ["applications", query],
    queryFn: () => fetchApplications(query),
    placeholderData: keepPreviousData,
  })
  return { ...result }
}

export function useApplication(id: string) {
 return useQuery({
 queryKey: ["applications", id],
 queryFn: () => fetchApplicationById(id),
 enabled: Boolean(id),
 })
}
