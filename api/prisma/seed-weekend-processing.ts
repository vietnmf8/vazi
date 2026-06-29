import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@prisma/client";
import { buildMariaDbConnectionUrl } from "../src/lib/mariadb-connection";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL bắt buộc để chạy seed");
const adapter = new PrismaMariaDb(buildMariaDbConnectionUrl(databaseUrl));
const prisma = new PrismaClient({ adapter });

async function main() {
    // 1. Tạo hoặc cập nhật PricingRule
    const rule = await prisma.pricingRule.upsert({
        where: { ruleType_key: { ruleType: "PROCESSING_TIME", key: "WEEKEND_PROCESSING" } },
        update: {
            price: 150
        },
        create: {
            key: "WEEKEND_PROCESSING",
            ruleType: "PROCESSING_TIME",
            price: 150
        }
    });

    // 2. Data cho 4 ngôn ngữ
    const translations = [
        {
            lang: "en",
            name: "Weekend Processing (Sat, Sun)",
            processing: "Contact for specific time",
            expectedTime: "Contact for specific time"
        },
        {
            lang: "vi",
            name: "Xử lý cuối tuần (T7, CN)",
            processing: "Liên hệ để biết thời gian",
            expectedTime: "Liên hệ để biết thời gian cụ thể"
        },
        {
            lang: "ko",
            name: "주말 처리 (토, 일)",
            processing: "정확한 시간은 문의바랍니다",
            expectedTime: "정확한 시간은 문의바랍니다"
        },
        {
            lang: "zh",
            name: "周末处理（周六、周日）",
            processing: "具体时间请联系",
            expectedTime: "具体时间请联系"
        }
    ];

    for (const t of translations) {
        const trans = await prisma.pricingRuleTranslation.findFirst({
            where: { pricingRuleId: rule.id, languageCode: t.lang }
        });

        const features = trans && trans.features ? (trans.features as any) : {};
        features.expected_time = t.expectedTime;

        if (trans) {
            await prisma.pricingRuleTranslation.update({
                where: { id: trans.id },
                data: {
                    name: t.name,
                    processing: t.processing,
                    features: features
                }
            });
        } else {
            await prisma.pricingRuleTranslation.create({
                data: {
                    pricingRuleId: rule.id,
                    languageCode: t.lang,
                    name: t.name,
                    processing: t.processing,
                    features: features
                }
            });
        }
    }

    console.log("Seeded WEEKEND_PROCESSING successfully");
}

main().then(() => prisma.$disconnect()).catch(e => { console.error(e); process.exit(1); });
