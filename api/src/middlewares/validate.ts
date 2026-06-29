import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";
import { ZodError } from "zod";
import { ValidationError } from "@/utils/errors";

type ValidateTarget = "body" | "query" | "params";

/**
 * Middleware parse + validate Zod tại ranh giới route (không validate trong controller).
 *
 * Message trong `fieldErrors` là i18n key từ schema để FE/req.t dịch sau.
 *
 * @param schema - Schema Zod
 * @param target - Nguồn dữ liệu cần validate
 * @returns Express middleware
 */
export default function validate<T extends ZodSchema>(schema: T, target: ValidateTarget = "body") {
    return (req: Request, _res: Response, next: NextFunction): void => {
        try {
            const data = schema.parse(req[target]) as unknown;
            (req as unknown as Record<string, unknown>)[target] = data;
            next();
        } catch (err) {
            if (err instanceof ZodError) {
                const fieldErrors: Record<string, string[]> = {};
                for (const issue of err.issues) {
                    const path = issue.path.length > 0 ? issue.path.join(".") : "_root";
                    if (!fieldErrors[path]) {
                        fieldErrors[path] = [];
                    }
                    fieldErrors[path].push(issue.message);
                }
                next(new ValidationError("errors.validation_failed", fieldErrors));
                return;
            }
            next(err);
        }
    };
}
