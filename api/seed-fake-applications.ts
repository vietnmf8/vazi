import { VisaApplicationStatus, VisaType, PurposeOfVisit } from '@prisma/client';
import prisma from './src/lib/prisma';

async function seedFakeApplications() {
    console.log("Seeding fake applications...");
    
    const fakeApps = [];
    const statuses = [VisaApplicationStatus.PAID, VisaApplicationStatus.PROCESSING, VisaApplicationStatus.COMPLETED, VisaApplicationStatus.REJECTED];
    const visaTypes = [VisaType.E_VISA, VisaType.VOA];
    const purposes = [PurposeOfVisit.TOURIST, PurposeOfVisit.BUSINESS];
    
    for (let i = 1; i <= 50; i++) {
        const id = "fake-" + Math.random().toString(36).substring(2, 12);
        const status = statuses[i % statuses.length];
        const visaType = visaTypes[i % visaTypes.length];
        const purpose = purposes[i % purposes.length];
        const applicantCount = (i % 5) + 1;
        const totalAmount = applicantCount * 25;
        
        fakeApps.push({
            id,
            applicationCode: `VN-FAKE-${2000 + i}`,
            contactEmail: `fakeuser${i}@example.com`,
            contactPhone: `+8490000${i.toString().padStart(4, '0')}`,
            visaType,
            visaCategory: "TOURIST_30_DAYS",
            purposeOfVisit: purpose,
            arrivalDate: new Date(`2024-0${(i % 9) + 1}-15T00:00:00.000Z`),
            processingTime: "NORMAL",
            applicantCount,
            totalAmount,
            status,
        });
    }

    // Insert fake records
    await prisma.visaApplication.createMany({
        data: fakeApps
    });

    console.log(`Successfully seeded ${fakeApps.length} fake applications!`);
}

seedFakeApplications()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
