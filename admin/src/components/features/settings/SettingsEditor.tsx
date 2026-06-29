"use client"

import { useEffect, useMemo, useState, useRef } from "react"
import { format } from "date-fns"
import { PageHeader } from "@/components/layout/PageHeader"
import { Button } from "@/components/ui/Button"
import { showToast } from "@/components/ui/Toast"
import { t } from "@/lib/i18n"
import type { AdminSettingItem } from "@/types/api"
import { getSettingsFormSchema } from "./settings-form-schemas"
import { StructuredSettingsForm } from "./StructuredSettingsForm"

type SettingsEditorProps = {
 titleKey: string
 editorKind: "global" | "page"
 items: AdminSettingItem[] | undefined
 isLoading: boolean
 onSave: (key: string, value: unknown) => Promise<void>
}

type EditorMode = "form" | "json"

/**
 * Editor settings — form có cấu trúc cho khóa đã biết, JSON cho phần còn lại.
 */
export function SettingsEditor({
 titleKey,
 editorKind,
 items,
 isLoading,
 onSave,
}: SettingsEditorProps) {
 const [selectedKey, setSelectedKey] = useState<string | null>(null)
 const [jsonText, setJsonText] = useState("")
 const [formValue, setFormValue] = useState<unknown>(null)
 const [saving, setSaving] = useState(false)

 // Instant sync from props to avoid layout flicker
 const prevSelectedKeyRef = useRef<string | null>(null)
 const prevItemsRef = useRef<AdminSettingItem[] | undefined>(undefined)

 if (selectedKey !== prevSelectedKeyRef.current || items !== prevItemsRef.current) {
 prevSelectedKeyRef.current = selectedKey
 prevItemsRef.current = items

 let initialKey = selectedKey
 if (!initialKey && items?.length) {
 if (typeof window !== "undefined") {
 const urlParams = new URLSearchParams(window.location.search)
 initialKey = urlParams.get("key")
 }
 if (!initialKey || !items.find(i => i.key === initialKey)) {
 initialKey = items[0].key
 }
 setSelectedKey(initialKey)
 }

 const target = items?.find((i) => i.key === initialKey)
 if (target) {
 setFormValue(target.value)
 setJsonText(JSON.stringify(target.value, null, 2))
 }
 }

 const selected = items?.find((i) => i.key === selectedKey)
 const schema = selectedKey ? getSettingsFormSchema(selectedKey, editorKind) : null
 const hasFormSchema = schema !== null

 function handleSelectKey(key: string) {
 setSelectedKey(key)
 if (typeof window !== "undefined") {
 const newUrl = new URL(window.location.href)
 newUrl.searchParams.set("key", key)
 window.history.replaceState({}, "", newUrl.toString())
 }
 }

 const parsedJson = useMemo(() => {
 try {
 return JSON.parse(jsonText) as unknown
 } catch {
 return null
 }
 }, [jsonText])

 const isDirty = useMemo(() => {
 if (!selected) return false
 if (hasFormSchema) {
 return JSON.stringify(formValue) !== JSON.stringify(selected.value)
 }
 if (parsedJson === null) return false
 return JSON.stringify(parsedJson) !== JSON.stringify(selected.value)
 }, [formValue, parsedJson, selected, hasFormSchema])

 const isValid = useMemo(() => {
 if (!hasFormSchema) return parsedJson !== null
 if (!formValue) return false
 if (Array.isArray(formValue)) {
 if (formValue.length === 0) return false
 if (schema?.kind === "localizedArray") {
 for (const item of formValue as Record<string, any>[]) {
 for (const f of schema.fields) {
 const val = item[f.key]
 if (!val) return false
 if (typeof val === "object" && !val.vi && !val.en && !val.ko) return false
 if (typeof val === "string" && !val.trim()) return false
 }
 }
 }
 }
 return true
 }, [formValue, hasFormSchema, schema, parsedJson])

 async function handleSave() {
 if (!selectedKey) return

 let payload: unknown
 if (hasFormSchema) {
 if (!formValue || (Array.isArray(formValue) && formValue.length === 0)) {
 showToast("Vui lòng điền đầy đủ dữ liệu trước khi lưu", "error")
 return
 }
 payload = formValue
 } else {
 if (parsedJson === null) {
 showToast(t("settings.invalidJson"), "error")
 return
 }
 payload = parsedJson
 }

 setSaving(true)
 try {
 await onSave(selectedKey, payload)
 showToast(t("common.saved"), "success")
 } catch {
 showToast(t("common.error"), "error")
 } finally {
 setSaving(false)
 }
 }

 if (isLoading) {
 return (
 <div className="p-6">
 <PageHeader titleKey={titleKey} />
 <p>{t("common.loading")}</p>
 </div>
 )
 }

 if (!items?.length) {
 return (
 <div className="p-6">
 <PageHeader titleKey={titleKey} />
 <p style={{ color: "var(--color-text-muted)" }}>{t("settings.empty")}</p>
 </div>
 )
 }

 const actionButton = (
 <Button 
 onClick={handleSave} 
 disabled={saving || !selectedKey || !isDirty || !isValid}
 style={{ backgroundColor: "#2563eb", color: "#fff", borderColor: "#2563eb" }}
 className="hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed px-6"
 >
 {saving ? t("common.saving") : t("common.save")}
 </Button>
 )

 return (
 <div className="p-6">
 <div className="sticky top-0 z-20 pb-4 mb-2 -mt-4 pt-4" style={{ backgroundColor: "var(--color-bg)" }}>
 <PageHeader titleKey={titleKey} />
 </div>

 <div className="flex flex-col lg:flex-row gap-6">
 <aside
 className="w-full lg:w-64 shrink-0 rounded-xl overflow-hidden sticky top-24 self-start"
 style={{ border: "1px solid var(--color-border-default)" }}
 >
 <p
 className="px-4 py-3 font-medium"
 style={{
 backgroundColor: "var(--color-surface-muted)",
 fontSize: "var(--font-size-sm)",
 }}
 >
 {t("settings.selectKey")}
 </p>
 <ul>
 {items.map((item) => {
 const itemSchema = getSettingsFormSchema(item.key, editorKind)
 const label = (itemSchema as any)?.labelKey ?? item.key
 return (
 <li key={item.key}>
 <button
 type="button"
 onClick={() => handleSelectKey(item.key)}
 className="w-full text-left px-4 py-3 min-h-11 transition-colors"
 style={{
 backgroundColor:
 selectedKey === item.key
 ? "var(--color-accent-muted)"
 : "var(--color-surface-elevated)",
 fontSize: "var(--font-size-md)",
 }}
 >
 {label}
 </button>
 </li>
 )
 })}
 </ul>
 </aside>

 <div className="flex-1 space-y-4">
 {selected && (
 <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>
 {t("settings.updatedAt")}: {format(new Date(selected.updated_at), "dd/MM/yyyy HH:mm")}
 </p>
 )}

 {hasFormSchema && schema ? (
 <StructuredSettingsForm
 schema={schema}
 value={formValue}
 onChange={setFormValue}
 actionButton={actionButton}
 />
 ) : (
 <>
 <label className="block font-medium" htmlFor="settings-json">
 {t("settings.jsonValue")}
 </label>
 <textarea
 id="settings-json"
 value={jsonText}
 onChange={(e) => setJsonText(e.target.value)}
 rows={18}
 className="w-full rounded-lg p-4 font-mono"
 style={{
 border: "1px solid var(--color-border-strong)",
 backgroundColor: "var(--color-surface-elevated)",
 fontSize: "var(--font-size-sm)",
 }}
 />
 <div className="pt-2">
 {actionButton}
 </div>
 </>
 )}
 </div>
 </div>
 </div>
 )
}
