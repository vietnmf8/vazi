import { z } from "zod";
import { VisaApplicationStatus } from "@prisma/client";
import { paginationQuerySchema } from "@/validators/shared/pagination";
import {
    applicantGenderSchema,
    applicationPricingFieldsSchema,
    isoDateString,
    purposeOfVisitSchema,
    refineVisaCategoryMatch,
} from "@/validators/applications.validator";

const applicationStatuses = Object.values(VisaApplicationStatus);
const adminVisibleStatuses = applicationStatuses.filter((s) => s !== "PENDING");

export const adminApplicationsQuerySchema = paginationQuerySchema
    .extend({
        status: z
            .enum(adminVisibleStatuses as [VisaApplicationStatus, ...VisaApplicationStatus[]])
            .optional(),
        visa_type: z.string().optional(),
        date: z.string().optional(),
        sort_by: z.string().optional(),
        sort_dir: z.enum(["asc", "desc"]).optional(),
    })
    .strict();

export const adminApplicationIdParamsSchema = z
    .object({
        id: z
            .string()
            .trim()
            .min(1, { message: "validation.id.required" })
            .max(64, { message: "validation.id.invalid" }),
    })
    .strict();

export const adminUpdateApplicationStatusSchema = z
    .object({
        status: z.enum(applicationStatuses as [VisaApplicationStatus, ...VisaApplicationStatus[]]),
        template_name: z.string().optional(),
    })
    .strict();

export const adminUpdateResultDocumentSchema = z
    .object({
        result_document_public_id: z.string().nullable(),
    })
    .strict();

export const adminUpdatePickupImageSchema = z
    .object({
        pickup_point_image_public_id: z.string().nullable(),
    })
    .strict();

const adminApplicantUpdateSchema = z
    .object({
        id: z.string().uuid().optional(),
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
 * PATCH /admin/applications/:id — admin full edit (không áp rule arrival min +3 ngày).
 */
export const adminUpdateApplicationSchema = applicationPricingFieldsSchema
    .extend({
        contact_email: z.string().email({ message: "validation.email.invalid" }).max(191),
        contact_phone: z.string().min(1, { message: "validation.phone.required" }).max(64),
        arrival_date: isoDateString,
        port_of_entry: z.string().trim().min(1, { message: "validation.port_of_entry.required" }).max(16),
        purpose_of_visit: purposeOfVisitSchema,
        applicants: z
            .array(adminApplicantUpdateSchema)
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
    });

export type AdminApplicationsQueryDto = z.infer<typeof adminApplicationsQuerySchema>;
export type AdminApplicationIdParamsDto = z.infer<typeof adminApplicationIdParamsSchema>;
export type AdminUpdateApplicationStatusDto = z.infer<typeof adminUpdateApplicationStatusSchema>;
export type AdminUpdateResultDocumentDto = z.infer<typeof adminUpdateResultDocumentSchema>;
export type AdminUpdatePickupImageDto = z.infer<typeof adminUpdatePickupImageSchema>;
export type AdminUpdateApplicationDto = z.infer<typeof adminUpdateApplicationSchema>;
