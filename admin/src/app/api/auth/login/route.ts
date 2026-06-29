import { NextResponse } from "next/server"

import { LOGGED_IN_COOKIE, SESSION_MAX_AGE_SECONDS } from "@/lib/auth"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000"

/**
 * BFF login — proxy sang API Express, set cookie httpOnly cho layout server-side.
 */
export async function POST(request: Request) {
 let body: { email?: string; password?: string }
 try {
 body = (await request.json()) as { email?: string; password?: string }
 } catch {
 return NextResponse.json(
 { success: false, error: { code: "INVALID_BODY", message: "login.networkError" } },
 { status: 400 },
 )
 }

 const upstream = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({
 email: body.email?.trim().toLowerCase(),
 password: body.password,
 }),
 cache: "no-store",
 })

 const envelope = (await upstream.json()) as {
 success?: boolean
 data?: { token?: string; user?: { id: string; email: string; role: string } }
 error?: { code?: string; message?: string }
 }

 if (!upstream.ok || !envelope.data?.token) {
 return NextResponse.json(envelope, { status: upstream.status })
 }

 const response = NextResponse.json({
 success: true,
 data: {
 token: envelope.data.token,
 user: envelope.data.user,
 },
 })

 response.cookies.set(LOGGED_IN_COOKIE, "1", {
 httpOnly: true,
 sameSite: "lax",
 secure: process.env.NODE_ENV === "production",
 path: "/",
 maxAge: SESSION_MAX_AGE_SECONDS,
 })

 return response
}
