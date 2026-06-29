---
activation: always_on
description: Centralized error handling, Sentry integration, production vs dev error leakage. Apply when creating controllers, services, middleware, or any error-related code.
---

# Error Handling & Sentry

## Architecture

```
Service throw new AppError("key")
↓
asyncHandler wraps → next(err)
↓
Sentry.errorHandler() captures (non-blocking)
↓
errorHandler middleware (final):
  - Identify error type via instanceof
  - Map to HTTP status code
  - Translate message via req.t()
  - Hide stack in production
  - res.error({ code, message, details? }, status)
```

## Sentry init (src/instrument.ts)

```typescript
// src/instrument.ts — MUST be imported BEFORE anything else in server.ts
import * as Sentry from "@sentry/node"
import { nodeProfilingIntegration } from "@sentry/profiling-node"

Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.APP_ENV ?? "development",
    enabled: process.env.APP_ENV === "production",
    integrations: [nodeProfilingIntegration()],
    tracesSampleRate: process.env.APP_ENV === "production" ? 0.1 : 1.0,
    profilesSampleRate: 0.1,

    // Filter noisy errors
    beforeSend(event, hint) {
        const error = hint.originalException
        // Don't report client validation errors
        if (error instanceof Error && error.name === "ValidationError") return null
        if (error instanceof Error && error.name === "UnauthorizedError") return null
        if (error instanceof Error && error.name === "ForbiddenError") return null
        return event
    },
})
```

## server.ts entry

```typescript
// src/server.ts
import "./instrument"; // ← FIRST IMPORT, ALWAYS
import "dotenv/config";
import "module-alias/register";
import app from "@/app";

const port = Number(process.env.APP_PORT ?? 3000);

const server = app.listen(port, () => {
    console.log(`✓ Server running on http://localhost:${port}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
    console.log("SIGTERM received, closing server...");
    server.close(() => process.exit(0));
});

process.on("unhandledRejection", (reason) => {
    Sentry.captureException(reason);
    console.error("Unhandled rejection:", reason);
});
```

## errorHandler middleware

```typescript
// src/middlewares/errorHandler.ts
import { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import * as Sentry from "@sentry/node";
import {
    AppError,
    ValidationError,
    UnauthorizedError,
    ForbiddenError,
    NotFoundError,
} from "@/utils/errors";
import { httpCodes } from "@/configs/constants";
import { isProduction } from "@/configs/app";

interface ErrorResponse {
    code: string;
    message: string;
    details?: any;
    stack?: string; // dev only
}

export default function errorHandler(
    err: unknown,
    req: Request,
    res: Response,
    _next: NextFunction,
) {
    const t = (key: string, fallback?: string) =>
        req.t?.(key) ?? fallback ?? key;
    let status = httpCodes.serverError;
    let body: ErrorResponse = {
        code: "INTERNAL_ERROR",
        message: t("errors.internal_server"),
    };

    // === Custom AppError hierarchy ===
    if (err instanceof ValidationError) {
        status = httpCodes.badRequest;
        body = {
            code: "VALIDATION_ERROR",
            message: t(err.message, "Invalid input"),
            details: err.fields,
        };
    } else if (err instanceof UnauthorizedError) {
        status = httpCodes.unauthorized;
        body = { code: "UNAUTHORIZED", message: t(err.message) };
    } else if (err instanceof ForbiddenError) {
        status = httpCodes.forbidden;
        body = { code: "FORBIDDEN", message: t(err.message) };
    } else if (err instanceof NotFoundError) {
        status = httpCodes.notFound;
        body = { code: "NOT_FOUND", message: t(err.message) };
    } else if (err instanceof AppError) {
        status = err.statusCode;
        body = { code: err.code ?? "APP_ERROR", message: t(err.message) };
    }

    // === Prisma errors ===
    else if (err instanceof Prisma.PrismaClientKnownRequestError) {
        const result = mapPrismaError(err, t);
        status = result.status;
        body = result.body;
    } else if (err instanceof Prisma.PrismaClientValidationError) {
        status = httpCodes.badRequest;
        body = {
            code: "PRISMA_VALIDATION",
            message: t("errors.invalid_data"),
        };
        if (!isProduction()) body.details = err.message;
    }

    // === Zod fallthrough (if not caught by validate middleware) ===
    else if (err instanceof ZodError) {
        status = httpCodes.badRequest;
        body = {
            code: "VALIDATION_ERROR",
            message: t("errors.validation_failed"),
            details: err.flatten().fieldErrors,
        };
    }

    // === Unknown / generic Error ===
    else if (err instanceof Error) {
        Sentry.captureException(err, {
            tags: { path: req.path, method: req.method },
            user: req.auth?.user
                ? { id: req.auth.user.id, email: req.auth.user.email }
                : undefined,
        });

        if (!isProduction()) {
            body = {
                code: "INTERNAL_ERROR",
                message: err.message,
                stack: err.stack,
            };
        }
    }

    res.error(body, status);
}

function mapPrismaError(
    err: Prisma.PrismaClientKnownRequestError,
    t: (k: string) => string,
) {
    switch (err.code) {
        case "P2002":
            return {
                status: httpCodes.conflict,
                body: {
                    code: "DUPLICATE_ENTRY",
                    message: t("errors.duplicate_entry"),
                    details: { fields: err.meta?.target },
                },
            };
        case "P2025":
            return {
                status: httpCodes.notFound,
                body: { code: "NOT_FOUND", message: t("errors.not_found") },
            };
        case "P2003":
            return {
                status: httpCodes.badRequest,
                body: {
                    code: "FK_CONSTRAINT",
                    message: t("errors.fk_constraint"),
                },
            };
        case "P2014":
            return {
                status: httpCodes.badRequest,
                body: {
                    code: "INVALID_RELATION",
                    message: t("errors.invalid_relation"),
                },
            };
        default:
            return {
                status: httpCodes.serverError,
                body: {
                    code: "DB_ERROR",
                    message: t("errors.database_error"),
                },
            };
    }
}
```

## Service usage

```typescript
import { NotFoundError, ForbiddenError } from "@/utils/errors";

class ProductService {
    async getById(id: string, userId?: string) {
        const product = await prisma.product.findFirst({
            where: { id, deletedAt: null },
        });
        if (!product) throw new NotFoundError("product.not_found");

        if (product.isPrivate && product.ownerId !== userId) {
            throw new ForbiddenError("product.access_denied");
        }
        return product;
    }
}
```

## Add Sentry context

```typescript
// In authRequired middleware
Sentry.setUser({ id: user.id, email: user.email })
Sentry.addBreadcrumb({
    category: "auth",
    message: `User ${user.id} authenticated`,
    level: "info",
})
```

## Manual capture in services

```typescript
try {
    await externalApi.call();
} catch (err) {
    Sentry.captureException(err, {
        tags: { service: "external_api", action: "fetch_user" },
        extra: { userId, retryCount },
    });
    return fallbackValue;
}
```

## Rules

1. **NEVER** swallow errors silently — `Sentry.captureException()` if not throw
2. **NEVER** leak stack/details in production (`isProduction()` guard)
3. AppError instances → don't send to Sentry (expected errors)
4. Unknown errors → ALWAYS Sentry capture
5. Set `Sentry.setUser()` in authRequired for user context
6. `beforeSend` filter out noisy validation/auth errors
7. `tracesSampleRate: 0.1` in production (10% sampling)
