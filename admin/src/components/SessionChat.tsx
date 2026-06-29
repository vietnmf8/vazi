"use client"

import { useState } from "react"
import { Search, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
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
import { AdminChatMessageList } from "@/components/chat/AdminChatMessageList"
import { AdminChatSearchTray } from "@/components/chat/AdminChatSearchTray"
import { useChatSearch } from "@/hooks/useChatSearch"
import { cn } from "@/lib/utils"
import { t } from "@/lib/i18n"
import type { UseAdminChatReturn } from "@/hooks/useAdminChat"

interface SessionChatProps {
 sessionId: string
 chat: UseAdminChatReturn
}

type PendingAction = "join" | "handback" | "delete" | null

function getStatusLabel(status: string): string {
 if (status === "HUMAN_HANDLING") return t("chat.statusHuman")
 if (status === "CLOSED") return t("chat.statusClosed")
 return t("chat.statusAi")
}

export function SessionChat({ chat }: SessionChatProps) {
 const {
  messages,
  sessionStatus,
  guestName,
  isLoading,
  loadError,
  joinSession,
  closeSession,
  handbackSession,
  deleteSession,
  isUserTyping,
  isAiTyping,
  handoffPhase,
  connectingText,
  joinedText,
 } = chat

 const router = useRouter()
 const [pendingAction, setPendingAction] = useState<PendingAction>(null)
 const [isConfirming, setIsConfirming] = useState(false)

 const {
  searchQuery,
  setSearchQuery,
  showSearch,
  setShowSearch,
  currentMatchIndex,
  totalMatches,
  handleNextMatch,
  handlePrevMatch,
  handleCloseSearch,
 } = useChatSearch(messages)

 const handleConfirm = async () => {
  if (!pendingAction) return
  setIsConfirming(true)
  try {
   if (pendingAction === "join") {
    await joinSession()
   } else if (pendingAction === "delete") {
    await deleteSession()
    toast.success("Đã xóa phiên chat")
    router.push("/sessions")
   } else {
    await handbackSession()
   }
  } finally {
   setIsConfirming(false)
   setPendingAction(null)
  }
 }

 const isClosed = sessionStatus === "CLOSED" || sessionStatus === "CLOSED_BY_CLIENT"
 const isAiMode = sessionStatus === "AI_HANDLING"
 const isHumanMode = sessionStatus === "HUMAN_HANDLING"

 return (
  <>
   <div className="flex flex-col flex-1 overflow-hidden relative">
    <div
     className="flex items-center justify-between px-5 py-3 shrink-0"
     style={{ borderBottom: "1px solid var(--color-border-default)" }}
    >
     <div className="flex items-center gap-3">
      <span
       className="font-semibold"
       style={{ color: "var(--color-text-primary)", fontSize: "var(--font-size-2xl)" }}
      >
       {guestName || t("common.loading")}
      </span>
      {sessionStatus && (
       <Badge variant={isHumanMode ? "success" : isClosed ? "destructive" : "warning"}>
        {getStatusLabel(sessionStatus)}
       </Badge>
      )}
     </div>

     <div className="flex items-center gap-2">
      {/* Nút tìm kiếm */}
      <button
       type="button"
       onClick={() => setShowSearch((v) => !v)}
       className={cn(
        "flex items-center justify-center size-8 rounded-lg transition-colors",
        showSearch && "opacity-100",
       )}
       style={{
        color: showSearch ? "var(--color-info)" : "var(--color-text-muted)",
        backgroundColor: showSearch
         ? "color-mix(in srgb, var(--color-info) 12%, transparent)"
         : "transparent",
       }}
       aria-label={t("chat.searchPlaceholder")}
       aria-pressed={showSearch}
      >
       <Search className="size-4" />
      </button>

      {/* Nút xóa mềm session — luôn hiển thị để admin dễ thao tác */}
      <button
       type="button"
       onClick={() => setPendingAction("delete")}
       className="flex items-center justify-center size-8 rounded-lg transition-all hover:scale-110"
       style={{
        color: "var(--color-error)",
        backgroundColor: "color-mix(in srgb, var(--color-error) 8%, transparent)",
       }}
       aria-label="Xóa phiên chat"
       title="Xóa phiên chat"
      >
       <Trash2 className="size-4" />
      </button>

      {sessionStatus && (
       <div
        className="flex items-center rounded-full p-0.5 gap-0.5"
        style={{ border: "1px solid var(--color-border-default)", opacity: isClosed ? 0.4 : 1 }}
        role="group"
        aria-label="Chế độ xử lý chat"
       >
        <button
         type="button"
         onClick={() => !isClosed && setPendingAction("handback")}
         disabled={isAiMode || isClosed}
         className={cn(
          "px-3 py-1.5 rounded-full text-sm font-medium transition-all",
          isAiMode ? "text-white" : "opacity-50",
          !isAiMode && !isClosed ? "cursor-pointer hover:opacity-70" : "cursor-not-allowed",
         )}
         style={isAiMode ? { backgroundColor: "var(--color-warning)", color: "#fff" } : {}}
         aria-pressed={isAiMode}
        >
         AI
        </button>
        <button
         type="button"
         onClick={() => !isClosed && setPendingAction("join")}
         disabled={isHumanMode || isClosed}
         className={cn(
          "px-3 py-1.5 rounded-full text-sm font-medium transition-all",
          isHumanMode ? "text-white" : "opacity-50",
          !isHumanMode && !isClosed ? "cursor-pointer hover:opacity-70" : "cursor-not-allowed",
         )}
         style={isHumanMode ? { backgroundColor: "var(--color-success)", color: "#fff" } : {}}
         aria-pressed={isHumanMode}
        >
         Human
        </button>
       </div>
      )}
     </div>
    </div>

    <AdminChatSearchTray
     show={showSearch}
     searchQuery={searchQuery}
     setSearchQuery={setSearchQuery}
     totalMatches={totalMatches}
     currentMatchIndex={currentMatchIndex}
     onNext={handleNextMatch}
     onPrev={handlePrevMatch}
     onClose={handleCloseSearch}
    />

    <div className={cn("flex-1 overflow-y-auto px-5 py-4 transition-all", isClosed && "opacity-50 grayscale")}>
     {isClosed ? (
      <div
       className="flex items-center justify-center p-3 text-sm italic rounded-lg"
       style={{ color: "var(--color-error)", backgroundColor: "var(--color-surface-elevated)", border: "1px solid var(--color-border-default)" }}
      >
       {sessionStatus === "CLOSED_BY_CLIENT" ? "Client đã đóng phiên chat" : "Đã đóng phiên chat"}
      </div>
     ) : isLoading ? (
      <div className="flex items-center justify-center h-full">
       <span style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-md)" }}>
        {t("common.loading")}
       </span>
      </div>
     ) : loadError ? (
      <div className="flex items-center justify-center h-full">
       <span style={{ color: "var(--color-error)", fontSize: "var(--font-size-md)" }}>
        {loadError}
       </span>
      </div>
     ) : (
      <AdminChatMessageList
       messages={messages}
       searchQuery={searchQuery}
       isUserTyping={isUserTyping}
       isAiTyping={isAiTyping}
       guestName={guestName}
       sessionStatus={sessionStatus}
       handoffPhase={handoffPhase}
       connectingText={connectingText}
       joinedText={joinedText}
      />
     )}
    </div>
   </div>

   {/* AlertDialog xác nhận hành động — join / handback / delete */}
   <AlertDialog
    open={pendingAction !== null}
    onOpenChange={(open) => { if (!open) setPendingAction(null) }}
   >
    <AlertDialogContent>
     <AlertDialogHeader>
      <AlertDialogTitle>
       {pendingAction === "join"
        ? t("chat.toggleJoinTitle")
        : pendingAction === "delete"
         ? "Xóa phiên chat?"
         : t("chat.toggleHandbackTitle")}
      </AlertDialogTitle>
      <AlertDialogDescription>
       {pendingAction === "join"
        ? t("chat.toggleJoinDesc").replace("{name}", guestName || t("chat.guest"))
        : pendingAction === "delete"
         ? "Phiên chat sẽ bị ẩn khỏi danh sách. Dữ liệu vẫn được lưu giữ an toàn."
         : t("chat.toggleHandbackDesc")}
      </AlertDialogDescription>
     </AlertDialogHeader>
     <AlertDialogFooter>
      <AlertDialogCancel onClick={() => setPendingAction(null)}>
       {t("common.cancel")}
      </AlertDialogCancel>
      <AlertDialogAction
       disabled={isConfirming}
       onClick={() => void handleConfirm()}
       style={{
        backgroundColor: pendingAction === "delete" ? "var(--color-error)" : "var(--color-primary)",
        color: "#fff"
       }}
      >
       {isConfirming
        ? t("common.saving")
        : pendingAction === "join"
         ? t("chat.toggleJoinConfirm")
         : pendingAction === "delete"
          ? "Xóa"
          : t("chat.toggleHandbackConfirm")}
      </AlertDialogAction>
     </AlertDialogFooter>
    </AlertDialogContent>
   </AlertDialog>
  </>
 )
}
