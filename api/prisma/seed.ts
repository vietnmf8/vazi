/**
 * Seed dữ liệu lookup + giá — chạy idempotent bằng upsert để dev/prod có thể `db seed` lặp lại an toàn.
 *
 * Nguồn giá: business/docs/03_business_logic.md (base fee 7 loại, phụ phí xử lý, VIP).
 *
 * Prisma 7: bắt buộc driver adapter — dùng @prisma/adapter-mariadb (tương thích MySQL) vì Rust engine URL trong schema đã bỏ.
 */
import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import {
    PortEntryType,
    Prisma,
    PrismaClient,
    PricingRuleType,
} from "@prisma/client";
import { buildMariaDbConnectionUrl } from "../src/lib/mariadb-connection";
import { seedNlpIntents } from "./seed-nlp-intents";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
    throw new Error("DATABASE_URL bắt buộc để chạy seed");
}

const adapter = new PrismaMariaDb(buildMariaDbConnectionUrl(databaseUrl));
const prisma = new PrismaClient({ adapter });

const d = (value: string | number) => new Prisma.Decimal(value);

async function seedPricingRules() {
    // Phí cơ bản / người — key khớp visa_category + visa_type API sau này
    const baseFees: { key: string; price: Prisma.Decimal }[] = [
        { key: "E_VISA_30_DAYS_SINGLE", price: d("55") },
        { key: "E_VISA_90_DAYS_SINGLE", price: d("75") },
        { key: "E_VISA_90_DAYS_MULTIPLE", price: d("85") },
        { key: "VOA_1_MONTH_SINGLE", price: d("55") },
        { key: "VOA_1_MONTH_MULTIPLE", price: d("60") },
        { key: "VOA_3_MONTHS_SINGLE", price: d("65") },
        { key: "VOA_3_MONTHS_MULTIPLE", price: d("75") },
    ];

    for (const row of baseFees) {
        const created = await prisma.pricingRule.upsert({
            where: {
                ruleType_key: {
                    ruleType: PricingRuleType.BASE_FEE,
                    key: row.key,
                },
            },
            create: {
                ruleType: PricingRuleType.BASE_FEE,
                key: row.key,
                price: row.price,
                isActive: true,
            },
            update: { price: row.price, isActive: true },
        });

        const labels: Record<string, { en: string; vi: string }> = {
            "E_VISA_30_DAYS_SINGLE": { en: "30 Days Single Entry", vi: "30 Ngày Nhập Cảnh 1 Lần" },
            "E_VISA_90_DAYS_SINGLE": { en: "90 Days Single Entry", vi: "90 Ngày Nhập Cảnh 1 Lần" },
            "E_VISA_90_DAYS_MULTIPLE": { en: "90 Days Multiple Entry", vi: "90 Ngày Nhập Cảnh Nhiều Lần" },
            "VOA_1_MONTH_SINGLE": { en: "1 Month Single Entry", vi: "1 Tháng Nhập Cảnh 1 Lần" },
            "VOA_1_MONTH_MULTIPLE": { en: "1 Month Multiple Entry", vi: "1 Tháng Nhập Cảnh Nhiều Lần" },
            "VOA_3_MONTHS_SINGLE": { en: "3 Months Single Entry", vi: "3 Tháng Nhập Cảnh 1 Lần" },
            "VOA_3_MONTHS_MULTIPLE": { en: "3 Months Multiple Entry", vi: "3 Tháng Nhập Cảnh Nhiều Lần" },
        };

        const t = labels[row.key];
        if (t) {
            for (const lang of ["en", "vi"]) {
                await prisma.pricingRuleTranslation.upsert({
                    where: { pricingRuleId_languageCode: { pricingRuleId: created.id, languageCode: lang } },
                    create: { pricingRuleId: created.id, languageCode: lang, name: lang === "en" ? t.en : t.vi },
                    update: { name: lang === "en" ? t.en : t.vi },
                });
            }
        }
    }

    // Phụ phí xử lý — key tách nhánh 30 vs 90 ngày vì mức giá khác nhau (mục 3 doc)
    const processing: { key: string; price: Prisma.Decimal }[] = [
        { key: "NORMAL", price: d("0") },
        { key: "URGENT_4WD_30", price: d("35") },
        { key: "URGENT_4WD_90", price: d("45") },
        { key: "URGENT_3WD_30", price: d("45") },
        { key: "URGENT_3WD_90", price: d("55") },
        { key: "URGENT_2WD_30", price: d("65") },
        { key: "URGENT_2WD_90", price: d("75") },
        { key: "URGENT_1WD", price: d("125") },
        { key: "URGENT_4WH", price: d("125") },
        { key: "URGENT_2WH", price: d("195") },
        { key: "URGENT_1WH", price: d("250") },
        { key: "LAST_MINUTE_HOLIDAY", price: d("295") },
    ];

    for (const row of processing) {
        const created = await prisma.pricingRule.upsert({
            where: {
                ruleType_key: {
                    ruleType: PricingRuleType.PROCESSING_TIME,
                    key: row.key,
                },
            },
            create: {
                ruleType: PricingRuleType.PROCESSING_TIME,
                key: row.key,
                price: row.price,
                isActive: true,
            },
            update: { price: row.price, isActive: true },
        });

        const procLabels: Record<string, { en: string; vi: string; expectedTime?: string }> = {
            "NORMAL": { en: "Normal · 7 Working Days", vi: "Bình thường · 7 ngày làm việc" },
            "URGENT_4WD_30": { en: "Urgent · 4 Working Days", vi: "Khẩn cấp · 4 ngày làm việc", expectedTime: "Results returned at 5:30 PM after 4 working days, after application receipt" },
            "URGENT_4WD_90": { en: "Urgent · 4 Working Days", vi: "Khẩn cấp · 4 ngày làm việc", expectedTime: "Results returned at 5:30 PM after 4 working days, after application receipt" },
            "URGENT_3WD_30": { en: "Urgent · 3 Working Days", vi: "Khẩn cấp · 3 ngày làm việc", expectedTime: "Results returned at 5:30 PM after 3 working days, after application receipt" },
            "URGENT_3WD_90": { en: "Urgent · 3 Working Days", vi: "Khẩn cấp · 3 ngày làm việc", expectedTime: "Results returned at 5:30 PM after 3 working days, after application receipt" },
            "URGENT_2WD_30": { en: "Urgent · 2 Working Days", vi: "Khẩn cấp · 2 ngày làm việc", expectedTime: "Results returned at 5:30 PM after 2 working days, after application receipt" },
            "URGENT_2WD_90": { en: "Urgent · 2 Working Days", vi: "Khẩn cấp · 2 ngày làm việc", expectedTime: "Results returned at 5:30 PM after 2 working days, after application receipt" },
            "URGENT_1WD": { en: "Urgent · 1 Working Day", vi: "Khẩn cấp · 1 ngày làm việc", expectedTime: "Results returned at 5:30 PM after 1 working day, after application receipt" },
            "URGENT_4WH": { en: "Urgent · 4 Working Hours", vi: "Khẩn cấp · 4 giờ làm việc", expectedTime: "Results returned at 12:00 PM (applications received before 8:00 AM) or 5:30 PM (received before 2:00 PM)" },
            "URGENT_2WH": { en: "Urgent · 2 Working Hours", vi: "Khẩn cấp · 2 giờ làm việc", expectedTime: "Results returned 2 hours after application receipt" },
            "URGENT_1WH": { en: "Urgent · 1 Working Hour", vi: "Khẩn cấp · 1 giờ làm việc", expectedTime: "Results returned 1 hour after application receipt" },
            "LAST_MINUTE_HOLIDAY": { en: "Last Minute / Holiday", vi: "Giờ chót / Ngày lễ", expectedTime: "Results returned in 30-60 minutes" },
        };

        const pt = procLabels[row.key];
        if (pt) {
            for (const lang of ["en", "vi"]) {
                await prisma.pricingRuleTranslation.upsert({
                    where: { pricingRuleId_languageCode: { pricingRuleId: created.id, languageCode: lang } },
                    create: { pricingRuleId: created.id, languageCode: lang, name: lang === "en" ? pt.en : pt.vi },
                    update: { name: lang === "en" ? pt.en : pt.vi },
                });
            }
        }
    }

    await prisma.pricingRule.upsert({
        where: {
            ruleType_key: {
                ruleType: PricingRuleType.EXTRA_SERVICE,
                key: "VIP_FAST_TRACK",
            },
        },
        create: {
            ruleType: PricingRuleType.EXTRA_SERVICE,
            key: "VIP_FAST_TRACK",
            price: d("55"),
            isActive: true,
        },
        update: { price: d("55"), isActive: true },
    });
}

