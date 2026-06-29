import prisma from "../src/lib/prisma";

async function reset() {
    console.log("Deleting all applicants...");
    await prisma.applicant.deleteMany({});
    console.log("Deleting all applications...");
    await prisma.visaApplication.deleteMany({});
    console.log("DB reset complete.");
}

reset().catch(console.error).finally(() => prisma.$disconnect());
