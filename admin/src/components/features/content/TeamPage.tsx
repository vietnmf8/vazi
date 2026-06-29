
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
import { ImageUploadField } from "@/components/shared/ImageUploadField"
import { t } from "@/lib/i18n"
import { MasterShell } from "@/components/shared/MasterShell"
import { EditPanel } from "@/components/shared/EditPanel"
import { fetchTeamMemberDetail, createTeamMember, updateTeamMember, deleteTeamMember } from "@/lib/api/content.api"
import { useTeamMembers, useTeamMemberMutations } from "@/hooks/useTeamMembers"
import type { AdminTeamMemberListItem, PaginatedResponse } from "@/types/api"

export function TeamPage() {
  
   const qc = useQueryClient()
 const { query, setParams } = useTableState({ page: "1", search: "" })
  const page = Number(query.page) || 1
  const search = query.search || ""
  const setPage = (p: number) => setParams({ page: String(p) })
  const setSearch = (s: string) => setParams({ search: s })
 const [debouncedSearch, setDebouncedSearch] = useState("")
 
 const [loadingDetail, setLoadingDetail] = useState(false)
 const [form, setForm] = useState({
 name: "",
 role: "",
 description: "",
 image_url: "",
 thumb_bg: "#E8F4FD",
 display_order: 0,
 is_active: true,
 })

 useEffect(() => {
 const timer = setTimeout(() => setDebouncedSearch(search), 400)
 return () => clearTimeout(timer)
 }, [search])

  const { data, isLoading } = useTeamMembers({ page, limit: 20, ...(debouncedSearch ? { search: debouncedSearch } : {}) })
  const [selected, setSelected] = useSelectedRecord<AdminTeamMemberListItem>(data?.data)

 useEffect(() => {
 if (!selected) {
 setForm({
 name: "",
 role: "",
 description: "",
 image_url: "",
 thumb_bg: "#E8F4FD",
 display_order: 0,
 is_active: true,
 })
 return
 }
 setLoadingDetail(true)
 void fetchTeamMemberDetail(selected.id)
 .then((detail) => setForm({
 name: detail.name,
 role: detail.role,
 description: detail.description,
 image_url: detail.image_url,
 thumb_bg: detail.thumb_bg,
 display_order: detail.display_order,
 is_active: detail.is_active,
 }))
 .catch(() => showToast(t("common.error"), "error"))
 .finally(() => setLoadingDetail(false))
 }, [selected])

 const saveMutation = useMutation({
 mutationFn: async () => {
 if (selected) return updateTeamMember(selected.id, form)
 return createTeamMember(form)
 },
 onSuccess: () => {
 qc.invalidateQueries({ queryKey: ["team-members"] })
 showToast(t("common.saved"), "success")
 setSelected(null)
 },
 onError: () => showToast(t("common.error"), "error"),
 })

 const deleteMutation = useMutation({
 mutationFn: deleteTeamMember,
 onSuccess: () => {
 qc.invalidateQueries({ queryKey: ["team-members"] })
 showToast(t("common.deleted"), "success")
 setSelected(null)
 },
 onError: () => showToast(t("common.error"), "error"),
 })

 const columns = useMemo<ColumnDef<AdminTeamMemberListItem, unknown>[]>(
 () => [
 { accessorKey: "name", header: t("content.colName") },
 { accessorKey: "role", header: t("content.colRole") },
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
 <h1 className="text-2xl font-bold mb-6">{t("nav.team")}</h1>
 <div className="flex flex-col lg:flex-row gap-6">
 <div className="flex-1">
 <div className="flex gap-3 mb-4">
 <Input
 placeholder={t("content.searchPlaceholder")}
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 className="max-w-sm"
 />
 <Button variant="outline" onClick={() => setSelected(null)}>
 {t("content.createTeam")}
 </Button>
 </div>
 <DataTable
 columns={columns}
 data={data?.data ?? []}
 isLoading={isLoading}
 emptyMessage={t("content.empty")}
 pagination={data?.pagination}
 onPageChange={setPage}
 onRowClick={setSelected}
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
 value={form.name}
 onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
 placeholder={t("content.colName")}
 />
 <Input
 value={form.role}
 onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
 placeholder={t("content.colRole")}
 />
 <textarea
 value={form.description}
 onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
 placeholder={t("content.colDescription")}
 rows={4}
 className="w-full rounded-lg p-3"
 style={{ border: "1px solid var(--color-border-strong)" }}
 />
 <ImageUploadField
 labelKey="content.colImage"
 value={form.image_url}
 onChange={(url) => setForm((f) => ({ ...f, image_url: url }))}
 />
 <Input
 value={form.thumb_bg}
 onChange={(e) => setForm((f) => ({ ...f, thumb_bg: e.target.value }))}
 placeholder={t("content.colThumbBg")}
 />
 <Input
 type="number"
 value={form.display_order}
 onChange={(e) =>
 setForm((f) => ({ ...f, display_order: Number(e.target.value) || 0 }))
 }
 placeholder={t("content.colOrder")}
 />
 <label className="flex items-center gap-2 min-h-11">
 <input
 type="checkbox"
 checked={form.is_active}
 onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
 />
 {t("common.active")}
 </label>
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
