import type { NextFunction, Request, Response } from "express";
import { httpCodes } from "@/configs/constants";
import { AppError } from "@/utils/errors";
import * as applicationPricingService from "@/services/application-pricing.service";
import {
    getApplicationDetailById,
    getApplicationStatusByBooking,
} from "@/services/visa-application-read.service";
import { submitApplication } from "@/services/visa-application-submit.service";
import { retryPaymentCheckoutSession } from "@/services/visa-application-retry-payment.service";
import { extractPassportData } from "@/services/passport-ocr.service";
import type {
    ApplicationIdParamDto,
    ApplicationStatusQueryDto,
    CalculatePriceDto,
    SubmitApplicationDto,
    ExtractPassportDto,
} from "@/validators/applications.validator";
import type { CreatePaymentSessionBodyDto } from "@/validators/payments.validator";

/**
 * POST /applications/calculate-price — báo giá realtime theo DB.
 */
export async function postCalculatePrice(
    req: Request<unknown, unknown, CalculatePriceDto>,
    res: Response,
    _next: NextFunction,
): Promise<void> {
    const data = await applicationPricingService.calculatePriceFromRules(req.body);
    res.success(data);
}

/**
 * POST /applications/submit — lưu nháp draft trước PayPal (chưa tạo hồ sơ).
 */
export async function postSubmitApplication(
    req: Request<unknown, unknown, SubmitApplicationDto>,
    res: Response,
    _next: NextFunction,
): Promise<void> {
    const userId = req.auth?.user.id;
    const data = await submitApplication(req.body, { userId });
    res.success(data, httpCodes.created);
}

/**
 * GET /applications/status — tra cứu theo mã đơn + email.
 */
export async function getApplicationStatus(
    req: Request,
    res: Response,
    _next: NextFunction,
): Promise<void> {
    const q = req.query as ApplicationStatusQueryDto;
    const data = await getApplicationStatusByBooking(q.booking_number, q.email);
    res.success(data);
}

/**
 * POST /applications/retry-payment — draft còn hiệu lực; PayPal session mới.
 */
export async function postRetryPayment(
    req: Request<unknown, unknown, CreatePaymentSessionBodyDto>,
    res: Response,
    _next: NextFunction,
): Promise<void> {
    const data = await retryPaymentCheckoutSession(req.body);
    res.success(data);
}

/**
 * GET /applications/:id — chi tiết checkout (guest được phép nếu biết id).
 */
export async function getApplicationById(
    req: Request,
    res: Response,
    _next: NextFunction,
): Promise<void> {
    const p = req.params as ApplicationIdParamDto;
    const data = await getApplicationDetailById(p.id);
    res.success(data);
}

/**
 * POST /applications/extract-passport — OCR ảnh passport, trả về fields + confidence.
 */
export async function postExtractPassport(
    req: Request,
    res: Response,
    _next: NextFunction,
): Promise<void> {
    if (!req.file) {
        throw new AppError("No image file uploaded", httpCodes.badRequest, "VALIDATION_ERROR");
    }
    const data = await extractPassportData(req.file.buffer, req.file.mimetype);
    res.success(data);
}
