import { randomUUID } from "node:crypto";
import prisma from "./src/lib/prisma";

async function seed() {
  const fakeData = [];
  for (let i = 0; i < 50; i++) {
    const char1 = String.fromCharCode(65 + Math.floor(i / 26)); 
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
