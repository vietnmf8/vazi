import { z } from "zod";

export const visaTypeSchema = z.enum(["E_VISA", "VOA"]);

export const visaCategorySchema = z.enum([
    "30_DAYS_SINGLE",
    "90_DAYS_SINGLE",
    "90_DAYS_MULTIPLE",
    "VOA_1M_SINGLE",
    "VOA_1M_MULTIPLE",
    "VOA_3M_SINGLE",
    "VOA_3M_MULTIPLE",
]);

export const processingTimeSchema = z.enum([
    "NORMAL",
    "URGENT_4D",
    "URGENT_3D",
    "URGENT_2D",
    "URGENT_1D",
    "URGENT_4H",
    "URGENT_2H",
    "URGENT_1H",
    "LAST_MINUTE",
    "WEEKEND_PROCESSING",
]);

export const purposeOfVisitSchema = z.enum(["TOURIST", "BUSINESS", "OTHER"]);

export const applicantGenderSchema = z.enum(["MALE", "FEMALE", "OTHER"]);

const eVisaCategories = new Set<string>(["30_DAYS_SINGLE", "90_DAYS_SINGLE", "90_DAYS_MULTIPLE"]);
const voaCategories = new Set<string>([
    "VOA_1M_SINGLE",
    "VOA_1M_MULTIPLE",
    "VOA_3M_SINGLE",
    "VOA_3M_MULTIPLE",
]);

/**
 * Phần pricing chung — dùng cho calculate-price và submit (tránh drift schema).
 */
export const applicationPricingFieldsSchema = z
    .object({
        visa_type: visaTypeSchema,
        visa_category: visaCategorySchema,
        applicant_count: z
            .number()
            .int({ message: "validation.applicant_count.integer" })
            .min(1, { message: "validation.applicant_count.min" })
            .max(10, { message: "validation.applicant_count.max" }),
        processing_time: processingTimeSchema,
        extra_services: z
            .object({
                vip_fast_track: z.boolean().optional(),
                basic_fast_track: z.boolean().optional(),
            })
            .strict(),
    })
    .strict();

/**
 * Kiểm tra visa_type khớp nhóm category (E_VISA vs VOA).
 */
export function refineVisaCategoryMatch(
    data: { visa_type: "E_VISA" | "VOA"; visa_category: string },
    ctx: z.RefinementCtx,
) {
    if (data.visa_type === "E_VISA") {
        if (!eVisaCategories.has(data.visa_category)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "validation.visa_category_mismatch",
                path: ["visa_category"],
            });
        }
    } else if (!voaCategories.has(data.visa_category)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "validation.visa_category_mismatch",
            path: ["visa_category"],
        });
    }
}

export const isoDateString = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "validation.date.invalid_iso" });

/**
 * Calendar y-m-d trong timezone VN — cho rule arrival ≥ today+3 theo giờ Việt Nam.
 */
export function getCalendarDateVN(now: Date = new Date()): { y: number; m: number; d: number } {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Ho_Chi_Minh",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(now);
    const pick = (t: string): number => Number(parts.find((p) => p.type === t)?.value ?? 0);
    return { y: pick("year"), m: pick("month"), d: pick("day") };
}

export function parseISODateOnlyToUtcStart(iso: string): Date {
    const [y, m, d] = iso.split("-").map((x) => Number(x));
    return new Date(Date.UTC(y, m - 1, d));
}

export function addCalendarDaysUtc(y: number, m: number, d: number, delta: number): Date {
    return new Date(Date.UTC(y, m - 1, d + delta));
}

export function addMonthsUtcStart(y: number, m: number, d: number, months: number): Date {
    return new Date(Date.UTC(y, m - 1 + months, d));
}

/**
 * POST /applications/calculate-price — body roadmap Stage 2 Step 2.
 */
export const calculatePriceSchema = applicationPricingFieldsSchema.superRefine((data, ctx) => {
    refineVisaCategoryMatch(data, ctx);
});

export type CalculatePriceDto = z.infer<typeof calculatePriceSchema>;

const applicantSubmitSchema = z
    .object({
        full_name: z.string().min(1, { message: "validation.full_name.required" }).max(255),
        gender: applicantGenderSchema,
        nationality: z
            .string()
            .min(2, { message: "validation.nationality.invalid" })
            .max(2, { message: "validation.nationality.invalid" })
            .transform((s) => s.toUpperCase()),
        date_of_birth: isoDateString,
        passport_number: z.string().min(1, { message: "validation.passport_number.required" }).max(64),
        passport_expiry_date: isoDateString,
        passport_image_url: z.string().url({ message: "validation.passport_image_url.invalid" }).max(512),
        portrait_image_url: z.string().url({ message: "validation.portrait_image_url.invalid" }).max(512).optional(),
        /** URL vé máy bay hoặc thẻ lên máy bay */
        flight_ticket_url: z.string().url({ message: "validation.flight_ticket_url.invalid" }).max(512).optional(),
    })
    .strict();

