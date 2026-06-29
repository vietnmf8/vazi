"use client"

import { useEffect, useMemo, useState } from "react"
import { TranslationTabs } from "@/components/shared/TranslationTabs"
import {
 emptyLocaleFields,
 SUPPORTED_LOCALES,
 type LocaleFieldsState,
 type SupportedLocale,
} from "@/components/shared/locale-fields"
import { Input } from "@/components/ui/Input"
import { t } from "@/lib/i18n"
import { CircleMinus } from "lucide-react"
import { NavLinksSettingsForm } from "./NavLinksSettingsForm"
import {
 readLocalizedMap,
 readLocalizedSection,
 writeLocalizedMap,
 writeLocalizedSection,
 type LocalizedMapsSettingsSchema,
 type LocalizedSettingsSchema,
 type ScalarSettingsSchema,
 type LocalizedArraySettingsSchema,
 type SettingsFormSchema,
} from "./settings-form-schemas"

type StructuredSettingsFormProps = {
 schema: SettingsFormSchema
 value: unknown
 onChange: (next: unknown) => void
 actionButton?: React.ReactNode
}

/**
 * Form có cấu trúc cho global scalar / page localized — bổ sung JSON editor, không thay thế hoàn toàn.
 */
export function StructuredSettingsForm({
 schema,
 value,
 onChange,
 actionButton,
}: StructuredSettingsFormProps) {
 if (schema.kind === "scalar") {
 return <ScalarForm schema={schema} value={value} onChange={onChange} />
 }
 if (schema.kind === "navLinks") {
 return <NavLinksSettingsForm value={value} onChange={onChange} />
 }
 if (schema.kind === "localizedMaps") {
 return <LocalizedMapsForm schema={schema} value={value} onChange={onChange} />
 }
 if (schema.kind === "localizedArray") {
 return <LocalizedArrayForm schema={schema} value={value} onChange={onChange} actionButton={actionButton} />
 }
 return <LocalizedForm schema={schema} value={value} onChange={onChange} />
}

function ScalarForm({
 schema,
 value,
 onChange,
}: {
 schema: ScalarSettingsSchema
 value: unknown
 onChange: (next: unknown) => void
}) {
 const initial = useMemo(() => {
 if (schema.isPrimitive) {
 return { value: typeof value === "string" ? value : "" }
 }
 const obj = value && typeof value === "object" ? (value as Record<string, string>) : {}
 return Object.fromEntries(schema.fields.map((f) => [f.key, obj[f.key] ?? ""]))
 }, [schema, value])

 const [fields, setFields] = useState<Record<string, string>>(initial)

 useEffect(() => {
 setFields(initial)
 }, [initial])

 function update(key: string, next: string) {
 const merged = { ...fields, [key]: next }
 setFields(merged)
 if (schema.isPrimitive) {
 onChange(merged.value ?? "")
 return
 }
 onChange(merged)
 }

 return (
 <div className="space-y-4">
 {schema.fields.map((field) => (
 <div key={field.key}>
 <label className="block font-medium mb-1" htmlFor={`scalar-${field.key}`}>
 {t(field.labelKey)}
 </label>
 {field.multiline ? (
 <textarea
 id={`scalar-${field.key}`}
 rows={field.rows ?? 3}
 value={fields[field.key] ?? ""}
 onChange={(e) => update(field.key, e.target.value)}
 className="w-full rounded-lg p-3"
 style={{
 border: "1px solid var(--color-border-strong)",
 backgroundColor: "var(--color-surface-elevated)",
 }}
 />
 ) : (
 <Input
 id={`scalar-${field.key}`}
 value={fields[field.key] ?? ""}
 onChange={(e) => update(field.key, e.target.value)}
 />
 )}
 </div>
 ))}
 </div>
 )
}

