import { redirect } from "next/navigation"
import { isAdminLoggedIn } from "@/lib/auth-server"
import { AdminShell } from "@/components/layout/AdminShell"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
 if (!(await isAdminLoggedIn())) {
 redirect("/login")
 }

 return <AdminShell>{children}</AdminShell>
}
