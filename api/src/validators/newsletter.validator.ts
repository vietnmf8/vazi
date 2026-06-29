import { z } from "zod";

export const newsletterSubscribeBodySchema = z
    .object({
        email: z
            .string()
            .trim()
            .email({ message: "validation.email.invalid" })
            .max(191),
    })
    .strict();

export type NewsletterSubscribeBodyDto = z.infer<typeof newsletterSubscribeBodySchema>;
