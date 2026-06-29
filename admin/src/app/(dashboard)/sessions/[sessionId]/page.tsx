"use client"

import { use } from "react"
import toast from "react-hot-toast"
import { useRouter } from "next/navigation"
import { SessionChat } from "@/components/SessionChat"
import { AdminChatInput } from "@/components/AdminChatInput"
import { useAdminChat } from "@/hooks/useAdminChat"
import { t } from "@/lib/i18n"

interface SessionPageProps {
 params: Promise<{ sessionId: string }>
}

export default function SessionDetailPage({ params }: SessionPageProps) {
 const { sessionId } = use(params)

  return (
  <div className="flex flex-col h-full bg-surface-base">
    <SessionChatWrapper sessionId={sessionId} />
  </div>
  )
}

function SessionChatWrapper({ sessionId }: { sessionId: string }) {
 const router = useRouter()

 const chat = useAdminChat(sessionId, {
 onSessionClosed: () => {
 toast.success(t("chat.sessionClosedRedirect"))
 router.push("/sessions")
 },
 })

 return (
 <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
 <SessionChat sessionId={sessionId} chat={chat} />
 <AdminChatInput
 onSend={chat.sendWithFiles}
 isSending={chat.isSending}
 onTyping={chat.sendTypingStatus}
 sessionStatus={chat.sessionStatus}
 />
 </div>
 )
}
