import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@prisma/client";
import { buildMariaDbConnectionUrl } from "../src/lib/mariadb-connection";

const databaseUrl = process.env.DATABASE_URL!;
const adapter = new PrismaMariaDb(buildMariaDbConnectionUrl(databaseUrl));
const prisma = new PrismaClient({ adapter });

async function seedKorean() {
    console.log("Seeding Korean for StepGuidelines...");
    const stepsKo = [
        { stepNumber: 1, ko: { title: "비자 선택", description: "비자 종류, 처리 속도, 신청자 수를 선택하세요." } },
        { stepNumber: 2, ko: { title: "신청서 작성", description: "여권 정보를 입력하고 필수 서류를 안전하게 업로드하세요." } },
        { stepNumber: 3, ko: { title: "결제", description: "투명한 가격으로 카드 또는 PayPal을 통해 온라인으로 결제하세요." } },
        { stepNumber: 4, ko: { title: "이메일 수신", description: "승인된 전자 비자를 이메일로 받아보세요." } }
    ];

    for (const s of stepsKo) {
        const step = await prisma.stepGuideline.findFirst({ where: { stepNumber: s.stepNumber } });
        if (step) {
            await prisma.stepGuidelineTranslation.upsert({
                where: { stepGuidelineId_languageCode: { stepGuidelineId: step.id, languageCode: "ko" } },
                create: { stepGuidelineId: step.id, languageCode: "ko", title: s.ko.title, description: s.ko.description },
                update: { title: s.ko.title, description: s.ko.description }
            });
        }
    }

    console.log("Seeding Korean for Pricing Rules...");
    const pricingLabels: Record<string, string> = {
        "E_VISA_30_DAYS_SINGLE": "30일 단수 비자",
        "E_VISA_30_DAYS_MULTIPLE": "30일 복수 비자",
        "E_VISA_90_DAYS_SINGLE": "90일 단수 비자",
        "E_VISA_90_DAYS_MULTIPLE": "90일 복수 비자",
        "VISA_ON_ARRIVAL_1_MONTH_SINGLE": "1개월 단수 비자",
        "VISA_ON_ARRIVAL_1_MONTH_MULTIPLE": "1개월 복수 비자",
        "VISA_ON_ARRIVAL_3_MONTHS_SINGLE": "3개월 단수 비자",
        "VISA_ON_ARRIVAL_3_MONTHS_MULTIPLE": "3개월 복수 비자",
        "TOURIST_VISA_30_DAYS": "관광 비자 (30일)",
        "BUSINESS_VISA_30_DAYS": "상용 비자 (30일)"
    };

    const rules = await prisma.pricingRule.findMany();
    for (const rule of rules) {
        const nameKo = pricingLabels[rule.key] || rule.key;
        const featuresKo = [
            "유효기간 " + (rule.key.includes("30") || rule.key.includes("1_MONTH") ? "30일" : "90일"),
            rule.key.includes("SINGLE") ? "단수 입국" : "복수 입국",
            "관광 또는 상용 목적",
            "빠른 처리 가능"
        ];
        await prisma.pricingRuleTranslation.upsert({
            where: { pricingRuleId_languageCode: { pricingRuleId: rule.id, languageCode: "ko" } },
            create: {
                pricingRuleId: rule.id,
                languageCode: "ko",
                name: nameKo,
                processing: "기본 처리",
                features: featuresKo
            },
            update: {
                name: nameKo,
                processing: "기본 처리",
                features: featuresKo
            }
        });
    }

    console.log("✅ Seeded Korean data successfully");
}

seedKorean()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
