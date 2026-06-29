import 'dotenv/config'
import prisma from './src/lib/prisma'
import { randomUUID } from 'crypto'

async function main() {
  const count = await prisma.visaApplication.count()
  console.log(`Current applications count: ${count}`)
  
  const port = await prisma.port.findFirst();
  const rule = await prisma.pricingRule.findFirst();

  if (!port || !rule) {
     console.log("No ports or pricing rules found! Create them first.");
     return;
  }

  for (let i = 0; i < 10; i++) {
    const id = randomUUID()
    await prisma.visaApplication.create({
      data: {
        id,
        applicationCode: `APP-${Date.now()}-${i}`,
        contactEmail: `user${i}@example.com`,
        visaType: 'E_VISA',
        status: 'PROCESSING',
        applicantCount: 1,
        totalAmount: 25.00,
        portId: port.id,
        arrivalDate: new Date(),
        processingTime: "NORMAL",
        contactPhone: `+123456789${i}`,
        visaCategory: "TOURIST",
        purposeOfVisit: "TOURIST",
      }
    });
  }
  console.log('Seeded 10 applications!')
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect())
