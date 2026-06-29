import type {
  ApplicantGender,
  ApplicantInfo,
  CalculatePriceRequest,
  ProcessingTime,
  PurposeOfVisit,
  SubmitApplicationRequest,
  VisaCategory,
  VisaType,
  ExtraServices,
} from "@/types/api"
import type {
  ApplicantFormValues,
  Step1FormValues,
  Step2FormValues,
  visaCategoryValues,
  processingTimeValues,
  visaTypeValues,
  genderValues,
} from "@/app/apply/_components/applySchemas"

type UiVisaType = (typeof visaTypeValues)[number]
type UiVisaCategory = (typeof visaCategoryValues)[number]
type UiProcessingTime = (typeof processingTimeValues)[number]
type UiGender = (typeof genderValues)[number]

const VISA_TYPE_MAP: Record<UiVisaType, VisaType> = {
  evisa: "E_VISA",
  voa: "VOA",
}

const VISA_CATEGORY_MAP: Record<UiVisaCategory, VisaCategory> = {
  evisa_30d_single: "30_DAYS_SINGLE",
  evisa_90d_single: "90_DAYS_SINGLE",
  evisa_90d_multiple: "90_DAYS_MULTIPLE",
  voa_1m_single: "VOA_1M_SINGLE",
  voa_1m_multiple: "VOA_1M_MULTIPLE",
  voa_3m_single: "VOA_3M_SINGLE",
  voa_3m_multiple: "VOA_3M_MULTIPLE",
  code_fasttrack: "30_DAYS_SINGLE",
}

const PROCESSING_TIME_MAP: Record<UiProcessingTime, ProcessingTime> = {
  normal_7d: "NORMAL",
  urgent_4d: "URGENT_4D",
  urgent_3d: "URGENT_3D",
  urgent_2d: "URGENT_2D",
  urgent_1d: "URGENT_1D",
  urgent_4h: "URGENT_4H",
  urgent_2h: "URGENT_2H",
  urgent_1h: "URGENT_1H",
  last_minute: "LAST_MINUTE",
  weekend_processing: "WEEKEND_PROCESSING",
}

const PURPOSE_MAP: Record<string, PurposeOfVisit> = {
  tourism: "TOURIST",
  business: "BUSINESS",
  family: "OTHER",
  other: "OTHER",
}

const GENDER_MAP: Record<UiGender, ApplicantGender> = {
  male: "MALE",
  female: "FEMALE",
  other: "OTHER",
}

/** Nhãn hiển thị visa type từ enum API */
const VISA_TYPE_LABELS: Record<VisaType, string> = {
  E_VISA: "E-Visa",
  VOA: "Visa on Arrival (VOA)",
}

const VISA_CATEGORY_LABELS: Record<VisaCategory, string> = {
  "30_DAYS_SINGLE": "E-Visa · 30 Days Single Entry",
  "90_DAYS_SINGLE": "E-Visa · 90 Days Single Entry",
  "90_DAYS_MULTIPLE": "E-Visa · 90 Days Multiple Entry",
  VOA_1M_SINGLE: "VOA · 1 Month Single Entry",
  VOA_1M_MULTIPLE: "VOA · 1 Month Multiple Entry",
  VOA_3M_SINGLE: "VOA · 3 Months Single Entry",
  VOA_3M_MULTIPLE: "VOA · 3 Months Multiple Entry",
}

const PROCESSING_TIME_LABELS: Record<ProcessingTime, string> = {
  NORMAL: "Normal · 7 Working Days",
  URGENT_4D: "Urgent · 4 Working Days",
  URGENT_3D: "Urgent · 3 Working Days",
  URGENT_2D: "Urgent · 2 Working Days",
  URGENT_1D: "Urgent · 1 Working Day",
  URGENT_4H: "Urgent · 4 Working Hours",
  URGENT_2H: "Urgent · 2 Working Hours",
  URGENT_1H: "Urgent · 1 Working Hour",
  LAST_MINUTE: "Last Minute / Holiday",
  WEEKEND_PROCESSING: "Weekend Processing",
}

export function mapVisaType(value: UiVisaType): VisaType {
  return VISA_TYPE_MAP[value]
}

export function mapVisaCategory(value: UiVisaCategory): VisaCategory {
  return VISA_CATEGORY_MAP[value]
}

export function mapProcessingTime(value: UiProcessingTime): ProcessingTime {
  return PROCESSING_TIME_MAP[value]
}

export function mapPurposeOfVisit(value: string): PurposeOfVisit {
  return PURPOSE_MAP[value] ?? "OTHER"
}

export function mapGender(value: UiGender): ApplicantGender {
  return GENDER_MAP[value]
}

/**
 * Map Step 1 form → payload calculate-price / phần pricing của submit.
 */
export function mapStep1ToCalculatePriceRequest(
  step1: Step1FormValues
): CalculatePriceRequest {
  return {
    visa_type: mapVisaType(step1.visa_type),
    visa_category: mapVisaCategory(step1.visa_category),
    applicant_count: step1.applicant_count,
    processing_time: mapProcessingTime(step1.processing_time),
    extra_services: {
      vip_fast_track: step1.vip_fast_track || undefined,
      basic_fast_track: step1.basic_fast_track || undefined,
    },
  }
}

function mapApplicant(applicant: ApplicantFormValues): ApplicantInfo {
  return {
    full_name: applicant.full_name,
    gender: mapGender(applicant.gender),
    nationality: applicant.nationality.toUpperCase(),
    date_of_birth: applicant.date_of_birth,
    passport_number: applicant.passport_number,
    passport_expiry_date: applicant.passport_expiry_date,
    passport_image_url: applicant.passport_image,
    // Ảnh chân dung 4×6 — chỉ gửi khi có (bắt buộc với E-Visa, optional với loại khác)
    portrait_image_url: applicant.portrait_image || undefined,
    flight_ticket_url: applicant.flight_ticket || undefined,
  }
}

/**
 * Gộp Step 1 + 2 → body POST /applications/submit.
 */
export function mapApplyFormToSubmitRequest(
  step1: Step1FormValues,
  step2: Step2FormValues
): SubmitApplicationRequest {
  return {
    ...mapStep1ToCalculatePriceRequest(step1),
    contact_email: step2.email.trim(),
    contact_phone: step2.phone.trim(),
    arrival_date: step1.arrival_date,
    port_of_entry: step1.port_of_entry,
    purpose_of_visit: mapPurposeOfVisit(step1.purpose_of_visit),
    applicants: step2.applicants.map(mapApplicant),
  }
}

export function formatVisaTypeLabel(visaType: VisaType): string {
  return VISA_TYPE_LABELS[visaType] ?? visaType
}

export function formatVisaCategoryLabel(category: VisaCategory, extraServices?: ExtraServices): string {
  let label = VISA_CATEGORY_LABELS[category] ?? category
  if (extraServices?.vip_fast_track) {
    label += " (+ VIP Fast Track)"
  } else if (extraServices?.basic_fast_track) {
    label += " (+ Basic Fast Track)"
  }
  return label
}

export function formatProcessingTimeLabel(time: ProcessingTime): string {
  return PROCESSING_TIME_LABELS[time] ?? time
}

export function formatUsd(amount: number): string {
  return `$${amount.toFixed(2)}`
}