async function seedNationalities() {
    /** Quốc gia phổ biến + exemption mẫu — điều chỉnh theo chính sách thật khi go-live */
    const rows: {
        countryName: string;
        countryCode: string;

        exemptionDays: number;
    }[] = [
        {
            countryName: "United States",
            countryCode: "US",

            exemptionDays: 0,
        },
        {
            countryName: "United Kingdom",
            countryCode: "GB",

            exemptionDays: 0,
        },
        {
            countryName: "Canada",
            countryCode: "CA",

            exemptionDays: 0,
        },
        {
            countryName: "Australia",
            countryCode: "AU",

            exemptionDays: 0,
        },
        {
            countryName: "New Zealand",
            countryCode: "NZ",

            exemptionDays: 0,
        },
        {
            countryName: "India",
            countryCode: "IN",

            exemptionDays: 0,
        },
        {
            countryName: "China",
            countryCode: "CN",

            exemptionDays: 0,
        },
        {
            countryName: "Japan",
            countryCode: "JP",

            exemptionDays: 0,
        },
        {
            countryName: "South Korea",
            countryCode: "KR",

            exemptionDays: 0,
        },
        {
            countryName: "Singapore",
            countryCode: "SG",

            exemptionDays: 30,
        },
        {
            countryName: "Malaysia",
            countryCode: "MY",

            exemptionDays: 30,
        },
        {
            countryName: "Thailand",
            countryCode: "TH",

            exemptionDays: 30,
        },
        {
            countryName: "Indonesia",
            countryCode: "ID",

            exemptionDays: 30,
        },
        {
            countryName: "Philippines",
            countryCode: "PH",

            exemptionDays: 21,
        },
        {
            countryName: "Germany",
            countryCode: "DE",

            exemptionDays: 45,
        },
        {
            countryName: "France",
            countryCode: "FR",

            exemptionDays: 45,
        },
        {
            countryName: "Italy",
            countryCode: "IT",

            exemptionDays: 45,
        },
        {
            countryName: "Spain",
            countryCode: "ES",

            exemptionDays: 15,
        },
        {
            countryName: "Netherlands",
            countryCode: "NL",

            exemptionDays: 45,
        },
        {
            countryName: "Sweden",
            countryCode: "SE",

            exemptionDays: 45,
        },
        {
            countryName: "Norway",
            countryCode: "NO",

            exemptionDays: 45,
        },
        {
            countryName: "Denmark",
            countryCode: "DK",

            exemptionDays: 45,
        },
        {
            countryName: "Finland",
            countryCode: "FI",

            exemptionDays: 15,
        },
        {
            countryName: "Poland",
            countryCode: "PL",

            exemptionDays: 15,
        },
        {
            countryName: "Russia",
            countryCode: "RU",

            exemptionDays: 15,
        },
        {
            countryName: "Brazil",
            countryCode: "BR",

            exemptionDays: 15,
        },
        {
            countryName: "Mexico",
            countryCode: "MX",

            exemptionDays: 15,
        },
        {
            countryName: "United Arab Emirates",
            countryCode: "AE",

            exemptionDays: 15,
        },
        {
            countryName: "Saudi Arabia",
            countryCode: "SA",

            exemptionDays: 0,
        },
        {
            countryName: "South Africa",
            countryCode: "ZA",

            exemptionDays: 0,
        },
        {
            countryName: "Vietnam",
            countryCode: "VN",

            exemptionDays: 0,
        },
        {
            countryName: "Israel",
            countryCode: "IL",

            exemptionDays: 45,
        },
        {
            countryName: "Turkey",
            countryCode: "TR",

            exemptionDays: 15,
        },
        {
            countryName: "Czech Republic",
            countryCode: "CZ",

            exemptionDays: 15,
        },
        {
            countryName: "Switzerland",
            countryCode: "CH",

            exemptionDays: 15,
        },
        {
            countryName: "Venezuela",
            countryCode: "VE",
            exemptionDays: 0,
        },
    ];

    for (const row of rows) {
        await prisma.nationality.upsert({
            where: { countryCode: row.countryCode },
            create: {
                countryName: row.countryName,
                countryCode: row.countryCode,

                exemptionDays: row.exemptionDays,
            },
            update: {
                countryName: row.countryName,

                exemptionDays: row.exemptionDays,
            },
        });
    }
}

async function seedPorts() {
    /** Các sân bay quốc tế VN thường dùng làm cửa khẩu nhập cảnh */
    const airports: { code: string; name: string }[] = [
        {
            code: "SGN",
            name: "Tan Son Nhat International Airport (Ho Chi Minh City)",
        },
        { code: "HAN", name: "Noi Bai International Airport (Hanoi)" },
        { code: "DAD", name: "Da Nang International Airport" },
        { code: "CXR", name: "Cam Ranh International Airport (Nha Trang)" },
        { code: "PQC", name: "Phu Quoc International Airport" },
        { code: "HPH", name: "Cat Bi International Airport (Hai Phong)" },
        { code: "VCA", name: "Can Tho International Airport" },
        { code: "BMV", name: "Buon Ma Thuot Airport" },
        { code: "VCL", name: "Chu Lai Airport" },
        { code: "VII", name: "Vinh International Airport" },
        { code: "THD", name: "Tho Xuan Airport (Thanh Hoa)" },
        { code: "VDO", name: "Van Don International Airport (Quang Ninh)" },
        { code: "TBB", name: "Phu Cat Airport (Quy Nhon)" },
        { code: "HUI", name: "Phu Bai International Airport (Hue)" },
        { code: "DLI", name: "Lien Khuong Airport (Da Lat)" },
    ];

    for (const ap of airports) {
        await prisma.port.upsert({
            where: { code: ap.code },
            create: {
                code: ap.code,
                name: ap.name,
                portType: PortEntryType.AIRPORT,
                isActive: true,
            },
            update: {
                name: ap.name,
                portType: PortEntryType.AIRPORT,
                isActive: true,
            },
        });
    }

    const borderGates: { code: string; name: string }[] = [
        { code: "MOCBAI", name: "Moc Bai International Border Gate (Tay Ninh)" },
        { code: "LAOBAO", name: "Lao Bao International Border Gate (Quang Tri)" },
    ];

    for (const bg of borderGates) {
        await prisma.port.upsert({
            where: { code: bg.code },
            create: {
                code: bg.code,
                name: bg.name,
                portType: PortEntryType.BORDER_GATE,
                isActive: true,
            },
            update: {
                name: bg.name,
                portType: PortEntryType.BORDER_GATE,
                isActive: true,
            },
        });
    }
}

/**
 * Seed dữ liệu EligibilityRule và Translation cho các quốc tịch phổ biến.
 * Đây là dữ liệu cốt lõi phục vụ QuickApplyForm hiển thị ghi chú theo nationality.
 */
