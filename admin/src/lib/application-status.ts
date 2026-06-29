import { t } from "@/lib/i18n"
import type { VisaApplicationStatus } from "@/types/api"

/**
 * Transition hợp lệ trên admin — khớp API (application-status-transitions.ts).
 * Luồng tuyến tính: PAID → PROCESSING → COMPLETED / REJECTED.
 */
export const ADMIN_STATUS_TRANSITIONS: Record<VisaApplicationStatus, VisaApplicationStatus[]> = {
 PAID: ["PROCESSING"],
 PROCESSING: ["COMPLETED", "REJECTED"],
 COMPLETED: [],
 REJECTED: [],
 PENDING: [],
}

/** Nhãn 4 trạng thái admin (PAID tách riêng khỏi PROCESSING). */
export function getAdminStatusLabel(status: string): string {
 if (status === "PAID") {
 return t("status.adminPaid")
 }
 if (status === "PROCESSING") {
 return t("status.adminInProgress")
 }
 if (status === "COMPLETED") {
 return t("status.adminCompleted")
 }
 if (status === "REJECTED") {
 return t("status.adminRejected")
 }
 return t(`status.${status}`, status)
}
