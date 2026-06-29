import { NextResponse } from "next/server"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000"

export async function POST(request: Request) {
 let body: any
 try {
 body = await request.json()
 } catch {
 return NextResponse.json(
 { success: false, error: { code: "INVALID_BODY", message: "verify.networkError" } },
 { status: 400 },
 )
 }

 const upstream = await fetch(`${API_BASE_URL}/api/v1/auth/verify-email`, {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({
 token: body.token,
 }),
 cache: "no-store",
 })

 const envelope = await upstream.json()

 if (!upstream.ok) {
 return NextResponse.json(envelope, { status: upstream.status })
 }

 return NextResponse.json(envelope)
}
