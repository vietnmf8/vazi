"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import { Trash2 } from "lucide-react"
import toast from "react-hot-toast"
import { t } from "@/lib/i18n"
import { useSessions } from "@/hooks/useSessions"
import { useAdminNotifications } from "@/hooks/useAdminNotifications"
import { cleanMessageText } from "@/lib/utils"
import { apiClient } from "@/lib/api"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/AlertDialog"

type FilterType = "ALL" | "AI_HANDLING" | "HUMAN_HANDLING" | "CLOSED"

export function SessionSidebar() {
  const [filter, setFilter] = useState<FilterType>("ALL")
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const router = useRouter()
  const {
    sessions,
    isLoading,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useSessions("AI_HANDLING,HUMAN_HANDLING,CLOSED,CLOSED_BY_CLIENT")
  const { chatUnreadCounts, onlineSessions, clearChatUnread } = useAdminNotifications()!
  const pathname = usePathname()

  const filteredSessions = sessions.filter(s => {
    if (filter === "ALL") return true
    if (filter === "CLOSED") return s.status === "CLOSED" || s.status === "CLOSED_BY_CLIENT"
    return s.status === filter
  })

  const getInitials = (name: string) => {
    if (!name) return "U"
    return name.charAt(0).toUpperCase()
  }

  /** Thực hiện xóa mềm session sau khi admin xác nhận */
  const handleConfirmDelete = async () => {
    if (!confirmDeleteId) return
    setDeletingId(confirmDeleteId)
    setConfirmDeleteId(null)
    try {
      await apiClient.delete(`/chat/sessions/${confirmDeleteId}`)
      toast.success("Đã xóa phiên chat")
      // Nếu đang xem session bị xóa → điều hướng về list
      if (pathname === `/sessions/${confirmDeleteId}`) {
        router.push("/sessions")
      }
      void refetch()
    } catch {
      toast.error("Không thể xóa phiên chat, vui lòng thử lại")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <>
      <div className="flex flex-col h-full border-l" style={{ borderColor: "var(--color-border-default)", backgroundColor: "var(--color-surface-base)" }}>
        {/* Header & Filter */}
        <div className="p-4 border-b shrink-0" style={{ borderColor: "var(--color-border-default)" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold" style={{ color: "var(--color-text-primary)", fontSize: "var(--font-size-lg)" }}>
              Danh sách Chat
            </h2>
            <button
              onClick={() => void refetch()}
              className="text-xs transition-opacity hover:opacity-70"
              style={{ color: "var(--color-text-muted)" }}
            >
              {t("common.retry")}
            </button>
          </div>

          {/* Filter chips */}
          <div className="flex flex-wrap gap-2 mt-2">
            <button
              onClick={() => setFilter("ALL")}
              className={`px-3 py-1 text-xs rounded-full whitespace-nowrap transition-colors ${filter === "ALL" ? "bg-blue-100 text-blue-700 font-medium" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setFilter("HUMAN_HANDLING")}
              className={`px-3 py-1 text-xs rounded-full whitespace-nowrap transition-colors ${filter === "HUMAN_HANDLING" ? "bg-green-100 text-green-700 font-medium" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              Đang hỗ trợ
            </button>
            <button
              onClick={() => setFilter("AI_HANDLING")}
              className={`px-3 py-1 text-xs rounded-full whitespace-nowrap transition-colors ${filter === "AI_HANDLING" ? "bg-yellow-100 text-yellow-700 font-medium" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              Trợ lý AI
            </button>
            <button
              onClick={() => setFilter("CLOSED")}
              className={`px-3 py-1 text-xs rounded-full whitespace-nowrap transition-colors ${filter === "CLOSED" ? "bg-red-100 text-red-700 font-medium" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              Đã đóng
            </button>
          </div>
        </div>

        {/* List */}
        <div
          className="flex-1 overflow-y-auto"
          onScroll={(e) => {
            const target = e.target as HTMLDivElement
            if (target.scrollHeight - target.scrollTop <= target.clientHeight * 1.5) {
              if (hasNextPage && !isFetchingNextPage) {
                void fetchNextPage()
              }
            }
          }}
        >
          {isLoading && sessions.length === 0 ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-gray-200 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/2" />
                    <div className="h-3 bg-gray-200 rounded w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="p-4 text-center text-sm" style={{ color: "var(--color-error)" }}>
              {t("common.error")}
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="p-4 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
              {t("chat.empty")}
            </div>
          ) : (
            <div className="flex flex-col">
              {filteredSessions.map(session => {
                const isActive = pathname === `/sessions/${session.id}`
                const isClosed = session.status === "CLOSED" || session.status === "CLOSED_BY_CLIENT"
                const isBeingDeleted = deletingId === session.id

                return (
                  <div
                    key={session.id}
                    className="relative group"
                  >
                    <Link
                      href={`/sessions/${session.id}`}
                      onClick={() => clearChatUnread(session.id)}
                      className={`flex gap-3 p-3 pr-10 transition-colors border-b last:border-0 hover:opacity-80 ${isClosed ? "opacity-60 grayscale" : ""} ${isBeingDeleted ? "opacity-40 pointer-events-none" : ""}`}
                      style={{
                        borderColor: "var(--color-border-default)",
                        backgroundColor: isActive ? "var(--color-primary-subtle)" : "transparent",
                        borderLeft: isActive ? "4px solid var(--color-primary)" : "4px solid transparent"
                      }}
                    >
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 font-medium flex items-center justify-center shrink-0">
                        {getInitials(session.guestName)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-0.5">
                          <span
                            className="font-medium truncate text-sm"
                            style={{ color: isActive ? "var(--color-primary)" : "var(--color-text-primary)" }}
                          >
                            {session.guestName || "Khách"}
                          </span>
                          <span className="text-[10px] shrink-0 ml-2" style={{ color: "var(--color-text-tertiary)" }}>
                            {formatDistanceToNow(new Date(session.updatedAt || session.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-1">
                          <span className="text-xs truncate flex-1" style={{ color: "var(--color-text-muted)" }}>
                            {isClosed ? (
                              <span className="italic" style={{ color: "var(--color-error)" }}>
                                {session.status === "CLOSED_BY_CLIENT" ? "Client đã đóng phiên" : "Đã đóng phiên"}
                              </span>
                            ) : (
                              cleanMessageText(session.lastMessage) || "Chưa có tin nhắn"
                            )}
                          </span>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {chatUnreadCounts[session.id] > 0 && (
                              <div className="px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: "var(--color-error)" }}>
                                {chatUnreadCounts[session.id]}
                              </div>
                            )}

                            {session.status === "HUMAN_HANDLING" && !onlineSessions.has(session.id) && (
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "var(--color-text-tertiary)" }} title="Nhân viên đang hỗ trợ (Khách không online)" />
                            )}
                            {onlineSessions.has(session.id) && (
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "var(--color-success)" }} title="Khách đang online" />
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>

                    {/* Nút xóa mềm — hiện khi hover, đặt absolute để không xô lệch layout */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setConfirmDeleteId(session.id)
                      }}
                      disabled={isBeingDeleted}
                      className="absolute right-2 top-1/2 -translate-y-1/2 size-7 flex items-center justify-center rounded-md opacity-0 group-hover:opacity-100 transition-all hover:scale-110 disabled:opacity-30"
                      style={{
                        color: "var(--color-error)",
                        backgroundColor: "color-mix(in srgb, var(--color-error) 10%, transparent)"
                      }}
                      aria-label={`Xóa phiên của ${session.guestName}`}
                      title="Xóa phiên chat"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                )
              })}
              {isFetchingNextPage && (
                <div className="p-4 text-center text-xs text-gray-500">
                  Đang tải thêm...
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* AlertDialog xác nhận xóa session */}
      <AlertDialog
        open={confirmDeleteId !== null}
        onOpenChange={(open) => { if (!open) setConfirmDeleteId(null) }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa phiên chat?</AlertDialogTitle>
            <AlertDialogDescription>
              Phiên chat sẽ bị ẩn khỏi danh sách. Dữ liệu vẫn được lưu giữ an toàn và có thể khôi phục.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmDeleteId(null)}>
              Hủy
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleConfirmDelete()}
              style={{ backgroundColor: "var(--color-error)", color: "#fff" }}
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
