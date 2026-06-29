import 'dotenv/config';
import prisma from '../src/lib/prisma';

async function main() {
  console.log("Seeding newsletter...");
  const subsCount = await prisma.newsletterSubscription.count();
  if (subsCount === 0) {
    console.log("Seeding subscribers...");
    for (let i = 1; i <= 30; i++) {
      await prisma.newsletterSubscription.create({
        data: {
          email: `subscriber${i}@example.com`,
          isActive: i % 5 !== 0,
        }
      });
    }
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
