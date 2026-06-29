import { FunctionDeclaration, FunctionDeclarationSchema, SchemaType } from "@google/generative-ai";
import { aiToolRegistry } from "./tool-registry";
import { listPublicNationalities } from "../../nationalities.service";

const checkNationalityDeclaration: FunctionDeclaration = {
    name: "check_nationality",
    description: "Tìm kiếm xem quốc gia/quốc tịch có được hỗ trợ visa điện tử (E-visa) tại Việt Nam hay không.",
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            countryCode: {
                type: SchemaType.STRING,
                description: "Mã quốc gia ISO 2 ký tự (ví dụ: 'vn' cho Việt Nam, 'us' cho Mỹ)."
            }
        },
        required: ["countryCode"]
    } as FunctionDeclarationSchema
};

// ISO 3166-1 alpha-3 → alpha-2 mapping cho các quốc gia phổ biến
const ISO3_TO_ISO2: Record<string, string> = {
    PHL: "PH", USA: "US", GBR: "GB", AUS: "AU", CAN: "CA", CHN: "CN",
    JPN: "JP", KOR: "KR", DEU: "DE", FRA: "FR", ITA: "IT", ESP: "ES",
    IND: "IN", BRA: "BR", MEX: "MX", SGP: "SG", MYS: "MY", THA: "TH",
    IDN: "ID", VNM: "VN", KHM: "KH", LAO: "LA", MMR: "MM", HKG: "HK",
    TWN: "TW", RUS: "RU", NLD: "NL", BEL: "BE", CHE: "CH", SWE: "SE",
    NOR: "NO", DNK: "DK", FIN: "FI", POL: "PL", CZE: "CZ", HUN: "HU",
    AUT: "AT", PRT: "PT", GRC: "GR", TUR: "TR", SAU: "SA", ARE: "AE",
    QAT: "QA", KWT: "KW", BHR: "BH", OMN: "OM", ZAF: "ZA", EGY: "EG",
    NZL: "NZ", ARG: "AR", CHL: "CL", COL: "CO", PER: "PE",
};

async function executeCheckNationality(args: { countryCode?: string }) {
    if (!args.countryCode) {
        return { success: false, message: "Missing countryCode" };
    }

    // Normalize: 3-letter ISO → 2-letter ISO (ví dụ PHL → PH, USA → US)
    const raw = args.countryCode.trim().toUpperCase();
    const normalized = ISO3_TO_ISO2[raw] ?? raw;

    const nationalities = await listPublicNationalities();
    const country = nationalities.find(n => n.code.toLowerCase() === normalized.toLowerCase());

    if (country) {
        const evisaText = (country.group === "POPULAR" || country.group === "GOOD") ? "Có hỗ trợ e-Visa" : country.group === "NORMAL" ? "Hỗ trợ VOA" : "KHÔNG hỗ trợ e-Visa";
        const exemptionText = country.exemption_days > 0 ? `Được miễn visa (${country.exemption_days} ngày)` : "Không được miễn visa";
        
        return {
            success: true,
            message: `Dưới đây là kết quả tra cứu từ Database: 
- Quốc gia: ${country.name}
- Tình trạng e-Visa: ${evisaText}
- Tình trạng Miễn Visa (Exemption): ${exemptionText}

Bạn hãy dùng thông tin này để trả lời ngắn gọn và lịch sự cho người dùng, xác nhận kết quả kiểm tra.`
        };
    } else {
        return {
            success: true,
            message: `Hệ thống không tìm thấy quốc gia có mã "${args.countryCode}". Bạn hãy báo cho người dùng biết hệ thống chưa hỗ trợ hoặc không tìm thấy.`
        };
    }
}

aiToolRegistry.register("check_nationality", {
    declaration: checkNationalityDeclaration,
    execute: executeCheckNationality,
    category: "DATA_RETRIEVAL"
});
