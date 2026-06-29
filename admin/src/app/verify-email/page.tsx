import { redirect } from "next/navigation"
import { isAdminLoggedIn } from "@/lib/auth-server"
import { VerifyEmail } from "@/app/verify-email/VerifyEmail"
import { Suspense } from "react"
import { t } from "@/lib/i18n"

export default async function VerifyEmailPage() {
 if (await isAdminLoggedIn()) {
 redirect("/")
 }

 return (
 <Suspense fallback={<div className="flex min-h-svh items-center justify-center">{t("common.loading")}</div>}>
 <VerifyEmail />
 </Suspense>
 )
}
