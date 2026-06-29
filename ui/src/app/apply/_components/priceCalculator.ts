import type { Step1FormValues, visaCategoryValues } from "./applySchemas"
import { API_BASE_URL } from "@/lib/api-base-url"

export type VisaCategory = (typeof visaCategoryValues)[number]

/** Nhãn hiển thị cho từng visa category */
export const VISA_CATEGORY_LABELS: Record<VisaCategory, string> = {
  evisa_30d_single: "E-Visa · 30 Days Single Entry",
  evisa_90d_single: "E-Visa · 90 Days Single Entry",
  evisa_90d_multiple: "E-Visa · 90 Days Multiple Entry",
  voa_1m_single: "VOA · 1 Month Single Entry",
  voa_1m_multiple: "VOA · 1 Month Multiple Entry",
  voa_3m_single: "VOA · 3 Months Single Entry",
  voa_3m_multiple: "VOA · 3 Months Multiple Entry",
  code_fasttrack: "Fast Track · VIP Airport Service",
}

// Fallback khi API /pricing/calculator-config không khả dụng
const DEFAULT_BASE_FEES: Record<VisaCategory, number> = {
  evisa_30d_single: 55,
  evisa_90d_single: 75,
  evisa_90d_multiple: 85,
  voa_1m_single: 55,
  voa_1m_multiple: 60,
  voa_3m_single: 65,
  voa_3m_multiple: 75,
  code_fasttrack: 0,
}

// Fallback khi API /pricing/calculator-config không khả dụng
export const DEFAULT_PROCESSING_OPTIONS = [
  {
    value: "normal_7d" as const,
    label: "Normal · 7 Working Days",
    caption: "Standard processing — included in base fee",
    badge: null as string | null,
    note: null as string | null,
    expectedTime: "true",
  },
  {
    value: "urgent_4d" as const,
    label: "Urgent · 4 Working Days",
    caption: "Faster processing",
    badge: "Popular",
    note: "Surcharge varies by visa duration",
    expectedTime: "true",
  },
  {
    value: "urgent_3d" as const,
    label: "Urgent · 3 Working Days",
    caption: "Priority queue",
    badge: null,
    note: "Surcharge varies by visa duration",
    expectedTime: "true",
  },
  {
    value: "urgent_2d" as const,
    label: "Urgent · 2 Working Days",
    caption: "Priority queue",
    badge: null,
    note: "Surcharge varies by visa duration",
    expectedTime: "true",
  },
  {
    value: "urgent_1d" as const,
    label: "Urgent · 1 Working Day",
    caption: "Next-day processing",
    badge: null,
    note: null,
    expectedTime: "Result by tomorrow 6:00 PM (Vietnam Time)",
  },
  {
    value: "urgent_4h" as const,
    label: "Urgent · 4 Working Hours",
    caption: "Same-day processing",
    badge: "Review Required",
    note: "Manual eligibility check required before confirming",
    expectedTime: "Result within 4 business hours",
  },
  {
    value: "urgent_2h" as const,
    label: "Urgent · 2 Working Hours",
    caption: "Emergency processing",
    badge: "Review Required",
    note: "Manual eligibility check required before confirming",
    expectedTime: "Result within 2 business hours",
  },
  {
    value: "urgent_1h" as const,
    label: "Urgent · 1 Working Hour",
    caption: "Super Emergency processing",
    badge: "Review Required",
    note: "Manual eligibility check required before confirming",
    expectedTime: "Result within 1 business hour",
  },
  {
    value: "last_minute" as const,
    label: "Last Minute / Holiday",
    caption: "Outside business hours or public holidays",
    badge: null,
    note: null,
    expectedTime: "Result in 30-60 minutes",
  },
  {
    value: "weekend_processing" as const,
    label: "Weekend Processing (Sat, Sun)",
    caption: "Contact for specific time",
    badge: "Special Service",
    note: "Surcharge applies for weekend processing",
    expectedTime: "Contact for specific time",
  },
]

export const EVISA_CATEGORIES = [
  { value: "evisa_30d_single" as const, label: "30 Days · Single Entry", price: "$55" },
  { value: "evisa_90d_single" as const, label: "90 Days · Single Entry", price: "$75" },
  { value: "evisa_90d_multiple" as const, label: "90 Days · Multiple Entry", price: "$85" },
]

export const VOA_CATEGORIES = [
  { value: "voa_1m_single" as const, label: "1 Month · Single Entry", price: "$55" },
  { value: "voa_1m_multiple" as const, label: "1 Month · Multiple Entry", price: "$60" },
  { value: "voa_3m_single" as const, label: "3 Months · Single Entry", price: "$65" },
  { value: "voa_3m_multiple" as const, label: "3 Months · Multiple Entry", price: "$75" },
]

export const PORT_OPTIONS = [
  { value: "HAN", label: "HAN — Hanoi Airport" },
  { value: "SGN", label: "SGN — Saigon Airport" },
  { value: "DAD", label: "DAD — Da Nang Airport" },
  { value: "PQC", label: "PQC — Phu Quoc Airport" },
  { value: "MOC_BAI", label: "Moc Bai Border (Land)" },
]

export const PURPOSE_OPTIONS = [
  { value: "tourism", label: "Tourism" },
  { value: "business", label: "Business" },
  { value: "family", label: "Visiting family / friends" },
  { value: "other", label: "Other" },
]

const VIP_FEE_PER_PERSON = 55

/** Category 90 ngày / 3 tháng — dùng bậc phụ phí cao hơn cho urgent 4d/2d */
function isLongDurationCategory(category: VisaCategory): boolean {
  return (
    category === "evisa_90d_single" ||
    category === "evisa_90d_multiple" ||
    category === "voa_3m_single" ||
    category === "voa_3m_multiple"
  )
}

