import { z } from "zod";

export const loginBodySchema = z.object({
    email: z.string().email({ message: "validation.email.invalid" }),
    password: z.string().min(1, { message: "validation.password.required" }),
}).strict();

export type LoginBodyDto = z.infer<typeof loginBodySchema>;

export const registerBodySchema = z.object({
    email: z.string().email({ message: "validation.email.invalid" }),
    password: z.string().min(6, { message: "validation.password.min_length" }),
    fullName: z.string().min(1, { message: "validation.full_name.required" }),
    phone: z.string().min(1, { message: "validation.phone.required" }),
}).strict();

export type RegisterBodyDto = z.infer<typeof registerBodySchema>;

export const verifyEmailBodySchema = z.object({
    token: z.string().min(1, { message: "validation.token.required" }),
}).strict();

export type VerifyEmailBodyDto = z.infer<typeof verifyEmailBodySchema>;

export const changePasswordBodySchema = z.object({
    oldPassword: z.string().min(1, { message: "validation.password.required" }),
    newPassword: z.string().min(6, { message: "validation.password.min_length" }),
    logoutAll: z.boolean().optional(),
}).strict();

export type ChangePasswordBodyDto = z.infer<typeof changePasswordBodySchema>;

export const verifyOldPasswordBodySchema = z.object({
    oldPassword: z.string().min(1, { message: "validation.password.required" }),
}).strict();

export type VerifyOldPasswordBodyDto = z.infer<typeof verifyOldPasswordBodySchema>;

export const forgotPasswordBodySchema = z.object({
    email: z.string().email({ message: "validation.email.invalid" }),
}).strict();

export type ForgotPasswordBodyDto = z.infer<typeof forgotPasswordBodySchema>;

export const resetPasswordBodySchema = z.object({
    token: z.string().min(1, { message: "validation.token.required" }),
    newPassword: z.string().min(6, { message: "validation.password.min_length" }),
}).strict();

export type ResetPasswordBodyDto = z.infer<typeof resetPasswordBodySchema>;

export const updateMeBodySchema = z.object({
    fullName: z.string().min(2, { message: "validation.fullname.required" }).optional(),
    phone: z.string().optional(),
    avatarUrl: z.string().url().optional(),
}).strict();

export type UpdateMeBodyDto = z.infer<typeof updateMeBodySchema>;
