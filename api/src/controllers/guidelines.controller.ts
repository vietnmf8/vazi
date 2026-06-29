import type { Request, Response } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import * as guidelinesService from "@/services/guidelines.service";

/**
 * Controller trả về dữ liệu Hướng dẫn nộp đơn (how-to-apply) được dịch theo locale.
 *
 * WHY: Cung cấp API endpoint phục vụ i18n động cho trang /how-to-apply trên UI.
 */
export const getHowToApplyGuideline = asyncHandler(async (req: Request, res: Response) => {
    const locale = (req.query.locale as string) || "en";
    const data = await guidelinesService.getHowToApplyGuideline(locale);
    res.success(data);
});
