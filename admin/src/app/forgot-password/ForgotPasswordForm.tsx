"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { forgotPassword } from "@/lib/api/auth.api"
import { CheckCircle2 } from "lucide-react"

const forgotPasswordSchema = z.object({
 email: z.string().email("Email không hợp lệ"),
})

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>

export function ForgotPasswordForm() {
 const [serverError, setServerError] = useState<string | null>(null)
 const [success, setSuccess] = useState<boolean>(false)

 const {
 register,
 handleSubmit,
 formState: { errors, isSubmitting },
 } = useForm<ForgotPasswordFormValues>({
 resolver: zodResolver(forgotPasswordSchema),
 })

 const onSubmit = async (values: ForgotPasswordFormValues) => {
 setServerError(null)
 setSuccess(false)
 try {
 await forgotPassword(values.email.trim().toLowerCase())
 setSuccess(true)
 } catch {
 setServerError("Có lỗi xảy ra, vui lòng thử lại sau.")
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
 Quên mật khẩu
 </h1>
 <p style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-md)" }}>
 Nhập email của bạn để nhận liên kết khôi phục mật khẩu.
 </p>
 </div>

 {success ? (
 <div className="text-center space-y-4">
 <div className="flex justify-center text-green-500 mb-2">
 <CheckCircle2 className="size-12" />
 </div>
 <p style={{ color: "var(--color-text-primary)" }}>
 Liên kết khôi phục mật khẩu đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư đến.
 </p>
 <Button
 className="w-full min-h-11 mt-4"
 onClick={() => window.location.href = "/login"}
 variant="outline"
 >
 Quay lại đăng nhập
 </Button>
 </div>
 ) : (
 <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
 <div className="space-y-1">
 <label
 htmlFor="email"
 style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)" }}
 >
 Email
 </label>
 <Input
 id="email"
 type="email"
 autoComplete="email"
 placeholder="admin@fastvisa.com"
 {...register("email")}
 />
 {errors.email && (
 <p role="alert" style={{ color: "var(--color-error)", fontSize: "var(--font-size-sm)" }}>
 {errors.email.message}
 </p>
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
 {isSubmitting ? "Đang gửi..." : "Gửi yêu cầu"}
 </Button>

 <div className="text-center mt-4">
 <a 
 href="/login" 
 className="text-sm hover:underline"
 style={{ color: "var(--color-primary)" }}
 >
 Quay lại đăng nhập
 </a>
 </div>
 </form>
 )}
 </div>
 </div>
 )
}
