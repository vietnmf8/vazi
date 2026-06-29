"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import {
 SUPPORTED_LOCALES,
 type SupportedLocale,
} from "@/components/shared/locale-fields"
import { t } from "@/lib/i18n"

export type NavLinkItem = {
 href: string
 translations: Record<SupportedLocale, string>
}

function emptyNavLink(): NavLinkItem {
 return {
 href: "",
 translations: { vi: "", en: "", ko: "" },
 }
}

function parseNavLinks(value: unknown): NavLinkItem[] {
 if (!Array.isArray(value)) return []
 return value.map((item) => {
 const row = item as { href?: string; translations?: Record<string, string> }
 return {
 href: row.href ?? "",
 translations: {
 vi: row.translations?.vi ?? "",
 en: row.translations?.en ?? "",
 ko: row.translations?.ko ?? "",
 },
 }
 })
}

type NavLinksSettingsFormProps = {
 value: unknown
 onChange: (next: NavLinkItem[]) => void
}

/**
 * Editor mảng nav links — href + nhãn vi/en/ko, khớp SITE_HEADER_NAV / footer links.
 */
export function NavLinksSettingsForm({ value, onChange }: NavLinksSettingsFormProps) {
 const [items, setItems] = useState<NavLinkItem[]>(() => parseNavLinks(value))
 const [activeLocale, setActiveLocale] = useState<SupportedLocale>("vi")

 useEffect(() => {
 setItems(parseNavLinks(value))
 }, [value])

 function commit(next: NavLinkItem[]) {
 setItems(next)
 onChange(next)
 }

 function updateItem(index: number, patch: Partial<NavLinkItem>) {
 const next = items.map((item, i) => (i === index ? { ...item, ...patch } : item))
 commit(next)
 }

 function updateLabel(index: number, label: string) {
 const next = items.map((item, i) =>
 i === index
 ? { ...item, translations: { ...item.translations, [activeLocale]: label } }
 : item,
 )
 commit(next)
 }

 return (
 <div className="space-y-4">
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
 onClick={() => setActiveLocale(locale)}
 className="flex-1 min-h-9 rounded-md text-sm font-medium"
 style={{
 backgroundColor:
 activeLocale === locale ? "var(--color-surface-elevated)" : "transparent",
 }}
 >
 {t(`content.locale.${locale}`)}
 </button>
 ))}
 </div>

 {items.length === 0 && (
 <p style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)" }}>
 {t("settings.navLinksEmpty")}
 </p>
 )}

 {items.map((item, index) => (
 <div
 key={`nav-${index}`}
 className="rounded-xl p-4 space-y-3"
 style={{ border: "1px solid var(--color-border-default)" }}
 >
 <div className="flex items-center justify-between gap-2">
 <span className="font-medium text-sm">
 {t("settings.navLinkItem")} #{index + 1}
 </span>
 <Button
 type="button"
 variant="ghost"
 size="sm"
 onClick={() => commit(items.filter((_, i) => i !== index))}
 >
 {t("common.delete")}
 </Button>
 </div>
 <div>
 <label className="block font-medium mb-1 text-sm" htmlFor={`nav-href-${index}`}>
 {t("settings.field.href")}
 </label>
 <Input
 id={`nav-href-${index}`}
 value={item.href}
 onChange={(e) => updateItem(index, { href: e.target.value })}
 placeholder="/guide"
 />
 </div>
 <div>
 <label className="block font-medium mb-1 text-sm" htmlFor={`nav-label-${index}`}>
 {t("settings.field.navLabel")}
 </label>
 <Input
 id={`nav-label-${index}`}
 value={item.translations[activeLocale]}
 onChange={(e) => updateLabel(index, e.target.value)}
 />
 </div>
 </div>
 ))}

 <Button type="button" variant="outline" onClick={() => commit([...items, emptyNavLink()])}>
 {t("settings.addNavLink")}
 </Button>
 </div>
 )
}
