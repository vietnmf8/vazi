"use client"

import { useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { t } from "@/lib/i18n"
import { Button } from "@/components/ui/Button"

export function VerifyEmail() {
 const searchParams = useSearchParams()
 const token = searchParams.get("token")
 
 const [status, setStatus] = useState<"loading" | "success" | "error">("loading")

 useEffect(() => {
 if (!token) {
 setStatus("error")
 return
 }

 let isMounted = true

 const verifyToken = async () => {
 try {
 const res = await fetch("/api/auth/verify-email", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({ token }),
 })
 
 if (isMounted) {
 if (res.ok) {
 setStatus("success")
 } else {
 setStatus("error")
 }
 }
 } catch {
 if (isMounted) {
 setStatus("error")
 }
 }
 }

 verifyToken()

 return () => {
 isMounted = false
 }
 }, [token])

 return (
 <div
 className="min-h-svh flex items-center justify-center p-4"
 style={{ backgroundColor: "var(--color-surface-base)" }}
 >
 <div
 className="w-full max-w-sm rounded-xl p-8 space-y-6 text-center"
 style={{
 backgroundColor: "var(--color-surface-elevated)",
 border: "1px solid var(--color-border-default)",
 }}
 >
 <div className="space-y-1">
 <img
 src="/logo-lm.png"
 alt="FastVisa"
 className="h-10 mx-auto mb-3 object-contain"
 />
 <h1
 className="text-xl font-semibold"
 style={{ color: "var(--color-text-primary)" }}
 >
 {t("verifyEmail.title")}
 </h1>
 </div>

 {status === "loading" && (
 <p style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-md)" }}>
 {t("verifyEmail.subtitle")}
 </p>
 )}

 {status === "success" && (
 <div className="space-y-4">
 <div
 className="rounded-lg px-4 py-3 text-sm"
 style={{
 backgroundColor: "color-mix(in srgb, var(--color-success) 10%, transparent)",
 color: "var(--color-success)",
 border: "1px solid color-mix(in srgb, var(--color-success) 30%, transparent)",
 }}
 >
 {t("verifyEmail.success")}
 </div>
 <Button asChild className="w-full min-h-11 mt-4" style={{ backgroundColor: "var(--color-primary)", color: "white" }}>
 <a href="/login">{t("verifyEmail.toLogin")}</a>
 </Button>
 </div>
 )}

 {status === "error" && (
 <div className="space-y-4">
 <div
 className="rounded-lg px-4 py-3 text-sm"
 style={{
 backgroundColor: "color-mix(in srgb, var(--color-error) 10%, transparent)",
 color: "var(--color-error)",
 border: "1px solid color-mix(in srgb, var(--color-error) 30%, transparent)",
 }}
 >
 {t("verifyEmail.failed")}
 </div>
 <Button asChild className="w-full min-h-11 mt-4" variant="outline">
 <a href="/login">{t("verifyEmail.toLogin")}</a>
 </Button>
 </div>
 )}
 </div>
 </div>
 )
}
