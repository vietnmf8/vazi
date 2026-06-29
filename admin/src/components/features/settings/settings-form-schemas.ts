import type { SupportedLocale } from "@/components/shared/locale-fields"

export type SettingsFieldDef = {
 key: string
 labelKey: string
 multiline?: boolean
 rows?: number
}

export type LocalizedSectionDef = {
 /** Đường dẫn nested trong JSON page settings, VD: `hero` */
 path: string
 labelKey: string
 fields: SettingsFieldDef[]
}

export type ScalarSettingsSchema = {
 kind: "scalar"
 /** Giá trị DB là string primitive (SITE_HOTLINE) thay vì object */
 isPrimitive?: boolean
 fields: SettingsFieldDef[]
}

export type LocalizedSettingsSchema = {
 kind: "localized"
 sections: LocalizedSectionDef[]
}

export type LocalizedMapsSettingsSchema = {
 kind: "localizedMaps"
 /** Path tới object `{ vi, en, ko }` — VD: `disclaimer.title` trong guide-fees */
 sections: Array<{ path: string; labelKey: string }>
}

export type NavLinksSettingsSchema = {
 kind: "navLinks"
}

export type LocalizedArraySettingsSchema = {
 kind: "localizedArray"
 path: string
 labelKey: string
 fields: SettingsFieldDef[]
}

export type SettingsFormSchema =
 | ScalarSettingsSchema
 | LocalizedSettingsSchema
 | LocalizedMapsSettingsSchema
 | NavLinksSettingsSchema
 | LocalizedArraySettingsSchema

const NAV_LINK_KEYS = new Set([
 "SITE_HEADER_NAV",
 "SITE_FOOTER_QUICK_LINKS",
 "SITE_FOOTER_GUIDE_LINKS",
])

const GLOBAL_SCALAR_KEYS: Record<string, ScalarSettingsSchema> = {
 SITE_HOTLINE: {
 kind: "scalar",
 isPrimitive: true,
 fields: [{ key: "value", labelKey: "settings.field.hotline" }],
 },
 SITE_HOTLINE_TEL: {
 kind: "scalar",
 isPrimitive: true,
 fields: [{ key: "value", labelKey: "settings.field.hotlineTel" }],
 },
 SITE_EMAIL: {
 kind: "scalar",
 isPrimitive: true,
 fields: [{ key: "value", labelKey: "settings.field.email" }],
 },
 SITE_WHATSAPP_URL: {
 kind: "scalar",
 isPrimitive: true,
 fields: [{ key: "value", labelKey: "settings.field.whatsappUrl" }],
 },
 SITE_ADDRESS: {
 kind: "scalar",
 fields: [
 { key: "district", labelKey: "settings.field.district" },
 { key: "city", labelKey: "settings.field.city" },
],
 },
}

const PAGE_SCHEMAS: Record<string, SettingsFormSchema> = {
 home: {
 kind: "localized",
 sections: [
 {
 path: "hero",
 labelKey: "settings.section.hero",
 fields: [
 { key: "eyebrow", labelKey: "settings.field.eyebrow" },
 { key: "headline_1", labelKey: "settings.field.headline1" },
 { key: "headline_2", labelKey: "settings.field.headline2" },
 { key: "headline_3", labelKey: "settings.field.headline3" },
 { key: "subheadline_1", labelKey: "settings.field.subheadline1", multiline: true, rows: 2 },
 { key: "apply_now", labelKey: "settings.field.applyNow" },
 { key: "check_status", labelKey: "settings.field.checkStatus" },
],
 },
 {
 path: "trustSignals",
 labelKey: "settings.section.trustSignals",
 fields: [
 { key: "title", labelKey: "settings.field.title" },
 { key: "stat_1", labelKey: "settings.field.stat1" },
 { key: "stat_2", labelKey: "settings.field.stat2" },
 { key: "stat_3", labelKey: "settings.field.stat3" },
 { key: "stat_4", labelKey: "settings.field.stat4" },
],
 },
],
 },
 "about-us": {
 kind: "localized",
 sections: [
 {
 path: "hero",
 labelKey: "settings.section.hero",
 fields: [
 { key: "title", labelKey: "settings.field.title" },
 { key: "subtitle", labelKey: "settings.field.subtitle", multiline: true, rows: 3 },
],
 },
],
 },
 "emergency-inquiry": {
 kind: "localized",
 sections: [
 {
 path: "hero",
 labelKey: "settings.section.hero",
 fields: [
 { key: "title", labelKey: "settings.field.title" },
 { key: "subtitle", labelKey: "settings.field.subtitle", multiline: true, rows: 2 },
 { key: "alert_title", labelKey: "settings.field.alertTitle" },
],
 },
],
 },
 "guide-fees": {
 kind: "localizedMaps",
 sections: [
 { path: "disclaimer.title", labelKey: "settings.field.disclaimerTitle" },
 { path: "disclaimer.serviceFee", labelKey: "settings.field.serviceFeeLabel" },
],
 },
 "HOME_HOW_IT_WORKS": {
 kind: "localizedArray",
 path: "",
 labelKey: "Hướng dẫn các bước",
 fields: [
 { key: "title", labelKey: "Tiêu đề" },
 { key: "description", labelKey: "Mô tả", multiline: true, rows: 3 },
],
 },
}

