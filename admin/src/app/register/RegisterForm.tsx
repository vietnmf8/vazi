"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { PasswordInput } from "@/components/ui/PasswordInput"
import { t } from "@/lib/i18n"

const registerSchema = z.object({
 email: z.string().email("Email không hợp lệ"),
 password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
 fullName: z.string().min(2, "Vui lòng nhập họ và tên"),
 phone: z.string().optional(),
})

type RegisterFormValues = z.infer<typeof registerSchema>

export function RegisterForm() {
 const [serverError, setServerError] = useState<string | null>(null)
 const [success, setSuccess] = useState(false)

 const {
 register,
 handleSubmit,
 formState: { errors, isSubmitting },
 } = useForm<RegisterFormValues>({
 resolver: zodResolver(registerSchema),
 })

 const onSubmit = async (values: RegisterFormValues) => {
 setServerError(null)
 setSuccess(false)
 try {
 const res = await fetch("/api/auth/register", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({
 email: values.email.trim().toLowerCase(),
 password: values.password,
 fullName: values.fullName.trim(),
 phone: values.phone?.trim() || "",
 }),
 })

 const envelope = await res.json()

 if (!res.ok) {
 if (res.status === 409 || envelope.error?.code === "CONFLICT") {
 setServerError(t("register.conflict"))
 } else {
 setServerError(envelope.error?.message || t("register.networkError"))
 }
 return
 }

 setSuccess(true)
 } catch {
 setServerError(t("register.networkError"))
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
 {t("register.title")}
 </h1>
 <p style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-md)" }}>
 {t("register.subtitle")}
 </p>
 </div>

 {success ? (
 <div className="space-y-4">
 <div
 className="rounded-lg px-4 py-3 text-sm text-center"
 style={{
 backgroundColor: "color-mix(in srgb, var(--color-success) 10%, transparent)",
 color: "var(--color-success)",
 border: "1px solid color-mix(in srgb, var(--color-success) 30%, transparent)",
 }}
 >
 {t("register.success")}
 </div>
 <div className="text-center mt-4">
 <a 
 href="/login" 
 className="text-sm hover:underline"
 style={{ color: "var(--color-primary)" }}
 >
 {t("register.toLogin")}
 </a>
 </div>
 </div>
 ) : (
 <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
 <div className="space-y-1">
 <label
 htmlFor="fullName"
 style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)" }}
 >
 {t("register.fullName")}
 </label>
 <Input
 id="fullName"
 type="text"
 autoComplete="name"
 placeholder="John Doe"
 {...register("fullName")}
 />
 {errors.fullName && (
 <p role="alert" style={{ color: "var(--color-error)", fontSize: "var(--font-size-sm)" }}>
 {errors.fullName.message}
 </p>
 )}
 </div>

 <div className="space-y-1">
 <label
 htmlFor="email"
 style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)" }}
 >
 {t("register.email")}
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

 <div className="space-y-1">
 <label
 htmlFor="phone"
 style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)" }}
 >
 {t("register.phone")} (Optional)
 </label>
 <Input
 id="phone"
 type="tel"
 autoComplete="tel"
 placeholder="+84..."
 {...register("phone")}
 />
 {errors.phone && (
 <p role="alert" style={{ color: "var(--color-error)", fontSize: "var(--font-size-sm)" }}>
 {errors.phone.message}
 </p>
 )}
 </div>

 <div className="space-y-1">
 <label
 htmlFor="password"
 style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)" }}
 >
 {t("register.password")}
 </label>
 <PasswordInput
 id="password"
 autoComplete="new-password"
 {...register("password")}
 />
 {errors.password && (
 <p role="alert" style={{ color: "var(--color-error)", fontSize: "var(--font-size-sm)" }}>
 {errors.password.message}
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
 {isSubmitting ? t("register.submitting") : t("register.submit")}
 </Button>

 <div className="text-center mt-4">
 <a 
 href="/login" 
 className="text-sm hover:underline"
 style={{ color: "var(--color-primary)" }}
 >
 {t("register.toLogin")}
 </a>
 </div>
 </form>
 )}
 </div>
 </div>
 )
}
