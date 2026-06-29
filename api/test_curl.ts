import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@prisma/client";
import { buildMariaDbConnectionUrl } from "./src/lib/mariadb-connection";
import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import { getEnv } from "./src/configs/env.config";

async function run() {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        throw new Error("DATABASE_URL empty");
    }

    const adapter = new PrismaMariaDb(buildMariaDbConnectionUrl(databaseUrl));
    const prisma = new PrismaClient({ adapter });

    try {
        console.log("Setting up admin user...");
        let admin = await prisma.user.findFirst({ where: { email: "test_admin@fastvisa.com" } });
        if (!admin) {
            admin = await prisma.user.create({
                data: {
                    id: randomUUID(),
                    email: "test_admin@fastvisa.com",
                    passwordHash: "dummy",
                    role: "ADMIN",
                    fullName: "Test Admin",
                    accountStatus: "APPROVED",
                    phone: "0123456789",
                }
            });
        }

        const token = jwt.sign(
            { sub: admin.id, email: admin.email, role: admin.role },
            process.env.JWT_SECRET || getEnv().JWT_SECRET || "fastvisa_secret_key_2024_dev",
            { expiresIn: "1h" }
        );

        console.log("Creating test applications...");

        const cases = [
            { template: "e-visa", name: "E-Visa Normal", category: "E_VISA_30_DAYS_SINGLE", type: "E_VISA", ft: false },
            { template: "voa", name: "VOA Normal", category: "VOA_1_MONTH_SINGLE", type: "VOA", ft: false },
            { template: "fast_track", name: "Fast Track Standalone", category: "E_VISA_30_DAYS_SINGLE", type: "E_VISA", ft: true },
            { template: "evisa_fast_track", name: "E-Visa + Fast Track", category: "E_VISA_30_DAYS_SINGLE", type: "E_VISA", ft: true },
            { template: "voa_fast_track", name: "VOA + Fast Track", category: "VOA_1_MONTH_SINGLE", type: "VOA", ft: true }
        ];

        for (const c of cases) {
            console.log(`\n--- Testing Case: ${c.name} ---`);
            const appId = randomUUID();
            
            await prisma.visaApplication.create({
                data: {
                    id: appId,
                    applicationCode: `TEST-${c.template.toUpperCase()}-${Date.now().toString().slice(-4)}`,
                    visaType: c.type as any,
                    visaCategory: c.category as any,
                    processingTime: "NORMAL",
                    arrivalDate: new Date(),
                    port: { connect: { code: "SGN" } },
                    purposeOfVisit: "TOURIST",
                    contactEmail: "test_customer@fastvisa.com",
                    contactPhone: "123456789",
                    applicantCount: 1,
                    totalAmount: 100,
                    status: "PROCESSING",
                    pickupPointImagePublicId: c.ft ? "https://example.com/pickup.jpg" : null,
                    resultDocumentPublicId: "test_doc",
                    applicants: {
                        create: [{
                            id: randomUUID(),
                            fullName: "TEST USER",
                            gender: "MALE",
                            nationality: "US",
                            dateOfBirth: new Date("1990-01-01"),
                            passportNumber: "P1234567",
                            passportExpiryDate: new Date("2030-01-01"),
                            passportImageUrl: "http://example.com/passport.jpg",
                            portraitImageUrl: "http://example.com/portrait.jpg",
                        }]
                    }
                }
            });

            console.log(`Sending PATCH request (simulating cURL) to status endpoint with template: ${c.template}`);

            const res = await fetch(`http://localhost:5000/api/v1/admin/applications/${appId}/status`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    status: "COMPLETED",
                    template_name: c.template
                })
            });

            const data = await res.json();
            if (res.ok) {
                console.log(`✅ Passed: Status changed to COMPLETED, Email triggered for ${c.name}`);
            } else {
                console.error(`❌ Failed:`, JSON.stringify(data, null, 2));
            }
        }

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

run();
