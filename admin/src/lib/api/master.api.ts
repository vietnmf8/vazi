import { apiClient } from "@/lib/api"
import type {
 AdminEligibilityRuleListItem,
 AdminExemptionCountryListItem,
 AdminNationalityDetail,
 AdminNationalityListItem,
 AdminPortListItem,
 AdminPricingRuleListItem,
 PaginatedResponse,
} from "@/types/api"

type ListQuery = { page?: number; limit?: number; search?: string; sort?: string; [key: string]: any }

export async function fetchNationalities(
 query: ListQuery,
): Promise<PaginatedResponse<AdminNationalityListItem>> {
 const { data } = await apiClient.get<PaginatedResponse<AdminNationalityListItem>>(
 "/admin/nationalities",
 { params: query },
 )
 return data
}

export async function fetchNationalityDetail(id: string): Promise<AdminNationalityDetail> {
 const { data } = await apiClient.get<AdminNationalityDetail>(`/admin/nationalities/${id}`)
 return data
}

export async function updateNationality(
 id: string,
 body: Partial<{
 country_name: string
 country_code: string
 group: string
 exemption_days: number
 translations: Array<{ language_code: string; country_name: string }>
 }>,
): Promise<AdminNationalityDetail> {
 const { data } = await apiClient.put<AdminNationalityDetail>(
 `/admin/nationalities/${id}`,
 body,
 )
 return data
}

export async function createNationality(body: {
 country_name: string
 country_code: string
 group: string
 exemption_days: number
 translations?: Array<{ language_code: string; country_name: string }>
}): Promise<AdminNationalityDetail> {
 const { data } = await apiClient.post<AdminNationalityDetail>("/admin/nationalities", body)
 return data
}

export async function deleteNationality(id: string): Promise<void> {
 await apiClient.delete(`/admin/nationalities/${id}`)
}

export async function deletePort(id: string): Promise<void> {
  await apiClient.delete(`/admin/ports/${id}`)
}

export async function deletePricingRule(id: string): Promise<void> {
  await apiClient.delete(`/admin/pricing-rules/${id}`)
}

export async function deleteExemptionCountry(id: string): Promise<void> {
  await apiClient.delete(`/admin/exemption-countries/${id}`)
}

export async function fetchPorts(
 query: ListQuery,
): Promise<PaginatedResponse<AdminPortListItem>> {
 const { data } = await apiClient.get<PaginatedResponse<AdminPortListItem>>("/admin/ports", {
 params: query,
 })
 return data
}

export async function updatePort(
 id: string,
 body: Partial<{ code: string; name: string; entry_type: string; is_active: boolean }>,
): Promise<AdminPortListItem> {
 const { data } = await apiClient.put<AdminPortListItem>(`/admin/ports/${id}`, body)
 return data
}

export async function createPort(body: {
 code: string
 name: string
 entry_type: string
 is_active?: boolean
}): Promise<AdminPortListItem> {
 const { data } = await apiClient.post<AdminPortListItem>("/admin/ports", body)
 return data
}

export async function fetchPricingRules(
 query: ListQuery,
): Promise<PaginatedResponse<AdminPricingRuleListItem>> {
 const { data } = await apiClient.get<PaginatedResponse<AdminPricingRuleListItem>>(
 "/admin/pricing-rules",
 { params: query },
 )
 return data
}

export async function updatePricingRule(
 id: string,
 body: Partial<{ key: string; price: number; is_active: boolean }>,
): Promise<AdminPricingRuleListItem> {
 const { data } = await apiClient.put<AdminPricingRuleListItem>(
 `/admin/pricing-rules/${id}`,
 body,
 )
 return data
}

export async function createPricingRule(body: {
 rule_type: string
 key: string
 price: number
 is_active?: boolean
 name?: string
}): Promise<AdminPricingRuleListItem> {
 // If name is provided, format it as translations
 const payload = {
 ...body,
 translations: body.name ? [{ language_code: "vi", name: body.name }] : undefined
 }
 const { data } = await apiClient.post<AdminPricingRuleListItem>("/admin/pricing-rules", payload)
 return data
}

export async function fetchExemptionCountries(
 query: ListQuery,
): Promise<PaginatedResponse<AdminExemptionCountryListItem>> {
 const { data } = await apiClient.get<PaginatedResponse<AdminExemptionCountryListItem>>(
 "/admin/exemption-countries",
 { params: query },
 )
 return data
}

export async function updateExemptionCountry(
  id: string,
  body: { exemption_days?: number; is_active?: boolean },
): Promise<AdminExemptionCountryListItem> {
  const { data } = await apiClient.put<AdminExemptionCountryListItem>(
    `/admin/exemption-countries/${id}`,
    body,
  )
  return data
}

export async function createExemptionCountry(
  body: { country_code: string; exemption_days: number; is_active: boolean },
): Promise<AdminExemptionCountryListItem> {
  const { data } = await apiClient.post<AdminExemptionCountryListItem>(
    `/admin/exemption-countries`,
    body,
  )
  return data
}

export async function fetchEligibilityRules(
 query: ListQuery,
): Promise<PaginatedResponse<AdminEligibilityRuleListItem>> {
 const { data } = await apiClient.get<PaginatedResponse<AdminEligibilityRuleListItem>>(
 "/admin/eligibility-rules",
 { params: query },
 )
 return data
}

export async function updateEligibilityRule(
 id: string,
 body: Partial<{ country_code: string; is_active: boolean }>,
): Promise<AdminEligibilityRuleListItem> {
 const { data } = await apiClient.put<AdminEligibilityRuleListItem>(
 `/admin/eligibility-rules/${id}`,
 body,
 )
 return data
}
