import { z } from "zod";
import { NationalityGroup } from "@prisma/client";

import { paginationQuerySchema } from "@/validators/shared/pagination";
import { adminResourceIdParamsSchema } from "@/validators/shared/resource-id";

const nationalityTranslationSchema = z.object({
    language_code: z.string().min(2).max(10),
    country_name: z.string().min(1),
});

export const adminNationalitiesQuerySchema = paginationQuerySchema.extend({
    group: z.nativeEnum(NationalityGroup).optional(),
}).strict();

export const adminNationalityIdParamsSchema = adminResourceIdParamsSchema;

export const adminCreateNationalitySchema = z
    .object({
        country_name: z.string().min(1),
        country_code: z.string().length(2),
        exemption_days: z.number().int().min(0),
        group: z.nativeEnum(NationalityGroup).optional(),
        translations: z.array(nationalityTranslationSchema).optional(),
    })
    .strict();

export const adminUpdateNationalitySchema = adminCreateNationalitySchema.partial().strict();

export type AdminNationalitiesQueryDto = z.infer<typeof adminNationalitiesQuerySchema>;
export type AdminNationalityIdParamsDto = z.infer<typeof adminNationalityIdParamsSchema>;
export type AdminCreateNationalityDto = z.infer<typeof adminCreateNationalitySchema>;
export type AdminUpdateNationalityDto = z.infer<typeof adminUpdateNationalitySchema>;
