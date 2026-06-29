export interface SessionContext {
    nationality?: string;    // ISO2 code: "US", "KR", "VN", ...
    applicantCount?: number; // số người xin visa
    visaCategory?: string;   // "SINGLE_ENTRY" | "MULTIPLE_ENTRY"
    travelPurpose?: string;  // "TOURIST" | "BUSINESS"
}

// Mapping keyword ngôn ngữ tự nhiên (lowercase) → ISO2
const NATIONALITY_MAP: Record<string, string> = {
    // Tiếng Việt
    "người mỹ": "US", "nguoi my": "US", "mỹ": "US",
    "người hàn": "KR", "người hàn quốc": "KR", "hàn quốc": "KR", "han quoc": "KR",
    "người nhật": "JP", "nhật bản": "JP", "nhat ban": "JP",
    "người trung quốc": "CN", "trung quốc": "CN", "trung quoc": "CN",
    "người anh": "GB", "anh quốc": "GB", "anh quoc": "GB",
    "người pháp": "FR", "pháp": "FR", "phap": "FR",
    "người đức": "DE", "đức": "DE", "duc": "DE",
    "người úc": "AU", "úc": "AU", "uc": "AU",
    "người canada": "CA", "canada": "CA",
    "người việt": "VN", "người việt nam": "VN", "việt nam": "VN", "viet nam": "VN",
    "người ấn độ": "IN", "ấn độ": "IN", "an do": "IN",
    "người singapore": "SG",
    "người thái": "TH", "thái lan": "TH", "thai lan": "TH",
    "người malaysia": "MY",
    "người indonesia": "ID",
    // Tiếng Anh
    "american": "US", "from america": "US", "from the us": "US", "from usa": "US", "us citizen": "US",
    "korean": "KR", "from korea": "KR", "from south korea": "KR", "south korean": "KR",
    "japanese": "JP", "from japan": "JP",
    "chinese": "CN", "from china": "CN",
    "british": "GB", "from uk": "GB", "from england": "GB", "from britain": "GB",
    "french": "FR", "from france": "FR",
    "german": "DE", "from germany": "DE",
    "australian": "AU", "from australia": "AU",
    "canadian": "CA", "from canada": "CA",
    "vietnamese": "VN", "from vietnam": "VN",
    "indian": "IN", "from india": "IN",
    "singaporean": "SG", "from singapore": "SG",
    "thai": "TH", "from thailand": "TH",
    "malaysian": "MY", "from malaysia": "MY",
    "indonesian": "ID", "from indonesia": "ID",
    "venezuela": "VE", "from venezuela": "VE", "người venezuela": "VE",
};

/**
 * Extract entities từ tin nhắn user bằng regex — không gọi LLM, zero token cost.
 * Chỉ set field khi phát hiện rõ ràng.
 */
export function extractEntitiesFromText(text: string): Partial<SessionContext> {
    const result: Partial<SessionContext> = {};
    const lower = text.toLowerCase().trim();

    // --- Nationality: duyệt theo độ dài keyword giảm dần để ưu tiên match dài hơn ---
    const sortedKeys = Object.keys(NATIONALITY_MAP).sort((a, b) => b.length - a.length);
    for (const keyword of sortedKeys) {
        if (lower.includes(keyword)) {
            result.nationality = NATIONALITY_MAP[keyword];
            break;
        }
    }

    // --- Applicant count: "3 người", "for 2 people", "nhóm 5", "2 applicants" ---
    const countMatch =
        lower.match(/\b(\d{1,2})\s*(?:người|person|people|applicant(?:s)?|persons?|pax)\b/) ||
        lower.match(/(?:nh[oó]m|group of|for)\s*(\d{1,2})\b/);
    if (countMatch) {
        const count = parseInt(countMatch[1], 10);
        if (count >= 1 && count <= 50) result.applicantCount = count;
    }

    // --- Visa category ---
    if (/\b(?:single[- ]entry|m[oộ]t l[aầ]n(?: nh[aậ]p c[aả]nh)?|1 l[aầ]n)\b/.test(lower)) {
        result.visaCategory = "SINGLE_ENTRY";
    } else if (/\b(?:multiple[- ]entry|nhi[eề]u l[aầ]n)\b/.test(lower)) {
        result.visaCategory = "MULTIPLE_ENTRY";
    }

    // --- Travel purpose ---
    if (/\b(?:du l[iị]ch|tourist|tourism|vacation|travel)\b/.test(lower)) {
        result.travelPurpose = "TOURIST";
    } else if (/\b(?:kinh doanh|business|c[oô]ng t[aá]c|work trip)\b/.test(lower)) {
        result.travelPurpose = "BUSINESS";
    }

    return result;
}

/**
 * Merge partial entities vào context hiện có — field mới ghi đè field cũ.
 */
export function mergeContext(
    existing: SessionContext | null | undefined,
    partial: Partial<SessionContext>,
): SessionContext {
    return { ...(existing ?? {}), ...partial };
}

/**
 * Format SessionContext thành block text để inject vào system prompt.
 * Kết hợp với nationality/visaInterest ban đầu từ join form.
 * Trả về empty string nếu không có gì.
 */
export function buildContextBlock(
    joinNationality: string | null | undefined,
    joinVisaInterest: string | null | undefined,
    sessionContext: SessionContext | null | undefined,
): string {
    const parts: string[] = [];

    // Ưu tiên nationality được extract trong hội thoại hơn nationality lúc join
    const nationality = sessionContext?.nationality || joinNationality;
    if (nationality) parts.push(`Nationality: ${nationality}`);
    if (joinVisaInterest) parts.push(`Visa Interest: ${joinVisaInterest}`);
    if (sessionContext?.applicantCount) parts.push(`Number of Applicants: ${sessionContext.applicantCount}`);
    if (sessionContext?.visaCategory) parts.push(`Visa Category: ${sessionContext.visaCategory}`);
    if (sessionContext?.travelPurpose) parts.push(`Travel Purpose: ${sessionContext.travelPurpose}`);

    return parts.join("\n");
}
