
"use client"
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query"
import { useEffect, useMemo, useState, useCallback } from "react"
import { format } from "date-fns"
import type { ColumnDef } from "@tanstack/react-table"
import { DataTable } from "@/components/data-table/DataTable"
import { AdvancedTable } from "@/components/data-table/AdvancedTable"
import { useTableState } from "@/hooks/useTableState"
import { useSelectedRecord } from "@/hooks/useSelectedRecord"
import { Loader2 } from "lucide-react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/AlertDialog"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { showToast } from "@/components/ui/Toast"
import { TranslationTabs } from "@/components/shared/TranslationTabs"
import { t } from "@/lib/i18n"
import { MasterShell } from "@/components/shared/MasterShell"
import { EditPanel } from "@/components/shared/EditPanel"
import { emptyLocaleFields, hydrateLocaleFields, hydrateFromTranslationsOnly, buildAllLocaleTranslations, buildApiTranslations, type LocaleFieldsState, type SupportedLocale } from "@/components/shared/locale-fields"
import { fetchStepGuidelineDetail, createStepGuideline, updateStepGuideline, deleteStepGuideline } from "@/lib/api/content.api"
import { useSteps, useStepMutations } from "@/hooks/useSteps"
import type { AdminStepGuidelineListItem, PaginatedResponse } from "@/types/api"

export function StepsPage() {
  const qc = useQueryClient()
  const { query, setParams } = useTableState({ page: "1" })
  const page = Number(query.page) || 1
  const setPage = (p: number) => setParams({ page: String(p) })
 
 const [loadingDetail, setLoadingDetail] = useState(false)
 const [activeLocale, setActiveLocale] = useState<SupportedLocale>("vi")
 const STEP_KEYS = ["title", "description"] as const
 const [localeFields, setLocaleFields] = useState<LocaleFieldsState>(() =>
 emptyLocaleFields([...STEP_KEYS]),
 )
 const [meta, setMeta] = useState({
 step_number: 1,
 icon: "",
 display_order: 0,
 is_active: true,
 })

  const { data, isLoading } = useSteps({ page, limit: 20 })

  const [selected, setSelected] = useSelectedRecord<AdminStepGuidelineListItem>(data?.data)


 useEffect(() => {
 if (!selected) {
 setLocaleFields(emptyLocaleFields([...STEP_KEYS]))
 setMeta({ step_number: 1, icon: "", display_order: 0, is_active: true })
 return
 }
 setLoadingDetail(true)
 void fetchStepGuidelineDetail(selected.id)
 .then((detail) => {
 setMeta({
 step_number: detail.step_number,
 icon: detail.icon ?? "",
 display_order: detail.display_order,
 is_active: detail.is_active,
 })
 setLocaleFields(hydrateFromTranslationsOnly([...STEP_KEYS], detail.translations))
 })
 .catch(() => showToast(t("common.error"), "error"))
 .finally(() => setLoadingDetail(false))
 }, [selected])

 const saveMutation = useMutation({
 mutationFn: async () => {
 const translations = buildAllLocaleTranslations(localeFields, [...STEP_KEYS]) as Array<{
 language_code: string
 title: string
 description: string
 }>
 const body = { ...meta, icon: meta.icon || undefined, translations }
  if (selected) return updateStepGuideline(selected.id, body)
  return createStepGuideline(body)
  },
 onSuccess: () => {
 qc.invalidateQueries({ queryKey: ["step-guidelines"] })
 showToast(t("common.saved"), "success")
 setSelected(null)
 },
 onError: () => showToast(t("common.error"), "error"),
 })

 const deleteMutation = useMutation({
 mutationFn: deleteStepGuideline,
 onSuccess: () => {
 qc.invalidateQueries({ queryKey: ["step-guidelines"] })
 showToast(t("common.deleted"), "success")
 setSelected(null)
 },
 onError: () => showToast(t("common.error"), "error"),
 })

 const columns = useMemo<ColumnDef<AdminStepGuidelineListItem, unknown>[]>(
 () => [
 { accessorKey: "step_number", header: t("content.colStep") },
 { accessorKey: "icon", header: "Icon" },
 { accessorKey: "display_order", header: t("content.colOrder") },
 {
 accessorKey: "is_active",
 header: t("content.colStatus"),
 cell: ({ row }) =>
 row.original.is_active ? t("common.active") : t("common.inactive"),
 },
],
 [],
 )

 return (
 <div className="p-6">
 <h1 className="text-2xl font-bold mb-6">{t("nav.steps")}</h1>
 <div className="flex flex-col lg:flex-row gap-6">
 <div className="flex-1">
 <Button
 variant="outline"
 className="mb-4"
 onClick={() => {
 setSelected(null)
 setActiveLocale("vi")
 }}
 >
 {t("content.createStep")}
 </Button>
 <DataTable
 columns={columns}
 data={data?.data ?? []}
 isLoading={isLoading}
 emptyMessage={t("content.empty")}
 pagination={data?.pagination}
 onPageChange={setPage}
 onRowClick={(row) => {
 setSelected(row)
 setActiveLocale("vi")
 }}
 />
 </div>
 <aside
 className="w-full lg:w-md shrink-0 rounded-xl p-5 space-y-4"
 style={{
 backgroundColor: "var(--color-surface-elevated)",
 border: "1px solid var(--color-border-default)",
 }}
 >
 {loadingDetail && selected ? (
 <p>{t("common.loading")}</p>
 ) : (
 <>
 <Input
 type="number"
 placeholder={t("content.colStep")}
 value={meta.step_number}
 onChange={(e) =>
 setMeta((m) => ({ ...m, step_number: Number(e.target.value) || 1 }))
 }
 />
 <Input
 placeholder="Icon (lucide name)"
 value={meta.icon}
 onChange={(e) => setMeta((m) => ({ ...m, icon: e.target.value }))}
 />
 <Input
 type="number"
 placeholder={t("content.colOrder")}
 value={meta.display_order}
 onChange={(e) =>
 setMeta((m) => ({ ...m, display_order: Number(e.target.value) || 0 }))
 }
 />
 <label className="flex items-center gap-2 min-h-11">
 <input
 type="checkbox"
 checked={meta.is_active}
 onChange={(e) => setMeta((m) => ({ ...m, is_active: e.target.checked }))}
 />
 {t("common.active")}
 </label>
 <TranslationTabs
 activeLocale={activeLocale}
 onLocaleChange={setActiveLocale}
 fields={[
 { key: "title", labelKey: "content.colTitle" },
 { key: "description", labelKey: "content.colDescription", multiline: true },
]}
 values={localeFields[activeLocale]}
 onFieldChange={(key, value) =>
 setLocaleFields((prev) => ({
 ...prev,
 [activeLocale]: { ...prev[activeLocale], [key]: value },
 }))
 }
 />
 <div className="flex gap-2">
 <Button onClick={() => saveMutation.mutate()}>{t("common.save")}</Button>
 {selected && (
 <Button variant="ghost" onClick={() => deleteMutation.mutate(selected.id)}>
 {t("common.delete")}
 </Button>
 )}
 </div>
 </>
 )}
 </aside>
 </div>
 </div>
 )
}
