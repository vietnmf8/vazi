---
activation: always_on
description: API versioning + User/Admin split via middleware.
---

# API Versioning & User/Admin Split

## Folder structure

```
src/routes/
├── v1/
│   ├── user/                  # User-facing APIs (limited permissions)
│   │   ├── auth.route.ts
│   │   ├── post.route.ts
│   │   └── conversation.route.ts
│   └── admin/                 # Admin APIs (full CRUD)
│       ├── user.route.ts
│       ├── post.route.ts
│       └── stats.route.ts
├── v2/                        # Future version (parallel with v1)
│   └── user/
│       └── post.route.ts
└── index.ts                   # Auto-discovery mounting
```

## URL convention

```
/api/v1/posts                   # User endpoint (read + own data)
/api/v1/admin/posts             # Admin endpoint (full CRUD all users)
/api/v2/posts                   # New version (v1 still supported)
```

## Auto-discovery mounting (src/routes/index.ts)

```typescript
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { Router } from "express";

const router = Router();

function mountRoutes(dir: string, prefix: string) {
    const items = readdirSync(dir);
    for (const item of items) {
        const fullPath = join(dir, item);
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
            mountRoutes(fullPath, `${prefix}/${item}`);
        } else if (item.endsWith(".route.ts") || item.endsWith(".route.js")) {
            const routeName = item.replace(/\.route\.(ts|js)$/, "");
            const routeModule = require(fullPath).default;
            router.use(`${prefix}/${routeName}`, routeModule);
            console.log(`✓ Mounted: ${prefix}/${routeName}`);
        }
    }
}

mountRoutes(join(__dirname, "v1", "user"), "/v1");
mountRoutes(join(__dirname, "v1", "admin"), "/v1/admin");
mountRoutes(join(__dirname, "v2", "user"), "/v2");

export default router;
```

## Authorization middleware

```typescript
// src/middlewares/requireRole.ts
import { Request, Response, NextFunction } from "express";
import { ForbiddenError } from "@/utils/errors";

export const requireRole =
    (...roles: string[]) =>
    (req: Request, res: Response, next: NextFunction) => {
        const userRole = req.auth?.user?.role;
        if (!userRole || !roles.includes(userRole)) {
            throw new ForbiddenError("Bạn không có quyền truy cập");
        }
        next();
    };
```

## Admin route example

```typescript
// src/routes/v1/admin/post.route.ts
import { Router } from "express";
import authRequired from "@/middlewares/authRequired";
import { requireRole } from "@/middlewares/requireRole";
import postAdminController from "@/controllers/admin/post.controller";

const router = Router();

router.use(authRequired);
router.use(requireRole("admin", "superadmin")); // ← admin guard

router.get("/", postAdminController.getAll); // ALL posts
router.post("/", postAdminController.create); // Create for any user
router.delete("/:id", postAdminController.delete); // Delete ANY post

export default router;
```

## Rules

1. **NEVER** mix user và admin endpoints trong cùng route file
2. Admin controllers ở `src/controllers/admin/*.controller.ts` (folder riêng)
3. Admin services có thể tái sử dụng user services, nhưng KHÔNG ngược lại
4. v1 phải maintain backward compat tối thiểu 6 tháng sau khi v2 ra
5. Breaking change → version mới, không sửa v1
6. Deprecation warning trong response header cho v1 endpoints sẽ EOL
