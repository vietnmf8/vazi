import { VisaApplicationStatus } from "@prisma/client";
import { ValidationError } from "@/utils/errors";

/**
 * Admin quản lý 4 trạng thái nghiệp vụ theo luồng tuyến tính:
 * PAID → PROCESSING → COMPLETED hoặc REJECTED.
 * - PAID chỉ được chuyển sang PROCESSING (admin bắt đầu xử lý)
 * - PROCESSING chuyển sang COMPLETED hoặc REJECTED (kết thúc)
 */
const ALLOWED_TRANSITIONS: Record<VisaApplicationStatus, VisaApplicationStatus[]> = {
    PENDING: [],
    PAID: [VisaApplicationStatus.PROCESSING],
    PROCESSING: [VisaApplicationStatus.COMPLETED, VisaApplicationStatus.REJECTED],
    COMPLETED: [],
    REJECTED: [],
};

/**
 * Kiểm tra chuyển trạng thái đơn visa theo state machine admin.
 *
 * @throws {ValidationError} Khi transition không hợp lệ
 */
export function assertValidApplicationStatusTransition(
    from: VisaApplicationStatus,
    to: VisaApplicationStatus,
): void {
    if (from === to) {
        return;
    }
    const allowed = ALLOWED_TRANSITIONS[from];
    if (!allowed.includes(to)) {
        throw new ValidationError("applications.status_transition_invalid", {
            from: [from],
            to: [to],
        });
    }
}

/**
 * Admin list mặc định loại PENDING — chỉ quản lý đơn đã thanh toán trở lên.
 */
export const ADMIN_VISIBLE_STATUSES: VisaApplicationStatus[] = [
    VisaApplicationStatus.PAID,
    VisaApplicationStatus.PROCESSING,
    VisaApplicationStatus.COMPLETED,
    VisaApplicationStatus.REJECTED,
];
