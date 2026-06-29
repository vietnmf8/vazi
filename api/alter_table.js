const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$executeRawUnsafe('ALTER TABLE newsletter_campaigns ADD COLUMN sequence_no INT NOT NULL AUTO_INCREMENT UNIQUE');
    console.log('Added sequence_no to newsletter_campaigns');
  } catch (e) { console.error(e.message); }

  try {
    await prisma.$executeRawUnsafe('ALTER TABLE newsletter_subscriptions ADD COLUMN sequence_no INT NOT NULL AUTO_INCREMENT UNIQUE');
    console.log('Added sequence_no to newsletter_subscriptions');
  } catch (e) { console.error(e.message); }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
