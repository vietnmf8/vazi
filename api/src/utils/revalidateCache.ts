/**
 * Trigger On-Demand Cache Revalidation trên @ui qua webhook POST /api/revalidate.
 * Non-blocking — lỗi kết nối không ảnh hưởng response chính.
 *
 * Mỗi section UI đã có cacheTag riêng trong home.api.ts, nên chỉ cần
 * revalidateTag(tag) là đủ — không cần revalidatePath nữa.
 * Tham số `paths` vẫn giữ lại cho các trường hợp đặc biệt.
 */
import { getPusher } from "@/lib/pusher-client";
export async function revalidateCache(tag: string, paths: string[] = []): Promise<void> {
    const uiUrl = process.env.UI_BASE_URL;
    const secret = process.env.REVALIDATE_SECRET;
    if (!uiUrl || !secret) return;

    // Trigger Pusher SONG SONG với webhook
    const pusher = getPusher();
    const pusherPromise = pusher
        ? pusher.trigger("system-events", "cache_revalidated", { tag }).catch((err) => {
            console.error("Failed to trigger Pusher cache_revalidated:", err.message);
        })
        : Promise.resolve();

    // Gọi webhook: revalidateTag (+ revalidatePath nếu có paths)
    const webhookPromise = fetch(`${uiUrl}/api/revalidate?secret=${secret}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag, ...(paths.length > 0 ? { paths } : {}) }),
    }).catch((err) => {
        console.error("Failed to call revalidate API:", err.message);
    });

    await Promise.all([webhookPromise, pusherPromise]);
}
