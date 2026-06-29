import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@prisma/client";
import { buildMariaDbConnectionUrl } from "../src/lib/mariadb-connection";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
    throw new Error("DATABASE_URL bắt buộc để chạy seed");
}

const adapter = new PrismaMariaDb(buildMariaDbConnectionUrl(databaseUrl));
const prisma = new PrismaClient({ adapter });

async function seedPhase5() {
    console.log("Seeding Phase 5: Updating imageUrl for How To Apply Documents...");
    
    const htaDocs = [
        {
            slug: "how-to-apply-doc-passport-copy",
            imageUrl: "/images/guide/req-docs-1.jpg"
        },
        {
            slug: "how-to-apply-doc-portrait-photo",
            imageUrl: "/images/guide/req-docs-2.jpg"
        },
        {
            slug: "how-to-apply-doc-application-form",
            imageUrl: "/images/guide/req-docs-3.jpg"
        }
    ];

    for (const doc of htaDocs) {
        await prisma.article.update({
            where: { slug: doc.slug },
            data: { imageUrl: doc.imageUrl }
        }).catch(err => {
            console.log(`Warning: Could not update ${doc.slug}. It may not exist yet.`);
        });
    }

    console.log("✅ Phase 5 seeding completed.");
}

seedPhase5()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
