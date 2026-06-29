import prisma from "./src/lib/prisma";

async function main() {
    const campaigns = await prisma.newsletterCampaign.findMany({ orderBy: { sequenceNo: 'asc' } });
    for (let i = 0; i < campaigns.length; i++) {
        await prisma.newsletterCampaign.update({
            where: { id: campaigns[i].id },
            data: { sequenceNo: i + 1 }
        });
    }
    await prisma.$executeRaw`ALTER TABLE newsletter_campaigns AUTO_INCREMENT = 1`;
    console.log("Fixed campaigns!");

    const subs = await prisma.newsletterSubscription.findMany({ orderBy: { sequenceNo: 'asc' } });
    for (let i = 0; i < subs.length; i++) {
        await prisma.newsletterSubscription.update({
            where: { id: subs[i].id },
            data: { sequenceNo: i + 1 }
        });
    }
    await prisma.$executeRaw`ALTER TABLE newsletter_subscriptions AUTO_INCREMENT = 1`;
    console.log("Fixed subscriptions!");
}
main().finally(() => prisma.$disconnect());
