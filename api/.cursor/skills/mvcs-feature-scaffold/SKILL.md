# Skill: Scaffold Full MVCS Feature

**Trigger:** "tạo feature backend", "scaffold api", "thêm resource", "create CRUD"

## Khi nào dùng

Khi cần thêm 1 resource mới với full CRUD (cả user + admin endpoints).

## Output: Tạo 8 file theo MVCS pattern

```
prisma/schema.prisma                                    # +1 model
src/validators/<resource>.validator.ts                  # +1 file
src/services/<resource>.service.ts                      # +1 file
src/controllers/<resource>.controller.ts                # +1 file (user)
src/controllers/admin/<resource>.controller.ts          # +1 file (admin)
src/routes/v1/user/<resource>.route.ts                  # +1 file (user)
src/routes/v1/admin/<resource>.route.ts                 # +1 file (admin)
src/transformers/<resource>.transformer.ts              # +1 file
```

## Ví dụ — Resource `Product`

### 1. Schema (prisma/schema.prisma)

```prisma
model Product {
    id          String   @id @default(cuid())
    name        String   @db.VarChar(255)
    description String?  @db.Text
    price       Decimal  @db.Decimal(10, 2)
    stock       Int      @default(0)
    isActive    Boolean  @default(true) @map("is_active")
    createdById String   @map("created_by_id")
    createdBy   User     @relation(fields: [createdById], references: [id])
    createdAt   DateTime @default(now()) @map("created_at")
    updatedAt   DateTime @updatedAt @map("updated_at")
    deletedAt   DateTime? @map("deleted_at")

    @@map("products")
    @@index([isActive, deletedAt])
}
```

```bash
npx prisma migrate dev --name add_product_model
```

### 2. Validator (src/validators/product.validator.ts)

```typescript
import { body, param, query } from "express-validator";

export const createProductValidator = [
    body("name")
        .trim()
        .notEmpty()
        .withMessage("Tên sản phẩm không được để trống")
        .isLength({ max: 255 })
        .withMessage("Tên không quá 255 ký tự"),
    body("price").isFloat({ min: 0 }).withMessage("Giá phải là số dương"),
    body("stock")
        .optional()
        .isInt({ min: 0 })
        .withMessage("Số lượng phải là số nguyên không âm"),
];

export const idValidator = [
    param("id").isString().notEmpty().withMessage("ID không hợp lệ"),
];

export const listValidator = [
    query("page").optional().isInt({ min: 1 }).toInt(),
    query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
];
```

### 3. Service (src/services/product.service.ts)

```typescript
import { prisma } from "@/configs/db";
import { NotFoundError, ForbiddenError } from "@/utils/errors";

class ProductService {
    async getAll(page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const [rows, total] = await Promise.all([
            prisma.product.findMany({
                where: { isActive: true, deletedAt: null },
                skip,
                take: limit,
                orderBy: { createdAt: "desc" },
            }),
            prisma.product.count({
                where: { isActive: true, deletedAt: null },
            }),
        ]);
        return {
            rows,
            pagination: {
                current_page: page,
                per_page: limit,
                total,
                from: skip + 1,
                to: skip + rows.length,
            },
        };
    }

    async getById(id: string) {
        const product = await prisma.product.findFirst({
            where: { id, deletedAt: null },
        });
        if (!product) throw new NotFoundError("Không tìm thấy sản phẩm");
        return product;
    }

    async create(
        data: { name: string; price: number; stock?: number },
        userId: string,
    ) {
        return prisma.product.create({
            data: { ...data, createdById: userId },
        });
    }

    async update(
        id: string,
        data: Partial<{ name: string; price: number; stock: number }>,
    ) {
        await this.getById(id); // Throws NotFoundError if not exists
        return prisma.product.update({ where: { id }, data });
    }

    async softDelete(id: string) {
        await this.getById(id);
        return prisma.product.update({
            where: { id },
            data: { deletedAt: new Date(), isActive: false },
        });
    }

    // Admin-only
    async hardDelete(id: string) {
        return prisma.product.delete({ where: { id } });
    }

    async getAllForAdmin(page = 1, limit = 20) {
        // Admin thấy cả deleted
        const skip = (page - 1) * limit;
        const [rows, total] = await Promise.all([
            prisma.product.findMany({
                skip,
                take: limit,
                orderBy: { createdAt: "desc" },
            }),
            prisma.product.count(),
        ]);
        return {
            rows,
            pagination: {
                current_page: page,
                per_page: limit,
                total,
                from: skip + 1,
                to: skip + rows.length,
            },
        };
    }
}

export default new ProductService();
```

