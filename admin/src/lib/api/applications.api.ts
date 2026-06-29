import { apiClient } from "@/lib/api"
import type {
 AdminApplicationAuditLogItem,
 AdminApplicationDetail,
 AdminApplicationListItem,
 AdminApplicationUpdatePayload,
 PaginatedResponse,
 VisaApplicationStatus,
} from "@/types/api"

export type ApplicationsQuery = {
 page?: number
 limit?: number
 status?: VisaApplicationStatus
 search?: string
 sort_by?: string
 sort_dir?: "asc" | "desc"
 visa_type?: string
 date?: string
}

export async function fetchApplications(
 query: ApplicationsQuery,
): Promise<PaginatedResponse<AdminApplicationListItem>> {
 const { data } = await apiClient.get<PaginatedResponse<AdminApplicationListItem>>(
 "/admin/applications",
 { params: query },
 )
 return data
}

export async function fetchApplicationById(id: string): Promise<AdminApplicationDetail> {
 const { data } = await apiClient.get<AdminApplicationDetail>(`/admin/applications/${id}`)
 return data
}

export async function fetchApplicationAuditLogs(
 id: string,
): Promise<AdminApplicationAuditLogItem[]> {
 const { data } = await apiClient.get<AdminApplicationAuditLogItem[]>(
 `/admin/applications/${id}/audit-logs`,
 )
 return data
}

export async function updateApplicationStatus(
 id: string,
 status: VisaApplicationStatus,
 template_name?: string,
): Promise<{ id: string; status: VisaApplicationStatus }> {
 const { data } = await apiClient.patch<{ id: string; status: VisaApplicationStatus }>(
 `/admin/applications/${id}/status`,
 { status, template_name },
 )
 return data
}

export async function updateApplication(
 id: string,
 payload: AdminApplicationUpdatePayload,
): Promise<AdminApplicationDetail> {
 const { data } = await apiClient.patch<AdminApplicationDetail>(
 `/admin/applications/${id}`,
 payload,
 )
 return data
}

export async function updateApplicationResultDocument(
 id: string,
 public_id: string | null,
): Promise<{ id: string; resultDocumentPublicId: string | null }> {
 const { data } = await apiClient.patch<{ id: string; resultDocumentPublicId: string | null }>(
 `/admin/applications/${id}/result-document`,
 { result_document_public_id: public_id },
 )
 return data
}

export async function updateApplicationPickupImage(
 id: string,
 public_id: string | null,
): Promise<{ id: string; pickupPointImagePublicId: string | null }> {
 const { data } = await apiClient.patch<{ id: string; pickupPointImagePublicId: string | null }>(
 `/admin/applications/${id}/pickup-image`,
 { pickup_point_image_public_id: public_id },
 )
 return data
}
