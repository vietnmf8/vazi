import prisma from "./src/lib/prisma";

async function main() {
    const campaigns = await prisma.newsletterCampaign.findMany({ orderBy: { sequenceNo: 'asc' } });
    console.log("Campaigns:", campaigns.map(c => ({ id: c.id, seq: c.sequenceNo, subject: c.subject })));
}
main().finally(() => prisma.$disconnect());
