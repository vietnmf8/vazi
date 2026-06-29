const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function create() {
    try {
        const app = await prisma.application.create({
            data: {
                code: "VN-TEST-123",
                status: "PROCESSING",
                contactEmail: "test@example.com",
                paymentStatus: "PAID",
                visaType: "evisa",
                currentCountry: "Vietnam",
                entryPort: "SGN",
                exitPort: "SGN",
                arrivalDate: new Date(),
                exitDate: new Date(),
                totalFee: 100
            }
        });
        console.log("Created app:", app);
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
create();
