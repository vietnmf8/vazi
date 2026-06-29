---
activation: model_decision
description: Testing strategy — unit + integration + e2e with Vitest, real test DB.
globs: ["src/**/*.test.ts", "tests/**/*.ts"]
---

# Testing Strategy

## Test pyramid for backend

```
        /\
       /e2e\        ← 5% — Critical user flows (auth + checkout)
      /------\
     / inte-  \     ← 25% — Service + DB integration (real test MySQL)
    / gration  \
   /------------\
  /    unit      \  ← 70% — Services with mocked deps, pure utils
 /----------------\
```

## Stack

```json
{
    "devDependencies": {
        "vitest": "^2.1.0",
        "@vitest/coverage-v8": "^2.1.0",
        "supertest": "^7.0.0",
        "@types/supertest": "^6.0.0"
    }
}
```

## vitest.config.ts

```typescript
import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
    test: {
        globals: true,
        environment: "node",
        setupFiles: ["./tests/setup.ts"],
        coverage: {
            provider: "v8",
            reporter: ["text", "html", "lcov"],
            exclude: ["node_modules", "dist", "tests/", "**/*.config.ts"],
            thresholds: {
                lines: 70,
                functions: 70,
                branches: 65,
                statements: 70,
            },
        },
        // Use separate test database
        env: {
            DATABASE_URL: process.env.DATABASE_URL_TEST,
            APP_ENV: "test",
        },
        // Run integration tests sequentially (avoid DB conflicts)
        pool: "forks",
        poolOptions: {
            forks: { singleFork: true },
        },
    },
    resolve: {
        alias: {
            "@": resolve(__dirname, "./src"),
        },
    },
});
```

## Test setup (tests/setup.ts)

```typescript
import { beforeAll, afterAll, beforeEach } from "vitest";
import { execSync } from "child_process";
import { prisma } from "@/configs/db";

beforeAll(async () => {
    // Reset & migrate test DB
    execSync("npx prisma migrate reset --force --skip-seed", {
        stdio: "inherit",
        env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL_TEST },
    });
});

beforeEach(async () => {
    // Truncate all tables before each test (faster than reset)
    const tables = [
        "queue_jobs",
        "refresh_tokens",
        "posts",
        "products",
        "users",
    ];
    await prisma.$executeRawUnsafe(`SET FOREIGN_KEY_CHECKS = 0`);
    for (const table of tables) {
        await prisma.$executeRawUnsafe(`TRUNCATE TABLE \`${table}\``);
    }
    await prisma.$executeRawUnsafe(`SET FOREIGN_KEY_CHECKS = 1`);
});

afterAll(async () => {
    await prisma.$disconnect();
});
```

## Unit test (service with mocked deps)

```typescript
// src/services/auth.service.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import authService from "@/services/auth.service";
import { prisma } from "@/configs/db";
import bcrypt from "bcrypt";

vi.mock("@/configs/db", () => ({
    prisma: {
        user: {
            findUnique: vi.fn(),
            create: vi.fn(),
        },
    },
}));

vi.mock("bcrypt");

describe("AuthService.login", () => {
    beforeEach(() => vi.clearAllMocks());

    it("returns tokens on valid credentials", async () => {
        // Arrange
        vi.mocked(prisma.user.findUnique).mockResolvedValue({
            id: "cuid1",
            email: "a@b.c",
            passwordHash: "hashed",
        } as any);
        vi.mocked(bcrypt.compare).mockResolvedValue(true as any);

        // Act
        const result = await authService.login("a@b.c", "password123");

        // Assert
        expect(result).toHaveProperty("accessToken");
        expect(result).toHaveProperty("refreshToken");
        expect(prisma.user.findUnique).toHaveBeenCalledWith({
            where: { email: "a@b.c" },
        });
    });

    it("throws AuthError when password is wrong", async () => {
        vi.mocked(prisma.user.findUnique).mockResolvedValue({
            id: "cuid1",
            email: "a@b.c",
            passwordHash: "hashed",
        } as any);
        vi.mocked(bcrypt.compare).mockResolvedValue(false as any);

        await expect(authService.login("a@b.c", "wrong")).rejects.toThrow(
            "auth.invalid_credentials",
        );
    });

    it("throws when user not found", async () => {
        vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
        await expect(authService.login("ghost@x.c", "any")).rejects.toThrow(
            "auth.invalid_credentials",
        );
    });
});
```

## Integration test (real test DB)

```typescript
// src/services/product.service.integration.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import productService from "@/services/product.service";
import { prisma } from "@/configs/db";

