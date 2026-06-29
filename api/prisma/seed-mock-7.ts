import 'dotenv/config';
import prisma from '../src/lib/prisma';
import bcrypt from 'bcryptjs';

async function main() {
  console.log("Seeding mock data...");

  // 1. Users
  const superAdminEmail = 'vietnmf8@fullstack.edu.vn';
  const adminEmail = 'vietnm.oes@gmail.com';
  const hashedPassword = await bcrypt.hash('Viet251001', 10);

  await prisma.user.upsert({
    where: { email: superAdminEmail },
    update: { passwordHash: hashedPassword, role: 'SUPER_ADMIN', accountStatus: 'APPROVED', fullName: 'VietNM (Super Admin)', emailVerifiedAt: new Date(), phone: '0123456789' },
    create: {
      email: superAdminEmail,
      fullName: 'VietNM (Super Admin)',
      passwordHash: hashedPassword,
      role: 'SUPER_ADMIN',
      accountStatus: 'APPROVED',
      phone: '0123456789',
      emailVerifiedAt: new Date(),
    },
  });

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash: hashedPassword, role: 'ADMIN', accountStatus: 'APPROVED', fullName: 'VietNM (Admin)', emailVerifiedAt: new Date(), phone: '0987654321' },
    create: {
      email: adminEmail,
      fullName: 'VietNM (Admin)',
      passwordHash: hashedPassword,
      role: 'ADMIN',
      accountStatus: 'APPROVED',
      phone: '0987654321',
      emailVerifiedAt: new Date(),
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
    const subsCount = await prisma.newsletterSubscriber.count();
    if (subsCount === 0) {
      console.log("Seeding subscribers...");
      for (let i = 1; i <= 30; i++) {
        await prisma.newsletterSubscriber.create({
          data: {
            email: `subscriber${i}@example.com`,
            status: i % 5 === 0 ? 'UNSUBSCRIBED' : 'SUBSCRIBED',
            source: 'FOOTER',
          }
        });
      }
    }
  } catch (e) {
    console.log("Newsletter model might not be NewsletterSubscriber.");
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
