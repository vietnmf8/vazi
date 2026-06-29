import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@prisma/client";
import { buildMariaDbConnectionUrl } from "./src/lib/mariadb-connection";
import "dotenv/config";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
}

const adapter = new PrismaMariaDb(buildMariaDbConnectionUrl(databaseUrl));
const prisma = new PrismaClient({ adapter });

async function seedHomeHowItWorks() {
    const value = [
        {
            step: 1,
            icon: "clipboard",
            title: {
                en: "Complete Online Form",
                vi: "Điền Đơn Trực Tuyến",
                ko: "온라인 신청서 작성"
            },
            description: {
                en: "Provide your passport details, travel dates, and select your processing time through our secure portal.",
                vi: "Cung cấp thông tin hộ chiếu, ngày đi và chọn thời gian xử lý qua cổng thông tin bảo mật.",
                ko: "보안 포털을 통해 여권 정보, 여행 날짜를 제공하고 처리 시간을 선택하세요."
            }
        },
        {
            step: 2,
            icon: "file-text",
            title: {
                en: "Upload Documents",
                vi: "Tải Lên Tài Liệu",
                ko: "서류 업로드"
            },
            description: {
                en: "Easily upload a photo of your passport data page and a recent portrait photo from your device.",
                vi: "Dễ dàng tải lên ảnh trang thông tin hộ chiếu và ảnh chân dung từ thiết bị của bạn.",
                ko: "기기에서 여권 정보 페이지 사진과 최근 인물 사진을 쉽게 업로드하세요."
            }
        },
        {
            step: 3,
            icon: "credit-card",
            title: {
                en: "Pay Securely",
                vi: "Thanh Toán An Toàn",
                ko: "안전한 결제"
            },
            description: {
                en: "Pay the service fee using Visa, Mastercard, or PayPal. All transactions are fully encrypted.",
                vi: "Thanh toán phí dịch vụ bằng Visa, Mastercard hoặc PayPal. Mọi giao dịch đều được mã hóa.",
                ko: "Visa, Mastercard 또는 PayPal을 사용하여 서비스 요금을 결제하세요. 모든 거래는 암호화됩니다."
            }
        },
        {
            step: 4,
            icon: "mail",
            title: {
                en: "Receive E-Visa",
                vi: "Nhận E-Visa",
                ko: "E-Visa 수령"
            },
            description: {
                en: "Get your approved Vietnam e-Visa via email in PDF format. Print it out and present it at immigration.",
                vi: "Nhận e-Visa Việt Nam đã được duyệt qua email dưới dạng PDF. In ra và xuất trình tại cửa khẩu.",
                ko: "승인된 베트남 e-Visa를 이메일로 PDF 형식으로 받으세요. 출력하여 출입국 심사대에서 제시하세요."
            }
        }
    ];

    await prisma.pageSetting.upsert({
        where: { key: "HOME_HOW_IT_WORKS" },
        create: { key: "HOME_HOW_IT_WORKS", value },
        update: { value },
    });
    console.log("✅ Seeded HOME_HOW_IT_WORKS to 4 steps");
}

seedHomeHowItWorks().catch(console.error).finally(() => prisma.$disconnect());
