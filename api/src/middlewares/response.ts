import type { NextFunction, Request, Response } from "express";
import { httpCodes } from "@/configs/constants";

declare module "express-serve-static-core" {
    interface Response {
        success: (
            data: unknown,
            status?: number,
            passProps?: object,
        ) => void;
        error: (error: unknown, status?: number) => void;
        paginate: (result: {
            rows: unknown[];
            pagination: Record<string, unknown>;
        }) => void;
    }
}

/**
 * Middleware chuẩn hoá mọi JSON trả về: `{ success, data, error }` / phân trang.
 *
 * Bắt buộc controller dùng `res.success` / `res.error` / `res.paginate` để FE parse một kiểu.
 * Kiểu `status` khai `number` explicit để tránh literal `200|500` từ `httpCodes as const` làm hẹp TS.
 *
 * @param _req - Unused — giữ chữ ký middleware đồng nhất
 * @param res - Response đã được monkey-patch method helper
 * @param next - Express next
 */
export default function responseMiddleware(
    _req: Request,
    res: Response,
    next: NextFunction,
): void {
    res.success = (data, status: number = httpCodes.ok, passProps = {}) => {
        res.status(status).json({
            success: true,
            data,
            error: null,
            ...passProps,
        });
    };

    res.error = (error, status: number = httpCodes.serverError) => {
        res.status(status).json({
            success: false,
            data: null,
            error: typeof error === "string" ? { message: error } : error,
        });
    };

    res.paginate = ({ rows, pagination }) => {
        res.status(httpCodes.ok).json({
            success: true,
            data: rows,
            error: null,
            pagination,
        });
    };

    next();
}
