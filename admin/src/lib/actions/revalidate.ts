"use server"

export async function triggerUiRevalidate(tag: string) {
 const UI_URL = process.env.UI_URL || "http://localhost:3000";
 const SECRET = process.env.REVALIDATE_SECRET || "fastvisa_revalidate_2026_secret";
 try {
 const res = await fetch(`${UI_URL}/api/revalidate?secret=${SECRET}`, {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({ tag }),
 });
 if (!res.ok) {
 console.error(`[Webhook] Failed: ${res.status} ${res.statusText}`);
 console.error(await res.text());
 }
 return { success: res.ok };
 } catch (error) {
 console.error("[Webhook] Fetch error:", error);
 return { success: false };
 }
}
