import prisma from "./src/lib/prisma";

async function run() {
    console.log("Deleting all existing subscribers...");
    await prisma.newsletterSubscription.deleteMany({});
    
    console.log("Inserting target test subscribers...");
    await prisma.newsletterSubscription.createMany({
        data: [
            { email: "vietnm.oes@gmail.com", isActive: true },
            { email: "nguyenminhviet2510@gmail.com", isActive: true },
        ],
    });
    
    console.log("Test data prepared successfully!");
    process.exit(0);
}

run().catch(console.error);