describe("ProductService (integration)", () => {
    let userId: string;

    beforeEach(async () => {
        const user = await prisma.user.create({
            data: {
                email: "test@x.c",
                name: "Tester",
                passwordHash: "h",
            },
        });
        userId = user.id;
    });

    it("creates and retrieves a product", async () => {
        const created = await productService.create(
            { name: "Widget", price: 99.99 },
            userId,
        );
        expect(created.id).toBeDefined();

        const fetched = await productService.getById(created.id);
        expect(fetched.name).toBe("Widget");
        expect(Number(fetched.price)).toBe(99.99);
    });

    it("throws NotFoundError for non-existent product", async () => {
        await expect(productService.getById("nonexistent-id")).rejects.toThrow(
            "product.not_found",
        );
    });

    it("paginates correctly with skip/take", async () => {
        // Seed 25 products
        for (let i = 0; i < 25; i++) {
            await productService.create({ name: `P${i}`, price: i }, userId);
        }

        const page1 = await productService.getAll(1, 10);
        expect(page1.rows).toHaveLength(10);
        expect(page1.pagination.total).toBe(25);

        const page3 = await productService.getAll(3, 10);
        expect(page3.rows).toHaveLength(5);
    });
});
```

## E2E test (full HTTP stack)

```typescript
// tests/e2e/auth.e2e.test.ts
import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "@/app";

describe("Auth flow (e2e)", () => {
    it("registers, logs in, accesses protected route", async () => {
        // 1. Register
        const registerRes = await request(app)
            .post("/api/v1/auth/register")
            .send({
                name: "Alice",
                email: "alice@test.com",
                password: "StrongPass1",
                confirmPassword: "StrongPass1",
            });
        expect(registerRes.status).toBe(201);
        expect(registerRes.body.success).toBe(true);

        // 2. Login
        const loginRes = await request(app)
            .post("/api/v1/auth/login")
            .send({ email: "alice@test.com", password: "StrongPass1" });
        expect(loginRes.status).toBe(200);
        const { accessToken } = loginRes.body.data;
        expect(accessToken).toBeTruthy();

        // 3. Access protected route
        const meRes = await request(app)
            .get("/api/v1/me")
            .set("Authorization", `Bearer ${accessToken}`);
        expect(meRes.status).toBe(200);
        expect(meRes.body.data.email).toBe("alice@test.com");
    });

    it("returns Vietnamese error for invalid login", async () => {
        await request(app).post("/api/v1/auth/register").send({
            name: "B",
            email: "b@t.c",
            password: "Pass1234",
            confirmPassword: "Pass1234",
        });

        const res = await request(app)
            .post("/api/v1/auth/login")
            .set("Accept-Language", "vi")
            .send({ email: "b@t.c", password: "wrong" });

        expect(res.status).toBe(401);
        expect(res.body.error.message).toContain("Email hoặc mật khẩu");
    });

    it("returns English error when Accept-Language: en", async () => {
        const res = await request(app)
            .post("/api/v1/auth/login")
            .set("Accept-Language", "en")
            .send({ email: "ghost@x.c", password: "any" });

        expect(res.body.error.message).toMatch(/email or password/i);
    });
});
```

## Package.json scripts

```json
{
    "scripts": {
        "test": "vitest run",
        "test:watch": "vitest",
        "test:unit": "vitest run src/**/*.test.ts",
        "test:integration": "vitest run src/**/*.integration.test.ts",
        "test:e2e": "vitest run tests/e2e",
        "test:coverage": "vitest run --coverage",
        "db:test:reset": "DATABASE_URL=$DATABASE_URL_TEST prisma migrate reset --force --skip-seed"
    }
}
```

## .env.test

```env
DATABASE_URL=mysql://root:password@localhost:3306/myapp_test
APP_ENV=test
AUTH_JWT_SECRET=test-secret-do-not-use-in-prod
MAIL_HOST=localhost
MAIL_APP_PASSWORD=fake
```

## Rules

1. **Test file colocation**: `service.ts` → `service.test.ts` (unit), `service.integration.test.ts` (integration)
2. **E2E tests** in `tests/e2e/` separate folder
3. Use **real test database** for integration — never mock Prisma in integration tests
4. **NEVER** test against production DB — guard with `APP_ENV === "test"` check
5. Naming: `it("verb + condition + expected result")` (e.g. "throws when user not found")
6. Use `beforeEach` to reset state — independent tests
7. Mock external services (SMTP, third-party APIs) — never call real ones in tests
8. Coverage threshold: 70% lines, 65% branches (CI gate)
9. **NEVER** create test files inside source directory you don't want shipped — `*.test.ts` excluded from `tsc` via `tsconfig.json`