async function seedEligibilityRules() {
    const rules: {
        countryCode: string;
        en: { status: string; stay: string; fee: string; processing: string; requirements: string[]; note: string };
        vi: { status: string; stay: string; fee: string; processing: string; requirements: string[]; note: string };
    }[] = [
        {
            countryCode: "US",
            en: { status: "E-Visa Required", stay: "Up to 90 days", fee: "$75 \u2013 $85 USD", processing: "3-5 business days", requirements: ["Valid passport (6+ months)", "Passport photo", "Return ticket"], note: "US passport holders can apply for a 90-day multiple-entry e-Visa." },
            vi: { status: "C\u1ea7n E-Visa", stay: "T\u1ed1i \u0111a 90 ng\u00e0y", fee: "$75 \u2013 $85 USD", processing: "3-5 ng\u00e0y l\u00e0m vi\u1ec7c", requirements: ["H\u1ed9 chi\u1ebfu c\u00f2n h\u1ea1n tr\u00ean 6 th\u00e1ng", "\u1ea2nh h\u1ed9 chi\u1ebfu", "V\u00e9 kh\u1ee9 h\u1ed3i"], note: "H\u1ed9 chi\u1ebfu M\u1ef9 c\u00f3 th\u1ec3 xin E-Visa 90 ng\u00e0y nhi\u1ec1u l\u1ea7n nh\u1eadp c\u1ea3nh." },
        },
        {
            countryCode: "GB",
            en: { status: "Visa-free (45 days)", stay: "45 days", fee: "Free", processing: "No visa needed", requirements: ["Valid UK passport"], note: "UK citizens can enter Vietnam visa-free for up to 45 days." },
            vi: { status: "Mi\u1ec5n th\u1ecb th\u1ef1c (45 ng\u00e0y)", stay: "45 ng\u00e0y", fee: "Mi\u1ec5n ph\u00ed", processing: "Kh\u00f4ng c\u1ea7n visa", requirements: ["H\u1ed9 chi\u1ebfu Anh c\u00f2n hi\u1ec7u l\u1ef1c"], note: "C\u00f4ng d\u00e2n Anh \u0111\u01b0\u1ee3c mi\u1ec5n th\u1ecb th\u1ef1c v\u00e0o Vi\u1ec7t Nam t\u1ed1i \u0111a 45 ng\u00e0y." },
        },
        {
            countryCode: "CN",
            en: { status: "E-Visa Required", stay: "Up to 90 days", fee: "$55 \u2013 $85 USD", processing: "3-5 business days", requirements: ["Valid passport (6+ months)", "Passport photo"], note: "Chinese citizens can apply for a single or multiple-entry e-Visa up to 90 days." },
            vi: { status: "C\u1ea7n E-Visa", stay: "T\u1ed1i \u0111a 90 ng\u00e0y", fee: "$55 \u2013 $85 USD", processing: "3-5 ng\u00e0y l\u00e0m vi\u1ec7c", requirements: ["H\u1ed9 chi\u1ebfu c\u00f2n h\u1ea1n tr\u00ean 6 th\u00e1ng", "\u1ea2nh h\u1ed9 chi\u1ebfu"], note: "C\u00f4ng d\u00e2n Trung Qu\u1ed1c c\u00f3 th\u1ec3 xin E-Visa \u0111\u01a1n ho\u1eb7c nhi\u1ec1u l\u1ea7n nh\u1eadp c\u1ea3nh t\u1ed1i \u0111a 90 ng\u00e0y." },
        },
        {
            countryCode: "JP",
            en: { status: "Visa-free (45 days)", stay: "45 days", fee: "Free", processing: "No visa needed", requirements: ["Valid Japanese passport"], note: "Japanese citizens can enter Vietnam visa-free for up to 45 days." },
            vi: { status: "Mi\u1ec5n th\u1ecb th\u1ef1c (45 ng\u00e0y)", stay: "45 ng\u00e0y", fee: "Mi\u1ec5n ph\u00ed", processing: "Kh\u00f4ng c\u1ea7n visa", requirements: ["H\u1ed9 chi\u1ebfu Nh\u1eadt c\u00f2n hi\u1ec7u l\u1ef1c"], note: "C\u00f4ng d\u00e2n Nh\u1eadt B\u1ea3n \u0111\u01b0\u1ee3c mi\u1ec5n th\u1ecb th\u1ef1c v\u00e0o Vi\u1ec7t Nam t\u1ed1i \u0111a 45 ng\u00e0y." },
        },
        {
            countryCode: "KR",
            en: { status: "Visa-free (45 days)", stay: "45 days", fee: "Free", processing: "No visa needed", requirements: ["Valid South Korean passport"], note: "South Korean citizens can enter Vietnam visa-free for up to 45 days." },
            vi: { status: "Mi\u1ec5n th\u1ecb th\u1ef1c (45 ng\u00e0y)", stay: "45 ng\u00e0y", fee: "Mi\u1ec5n ph\u00ed", processing: "Kh\u00f4ng c\u1ea7n visa", requirements: ["H\u1ed9 chi\u1ebfu H\u00e0n Qu\u1ed1c c\u00f2n hi\u1ec7u l\u1ef1c"], note: "C\u00f4ng d\u00e2n H\u00e0n Qu\u1ed1c \u0111\u01b0\u1ee3c mi\u1ec5n th\u1ecb th\u1ef1c v\u00e0o Vi\u1ec7t Nam t\u1ed1i \u0111a 45 ng\u00e0y." },
        },
        {
            countryCode: "SG",
            en: { status: "Visa-free (30 days)", stay: "30 days", fee: "Free", processing: "No visa needed", requirements: ["Valid Singapore passport"], note: "Singapore citizens can enter Vietnam visa-free for up to 30 days." },
            vi: { status: "Mi\u1ec5n th\u1ecb th\u1ef1c (30 ng\u00e0y)", stay: "30 ng\u00e0y", fee: "Mi\u1ec5n ph\u00ed", processing: "Kh\u00f4ng c\u1ea7n visa", requirements: ["H\u1ed9 chi\u1ebfu Singapore c\u00f2n hi\u1ec7u l\u1ef1c"], note: "C\u00f4ng d\u00e2n Singapore \u0111\u01b0\u1ee3c mi\u1ec5n th\u1ecb th\u1ef1c v\u00e0o Vi\u1ec7t Nam t\u1ed1i \u0111a 30 ng\u00e0y." },
        },
        {
            countryCode: "AU",
            en: { status: "E-Visa Required", stay: "Up to 90 days", fee: "$75 \u2013 $85 USD", processing: "3-5 business days", requirements: ["Valid passport (6+ months)", "Passport photo"], note: "Australian citizens can apply for a 90-day e-Visa for tourism or business." },
            vi: { status: "C\u1ea7n E-Visa", stay: "T\u1ed1i \u0111a 90 ng\u00e0y", fee: "$75 \u2013 $85 USD", processing: "3-5 ng\u00e0y l\u00e0m vi\u1ec7c", requirements: ["H\u1ed9 chi\u1ebfu c\u00f2n h\u1ea1n tr\u00ean 6 th\u00e1ng", "\u1ea2nh h\u1ed9 chi\u1ebfu"], note: "C\u00f4ng d\u00e2n \u00dac c\u00f3 th\u1ec3 xin E-Visa 90 ng\u00e0y cho m\u1ee5c \u0111\u00edch du l\u1ecbch ho\u1eb7c kinh doanh." },
        },
        {
            countryCode: "CA",
            en: { status: "E-Visa Required", stay: "Up to 90 days", fee: "$75 \u2013 $85 USD", processing: "3-5 business days", requirements: ["Valid passport (6+ months)", "Passport photo"], note: "Canadian citizens can apply for a 90-day e-Visa." },
            vi: { status: "C\u1ea7n E-Visa", stay: "T\u1ed1i \u0111a 90 ng\u00e0y", fee: "$75 \u2013 $85 USD", processing: "3-5 ng\u00e0y l\u00e0m vi\u1ec7c", requirements: ["H\u1ed9 chi\u1ebfu c\u00f2n h\u1ea1n tr\u00ean 6 th\u00e1ng", "\u1ea2nh h\u1ed9 chi\u1ebfu"], note: "C\u00f4ng d\u00e2n Canada c\u00f3 th\u1ec3 xin E-Visa 90 ng\u00e0y." },
        },
        {
            countryCode: "DE",
            en: { status: "Visa-free (45 days)", stay: "45 days", fee: "Free", processing: "No visa needed", requirements: ["Valid German passport"], note: "German citizens can enter Vietnam visa-free for up to 45 days." },
            vi: { status: "Mi\u1ec5n th\u1ecb th\u1ef1c (45 ng\u00e0y)", stay: "45 ng\u00e0y", fee: "Mi\u1ec5n ph\u00ed", processing: "Kh\u00f4ng c\u1ea7n visa", requirements: ["H\u1ed9 chi\u1ebfu \u0110\u1ee9c c\u00f2n hi\u1ec7u l\u1ef1c"], note: "C\u00f4ng d\u00e2n \u0110\u1ee9c \u0111\u01b0\u1ee3c mi\u1ec5n th\u1ecb th\u1ef1c v\u00e0o Vi\u1ec7t Nam t\u1ed1i \u0111a 45 ng\u00e0y." },
        },
        {
            countryCode: "FR",
            en: { status: "Visa-free (45 days)", stay: "45 days", fee: "Free", processing: "No visa needed", requirements: ["Valid French passport"], note: "French citizens can enter Vietnam visa-free for up to 45 days." },
            vi: { status: "Mi\u1ec5n th\u1ecb th\u1ef1c (45 ng\u00e0y)", stay: "45 ng\u00e0y", fee: "Mi\u1ec5n ph\u00ed", processing: "Kh\u00f4ng c\u1ea7n visa", requirements: ["H\u1ed9 chi\u1ebfu Ph\u00e1p c\u00f2n hi\u1ec7u l\u1ef1c"], note: "C\u00f4ng d\u00e2n Ph\u00e1p \u0111\u01b0\u1ee3c mi\u1ec5n th\u1ecb th\u1ef1c v\u00e0o Vi\u1ec7t Nam t\u1ed1i \u0111a 45 ng\u00e0y." },
        },
        {
            countryCode: "IN",
            en: { status: "E-Visa Required", stay: "Up to 30 days", fee: "$55 \u2013 $60 USD", processing: "3-5 business days", requirements: ["Valid passport (6+ months)", "Passport photo"], note: "Indian citizens need to apply for a 30-day e-Visa. Visa on Arrival is also available." },
            vi: { status: "C\u1ea7n E-Visa", stay: "T\u1ed1i \u0111a 30 ng\u00e0y", fee: "$55 \u2013 $60 USD", processing: "3-5 ng\u00e0y l\u00e0m vi\u1ec7c", requirements: ["H\u1ed9 chi\u1ebfu c\u00f2n h\u1ea1n tr\u00ean 6 th\u00e1ng", "\u1ea2nh h\u1ed9 chi\u1ebfu"], note: "C\u00f4ng d\u00e2n \u1ea4n \u0110\u1ed9 c\u1ea7n xin E-Visa 30 ng\u00e0y. Visa t\u1ea1i c\u1eeda kh\u1ea9u c\u0169ng c\u00f3 s\u1eb5n." },
        },
    ];

    for (const rule of rules) {
        const created = await prisma.eligibilityRule.upsert({
            where: { countryCode: rule.countryCode },
            create: { countryCode: rule.countryCode, isActive: true },
            update: { isActive: true },
        });

        for (const [lang, trans] of Object.entries({ en: rule.en, vi: rule.vi })) {
            await prisma.eligibilityRuleTranslation.upsert({
                where: {
                    eligibilityRuleId_languageCode: {
                        eligibilityRuleId: created.id,
                        languageCode: lang,
                    },
                },
                create: {
                    eligibilityRuleId: created.id,
                    languageCode: lang,
                    status: trans.status,
                    stay: trans.stay,
                    fee: trans.fee,
                    processing: trans.processing,
                    requirements: trans.requirements,
                    note: trans.note,
                },
                update: {
                    status: trans.status,
                    stay: trans.stay,
                    fee: trans.fee,
                    processing: trans.processing,
                    requirements: trans.requirements,
                    note: trans.note,
                },
            });
        }
    }
    console.log(`✅ Seeded ${rules.length} eligibility rules`);
}

