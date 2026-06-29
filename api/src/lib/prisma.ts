import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@prisma/client";
import { getEnv } from "@/configs/env.config";
import { buildMariaDbConnectionUrl } from "@/lib/mariadb-connection";

/**
 * Singleton Prisma 7 — bắt buộc truyền {@link PrismaMariaDb} (MySQL protocol).
 *
 * Không dùng `new PrismaClient()` trần: engine Rust đọc URL trong schema đã bỏ, connect qua adapter.
 */
const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
    const { DATABASE_URL } = getEnv();
    if (!DATABASE_URL) {
        throw new Error("DATABASE_URL is empty — set in .env for Prisma");
    }

    const connectionUrl = buildMariaDbConnectionUrl(DATABASE_URL);
    const adapter = new PrismaMariaDb(connectionUrl);
    return new PrismaClient({ adapter });
}

const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (getEnv().NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
}

export default prisma;