/**
 * Phụ phí xử lý theo từng mức — khớp 03_business_logic.md.
 * urgent_4d/2d biến thiên theo thời hạn visa (30D vs 90D/3M).
 */
export function getProcessingSurcharge(
  processingTime: Step1FormValues["processing_time"],
  visaCategory: VisaCategory
): number {
  const longDuration = isLongDurationCategory(visaCategory)

  switch (processingTime) {
    case "normal_7d":
      return 0
    case "urgent_4d":
      return longDuration ? 45 : 35
    case "urgent_3d":
      return longDuration ? 55 : 45
    case "urgent_2d":
      return longDuration ? 75 : 65
    case "urgent_1d":
    case "urgent_4h":
      return 125
    case "urgent_2h":
      return 195
    case "urgent_1h":
      return 250
    case "last_minute":
      return 295
    default:
      return 0
  }
}

export function getProcessingLabel(
  processingTime: Step1FormValues["processing_time"]
): string {
  return DEFAULT_PROCESSING_OPTIONS.find((o) => o.value === processingTime)?.label ?? processingTime
}

export function getDbProcessingValue(
  processingTime: string,
  visaCategory?: VisaCategory
): string {
  switch (processingTime) {
    case "normal_7d": return "NORMAL";
    case "urgent_4d": 
      return visaCategory && isLongDurationCategory(visaCategory) ? "URGENT_4WD_90" : "URGENT_4WD_30";
    case "urgent_3d": 
      return visaCategory && isLongDurationCategory(visaCategory) ? "URGENT_3WD_90" : "URGENT_3WD_30";
    case "urgent_2d":
      return visaCategory && isLongDurationCategory(visaCategory) ? "URGENT_2WD_90" : "URGENT_2WD_30";
    case "urgent_1d": return "URGENT_1WD";
    case "urgent_4h": return "URGENT_4WH";
    case "urgent_2h": return "URGENT_2WH";
    case "urgent_1h": return "URGENT_1WH";
    case "last_minute": return "LAST_MINUTE_HOLIDAY";
    case "weekend_processing": return "WEEKEND_PROCESSING";
    default: return processingTime;
  }
}


export type PriceBreakdownResult = {
  visaCategoryLabel: string
  baseFee: number
  processingSurcharge: number
  processingLabel: string
  vipPerPerson: number
  basicPerPerson: number
  applicantCount: number
  perPersonTotal: number
  total: number
}

const BASIC_FEE_PER_PERSON = 35

/**
 * Tính giá local — Stage 7 sẽ thay bằng POST /applications/calculate-price.
 * Công thức: (Base + Surcharge + VIP + Basic) × applicant_count
 */
export function calculatePrice(
  step1: Pick<
    Step1FormValues,
    "visa_category" | "processing_time" | "applicant_count" | "vip_fast_track"
  > & { basic_fast_track?: boolean },
  config?: PricingConfigData | null
): PriceBreakdownResult {
  const baseFee = config ? (config.BASE_FEES[step1.visa_category] ?? DEFAULT_BASE_FEES[step1.visa_category] ?? 0) : DEFAULT_BASE_FEES[step1.visa_category]
  
  const processingSurcharge = config
    ? (config.PROCESSING_OPTIONS.find((o) => o.value === getDbProcessingValue(step1.processing_time, step1.visa_category))?.price ?? getProcessingSurcharge(step1.processing_time, step1.visa_category))
    : getProcessingSurcharge(step1.processing_time, step1.visa_category)

  const vipPerPerson = step1.vip_fast_track ? VIP_FEE_PER_PERSON : 0
  const basicPerPerson = step1.basic_fast_track ? BASIC_FEE_PER_PERSON : 0
  const perPersonTotal = baseFee + processingSurcharge + vipPerPerson + basicPerPerson
  const total = perPersonTotal * step1.applicant_count

  const categoryLabel = config
    ? (config.VISA_CATEGORY_LABELS[step1.visa_category] || VISA_CATEGORY_LABELS[step1.visa_category] || step1.visa_category)
    : VISA_CATEGORY_LABELS[step1.visa_category]

  const processLabel = config
    ? (config.PROCESSING_OPTIONS.find((o) => o.value === getDbProcessingValue(step1.processing_time, step1.visa_category))?.label || getProcessingLabel(step1.processing_time))
    : getProcessingLabel(step1.processing_time)

  return {
    visaCategoryLabel: categoryLabel,
    baseFee,
    processingSurcharge,
    processingLabel: processLabel,
    vipPerPerson,
    basicPerPerson,
    applicantCount: step1.applicant_count,
    perPersonTotal,
    total,
  }
}

export function formatUsd(amount: number): string {
  return `$${amount.toFixed(2)}`
}

export type PricingConfigData = {
  BASE_FEES: Record<string, number>;
  VISA_CATEGORY_LABELS: Record<string, string>;
  PROCESSING_OPTIONS: Array<{
    value: string;
    label: string;
    caption: string | null;
    badge: string | null;
    note: string | null;
    expectedTime?: string | null;
    price: number;
  }>;
};

export async function getPricingConfig(locale: string = "en"): Promise<PricingConfigData> {
  const apiUrl = API_BASE_URL
  const res = await fetch(`${apiUrl}/api/v1/pricing/calculator-config?locale=${locale}`, {
    cache: "force-cache",
    next: { tags: ["rules_config"] },
  });
  
  if (!res.ok) {
    throw new Error("Failed to fetch pricing config");
  }
  
  const json = await res.json();
  return json.data;
}
