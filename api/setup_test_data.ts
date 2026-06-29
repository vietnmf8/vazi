import { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";
require("dotenv").config();
import prisma from "./src/lib/prisma";

async function run() {
    try {
        console.log("Checking DB for admin user...");
        let admin = await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" } });
        if (!admin) {
            console.log("Creating dummy admin...");
            admin = await prisma.user.create({
                data: {
                    email: "admin@test.com",
                    password: "dummy_hashed_password",
                    name: "Admin User",
                    role: "SUPER_ADMIN",
                    status: "ACTIVE"
                }
            });
        }
        
        console.log("Checking DB for application...");
        let app = await prisma.application.findFirst({ where: { contact_email: "test_curl@fastvisa.com" } });
        if (!app) {
            console.log("Creating dummy application...");
            app = await prisma.application.create({
                data: {
                    application_code: "VN-TESTCURL123",
                    visa_type: "E_VISA",
                    visa_category: "E_VISA_30D_SINGLE",
                    processing_time: "NORMAL",
                    arrival_date: new Date(),
                    port_of_entry: "SGN",
                    purpose_of_visit: "TOURISM",
                    contact_email: "test_curl@fastvisa.com",
                    contact_phone: "123456789",
                    applicant_count: 1,
                    total_amount: 100,
                    status: "PAID",
                    ip_address: "127.0.0.1",
                    applicants: {
                        create: [{
                            full_name: "TEST CURL USER",
                            gender: "MALE",
                            nationality: "US",
                            date_of_birth: new Date("1990-01-01"),
                            passport_number: "P1234567",
                            passport_expiry_date: new Date("2030-01-01"),
                            passport_image_public_id: "test/passport",
                            portrait_image_public_id: "test/portrait",
                        }]
                    }
                }
            });
        }
        
        console.log("Created application:", app.id);

        // We can't easily sign a JWT token without the secret here, so we will just invoke the service logic directly
        // Wait, the user asked for cURL. So I need a token.
        // Let's sign a token.
        const jwt = require("jsonwebtoken");
        // Check env for secret
        const env = require("dotenv").config().parsed;
        const secret = env?.JWT_SECRET || "fastvisa_secret_key_2024_dev"; // Default if not found
        
        const token = jwt.sign({ id: admin.id, email: admin.email, role: admin.role }, secret, { expiresIn: '1h' });
        
        console.log("Generated Admin Token:", token);
        console.log("Application ID:", app.id);
        
        console.log(`
Execute this curl command to test the COMPLETED status:
curl -X PATCH http://localhost:8000/api/v1/admin/applications/${app.id}/status \\
  -H "Authorization: Bearer ${token}" \\
  -H "Content-Type: application/json" \\
  -d '{"status":"COMPLETED","template_name":"evisa_fast_track"}'
`);

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

run();
