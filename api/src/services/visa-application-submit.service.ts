import { createApplicationDraft } from "@/services/application-draft.service";
import type { SubmitApplicationDto } from "@/validators/applications.validator";

export type { SubmitApplicationResult } from "@/services/application-draft.service";

/**
 * Gửi đơn apply — lưu nháp (draft), không tạo hồ sơ cho đến khi PayPal capture thành công.
 */
export async function submitApplication(
    dto: SubmitApplicationDto,
    options?: { userId?: string },
) {
    return createApplicationDraft(dto, options);
}