async function seedGlobalSiteSettings(): Promise<void> {
    const settings: { key: string; value: Prisma.InputJsonValue }[] = [
        { key: "SITE_HOTLINE", value: "+84.96.5800.392" },
        { key: "SITE_HOTLINE_TEL", value: "+84-96-580-0392" },
        { key: "SITE_EMAIL", value: "thanhdatvietnamvisa@gmail.com" },
        { key: "SITE_WHATSAPP_URL", value: "https://wa.me/84965800392" },
        { key: "SITE_ADDRESS", value: { district: "Cau Giay District", city: "Hanoi, Vietnam" } },
        {
            key: "SITE_SOCIAL_LINKS",
            value: [
                { platform: "facebook", url: "https://facebook.com", label: "Facebook" },
                { platform: "whatsapp", url: "https://wa.me/84965800392", label: "WhatsApp" },
            ],
        },
        {
            key: "SITE_HEADER_NAV",
            value: [
                { href: "/guide", translations: { en: "Guide", vi: "Hướng dẫn", ko: "안내" } },
                { href: "/how-to-apply", translations: { en: "How to Apply", vi: "Cách đăng ký", ko: "신청 방법" } },
                { href: "/guide/vietnam-visa-fees", translations: { en: "Visa Fees", vi: "Phí Visa", ko: "비자 수수료" } },
                { href: "/faqs", translations: { en: "FAQs", vi: "Câu hỏi thường gặp", ko: "자주 묻는 질문" } },
                { href: "/about-us", translations: { en: "About Us", vi: "Về chúng tôi", ko: "회사 소개" } },
                { href: "/emergency-inquiry", translations: { en: "Emergency", vi: "Khẩn cấp", ko: "긴급 문의" } },
            ]
        },
        {
            key: "SITE_FOOTER_QUICK_LINKS",
            value: [
                { href: "/apply", translations: { en: "Apply Online", vi: "Đăng ký ngay", ko: "온라인 신청" } },
                { href: "/check-status", translations: { en: "Check Status", vi: "Kiểm tra trạng thái", ko: "상태 확인" } },
                { href: "/guide/vietnam-visa-fees", translations: { en: "Visa Fees", vi: "Phí Visa", ko: "비자 수수료" } },
            ]
        },
        {
            key: "SITE_FOOTER_GUIDE_LINKS",
            value: [
                { href: "/how-to-apply", translations: { en: "How to Apply", vi: "Cách đăng ký", ko: "신청 방법" } },
                { href: "/faqs", translations: { en: "FAQs", vi: "Câu hỏi thường gặp", ko: "자주 묻는 질문" } },
                { href: "/guide", translations: { en: "Extra Services", vi: "Dịch vụ bổ sung", ko: "부가 서비스" } },
            ]
        }
    ];

    for (const s of settings) {
        await prisma.globalSetting.upsert({
            where: { key: s.key },
            create: { key: s.key, value: s.value },
            update: { value: s.value },
        });
    }
    console.log("✅ Seeded global site settings (Phase 9)");
}

async function seedHomeHowItWorks(): Promise<void> {
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
    console.log("✅ Seeded HOME_HOW_IT_WORKS (Phase 1)");
}

async function seedContactUsPageSettings(): Promise<void> {
    const value = {
        email: "thanhdatvietnamvisa@gmail.com",
        hotline: "+84.96.5800.392",
        hotline_tel: "+84-96-580-0392",
        whatsapp_url: "https://wa.me/84965800392",
        address: {
            district: "Cau Giay District",
            city: "Hanoi, Vietnam",
        },
        working_hours: "24/7 cho các trường hợp khẩn cấp",
    };

    await prisma.pageSetting.upsert({
        where: { key: "contact-us" },
        create: { key: "contact-us", value },
        update: { value },
    });
    console.log("✅ Seeded contact-us page settings");
}

async function main() {
    await seedPricingRules();
    await seedNationalities();
    await seedPorts();
    await seedEligibilityRules();
    await seedGuideArticles();
    await seedFaqs(); // Added for FAQs
    await seedVisaExemptionCountries();
    await seedGlobalSiteSettings(); // Phase 9
    await seedHomePageSettings(); // Phase 2
    await seedAboutUsPageSettings(); // Phase 3
    await seedTeamMembers(); // Phase 3
    await seedEmergencyInquiryPageSettings(); // Phase 4
    await seedHomeHowItWorks(); // Phase 1 Master Plan
    await seedContactUsPageSettings(); // Ưu Tiên 1 — contact info dynamic
    await seedNlpIntents(prisma); // NLP Intent Cache seeding
    await seedReels(); // Seeding Reels
}

async function seedHomePageSettings(): Promise<void> {
    const value = {
        hero: {
            en: {
                eyebrow: "Official eVisa Portal",
                headline_1: "Apply for your",
                headline_2: "Vietnam E-Visa",
                headline_3: "Online",
                subheadline_1: "Get your visa to Vietnam fast and securely.",
                subheadline_2: "100% money-back",
                subheadline_3: "if rejected.",
                apply_now: "Apply Now",
                check_status: "Check Status",
                stat_1_value: "150,000+",
                stat_1_label: "Visas Approved",
                stat_2_value: "24h",
                stat_2_label: "Fastest Processing",
                stat_3_value: "4.9★",
                stat_3_label: "Trustpilot Score"
            },
            vi: {
                eyebrow: "Cổng E-Visa Chính Thức",
                headline_1: "Đăng ký xin",
                headline_2: "E-Visa Việt Nam",
                headline_3: "Trực tuyến",
                subheadline_1: "Nhận visa Việt Nam nhanh chóng và an toàn.",
                subheadline_2: "Hoàn tiền 100%",
                subheadline_3: "nếu bị từ chối.",
                apply_now: "Đăng ký ngay",
                check_status: "Kiểm tra",
                stat_1_value: "150,000+",
                stat_1_label: "Visa đã cấp",
                stat_2_value: "24h",
                stat_2_label: "Xử lý nhanh nhất",
                stat_3_value: "4.9★",
                stat_3_label: "Điểm Trustpilot"
            },
            ko: {
                eyebrow: "공식 E-Visa 포털",
                headline_1: "온라인으로",
                headline_2: "베트남 E-Visa",
                headline_3: "신청하기",
                subheadline_1: "빠르고 안전하게 베트남 비자를 받으세요.",
                subheadline_2: "거절 시 100% 환불",
                subheadline_3: "보장.",
                apply_now: "지금 신청",
                check_status: "진행 상황 확인",
                stat_1_value: "150,000+",
                stat_1_label: "비자 발급 완료",
                stat_2_value: "24h",
                stat_2_label: "가장 빠른 처리",
                stat_3_value: "4.9★",
                stat_3_label: "트러스트파일럿 평점"
            }
        },
        trustSignals: {
            en: {
                title: "Trusted by Travelers Worldwide",
                stat_1: "Visas Approved",
                stat_2: "Fastest Processing",
                stat_3: "Trustpilot Score",
                stat_4: "Countries Supported"
            },
            vi: {
                title: "Được tin dùng bởi du khách toàn cầu",
                stat_1: "Visa đã cấp",
                stat_2: "Xử lý nhanh nhất",
                stat_3: "Điểm Trustpilot",
                stat_4: "Quốc gia hỗ trợ"
            },
            ko: {
                title: "전 세계 여행자들이 신뢰하는 서비스",
                stat_1: "비자 발급 완료",
                stat_2: "가장 빠른 처리",
                stat_3: "트러스트파일럿 평점",
                stat_4: "지원 국가"
            }
        },
        howItWorks: {
            en: {
                title: "How It Works",
                desc: "Get your Vietnam e-Visa in 3 simple steps"
            },
            vi: {
                title: "Quy trình thực hiện",
                desc: "Nhận e-Visa Việt Nam chỉ với 3 bước đơn giản"
            },
            ko: {
                title: "신청 방법",
                desc: "단 3단계로 베트남 e-Visa를 받으세요"
            }
        },
        pricingPreview: {
            en: {
                title: "Clear & Transparent Pricing",
                desc: "Choose the processing time that fits your travel schedule. No hidden fees.",
                best_value: "Best Value",
                popular: "Popular",
                per_person: "per person",
                apply_btn: "Apply Now",
                see_full_pricing: "See full pricing & add-ons"
            },
            vi: {
                title: "Bảng giá minh bạch",
                desc: "Chọn thời gian xử lý phù hợp với lịch trình của bạn. Không phí ẩn.",
                best_value: "Khuyên dùng",
                popular: "Phổ biến",
                per_person: "mỗi người",
                apply_btn: "Đăng ký ngay",
                see_full_pricing: "Xem toàn bộ bảng giá & dịch vụ"
            },
            ko: {
                title: "투명하고 명확한 가격",
                desc: "여행 일정에 맞는 처리 시간을 선택하세요. 숨겨진 수수료가 없습니다.",
                best_value: "최고의 선택",
                popular: "인기",
                per_person: "1인당",
                apply_btn: "지금 신청",
                see_full_pricing: "전체 가격 및 부가 서비스 보기"
            }
        }
    };

    await prisma.pageSetting.upsert({
        where: { key: "home" },
        create: { key: "home", value },
        update: { value },
    });
    console.log("✅ Seeded home page settings");
}

/**
 * Seed data News Posts based on NEWS_POSTS mock
 */
