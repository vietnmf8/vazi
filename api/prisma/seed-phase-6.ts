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

async function seedPhase6() {
    console.log("Seeding Phase 6: Guide Fees Config...");

    const guideFeesData = {
        paxDiscountTiers: [
            { key: "1_person", label: { en: "1 Person", vi: "1 Người", ko: "1 명" }, multiplier: 1, discount: 0, icon: "User" },
            { key: "2_3_persons", label: { en: "2–3 Persons", vi: "2–3 Người", ko: "2–3 명" }, multiplier: 0.93, discount: 7, icon: "Users" },
            { key: "4_5_persons", label: { en: "4–5 Persons", vi: "4–5 Người", ko: "4–5 명" }, multiplier: 0.88, discount: 12, icon: "UsersRound" },
            { key: "6_plus_persons", label: { en: "6+ Persons", vi: "6+ Người", ko: "6+ 명" }, multiplier: 0.82, discount: 18, icon: "Building2" }
        ],
        disclaimer: {
            title: { en: "Service Fee vs. Government Stamping Fee — Important Distinction", vi: "Phí dịch vụ vs. Phí dán tem chính phủ — Phân biệt quan trọng", ko: "서비스 수수료 vs. 정부 스탬프 수수료 — 중요한 차이점" },
            serviceFee: { en: "Service Fee", vi: "Phí dịch vụ", ko: "서비스 수수료" },
            serviceFeeDesc: { en: " (paid online at checkout) — covers application processing, document review, and visa delivery to your email.", vi: " (thanh toán trực tuyến khi đặt hàng) — bao gồm xử lý hồ sơ, kiểm duyệt tài liệu và gửi visa qua email.", ko: " (결제 시 온라인 결제) — 신청 처리, 서류 검토 및 이메일 비자 발송을 포함합니다." },
            govFee: { en: "Government Stamping Fee", vi: "Phí dán tem chính phủ", ko: "정부 스탬프 수수료" },
            govFeeDesc1: { en: " (paid in ", vi: " (thanh toán bằng ", ko: " (" },
            govFeeDesc2: { en: "exact cash USD", vi: "tiền mặt USD chính xác", ko: "정확한 달러 현금" },
            govFeeDesc3: { en: " at Vietnamese border) — ", vi: " tại cửa khẩu Việt Nam) — ", ko: "으로 베트남 국경에서 지불) — " },
            govFeeDesc4: { en: "$25 for tourist", vi: "$25 cho du lịch", ko: "관광은 $25" },
            govFeeDesc5: { en: ", ", vi: ", ", ko: ", " },
            govFeeDesc6: { en: "$50 for business", vi: "$50 cho doanh nghiệp", ko: "비즈니스는 $50" },
            govFeeDesc7: { en: ". ATMs may not be available at land borders — please prepare cash in advance.", vi: ". Cây ATM có thể không có sẵn tại các cửa khẩu đường bộ — vui lòng chuẩn bị tiền mặt trước.", ko: ". 국경에는 ATM이 없을 수 있습니다 — 미리 현금을 준비하십시오." }
        },
        extraServices: [
            {
                id: "vip_fast_track",
                name: { en: "VIP Airport Fast-track:", vi: "Đón khách VIP tại sân bay:", ko: "VIP 공항 패스트 트랙:" },
                desc: { en: " +$55 per person", vi: " +$55 mỗi người", ko: " 1인당 +$55" }
            },
            {
                id: "car_pick_up",
                name: { en: "Car pick-up:", vi: "Xe đưa đón:", ko: "차량 픽업:" },
                desc: { en: " price varies by distance — contact support for a quote", vi: " giá thay đổi theo khoảng cách — liên hệ hỗ trợ để nhận báo giá", ko: " 거리에 따라 가격이 다릅니다 — 견적은 지원팀에 문의하십시오" }
            }
        ]
    };

    await prisma.pageSetting.upsert({
        where: { key: "guide-fees" },
        update: { value: guideFeesData },
        create: { key: "guide-fees", value: guideFeesData }
    });

    console.log("✅ Phase 6 seeding completed.");
}

seedPhase6()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
