export const getCountryRules = (t: any): Record<string, {
    status: string;
    stay: string;
    fee: string;
    processing: string;
    requirements: string[];
    note?: string;
}> => ({
    us: {
        status: t("us.status"),
        stay: t("us.stay"),
        fee: t("us.fee"),
        processing: t("us.processing"),
        requirements: [t("us.requirements.0"), t("us.requirements.1"), t("us.requirements.2"), t("us.requirements.3")],
        note: t("us.note")
    },
    au: {
        status: t("au.status"),
        stay: t("au.stay"),
        fee: t("au.fee"),
        processing: t("au.processing"),
        requirements: [t("au.requirements.0"), t("au.requirements.1"), t("au.requirements.2"), t("au.requirements.3")],
        note: t("au.note")
    },
    cn: {
        status: t("cn.status"),
        stay: t("cn.stay"),
        fee: t("cn.fee"),
        processing: t("cn.processing"),
        requirements: [t("cn.requirements.0"), t("cn.requirements.1"), t("cn.requirements.2"), t("cn.requirements.3")],
        note: t("cn.note")
    },
    ca: {
        status: t("ca.status"),
        stay: t("ca.stay"),
        fee: t("ca.fee"),
        processing: t("ca.processing"),
        requirements: [t("ca.requirements.0"), t("ca.requirements.1"), t("ca.requirements.2"), t("ca.requirements.3")],
        note: t("ca.note")
    },
    gb: {
        status: t("gb.status"),
        stay: t("gb.stay"),
        fee: t("gb.fee"),
        processing: t("gb.processing"),
        requirements: [
            "Valid UK Passport with 6 months validity and 2 blank pages",
            "For Exemption: Proof of onward/return ticket within 45 days",
            "For E-Visa: Passport scan and digital portrait photo"
        ],
        note: "British citizens enjoy 45 days visa-free entry. If you plan to stay longer (up to 90 days) or require multiple entries, apply for an E-Visa online before departure."
    },
    fr: {
        status: t("fr.status"),
        stay: t("fr.stay"),
        fee: t("fr.fee"),
        processing: t("fr.processing"),
        requirements: [
            "Valid French Passport with 6 months validity",
            "For Exemption: Onward flight ticket within 45 days",
            "For E-Visa: Passport scan and portrait photo"
        ],
        note: "French citizens are exempt for up to 45 days. Stays from 46 to 90 days require an E-Visa."
    },
    de: {
        status: t("de.status"),
        stay: t("de.stay"),
        fee: t("de.fee"),
        processing: t("de.processing"),
        requirements: [
            "Valid German Passport with 6 months validity",
            "For Exemption: Onward flight ticket within 45 days",
            "For E-Visa: Passport scan and portrait photo"
        ],
        note: "German citizens enjoy 45 days visa-free entry. Stays from 46 to 90 days require an E-Visa."
    },
    jp: {
        status: t("jp.status"),
        stay: t("jp.stay"),
        fee: t("jp.fee"),
        processing: t("jp.processing"),
        requirements: [
            "Valid Japanese Passport with minimum 6 months validity",
            "For Exemption: Return or onward ticket within 45 days",
            "For E-Visa: Digital passport scan and portrait photograph"
        ],
        note: "Japanese passport holders enjoy one of the strongest visa exemptions. For stays beyond 45 days or multiple entries, apply for an E-Visa online before departure."
    },
    kr: {
        status: t("kr.status"),
        stay: t("kr.stay"),
        fee: t("kr.fee"),
        processing: t("kr.processing"),
        requirements: [
            "Valid South Korean Passport with 6 months validity",
            "Proof of return or onward travel ticket within 45 days (exemption)",
            "For E-Visa: Passport biodata scan and recent portrait photo"
        ],
        note: "South Korean citizens benefit from 45 days visa-free access. Frequent visitors and long-term travelers should apply for a 90-day Multiple Entry E-Visa."
    },
    in: {
        status: t("in.status"),
        stay: t("in.stay"),
        fee: t("in.fee"),
        processing: t("in.processing"),
        requirements: [t("in.requirements.0"), t("in.requirements.1"), t("in.requirements.2"), t("in.requirements.3")],
        note: t("in.note")
    },
    sg: {
        status: t("sg.status"),
        stay: t("sg.stay"),
        fee: t("sg.fee"),
        processing: t("sg.processing"),
        requirements: [
            "Valid Singapore Passport with 6 months validity",
            "For Exemption: Onward flight ticket within 30 days",
            "For E-Visa: Digital passport scan and portrait photo"
        ],
        note: "Singapore passport holders enjoy 30 days visa-free entry — one of the highest bilateral trust levels. For extended stays or business trips, apply for the 90-day E-Visa."
    },
    es: {
        status: t("es.status"),
        stay: t("es.stay"),
        fee: t("es.fee"),
        processing: t("es.processing"),
        requirements: [
            "Valid Spanish Passport with minimum 6 months validity",
            "For Exemption: Proof of onward/return journey within 45 days",
            "For E-Visa: Passport scan and recent color portrait photo"
        ],
        note: "Spanish citizens enjoy 45 days visa-free access to Vietnam. Planning a longer Indochina trip? Apply for the 90-day multiple entry E-Visa for full flexibility."
    },
    it: {
        status: t("it.status"),
        stay: t("it.stay"),
        fee: t("it.fee"),
        processing: t("it.processing"),
        requirements: [
            "Valid Italian Passport with at least 6 months validity",
            "For Exemption: Confirmed onward/return ticket within 45 days",
            "For E-Visa: Digital passport scan and portrait photograph"
        ],
        note: "Italian passport holders are visa-exempt for 45 days. For longer trips combining Vietnam with Cambodia or Laos, the 90-day multiple-entry E-Visa is the best option."
    },
    nl: {
        status: t("nl.status"),
        stay: t("nl.stay"),
        fee: t("nl.fee"),
        processing: t("nl.processing"),
        requirements: [
            "Valid Dutch/Netherlands Passport with 6 months validity",
            "Proof of return or onward flight (for exemption)",
            "For E-Visa: Passport scan and portrait photo"
        ],
        note: "Dutch citizens benefit from 45 days visa-free entry. For business meetings or extended vacations, the Vietnam E-Visa can be obtained online within 3 working days."
    },
    my: {
        status: t("my.status"),
        stay: t("my.stay"),
        fee: t("my.fee"),
        processing: t("my.processing"),
        requirements: [
            "Valid Malaysian Passport with 6 months validity",
            "Confirmed return or onward ticket within 30 days (exemption)",
            "For E-Visa: Clear passport scan and digital portrait photo"
        ],
        note: "Malaysian passport holders are eligible for 30 days visa-free entry. Frequent cross-border travelers and business visitors should apply for the 90-day multiple-entry E-Visa."
    }
});

/**
 * Tạo emoji cờ dựa trên countryCode (mặc định tiếng Anh).
 * TẠI SAO: Đưa ra hàm helper để sử dụng chung giữa các component liên quan đến quốc tịch.
 */
export function getFlagEmoji(countryCode: string): string {
    if (!countryCode) return "🏳️";
    const codePoints = countryCode
        .toUpperCase()
        .split("")
        .map((char) => 127397 + char.charCodeAt(0));
    try {
        return String.fromCodePoint(...codePoints);
    } catch {
        return "🏳️";
    }
}
