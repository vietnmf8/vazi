import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@prisma/client";
import { buildMariaDbConnectionUrl } from "../src/lib/mariadb-connection";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL bắt buộc để chạy seed");
const adapter = new PrismaMariaDb(buildMariaDbConnectionUrl(databaseUrl));
const prisma = new PrismaClient({ adapter });

async function main() {
    const rules = await prisma.pricingRule.findMany({ where: { ruleType: "PROCESSING_TIME" } });

    for (const rule of rules) {
        let expectedTimeEn = null;
        let expectedTimeVi = null;
        let expectedTimeKo = null;
        let expectedTimeZh = null;

        if (rule.key === "URGENT_1WD") {
            expectedTimeEn = "Result by tomorrow 6:00 PM (Vietnam Time)";
            expectedTimeVi = "Kết quả trước 18:00 ngày mai (Giờ VN)";
            expectedTimeKo = "내일 오후 6시 이전 결과 (베트남 시간)";
            expectedTimeZh = "明天下午 6:00 前出结果（越南时间）";
        } else if (rule.key === "URGENT_4WH") {
            expectedTimeEn = "Result within 4 business hours";
            expectedTimeVi = "Kết quả trong vòng 4 giờ làm việc";
            expectedTimeKo = "영업일 기준 4시간 이내 결과";
            expectedTimeZh = "4个工作小时内出结果";
        } else if (rule.key === "URGENT_2WH") {
            expectedTimeEn = "Result within 2 business hours";
            expectedTimeVi = "Kết quả trong vòng 2 giờ làm việc";
            expectedTimeKo = "영업일 기준 2시간 이내 결과";
            expectedTimeZh = "2个工作小时内出结果";
        } else if (rule.key === "LAST_MINUTE_HOLIDAY") {
            expectedTimeEn = "Result in 30-60 minutes";
            expectedTimeVi = "Kết quả trong 30-60 phút";
            expectedTimeKo = "30~60분 이내 결과";
            expectedTimeZh = "30-60分钟内出结果";
        }

            const transEn = await prisma.pricingRuleTranslation.findFirst({ where: { pricingRuleId: rule.id, languageCode: "en" } });
            if (transEn) {
                // English
                const featuresEn = (transEn.features as any) || {};
                featuresEn.expected_time = expectedTimeEn;
                await prisma.pricingRuleTranslation.update({
                    where: { id: transEn.id },
                    data: { features: featuresEn }
                });

                // Vietnamese
                const transVi = await prisma.pricingRuleTranslation.findFirst({ where: { pricingRuleId: rule.id, languageCode: "vi" } });
                if (transVi) {
                    const featuresVi = (transVi.features as any) || {};
                    featuresVi.expected_time = expectedTimeVi;
                    await prisma.pricingRuleTranslation.update({
                        where: { id: transVi.id },
                        data: { features: featuresVi }
                    });
                }

                // Korean
                const transKo = await prisma.pricingRuleTranslation.findFirst({ where: { pricingRuleId: rule.id, languageCode: "ko" } });
                const featuresKo = transKo ? ((transKo.features as any) || {}) : {};
                featuresKo.expected_time = expectedTimeKo;
                if (transKo) {
                    await prisma.pricingRuleTranslation.update({
                        where: { id: transKo.id },
                        data: { features: featuresKo }
                    });
                } else {
                    await prisma.pricingRuleTranslation.create({
                        data: {
                            pricingRuleId: rule.id,
                            languageCode: "ko",
                            name: transEn.name,
                            processing: transEn.processing,
                            features: featuresKo
                        }
                    });
                }

                // Chinese
                const transZh = await prisma.pricingRuleTranslation.findFirst({ where: { pricingRuleId: rule.id, languageCode: "zh" } });
                const featuresZh = transZh ? ((transZh.features as any) || {}) : {};
                featuresZh.expected_time = expectedTimeZh;
                if (transZh) {
                    await prisma.pricingRuleTranslation.update({
                        where: { id: transZh.id },
                        data: { features: featuresZh }
                    });
                } else {
                    await prisma.pricingRuleTranslation.create({
                        data: {
                            pricingRuleId: rule.id,
                            languageCode: "zh",
                            name: transEn.name,
                            processing: transEn.processing,
                            features: featuresZh
                        }
                    });
                }
            }
        // End of rule loop
    }
    console.log("Seeded expected time successfully");
}
main().then(() => prisma.$disconnect()).catch(e => { console.error(e); process.exit(1); });
