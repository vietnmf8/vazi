const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const campaigns = await prisma.newsletterCampaign.findMany({ orderBy: { sequenceNo: 'asc' } });
    console.log("Campaigns:", campaigns.map(c => ({ id: c.id, seq: c.sequenceNo, subject: c.subject })));
    const subs = await prisma.newsletterSubscription.findMany({ orderBy: { sequenceNo: 'asc' } });
    console.log("Subscriptions:", subs.map(s => ({ id: s.id, seq: s.sequenceNo, email: s.email })));
}
main().finally(() => prisma.$disconnect());
