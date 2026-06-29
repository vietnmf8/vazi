import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding mock data...");

  // 1. Users
  const superAdminEmail = 'vietnmf8@fullstack.edu.vn';
  const adminEmail = 'vietnm.oes@gmail.com';
  const hashedPassword = await bcrypt.hash('Viet251001', 10);

  await prisma.user.upsert({
    where: { email: superAdminEmail },
    update: { password: hashedPassword, role: 'ADMIN', name: 'VietNM (Super Admin)', emailVerified: new Date() },
    create: {
      email: superAdminEmail,
      name: 'VietNM (Super Admin)',
      password: hashedPassword,
      role: 'ADMIN',
      emailVerified: new Date(),
    },
  });

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { password: hashedPassword, role: 'ADMIN', name: 'VietNM (Admin)', emailVerified: new Date() },
    create: {
      email: adminEmail,
      name: 'VietNM (Admin)',
      password: hashedPassword,
      role: 'ADMIN',
      emailVerified: new Date(),
    },
  });

  console.log("Users seeded.");

  // 2. Reviews
  const reviewsCount = await prisma.review.count();
  if (reviewsCount === 0) {
    console.log("Seeding reviews...");
    for (let i = 1; i <= 25; i++) {
      await prisma.review.create({
        data: {
          sequenceNo: i,
          authorName: `User ${i}`,
          countryCode: i % 2 === 0 ? 'US' : 'GB',
          content: `This is a great service! Fast and reliable. Highly recommend. (Review ${i})`,
          rating: 5,
          isFeatured: i <= 5,
          status: i <= 2 ? 'PENDING' : 'APPROVED',
        }
      });
    }
  }

  // 3. Applications
  const appsCount = await prisma.visaApplication.count();
  if (appsCount === 0) {
    console.log("Seeding applications...");
    for (let i = 1; i <= 35; i++) {
      await prisma.visaApplication.create({
        data: {
          applicationCode: `APP-${Date.now()}-${i}`,
          contactEmail: `contact${i}@example.com`,
          contactPhone: `+123456789${i}`,
          visaType: i % 3 === 0 ? 'VOA' : 'E_VISA',
          status: i % 5 === 0 ? 'COMPLETED' : i % 4 === 0 ? 'REJECTED' : i % 2 === 0 ? 'PROCESSING' : 'PAID',
          totalAmount: 50.0 + i,
          arrivalPort: 'HAN',
          arrivalDate: new Date(),
          processingTime: 'NORMAL',
          passports: `P${100000+i}, P${200000+i}, P${300000+i}, P${400000+i}, P${500000+i}, P${600000+i}`,
          applicantCount: i % 3 + 1,
        }
      });
    }
  }

  // 4. Newsletter
  try {
    const subsCount = await prisma.subscriber.count();
    if (subsCount === 0) {
      console.log("Seeding subscribers...");
      for (let i = 1; i <= 30; i++) {
        await prisma.subscriber.create({
          data: {
            email: `subscriber${i}@example.com`,
            status: i % 5 === 0 ? 'UNSUBSCRIBED' : 'SUBSCRIBED',
            source: 'FOOTER',
          }
        });
      }
    }
  } catch (e) {
    console.log("Newsletter model might not be Subscriber. Skipping.");
  }

  console.log("Mock data seeded successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
