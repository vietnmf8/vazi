import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import {
    PrismaClient,
    ReviewStatus,
    VisaType,
    PurposeOfVisit,
    VisaApplicationStatus,
    PaymentStatus,
    UserRole,
    AccountStatus
} from "@prisma/client";
import { buildMariaDbConnectionUrl } from "../src/lib/mariadb-connection";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
    throw new Error("DATABASE_URL bắt buộc để chạy seed");
}

const adapter = new PrismaMariaDb(buildMariaDbConnectionUrl(databaseUrl));
const prisma = new PrismaClient({ adapter });

async function seedMockReviews() {
    console.log("Seeding mock reviews...");
    const reviews = [
        {
            authorName: "John Smith",
            countryCode: "US",
            content: "The process was incredibly smooth. I received my e-Visa in just 3 days without any hassle. Highly recommended!",
            rating: 5,
            status: ReviewStatus.APPROVED,
        },
        {
            authorName: "Sarah Connor",
            countryCode: "GB",
            content: "Very fast and reliable service. The support team was also helpful when I had a question about my passport upload.",
            rating: 5,
            status: ReviewStatus.APPROVED,
        },
        {
            authorName: "Michael Wang",
            countryCode: "CA",
            content: "Good service, but it took exactly 5 days as stated. I was hoping it would be a bit faster. Still, no complaints.",
            rating: 4,
            status: ReviewStatus.APPROVED,
        },
        {
            authorName: "Emma Johnson",
            countryCode: "AU",
            content: "Super easy to use interface. The pricing was transparent and the email updates kept me informed.",
            rating: 5,
            status: ReviewStatus.APPROVED,
        },
        {
            authorName: "Hans Müller",
            countryCode: "DE",
            content: "Everything worked perfectly. The document arrived on time for my flight to Hanoi.",
            rating: 5,
            status: ReviewStatus.APPROVED,
        },
        {
            authorName: "Yuki Tanaka",
            countryCode: "JP",
            content: "Very convenient service. I didn't have to visit the embassy at all.",
            rating: 5,
            status: ReviewStatus.APPROVED,
        },
        {
            authorName: "Chloe Martin",
            countryCode: "FR",
            content: "The application form is straightforward. Got my visa quickly. Thank you!",
            rating: 5,
            status: ReviewStatus.APPROVED,
        },
        {
            authorName: "Isabella Rossi",
            countryCode: "IT",
            content: "Great customer support. I made a mistake on my application and they helped me fix it immediately.",
            rating: 4,
            status: ReviewStatus.APPROVED,
        },
        {
            authorName: "Liam O'Connor",
            countryCode: "IE",
            content: "Applying for the visa was the easiest part of planning my trip to Vietnam.",
            rating: 5,
            status: ReviewStatus.PENDING,
        },
        {
            authorName: "Noah Garcia",
            countryCode: "ES",
            content: "Excellent and fast. I used the urgent service and got it in 1 day.",
            rating: 5,
            status: ReviewStatus.PENDING,
        }
    ];

    for (const data of reviews) {
        await prisma.review.create({
            data: {
                ...data,
                avatarUrl: `https://i.pravatar.cc/150?u=${encodeURIComponent(data.authorName)}`
            }
        });
    }
    console.log(`✅ Seeded ${reviews.length} mock reviews.`);
}

