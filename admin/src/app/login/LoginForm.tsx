"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { setAuth } from "@/lib/auth"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { PasswordInput } from "@/components/ui/PasswordInput"
import { t } from "@/lib/i18n"
import type { ApiEnvelope, LoginResponse } from "@/types/api"

const loginSchema = z.object({
 email: z.string().email("Email không hợp lệ"),
 password: z.string().min(1, "Vui lòng nhập mật khẩu"),
})

type LoginFormValues = z.infer<typeof loginSchema>

export function LoginForm() {
 const router = useRouter()
 const [serverError, setServerError] = useState<string | null>(null)

 const {
 register,
 handleSubmit,
 formState: { errors, isSubmitting },
 } = useForm<LoginFormValues>({
 resolver: zodResolver(loginSchema),
 })

 const onSubmit = async (values: LoginFormValues) => {
 setServerError(null)
 try {
 const res = await fetch("/api/auth/login", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({
 email: values.email.trim().toLowerCase(),
 password: values.password,
 }),
 })

 const envelope = (await res.json()) as ApiEnvelope<LoginResponse>

 if (!res.ok) {
 const errCode = envelope.error?.code
 if (res.status === 403 || errCode === "FORBIDDEN") {
 setServerError(t("login.emailNotAllowed"))
 } else {
 setServerError(t("login.invalidCredentials"))
 }
 return
 }

 const token = envelope.data?.token
 if (!token) {
 setServerError(t("login.noToken"))
 return
 }
 setAuth(token)
 router.refresh()
 router.push("/")
 } catch {
 setServerError(t("login.networkError"))
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
 {t("login.title")}
 </h1>
 <p style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-md)" }}>
 {t("login.subtitle")}
 </p>
 </div>

 <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
 <div className="space-y-1">
 <label
 htmlFor="email"
 style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)" }}
 >
 {t("login.email")}
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
 <div className="flex items-center justify-between">
 <label
 htmlFor="password"
 style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)" }}
 >
 {t("login.password")}
 </label>
 <a 
 href="/forgot-password" 
 className="text-sm hover:underline"
 style={{ color: "var(--color-primary)" }}
 >
 Quên mật khẩu?
 </a>
 </div>
 <PasswordInput
 id="password"
 autoComplete="current-password"
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
 {isSubmitting ? t("login.submitting") : t("login.submit")}
 </Button>

 <div className="text-center mt-4">
 <a 
 href="/register" 
 className="text-sm hover:underline"
 style={{ color: "var(--color-primary)" }}
 >
 {t("login.toRegister")}
 </a>
 </div>
 </form>
 </div>
 </div>
 )
}
