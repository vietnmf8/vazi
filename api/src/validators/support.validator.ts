import { z } from "zod";

import { applicationBookingIdSchema } from "@/validators/applications.validator";

/**
 * POST /support/contact — payload form liên hệ công khai.
 */
export const supportContactBodySchema = z
    .object({
        full_name: z.string().trim().min(1, { message: "validation.full_name.required" }).max(255),
        email: z.string().trim().email({ message: "validation.email.invalid" }).max(191),
        subject: z.string().trim().min(1, { message: "validation.subject.required" }).max(255),
        message: z.string().trim().min(1, { message: "validation.message.required" }).max(8000),
        booking_number: applicationBookingIdSchema.optional(),
    })
    .strict();

export type SupportContactBodyDto = z.infer<typeof supportContactBodySchema>;
