import type { CSSProperties } from "react"
import { t } from "@/lib/i18n"

export type StatusToken =
 | "pending"
 | "processing"
 | "completed"
 | "rejected"
 | "paid"
 | "default"

const STATUS_MAP: Record<string, StatusToken> = {
 PENDING: "pending",
 // PAID có token riêng (slate) — cấp độ thấp hơn PROCESSING (blue)
 PAID: "paid",
 PROCESSING: "processing",
 COMPLETED: "completed",
 REJECTED: "rejected",
 OPEN: "pending",
 IN_PROGRESS: "processing",
 RESOLVED: "completed",
 CLOSED: "rejected",
 SUCCESS: "completed",
 FAILED: "rejected",
 REFUNDED: "default",
 AI_HANDLING: "processing",
 HUMAN_HANDLING: "paid",
}

const TOKEN_STYLES: Record<StatusToken, CSSProperties> = {
 pending: {
 backgroundColor: "#d97706",
 color: "#ffffff",
 border: "none",
 },
 processing: {
 backgroundColor: "#2563eb",
 color: "#ffffff",
 border: "none",
 },
 completed: {
 backgroundColor: "#059669",
 color: "#ffffff",
 border: "none",
 },
 rejected: {
 backgroundColor: "#dc2626",
 color: "#ffffff",
 border: "none",
 },
 paid: {
 // Màu slate — chìm hơn vàng (pending) và xanh (processing) để thể hiện cấp độ thấp hơn
 backgroundColor: "#64748b",
 color: "#ffffff",
 border: "none",
 },
 default: {
 backgroundColor: "color-mix(in srgb, var(--color-text-primary) 8%, transparent)",
 color: "var(--color-text-muted)",
 border: "1px solid var(--color-border-default)",
 },
}

export function getStatusToken(status: string): StatusToken {
 return STATUS_MAP[status] ?? "default"
}

export function getStatusStyle(status: string): CSSProperties {
 return TOKEN_STYLES[getStatusToken(status)]
}

export function getStatusLabel(status: string): string {
 return t(`status.${status}`, status)
}
