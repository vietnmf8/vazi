"use client"

import { useEffect, useMemo, useState, useRef } from "react"
import { format } from "date-fns"
import type { ColumnDef, SortingState } from "@tanstack/react-table"
import { PageHeader } from "@/components/layout/PageHeader"
import { DataTable } from "@/components/data-table/DataTable"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { showToast } from "@/components/ui/Toast"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TiptapEditor } from "@/components/ui/TiptapEditor"
import { Badge } from "@/components/ui/Badge"
import { m } from "framer-motion"
import { Check, X } from "lucide-react"
import {
 AlertDialog,
 AlertDialogAction,
 AlertDialogCancel,
 AlertDialogContent,
 AlertDialogDescription,
 AlertDialogFooter,
 AlertDialogHeader,
 AlertDialogTitle,
 AlertDialogTrigger,
} from "@/components/ui/AlertDialog"
import { cn } from "@/lib/utils"
import { fetchFaqDetail } from "@/lib/api/faqs.api"
import { useFaqs, useFaqMutations } from "@/hooks/useFaqs"
import { t } from "@/lib/i18n"
import type { AdminFaqListItem } from "@/types/api"
import { triggerUiRevalidate } from "@/lib/actions/revalidate"
import { useDebouncedLoading } from "@/hooks/useDebouncedLoading"
import { useTableState } from "@/hooks/useTableState"
import { useSelectedRecord } from "@/hooks/useSelectedRecord"

