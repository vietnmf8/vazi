/**
 * Tạo/cập nhật tài khoản admin duy nhất — chạy một lần hoặc khi đổi mật khẩu.
 *
 * Usage: npx tsx scripts/seed-admin.ts
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@prisma/client";
import { buildMariaDbConnectionUrl } from "../src/lib/mariadb-connection";

const ADMINS = [
    {
        email: "vietnmf8@fullstack.edu.vn",
        password: process.env.ADMIN_SEED_PASSWORD ?? "Viet251001",
        name: "Nguyễn Minh Việt",
        phone: "0900000000",
        role: "SUPER_ADMIN" as const,
    }
];

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
    throw new Error("DATABASE_URL bắt buộc");
}

const adapter = new PrismaMariaDb(buildMariaDbConnectionUrl(databaseUrl));
const prisma = new PrismaClient({ adapter });

async function main() {
    for (const admin of ADMINS) {
        const passwordHash = await bcrypt.hash(admin.password, 12);
        const existing = await prisma.user.findUnique({
            where: { email: admin.email },
        });

        if (existing) {
            await prisma.user.update({
                where: { email: admin.email },
                data: {
                    passwordHash,
                    role: admin.role,
                    fullName: admin.name,
                    phone: admin.phone,
                    accountStatus: "APPROVED",
                    emailVerifiedAt: new Date(),
                },
            });
            console.log(`✓ Đã cập nhật admin: ${admin.email}`);
        } else {
            await prisma.user.create({
                data: {
                    id: randomUUID(),
                    email: admin.email,
                    passwordHash,
                    role: admin.role,
                    fullName: admin.name,
                    phone: admin.phone,
                    accountStatus: "APPROVED",
                    emailVerifiedAt: new Date(),
                },
            });
            console.log(`✓ Đã tạo admin: ${admin.email}`);
        }
    }
}

main()
    .catch((err) => {
        console.error(err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
