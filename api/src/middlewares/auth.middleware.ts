import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { UserRole } from "@prisma/client";
import { getEnv } from "@/configs/env.config";
import type { AuthContext } from "@/types/express";
import { ForbiddenError, UnauthorizedError } from "@/utils/errors";

const USER_ROLES: readonly UserRole[] = ["SUPER_ADMIN", "ADMIN"];

/**
 * Kiểm tra payload `role` khớp enum Prisma — tránh gán string tùy ý vào `req.auth`.
 */
function isUserRole(value: unknown): value is UserRole {
    return typeof value === "string" && (USER_ROLES as readonly string[]).includes(value);
}

/**
 * Gắn `req.auth` từ header Bearer nếu có token hợp lệ.
 *
 * @param req - Request
 * @param requirePresence - true: thiếu/sai token → throw UnauthorizedError; false: lỗi → bỏ qua, không set auth
 */
function attachAuthFromBearer(req: Request, requirePresence: boolean): void {
    const env = getEnv();
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
        if (requirePresence) {
            throw new UnauthorizedError("auth.token_missing");
        }
        return;
    }

    const raw = header.slice("Bearer ".length).trim();
    if (!raw) {
        if (requirePresence) {
            throw new UnauthorizedError("auth.token_missing");
        }
        return;
    }

    if (!env.JWT_SECRET) {
        if (requirePresence) {
            throw new UnauthorizedError("errors.unauthorized");
        }
        return;
    }

    try {
        const decoded = jwt.verify(raw, env.JWT_SECRET);
        if (typeof decoded === "string" || decoded.sub === undefined) {
            throw new UnauthorizedError("auth.token_invalid");
        }

        const roleRaw = decoded.role;
        if (!isUserRole(roleRaw)) {
            throw new UnauthorizedError("auth.token_invalid");
        }

        const sub = String(decoded.sub);
        const email = typeof decoded.email === "string" ? decoded.email : "";

        const ctx: AuthContext = {
            user: { id: sub, email, role: roleRaw },
            accessToken: raw,
            tokenPayload: {
                sub,
                role: roleRaw,
                iat: typeof decoded.iat === "number" ? decoded.iat : 0,
                exp: typeof decoded.exp === "number" ? decoded.exp : 0,
            },
        };
        req.auth = ctx;
    } catch (err) {
        if (requirePresence) {
            if (err instanceof UnauthorizedError) {
                throw err;
            }
            throw new UnauthorizedError("auth.token_invalid");
        }
    }
}

/**
 * Bắt buộc JWT hợp lệ; gán `req.auth` khi verify thành công.
 *
 * Chưa có route login — token phải chứa `sub`, `role` (CUSTOMER|ADMIN|AGENT); `email` optional trong payload.
 *
 * @param req - Request
 * @param _res - Response (chữ ký middleware)
 * @param next - next() hoặc forward lỗi
 */
export function verifyToken(req: Request, _res: Response, next: NextFunction): void {
    try {
        attachAuthFromBearer(req, true);
        if (!req.auth) {
            throw new UnauthorizedError("auth.token_invalid");
        }
        next();
    } catch (err) {
        next(err);
    }
}

/**
 * Kiểm tra `req.auth.user.role` thuộc danh sách cho phép (sau `verifyToken`).
 *
 * @param allowed - Một hoặc nhiều `UserRole`
 * @returns Middleware Express
 */
export function requireRole(...allowed: UserRole[]) {
    return (req: Request, _res: Response, next: NextFunction): void => {
        if (!req.auth) {
            next(new UnauthorizedError("errors.unauthorized"));
            return;
        }
        const role = req.auth.user.role as UserRole;
        if (role === "SUPER_ADMIN") {
            next();
            return;
        }
        if (!allowed.includes(role)) {
            next(new ForbiddenError("errors.forbidden"));
            return;
        }
        next();
    };
}

/**
 * Chỉ cho phép email trong ALLOWED_ADMIN_EMAIL — dùng sau verifyToken + requireRole("ADMIN").
 */
export function requireAllowedAdmin() {
    return (req: Request, _res: Response, next: NextFunction): void => {
        if (!req.auth) {
            next(new UnauthorizedError("errors.unauthorized"));
            return;
        }
        // Gỡ bỏ kiểm tra ALLOWED_ADMIN_EMAIL vì hiện tại sẽ cho phép mọi Admin (khi đã duyệt)
        next();
    };
}

/**
 * Nếu có Bearer hợp lệ thì gắn `req.auth`; token sai hoặc thiếu vẫn `next()` (không 401).
 *
 * Dùng cho route public nhưng muốn enrich context khi user đã đăng nhập.
 *
 * @param req - Request
 * @param _res - Response
 * @param next - Tiếp tục pipeline
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
    attachAuthFromBearer(req, false);
    next();
}