export default function FaqsPage() {
 const textareaRef = useRef<HTMLTextAreaElement>(null)
 const { query, setParams } = useTableState({ page: "1", search: "" })
  const page = Number(query.page) || 1
  const search = query.search || ""
  const setPage = (p: number) => setParams({ page: String(p) })
  const setSearch = (s: string) => setParams({ search: s })
 const [debouncedSearch, setDebouncedSearch] = useState("")
 const [sorting, setSorting] = useState<SortingState>([{ id: "display_order", desc: true }])
  const [loadingDetail, setLoadingDetail] = useState(false)
 const [form, setForm] = useState({
 category: "general",
 question: "",
 answer: "",
 is_active: true,
 })
 const [originalForm, setOriginalForm] = useState({
 category: "general",
 question: "",
 answer: "",
 is_active: true,
 })

 const { update, create, remove } = useFaqMutations()

 useEffect(() => {
 const timer = setTimeout(() => setDebouncedSearch(search), 400)
 return () => clearTimeout(timer)
 }, [search])

 const sortString = useMemo(() => {
 if (!sorting.length) return undefined
 const { id, desc } = sorting[0]
 return desc ? `-${id}` : id
 }, [sorting])

 const { data, isLoading } = useFaqs({
 page,
 limit: 20,
 ...(debouncedSearch ? { search: debouncedSearch } : {}),

  
 ...(sortString ? { sort: sortString } : {}),
 })

  const [selected, setSelected] = useSelectedRecord<any>(data?.data)

  useEffect(() => {
 if (!selected) {
 const defaultForm = { category: "general", question: "", answer: "", is_active: true }
 setForm(defaultForm)
 setOriginalForm(defaultForm)
 return
 }

 setLoadingDetail(true)
 void fetchFaqDetail(selected.id)
 .then((detail) => {
 const viQ = detail.translations?.find(t => t.language_code === "vi")?.question || detail.question
 const viA = detail.translations?.find(t => t.language_code === "vi")?.answer || detail.answer
 const data = {
 category: detail.category,
 question: viQ,
 answer: viA,
 is_active: detail.is_active,
 }
 setForm(data)
 setOriginalForm(data)
 })
 .catch(() => showToast(t("common.error"), "error"))
 .finally(() => setLoadingDetail(false))
 }, [selected])

 useEffect(() => {
 if (textareaRef.current) {
 textareaRef.current.style.height = "auto"
 textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
 }
 }, [form.question])

 const columns = useMemo<ColumnDef<AdminFaqListItem, unknown>[]>(
 () => [
 { 
 accessorKey: "display_order", 
 header: "STT",
 enableSorting: true,
 sortDescFirst: true,
 size: 80,
 },
 { 
 accessorKey: "category", 
 header: t("content.colCategory"),
 size: 200,
 cell: ({ row }) => <div className="whitespace-nowrap">{row.original.category === "general" ? t("content.categoryGeneral") : t("content.categoryHowToApply")}</div>,
 },
 {
 accessorKey: "question",
 header: t("content.question"),
 size: 350,
 cell: ({ row }) => {
 const viQ = row.original.translations?.find(t => t.language_code === "vi")?.question || row.original.question;
 return <div className="truncate max-w-[350px]">{viQ}</div>;
 },
 },
 {
 accessorKey: "is_active",
 header: t("content.colStatus"),
 size: 140,
 cell: ({ row }) => {
 const isActive = row.original.is_active;
 return isActive ? (
 <Badge style={{ backgroundColor: "#dcfce7", color: "#166534" }} className="hover:bg-[#bbf7d0] border-transparent shadow-none font-medium rounded-full min-w-[110px] flex items-center justify-center whitespace-nowrap">{t("common.active")}</Badge>
 ) : (
 <Badge style={{ backgroundColor: "#f4f4f5", color: "#3f3f46" }} className="hover:bg-[#e4e4e7] border-transparent shadow-none font-medium rounded-full min-w-[110px] flex items-center justify-center whitespace-nowrap">{t("common.inactive")}</Badge>
 );
 }
 },
 {
 accessorKey: "created_at",
 header: t("content.colDate"),
 size: 120,
 cell: ({ row }) => format(new Date(row.original.created_at), "dd/MM/yyyy"),
 },
],
 [],
 )

 async function handleSave() {
 const isEmptyString = (str: string) => !str.trim() || str.trim() === "<p></p>";
 const isFormValid = !isEmptyString(form.question) && !isEmptyString(form.answer);
 
 if (!isFormValid) {
 showToast(t("common.error"), "error")
 return
 }

 const body = {
 category: form.category,
 question: form.question,
 answer: form.answer,
 is_active: form.is_active,
 }

 try {
 if (selected) {
 await update.mutateAsync({ id: selected.id, body })
 setOriginalForm(form)
 } else {
 await create.mutateAsync(body)
 const defaultForm = { category: "general", question: "", answer: "", is_active: true }
 setForm(defaultForm)
 setOriginalForm(defaultForm)
 setPage(1)
 setSorting([{ id: "display_order", desc: true }])
 }
 showToast(t("common.saved"), "success")
 void triggerUiRevalidate("faqs")
 } catch {
 showToast(t("common.error"), "error")
 }
 }

 async function handleDelete() {
 if (!selected) return
 try {
 await remove.mutateAsync(selected.id)
 showToast(t("common.deleted"), "success")
 setSelected(null)
 void triggerUiRevalidate("faqs")
 } catch {
 showToast(t("common.error"), "error")
 }
 }

 const showLoading = useDebouncedLoading(loadingDetail)

 const isFormValid = form.question.trim() !== "" && form.answer.trim() !== "" && form.answer.trim() !== "<p></p>"
 const isFormChanged = JSON.stringify(form) !== JSON.stringify(originalForm)
 const isSaveDisabled = !isFormValid || (selected ? !isFormChanged : false)

 return (
 <div className="p-6">
 <PageHeader titleKey="nav.faqs" />

 <div className="flex flex-col lg:flex-row gap-6">
 <div className="flex-1">
 <div className="flex gap-3 mb-4">
 <Input
 placeholder={t("content.searchPlaceholder")}
 value={search}
 onChange={(e) => {
 setSearch(e.target.value)
 setPage(1)
 }}
 className="max-w-sm bg-white shadow-sm border-gray-300 "
 />
 </div>

 <DataTable
 columns={columns}
 data={data?.data ?? []}
 isLoading={isLoading}
 emptyMessage={t("content.noFaqs")}
 pagination={data?.pagination}
 onPageChange={setPage}
 onRowClick={(row) => {
 setSelected(row)
 }}
 activeRowPredicate={(row) => row.id === selected?.id}
 manualSorting={true}
 sorting={sorting}
 onSortingChange={setSorting}
 />
 </div>

 <aside
 className="w-full lg:w-[28rem] shrink-0 rounded-xl p-5 flex flex-col h-fit lg:sticky lg:top-20 z-10"
 style={{
 backgroundColor: "var(--color-surface-elevated)",
 border: "1px solid var(--color-border-default)",
 maxHeight: "calc(100vh - 100px)",
 overflowY: "auto"
 }}
 >
 <Tabs 
 value={selected ? "edit" : "create"} 
 onValueChange={(val) => {
 if (val === "create") setSelected(null)
 }} 
 className="mb-4"
 >
 <TabsList className="grid w-full grid-cols-2 bg-gray-100 p-1 rounded-lg">
 <TabsTrigger value="create" className="data-[state=active]:bg-[#2563eb] data-[state=active]:text-white rounded-md transition-all">{t("content.createFaq")}</TabsTrigger>
 <TabsTrigger value="edit" disabled={!selected} className="data-[state=active]:bg-[#2563eb] data-[state=active]:text-white rounded-md transition-all">{t("content.edit")}</TabsTrigger>
 </TabsList>
 </Tabs>

 {showLoading ? (
 <p className="py-4 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>{t("common.loading")}</p>
 ) : (
 <div className="space-y-4">
 <select
 value={form.category}
 onChange={(e) => setForm((m) => ({ ...m, category: e.target.value }))}
 className="rounded-lg px-3 py-2 min-h-11 w-full"
 aria-label={t("content.colCategory")}
 style={{ border: "1px solid var(--color-border-strong)", background: "transparent" }}
 >
 <option value="general">{t("content.categoryGeneral")}</option>
 <option value="how-to-apply">{t("content.categoryHowToApply")}</option>
 </select>



 <textarea
 ref={textareaRef}
 placeholder={t("content.question")}
 value={form.question}
 onChange={(e) => setForm((m) => ({ ...m, question: e.target.value }))}
 rows={1}
 className="flex w-full rounded-md border border-input bg-transparent px-3 py-2.5 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px] resize-none overflow-hidden"
 />

 <TiptapEditor
 value={form.answer}
 onChange={(html) => setForm((m) => ({ ...m, answer: html }))}
 placeholder={t("content.answer")}
 />

 <div className="flex items-center gap-2 min-h-11 cursor-pointer">
 <button
 type="button"
 onClick={() => setForm((m) => ({ ...m, is_active: !m.is_active }))}
 className={cn(
 "relative h-6 w-11 rounded-full transition-colors duration-300 flex items-center p-0.5 shrink-0 select-none",
 form.is_active ? "bg-[#2563eb]" : "bg-zinc-400"
 )}
 aria-label={t("common.active")}
 >
 <m.div
 initial={false}
 className="size-5 rounded-full bg-white flex items-center justify-center shadow-xs"
 animate={{ x: form.is_active ? 20 : 0 }}
 transition={{ type: "spring", stiffness: 500, damping: 30 }}
 >
 {form.is_active ? <Check className="size-3.5 text-[#2563eb]" /> : <X className="size-3.5 text-zinc-400" />}
 </m.div>
 </button>
 <span className="font-medium text-sm text-gray-700" onClick={() => setForm((m) => ({ ...m, is_active: !m.is_active }))}>
 {form.is_active ? t("common.active") : t("common.inactive")}
 </span>
 </div>

 <div className="flex gap-2 justify-end mt-4 pt-4 border-t" style={{ borderColor: "var(--color-border-default)", marginTop: "1rem" }}>
 {selected && (
 <AlertDialog>
 <AlertDialogTrigger asChild>
 <Button variant="destructive" className="mr-auto">
 {t("common.delete")}
 </Button>
 </AlertDialogTrigger>
 <AlertDialogContent>
 <AlertDialogHeader>
 <AlertDialogTitle>{t("common.confirmDeleteTitle", "Xác nhận xoá?")}</AlertDialogTitle>
 <AlertDialogDescription>
 {t("common.confirmDeleteMessage", "Bạn có chắc chắn muốn xoá bản ghi này không? Hành động này không thể hoàn tác.")}
 </AlertDialogDescription>
 </AlertDialogHeader>
 <AlertDialogFooter>
 <AlertDialogCancel>{t("common.cancel", "Huỷ")}</AlertDialogCancel>
 <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white border border-red-600">
 {t("common.delete", "Xoá")}
 </AlertDialogAction>
 </AlertDialogFooter>
 </AlertDialogContent>
 </AlertDialog>
 )}
 <Button variant="outline" onClick={() => setSelected(null)}>
 {t("common.cancel")}
 </Button>
 <Button onClick={handleSave} disabled={isSaveDisabled || isLoading} style={{ backgroundColor: "#2563eb", color: "#fff", borderColor: "#2563eb" }} className="disabled:opacity-50 disabled:cursor-not-allowed">
 {t("common.save")}
 </Button>
 </div>
 </div>
 )}
 </aside>
 </div>
 </div>
 )
}
