import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
 fetchGlobalSettings,
 fetchPageSettings,
 updateGlobalSetting,
 updatePageSetting,
} from "@/lib/api/settings.api"

export function useGlobalSettings() {
 return useQuery({
 queryKey: ["global-settings"],
 queryFn: fetchGlobalSettings,
 })
}

export function usePageSettings() {
 return useQuery({
 queryKey: ["page-settings"],
 queryFn: fetchPageSettings,
 })
}

export function useUpdateGlobalSetting() {
 const queryClient = useQueryClient()
 return useMutation({
 mutationFn: ({ key, value }: { key: string; value: unknown }) =>
 updateGlobalSetting(key, value),
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ["global-settings"] })
 },
 })
}

export function useUpdatePageSetting() {
 const queryClient = useQueryClient()
 return useMutation({
 mutationFn: ({ key, value }: { key: string; value: unknown }) =>
 updatePageSetting(key, value),
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ["page-settings"] })
 },
 })
}
