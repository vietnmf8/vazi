import { NextResponse } from "next/server"

import { LOGGED_IN_COOKIE } from "@/lib/auth"

/** Xóa cookie phiên admin khi đăng xuất */
export async function POST() {
 const response = NextResponse.json({ success: true })
 response.cookies.set(LOGGED_IN_COOKIE, "", {
 httpOnly: true,
 sameSite: "lax",
 secure: process.env.NODE_ENV === "production",
 path: "/",
 maxAge: 0,
 })
 return response
}
