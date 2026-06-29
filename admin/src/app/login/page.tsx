import { redirect } from "next/navigation"
import { isAdminLoggedIn } from "@/lib/auth-server"
import { LoginForm } from "@/app/login/LoginForm"

export default async function LoginPage() {
 if (await isAdminLoggedIn()) {
 redirect("/")
 }

 return <LoginForm />
}
