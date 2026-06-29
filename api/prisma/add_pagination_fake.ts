import "dotenv/config";
import prisma from "../src/lib/prisma";

async function main() {
  let user = await prisma.user.findFirst();
  let port = await prisma.port.findFirst();

  if (!user || !port) {
    console.error("Missing user or port");
    return;
  }

  const statuses = ["COMPLETED", "PROCESSING", "PAID", "REJECTED"];
  const visaTypes = ["E_VISA", "VOA"];
  const eVisaCategories = ["TOURIST", "BUSINESS"];
  const voaCategories = ["1_MONTH_SINGLE", "1_MONTH_MULTIPLE", "3_MONTHS_SINGLE", "3_MONTHS_MULTIPLE"];

  // Adding 15 records (from 14 to 28)
  for (let i = 14; i <= 28; i++) {
    const dateStr = new Date().toISOString().slice(0,10).replace(/-/g, "");
    const randomSuffix = Math.floor(10000 + Math.random() * 90000);
    const fakeCode = `VN-${dateStr}-${randomSuffix}`;
    const fakeEmail = `fake.user${i}@example.com`;
    const fakePhone = `+849${Math.floor(10000000 + Math.random() * 90000000)}`;
    
    const vType = visaTypes[i % 2];
    const vCat = vType === "E_VISA" ? eVisaCategories[i % eVisaCategories.length] : voaCategories[i % voaCategories.length];

    const applicantCount = Math.floor(Math.random() * 5) + 1; // 1 to 5
    const totalAmount = applicantCount * (vType === "E_VISA" ? 25 : 50) + (Math.floor(Math.random() * 3) * 10); // Random price

    const createdAtDate = new Date(Date.now() - Math.floor(Math.random() * 10) * 24 * 60 * 60 * 1000); // Random within last 10 days

    const newApp = await prisma.visaApplication.create({
      data: {
        applicationCode: fakeCode,
        userId: user.id,
        portId: port.id,
        contactEmail: fakeEmail,
        contactPhone: fakePhone,
        visaType: vType as any,
        visaCategory: vCat,
        purposeOfVisit: "TOURIST",
        arrivalDate: new Date(Date.now() + i * 86400000),
        processingTime: "NORMAL",
        applicantCount: applicantCount,
        totalAmount: totalAmount,
        status: statuses[i % statuses.length] as any,
        createdAt: createdAtDate,
        updatedAt: createdAtDate,
        applicants: {
          create: [{
            fullName: `Fake Applicant ${i}`,
            gender: "MALE",
            nationality: "US",
            dateOfBirth: new Date("1990-01-01"),
            passportNumber: `P${Math.floor(10000000 + Math.random() * 90000000)}`,
            passportExpiryDate: new Date(Date.now() + 5 * 365 * 86400000),
            passportImageUrl: "https://example.com/passport.jpg",
            portraitImageUrl: "https://example.com/portrait.jpg"
          }]
        },
        payments: {
          create: [{
            transactionId: `TXN-FAKE-${Date.now()}-${i}`,
            paymentMethod: "PAYPAL",
            amount: totalAmount,
            status: "SUCCESS"
          }]
        }
      }
    });

    console.log(`Created new fake application ${i}: ${newApp.id} - ${fakeCode}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
