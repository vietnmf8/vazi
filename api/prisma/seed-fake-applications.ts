import "dotenv/config";
import prisma from "../src/lib/prisma";

async function main() {
  await prisma.visaApplication.deleteMany({
    where: { 
      OR: [
        { applicationCode: { startsWith: "VN-FAKE" } },
        { applicationCode: { startsWith: "VN-2026" } },
        { applicationCode: { startsWith: "EVISA2" } }
      ]
    }
  });
  console.log("Deleted old fake applications");

  await prisma.$executeRawUnsafe(`ALTER TABLE visa_applications AUTO_INCREMENT = 1;`);

  let user = await prisma.user.findFirst();
  if (!user) {
    user = await prisma.user.create({ data: { email: "vietnm.oes@gmail.com", fullName: "Admin", phone: "123456" } });
  }

  let port = await prisma.port.findFirst();
  if (!port) {
    port = await prisma.port.create({ data: { code: "SGN", name: "SGN Airport", portType: "AIRPORT" } });
  }

  const statuses = ["COMPLETED", "PROCESSING", "PAID", "REJECTED"];
  const visaTypes = ["E_VISA", "VOA"];
  const eVisaCategories = ["TOURIST", "BUSINESS"];
  const voaCategories = ["1_MONTH_SINGLE", "1_MONTH_MULTIPLE", "3_MONTHS_SINGLE", "3_MONTHS_MULTIPLE"];

  for (let i = 1; i <= 10; i++) {
    const dateStr = new Date().toISOString().slice(0,10).replace(/-/g, "");
    const randomSuffix = Math.floor(10000 + Math.random() * 90000);
    const fakeCode = `VN-${dateStr}-${randomSuffix}`;
    const fakeEmail = `fake.user${i}@example.com`;
    const fakePhone = `+849${Math.floor(10000000 + Math.random() * 90000000)}`;
    
    const vType = visaTypes[i % 2];
    const vCat = vType === "E_VISA" ? eVisaCategories[i % eVisaCategories.length] : voaCategories[i % voaCategories.length];

    const applicantCount = Math.floor(Math.random() * 5) + 1; // 1 to 5
    const totalAmount = applicantCount * (vType === "E_VISA" ? 25 : 50) + (Math.floor(Math.random() * 3) * 10); // Random price

    // First 7 records are old (5 days ago), last 3 records are new (now)
    const createdAtDate = i <= 7 ? new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) : new Date();

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
            amount: 55.0,
            status: "SUCCESS"
          }]
        }
      }
    });

    console.log(`Created fake application ${i}: ${newApp.id} - ${fakeCode}`);
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