async function seedNewsPosts(): Promise<void> {
    /*
    const category = await prisma.postCategory.upsert({
        where: { slug: "news" },
        create: { name: "News", slug: "news" },
        update: {},
    });
    */

    const newsData = [
        {
            slug: "vietnam-evisa-2026-updates",
            title: "Vietnam E-Visa Policy Updates for 2026",
            excerpt: "Latest changes to eligible nationalities and maximum stay duration for e-visa holders.",
            imageAlt: "Vietnam passport stamp",
            content: "<h2>What's new</h2><p>Several nationalities were added to the e-visa program in early 2026. Maximum stay rules for 90-day multiple-entry visas remain unchanged.</p><h2>Who is affected</h2><p>Travelers from newly eligible countries can now apply online without visiting an embassy. Check our eligibility widget before booking flights.</p>",
            date: "2026-03-15T00:00:00Z"
        },
        {
            slug: "urgent-processing-guide",
            title: "When to Choose Urgent Visa Processing",
            excerpt: "Compare 4-day, 2-day, and 1-day urgent options to pick the right speed for your trip.",
            imageAlt: "Airport departure board",
            content: "<h2>4-day urgent</h2><p>Best when you travel within one week and have complete documents ready.</p><h2>1-day and same-day options</h2><p>Available for most visa types at higher surcharge. Submit before 2 PM Hanoi time for same-day review.</p>",
            date: "2026-03-08T00:00:00Z"
        },
        {
            slug: "vip-fast-track-benefits",
            title: "VIP Fast-Track at Vietnam Airports",
            excerpt: "Save time at immigration with our VIP meet-and-greet service at major hubs.",
            imageAlt: "Airport VIP lounge",
            content: "<h2>Included airports</h2><p>Tan Son Nhat (SGN), Noi Bai (HAN), and Da Nang (DAD) offer VIP fast-track for +$55 per person.</p>",
            date: "2026-02-28T00:00:00Z"
        },
        {
            slug: "document-photo-requirements",
            title: "Portrait Photo Requirements Explained",
            excerpt: "Avoid rejections with the correct photo size, background, and lighting guidelines.",
            imageAlt: "Passport photo example",
            content: "<h2>Technical specs</h2><p>White background, neutral expression, no glasses glare. Minimum 4x6 cm equivalent digital size.</p>",
            date: "2026-02-20T00:00:00Z"
        },
        {
            slug: "multi-applicant-family-trips",
            title: "Applying for Family Groups Online",
            excerpt: "How to submit one order for multiple travelers and track each application status.",
            imageAlt: "Family at airport",
            content: "<h2>How it works</h2><p>Select applicant count in Step 1, then complete a separate form card per person in Step 2. One payment covers the entire group.</p>",
            date: "2026-02-12T00:00:00Z"
        },
        {
            slug: "payment-security-faq",
            title: "How We Protect Your Payment Data",
            excerpt: "PCI-compliant checkout, PayPal integration, and what appears on your bank statement.",
            imageAlt: "Secure payment icon",
            content: "<h2>Security measures</h2><p>We use industry-standard SSL and never store full card numbers. PayPal checkout adds an extra layer of buyer protection.</p>",
            date: "2026-02-05T00:00:00Z"
        }
    ];

    for (const news of newsData) {
        /*
        await prisma.post.upsert({
            where: { slug: news.slug },
            create: {
                categoryId: category.id,
                title: news.title,
                slug: news.slug,
                content: news.content,
                isPublished: true,
                thumbnailUrl: "/images/news/placeholder.jpg",
                createdAt: new Date(news.date)
            },
            update: {
                categoryId: category.id,
                title: news.title,
                content: news.content,
                isPublished: true,
                createdAt: new Date(news.date)
            },
        });
        */
    }
}


/**
 * Seed các bài viết Guide vào bảng Article + ArticleTranslation.
 * Dữ liệu phản ánh nội dung từ mock-page-data.ts GUIDE_CONTENT.
 */
async function seedGuideArticles(): Promise<void> {
    const guides = [
        {
            slug: "extra-services",
            type: "guide",
            title: "Extra Services",
            subtitle: "Optional add-ons to speed up your airport experience.",
            content: "<p>VIP Airport Fast-track, Car Pick-up Service, Hotel Reservation and other premium travel services.</p>",
            imageUrl: "/images/guide/services-cover.jpg",
            metadata: {},
            displayOrder: 1,
            translations: {
                vi: { title: "Dịch Vụ Bổ Sung", subtitle: "Các dịch vụ tùy chọn giúp tăng tốc trải nghiệm sân bay.", content: "<p>Dịch vụ VIP Fast-track tại sân bay, đưa đón xe, đặt phòng khách sạn và các dịch vụ du lịch cao cấp khác.</p>" },
            },
        },
        {
            slug: "visa-exemptions",
            type: "guide",
            title: "Visa Exemptions",
            subtitle: "Check if your nationality qualifies for visa-free entry to Vietnam.",
            content: "<p>Vietnam grants visa-free entry to citizens of 25+ countries under bilateral and unilateral agreements.</p>",
            imageUrl: "/images/guide/exemptions-cover.jpg",
            metadata: {
                coverImage: "/images/guide/exemptions-cover.jpg"
            },
            displayOrder: 2,
            translations: {
                vi: { title: "Miễn Thị Thực", subtitle: "Kiểm tra xem quốc tịch của bạn có được miễn visa vào Việt Nam không.", content: "<p>Việt Nam miễn thị thực cho công dân của hơn 25 quốc gia theo các hiệp định song phương và đơn phương.</p>" },
            },
        },
        {
            slug: "visa-extension",
            type: "guide",
            title: "Visa Extension",
            subtitle: "How to extend your stay while already in Vietnam.",
            content: "<p>Learn the process for extending your Vietnam visa from within the country.</p>",
            imageUrl: "/images/guide/extension-cover.jpg",
            metadata: {
                coverImage: "/images/guide/extension-cover.jpg"
            },
            displayOrder: 3,
            translations: {
                vi: { title: "Gia Hạn Visa", subtitle: "Cách gia hạn thời gian lưu trú khi bạn đang ở Việt Nam.", content: "<p>Tìm hiểu quy trình gia hạn visa Việt Nam từ trong nước.</p>" },
            },
        },
        {
            slug: "payment-guideline",
            type: "guide",
            title: "Payment Guideline",
            subtitle: "Secure online payment for your Vietnam visa application.",
            content: "<p>Pay with Visa, Mastercard, or PayPal. All transactions are processed in USD.</p>",
            imageUrl: null,
            metadata: {},
            displayOrder: 4,
            translations: {
                vi: { title: "Hướng Dẫn Thanh Toán", subtitle: "Thanh toán trực tuyến an toàn cho đơn xin visa Việt Nam.", content: "<p>Thanh toán bằng Visa, Mastercard hoặc PayPal. Tất cả giao dịch được xử lý bằng USD.</p>" },
            },
        },
    ];

    for (const guide of guides) {
        const article = await prisma.article.upsert({
            where: { slug: guide.slug },
            create: {
                slug: guide.slug,
                type: guide.type,
                title: guide.title,
                subtitle: guide.subtitle,
                content: guide.content,
                imageUrl: guide.imageUrl,
                metadata: guide.metadata,
                displayOrder: guide.displayOrder,
            },
            update: {
                title: guide.title,
                subtitle: guide.subtitle,
                content: guide.content,
                imageUrl: guide.imageUrl,
                metadata: guide.metadata,
                displayOrder: guide.displayOrder,
            },
        });

        for (const [lang, trans] of Object.entries(guide.translations)) {
            await prisma.articleTranslation.upsert({
                where: {
                    articleId_languageCode: {
                        articleId: article.id,
                        languageCode: lang,
                    },
                },
                create: {
                    articleId: article.id,
                    languageCode: lang,
                    title: (trans as any).title,
                    subtitle: (trans as any).subtitle,
                    content: (trans as any).content,
                },
                update: {
                    title: (trans as any).title,
                    subtitle: (trans as any).subtitle,
                    content: (trans as any).content,
                },
            });
        }
    }
    console.log("✅ Seeded guide articles");
}

async function seedFaqs(): Promise<void> {
    const faqs = [
        {
            category: "general",
            question: "How long does it take to get a Vietnam e-Visa?",
            answer: "<p>The standard processing time is <strong>3-5 working days</strong>. However, if you need it sooner, we offer urgent processing options:</p><ul><li>Urgent (2-working days)</li><li>Super Urgent (4-8 working hours)</li></ul>",
            displayOrder: 1,
            translations: {
                vi: { question: "Mất bao lâu để nhận được e-Visa Việt Nam?", answer: "<p>Thời gian xử lý tiêu chuẩn là <strong>3-5 ngày làm việc</strong>. Tuy nhiên, nếu bạn cần gấp, chúng tôi cung cấp các tùy chọn xử lý khẩn cấp:</p><ul><li>Khẩn (2 ngày làm việc)</li><li>Rất Khẩn (4-8 giờ làm việc)</li></ul>" },
            },
        },
        {
            category: "general",
            question: "What documents are required for the e-Visa application?",
            answer: "<p>You will need the following documents:</p><ol><li>A valid passport with at least 6 months validity.</li><li>A recent portrait photo (white background).</li></ol>",
            displayOrder: 2,
            translations: {
                vi: { question: "Những tài liệu nào là cần thiết cho việc nộp đơn e-Visa?", answer: "<p>Bạn sẽ cần các tài liệu sau:</p><ol><li>Hộ chiếu hợp lệ còn hạn ít nhất 6 tháng.</li><li>Một ảnh chân dung gần đây (nền trắng).</li></ol>" },
            },
        }
    ];

    for (const faq of faqs) {
        // We'll create it if it doesn't exist by finding matching question, but Faq doesn't have unique constraint besides id.
        // So we'll just delete existing and recreate or rely on category+question if we add a findFirst.
        // Let's just delete all FAQs for "general" category first to avoid duplicates, or just do a simple approach.
        // To be safe and idempotent, we check if the question exists.
        const existing = await prisma.faq.findFirst({ where: { question: faq.question } });
        
        let faqRecord;
        if (existing) {
            faqRecord = await prisma.faq.update({
                where: { id: existing.id },
                data: {
                    category: faq.category,
                    answer: faq.answer,
                    displayOrder: faq.displayOrder,
                }
            });
        } else {
            faqRecord = await prisma.faq.create({
                data: {
                    category: faq.category,
                    question: faq.question,
                    answer: faq.answer,
                    displayOrder: faq.displayOrder,
                }
            });
        }

        for (const [lang, trans] of Object.entries(faq.translations)) {
            await prisma.faqTranslation.upsert({
                where: {
                    faqId_languageCode: {
                        faqId: faqRecord.id,
                        languageCode: lang,
                    },
                },
                create: {
                    faqId: faqRecord.id,
                    languageCode: lang,
                    question: (trans as any).question,
                    answer: (trans as any).answer,
                },
                update: {
                    question: (trans as any).question,
                    answer: (trans as any).answer,
                },
            });
        }
    }
    console.log("✅ Seeded FAQs");
}

