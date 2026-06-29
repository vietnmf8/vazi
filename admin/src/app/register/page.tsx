import { redirect } from "next/navigation"
import { isAdminLoggedIn } from "@/lib/auth-server"
import { RegisterForm } from "@/app/register/RegisterForm"

export default async function RegisterPage() {
 if (await isAdminLoggedIn()) {
 redirect("/")
 }

 return <RegisterForm />
}
