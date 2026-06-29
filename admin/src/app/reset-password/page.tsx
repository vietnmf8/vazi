import { redirect } from "next/navigation"
import { isAdminLoggedIn } from "@/lib/auth-server"
import { ResetPasswordForm } from "./ResetPasswordForm"

export default async function ResetPasswordPage({
 searchParams,
}: {
 searchParams: Promise<{ token?: string }>
}) {
 if (await isAdminLoggedIn()) {
 redirect("/")
 }

 const { token } = await searchParams

 if (!token) {
 redirect("/forgot-password")
 }

 return <ResetPasswordForm token={token} />
}
