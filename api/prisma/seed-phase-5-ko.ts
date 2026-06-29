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

async function seedKoreanTranslations() {
    console.log("Seeding Phase 5 Korean Translations...");

    const stepsData = [
        {
            slug: "how-to-apply-step-1",
            ko: { title: "비자 선택", content: "온라인 양식에서 비자 종류, 처리 속도, 신청자 수를 선택하세요." }
        },
        {
            slug: "how-to-apply-step-2",
            ko: { title: "서류 준비", content: "여권 사본(유효기간 6개월 이상), 인물 사진, VIP 서비스를 위한 추가 서류를 준비하세요." }
        },
        {
            slug: "how-to-apply-step-3",
            ko: { title: "신청서 작성", content: "각 신청자의 여권 세부 정보를 입력하고 필수 파일을 안전하게 업로드하세요." }
        },
        {
            slug: "how-to-apply-step-4",
            ko: { title: "검토 및 결제", content: "숨겨진 수수료 없이 가격 내역을 확인한 후 USD로 카드 또는 PayPal을 통해 결제하세요." }
        },
        {
            slug: "how-to-apply-step-5",
            ko: { title: "이메일로 E-비자 수신", content: "표준 처리는 7영업일이 소요됩니다. 4시간에서 1영업일까지 긴급 옵션이 있습니다." }
        }
    ];

    for (const step of stepsData) {
        const article = await prisma.article.findUnique({ where: { slug: step.slug } });
        if (article) {
            await prisma.articleTranslation.upsert({
                where: {
                    articleId_languageCode: {
                        articleId: article.id,
                        languageCode: "ko"
                    }
                },
                update: { title: step.ko.title, content: step.ko.content },
                create: { articleId: article.id, languageCode: "ko", title: step.ko.title, content: step.ko.content }
            });
        }
    }

    const docsData = [
        {
            slug: "how-to-apply-doc-passport-copy",
            ko: { title: "여권 사본", content: "유효 기간이 최소 6개월 남은 신원 정보 페이지 스캔본." }
        },
        {
            slug: "how-to-apply-doc-portrait-photo",
            ko: { title: "인물 사진", content: "최근에 찍은 흰색 배경의 여권 크기 사진." }
        },
        {
            slug: "how-to-apply-doc-application-form",
            ko: { title: "신청서", content: "온라인으로 완료됨 — e-비자의 경우 종이 양식이 필요하지 않습니다." }
        }
    ];

    for (const doc of docsData) {
        const article = await prisma.article.findUnique({ where: { slug: doc.slug } });
        if (article) {
            await prisma.articleTranslation.upsert({
                where: {
                    articleId_languageCode: {
                        articleId: article.id,
                        languageCode: "ko"
                    }
                },
                update: { title: doc.ko.title, content: doc.ko.content },
                create: { articleId: article.id, languageCode: "ko", title: doc.ko.title, content: doc.ko.content }
            });
        }
    }

    const faqsData = [
        {
            enQuestion: "What is a Vietnam E-visa?",
            ko: { question: "베트남 e-비자란 무엇인가요?", answer: "베트남 정부에서 발행하는 전자 비자입니다. 출입국 관리소에 제시할 PDF 승인 서한을 받게 됩니다." }
        },
        {
            enQuestion: "How fast can I get my visa?",
            ko: { question: "비자를 얼마나 빨리 받을 수 있나요?", answer: "일반 처리는 7영업일입니다. 긴급 옵션: 비자 종류에 따라 4일, 2일, 1일 또는 4영업시간." }
        },
        {
            enQuestion: "Are there additional costs?",
            ko: { question: "추가 비용이 있나요?", answer: "총액 = 기본 서비스 수수료 + 처리 할증료 + 선택적 추가 항목(예: VIP 패스트 트랙 +$55). 공항 스탬프 수수료는 별도입니다(관광 $25 / 비즈니스 $50)." }
        }
    ];

    for (const tip of faqsData) {
        // Find faq by finding its English translation question
        const faqTranslationEn = await prisma.faqTranslation.findFirst({
            where: { languageCode: "en", question: tip.enQuestion }
        });
        if (faqTranslationEn) {
            await prisma.faqTranslation.upsert({
                where: {
                    faqId_languageCode: {
                        faqId: faqTranslationEn.faqId,
                        languageCode: "ko"
                    }
                },
                update: { question: tip.ko.question, answer: tip.ko.answer },
                create: { faqId: faqTranslationEn.faqId, languageCode: "ko", question: tip.ko.question, answer: tip.ko.answer }
            });
        }
    }

    console.log("✅ Phase 5 Korean seeding completed.");
}

seedKoreanTranslations()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