/**
 * Seed danh sách quốc gia miễn visa — phản ánh countriesData hardcode trong VisaExemptionsGuide.tsx.
 */
async function seedVisaExemptionCountries(): Promise<void> {
    const countries: { code: string; days: number; order: number }[] = [
        { code: "cl", days: 90, order: 1 },
        { code: "pa", days: 90, order: 2 },
        { code: "kh", days: 30, order: 3 },
        { code: "id", days: 30, order: 4 },
        { code: "kg", days: 30, order: 5 },
        { code: "la", days: 30, order: 6 },
        { code: "my", days: 30, order: 7 },
        { code: "sg", days: 30, order: 8 },
        { code: "th", days: 30, order: 9 },
        { code: "ph", days: 21, order: 10 },
        { code: "bn", days: 14, order: 11 },
        { code: "mm", days: 14, order: 12 },
        { code: "by", days: 45, order: 13 },
        { code: "kr", days: 45, order: 14 },
        { code: "jp", days: 45, order: 15 },
        { code: "de", days: 45, order: 16 },
        { code: "dk", days: 45, order: 17 },
        { code: "no", days: 45, order: 18 },
        { code: "ru", days: 45, order: 19 },
        { code: "fr", days: 45, order: 20 },
        { code: "fi", days: 45, order: 21 },
        { code: "es", days: 45, order: 22 },
        { code: "se", days: 45, order: 23 },
        { code: "it", days: 45, order: 24 },
        { code: "gb", days: 45, order: 25 },
    ];

    for (const c of countries) {
        await prisma.visaExemptionCountry.upsert({
            where: { countryCode: c.code },
            create: {
                countryCode: c.code,
                exemptionDays: c.days,
                displayOrder: c.order,
                isActive: true,
            },
            update: {
                exemptionDays: c.days,
                displayOrder: c.order,
                isActive: true,
            },
        });
    }
    console.log("✅ Seeded visa exemption countries");
}

async function seedAboutUsPageSettings(): Promise<void> {
    const value = {
        hero: {
            en: {
                title: "We Are <accent>FastVisa.</accent>",
                subtitle: "One of the most recommended Vietnam visa services worldwide.<br/>Pioneering seamless global mobility with 15+ years of trusted expertise."
            },
            vi: {
                title: "Chúng tôi là <accent>FastVisa.</accent>",
                subtitle: "Một trong những dịch vụ visa Việt Nam được khuyên dùng nhất thế giới.<br/>Tiên phong mang lại sự di chuyển toàn cầu mượt mà với hơn 15 năm kinh nghiệm đáng tin cậy."
            },
            ko: {
                title: "우리는 <accent>FastVisa</accent> 입니다.",
                subtitle: "전 세계적으로 가장 추천받는 베트남 비자 서비스 중 하나입니다.<br/>15년 이상의 신뢰할 수 있는 전문성으로 원활한 글로벌 이동을 선도합니다."
            }
        },
        quote: {
            en: {
                text: "“Vietnam's e-visa service has become remarkably streamlined — services like FastVisa make the application process effortless for international travelers visiting one of Southeast Asia's most spectacular destinations.”",
                author: "The New York Times",
                section: "Travel Section"
            },
            vi: {
                text: "“Dịch vụ e-visa của Việt Nam đã trở nên cực kỳ tinh gọn — những dịch vụ như FastVisa làm cho quá trình xin visa trở nên dễ dàng đối với du khách quốc tế đến thăm một trong những điểm đến ngoạn mục nhất Đông Nam Á.”",
                author: "The New York Times",
                section: "Mục Du Lịch"
            },
            ko: {
                text: "“베트남의 e-비자 서비스는 눈에 띄게 간소화되었습니다. FastVisa와 같은 서비스는 동남아시아에서 가장 멋진 목적지 중 하나를 방문하는 국제 여행객들의 신청 과정을 수월하게 만들어줍니다.”",
                author: "The New York Times",
                section: "여행 섹션"
            }
        },
        mission: {
            en: {
                label: "Our Purpose",
                title: "Our Mission",
                description: "We help travelers obtain Vietnam visas on time with transparent pricing, secure document handling, and responsive support. Easy application, no hidden charges, and a service guarantee backed by our money-back policy for eligible cases.",
                hassleFreeTitle: "Hassle-Free Process",
                hassleFreeDesc: "Streamlining documents so you can focus on the travel experience.",
                reliabilityTitle: "Absolute Reliability",
                reliabilityDesc: "Direct updates and secure channels ensure your personal data is safe."
            },
            vi: {
                label: "Mục Tiêu Của Chúng Tôi",
                title: "Sứ Mệnh Của Chúng Tôi",
                description: "Chúng tôi giúp du khách nhận visa Việt Nam đúng hạn với giá cả minh bạch, xử lý hồ sơ an toàn và hỗ trợ nhiệt tình. Đăng ký dễ dàng, không phí ẩn và dịch vụ được bảo đảm bằng chính sách hoàn tiền cho các trường hợp đủ điều kiện.",
                hassleFreeTitle: "Quy Trình Nhanh Gọn",
                hassleFreeDesc: "Tối ưu hóa giấy tờ để bạn có thể tập trung vào trải nghiệm du lịch.",
                reliabilityTitle: "Độ Tin Cậy Tuyệt Đối",
                reliabilityDesc: "Cập nhật trực tiếp và các kênh bảo mật đảm bảo dữ liệu cá nhân của bạn được an toàn."
            },
            ko: {
                label: "우리의 목적",
                title: "우리의 사명",
                description: "우리는 투명한 가격, 안전한 문서 처리, 신속한 지원을 통해 여행자가 베트남 비자를 제때 발급받을 수 있도록 돕습니다. 쉬운 신청, 숨겨진 비용 없음, 적격한 경우 환불 정책이 지원되는 서비스 보장.",
                hassleFreeTitle: "번거로움 없는 과정",
                hassleFreeDesc: "여행 경험에 집중할 수 있도록 문서를 간소화합니다.",
                reliabilityTitle: "절대적인 신뢰성",
                reliabilityDesc: "직접적인 업데이트와 보안 채널을 통해 개인 데이터가 안전하게 보호됩니다."
            }
        },
        missionImages: {
            sapa: "/images/about-us/mission-sapa.jpg",
            hoian: "/images/about-us/mission-hoian.jpg",
            journey: "/images/about-us/mission-journey.jpg"
        },
        sceneSlider: {
            en: {
                heading: "Discover Vietnam's Beauty",
                subheading: "From emerald bays to historic cities — your next adventure awaits."
            },
            vi: {
                heading: "Khám Phá Vẻ Đẹp Việt Nam",
                subheading: "Từ những vịnh ngọc bích đến các thành phố lịch sử — chuyến phiêu lưu tiếp theo đang chờ bạn."
            },
            ko: {
                heading: "베트남의 아름다움 발견",
                subheading: "에메랄드 만에서 역사적인 도시까지 — 당신의 다음 모험이 기다립니다."
            }
        },
        destinations: [
            { id: 1, key: "sapa", img: "/images/about-us/sapa.jpg", translations: { en: { title: "Terraced Fields", location: "Sa Pa, Lao Cai", desc: "A masterpiece of nature and mountainous people." }, vi: { title: "Ruộng Bậc Thang", location: "Sa Pa, Lào Cai", desc: "Kiệt tác thiên nhiên và con người miền núi Tây Bắc." }, ko: { title: "계단식 논", location: "사파, 라오까이", desc: "자연과 산악 민족의 걸작." } } },
            { id: 2, key: "hoian", img: "/images/about-us/hoian.jpg", translations: { en: { title: "Hoi An Ancient Town", location: "Quang Nam", desc: "World cultural heritage with romantic and ancient beauty." }, vi: { title: "Phố Cổ Hội An", location: "Quảng Nam", desc: "Di sản văn hóa thế giới với vẻ đẹp cổ kính lãng mạn." }, ko: { title: "호이안 고도시", location: "꽝남", desc: "로맨틱하고 고풍스러운 아름다움을 지닌 세계 문화 유산." } } },
            { id: 3, key: "halong", img: "/images/about-us/halong.jpg", translations: { en: { title: "Ha Long Bay", location: "Quang Ninh", desc: "A natural wonder with thousands of magnificent islands." }, vi: { title: "Vịnh Hạ Long", location: "Quảng Ninh", desc: "Kỳ quan thiên nhiên với hàng ngàn hòn đảo kỳ vĩ." }, ko: { title: "하롱베이", location: "꽝닌", desc: "수천 개의 웅장한 섬이 있는 자연의 경이로움." } } },
            { id: 4, key: "danang", img: "/images/about-us/danang.jpg", translations: { en: { title: "Golden Bridge", location: "Da Nang", desc: "An architectural masterpiece supported by giant hands." }, vi: { title: "Cầu Vàng", location: "Đà Nẵng", desc: "Kiệt tác kiến trúc được nâng đỡ bởi những bàn tay khổng lồ." }, ko: { title: "골든 브릿지", location: "다낭", desc: "거대한 손이 받치고 있는 건축의 걸작." } } },
            { id: 5, key: "ninhbinh", img: "/images/about-us/ninhbinh.jpg", translations: { en: { title: "Trang An", location: "Ninh Binh", desc: "A scenic complex known as Ha Long Bay on land." }, vi: { title: "Tràng An", location: "Ninh Bình", desc: "Quần thể danh thắng được mệnh danh là Vịnh Hạ Long trên cạn." }, ko: { title: "짱안", location: "닌빈", desc: "육지의 하롱베이로 알려진 경치 좋은 복합 단지." } } },
            { id: 6, key: "phuquoc", img: "/images/about-us/phuquoc.jpg", translations: { en: { title: "Sao Beach", location: "Phu Quoc", desc: "A beach with smooth white sand and crystal clear water." }, vi: { title: "Bãi Sao", location: "Phú Quốc", desc: "Bãi biển với bãi cát trắng mịn và làn nước trong xanh." }, ko: { title: "사오 해변", location: "푸꾸옥", desc: "고운 백사장과 수정처럼 맑은 물이 있는 해변." } } }
        ],
        whyUs: ["Target", "Shield", "Award", "Users", "Shield"],
        features: {
            en: {
                label: "Why Choose Us",
                title: "Why Apply With Us",
                items: {
                    noHiddenCharges: { title: "No Hidden Charges", description: "Transparent pricing from quote to checkout." },
                    experience: { title: "15+ Years Experience", description: "Trusted by travelers worldwide since 2009." },
                    delivery: { title: "99% On-Time Delivery", description: "Applications processed within promised timeframe." },
                    prices: { title: "Competitive Prices", description: "Best value for standard and urgent processing." },
                    guarantee: { title: "Money-Back Guarantee", description: "Eligible rejections covered by our guarantee policy." }
                }
            },
            vi: {
                label: "Tại Sao Chọn Chúng Tôi",
                title: "Lý Do Đăng Ký Với Chúng Tôi",
                items: {
                    noHiddenCharges: { title: "Không Phí Ẩn", description: "Giá cả minh bạch từ báo giá đến thanh toán." },
                    experience: { title: "Hơn 15 Năm Kinh Nghiệm", description: "Được tin tưởng bởi du khách trên toàn thế giới từ 2009." },
                    delivery: { title: "Giao Hẹn Đúng Hạn 99%", description: "Hồ sơ được xử lý trong khoảng thời gian đã cam kết." },
                    prices: { title: "Giá Cả Cạnh Tranh", description: "Giá trị tốt nhất cho dịch vụ tiêu chuẩn và khẩn cấp." },
                    guarantee: { title: "Bảo Đảm Hoàn Tiền", description: "Các trường hợp từ chối đủ điều kiện được bảo vệ bởi chính sách." }
                }
            },
            ko: {
                label: "우리를 선택하는 이유",
                title: "왜 우리와 함께 신청해야 하는가",
                items: {
                    noHiddenCharges: { title: "숨겨진 비용 없음", description: "견적부터 결제까지 투명한 가격." },
                    experience: { title: "15년 이상의 경험", description: "2009년부터 전 세계 여행객들에게 신뢰받고 있습니다." },
                    delivery: { title: "99% 정시 배달", description: "약속된 시간 내에 처리되는 신청서." },
                    prices: { title: "경쟁력 있는 가격", description: "표준 및 긴급 처리를 위한 최고의 가치." },
                    guarantee: { title: "환불 보장", description: "환불 보장 정책이 적용되는 적격한 거절 사례." }
                }
            }
        },
        team: {
            en: {
                ctaTitle: "Have questions about Vietnam Visa requirements?",
                ctaDesc: "Our specialists are always ready to review your files and provide custom solutions for group travel or business entries.",
                ctaButton: "Contact Our Team",
                label: "Expert Assistance",
                title: "Our Core Team"
            },
            vi: {
                ctaTitle: "Bạn có câu hỏi về yêu cầu Visa Việt Nam?",
                ctaDesc: "Các chuyên gia của chúng tôi luôn sẵn sàng xem xét hồ sơ của bạn và đưa ra giải pháp tùy chỉnh cho các chuyến đi theo nhóm hoặc nhập cảnh công tác.",
                ctaButton: "Liên Hệ Nhóm Chúng Tôi",
                label: "Hỗ Trợ Chuyên Gia",
                title: "Đội Ngũ Cốt Lõi Của Chúng Tôi"
            },
            ko: {
                ctaTitle: "베트남 비자 요구 사항에 대한 질문이 있으신가요?",
                ctaDesc: "저희 전문가들은 언제든지 귀하의 파일을 검토하고 그룹 여행이나 비즈니스 입국을 위한 맞춤형 솔루션을 제공할 준비가 되어 있습니다.",
                ctaButton: "우리 팀에 연락하기",
                label: "전문가 지원",
                title: "우리의 핵심 팀"
            }
        }
    };

    await prisma.pageSetting.upsert({
        where: { key: "about-us" },
        create: { key: "about-us", value },
        update: { value },
    });
    console.log("✅ Seeded about-us page settings");
}

