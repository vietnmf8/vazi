import { apiClient } from "@/lib/api"
import type { AdminSettingItem } from "@/types/api"

export async function fetchGlobalSettings(): Promise<AdminSettingItem[]> {
 const { data } = await apiClient.get<AdminSettingItem[]>("/admin/global-settings")
 return data
}

export async function fetchGlobalSetting(key: string): Promise<AdminSettingItem> {
 const { data } = await apiClient.get<AdminSettingItem>(`/admin/global-settings/${key}`)
 return data
}

export async function updateGlobalSetting(
 key: string,
 value: unknown,
): Promise<AdminSettingItem> {
 const { data } = await apiClient.put<AdminSettingItem>(`/admin/global-settings/${key}`, {
 value,
 })
 return data
}

export async function fetchPageSettings(): Promise<AdminSettingItem[]> {
 const { data } = await apiClient.get<AdminSettingItem[]>("/admin/page-settings")
 return data
}

export async function fetchPageSetting(key: string): Promise<AdminSettingItem> {
 const { data } = await apiClient.get<AdminSettingItem>(`/admin/page-settings/${key}`)
 return data
}

export async function updatePageSetting(
 key: string,
 value: unknown,
): Promise<AdminSettingItem> {
 const { data } = await apiClient.put<AdminSettingItem>(`/admin/page-settings/${key}`, {
 value,
 })
 return data
}
