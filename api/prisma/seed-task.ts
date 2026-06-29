import "dotenv/config";
import {
    PurposeOfVisit,
    VisaApplicationStatus,
    VisaType,
} from "@prisma/client";
import crypto from "crypto";
import prisma from "../src/lib/prisma";

async function main() {
    console.log("Seeding 10 applications...");
    
    let port = await prisma.port.findFirst();
    if (!port) {
        port = await prisma.port.create({
            data: {
                id: crypto.randomUUID(),
                code: "FAKE_PORT",
                name: "Fake Port",
            },
        });
    }

    const applications = [];
    const applicants = [];

    for (let i = 0; i < 10; i++) {
        const appId = crypto.randomUUID();
        const createdAt = new Date();
        createdAt.setDate(createdAt.getDate() - i); // past days
        
        applications.push({
            id: appId,
            applicationCode: `VN-202606-${String(100 + i).padStart(6, "0")}`,
            portId: port.id,
            contactEmail: `fake_10app_${i}@example.com`,
            contactPhone: `+8490123456${i}`,
            visaType: i % 2 === 0 ? "E_VISA" as VisaType : "VOA" as VisaType,
            visaCategory: "TOURIST",
            purposeOfVisit: "TOURIST" as PurposeOfVisit,
            arrivalDate: new Date(),
            processingTime: "NORMAL",
            applicantCount: 1,
            totalAmount: 25.00,
            status: "PAID" as VisaApplicationStatus,
            createdAt,
        });

        applicants.push({
            id: crypto.randomUUID(),
            applicationId: appId,
            fullName: `New Fake Applicant ${i + 1}`,
            gender: i % 2 === 0 ? "MALE" : "FEMALE",
            nationality: "US",
            dateOfBirth: new Date("1990-01-01"),
            passportNumber: `PASS1234${i}`,
            passportExpiryDate: new Date("2030-01-01"),
            passportImageUrl: "https://fake.url/passport.jpg",
        });
    }

    await prisma.visaApplication.createMany({ data: applications, skipDuplicates: true });
    await prisma.applicant.createMany({ data: applicants, skipDuplicates: true });
    console.log("10 applications seeded.");

    console.log("Seeding 6 newsletter campaigns...");
    const campaigns = [];
    for (let i = 1; i <= 6; i++) {
        campaigns.push({
            id: crypto.randomUUID(),
            subject: `AI Campaign ${i}: Khám phá Việt Nam`,
            htmlContent: `
                <div style="font-family: Arial, sans-serif; text-align: center; color: #333;">
                    <h2>Chiến dịch AI đặc biệt ${i}</h2>
                    <p>Khám phá những điểm đến tuyệt vời nhất với FASTVISA. Thủ tục nhanh gọn, dễ dàng và tiết kiệm.</p>
                    <img src="https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=800&q=80" alt="Vietnam Scenery" style="max-width: 100%; border-radius: 8px; margin-top: 20px;" />
                    <p style="margin-top: 20px; font-size: 14px; color: #666;">Liên hệ với chúng tôi ngay hôm nay để nhận ưu đãi.</p>
                </div>
            `,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
    }
    await prisma.newsletterCampaign.createMany({ data: campaigns, skipDuplicates: true });
    console.log("6 newsletter campaigns seeded.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
