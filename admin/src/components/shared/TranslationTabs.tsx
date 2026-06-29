"use client"

import { SUPPORTED_LOCALES, type SupportedLocale } from "@/components/shared/locale-fields"
import { t } from "@/lib/i18n"

import { TiptapEditor } from "@/components/ui/TiptapEditor"

type FieldConfig = {
 key: string
 labelKey: string
 multiline?: boolean
 richText?: boolean
 rows?: number
}

type TranslationTabsProps = {
 activeLocale: SupportedLocale
 onLocaleChange: (locale: SupportedLocale) => void
 fields: FieldConfig[]
 values: Record<string, string>
 onFieldChange: (key: string, value: string) => void
}

/**
 * Tab chuyển locale vi/en/ko cho form admin — dùng chung FAQs, articles, nationalities.
 */
export function TranslationTabs({
 activeLocale,
 onLocaleChange,
 fields,
 values,
 onFieldChange,
}: TranslationTabsProps) {
 return (
 <div className="space-y-3">
 <div
 className="flex gap-1 p-1 rounded-lg"
 role="tablist"
 aria-label={t("content.localeTabs")}
 style={{ backgroundColor: "var(--color-surface-muted)" }}
 >
 {SUPPORTED_LOCALES.map((locale) => (
 <button
 key={locale}
 type="button"
 role="tab"
 aria-selected={activeLocale === locale}
 onClick={() => onLocaleChange(locale)}
 className="flex-1 min-h-9 rounded-md text-sm font-medium transition-colors"
 style={{
 backgroundColor:
 activeLocale === locale ? "var(--color-surface-elevated)" : "transparent",
 color:
 activeLocale === locale
 ? "var(--color-text-primary)"
 : "var(--color-text-muted)",
 border:
 activeLocale === locale
 ? "1px solid var(--color-border-default)"
 : "1px solid transparent",
 }}
 >
 {t(`content.locale.${locale}`)}
 </button>
 ))}
 </div>

 <div role="tabpanel" className="space-y-3">
 {fields.map((field) =>
 field.richText ? (
 <TiptapEditor
 key={`${activeLocale}-${field.key}`}
 value={values[field.key] ?? ""}
 onChange={(html) => onFieldChange(field.key, html)}
 placeholder={t(field.labelKey)}
 />
 ) : field.multiline ? (
 <textarea
 key={field.key}
 aria-label={t(field.labelKey)}
 placeholder={t(field.labelKey)}
 value={values[field.key] ?? ""}
 onChange={(e) => onFieldChange(field.key, e.target.value)}
 rows={field.rows ?? 6}
 className="w-full rounded-lg p-3"
 style={{ border: "1px solid var(--color-border-strong)" }}
 />
 ) : (
 <input
 key={field.key}
 aria-label={t(field.labelKey)}
 placeholder={t(field.labelKey)}
 value={values[field.key] ?? ""}
 onChange={(e) => onFieldChange(field.key, e.target.value)}
 className="w-full rounded-lg px-3 py-2 min-h-11"
 style={{ border: "1px solid var(--color-border-strong)" }}
 />
 ),
 )}
 </div>
 </div>
 )
}