async function seedTeamMembers(): Promise<void> {
    await prisma.teamMember.deleteMany({});
    
    const members = [
        {
            name: "Khanh Bao",
            role: JSON.stringify({ en: "Co-founder & Marketing", vi: "Đồng sáng lập – Marketing", ko: "공동 창립자 - 마케팅" }),
            description: JSON.stringify({
                en: "Builds and implements marketing, communications, and content activities; searches for customers and develops outreach channels; coordinates with consultants to understand market needs.",
                vi: "Xây dựng và triển khai các hoạt động marketing, truyền thông, nội dung; tìm kiếm khách hàng và phát triển kênh tiếp cận; phối hợp với người tư vấn để hiểu nhu cầu thị trường.",
                ko: "마케팅, 커뮤니케이션 및 콘텐츠 활동을 기획하고 실행합니다. 고객을 발굴하고 접근 채널을 개발하며 컨설턴트와 협력하여 시장의 요구를 파악합니다."
            }),
            imageUrl: "/Picture3.png",
            thumbBg: "#bfdbfe",
            displayOrder: 1,
            isActive: true
        },
        {
            name: "Viet Nguyen",
            role: JSON.stringify({ en: "Co-founder & Technology", vi: "Đồng sáng lập – Công nghệ", ko: "공동 창립자 - 기술" }),
            description: JSON.stringify({
                en: "Responsible for developing and operating the technology platform, ensuring the website system runs stably and securely. Directly builds core features such as the smart AI assistant, automated payment gateway, and passport scanning technology.",
                vi: "Chịu trách nhiệm phát triển và vận hành nền tảng công nghệ, đảm bảo hệ thống website luôn hoạt động ổn định và bảo mật. Trực tiếp xây dựng các tính năng cốt lõi như trợ lý AI thông minh, cổng thanh toán và công nghệ quét hộ chiếu.",
                ko: "기술 플랫폼 개발 및 운영을 담당하여 웹사이트 시스템이 안정적이고 안전하게 실행되도록 보장합니다. 스마트 AI 비서, 자동 결제 게이트웨이 및 여권 스캔 기술과 같은 핵심 기능을 직접 구축합니다."
            }),
            imageUrl: "/Picture1.png",
            thumbBg: "#e2e8f0",
            displayOrder: 2,
            isActive: true
        },
        {
            name: "Dat Tong",
            role: JSON.stringify({ en: "Co-founder & Visa Consultant", vi: "Đồng sáng lập – Tư vấn Visa", ko: "공동 창립자 및 비자 컨설턴트" }),
            description: JSON.stringify({
                en: "Directly meets and advises clients, handles visa applications and procedures; ensures accurate and compliant business processes; acts as a bridge for real-world customer feedback for the team.",
                vi: "Trực tiếp gặp gỡ, tư vấn khách hàng và xử lý hồ sơ, thủ tục visa; đảm bảo quy trình nghiệp vụ chính xác, đúng quy định; là cầu nối phản hồi thực tế từ khách hàng cho cả nhóm.",
                ko: "고객과 직접 만나 상담하고 비자 신청 및 절차를 처리합니다. 정확하고 규정에 맞는 업무 프로세스를 보장하며, 팀을 위한 고객의 생생한 피드백 전달자 역할을 합니다."
            }),
            imageUrl: "/Picture2.png",
            thumbBg: "#fef08a",
            displayOrder: 3,
            isActive: true
        }
    ];

    for (const m of members) {
        await prisma.teamMember.create({
            data: m
        }).catch((e) => { console.error("Error seeding team member:", m.name, e.message); });
    }
    console.log("✅ Seeded team members with translations");
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });

