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

async function seedMissing() {
    console.log("Seeding StepGuidelines...");
    const stepsData = [
        {
            stepNumber: 1,
            icon: "FileText",
            en: { title: "Choose Visa", description: "Select visa type, processing speed, and number of applicants." },
            vi: { title: "Chọn Visa", description: "Chọn loại visa, tốc độ xử lý và số lượng người nộp đơn." }
        },
        {
            stepNumber: 2,
            icon: "UploadCloud",
            en: { title: "Fill Form", description: "Enter passport details and upload required documents securely." },
            vi: { title: "Điền biểu mẫu", description: "Nhập chi tiết hộ chiếu và tải lên các tài liệu bắt buộc một cách an toàn." }
        },
        {
            stepNumber: 3,
            icon: "CreditCard",
            en: { title: "Make Payment", description: "Pay online via card or PayPal with transparent pricing." },
            vi: { title: "Thanh toán", description: "Thanh toán trực tuyến qua thẻ hoặc PayPal với giá minh bạch." }
        },
        {
            stepNumber: 4,
            icon: "Mail",
            en: { title: "Receive via Email", description: "Get your approved e-visa delivered to your inbox." },
            vi: { title: "Nhận qua Email", description: "Nhận e-visa đã được duyệt qua email của bạn." }
        }
    ];

    for (const s of stepsData) {
        const step = await prisma.stepGuideline.create({
            data: {
                stepNumber: s.stepNumber,
                icon: s.icon,
                displayOrder: s.stepNumber,
                isActive: true
            }
        });
        await prisma.stepGuidelineTranslation.createMany({
            data: [
                { stepGuidelineId: step.id, languageCode: "en", title: s.en.title, description: s.en.description },
                { stepGuidelineId: step.id, languageCode: "vi", title: s.vi.title, description: s.vi.description }
            ]
        });
    }

    console.log("Seeding Pricing Features...");
    const baseRules = await prisma.pricingRule.findMany({ where: { ruleType: "BASE_FEE" } });
    for (const rule of baseRules) {
        const featuresEn = [
            "Valid for " + (rule.key.includes("30") || rule.key.includes("1_MONTH") ? "30 days" : "90 days"),
            rule.key.includes("SINGLE") ? "Single entry" : "Multiple entry",
            "Tourist or Business purpose",
            "Fast processing available"
        ];
        const featuresVi = [
            "Hiệu lực " + (rule.key.includes("30") || rule.key.includes("1_MONTH") ? "30 ngày" : "90 ngày"),
            rule.key.includes("SINGLE") ? "Nhập cảnh 1 lần" : "Nhập cảnh nhiều lần",
            "Mục đích du lịch hoặc công tác",
            "Có xử lý khẩn"
        ];
        
        await prisma.pricingRuleTranslation.updateMany({
            where: { pricingRuleId: rule.id, languageCode: "en" },
            data: { features: featuresEn }
        });
        await prisma.pricingRuleTranslation.updateMany({
            where: { pricingRuleId: rule.id, languageCode: "vi" },
            data: { features: featuresVi }
        });
    }

    console.log("Seeding How To Apply Guidelines...");
    const htaSteps = [
        {
            displayOrder: 1,
            en: { title: "Choose Your Visa", content: "Select visa type, processing speed, and number of applicants on the online form." },
            vi: { title: "Chọn loại Visa", content: "Chọn loại visa, tốc độ xử lý và số lượng người nộp đơn trên biểu mẫu trực tuyến." }
        },
        {
            displayOrder: 2,
            en: { title: "Prepare Documents", content: "Gather passport copy (6+ months validity), portrait photo, and any extra documents for VIP service." },
            vi: { title: "Chuẩn bị Tài liệu", content: "Chuẩn bị bản sao hộ chiếu (còn hạn 6+ tháng), ảnh chân dung và các tài liệu bổ sung cho dịch vụ VIP." }
        },
        {
            displayOrder: 3,
            en: { title: "Fill Application Details", content: "Enter passport details for each applicant and upload required files securely." },
            vi: { title: "Điền thông tin", content: "Nhập thông tin hộ chiếu cho từng người và tải lên các tệp bắt buộc một cách an toàn." }
        },
        {
            displayOrder: 4,
            en: { title: "Review & Pay", content: "Confirm pricing breakdown — no hidden fees — then pay via card or PayPal in USD." },
            vi: { title: "Kiểm tra & Thanh toán", content: "Xác nhận chi phí — không có phí ẩn — sau đó thanh toán qua thẻ hoặc PayPal bằng USD." }
        },
        {
            displayOrder: 5,
            en: { title: "Receive E-Visa by Email", content: "Standard processing takes 7 working days. Urgent options from 4 hours to 1 working day." },
            vi: { title: "Nhận E-Visa qua Email", content: "Xử lý tiêu chuẩn mất 7 ngày làm việc. Lựa chọn khẩn cấp từ 4 giờ đến 1 ngày làm việc." }
        }
    ];

    for (const step of htaSteps) {
        const article = await prisma.article.create({
            data: {
                slug: `how-to-apply-step-${step.displayOrder}`,
                title: step.en.title,
                content: step.en.content,
                category: "step",
                type: "GUIDELINE",
                displayOrder: step.displayOrder,
            }
        });
        await prisma.articleTranslation.createMany({
            data: [
                { articleId: article.id, languageCode: "en", title: step.en.title, content: step.en.content },
                { articleId: article.id, languageCode: "vi", title: step.vi.title, content: step.vi.content }
            ]
        });
    }

    const htaDocs = [
        {
            slug: "how-to-apply-doc-passport-copy",
            displayOrder: 1,
            en: { title: "Passport Copy", content: "Bio-page scan with at least 6 months validity remaining." },
            vi: { title: "Bản sao Hộ chiếu", content: "Bản scan trang thông tin với ít nhất 6 tháng hiệu lực." }
        },
        {
            slug: "how-to-apply-doc-portrait-photo",
            displayOrder: 2,
            en: { title: "Portrait Photo", content: "Recent photo on white background, passport-style dimensions." },
            vi: { title: "Ảnh chân dung", content: "Ảnh chụp gần đây trên nền trắng, kích thước chuẩn hộ chiếu." }
        },
        {
            slug: "how-to-apply-doc-application-form",
            displayOrder: 3,
            en: { title: "Application Form", content: "Completed online — no paper form required for e-visa." },
            vi: { title: "Đơn xin Visa", content: "Hoàn thành trực tuyến — không yêu cầu đơn giấy đối với e-visa." }
        }
    ];

    for (const doc of htaDocs) {
        const article = await prisma.article.create({
            data: {
                slug: doc.slug,
                title: doc.en.title,
                content: doc.en.content,
                category: "document",
                type: "GUIDELINE",
                displayOrder: doc.displayOrder,
            }
        });
        await prisma.articleTranslation.createMany({
            data: [
                { articleId: article.id, languageCode: "en", title: doc.en.title, content: doc.en.content },
                { articleId: article.id, languageCode: "vi", title: doc.vi.title, content: doc.vi.content }
            ]
        });
    }

    console.log("Seeding How To Apply FAQs (Tips)...");
    const htaTips = [
        {
            displayOrder: 1,
            en: { question: "What is a Vietnam E-visa?", answer: "An electronic visa issued by the Vietnamese government. You receive a PDF approval letter to present at immigration." },
            vi: { question: "E-visa Việt Nam là gì?", answer: "Là thị thực điện tử do chính phủ Việt Nam cấp. Bạn sẽ nhận được thư chấp thuận dưới dạng PDF để xuất trình tại cửa khẩu." }
        },
        {
            displayOrder: 2,
            en: { question: "How fast can I get my visa?", answer: "Normal processing is 7 working days. Urgent options: 4 days, 2 days, 1 day, or 4 working hours depending on visa type." },
            vi: { question: "Tôi có thể nhận visa nhanh cỡ nào?", answer: "Thời gian xử lý thông thường là 7 ngày làm việc. Tùy chọn khẩn cấp: 4 ngày, 2 ngày, 1 ngày hoặc 4 giờ làm việc tùy loại visa." }
        },
        {
            displayOrder: 3,
            en: { question: "Are there additional costs?", answer: "Total = base service fee + processing surcharge + optional extras (e.g. VIP fast-track +$55). Stamping fee at airport is separate ($25 tourist / $50 business)." },
            vi: { question: "Có chi phí phát sinh không?", answer: "Tổng = phí dịch vụ cơ bản + phụ phí xử lý + dịch vụ tùy chọn (ví dụ: VIP fast-track +$55). Phí dán tem tại sân bay được tính riêng (25$ du lịch / 50$ công tác)." }
        }
    ];

    for (const tip of htaTips) {
        const faq = await prisma.faq.create({
            data: {
                category: "how-to-apply",
                question: tip.en.question,
                answer: tip.en.answer,
                displayOrder: tip.displayOrder,
                isActive: true
            }
        });
        await prisma.faqTranslation.createMany({
            data: [
                { faqId: faq.id, languageCode: "en", question: tip.en.question, answer: tip.en.answer },
                { faqId: faq.id, languageCode: "vi", question: tip.vi.question, answer: tip.vi.answer }
            ]
        });
    }

    console.log("✅ Seeded missing data successfully");
}

seedMissing()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