function LocalizedMapsForm({
 schema,
 value,
 onChange,
}: {
 schema: LocalizedMapsSettingsSchema
 value: unknown
 onChange: (next: unknown) => void
}) {
 const [activeLocale, setActiveLocale] = useState<SupportedLocale>("vi")
 const [mapStates, setMapStates] = useState<Record<string, Record<SupportedLocale, string>>>({})

 useEffect(() => {
 const next: Record<string, Record<SupportedLocale, string>> = {}
 for (const section of schema.sections) {
 next[section.path] = readLocalizedMap(value, section.path)
 }
 setMapStates(next)
 }, [schema, value])

 function handleChange(sectionPath: string, locale: SupportedLocale, text: string) {
 setMapStates((prev) => {
 const current = prev[sectionPath] ?? { vi: "", en: "", ko: "" }
 const updated = { ...current, [locale]: text }
 const merged = { ...prev, [sectionPath]: updated }
 let nextValue: unknown = value
 for (const section of schema.sections) {
 const state = merged[section.path]
 if (state) {
 nextValue = writeLocalizedMap(nextValue, section.path, state)
 }
 }
 onChange(nextValue)
 return merged
 })
 }

 return (
 <div className="space-y-8">
 {schema.sections.map((section) => {
 const state = mapStates[section.path] ?? { vi: "", en: "", ko: "" }
 return (
 <section key={section.path} className="space-y-3">
 <h3 className="font-semibold" style={{ fontSize: "var(--font-size-md)" }}>
 {t(section.labelKey)}
 </h3>
 <div>
 <label className="block font-medium mb-1 text-sm" htmlFor={`map-${section.path}`}>
 {t(`content.locale.${activeLocale}`)}
 </label>
 <div
 className="flex gap-1 p-1 rounded-lg mb-2"
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
 <Input
 id={`map-${section.path}`}
 value={state[activeLocale]}
 onChange={(e) => handleChange(section.path, activeLocale, e.target.value)}
 />
 </div>
 </section>
 )
 })}
 </div>
 )
}

function LocalizedForm({
 schema,
 value,
 onChange,
}: {
 schema: LocalizedSettingsSchema
 value: unknown
 onChange: (next: unknown) => void
}) {
 const [activeLocale, setActiveLocale] = useState<SupportedLocale>("vi")
 const [sectionStates, setSectionStates] = useState<Record<string, LocaleFieldsState>>({})

 useEffect(() => {
 const next: Record<string, LocaleFieldsState> = {}
 for (const section of schema.sections) {
 const keys = section.fields.map((f) => f.key)
 const fromDb = readLocalizedSection(value, section.path)
 if (fromDb) {
 next[section.path] = SUPPORTED_LOCALES.reduce((acc, locale) => {
 acc[locale] = Object.fromEntries(keys.map((k) => [k, fromDb[locale][k] ?? ""]))
 return acc
 }, emptyLocaleFields(keys))
 } else {
 next[section.path] = emptyLocaleFields(keys)
 }
 }
 setSectionStates(next)
 }, [schema, value])

 function handleFieldChange(sectionPath: string, fieldKey: string, fieldValue: string) {
 setSectionStates((prev) => {
 const section = prev[sectionPath]
 if (!section) return prev
 const updatedSection: LocaleFieldsState = {
 ...section,
 [activeLocale]: { ...section[activeLocale], [fieldKey]: fieldValue },
 }
 const merged = { ...prev, [sectionPath]: updatedSection }
 let nextValue: unknown = value
 for (const s of schema.sections) {
 const state = merged[s.path]
 if (state) {
 nextValue = writeLocalizedSection(nextValue, s.path, state)
 }
 }
 onChange(nextValue)
 return merged
 })
 }

 return (
 <div className="space-y-8">
 {schema.sections.map((section) => {
 const state = sectionStates[section.path]
 if (!state) return null
 return (
 <section key={section.path} className="space-y-3">
 <h3 className="font-semibold" style={{ fontSize: "var(--font-size-md)" }}>
 {t(section.labelKey)}
 </h3>
 <TranslationTabs
 activeLocale={activeLocale}
 onLocaleChange={setActiveLocale}
 fields={section.fields.map((f) => ({
 key: f.key,
 labelKey: f.labelKey,
 multiline: f.multiline,
 rows: f.rows,
 }))}
 values={state[activeLocale]}
 onFieldChange={(key, v) => handleFieldChange(section.path, key, v)}
 />
 </section>
 )
 })}
 </div>
 )
}

