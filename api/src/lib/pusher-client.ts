import Pusher from "pusher";

import { httpCodes } from "@/configs/constants";
import { getEnv } from "@/configs/env.config";
import { AppError } from "@/utils/errors";

let pusherSingleton: Pusher | null = null;

/**
 * Soketi không có SDK riêng — dùng HTTP publish của `pusher` giống backend tham chiếu.
 *
 * Singleton để tái dùng connection pool nội bộ của SDK.
 *
 * @throws {AppError} Khi thiếu id/key/secret — không âm thầm bỏ miss realtime vì FE sẽ “đinh” subscribe channel rỗng.
 */
export function getPusher(): Pusher {
    if (pusherSingleton) {
        return pusherSingleton;
    }

    const env = getEnv();
    const appId = env.SOKETI_APP_ID.trim();
    const key = env.SOKETI_APP_KEY.trim();
    const secret = env.SOKETI_APP_SECRET.trim();

    if (!appId || !key || !secret) {
        throw new AppError(
            "chat.pusher_not_configured",
            httpCodes.serviceUnavailable,
            "CHAT_REALTIME_NOT_CONFIGURED",
        );
    }

    const host = env.SOKETI_HOST.trim() || "127.0.0.1";
    const port = env.SOKETI_PORT.trim() || "6002";

    pusherSingleton = new Pusher({
        appId,
        key,
        secret,
        cluster: env.SOKETI_APP_CLUSTER.trim() || "mt1",
        useTLS: false,
        host,
        port,
    });

    const originalTrigger = pusherSingleton.trigger.bind(pusherSingleton);
    // TẠI SAO ép type qua Parameters<typeof originalTrigger>: gán arrow function vào property
    // overload (Pusher.trigger có 2 chữ ký) khiến TS không suy luận được type của `...args` từ
    // ngữ cảnh, rơi về `unknown[]` → lỗi TS2345 khi forward args vào originalTrigger(...args).
    pusherSingleton.trigger = (async (...args: Parameters<typeof originalTrigger>) => {
        try {
            return await originalTrigger(...args);
        } catch (err) {
            console.warn("[Pusher] Realtime trigger failed (ignored):", err instanceof Error ? err.message : String(err));
            return new Response(null, { status: 200 }) as any;
        }
    }) as typeof originalTrigger;

    return pusherSingleton;
}
