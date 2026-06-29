import { cookies } from "next/headers"
import { LOGGED_IN_COOKIE } from "@/lib/auth"

/**
 * Kiểm tra cookie đăng nhập admin trên server.
 * Dùng trong layout/page thay proxy — tránh Node.js proxy runtime leak trong dev.
 */
export async function isAdminLoggedIn(): Promise<boolean> {
 const cookieStore = await cookies()
 return cookieStore.get(LOGGED_IN_COOKIE)?.value === "1"
}
