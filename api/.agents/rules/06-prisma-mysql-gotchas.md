---
activation: model_decision
description: MySQL-specific gotchas when using Prisma. Critical for avoiding drift, index issues, and FK problems.
globs: ["prisma/*.prisma", "src/**/*.ts"]
---

# Prisma + MySQL Gotchas

## ⚠️ MySQL-specific traps (different from PostgreSQL!)

### 1. MySQL auto-indexes foreign keys (Postgres does NOT)

```prisma
model Post {
    id       Int  @id @default(autoincrement())
    authorId Int
    author   User @relation(fields: [authorId], references: [id])

    // @@index([authorId])  ← KHÔNG cần với MySQL (auto-tạo)
    // @@index([authorId])  ← CẦN với PostgreSQL
}
```

**BUT:** This auto-index can be silently dropped if a redundant index is added later → migrate dev báo drift. Detect bằng `prisma migrate diff`.

### 2. MySQL does NOT support `SetDefault` referential action

```prisma
// ❌ SAI với MySQL 8+: SetDefault hoạt động như NoAction → runtime error
author User @relation(fields: [authorId], references: [id], onDelete: SetDefault)

// ✅ ĐÚNG với MySQL
author User @relation(fields: [authorId], references: [id], onDelete: Restrict)
// hoặc: SetNull (cần authorId nullable), Cascade, NoAction
```

### 3. MySQL InnoDB engine REQUIRED

Trong `schema.prisma`:

```prisma
datasource db {
    provider = "mysql"
    url      = env("DATABASE_URL")
}
```

Đảm bảo MySQL version ≥ 8.0 hoặc 5.7 với InnoDB default. Older MyISAM **không support foreign keys** → relations bị mất.

### 4. MySQL default charset gotcha

Migration nên thêm `CHARACTER SET utf8mb4` để hỗ trợ emoji/4-byte unicode:

```sql
-- Trong migration.sql
CREATE TABLE `User` (...) ENGINE = InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 5. MySQL VARCHAR(191) limit (legacy)

MySQL 5.7 cũ có limit 767 bytes cho index → string indexed phải ≤ 191 chars (utf8mb4 = 4 bytes/char). MySQL 8.0+ là 3072 bytes (768 chars) → có thể dùng `@db.VarChar(255)` thoải mái nhưng:

```prisma
// ✅ AN TOÀN cho mọi MySQL version
email String @unique @db.VarChar(191)

// ⚠️ Chỉ MySQL 8+
title String @unique @db.VarChar(500)
```

## Prisma client traps (mọi DB)

### 6. `updateMany` returns COUNT, not records

```typescript
// ❌ SAI — result.id không tồn tại
const result = await prisma.user.updateMany({ where: {...}, data: {...} })
console.log(result.id)  // undefined

// ✅ ĐÚNG
const { count } = await prisma.user.updateMany({...})
// Need records back? → use findMany after, or loop with update()
```

### 7. `@updatedAt` is SKIPPED on bulk operations

```typescript
// ❌ updatedAt KHÔNG được set tự động
await prisma.user.updateMany({ where: {...}, data: { name: "x" } })

// ✅ Manual set
await prisma.user.updateMany({
    where: {...},
    data: { name: "x", updatedAt: new Date() },
})
```

### 8. `prisma migrate dev` RESETS the database on drift

**TUYỆT ĐỐI KHÔNG chạy `prisma migrate dev` trên production.**  
Production dùng: `prisma migrate deploy` (chỉ apply, không reset).

### 9. `$transaction` default timeout = 5 seconds

```typescript
// ⚠️ Long-running transaction sẽ timeout
await prisma.$transaction(
    async (tx) => {
        await heavyOperation(tx);
    },
    { maxWait: 10000, timeout: 30000 }, // tăng timeout
);
```

### 10. Serverless connection exhaustion

Nếu deploy lên Vercel/Lambda với MySQL: dùng **connection pooling** (PlanetScale auto, hoặc Prisma Accelerate). KHÔNG instantiate `new PrismaClient()` mỗi request.

```typescript
// lib/prisma.ts — SINGLETON
import { PrismaClient } from "@prisma/client";
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

## Checklist mỗi khi viết schema MySQL

- [ ] Provider đúng `mysql` (không phải `postgresql`)
- [ ] `id` dùng `cuid()` hoặc `autoincrement()` (KHÔNG `uuid()` cho large tables — fragment B-tree)
- [ ] Mọi FK đã có `onDelete` action (không phải SetDefault)
- [ ] String index dùng `@db.VarChar(191)` nếu lo MySQL 5.x compat
- [ ] `@db.Text` cho content > 191 chars
- [ ] `@db.Decimal(10, 2)` cho money (KHÔNG `Float` — precision loss)
- [ ] Composite indexes cho query patterns (`@@index([col1, col2])`)
