import { PrismaClient, Prisma } from "@prisma/client";

type ActionPayload =
  | { action: "VIRTUAL_CLICK"; target: string }
  | { action: "NAVIGATION"; destination: string };

export async function seedNlpIntents(prisma: PrismaClient): Promise<void> {
    const intents: Array<{
        name: string;
        actionPayload: ActionPayload;
        utterances: { vi: string[]; en: string[] };
    }> = [
        {
            name: "navigate.apply",
            actionPayload: { action: "VIRTUAL_CLICK", target: "btn-apply-header" },
            utterances: {
                vi: [
                    "nộp đơn xin visa",
                    "tôi muốn xin visa",
                    "bắt đầu nộp đơn",
                    "làm thế nào để nộp đơn",
                    "đưa tôi đến trang nộp đơn",
                    "mở trang apply",
                    "xin visa ngay",
                    "tôi cần apply visa",
                    "bắt đầu điền đơn",
                    "điền đơn xin visa",
                    "apply visa ngay",
                    "tôi muốn bắt đầu nộp",
                    "cho tôi đến trang đăng ký",
                    "hướng dẫn nộp đơn ở đâu",
                    "làm đơn visa ở đây",
                ],
                en: [
                    "I want to apply for a visa",
                    "take me to the apply page",
                    "start application",
                    "how do I apply",
                    "apply now",
                    "begin my application",
                    "go to apply page",
                    "I need to apply",
                    "open the application form",
                    "apply for vietnam visa",
                ],
            },
        },
        {
            name: "navigate.contact",
            actionPayload: { action: "NAVIGATION", destination: "/contact-us" },
            utterances: {
                vi: [
                    "liên hệ với bạn",
                    "tôi muốn liên hệ",
                    "cho tôi số điện thoại",
                    "email liên hệ",
                    "mở trang liên hệ",
                    "tôi cần hỗ trợ",
                    "nói chuyện với người thật",
                    "làm thế nào để liên hệ",
                    "thông tin liên lạc",
                    "địa chỉ công ty",
                    "chat với nhân viên",
                    "hotline là bao nhiêu",
                    "gọi điện tư vấn",
                    "gặp tư vấn viên",
                    "liên hệ hỗ trợ",
                ],
                en: [
                    "contact us",
                    "how to contact you",
                    "I want to reach out",
                    "take me to contact page",
                    "show me contact info",
                    "get in touch",
                    "contact information",
                    "your phone number",
                    "email address",
                    "speak to a human",
                ],
            },
        },
        {
            name: "navigate.check_status",
            actionPayload: { action: "NAVIGATION", destination: "/check-status" },
            utterances: {
                vi: [
                    "kiểm tra trạng thái đơn",
                    "đơn của tôi đến đâu rồi",
                    "tra cứu hồ sơ",
                    "check status đơn",
                    "đơn visa của tôi thế nào",
                    "theo dõi đơn",
                    "tra cứu tiến độ",
                    "hồ sơ xử lý đến đâu",
                    "kiểm tra đơn hàng",
                    "status đơn của tôi",
                    "kết quả xét duyệt",
                    "visa đã được duyệt chưa",
                    "bao giờ có kết quả",
                    "tình trạng hồ sơ",
                    "đơn có được chấp nhận không",
                ],
                en: [
                    "check my application status",
                    "where is my application",
                    "track my visa",
                    "check status",
                    "what is my application status",
                    "application tracking",
                    "how is my visa processing",
                    "check my order",
                    "visa approval status",
                    "is my visa approved",
                ],
            },
        },
        {
            name: "navigate.home",
            actionPayload: { action: "NAVIGATION", destination: "/" },
            utterances: {
                vi: [
                    "về trang chủ",
                    "đưa tôi về trang chủ",
                    "trang chủ",
                    "homepage",
                    "quay về màn hình chính",
                    "mở trang chủ",
                    "đi về trang đầu",
                    "trở về trang chính",
                    "về đầu trang",
                    "vào trang chính",
                    "quay lại trang chủ",
                    "xem trang chủ",
                    "trang chủ fastvisa",
                    "màn hình chính",
                    "về home",
                ],
                en: [
                    "go to home",
                    "take me home",
                    "home page",
                    "back to home",
                    "go to homepage",
                    "open home page",
                    "main page",
                    "return to home",
                    "home screen",
                    "back to main",
                ],
            },
        },
        {
            name: "navigate.pricing",
            actionPayload: { action: "NAVIGATION", destination: "/guide/vietnam-visa-fees" },
            utterances: {
                vi: [
                    "xem bảng giá",
                    "phí visa bao nhiêu",
                    "giá visa",
                    "chi phí xin visa",
                    "bảng giá dịch vụ",
                    "tôi muốn xem giá",
                    "phí dịch vụ là bao nhiêu",
                    "giá các gói visa",
                    "xem phí",
                    "pricing",
                    "phí tổng cộng",
                    "mất bao nhiêu tiền",
                    "tốn bao nhiêu để xin visa",
                    "chi phí visa vietnam",
                    "phí dịch vụ của fastvisa",
                ],
                en: [
                    "show me pricing",
                    "how much does visa cost",
                    "visa fees",
                    "price list",
                    "what is the fee",
                    "how much is the visa",
                    "visa cost",
                    "pricing page",
                    "fees and charges",
                    "how much to apply",
                ],
            },
        },
        {
            name: "focus.quick_apply_nationality",
            actionPayload: { action: "VIRTUAL_CLICK", target: "quick_apply_nationality" },
            utterances: {
                vi: [
                    "cho tôi mở ô chọn quốc tịch trong form đăng ký nhanh",
                    "mở giúp tôi phần chọn quốc tịch để tôi nhập",
                    "tôi muốn chọn quốc tịch ở phần đăng ký nhanh",
                ],
                en: [
                    "open the nationality selection in the quick apply form",
                    "help me open the nationality section so I can type",
                    "I want to select my nationality in the quick apply section",
                ],
            },
        },
    ];

    for (const intent of intents) {
        const created = await prisma.nlpIntent.upsert({
            where: { name: intent.name },
            update: { actionPayload: intent.actionPayload as Prisma.InputJsonValue, isActive: true },
            create: {
                name: intent.name,
                actionPayload: intent.actionPayload as Prisma.InputJsonValue,
                isActive: true,
            },
        });

        // Batch create utterances, skip duplicates
        const allUtterances = [
            ...intent.utterances.vi.map((text) => ({
                intentId: created.id,
                text,
                language: "vi",
                isSeeded: true,
                usedInTraining: false,
            })),
            ...intent.utterances.en.map((text) => ({
                intentId: created.id,
                text,
                language: "en",
                isSeeded: true,
                usedInTraining: false,
            })),
        ];

        await prisma.nlpUtterance.createMany({
            data: allUtterances,
            skipDuplicates: true,
        });

        console.log(`✅ Seeded intent "${intent.name}": ${allUtterances.length} utterances`);
    }
}
