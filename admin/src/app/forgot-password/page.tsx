import { redirect } from "next/navigation"
import { isAdminLoggedIn } from "@/lib/auth-server"
import { ForgotPasswordForm } from "./ForgotPasswordForm"

export default async function ForgotPasswordPage() {
 if (await isAdminLoggedIn()) {
 redirect("/")
 }

 return <ForgotPasswordForm />
}
