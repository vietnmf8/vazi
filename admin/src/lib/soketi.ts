import Pusher from "pusher-js"

/**
 * Đọc cấu hình Soketi từ env vars.
 */
export function getSoketiConfig() {
 return {
 key: process.env.NEXT_PUBLIC_SOKETI_KEY ?? "",
 host: process.env.NEXT_PUBLIC_SOKETI_HOST ?? "127.0.0.1",
 port: Number(process.env.NEXT_PUBLIC_SOKETI_PORT ?? "6001"),
 cluster: process.env.NEXT_PUBLIC_SOKETI_CLUSTER ?? "mt1",
 forceTLS: process.env.NEXT_PUBLIC_SOKETI_FORCE_TLS === "true",
 }
}

let _instance: Pusher | null = null

/**
 * Singleton Pusher client — tránh tạo nhiều connection và disconnect lẫn nhau giữa hooks.
 * Trả về null nếu NEXT_PUBLIC_SOKETI_KEY chưa được cấu hình.
 */
export function getPusherClient(): Pusher | null {
 if (_instance) return _instance

 const config = getSoketiConfig()
 if (!config.key) return null

 // Debug WebSocket flow trong development — theo dõi subscribe/unsubscribe race
 if (process.env.NODE_ENV === "development") {
 Pusher.logToConsole = true
 }

 _instance = new Pusher(config.key, {
 cluster: config.cluster,
 wsHost: config.host,
 wsPort: config.port,
 wssPort: config.port,
 forceTLS: config.forceTLS,
 enabledTransports: config.forceTLS ? ["wss"] : ["ws"],
 enableStats: false,
 })

 _instance.connection.bind("state_change", (states: { previous: string; current: string }) => {
 })
 _instance.connection.bind("error", (err: unknown) => {
    // Next.js dev overlay will catch console.error. Use warn for transient WS errors.
    console.warn("[Pusher] Connection error:", err)
 })

 return _instance
}

/** @deprecated Dùng getPusherClient() để tái sử dụng connection */
export function createPusherClient(): Pusher | null {
 return getPusherClient()
}
