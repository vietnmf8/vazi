# Skill: Add Route / Controller / Service

**Trigger:** "thêm route", "tạo endpoint", "add API", "create controller", "thêm service"

## Khi nào dùng

Khi cần thêm 1 endpoint riêng lẻ (không phải full CRUD — full CRUD dùng `mvcs-feature-scaffold`).

## Quick decision tree

```
"Endpoint mới có thuộc resource đã có?"
├── Có → Thêm vào existing route/controller/service file
└── Chưa → Tạo 3 file mới (route + controller + service)
```

## Workflow: Add endpoint to existing resource

Ví dụ: Resource `Product` đã có. Thêm endpoint `POST /products/:id/duplicate`.

### Bước 1: Thêm vào service

```typescript
// src/services/product.service.ts
class ProductService {
    // ... existing methods ...

    async duplicate(id: string, userId: string) {
        const original = await this.getById(id);
        return prisma.product.create({
            data: {
                name: `${original.name} (copy)`,
                price: original.price,
                description: original.description,
                createdById: userId,
            },
        });
    }
}
```

### Bước 2: Thêm validator (nếu cần)

```typescript
// src/validators/product.validator.ts
export const duplicateProductSchema = z.object({
    id: cuidSchema,
});
```

### Bước 3: Thêm vào controller

```typescript
// src/controllers/product.controller.ts
export const duplicate = async (req: Request, res: Response) => {
    const user = requireAuth(req);
    const product = await productService.duplicate(req.params.id, user.id);
    res.success(productTransformer.transform(product), httpCodes.created, {
        message: req.t("product.duplicate_success"),
    });
};

export default { ...existing, duplicate };
```

### Bước 4: Thêm vào route

```typescript
// src/routes/v1/user/product.route.ts
router.post(
    "/:id/duplicate",
    authRequired,
    validate(duplicateProductSchema, "params"),
    asyncHandler(productController.duplicate),
);
```

### Bước 5: Thêm i18n keys

```json
// src/locales/vi/product.json
{ "duplicate_success": "Đã sao chép sản phẩm" }

// src/locales/en/product.json
{ "duplicate_success": "Product duplicated" }
```

### Bước 6: Test

```bash
# Manual curl test (không lưu file)
curl -X POST http://localhost:3000/api/v1/products/c123/duplicate \
    -H "Authorization: Bearer $TOKEN" \
    -H "Accept-Language: vi"
```

---

## Workflow: Tạo resource mới (từ scratch)

Dùng skill `mvcs-feature-scaffold` (đã có sẵn) — 8 file đầy đủ.

---

## Templates

### Service singleton (TypeScript)

```typescript
// src/services/<resource>.service.ts
import { prisma } from "@/configs/db"
import { NotFoundError, ForbiddenError } from "@/utils/errors"
import type { Prisma } from "@prisma/client"

class <Resource>Service {
    async getById(id: string) {
        const item = await prisma.<resource>.findFirst({
            where: { id, deletedAt: null },
        })
        if (!item) throw new NotFoundError("<resource>.not_found")
        return item
    }

    async getAll(page = 1, limit = 20, sort?: any) {
        const skip = (page - 1) * limit
        const [rows, total] = await Promise.all([
            prisma.<resource>.findMany({
                where: { deletedAt: null },
                skip, take: limit,
                orderBy: sort ?? { createdAt: "desc" },
            }),
            prisma.<resource>.count({ where: { deletedAt: null } }),
        ])
        return {
            rows,
            pagination: {
                current_page: page,
                per_page: limit,
                total,
                from: skip + 1,
                to: skip + rows.length,
                has_more: skip + rows.length < total,
            },
        }
    }

    async create(data: Prisma.<Resource>CreateInput) {
        return prisma.<resource>.create({ data })
    }

    async update(id: string, data: Prisma.<Resource>UpdateInput) {
        await this.getById(id)
        return prisma.<resource>.update({ where: { id }, data })
    }

    async softDelete(id: string) {
        await this.getById(id)
        return prisma.<resource>.update({
            where: { id },
            data: { deletedAt: new Date() },
        })
    }
}

export default new <Resource>Service()
```

### Function controller (TypeScript)

```typescript
// src/controllers/<resource>.controller.ts
import { Request, Response } from "express"
import <resource>Service from "@/services/<resource>.service"
import <resource>Transformer from "@/transformers/<resource>.transformer"
import { httpCodes } from "@/configs/constants"
import { parsePagination, requireAuth } from "@/utils/controller-helpers"

export const getAll = async (req: Request, res: Response) => {
    const { page, limit } = parsePagination(req)
    const result = await <resource>Service.getAll(page, limit)
    res.paginate({
        rows: <resource>Transformer.transformMany(result.rows),
        pagination: result.pagination,
    })
}

export const getById = async (req: Request, res: Response) => {
    const item = await <resource>Service.getById(req.params.id)
    res.success(<resource>Transformer.transform(item))
}

export const create = async (req: Request, res: Response) => {
    const user = requireAuth(req)
    const item = await <resource>Service.create({ ...req.body, createdBy: { connect: { id: user.id } } })
    res.success(
        <resource>Transformer.transform(item),
        httpCodes.created,
        { message: req.t("common.success.created") },
    )
}

export default { getAll, getById, create }
```

### Route file (TypeScript)

```typescript
// src/routes/v1/user/<resource>.route.ts
import { Router } from "express"
import authRequired from "@/middlewares/authRequired"
import validate from "@/middlewares/validate"
import <resource>Controller from "@/controllers/<resource>.controller"
import {
    create<Resource>Schema,
    listSchema,
    idParamSchema,
} from "@/validators/<resource>.validator"
import { asyncHandler } from "@/utils/controller-helpers"

const router = Router()

router.get("/", validate(listSchema, "query"), asyncHandler(<resource>Controller.getAll))
router.get("/:id", validate(idParamSchema, "params"), asyncHandler(<resource>Controller.getById))
router.post(
    "/",
    authRequired,
    validate(create<Resource>Schema),
    asyncHandler(<resource>Controller.create),
)

export default router
```

## Checklist

- [ ] Service: business logic + throw AppError (KHÔNG try/catch)
- [ ] Controller: thin (parse → service → transform → respond)
- [ ] Validator: Zod schema, message = i18n key
- [ ] Route: validate middleware + authRequired (nếu cần) + asyncHandler wrap
- [ ] i18n keys: thêm vi + en đồng thời
- [ ] Transformer: tách raw DB từ DTO
- [ ] Test endpoint với curl (KHÔNG tạo test file)
- [ ] User route ≠ admin route (2 file riêng)
- [ ] Endpoint hoạt động với cả `Accept-Language: vi` và `en`
