import * as dotenv from 'dotenv';
dotenv.config();

import prisma from './src/lib/prisma';

async function main() {
  await prisma.visaExemptionCountry.deleteMany();
  console.log('Deleted all exemptions');
}

main()
  .then(async () => {
    process.exit(0)
  })
  .catch(async (e) => {
    console.error(e)
    process.exit(1)
  })
