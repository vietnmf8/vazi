import type { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import * as Sentry from "@sentry/node";
import { ZodError } from "zod";
import multer from "multer";
import { httpCodes } from "@/configs/constants";
import { getEnv } from "@/configs/env.config";
import {
    AppError,
    ConflictError,
    ForbiddenError,
    NotFoundError,
    UnauthorizedError,
    ValidationError,
} from "@/utils/errors";

interface ErrorBody {
    code: string;
    message: string;
    details?: unknown;
    stack?: string;
}

/**
 * Middleware xử lý lỗi cuối pipeline — không được `throw` sau đây.
 *
 * - Lỗi có cấu trúc (`AppError`, `ZodError`) → status + body ổn định.
 * - Lỗi generic → gửi Sentry, ẩn stack/message chi tiết ở production để không lộ implementation.
 *
 * @param err - Lỗi từ controller/service hoặc runtime
 * @param _req - Request (giữ chữ ký Express 4 error middleware)
 * @param res - Đã có `res.error` từ `responseMiddleware`
 */
export default function errorHandler(
    err: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction,
): void {
    const env = getEnv();
    const isProduction = env.NODE_ENV === "production";

    // In lỗi chi tiết ra console trong môi trường development
    if (!isProduction) {
        console.error("ErrorHandler caught error:", err);
    }

    // Khai `number` tránh TS suy literal từ `httpCodes.serverError` làm hẹp kiểu khi gán nhánh sau
    let status: number = httpCodes.serverError;
    let body: ErrorBody = {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred.",
    };

    if (err instanceof ValidationError) {
        status = err.statusCode;
        body = {
            code: err.code ?? "VALIDATION_ERROR",
            message: err.message,
            details: err.fields,
        };
    } else if (err instanceof UnauthorizedError) {
        status = err.statusCode;
        body = { code: "UNAUTHORIZED", message: err.message };
    } else if (err instanceof ForbiddenError) {
        status = err.statusCode;
        body = { code: "FORBIDDEN", message: err.message };
    } else if (err instanceof NotFoundError) {
        status = err.statusCode;
        body = { code: "NOT_FOUND", message: err.message };
    } else if (err instanceof ConflictError) {
        status = err.statusCode;
        body = { code: err.code ?? "CONFLICT", message: err.message };
    } else if (err instanceof AppError) {
        status = err.statusCode;
        body = { code: err.code ?? "APP_ERROR", message: err.message };
    } else if (err instanceof ZodError) {
        status = httpCodes.badRequest;
        body = {
            code: "VALIDATION_ERROR",
            message: "errors.validation_failed",
            details: err.flatten().fieldErrors,
        };
    } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
        // Map mã Prisma phổ biến — các mã khác coi là lỗi DB không mong đợi
        if (err.code === "P2002") {
            status = httpCodes.conflict;
            body = {
                code: "DUPLICATE_ENTRY",
                message: "errors.duplicate_entry",
                details: { fields: err.meta?.target },
            };
        } else if (err.code === "P2025") {
            status = httpCodes.notFound;
            body = { code: "NOT_FOUND", message: "errors.not_found" };
        } else {
            Sentry.captureException(err);
            status = httpCodes.serverError;
            body = {
                code: "DB_ERROR",
                message: isProduction ? "errors.database_error" : err.message,
            };
            if (!isProduction) {
                body.stack = err.stack;
            }
        }
    } else if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
            status = httpCodes.payloadTooLarge;
            body = { code: "FILE_TOO_LARGE", message: "File exceeds the 5MB size limit." };
        } else if (err.code === "LIMIT_UNEXPECTED_FILE") {
            status = httpCodes.badRequest;
            body = { code: "UNEXPECTED_FIELD", message: "Unexpected upload field. Use field name 'image'." };
        } else {
            status = httpCodes.badRequest;
            body = { code: "UPLOAD_ERROR", message: err.message };
        }
    } else if (err instanceof Error) {
        Sentry.captureException(err);

        // Dev: trả message/stack để debug; prod: body mặc định không leak
        if (!isProduction) {
            body = {
                code: "INTERNAL_ERROR",
                message: err.message,
                stack: err.stack,
            };
        }
    }

    if (res.headersSent) {
        // Khi headers đã được gửi từ trước (ví dụ đối với kết nối SSE streaming),
        // việc gọi res.status().json() sẽ gây lỗi crash server. Do đó, ghi trực tiếp
        // chunk lỗi vào stream hiện có và kết thúc response để đảm bảo an toàn.
        res.write(`data: ${JSON.stringify({ error: body })}\n\n`);
        res.end();
        return;
    }

    if (typeof res.error === "function") {
        res.error(body, status);
    } else {
        // res.error chưa được gán (lỗi xảy ra trước responseMiddleware, vd. PayloadTooLargeError)
        res.status(status).json({ success: false, data: null, error: body });
    }
}
