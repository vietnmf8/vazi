
"use client"
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query"
import { useEffect, useMemo, useState, useCallback } from "react"
import { format } from "date-fns"
import type { ColumnDef } from "@tanstack/react-table"
import { DataTable } from "@/components/data-table/DataTable"
import { AdvancedTable } from "@/components/data-table/AdvancedTable"
import { Badge } from "@/components/ui/Badge"
import { useTableState } from "@/hooks/useTableState"
import { useSelectedRecord } from "@/hooks/useSelectedRecord"
import { Loader2 } from "lucide-react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/AlertDialog"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { showToast } from "@/components/ui/Toast"
import { t } from "@/lib/i18n"
import { MasterShell } from "@/components/shared/MasterShell"
import { EditPanel } from "@/components/shared/EditPanel"
import Pusher from "pusher-js"
import { fetchCommentDetail, fetchComments, replyToComment, editComment, deleteComment } from "@/lib/api/content.api"
import { AdminCommentItem } from "./AdminCommentItem"
import { useComments, useCommentMutations } from "@/hooks/useComments"
import type { AdminCommentListItem, AdminCommentDetailItem, PaginatedResponse } from "@/types/api"

export function CommentsPage() {
  
   const qc = useQueryClient()
 const { query, setParams } = useTableState({ page: "1", search: "" })
  const page = Number(query.page) || 1
  const search = query.search || ""
  const setPage = (p: number) => setParams({ page: String(p) })
  const setSearch = (s: string) => setParams({ search: s })
 const [debouncedSearch, setDebouncedSearch] = useState("")

 useEffect(() => {
 const timer = setTimeout(() => setDebouncedSearch(search), 400)
 return () => clearTimeout(timer)
 }, [search])

  const { data, isLoading } = useComments({ page, limit: 20, ...(debouncedSearch ? { search: debouncedSearch } : {}) })
  const [selected, setSelected] = useSelectedRecord<AdminCommentListItem>(data?.data)

 useEffect(() => {
 const key = process.env.NEXT_PUBLIC_SOKETI_KEY;
 if (!key) return;

 const pusher = new Pusher(key, {
 cluster: process.env.NEXT_PUBLIC_SOKETI_CLUSTER ?? "mt1",
 wsHost: process.env.NEXT_PUBLIC_SOKETI_HOST ?? "127.0.0.1",
 wsPort: Number(process.env.NEXT_PUBLIC_SOKETI_PORT ?? "6001"),
 wssPort: Number(process.env.NEXT_PUBLIC_SOKETI_PORT ?? "6001"),
 forceTLS: process.env.NEXT_PUBLIC_SOKETI_FORCE_TLS === "true",
 enabledTransports: process.env.NEXT_PUBLIC_SOKETI_FORCE_TLS === "true" ? ["wss"] : ["ws"],
 enableStats: false,
 });

 const channel = pusher.subscribe("public-comments");
 channel.bind("comments_updated", () => {
 qc.invalidateQueries({ queryKey: ["comments"] });
 });

 return () => {
 channel.unbind_all();
 pusher.unsubscribe("public-comments");
 pusher.disconnect();
 };
 }, [qc]);

 const replyMutation = useMutation({
 mutationFn: async ({ parentId, content, images }: { parentId: string; content: string; images?: string[] }) => {
 return replyToComment(parentId, content, images)
 },
 onSuccess: () => {
 qc.invalidateQueries({ queryKey: ["comments"] })
 showToast(t("common.saved"), "success")
 },
 onError: () => showToast(t("common.error"), "error"),
 })

 const editMutation = useMutation({
 mutationFn: async ({ id, content, images }: { id: string; content: string; images?: string[] }) => {
 return editComment(id, content, images)
 },
 onSuccess: () => {
 qc.invalidateQueries({ queryKey: ["comments"] })
 showToast(t("common.saved"), "success")
 },
 onError: () => showToast(t("common.error"), "error"),
 })

 const deleteMutation = useMutation({
 mutationFn: deleteComment,
 onSuccess: () => {
 qc.invalidateQueries({ queryKey: ["comments"] })
 showToast(t("common.deleted"), "success")
 },
 onError: () => showToast(t("common.error"), "error"),
 })

 const handleReply = useCallback(async (parentId: string, content: string, images?: string[]) => {
 await replyMutation.mutateAsync({ parentId, content, images });
 }, [replyMutation]);

 const handleEdit = useCallback(async (id: string, content: string, images?: string[]) => {
 await editMutation.mutateAsync({ id, content, images })

 }, [editMutation]);

 const handleDelete = useCallback(async (id: string) => {
 await deleteMutation.mutateAsync(id);
 }, [deleteMutation]);

 return (
  <div className="p-6 max-w-5xl mx-auto">
  <h1 className="text-2xl font-bold mb-6">{t("nav.comments")}</h1>
  <div className="mb-6">
  <Input
  placeholder={t("content.searchPlaceholder")}
  value={search}
  onChange={(e) => setSearch(e.target.value)}
  className="max-w-md"
  />
  </div>
 
 {isLoading ? (
 <div className="text-center py-10 text-gray-500">{t("common.loading")}</div>
 ) : data?.data.length === 0 ? (
 <div className="text-center py-10 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
 {t("content.empty")}
 </div>
 ) : (
 <div className="space-y-6">
 {data?.data.map((comment) => (
 <AdminCommentItem
 key={comment.id}
 comment={comment}
 onReply={handleReply}
 onEdit={handleEdit}
 onDelete={handleDelete}
 />
 ))}
 </div>
 )}

 {/* Basic Pagination for the Feed */}
 {data?.pagination && Math.ceil(data.pagination.total / data.pagination.per_page) > 1 && (
 <div className="flex justify-center items-center gap-2 mt-8 pt-6 border-t border-gray-200">
 <Button 
 variant="outline" 
 size="sm" 
 disabled={page === 1}
 onClick={() => setPage(page - 1)}
 >
 Trang trước
 </Button>
 <span className="text-sm text-gray-600 font-medium">
 Trang {page} / {Math.ceil(data.pagination.total / data.pagination.per_page)}
 </span>
 <Button 
 variant="outline" 
 size="sm" 
 disabled={page >= Math.ceil(data.pagination.total / data.pagination.per_page)}
 onClick={() => setPage(page + 1)}
 >
 Trang tiếp
 </Button>
 </div>
 )}
 </div>
 )
}
