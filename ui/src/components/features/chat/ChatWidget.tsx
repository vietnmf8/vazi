"use client"

import * as React from "react"
import { MessageCircle } from "lucide-react"
import { AnimatePresence, m } from "framer-motion"

import { ChatWindow } from "@/components/features/chat/ChatWindow"
import { Button } from "@/components/ui/Button"
import { cn } from "@/lib/utils"
import { useChat } from "@/hooks/useChat"

import { useAgentStore } from "@/stores/agentStore"
import { WHATSAPP_URL } from "@/lib/constants"
import Image from "next/image"

/**

 * Cấu hình vị trí cho Chat Widget
 */
const WIDGET_CONFIG = {
  // Giảm khoảng cách lề phải để đẩy widget sang phải (từ right-6 -> right-4, md:right-16 -> md:right-8)
  // z-[60] (> EntryGateModal z-50): khi AI mở EntryGateModal qua chat (B1 — click_ui_element hero_apply)
  // rồi hỏi tiếp 3 lựa chọn ngay trong chat, widget phải nổi TRÊN modal để user vẫn bấm/gõ chat được,
  // không bị backdrop của modal chặn pointer events.
  position: "fixed bottom-4 right-4 md:bottom-6 md:right-8 z-[60]",
}

interface ChatWidgetProps {
  /** URL WhatsApp cho urgent CTA card — được feed từ getFooterSettings() ở server level */
  whatsappUrl?: string;
}

/**
 * Widget chat nổi góc phải — mount trên layout marketing, không hiện trong apply funnel.
 */
export function ChatWidget({ whatsappUrl }: ChatWidgetProps = {}) {
  const chat = useChat()

  React.useEffect(() => {
    useAgentStore.getState().setSendSystemMessageRef(chat.sendSystemMessage);
  }, [chat.sendSystemMessage]);

  return (
    <div
      data-ai-id="chat-widget"
      data-ai-desc="Cửa sổ chat nổi góc phải màn hình"
      className={cn(WIDGET_CONFIG.position, "flex flex-col items-end gap-3")}
      aria-label="Live chat widget"
    >

      <AnimatePresence>
        {chat.isOpen ? (
          <m.div
            className="relative z-20"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            style={{ transformOrigin: "bottom right", willChange: "transform, opacity" }}
          >
            <ChatWindow
              phase={chat.phase}
              messages={chat.messages}
              userName={chat.userName}
              adminName={chat.adminName}
              sessionId={chat.sessionId}
              isJoining={chat.isJoining}
              isAiTyping={chat.isAiTyping}
              isAdminTyping={chat.isAdminTyping}
              toolProcessing={chat.toolProcessing}
              isReceiving={chat.isReceiving}
              isSending={chat.isSending}
              error={chat.error}
              replyingTo={chat.replyingTo}
              onMinimize={chat.closeWidget}
              onClose={chat.endSessionByClient}
              onUserNameChange={chat.setUserName}
              onJoin={chat.joinSession}
              onSend={chat.sendMessage}
              onRequestHandoff={chat.requestHandoff}
              onTranslate={chat.translateMessage}
              onRevoke={chat.revokeMessage}
              onReply={chat.setReplyingTo}
              onReaction={chat.toggleReaction}
              onClearError={chat.clearError}
              onNewSession={chat.startNewSession}
              onSurveyDone={chat.closeWidget}
              onFileUpload={chat.uploadAndSendFile}
              onHandback={chat.handbackSession}
              onTyping={chat.sendTypingStatus}
              whatsappUrl={whatsappUrl}
            />
          </m.div>
        ) : null}
      </AnimatePresence>

      <div className="relative z-10">
        {!chat.isOpen && (
          <button
            type="button"
            data-ai-element="whatsapp-toggle"
            className="absolute bottom-[68px] right-0 size-14 rounded-full shadow-lg shrink-0 overflow-hidden hover:scale-110 transition-transform duration-200"
            onClick={() => window.open(WHATSAPP_URL, "_blank")}
            aria-label="Contact via WhatsApp"
          >
            <Image src="/images/social.svg" alt="WhatsApp" width={56} height={56} className="size-full object-contain" />
          </button>
        )}

        {chat.unreadCount > 0 && !chat.isOpen ? (
          <span
            className="absolute -right-1 -top-1 z-10 flex size-5 items-center justify-center rounded-full bg-[var(--color-error)] text-xs font-bold text-white shadow-sm"
            aria-label={`${chat.unreadCount} unread messages`}
          >
            {chat.unreadCount > 9 ? "9+" : chat.unreadCount}
          </span>
        ) : null}

        <Button
          type="button"
          data-ai-element="chat-toggle"
          size="icon"
          className={cn(
            "size-14 rounded-full shadow-lg shrink-0",
            chat.isOpen && "ring-2 ring-[var(--color-text-primary)]/20"
          )}
          onClick={chat.isOpen ? chat.closeWidget : chat.openWidget}
          aria-label={chat.isOpen ? "Close live chat" : "Open live chat"}
          aria-expanded={chat.isOpen}
        >
          <MessageCircle className="size-6" aria-hidden />
        </Button>
      </div>
    </div>
  )
}