### 4. Transformer (src/transformers/product.transformer.ts)

```typescript
class ProductTransformer {
    transform(item: any) {
        return {
            id: item.id,
            name: item.name,
            description: item.description,
            price: Number(item.price), // Decimal → number
            stock: item.stock,
            created_at: item.createdAt,
        };
    }

    transformMany(items: any[]) {
        return items.map((item) => this.transform(item));
    }

    // Admin: include thêm fields
    transformForAdmin(item: any) {
        return {
            ...this.transform(item),
            is_active: item.isActive,
            created_by_id: item.createdById,
            updated_at: item.updatedAt,
            deleted_at: item.deletedAt,
        };
    }
}

export default new ProductTransformer();
```

### 5. User Controller (src/controllers/product.controller.ts)

```typescript
import { Request, Response } from "express";
import productService from "@/services/product.service";
import productTransformer from "@/transformers/product.transformer";
import { httpCodes } from "@/configs/constants";

export const getAll = async (req: Request, res: Response) => {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);
    const result = await productService.getAll(page, limit);
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
    const userId = req.auth!.user.id;
    const product = await productService.create(req.body, userId);
    res.success(productTransformer.transform(product), httpCodes.created);
};

export default { getAll, getById, create };
```

### 6. Admin Controller (src/controllers/admin/product.controller.ts)

```typescript
import { Request, Response } from "express";
import productService from "@/services/product.service";
import productTransformer from "@/transformers/product.transformer";
import { httpCodes } from "@/configs/constants";

export const getAll = async (req: Request, res: Response) => {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);
    const result = await productService.getAllForAdmin(page, limit);
    res.paginate({
        rows: result.rows.map((p) => productTransformer.transformForAdmin(p)),
        pagination: result.pagination,
    });
};

export const update = async (req: Request, res: Response) => {
    const product = await productService.update(req.params.id, req.body);
    res.success(productTransformer.transformForAdmin(product));
};

export const hardDelete = async (req: Request, res: Response) => {
    await productService.hardDelete(req.params.id);
    res.success({ message: "Đã xoá vĩnh viễn sản phẩm" });
};

export default { getAll, update, hardDelete };
```

### 7. User Route (src/routes/v1/user/product.route.ts)

```typescript
import { Router } from "express";
import authRequired from "@/middlewares/authRequired";
import { validate } from "@/middlewares/validate";
import productController from "@/controllers/product.controller";
import {
    createProductValidator,
    idValidator,
    listValidator,
} from "@/validators/product.validator";

const router = Router();

router.get("/", validate(listValidator), productController.getAll);
router.get("/:id", validate(idValidator), productController.getById);
router.post(
    "/",
    authRequired,
    validate(createProductValidator),
    productController.create,
);

export default router;
```

### 8. Admin Route (src/routes/v1/admin/product.route.ts)

```typescript
import { Router } from "express";
import authRequired from "@/middlewares/authRequired";
import { requireRole } from "@/middlewares/requireRole";
import { validate } from "@/middlewares/validate";
import productController from "@/controllers/admin/product.controller";
import { idValidator, listValidator } from "@/validators/product.validator";

const router = Router();

router.use(authRequired);
router.use(requireRole("admin", "superadmin"));

router.get("/", validate(listValidator), productController.getAll);
router.put("/:id", validate(idValidator), productController.update);
router.delete("/:id", validate(idValidator), productController.hardDelete);

export default router;
```

## Endpoints generated

```
GET    /api/v1/products              (public list)
GET    /api/v1/products/:id          (public detail)
POST   /api/v1/products              (auth required)

GET    /api/v1/admin/products        (admin only - see all incl. deleted)
PUT    /api/v1/admin/products/:id    (admin only)
DELETE /api/v1/admin/products/:id    (admin only - hard delete)
```

## Checklist

- [ ] Prisma model với `@@map` snake_case plural
- [ ] Migration đã chạy
- [ ] Validator file với message tiếng Việt
- [ ] Service: business logic, throw custom error
- [ ] Transformer: hide internal fields
- [ ] User controller: thin layer
- [ ] Admin controller: separate folder, transformForAdmin
- [ ] User route: validate middleware applied
- [ ] Admin route: `requireRole` guard
- [ ] Endpoints test với curl/Postman: user vs admin permissions