/**
 * Trả schema form có cấu trúc cho khóa settings — null nếu chỉ hỗ trợ JSON thuần.
 */
export function getSettingsFormSchema(
 key: string,
 editorKind: "global" | "page",
): SettingsFormSchema | null {
 if (editorKind === "global") {
 if (NAV_LINK_KEYS.has(key)) {
 return { kind: "navLinks" }
 }
 return GLOBAL_SCALAR_KEYS[key] ?? null
 }
 return PAGE_SCHEMAS[key] ?? null
}

/** Đọc chuỗi đa ngôn ngữ dạng `{ vi, en, ko }` tại nested path. */
export function readLocalizedMap(
 value: unknown,
 path: string,
): Record<SupportedLocale, string> {
 let current: unknown = value
 for (const part of path.split(".")) {
 if (!current || typeof current !== "object") {
 return { vi: "", en: "", ko: "" }
 }
 current = (current as Record<string, unknown>)[part]
 }
 if (!current || typeof current !== "object") {
 return { vi: "", en: "", ko: "" }
 }
 const map = current as Record<string, string>
 return { vi: map.vi ?? "", en: map.en ?? "", ko: map.ko ?? "" }
}

/** Ghi map locale vào nested path, giữ nguyên phần JSON khác. */
export function writeLocalizedMap(
 value: unknown,
 path: string,
 localeMap: Record<SupportedLocale, string>,
): unknown {
 const base =
 value && typeof value === "object"
 ? (JSON.parse(JSON.stringify(value)) as Record<string, unknown>)
 : {}

 const parts = path.split(".")
 let cursor: Record<string, unknown> = base
 for (let i = 0; i < parts.length - 1; i++) {
 const part = parts[i]!
 const next = cursor[part]
 if (!next || typeof next !== "object") {
 cursor[part] = {}
 }
 cursor = cursor[part] as Record<string, unknown>
 }
 const leaf = parts[parts.length - 1]!
 cursor[leaf] = { vi: localeMap.vi, en: localeMap.en, ko: localeMap.ko }
 return base
}

/** Đọc nested path `hero` từ object page settings. */
export function readLocalizedSection(
 value: unknown,
 path: string,
): Record<SupportedLocale, Record<string, string>> | null {
 if (!value || typeof value !== "object") return null
 let current: unknown = value
 for (const part of path.split(".")) {
 if (!current || typeof current !== "object") return null
 current = (current as Record<string, unknown>)[part]
 }
 if (!current || typeof current !== "object") return null
 const section = current as Record<string, Record<string, string>>
 return {
 vi: section.vi ?? {},
 en: section.en ?? {},
 ko: section.ko ?? {},
 }
}

/** Ghi lại section đã chỉnh vào bản copy của value — giữ nguyên phần JSON khác. */
export function writeLocalizedSection(
 value: unknown,
 path: string,
 localeData: Record<SupportedLocale, Record<string, string>>,
): unknown {
 const base =
 value && typeof value === "object"
 ? (JSON.parse(JSON.stringify(value)) as Record<string, unknown>)
 : {}

 const parts = path.split(".")
 let cursor: Record<string, unknown> = base
 for (let i = 0; i < parts.length - 1; i++) {
 const part = parts[i]!
 const next = cursor[part]
 if (!next || typeof next !== "object") {
 cursor[part] = {}
 }
 cursor = cursor[part] as Record<string, unknown>
 }
 const leaf = parts[parts.length - 1]!
 cursor[leaf] = {
 vi: localeData.vi,
 en: localeData.en,
 ko: localeData.ko,
 }
 return base
}
