import { z } from "zod/v4"

/** Loại visa — quyết định danh sách category và port hợp lệ */
export const visaTypeValues = ["evisa", "voa"] as const

/** Category keys khớp bảng giá trong priceCalculator */
export const visaCategoryValues = [
  "evisa_30d_single",
  "evisa_90d_single",
  "evisa_90d_multiple",
  "voa_1m_single",
  "voa_1m_multiple",
  "voa_3m_single",
  "voa_3m_multiple",
  "code_fasttrack",
] as const

export const processingTimeValues = [
  "normal_7d",
  "urgent_4d",
  "urgent_3d",
  "urgent_2d",
  "urgent_1d",
  "urgent_4h",
  "urgent_2h",
  "urgent_1h",
  "last_minute",
  "weekend_processing",
] as const

export const genderValues = ["male", "female", "other"] as const

export type Step1FormValues = z.infer<typeof Step1Form>
export const Step1Form = z.object({
  visa_type: z.enum(visaTypeValues),
  visa_category: z.enum(visaCategoryValues),
  processing_time: z.enum(processingTimeValues),
  applicant_count: z.number().int().min(1).max(5),
  arrival_date: z
    .string()
    .min(1, { error: "Arrival date is required" })
    .refine(
      (date) => {
        if (!date) return true
        // Arrival date phải từ hôm nay trở đi
        const today = new Date()
        const minDate = new Date(today.getFullYear(), today.getMonth(), today.getDate())
        const [y, m, d] = date.split("-").map(Number)
        const arrivalDate = new Date(y!, m! - 1, d!)
        return arrivalDate >= minDate
      },
      "Arrival date must be from today onwards",
    ),
  port_of_entry: z.string().min(1, { error: "Port of entry is required" }),
  purpose_of_visit: z.string().min(1, { error: "Purpose of visit is required" }),
  vip_fast_track: z.boolean(),
  basic_fast_track: z.boolean(),
})

export type ApplicantFormValues = z.infer<typeof ApplicantForm>
export const ApplicantForm = z.object({
  full_name: z
    .string()
    .min(1, { error: "Full name is required" })
    .transform((v) => v.trim().toUpperCase()),
  gender: z.enum(genderValues),
  nationality: z.string().min(1, { error: "Nationality is required" }),
  date_of_birth: z.string().min(1, { error: "Date of birth is required" }),
  passport_number: z.string().min(1, { error: "Passport number is required" }),
  passport_expiry_date: z.string().min(1, { error: "Passport expiry is required" }),
  /** Ảnh trang dữ liệu hộ chiếu — luôn bắt buộc */
  passport_image: z.string().min(1, { error: "Passport image is required" }),
  /** Ảnh chân dung 4×6 — chỉ bắt buộc với E-Visa, optional với các loại khác */
  portrait_image: z.string().optional(),
  flight_ticket: z.string().optional(),
})

export type Step2FormValues = z.infer<typeof Step2Form>
export const Step2Form = z.object({
  applicants: z.array(ApplicantForm).min(1),
  email: z.email(),
  phone: z.string().min(6, { error: "Phone number is required" }),
})

/**
 * Schema Step 2 có ràng buộc portrait khi E-Visa, và validate passport expiry
 * khi arrivalDate được cung cấp. Bắt buộc vé máy bay khi bật Fast Track.
 * @param isEvisa - Khi true, portrait_image trở thành bắt buộc (yêu cầu của Chính phủ VN)
 */
export function buildStep2Schema(fastTrackEnabled: boolean, arrivalDate?: string, isEvisa?: boolean) {
  // Khi E-Visa: portrait_image bắt buộc vì Cổng điện tử Chính phủ yêu cầu ảnh 4×6, trừ khi dùng Fast Track
  const applicantWithPortrait = ApplicantForm.extend({
    portrait_image: (isEvisa)
      ? z.string().min(1, { error: "Portrait photo is required for E-Visa applications" })
      : z.string().optional(),
    flight_ticket: fastTrackEnabled
      ? z.string().min(1, { error: "Flight ticket is required for Fast Track service" })
      : z.string().optional(),
  })

  return z
    .object({
      applicants: z.array(applicantWithPortrait).min(1),
      email: z.email(),
      phone: z.string().min(6, { error: "Phone number is required" }),
    })
    .superRefine((data, ctx) => {
      // Kiểm tra passport expiry > arrival + 6 tháng — khớp rule API backend
      if (!arrivalDate) return
      const [ay, am, ad] = arrivalDate.split("-").map(Number)
      if (!ay || !am || !ad) return
      // 6 months sau arrival: new Date(year, monthIndex + 6, day)
      const minExpiry = new Date(ay, am - 1 + 6, ad)

      data.applicants.forEach((applicant, idx) => {
        const expDate = applicant.passport_expiry_date
        if (!expDate) return
        const [ey, em, ed] = expDate.split("-").map(Number)
        if (!ey || !em || !ed) return
        const expiry = new Date(ey, em - 1, ed)
        if (expiry <= minExpiry) {
          ctx.addIssue({
            code: "custom",
            message:
              "Passport must be valid for more than 6 months after your arrival date",
            path: ["applicants", idx, "passport_expiry_date"],
          })
        }
      })
    })
}


export type ApplyDraft = {
  step1?: Step1FormValues
  step2?: Step2FormValues
  currentStep?: number
  /** Step cao nhất từng truy cập — persist để Stepper vẫn cho phép click sau khi refresh */
  maxStepReached?: number
  /** Timestamp lưu draft, tự động xoá sau 24h */
  updatedAt?: number
}

export const APPLY_DRAFT_STORAGE_KEY = "fastvisa_apply_draft"
