import useSWR from "swr"
import { apiClient } from "@/lib/api"

export interface UserProfile {
 id: string
 email: string
 fullName: string
 phone?: string
 avatarUrl?: string
 role: string
 accountStatus: string
}

export function useAuthMe() {
 const fetcher = (url: string) => apiClient.get(url).then(res => res.data as UserProfile)
 const { data, error, mutate, isLoading } = useSWR("/auth/me", fetcher)
 return {
 user: data,
 isLoading,
 isError: error,
 mutate
 }
}

export const changePassword = async (data: { oldPassword: string; newPassword: string; logoutAll?: boolean }) => {
 return apiClient.post('/auth/change-password', data)
}

export const verifyOldPassword = async (oldPassword: string): Promise<{ isValid: boolean }> => {
 const res = await apiClient.post<{ isValid: boolean }>('/auth/verify-old-password', { oldPassword })
 return res.data || { isValid: false }
}

export const forgotPassword = async (email: string) => {
 return apiClient.post('/auth/forgot-password', { email })
}

export const resetPassword = async (data: { token: string; newPassword: string }) => {
 return apiClient.post('/auth/reset-password', data)
}

export const updateProfile = async (data: { fullName?: string; phone?: string; avatarUrl?: string }) => {
 const res = await apiClient.put('/auth/me', data)
 return res.data?.data?.user
}
