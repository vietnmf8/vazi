import { z } from "zod";

export const exemptionCountryParamSchema = z
    .object({
        country_code: z
            .string()
            .trim()
            .length(2, { message: "validation.country_code.length" })
            .regex(/^[A-Za-z]{2}$/, { message: "validation.country_code.invalid" })
            .transform((s) => s.toUpperCase()),
    })
    .strict();

export type ExemptionCountryParamDto = z.infer<typeof exemptionCountryParamSchema>;
