import { z } from "zod";

export const settingKeyParamsSchema = z
    .object({
        key: z.string().min(1, { message: "validation.key.required" }),
    })
    .strict();

export const updateSettingValueSchema = z
    .object({
        value: z.unknown(),
    })
    .strict();

export type SettingKeyParamsDto = z.infer<typeof settingKeyParamsSchema>;
export type UpdateSettingValueDto = z.infer<typeof updateSettingValueSchema>;
