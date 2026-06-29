const { PrismaClient } = require('@prisma/client');
const { randomUUID } = require('crypto');
const prisma = new PrismaClient();

async function seed() {
  const fakeData = [];
  // Using some random 2-letter codes that are not in DB, e.g. A1, A2... or existing ones
  for (let i = 0; i < 50; i++) {
    // just generate fake country codes like XX, XY etc., to avoid collision we can use AA + i
    const char1 = String.fromCharCode(65 + Math.floor(i / 26)); // A, B, C...
    const char2 = String.fromCharCode(65 + (i % 26));
    fakeData.push({
      id: randomUUID(),
      countryCode: char1 + char2,
      exemptionDays: Math.floor(Math.random() * 30) + 15,
      displayOrder: i + 100,
      isActive: true,
    });
  }
  
  try {
    const res = await prisma.visaExemptionCountry.createMany({
      data: fakeData,
      skipDuplicates: true,
    });
    console.log(`Inserted ${res.count} fake exemption countries`);
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
