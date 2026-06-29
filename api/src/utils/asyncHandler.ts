import type { NextFunction, Request, RequestHandler, Response } from "express";

/**
 * Bọc async route handler để mọi rejection đi vào `errorHandler` qua `next(err)`.
 *
 * Tránh promise “trôi” khi controller quên try/catch — pattern bắt buộc cho route async.
 *
 * @param fn - Handler trả Promise (vd. gọi service + `res.success`)
 * @returns Middleware Express tương thích `RequestHandler`
 */
export function asyncHandler(
    fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
    return (req: Request, res: Response, next: NextFunction): void => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
