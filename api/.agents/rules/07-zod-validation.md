---
activation: model_decision
description: Zod validation with type inference, shared FE/BE schemas, i18n error keys.
globs: src/**/*.ts
---

# Zod Validation Patterns

## Folder structure

```
src/validators/
├── auth.validator.ts          # login, register, forgotPassword
├── product.validator.ts
├── user.validator.ts
└── shared/
    ├── pagination.ts          # Reusable pagination schema
    ├── id.ts                  # CUID/UUID validators
    └── locale.ts              # Locale enum
```

## Validator file template

```typescript
// src/validators/auth.validator.ts
import { z } from "zod";

export const loginSchema = z
    .object({
        email: z
            .string({ required_error: "validation.email.required" })
            .email({ message: "validation.email.invalid" })
            .toLowerCase()
            .trim(),
        password: z
            .string({ required_error: "validation.password.required" })
            .min(8, { message: "validation.password.too_short" }),
    })
    .strict();

export const registerSchema = z
    .object({
        name: z
            .string({ required_error: "validation.name.required" })
            .min(2, { message: "validation.name.too_short" })
            .max(50, { message: "validation.name.too_long" })
            .trim(),
        email: loginSchema.shape.email, // reuse
        password: z
            .string()
            .min(8, { message: "validation.password.too_short" })
            .regex(/[A-Z]/, { message: "validation.password.need_uppercase" })
            .regex(/[0-9]/, { message: "validation.password.need_digit" }),
        confirmPassword: z.string(),
    })
    .strict()
    .refine((data) => data.password === data.confirmPassword, {
        message: "validation.password.confirm_mismatch",
        path: ["confirmPassword"],
    });

// Auto-inferred DTOs — zero duplication
export type LoginDto = z.infer<typeof loginSchema>;
export type RegisterDto = z.infer<typeof registerSchema>;
```

## Validate middleware

```typescript
// src/middlewares/validate.ts
import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";
import { ValidationError } from "@/utils/errors";

type ValidateTarget = "body" | "query" | "params";

/**
 * Generic Zod validation middleware.
 * Parses + validates + assigns back to req (with coerced types).
 * Throws ValidationError → errorHandler maps to 400 with i18n.
 */
export default function validate<T extends ZodSchema>(
    schema: T,
    target: ValidateTarget = "body",
) {
    return (req: Request, _res: Response, next: NextFunction) => {
        try {
            const data = schema.parse(req[target]);
            // @ts-expect-error — reassign with coerced types
            req[target] = data;
            next();
        } catch (err) {
            if (err instanceof ZodError) {
                const fieldErrors: Record<string, string[]> = {};
                for (const issue of err.issues) {
                    const path = issue.path.join(".");
                    if (!fieldErrors[path]) fieldErrors[path] = [];
                    fieldErrors[path].push(issue.message);
                }
                throw new ValidationError(
                    "errors.validation_failed",
                    fieldErrors,
                );
            }
            next(err);
        }
    };
}
```

## Apply in route (NOT in controller)

```typescript
// src/routes/v1/user/auth.route.ts
import { Router } from "express";
import validate from "@/middlewares/validate";
import { loginSchema, registerSchema } from "@/validators/auth.validator";
import authController from "@/controllers/auth.controller";
import { asyncHandler } from "@/utils/controller-helpers";

const router = Router();

router.post(
    "/login",
    validate(loginSchema),
    asyncHandler(authController.login),
);
router.post(
    "/register",
    validate(registerSchema),
    asyncHandler(authController.register),
);

export default router;
```

## Shared schemas

```typescript
// src/validators/shared/pagination.ts
import { z } from "zod";

export const paginationSchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    sort: z.string().optional(), // "-createdAt"
});

// src/validators/shared/id.ts
export const cuidSchema = z.string().regex(/^c[a-z0-9]{24}$/, {
    message: "validation.id.invalid",
});

export const idParamSchema = z.object({
    id: cuidSchema,
});
```

## Controller usage (typed DTO)

```typescript
// src/controllers/auth.controller.ts
import { Request, Response } from "express";
import authService from "@/services/auth.service";
import type { LoginDto, RegisterDto } from "@/validators/auth.validator";

export const login = async (req: Request<{}, {}, LoginDto>, res: Response) => {
    //                                  ↑ typed body
    const result = await authService.login(req.body.email, req.body.password);
    res.success(result);
};

export const register = async (
    req: Request<{}, {}, RegisterDto>,
    res: Response,
) => {
    const user = await authService.register(req.body);
    res.success(user, 201);
};
```

## Why Zod over alternatives

1. **Type inference**: `z.infer<typeof schema>` = DTO type, zero duplication
2. **Composition**: `.extend()`, `.pick()`, `.omit()`, `.partial()`, `.merge()`
3. **Refinements**: `.refine()`, `.transform()`, `.superRefine()` for cross-field
4. **Coercion**: `z.coerce.number()` auto-cast string → number from query
5. **Share FE/BE**: Same schema validates client + server (monorepo workspace package)

## Rules

1. **NEVER** validate inside controller/service — only in middleware
2. **ALWAYS** use `.strict()` to reject extra fields (security)
3. Error messages = **i18n keys**, not hardcoded text (rule 13 + 19)
4. Export `type X = z.infer<typeof xSchema>` cho mỗi schema (DTO type)
5. Reuse via `schema1.shape.field` or `.extend()`
6. Coerce query params with `z.coerce.*`
7. Strip vs error on extra fields → `.strict()` errors, `.passthrough()` keeps, default strips

## Anti-patterns

```typescript
// ❌ Hardcoded message
z.string().email("Email không hợp lệ")

// ✅ i18n key
z.string().email({ message: "validation.email.invalid" })

// ❌ Manual DTO type
interface LoginDto { email: string; password: string }

// ✅ Inferred
type LoginDto = z.infer<typeof loginSchema>

// ❌ Lax (security risk)
z.object({...})

// ✅ Strict (reject extra)
z.object({...}).strict()
```
