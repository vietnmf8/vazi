import prisma from "./src/lib/prisma";

async function main() {
    const now = new Date();
    const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);

    console.log("Now:", now);
    console.log("Two minutes ago:", twoMinutesAgo);

    const subscribers = await prisma.newsletterSubscription.findMany({
        where: {
            isActive: true,
            OR: [
                {
                    lastCampaignSentAt: null,
                    subscribedAt: { lte: twoMinutesAgo },
                },
                {
                    lastCampaignSentAt: { not: null, lte: twoMinutesAgo },
                },
            ],
        },
    });

    console.log("Subscribers:", subscribers);
}
main();
