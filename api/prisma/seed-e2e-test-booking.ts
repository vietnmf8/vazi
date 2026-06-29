/**
 * Seed dữ liệu booking test cho E2E — upsert idempotent.
 *
 * Mục đích: tạo 1 VisaApplication với status COMPLETED và resultDocumentPublicId hợp lệ
 * để test check_status_download trong virtual-mouse-conditional-buttons.spec.ts có thể
 * tra cứu và nút download xuất hiện.
 *
 * Chạy: npx ts-node --project tsconfig.json -e "require('./prisma/seed-e2e-test-booking')"
 * hoặc: npx tsx prisma/seed-e2e-test-booking.ts
 */
import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import {
    PrismaClient,
    VisaType,
    PurposeOfVisit,
    VisaApplicationStatus,
    PaymentStatus,
} from "@prisma/client";
import { buildMariaDbConnectionUrl } from "../src/lib/mariadb-connection";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
    throw new Error("DATABASE_URL bắt buộc để chạy seed");
}

const adapter = new PrismaMariaDb(buildMariaDbConnectionUrl(databaseUrl));
const prisma = new PrismaClient({ adapter });

// Dữ liệu cố định khớp với test spec:
// - bookingNumber (trong form) = applicationCode = "VN-20260622-UR71Q"
// - email = "vietnm.oes@gmail.com"
const E2E_BOOKING_CODE = "VN-20260622-UR71Q";
const E2E_CONTACT_EMAIL = "vietnm.oes@gmail.com";

async function main() {
    console.log("[seed-e2e] Bắt đầu upsert booking E2E test...");

    // Tìm port SGN
    const port = await prisma.port.findFirst({ where: { code: "SGN" } });
    if (!port) {
        throw new Error("Không tìm thấy port SGN — hãy chạy seed chính trước.");
    }

    // Upsert application theo applicationCode (unique)
    const existing = await prisma.visaApplication.findFirst({
        where: { applicationCode: E2E_BOOKING_CODE },
    });

    if (existing) {
        // Cập nhật status COMPLETED và gán resultDocumentPublicId nếu chưa có
        await prisma.visaApplication.update({
            where: { id: existing.id },
            data: {
                status: VisaApplicationStatus.COMPLETED,
                // Dùng public_id giả — getSignedRawDownloadUrl có thể trả URL không tồn tại
                // nhưng nút download sẽ vẫn hiển thị (UI chỉ cần download_url != null)
                resultDocumentPublicId: "e2e-test/visa-documents/VN-20260622-UR71Q-evisa",
                contactEmail: E2E_CONTACT_EMAIL,
            },
        });
        console.log(`[seed-e2e] ✅ Updated existing application: ${E2E_BOOKING_CODE}`);
    } else {
        // Tạo mới
        await prisma.visaApplication.create({
            data: {
                applicationCode: E2E_BOOKING_CODE,
                contactEmail: E2E_CONTACT_EMAIL,
                contactPhone: "+84901234567",
                visaType: VisaType.E_VISA,
                visaCategory: "E_VISA_30_DAYS_SINGLE",
                purposeOfVisit: PurposeOfVisit.TOURIST,
                arrivalDate: new Date("2026-07-01"),
                processingTime: "NORMAL",
                applicantCount: 1,
                totalAmount: 55.00,
                status: VisaApplicationStatus.COMPLETED,
                // Public ID giả — chỉ cần != null để service trả download_url
                resultDocumentPublicId: "e2e-test/visa-documents/VN-20260622-UR71Q-evisa",
                portId: port.id,
                applicants: {
                    create: [
                        {
                            fullName: "NGUYEN VAN A",
                            gender: "Male",
                            nationality: "Vietnam",
                            dateOfBirth: new Date("1990-01-01"),
                            passportNumber: "B1234567",
                            passportExpiryDate: new Date("2030-01-01"),
                            passportImageUrl: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
                        },
                    ],
                },
                payments: {
                    create: [
                        {
                            transactionId: `PAY-E2E-${Date.now()}`,
                            paymentMethod: "PAYPAL",
                            amount: 55.00,
                            status: PaymentStatus.SUCCESS,
                        },
                    ],
                },
            },
        });
        console.log(`[seed-e2e] ✅ Created new application: ${E2E_BOOKING_CODE}`);
    }

    // Verify
    const result = await prisma.visaApplication.findFirst({
        where: { applicationCode: E2E_BOOKING_CODE },
        select: {
            applicationCode: true,
            status: true,
            contactEmail: true,
            resultDocumentPublicId: true,
        },
    });
    console.log("[seed-e2e] Kết quả verify:", result);
    console.log("[seed-e2e] ✅ Done!");
}

main()
    .catch((e) => {
        console.error("[seed-e2e] ❌ Error:", e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
