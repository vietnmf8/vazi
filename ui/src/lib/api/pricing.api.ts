import { apiClient } from "@/lib/api-client"
import { cacheLife, cacheTag } from "next/cache"
import type {
  ApiResponse,
  ExemptionResult,
  Nationality,
  Port,
  PricingRule,
} from "@/types/api"

const PRICING_PATH = "/api/v1/pricing"
const NATIONALITIES_PATH = "/api/v1/nationalities"
const PORTS_PATH = "/api/v1/ports"
const EXEMPTIONS_PATH = "/api/v1/exemptions"

/**
 * Lấy bảng giá động — hydrate dropdown visa category / processing time.
 */
export async function getPricing(): Promise<PricingRule> {
  "use cache"
  cacheLife("hours")
  cacheTag("rules_config")
  const res = await apiClient.get<ApiResponse<PricingRule>>(PRICING_PATH)
  return res.data
}

export async function getCalculatorConfig(locale: string = "en"): Promise<any> {
  "use cache"
  cacheLife("hours")
  cacheTag("rules_config")
  const res = await apiClient.get<ApiResponse<any>>(`${PRICING_PATH}/calculator-config`, {
    params: { locale },
  })
  return res.data
}

/**
 * Danh sách quốc tịch hợp lệ kèm flag e-visa eligibility.
 */
export async function getNationalities(): Promise<Nationality[]> {
  "use cache"
  cacheLife("hours")
  cacheTag("nationalities")
  const res = await apiClient.get<ApiResponse<Nationality[]>>(NATIONALITIES_PATH)
  return res.data
}

/**
 * Danh sách cửa nhập cảnh (sân bay / cửa khẩu biên giới).
 */
export async function getPorts(): Promise<Port[]> {
  "use cache"
  cacheLife("hours")
  cacheTag("rules_config")
  const res = await apiClient.get<ApiResponse<Port[]>>(PORTS_PATH)
  return res.data
}

/**
 * Tra cứu miễn thị thực / e-visa eligibility theo mã quốc gia ISO alpha-2.
 */
export async function getExemption(countryCode: string): Promise<ExemptionResult> {
  "use cache"
  cacheLife("hours")
  cacheTag("nationalities")
  const code = encodeURIComponent(countryCode.trim().toUpperCase())
  const res = await apiClient.get<ApiResponse<ExemptionResult>>(
    `${EXEMPTIONS_PATH}/${code}`
  )
  return res.data
}
