// Mapping tên quốc gia (tiếng Anh) → mã ISO 3166-1 alpha-2 (2 ký tự viết thường)
// Dùng để tải ảnh cờ từ flagcdn.com: https://flagcdn.com/w40/{code}.png
export const COUNTRY_ISO_MAP: Record<string, string> = {
    Afghanistan: "af",
    Albania: "al",
    Algeria: "dz",
    Argentina: "ar",
    Armenia: "am",
    Australia: "au",
    Austria: "at",
    Azerbaijan: "az",
    Bangladesh: "bd",
    Belarus: "by",
    Belgium: "be",
    Bolivia: "bo",
    Brazil: "br",
    Bulgaria: "bg",
    Cambodia: "kh",
    Canada: "ca",
    Chile: "cl",
    China: "cn",
    Colombia: "co",
    Croatia: "hr",
    Cuba: "cu",
    "Czech Republic": "cz",
    Denmark: "dk",
    Egypt: "eg",
    Estonia: "ee",
    Finland: "fi",
    France: "fr",
    Georgia: "ge",
    Germany: "de",
    Ghana: "gh",
    Greece: "gr",
    "Hong Kong": "hk",
    Hungary: "hu",
    Iceland: "is",
    India: "in",
    Indonesia: "id",
    Iran: "ir",
    Iraq: "iq",
    Ireland: "ie",
    Israel: "il",
    Italy: "it",
    Japan: "jp",
    Jordan: "jo",
    Kazakhstan: "kz",
    Kenya: "ke",
    Kuwait: "kw",
    Laos: "la",
    Latvia: "lv",
    Lithuania: "lt",
    Luxembourg: "lu",
    Malaysia: "my",
    Mexico: "mx",
    Mongolia: "mn",
    Morocco: "ma",
    Myanmar: "mm",
    Nepal: "np",
    Netherlands: "nl",
    "New Zealand": "nz",
    Nigeria: "ng",
    Norway: "no",
    Oman: "om",
    Pakistan: "pk",
    Philippines: "ph",
    Poland: "pl",
    Portugal: "pt",
    Qatar: "qa",
    Romania: "ro",
    Russia: "ru",
    "Saudi Arabia": "sa",
    Singapore: "sg",
    Slovakia: "sk",
    "South Africa": "za",
    "South Korea": "kr",
    Spain: "es",
    "Sri Lanka": "lk",
    Sweden: "se",
    Switzerland: "ch",
    Taiwan: "tw",
    Thailand: "th",
    Turkey: "tr",
    Ukraine: "ua",
    "United Arab Emirates": "ae",
    "United Kingdom": "gb",
    "United States": "us",
    Venezuela: "ve",
    Vietnam: "vn",
};

/**
 * Trả về URL ảnh cờ quốc gia từ flagcdn.com theo tên quốc gia tiếng Anh hoặc mã ISO.
 * Fallback về cờ Việt Nam nếu không tìm thấy mã ISO.
 * @param width - Độ rộng ảnh: 40 (mặc định, nhỏ), 80, 160, 320 (lớn hơn, rõ nét hơn)
 */
export function getFlagCdnUrl(
    countryNameOrCode: string,
    width: 40 | 80 | 160 | 320 = 40,
): string {
    const query = countryNameOrCode.trim();
    let code = "vn";
    if (query.length === 2) {
        code = query.toLowerCase();
    } else {
        code = COUNTRY_ISO_MAP[query] ?? "vn";
    }
    return `https://flagcdn.com/w${width}/${code}.png`;
}

// Reverse map: ISO 2-letter code → full country name
export const ISO_TO_COUNTRY_NAME: Record<string, string> = Object.fromEntries(
    Object.entries(COUNTRY_ISO_MAP).map(([name, code]) => [code, name])
);

export const VALID_ISO_CODES = new Set(Object.values(COUNTRY_ISO_MAP));

/**
 * Trả về URL cờ quốc gia từ mã ISO 2 ký tự (lowercase hoặc uppercase).
 * Dùng khi dữ liệu từ DB trả về countryCode (ISO) thay vì tên đầy đủ.
 */
export function getFlagCdnUrlByCode(
    isoCode: string,
    width: 40 | 80 | 160 | 320 = 40,
): string {
    const code = isoCode.toLowerCase().trim();
    const safeCode = code || "vn";
    return `https://hatscripts.github.io/circle-flags/flags/${safeCode}.svg`;
}

/**
 * Trả về tên đầy đủ của quốc gia từ mã ISO 2 ký tự.
 * VD: "us" → "United States", "gb" → "United Kingdom"
 */
export function getCountryNameByCode(isoCode: string): string {
    const code = isoCode.toLowerCase().trim();
    return ISO_TO_COUNTRY_NAME[code] ?? isoCode.toUpperCase();
}

/**
 * Trả về tên quốc gia đã bản địa hóa theo locale hiện tại dùng Intl.DisplayNames.
 * VD: ("us", "ko") → "미국", ("gb", "vi") → "Vương Quốc Anh"
 * Fallback về tên tiếng Anh nếu Intl.DisplayNames không hỗ trợ locale đó.
 */
export function getCountryNameByLocale(isoCode: string, locale: string): string {
    const code = isoCode.toLowerCase().trim();
    try {
        const displayNames = new Intl.DisplayNames([locale], { type: "region" });
        return displayNames.of(code.toUpperCase()) ?? getCountryNameByCode(isoCode);
    } catch {
        return getCountryNameByCode(isoCode);
    }
}
