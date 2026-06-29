/** Ngôn ngữ hỗ trợ trên UI public — khớp next-intl locales. */
export const SUPPORTED_LOCALES = ["vi", "en", "ko"] as const

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

export type LocaleFieldMap = Record<string, string>

export type LocaleFieldsState = Record<SupportedLocale, LocaleFieldMap>

export function emptyLocaleFields(fieldKeys: string[]): LocaleFieldsState {
 return SUPPORTED_LOCALES.reduce((acc, locale) => {
 acc[locale] = Object.fromEntries(fieldKeys.map((k) => [k, ""]))
 return acc
 }, {} as LocaleFieldsState)
}

export function buildAllLocaleTranslations(
 fields: LocaleFieldsState,
 fieldKeys: readonly string[],
): Array<{ language_code: string } & Record<string, string>> {
 const result: Array<{ language_code: string } & Record<string, string>> = []

 for (const locale of SUPPORTED_LOCALES) {
 const row = fields[locale]
 const hasValue = fieldKeys.some((k) => row[k]?.trim())
 if (!hasValue) continue

 const entry: { language_code: string } & Record<string, string> = {
 language_code: locale,
 }
 for (const key of fieldKeys) {
 entry[key] = row[key] ?? ""
 }
 result.push(entry)
 }

 return result
}

/**
 * Hydrate khi entity chỉ lưu nội dung trong bảng translations (không có cột gốc).
 */
export function hydrateFromTranslationsOnly(
 fieldKeys: string[],
 translations: Array<{ language_code: string } & Record<string, string | null | undefined>>,
): LocaleFieldsState {
 const state = emptyLocaleFields(fieldKeys)

 for (const tr of translations) {
 const locale = tr.language_code as SupportedLocale
 if (!SUPPORTED_LOCALES.includes(locale)) continue
 for (const key of fieldKeys) {
 state[locale][key] = tr[key] ?? ""
 }
 }

 return state
}

/**
 * Gộp bản dịch en/ko thành mảng translations gửi API.
 * Tab vi map vào trường gốc (main row), không đưa vào translations.
 */
export function buildApiTranslations(
 fields: LocaleFieldsState,
 fieldKeys: readonly string[],
): Array<{ language_code: string } & Record<string, string>> {
 const result: Array<{ language_code: string } & Record<string, string>> = []

 for (const locale of SUPPORTED_LOCALES) {
 if (locale === "vi") continue
 const row = fields[locale]
 const hasValue = fieldKeys.some((k) => row[k]?.trim())
 if (!hasValue) continue

 const entry: { language_code: string } & Record<string, string> = {
 language_code: locale,
 }
 for (const key of fieldKeys) {
 entry[key] = row[key] ?? ""
 }
 result.push(entry)
 }

 return result
}

/**
 * Hydrate state từ detail API: vi từ main fields, en/ko từ translations[].
 */
export function hydrateLocaleFields(
 fieldKeys: string[],
 main: Record<string, string | null | undefined>,
 translations: Array<{ language_code: string } & Record<string, string | null | undefined>>,
): LocaleFieldsState {
 const state = emptyLocaleFields(fieldKeys)

 for (const key of fieldKeys) {
 state.vi[key] = main[key] ?? ""
 }

 for (const tr of translations) {
 const locale = tr.language_code as SupportedLocale
 if (!SUPPORTED_LOCALES.includes(locale) || locale === "vi") continue
 for (const key of fieldKeys) {
 state[locale][key] = tr[key] ?? ""
 }
 }

 return state
}
