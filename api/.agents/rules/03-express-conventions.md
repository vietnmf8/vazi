---
activation: model_decision
description: Express.js routing, middleware, error handling — Hybrid controller pattern.
globs: ["src/routes/**/*.ts", "src/controllers/**/*.ts", "src/middlewares/**/*.ts"]
---

# Express Conventions (Hybrid Pattern)

## Controller pattern

**Function-based + asyncHandler wrapper + reusable helpers.**

### Helper utilities (src/utils/controller-helpers.ts)

```typescript
import { Request, Response, NextFunction, RequestHandler } from "express";
import { UnauthorizedError } from "@/utils/errors";

/** Auto-catch async errors → next(err) → errorHandler middleware */
export const asyncHandler =
    <T extends RequestHandler>(fn: T): RequestHandler =>
    (req, res, next) =>
        Promise.resolve(fn(req, res, next)).catch(next);

/** Parse pagination from query, with safe limits */
export const parsePagination = (req: Request) => {
    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 20)));
    return { page, limit, skip: (page - 1) * limit };
};

/** Get authenticated user, throw if missing */
export const requireAuth = (req: Request) => {
    if (!req.auth?.user) throw new UnauthorizedError("errors.unauthorized");
    return req.auth.user;
};

/** Get locale from request (set by i18nextMiddleware) */
export const getLocale = (req: Request): string => req.language ?? "vi";

/** Parse sort param: ?sort=-createdAt → { createdAt: "desc" } */
export const parseSort = (sort: string | undefined, allowed: string[]) => {
    if (!sort) return undefined;
    const desc = sort.startsWith("-");
    const field = desc ? sort.slice(1) : sort;
    if (!allowed.includes(field)) return undefined;
    return { [field]: desc ? "desc" : "asc" } as const;
};
```

### Controller template (Hybrid)

```typescript
// src/controllers/product.controller.ts
import { Request, Response } from "express";
import productService from "@/services/product.service";
import productTransformer from "@/transformers/product.transformer";
import { httpCodes } from "@/configs/constants";
import {
    parsePagination,
    requireAuth,
    parseSort,
} from "@/utils/controller-helpers";

export const getAll = async (req: Request, res: Response) => {
    const { page, limit } = parsePagination(req);
    const sort = parseSort(req.query.sort as string, [
        "createdAt",
        "price",
        "name",
    ]);
    const result = await productService.getAll(page, limit, sort);
    res.paginate({
        rows: productTransformer.transformMany(result.rows),
        pagination: result.pagination,
    });
};

export const getById = async (req: Request, res: Response) => {
    const product = await productService.getById(req.params.id);
    res.success(productTransformer.transform(product));
};

export const create = async (req: Request, res: Response) => {
    const user = requireAuth(req);
    const product = await productService.create(req.body, user.id);
    res.success(productTransformer.transform(product), httpCodes.created);
};

export default { getAll, getById, create };
```

### Route mount (with asyncHandler)

```typescript
// src/routes/v1/user/product.route.ts
import { Router } from "express";
import authRequired from "@/middlewares/authRequired";
import validate from "@/middlewares/validate";
import productController from "@/controllers/product.controller";
import {
    createProductSchema,
    listProductSchema,
} from "@/validators/product.validator";
import { asyncHandler } from "@/utils/controller-helpers";

const router = Router();

router.get(
    "/",
    validate(listProductSchema, "query"),
    asyncHandler(productController.getAll),
);
router.get("/:id", asyncHandler(productController.getById));
router.post(
    "/",
    authRequired,
    validate(createProductSchema, "body"),
    asyncHandler(productController.create),
);

export default router;
```

## Middleware ordering (CRITICAL — Express 4)

```typescript
// src/app.ts
import "dotenv/config";
import express from "express";
import cors from "cors";
import * as Sentry from "@sentry/node";
import i18nextMiddleware from "i18next-http-middleware";
import i18next from "@/configs/i18n";
import responseMiddleware from "@/middlewares/response";
import errorHandler from "@/middlewares/errorHandler";
import notFoundHandler from "@/middlewares/notFoundHandler";
import routes from "@/routes";

const app = express();

// === ORDER MATTERS ===
app.use(Sentry.Handlers.requestHandler()); // 1. Sentry (must be first)
app.use(cors({ origin: process.env.APP_CORS_ORIGIN?.split(",") })); // 2. CORS
app.use(express.json({ limit: "1mb" })); // 3. Body parser
app.use(i18nextMiddleware.handle(i18next)); // 4. i18next (sets req.t, req.language)
app.use(responseMiddleware); // 5. res.success/error/paginate
app.use("/api", routes); // 6. Routes
app.use(notFoundHandler); // 7. 404
app.use(Sentry.Handlers.errorHandler()); // 8. Sentry error capture
app.use(errorHandler); // 9. Final error handler

export default app;
```

## Rules

1. **NEVER** business logic in routes — delegate to controller
2. **NEVER** validation in controllers — validate middleware (rule 07)
3. **NEVER** `res.json()` / `res.send()` direct — use `res.success/error/paginate` (rule 13)
4. Controller = thin: parse → call service → transform → respond
5. Wrap async route handlers với `asyncHandler` (auto-catch errors)
6. Helpers in `src/utils/controller-helpers.ts` for reusable patterns
7. Mount middleware theo đúng order trên