export function LocalizedArrayForm({
 schema,
 value,
 onChange,
 actionButton,
}: {
 schema: LocalizedArraySettingsSchema
 value: unknown
 onChange: (next: unknown) => void
 actionButton?: React.ReactNode
}) {
 const items = useMemo(() => {
 let arr: any[] = []
 if (Array.isArray(value)) {
 arr = value
 } else if (value && typeof value === "object") {
 if (schema.path && Array.isArray((value as Record<string, any>)[schema.path])) {
 arr = (value as Record<string, any>)[schema.path]
 } else {
 for (const v of Object.values(value)) {
 if (Array.isArray(v)) {
 arr = v
 break
 }
 }
 }
 }

 if (arr.length === 0) {
 arr = [{}]
 }

 return arr.map((item) => {
 const parsedItem = { ...item }
 for (const f of schema.fields) {
 const val = parsedItem[f.key]
 if (val && typeof val === "object" && val.vi !== undefined) {
 parsedItem[f.key] = {
 ...val,
 vi: String(val.vi || "")
 .replace(/<accent>/g, "**")
 .replace(/<\/accent>/g, "**"),
 }
 } else if (typeof val === "string") {
 parsedItem[f.key] = val
 .replace(/<accent>/g, "**")
 .replace(/<\/accent>/g, "**")
 }
 }
 return parsedItem
 })
 }, [value, schema])

 function triggerOnChange(newItems: any[]) {
 let arrayKey: string | null = null
 if (!Array.isArray(value)) {
 if (value && typeof value === "object" && schema.path && Array.isArray((value as Record<string, any>)[schema.path])) {
 arrayKey = schema.path
 } else if (value && typeof value === "object") {
 for (const [k, v] of Object.entries(value)) {
 if (Array.isArray(v)) {
 arrayKey = k
 break
 }
 }
 }
 if (!arrayKey && schema.path === "") {
 arrayKey = "steps"
 }
 }

 const savedArr = newItems.map((itm) => {
 const savedItem = { ...itm }
 for (const f of schema.fields) {
 const val = savedItem[f.key]
 if (val && typeof val === "object" && val.vi !== undefined) {
 savedItem[f.key] = {
 ...val,
 vi: String(val.vi).replace(/\*\*(.*?)\*\*/g, "<accent>$1</accent>"),
 }
 } else if (typeof val === "string") {
 savedItem[f.key] = String(val).replace(/\*\*(.*?)\*\*/g, "<accent>$1</accent>")
 }
 }
 return savedItem
 })
 
 if (arrayKey) {
 const base = value && typeof value === "object" ? { ...value } : {}
 onChange({ ...base, [arrayKey]: savedArr })
 } else if (schema.path) {
 const base = value && typeof value === "object" ? { ...value } : {}
 onChange({ ...base, [schema.path]: savedArr })
 } else {
 onChange(savedArr)
 }
 }

 function updateItemField(index: number, key: string, nextText: string) {
 const newItems = [...items]
 const item = { ...newItems[index] }

 if (item[key] && typeof item[key] === "object") {
 item[key] = { ...item[key], vi: nextText, en: nextText, ko: nextText }
 } else {
 item[key] = nextText
 }
 newItems[index] = item
 triggerOnChange(newItems)
 }

 function handleAdd() {
 const newItem: any = {}
 schema.fields.forEach(f => {
 newItem[f.key] = { vi: "", en: "", ko: "" }
 })
 const newItems = [...items, newItem]
 triggerOnChange(newItems)
 }

 function handleRemove(index: number) {
 const newItems = items.filter((_, i) => i !== index)
 triggerOnChange(newItems)
 }

 return (
 <div className="space-y-6">
 {items.map((item, index) => (
 <div key={index} className="p-4 rounded-xl space-y-4 relative" style={{ backgroundColor: "var(--color-surface-elevated)", border: "1px solid var(--color-border-strong)" }}>
 <div className="flex justify-between items-center">
 <h4 className="font-semibold" style={{ fontSize: "var(--font-size-md)" }}>Bước {index + 1}</h4>
 <button onClick={() => handleRemove(index)} className="text-red-500 hover:text-red-700 font-medium flex items-center justify-center p-1 rounded-full hover:bg-red-50">
 <CircleMinus className="w-5 h-5" />
 </button>
 </div>
 {schema.fields.map(field => {
 const val = item[field.key]
 const textValue = (val && typeof val === "object") ? (val.vi || "") : (val || "")
 return (
 <div key={field.key}>
 <label className="block text-sm font-medium mb-1">{field.labelKey}</label>
 {field.multiline ? (
 <textarea
 value={textValue}
 onChange={(e) => updateItemField(index, field.key, e.target.value)}
 rows={field.rows || 3}
 className="w-full rounded-lg p-3"
 style={{ border: "1px solid var(--color-border-strong)", backgroundColor: "transparent" }}
 />
 ) : (
 <Input
 value={textValue}
 onChange={(e) => updateItemField(index, field.key, e.target.value)}
 />
 )}
 </div>
 )
 })}
 </div>
 ))}
 <div className="pt-2 flex items-center gap-4">
 <button
 onClick={handleAdd}
 className="px-4 py-2 text-sm font-medium rounded-lg text-white hover:opacity-90 transition-opacity"
 style={{ backgroundColor: "var(--color-success)" }}
 >
 + Thêm bước
 </button>
 {actionButton}
 </div>
 </div>
 )
}