async function seedMockApplications() {
    console.log("Seeding mock applications...");

    // Create a mock user
    const user = await prisma.user.create({
        data: {
            email: "johndoe@example.com",
            fullName: "John Doe",
            phone: "+12025550172",
            role: UserRole.CUSTOMER,
            accountStatus: AccountStatus.APPROVED,
        }
    });

    // Get a port (e.g. SGN)
    const port = await prisma.port.findFirst({ where: { code: "SGN" } });
    if (!port) {
        console.warn("No port found. Skipping applications.");
        return;
    }

    const apps = [
        {
            applicationCode: "VN-" + Date.now() + "1",
            contactEmail: "johndoe@example.com",
            contactPhone: "+12025550172",
            visaType: VisaType.E_VISA,
            visaCategory: "E_VISA_30_DAYS_SINGLE",
            purposeOfVisit: PurposeOfVisit.TOURIST,
            arrivalDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
            processingTime: "NORMAL",
            applicantCount: 1,
            totalAmount: 55.00,
            status: VisaApplicationStatus.COMPLETED,
            userId: user.id,
            portId: port.id,
            applicants: {
                create: [
                    {
                        fullName: "JOHN DOE",
                        gender: "Male",
                        nationality: "US",
                        dateOfBirth: new Date("1990-05-15"),
                        passportNumber: "US12345678",
                        passportExpiryDate: new Date("2030-05-15"),
                        passportImageUrl: "https://res.cloudinary.com/demo/image/upload/sample.jpg"
                    }
                ]
            },
            payments: {
                create: [
                    {
                        transactionId: "PAY-" + Date.now(),
                        paymentMethod: "PAYPAL",
                        amount: 55.00,
                        status: PaymentStatus.SUCCESS
                    }
                ]
            }
        },
        {
            applicationCode: "VN-" + Date.now() + "2",
            contactEmail: "alice.smith@example.co.uk",
            contactPhone: "+447700900077",
            visaType: VisaType.E_VISA,
            visaCategory: "E_VISA_90_DAYS_MULTIPLE",
            purposeOfVisit: PurposeOfVisit.BUSINESS,
            arrivalDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), 
            processingTime: "URGENT_2WD_90",
            applicantCount: 2,
            totalAmount: 320.00, // (85 + 75) * 2
            status: VisaApplicationStatus.PROCESSING,
            portId: port.id,
            applicants: {
                create: [
                    {
                        fullName: "ALICE SMITH",
                        gender: "Female",
                        nationality: "GB",
                        dateOfBirth: new Date("1985-08-22"),
                        passportNumber: "GB98765432",
                        passportExpiryDate: new Date("2029-08-22"),
                        passportImageUrl: "https://res.cloudinary.com/demo/image/upload/sample.jpg"
                    },
                    {
                        fullName: "BOB SMITH",
                        gender: "Male",
                        nationality: "GB",
                        dateOfBirth: new Date("1982-11-10"),
                        passportNumber: "GB23456789",
                        passportExpiryDate: new Date("2029-11-10"),
                        passportImageUrl: "https://res.cloudinary.com/demo/image/upload/sample.jpg"
                    }
                ]
            },
            payments: {
                create: [
                    {
                        transactionId: "PAY-" + Date.now() + "B",
                        paymentMethod: "CREDIT_CARD",
                        amount: 320.00,
                        status: PaymentStatus.SUCCESS
                    }
                ]
            }
        },
        {
            applicationCode: "VN-" + Date.now() + "3",
            contactEmail: "carlos.m@example.es",
            contactPhone: "+34600123456",
            visaType: VisaType.VOA,
            visaCategory: "VOA_1_MONTH_SINGLE",
            purposeOfVisit: PurposeOfVisit.TOURIST,
            arrivalDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000), 
            processingTime: "NORMAL",
            applicantCount: 1,
            totalAmount: 55.00,
            status: VisaApplicationStatus.PAID,
            portId: port.id,
            applicants: {
                create: [
                    {
                        fullName: "CARLOS MENDEZ",
                        gender: "Male",
                        nationality: "ES",
                        dateOfBirth: new Date("1995-02-14"),
                        passportNumber: "ES45612378",
                        passportExpiryDate: new Date("2032-02-14"),
                        passportImageUrl: "https://res.cloudinary.com/demo/image/upload/sample.jpg"
                    }
                ]
            },
            payments: {
                create: [
                    {
                        transactionId: "PAY-" + Date.now() + "C",
                        paymentMethod: "PAYPAL",
                        amount: 55.00,
                        status: PaymentStatus.SUCCESS
                    }
                ]
            }
        }
    ];

    for (const app of apps) {
        await prisma.visaApplication.create({ data: app });
    }
    console.log(`✅ Seeded ${apps.length} mock applications.`);
}

async function main() {
    await seedMockReviews();
    await seedMockApplications();
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