/**
 * POST /applications/submit — Step 1 + 2 roadmap Stage 2 Step 3.
 */
export const submitApplicationSchema = applicationPricingFieldsSchema
    .extend({
        contact_email: z.string().email({ message: "validation.email.invalid" }).max(191),
        contact_phone: z.string().min(1, { message: "validation.phone.required" }).max(64),
        language: z.string().optional(),
        arrival_date: isoDateString,
        port_of_entry: z.string().trim().min(1, { message: "validation.port_of_entry.required" }).max(16),
        purpose_of_visit: purposeOfVisitSchema,
        applicants: z
            .array(applicantSubmitSchema)
            .min(1, { message: "validation.applicants.min" })
            .max(10, { message: "validation.applicants.max" }),
    })
    .strict()
    .superRefine((data, ctx) => {
        refineVisaCategoryMatch(data, ctx);

        if (data.applicants.length !== data.applicant_count) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "validation.applicants.count_mismatch",
                path: ["applicants"],
            });
        }

        const todayVn = getCalendarDateVN();
        const minArrival = addCalendarDaysUtc(todayVn.y, todayVn.m, todayVn.d, 0);
        const arrivalStart = parseISODateOnlyToUtcStart(data.arrival_date);
        if (arrivalStart.getTime() < minArrival.getTime()) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "validation.arrival_date.too_soon",
                path: ["arrival_date"],
            });
        }

        const [ay, am, ad] = data.arrival_date.split("-").map((x) => Number(x));
        const passportMinExclusive = addMonthsUtcStart(ay, am, ad, 6);

        for (let i = 0; i < data.applicants.length; i++) {
            const a = data.applicants[i]!;
            const exp = parseISODateOnlyToUtcStart(a.passport_expiry_date);
            if (exp.getTime() <= passportMinExclusive.getTime()) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "validation.passport_expiry.invalid",
                    path: ["applicants", i, "passport_expiry_date"],
                });
            }
        }

        // Vé máy bay bắt buộc với Fast Track (Basic hoặc VIP) — cần confirm lịch bay khi check-in
        if (data.extra_services.vip_fast_track === true || data.extra_services.basic_fast_track === true) {
            for (let i = 0; i < data.applicants.length; i++) {
                const a = data.applicants[i]!;
                if (!a.flight_ticket_url || a.flight_ticket_url.length === 0) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: "validation.flight_ticket_url.required_vip",
                        path: ["applicants", i, "flight_ticket_url"],
                    });
                }
            }
        }

        // Ảnh chân dung 4×6 bắt buộc với E-Visa (yêu cầu của Cổng điện tử Chính phủ VN)
        if (data.visa_type === "E_VISA") {
            for (let i = 0; i < data.applicants.length; i++) {
                const a = data.applicants[i]!;
                if (!a.portrait_image_url || a.portrait_image_url.length === 0) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: "validation.portrait_image_url.required_evisa",
                        path: ["applicants", i, "portrait_image_url"],
                    });
                }
            }
        }
    });

export type SubmitApplicationDto = z.infer<typeof submitApplicationSchema>;

/** Mã hồ sơ VN-YYYYMMDD-XXXXX — chỉ tồn tại sau thanh toán thành công */
export const applicationBookingIdSchema = z
    .string()
    .regex(/^VN-\d{8}-[A-Z0-9]{5}$/, { message: "validation.booking_number.invalid" });

/**
 * ID nội bộ draft hoặc application (cuid).
 */
export const applicationDraftIdSchema = z
    .string()
    .trim()
    .min(1, { message: "validation.id.required" })
    .max(64, { message: "validation.id.invalid" });

/**
 * ID nội bộ đơn — cuid hoặc legacy VN- id.
 */
export const applicationInternalIdSchema = applicationDraftIdSchema;

/**
 * GET /applications/status — query roadmap Stage 2 Step 4.
 */
export const applicationStatusQuerySchema = z
    .object({
        booking_number: applicationBookingIdSchema,
        email: z.string().email({ message: "validation.email.invalid" }).max(191),
    })
    .strict();

export type ApplicationStatusQueryDto = z.infer<typeof applicationStatusQuerySchema>;

/**
 * GET /applications/:id — param id nội bộ (cuid) hoặc legacy VN- pending.
 */
export const applicationIdParamSchema = z
    .object({
        id: applicationInternalIdSchema,
    })
    .strict();

export type ApplicationIdParamDto = z.infer<typeof applicationIdParamSchema>;

/**
 * POST /applications/extract-passport — OCR ảnh passport, nhận image dưới dạng base64.
 */
export const extractPassportSchema = z
    .object({
        image_data: z.string().min(1, { message: "validation.image_data.required" }),
        mime_type: z
            .string()
            .regex(/^image\/(jpeg|png|webp)$/, { message: "validation.mime_type.invalid" }),
    })
    .strict();

export type ExtractPassportDto = z.infer<typeof extractPassportSchema>;
