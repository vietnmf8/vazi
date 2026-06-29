"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { resetPassword } from "@/lib/api/auth.api"
import { CheckCircle2 } from "lucide-react"
import { PasswordInput } from "@/components/ui/PasswordInput"
import { PasswordStrengthMeter } from "@/components/features/auth/PasswordStrengthMeter"
const passwordSchema = z.string().min(8, "Mật khẩu phải có ít nhất 8 ký tự")

const resetPasswordFormSchema = z.object({
 newPassword: passwordSchema,
 confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
 message: "Mật khẩu xác nhận không khớp",
 path: ["confirmPassword"],
})

type ResetPasswordFormValues = z.infer<typeof resetPasswordFormSchema>

export function ResetPasswordForm({ token }: { token: string }) {
 const [serverError, setServerError] = useState<string | null>(null)
 const [success, setSuccess] = useState<boolean>(false)

 const {
 register,
 handleSubmit,
 watch,
 formState: { errors, isSubmitting },
 } = useForm<ResetPasswordFormValues>({
 resolver: zodResolver(resetPasswordFormSchema),
 mode: "onChange",
 })

 const newPasswordValue = watch("newPassword")
 const confirmPasswordValue = watch("confirmPassword")

 const onSubmit = async (values: ResetPasswordFormValues) => {
 setServerError(null)
 setSuccess(false)
 try {
 await resetPassword({ token, newPassword: values.newPassword })
 setSuccess(true)
 } catch {
 setServerError("Có lỗi xảy ra hoặc liên kết đã hết hạn.")
 }
 }

 return (
 <div
 className="min-h-svh flex items-center justify-center p-4"
 style={{ backgroundColor: "var(--color-surface-base)" }}
 >
 <div
 className="w-full max-w-sm rounded-xl p-8 space-y-6"
 style={{
 backgroundColor: "var(--color-surface-elevated)",
 border: "1px solid var(--color-border-default)",
 }}
 >
 <div className="space-y-1 text-center">
 <img
 src="/logo-lm.png"
 alt="FastVisa"
 className="h-10 mx-auto mb-3 object-contain"
 />
 <h1
 className="text-xl font-semibold"
 style={{ color: "var(--color-text-primary)" }}
 >
 Đặt lại mật khẩu
 </h1>
 <p style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-md)" }}>
 Nhập mật khẩu mới cho tài khoản của bạn.
 </p>
 </div>

 {success ? (
 <div className="text-center space-y-4">
 <div className="flex justify-center text-green-500 mb-2">
 <CheckCircle2 className="size-12" />
 </div>
 <p style={{ color: "var(--color-text-primary)" }}>
 Mật khẩu của bạn đã được đặt lại thành công. Bạn có thể đăng nhập bằng mật khẩu mới.
 </p>
 <Button
 className="w-full min-h-11 mt-4"
 onClick={() => window.location.href = "/login"}
 >
 Đi tới Đăng nhập
 </Button>
 </div>
 ) : (
 <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
 <div className="space-y-1">
 <label className="text-sm text-gray-500 flex justify-between items-center" style={{ color: "var(--color-text-muted)" }}>
 <span>Mật khẩu mới</span>
 {!errors.newPassword && newPasswordValue && newPasswordValue.length >= 8 && (
 <span className="flex items-center text-xs text-green-600">
 <CheckCircle2 className="size-3 mr-1" /> Mật khẩu hợp lệ
 </span>
 )}
 </label>
 <PasswordInput {...register("newPassword")} />
 <PasswordStrengthMeter password={newPasswordValue} />
 {errors.newPassword && (
 <p className="text-sm text-red-500" style={{ color: "var(--color-error)" }}>{errors.newPassword.message}</p>
 )}
 </div>

 <div className="space-y-1">
 <label className="text-sm text-gray-500 flex justify-between items-center" style={{ color: "var(--color-text-muted)" }}>
 <span>Xác nhận mật khẩu mới</span>
 {!errors.confirmPassword && confirmPasswordValue && confirmPasswordValue === newPasswordValue && (
 <span className="flex items-center text-xs text-green-600">
 <CheckCircle2 className="size-3 mr-1" /> Khớp mật khẩu
 </span>
 )}
 </label>
 <PasswordInput {...register("confirmPassword")} />
 {errors.confirmPassword && (
 <p className="text-sm text-red-500" style={{ color: "var(--color-error)" }}>{errors.confirmPassword.message}</p>
 )}
 </div>

 {serverError && (
 <p
 role="alert"
 className="rounded-lg px-3 py-2 text-sm"
 style={{
 backgroundColor: "color-mix(in srgb, var(--color-error) 10%, transparent)",
 color: "var(--color-error)",
 fontSize: "var(--font-size-md)",
 border: "1px solid color-mix(in srgb, var(--color-error) 30%, transparent)",
 }}
 >
 {serverError}
 </p>
 )}

 <Button type="submit" className="w-full min-h-11" disabled={isSubmitting} style={{ backgroundColor: "var(--color-primary)", color: "white" }}>
 {isSubmitting ? "Đang xử lý..." : "Đặt lại mật khẩu"}
 </Button>
 </form>
 )}
 </div>
 </div>
 )
}
