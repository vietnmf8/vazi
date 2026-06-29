"use client"

import { useEffect, useMemo, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { format } from "date-fns"
import type { ColumnDef } from "@tanstack/react-table"
import { PageHeader } from "@/components/layout/PageHeader"
import { DataTable } from "@/components/data-table/DataTable"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { showToast } from "@/components/ui/Toast"
import { useSupportTicket, useSupportTickets } from "@/hooks/useSupport"
import { updateSupportTicketStatus } from "@/lib/api/support.api"
import { t } from "@/lib/i18n"
import type { AdminSupportTicketListItem, SupportTicketStatus } from "@/types/api"

const STATUS_OPTIONS: Array<SupportTicketStatus | ""> = [
 "",
 "OPEN",
 "IN_PROGRESS",
 "RESOLVED",
 "CLOSED",
]

export default function SupportPage() {
 const queryClient = useQueryClient()
 const [page, setPage] = useState(1)
 const [status, setStatus] = useState<SupportTicketStatus | "">("")
 const [search, setSearch] = useState("")
 const [debouncedSearch, setDebouncedSearch] = useState("")
 const [selectedId, setSelectedId] = useState<string | null>(null)

 useEffect(() => {
 const timer = setTimeout(() => setDebouncedSearch(search), 400)
 return () => clearTimeout(timer)
 }, [search])

 const query = {
 page,
 limit: 20,
 ...(status ? { status } : {}),
 ...(debouncedSearch ? { search: debouncedSearch } : {}),
 }

 const { data, isLoading } = useSupportTickets(query)
 const { data: detail } = useSupportTicket(selectedId)

 const mutation = useMutation({
 mutationFn: ({ id, newStatus }: { id: string; newStatus: SupportTicketStatus }) =>
 updateSupportTicketStatus(id, newStatus),
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ["support-tickets"] })
 queryClient.invalidateQueries({ queryKey: ["dashboard"] })
 showToast(t("support.saved"), "success")
 },
 onError: () => showToast(t("common.error"), "error"),
 })

 const columns = useMemo<ColumnDef<AdminSupportTicketListItem, unknown>[]>(
 () => [
 { accessorKey: "full_name", header: t("support.colName") },
 { accessorKey: "email", header: t("support.colEmail") },
 { accessorKey: "subject", header: t("support.colSubject") },
 {
 accessorKey: "status",
 header: t("support.colStatus"),
 cell: ({ row }) => <StatusBadge status={row.original.status} />,
 },
 {
 accessorKey: "created_at",
 header: t("support.colDate"),
 cell: ({ row }) => format(new Date(row.original.created_at), "dd/MM/yyyy"),
 },
],
 [],
 )

 return (
 <div className="p-6">
 <PageHeader titleKey="support.title" />

 <div className="flex flex-col lg:flex-row gap-6">
 <div className="flex-1">
 <div className="flex flex-col sm:flex-row gap-3 mb-4">
 <Input
 placeholder={t("support.searchPlaceholder")}
 value={search}
 onChange={(e) => {
 setSearch(e.target.value)
 setPage(1)
 }}
 className="max-w-sm"
 />
 <select
 value={status}
 onChange={(e) => {
 setStatus(e.target.value as SupportTicketStatus | "")
 setPage(1)
 }}
 className="rounded-lg px-3 py-2 min-h-11"
 style={{
 border: "1px solid var(--color-border-strong)",
 backgroundColor: "var(--color-surface-elevated)",
 fontSize: "var(--font-size-md)",
 }}
 >
 <option value="">{t("support.allStatus")}</option>
 {STATUS_OPTIONS.filter(Boolean).map((s) => (
 <option key={s} value={s}>
 {t(`status.${s}`)}
 </option>
 ))}
 </select>
 </div>

 <DataTable
 columns={columns}
 data={data?.data ?? []}
 isLoading={isLoading}
 emptyMessage={t("support.empty")}
 pagination={data?.pagination}
 onPageChange={setPage}
 onRowClick={(row) => setSelectedId(row.id)}
 />
 </div>

 {selectedId && detail && (
 <aside
 className="w-full lg:w-96 shrink-0 rounded-xl p-5 space-y-4"
 style={{
 backgroundColor: "var(--color-surface-elevated)",
 border: "1px solid var(--color-border-default)",
 }}
 >
 <h2 className="font-medium" style={{ fontSize: "var(--font-size-lg)" }}>
 {detail.subject}
 </h2>
 <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>
 {detail.full_name} · {detail.email}
 </p>
 <StatusBadge status={detail.status} />
 <div>
 <p className="font-medium mb-1">{t("support.message")}</p>
 <p style={{ fontSize: "var(--font-size-md)", whiteSpace: "pre-wrap" }}>
 {detail.message}
 </p>
 </div>
 <div>
 <p className="font-medium mb-2">{t("support.updateStatus")}</p>
 <div className="flex gap-2">
 <select
 defaultValue={detail.status}
 onChange={(e) =>
 mutation.mutate({
 id: detail.id,
 newStatus: e.target.value as SupportTicketStatus,
 })
 }
 className="rounded-lg px-3 py-2 min-h-11 flex-1"
 style={{
 border: "1px solid var(--color-border-strong)",
 backgroundColor: "var(--color-surface-base)",
 fontSize: "var(--font-size-md)",
 }}
 >
 {STATUS_OPTIONS.filter(Boolean).map((s) => (
 <option key={s} value={s}>
 {t(`status.${s}`)}
 </option>
 ))}
 </select>
 </div>
 </div>
 <Button variant="ghost" size="sm" onClick={() => setSelectedId(null)}>
 Đóng
 </Button>
 </aside>
 )}
 </div>
 </div>
 )
}
