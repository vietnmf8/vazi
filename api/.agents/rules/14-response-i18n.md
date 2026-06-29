---
activation: model_decision
description: Standardized response envelope + i18n message translation.
globs: src/**/*.ts
---

# Response Envelope with i18n

Mọi response của project đi qua middleware này — envelope nhất quán + auto i18n.

## Middleware (src/middlewares/response.ts)

```typescript
import { Request, Response, NextFunction } from "express";
import { httpCodes } from "@/configs/constants";

interface PaginationMeta {
    current_page: number;
    per_page: number;
    total: number;
    from: number;
    to: number;
    has_more?: boolean;
    next_cursor?: string | number | null;
}

declare module "express-serve-static-core" {
    interface Response {
        success: <T = any>(
            data: T,
            status?: number,
            passProps?: object,
        ) => void;
        error: (error: string | object, status?: number) => void;
        paginate: <T = any>(result: {
            rows: T[];
            pagination: PaginationMeta;
        }) => void;
    }
}

/**
 * Response normalization middleware.
 * Mọi controller PHẢI dùng res.success/error/paginate.
 *
 * Envelope:
 * Success: { success: true, data: ..., error: null }
 * Error:   { success: false, data: null, error: { code, message, details? } }
 * Paginate: { success: true, data: [...], pagination: {...}, error: null }
 *
 * Messages tự động được translate qua req.t() (i18next).
 * Pass i18n KEY (e.g. "auth.login.success") — không phải plain text.
 */
export default function responseMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
) {
    const t = (key: string): string => {
        // Translate; if key not found, return as-is (i18next behavior)
        return req.t?.(key) ?? key;
    };

    res.success = (data, status = httpCodes.ok, passProps = {}) => {
        res.status(status).json({
            success: true,
            data,
            error: null,
            ...passProps,
        });
    };

    res.error = (error, status = httpCodes.serverError) => {
        let errorObj: { code: string; message: string; details?: any };

        if (typeof error === "string") {
            // Treat as i18n key
            errorObj = { code: "ERROR", message: t(error) };
        } else if (typeof error === "object" && error !== null) {
            const e = error as any;
            errorObj = {
                code: e.code ?? "ERROR",
                message: e.message ? t(e.message) : t("errors.internal_server"),
                ...(e.details && { details: e.details }),
                ...(e.stack && { stack: e.stack }), // only set in dev (errorHandler)
            };
        } else {
            errorObj = { code: "ERROR", message: t("errors.internal_server") };
        }

        res.status(status).json({
            success: false,
            data: null,
            error: errorObj,
        });
    };

    res.paginate = ({ rows, pagination }) => {
        res.status(httpCodes.ok).json({
            success: true,
            data: rows,
            pagination,
            error: null,
        });
    };

    next();
}
```

## Use in controllers

```typescript
// ✅ Success with translated message via passProps
res.success(user, httpCodes.created, {
    message: req.t("auth.register.success"),
});

// ✅ Error: just pass i18n key, middleware translates
res.error("auth.invalid_credentials", httpCodes.unauthorized);

// ✅ Or: throw in service, errorHandler does the rest
throw new EmailExistError("auth.register.email_exists");

// ✅ Paginate
res.paginate({ rows: products, pagination });
```

## Response shape examples

**Success:**

```json
{
    "success": true,
    "data": { "id": "c123", "name": "Widget" },
    "error": null
}
```

**Success with message (Vietnamese):**

```json
{
    "success": true,
    "data": { "id": "c123" },
    "error": null,
    "message": "Đăng ký thành công. Vui lòng kiểm tra email."
}
```

**Same request with `Accept-Language: en`:**

```json
{
    "success": true,
    "data": { "id": "c123" },
    "error": null,
    "message": "Registration successful. Please check your email."
}
```

**Error (Vietnamese):**

```json
{
    "success": false,
    "data": null,
    "error": {
        "code": "VALIDATION_ERROR",
        "message": "Dữ liệu không hợp lệ",
        "details": {
            "email": ["Email không hợp lệ"],
            "password": ["Mật khẩu phải có ít nhất 8 ký tự"]
        }
    }
}
```

**Pagination:**

```json
{
    "success": true,
    "data": [{ "id": "c1" }, { "id": "c2" }],
    "pagination": {
        "current_page": 1,
        "per_page": 20,
        "total": 100,
        "from": 1,
        "to": 20,
        "has_more": true
    },
    "error": null
}
```

## Rules

1. **NEVER** dùng `res.json()` / `res.send()` / `res.status().json()` trực tiếp
2. Pass **i18n keys** (e.g. `"auth.login.success"`) — KHÔNG hardcode message
3. Status code lấy từ `@/configs/constants` (e.g. `httpCodes.created`)
4. Locale auto-detect from `Accept-Language`, `?lng=`, cookie (see rule 19)
5. Production không leak `err.stack` (errorHandler đã handle)
6. Empty array response → `data: []` (KHÔNG `data: null`)
7. Single resource not found → throw `NotFoundError` (errorHandler → 404)
