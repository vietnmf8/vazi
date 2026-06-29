import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import * as cheerio from "cheerio";
import { buildMariaDbConnectionUrl } from "../src/lib/mariadb-connection";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
    throw new Error("DATABASE_URL bắt buộc để chạy seed");
}
const adapter = new PrismaMariaDb(buildMariaDbConnectionUrl(databaseUrl));
const prisma = new PrismaClient({ adapter });

const pagesToCrawl = [
  { slug: "extra-services", url: "https://vietnamevisa.com/Guide/vietnam-visa-extra-services.html", type: "guide" },
  { slug: "visa-extension", url: "https://vietnamevisa.com/Guide/vietnam-visa-extension-for-foreigners.html", type: "guide" },
  { slug: "payment-guideline", url: "https://vietnamevisa.com/Guide/payment-guideline.html", type: "guide" },
  { slug: "visa-exemptions", url: "https://vietnamevisa.com/Guide/vietnam-visa-exemptions.html", type: "guide" },
  { slug: "latest-news", url: "https://vietnamevisa.com/vietnam-visa-news", type: "news" },
  { slug: "vietnam-evisa-2026-updates", url: "https://vietnamevisa.com/vietnam-visa-news", type: "news" },
  { slug: "urgent-processing-guide", url: "https://vietnamevisa.com/Guide/urgent-vietnam-visa.html", type: "guide" },
  { slug: "vip-fast-track-benefits", url: "https://vietnamevisa.com/Guide/vietnam-airport-fast-track-service.html", type: "guide" },
  { slug: "document-photo-requirements", url: "https://vietnamevisa.com/Guide/vietnam-visa-photo-requirements.html", type: "guide" },
  { slug: "multi-applicant-family-trips", url: "https://vietnamevisa.com/Guide/how-to-apply-vietnam-visa-for-a-group.html", type: "guide" },
  { slug: "payment-security-faq", url: "https://vietnamevisa.com/faqs.html", type: "guide" },
];

async function seedArticles() {
  console.log("Starting to seed articles...");

  for (const page of pagesToCrawl) {
    try {
      console.log(`Fetching ${page.url}...`);
      const response = await fetch(page.url);
      
      let title = page.slug.replace(/-/g, " ").toUpperCase();
      let content = `<p>Coming soon: Detailed information about ${title}</p>`;

      if (response.ok) {
        const html = await response.text();
        const $ = cheerio.load(html);
        
        const scrapedTitle = $("h1").first().text().trim();
        if (scrapedTitle) title = scrapedTitle;
        
        const scrapedContent = $(".detail-post").html() || $(".post-content").html() || $(".content").html() || $(".dcontent").html();
        if (scrapedContent) {
           content = scrapedContent.trim();
        }
      }

      await prisma.article.upsert({
        where: { slug: page.slug },
        update: {
          title,
          content,
          type: page.type,
          updatedAt: new Date()
        },
        create: {
          slug: page.slug,
          title,
          content,
          type: page.type
        }
      });
      
      console.log(`Seeded: ${page.slug} (${title})`);
    } catch (e) {
      console.error(`Error crawling ${page.slug}:`, e);
    }
  }

  console.log("Seeding finished.");
}

seedArticles()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