async function seedEmergencyInquiryPageSettings(): Promise<void> {
    const value = {
        hero: {
            en: {
                title: "Emergency Visa Support",
                subtitle: "Urgent processing for immediate travel needs.",
                alert_title: "IMPORTANT NOTICE",
                alert_desc_prefix: "For flights departing within 24 hours, please",
                alert_desc_link: "contact us directly",
                alert_desc_suffix: "via WhatsApp for immediate assistance."
            },
            vi: {
                title: "Hỗ Trợ Visa Khẩn Cấp",
                subtitle: "Xử lý khẩn cấp cho nhu cầu du lịch ngay lập tức.",
                alert_title: "THÔNG BÁO QUAN TRỌNG",
                alert_desc_prefix: "Đối với các chuyến bay khởi hành trong vòng 24 giờ, vui lòng",
                alert_desc_link: "liên hệ trực tiếp",
                alert_desc_suffix: "qua WhatsApp để được hỗ trợ ngay lập tức."
            },
            ko: {
                title: "긴급 비자 지원",
                subtitle: "즉각적인 여행 필요를 위한 긴급 처리.",
                alert_title: "중요 공지",
                alert_desc_prefix: "24시간 이내에 출발하는 항공편의 경우,",
                alert_desc_link: "직접 연락",
                alert_desc_suffix: "하여 WhatsApp을 통해 즉각적인 지원을 받으세요."
            }
        },
        pricing: {
            en: {
                title: "Emergency Processing Options",
                desc: "Choose the speed you need.",
                pricing_unavailable: "Pricing is currently unavailable.",
                most_requested: "MOST REQUESTED",
                best_for: "Best for:",
                service_fee: "Service Fee",
                whatsapp_btn: "WhatsApp Us",
                apply_btn: "Apply Now",
                tiers: [
                    { id: "last-minute", name: "Last Minute / Holiday", timeframe: "1-2 Hours", description: "Immediate processing for extremely urgent flights.", bestFor: "Boarding soon", link: "https://wa.me/84936699869", price: "Contact Us" },
                    { id: "2h", key: "URGENT_2WH", name: "Express 2 Hours", timeframe: "2 Hours", description: "Receive your visa in just 2 working hours.", bestFor: "Same day flights", link: "/apply?speed=2h", isHighlighted: true },
                    { id: "4h", key: "URGENT_4WH", name: "Express 4 Hours", timeframe: "4 Hours", description: "Receive your visa in 4 working hours.", bestFor: "Flights tomorrow", link: "/apply?speed=4h" },
                    { id: "1d", key: "URGENT_1WD", name: "Express 1 Day", timeframe: "1 Working Day", description: "Get your visa by the next working day.", bestFor: "Weekend flights", link: "/apply?speed=1d" },
                    { id: "2d", key: "URGENT_2WD_30", name: "Super Urgent 2 Days", timeframe: "2 Working Days", description: "Fast track your visa in 2 days.", bestFor: "Planned trips", link: "/apply?speed=2d" }
                ]
            },
            vi: {
                title: "Tùy chọn Xử lý Khẩn cấp",
                desc: "Chọn tốc độ bạn cần.",
                pricing_unavailable: "Bảng giá hiện không có sẵn.",
                most_requested: "ĐƯỢC YÊU CẦU NHIỀU NHẤT",
                best_for: "Tốt nhất cho:",
                service_fee: "Phí dịch vụ",
                whatsapp_btn: "Liên hệ WhatsApp",
                apply_btn: "Đăng ký ngay",
                tiers: [
                    { id: "last-minute", name: "Cấp Bách / Ngày Lễ", timeframe: "1-2 Giờ", description: "Xử lý ngay lập tức cho các chuyến bay cực kỳ khẩn cấp.", bestFor: "Sắp lên máy bay", link: "https://wa.me/84936699869", price: "Liên hệ" },
                    { id: "2h", key: "URGENT_2WH", name: "Hỏa tốc 2 Giờ", timeframe: "2 Giờ", description: "Nhận visa chỉ trong 2 giờ làm việc.", bestFor: "Chuyến bay trong ngày", link: "/apply?speed=2h", isHighlighted: true },
                    { id: "4h", key: "URGENT_4WH", name: "Hỏa tốc 4 Giờ", timeframe: "4 Giờ", description: "Nhận visa trong 4 giờ làm việc.", bestFor: "Chuyến bay ngày mai", link: "/apply?speed=4h" },
                    { id: "1d", key: "URGENT_1WD", name: "Hỏa tốc 1 Ngày", timeframe: "1 Ngày làm việc", description: "Nhận visa vào ngày làm việc tiếp theo.", bestFor: "Chuyến bay cuối tuần", link: "/apply?speed=1d" },
                    { id: "2d", key: "URGENT_2WD_30", name: "Rất Khẩn 2 Ngày", timeframe: "2 Ngày làm việc", description: "Rút ngắn thời gian nhận visa trong 2 ngày.", bestFor: "Chuyến đi đã lên lịch", link: "/apply?speed=2d" }
                ]
            },
            ko: {
                title: "긴급 처리 옵션",
                desc: "필요한 속도를 선택하세요.",
                pricing_unavailable: "현재 가격을 확인할 수 없습니다.",
                most_requested: "가장 많이 요청됨",
                best_for: "추천 대상:",
                service_fee: "서비스 요금",
                whatsapp_btn: "WhatsApp 문의",
                apply_btn: "지금 신청",
                tiers: [
                    { id: "last-minute", name: "막바지 / 휴일", timeframe: "1-2 시간", description: "극히 긴급한 항공편을 위한 즉각적인 처리.", bestFor: "곧 탑승", link: "https://wa.me/84936699869", price: "문의하기" },
                    { id: "2h", key: "URGENT_2WH", name: "초특급 2시간", timeframe: "2 시간", description: "단 2시간 만에 비자를 받으세요.", bestFor: "당일 항공편", link: "/apply?speed=2h", isHighlighted: true },
                    { id: "4h", key: "URGENT_4WH", name: "특급 4시간", timeframe: "4 시간", description: "4시간 만에 비자를 받으세요.", bestFor: "내일 항공편", link: "/apply?speed=4h" },
                    { id: "1d", key: "URGENT_1WD", name: "특급 1일", timeframe: "영업일 1일", description: "다음 영업일까지 비자를 받으세요.", bestFor: "주말 항공편", link: "/apply?speed=1d" },
                    { id: "2d", key: "URGENT_2WD_30", name: "매우 긴급 2일", timeframe: "영업일 2일", description: "이틀 만에 비자를 빠르게 받으세요.", bestFor: "계획된 여행", link: "/apply?speed=2d" }
                ]
            }
        },
        timeline: {
            en: {
                title: "Emergency Process Timeline",
                desc: "How we expedite your application.",
                steps: [
                    { number: 1, title: "Submit Request", description: "Fill out the emergency form with flight details.", icon: "FileText" },
                    { number: 2, title: "Quick Processing", description: "Our team prioritizes your application immediately.", icon: "Send" },
                    { number: 3, title: "Receive Visa", description: "Get your approval letter via email.", icon: "Mail" }
                ]
            },
            vi: {
                title: "Quy trình xử lý khẩn cấp",
                desc: "Cách chúng tôi rút ngắn thời gian xử lý.",
                steps: [
                    { number: 1, title: "Gửi Yêu Cầu", description: "Điền form khẩn cấp với chi tiết chuyến bay.", icon: "FileText" },
                    { number: 2, title: "Xử Lý Nhanh", description: "Đội ngũ ưu tiên hồ sơ của bạn ngay lập tức.", icon: "Send" },
                    { number: 3, title: "Nhận Visa", description: "Nhận công văn chấp thuận qua email.", icon: "Mail" }
                ]
            },
            ko: {
                title: "긴급 처리 절차",
                desc: "신청서를 신속하게 처리하는 방법.",
                steps: [
                    { number: 1, title: "요청 제출", description: "항공편 세부 정보와 함께 긴급 양식을 작성하세요.", icon: "FileText" },
                    { number: 2, title: "빠른 처리", description: "팀에서 신청서를 즉시 우선 처리합니다.", icon: "Send" },
                    { number: 3, title: "비자 수령", description: "이메일로 승인서를 받으세요.", icon: "Mail" }
                ]
            }
        }
    };

    await prisma.pageSetting.upsert({
        where: { key: "emergency-inquiry" },
        create: { key: "emergency-inquiry", value },
        update: { value },
    });
    console.log("✅ Seeded emergency inquiry page settings");
}

async function seedReels(): Promise<void> {
    const reelsData = [
        {
            title: "Trải nghiệm xin Visa Việt Nam nhanh chóng",
            authorName: "FastVisa Assistant",
            authorAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80",
            media: [
                {
                    id: "media-1",
                    url: "https://assets.mixkit.co/videos/preview/mixkit-girl-in-neon-sign-under-the-rain-41582-large.mp4",
                    type: "video"
                }
            ],
            isActive: true,
        },
        {
            title: "Hướng dẫn chuẩn bị hồ sơ Visa du lịch 2026",
            authorName: "FastVisa Expert",
            authorAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80",
            media: [
                {
                    id: "media-2",
                    url: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=600&h=1000&q=80",
                    type: "image"
                }
            ],
            isActive: true,
        }
    ];

    for (const reel of reelsData) {
        const existing = await prisma.reel.findFirst({ where: { title: reel.title } });
        if (!existing) {
            await prisma.reel.create({
                data: {
                    title: reel.title,
                    authorName: reel.authorName,
                    authorAvatar: reel.authorAvatar,
                    media: reel.media,
                    isActive: reel.isActive,
                }
            });
        }
    }
    console.log("✅ Seeded reels");
}
