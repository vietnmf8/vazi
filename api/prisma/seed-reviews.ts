import "dotenv/config";
import { PrismaClient, ReviewStatus } from '@prisma/client';
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { buildMariaDbConnectionUrl } from "../src/lib/mariadb-connection";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
    throw new Error("DATABASE_URL bắt buộc để chạy seed");
}

const adapter = new PrismaMariaDb(buildMariaDbConnectionUrl(databaseUrl));
const prisma = new PrismaClient({ adapter });

const FAKE_REVIEWS = [
    {
        authorName: "John Smith",
        countryCode: "US",
        rating: 5,
        content: "Outstanding service! My e-Visa was approved in less than 24 hours. The whole process was completely stress-free and very straightforward.",
        avatarUrl: "https://api.dicebear.com/9.x/fun-emoji/svg?seed=JohnSmith",
        isFeatured: true,
        status: ReviewStatus.APPROVED,
    },
    {
        authorName: "Maria Garcia",
        countryCode: "ES",
        rating: 5,
        content: "Very helpful support team. I had an issue with my passport upload, but they guided me step by step. Definitely recommend their service to anyone traveling to Vietnam.",
        avatarUrl: "https://api.dicebear.com/9.x/fun-emoji/svg?seed=MariaGarcia",
        isFeatured: true,
        status: ReviewStatus.APPROVED,
    },
    {
        authorName: "David Lee",
        countryCode: "KR",
        rating: 4,
        content: "Quick processing and reasonable price compared to other agencies. The website is very modern and easy to use on my phone.",
        avatarUrl: "https://api.dicebear.com/9.x/fun-emoji/svg?seed=DavidLee",
        isFeatured: true,
        status: ReviewStatus.APPROVED,
    },
    {
        authorName: "Sophie Martin",
        countryCode: "FR",
        rating: 5,
        content: "Incredible! I thought getting a visa would be complicated, but FASTVISA made it feel like booking a flight. Excellent UI and super clear instructions.",
        avatarUrl: "https://api.dicebear.com/9.x/fun-emoji/svg?seed=SophieMartin",
        isFeatured: true,
        status: ReviewStatus.APPROVED,
    },
    {
        authorName: "Oliver Brown",
        countryCode: "GB",
        rating: 5,
        content: "Flawless experience. Got my approval letter exactly when promised. Trusted and reliable. I will be using them for my future trips.",
        avatarUrl: "https://api.dicebear.com/9.x/fun-emoji/svg?seed=OliverBrown",
        isFeatured: true,
        status: ReviewStatus.APPROVED,
    },
    {
        authorName: "Yuki Tanaka",
        countryCode: "JP",
        rating: 4,
        content: "Very good service. The email updates were prompt and informative. I never had to wonder what the status of my application was.",
        avatarUrl: "https://api.dicebear.com/9.x/fun-emoji/svg?seed=YukiTanaka",
        isFeatured: true,
        status: ReviewStatus.APPROVED,
    },
    {
        authorName: "Liam Johnson",
        countryCode: "AU",
        rating: 5,
        content: "Best visa service I've ever used! No hidden fees, instant confirmation, and great peace of mind before my holiday. Cheers!",
        avatarUrl: "https://api.dicebear.com/9.x/fun-emoji/svg?seed=LiamJohnson",
        isFeatured: true,
        status: ReviewStatus.APPROVED,
    },
    {
        authorName: "Anna Schmidt",
        countryCode: "DE",
        rating: 5,
        content: "Professional, fast, and transparent. The interface is beautiful, not like government sites. Highly recommended for all travelers.",
        avatarUrl: "https://api.dicebear.com/9.x/fun-emoji/svg?seed=AnnaSchmidt",
        isFeatured: true,
        status: ReviewStatus.APPROVED,
    },
    {
        authorName: "Carlos Silva",
        countryCode: "BR",
        rating: 5,
        content: "Super fast and very reliable. I submitted my application on Sunday night and got it on Monday afternoon! 10/10.",
        avatarUrl: "https://api.dicebear.com/9.x/fun-emoji/svg?seed=CarlosSilva",
        isFeatured: true,
        status: ReviewStatus.APPROVED,
    },
    {
        authorName: "Emma Wilson",
        countryCode: "CA",
        rating: 4,
        content: "Good experience overall. Easy form to fill out, and secure payment process. Took the hassle out of traveling planning.",
        avatarUrl: "https://api.dicebear.com/9.x/fun-emoji/svg?seed=EmmaWilson",
        isFeatured: true,
        status: ReviewStatus.APPROVED,
    }
];

async function main() {
    console.log("Seeding fake reviews...");
    let count = 0;
    for (const review of FAKE_REVIEWS) {
        await prisma.review.create({
            data: review
        });
        count++;
    }
    console.log(`Successfully seeded ${count} reviews.`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
