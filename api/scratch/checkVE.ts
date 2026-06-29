import prisma from '../src/lib/prisma';

async function main() {
  const v = await prisma.nationality.findMany({
    where: { countryName: { contains: 'Venezuela' } }
  });
  console.log('Venezuela match:', v);
  await prisma.$disconnect();
}
main().catch(console.error);
