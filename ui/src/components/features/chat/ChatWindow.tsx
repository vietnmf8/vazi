/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import * as React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { m, AnimatePresence } from "framer-motion";

import { cn } from "@/lib/utils";
import { resolveHandoffConnectingMessages } from "@/lib/chat-handoff";
import { Input } from "@/components/ui/Input";
import { ChatInput } from "@/components/features/chat/ChatInput";
import { ChatSurvey } from "@/components/features/chat/ChatSurvey";

// Import các sub-components được phân rã
import { ChatHeader } from "./window/ChatHeader";
import { ChatJoiningForm } from "./window/ChatJoiningForm";
import { ChatMessageList } from "./window/ChatMessageList";
import { ChatSearchTray } from "./window/ChatSearchTray";
import { ChatSuggestionsTray } from "./window/ChatSuggestionsTray";

// Hooks
import { useChatSearch } from "./window/useChatSearch";
import { useChatSuggestions } from "./window/useChatSuggestions";
import { useTranslations } from "next-intl";

import type {
    ChatMessage as ChatMessageType,
    ChatWidgetPhase,
} from "@/types/api";

export function escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Cấu hình thời gian trễ trò chuyện (Chat timing)
const CHAT_TIMINGS = {
    AI_TYPING_START_DELAY: 50, // Giảm trễ UI từ 200ms xuống 50ms để typing bubble hiện tức thì
    // 320ms = CSS Grid transition 350ms - 30ms buffer để sequential flow chuẩn xác
    AI_MESSAGE_APPEAR_DELAY: 320,
};

interface ChatWindowProps {
    phase: ChatWidgetPhase;
    messages: ChatMessageType[];
    userName: string;
    adminName: string | null;
    sessionId: string | null;
    isJoining: boolean;
    isAiTyping: boolean;
    isAdminTyping?: boolean;
    toolProcessing?: string | null;
    isReceiving?: boolean;
    isSending: boolean;
    error: string | null;
    replyingTo: ChatMessageType | null;
    onMinimize: () => void;
    onClose: () => void;
    onUserNameChange: (name: string) => void;
    onJoin: (opts?: {
        nationality?: string;
        visaInterest?: string;
    }) => Promise<void>;
    onSend: (text: string, files?: File[], documents?: File[]) => Promise<void>;
    onRequestHandoff: () => Promise<void>;
    onTranslate: (messageId: string) => Promise<void>;
    onRevoke: (messageId: string) => Promise<void>;
    onReply: (msg: ChatMessageType) => void;
    onReaction: (messageId: string, emoji: string) => Promise<void>;
    onClearError: () => void;
    onNewSession: () => void;
    onSurveyDone: () => void;
    onFileUpload?: (file: File) => Promise<void>;
    onHandback?: () => Promise<void>;
    shouldAutoFocus?: boolean;
    onAutoFocusDone?: () => void;
    onTyping?: (isTyping: boolean) => Promise<void>;
    /** URL WhatsApp cho urgent CTA card — được feed từ getFooterSettings() ở server level */
    whatsappUrl?: string;
}

/**
 * Panel Chat chính - Đóng vai trò Orchestrator lắp ghép các mảnh giao diện (Header, JoiningForm, MessageList, Suggestions, Survey).
 * TẠI SAO: Đã được refactor tinh gọn bằng cách phân rã các sub-components con, giúp giảm file từ 1129 dòng xuống còn ~350 dòng, dễ kiểm thử và tối ưu hoá render.
 */
export function ChatWindow({
    phase,
    messages,
    userName,
    adminName,
    sessionId,
    isJoining,
    isAiTyping,
    isAdminTyping = false,
    toolProcessing = null,
    isReceiving = false,
    isSending,
    error,
    replyingTo,
    onMinimize,
    onClose,
    onUserNameChange,
    onJoin,
    onSend,
    onRequestHandoff,
    onHandback,
    onTranslate,
    onRevoke,
    onReply,
    onReaction,
    onClearError,
    onNewSession,
    onSurveyDone,
    onFileUpload,
    shouldAutoFocus,
    onAutoFocusDone,
    onTyping,
    whatsappUrl,
}: ChatWindowProps) {
    const nameInputRef = useRef<HTMLInputElement>(null);
    const chatInputWrapperRef = useRef<HTMLDivElement>(null);
    const tForm = useTranslations("ChatForm");
    const tChat = useTranslations("Chat");

    // Lọc bỏ các tin nhắn ẩn của hệ thống, và thay thế connecting SYSTEM đã lỗi thời
    const visibleMessages = useMemo(() => {
        const withoutHidden = messages.filter(
            (m) => !(typeof m.message === "string" && m.message.startsWith("[SYSTEM_HIDDEN]")),
        );
        return resolveHandoffConnectingMessages(
            withoutHidden,
            tChat("header_agent_support"),
        );
    }, [messages, tChat]);

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
    } = useChatSearch(visibleMessages);

    const [chatInputHeight, setChatInputHeight] = useState(0);

    const {
        activeSuggestions,
        isSuggestionsVisible,
        showSuggestions,
        setShowSuggestions,
        hasNewSuggestionsDot,
        setHasNewSuggestionsDot,
        setIsSuggestionsTrayDismissed,
    } = useChatSuggestions({
        phase,
        messages: visibleMessages,
        isAiTyping,
        isSending,
        sessionId,
        searchQuery,
        chatInputHeight,
    });

    // Trì hoãn hiển thị trạng thái AI đang gõ
    const [showAiTyping, setShowAiTyping] = useState(false);
    useEffect(() => {
        if (isAiTyping) {
            const timer = setTimeout(() => {
                setShowAiTyping(true);
            }, CHAT_TIMINGS.AI_TYPING_START_DELAY);
            return () => clearTimeout(timer);
        } else {
            setShowAiTyping(false);
        }
    }, [isAiTyping]);

    // Cập nhật chiều cao ChatInput
    useEffect(() => {
        const el = chatInputWrapperRef.current;
        if (!el) return;

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setChatInputHeight(entry.target.clientHeight);
            }
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, [phase]);

    // Xử lý autofocus khi bắt đầu join chat
    useEffect(() => {
        if (shouldAutoFocus && phase === "JOINING" && nameInputRef.current) {
            nameInputRef.current.focus();
            onAutoFocusDone?.();
        }
    }, [shouldAutoFocus, phase, onAutoFocusDone]);

    // Gợi ý nhanh đã chuyển sang useChatSuggestions hook

    const greeting = useMemo(() => {
        const h = new Date().getHours();
        return h < 12
            ? tForm("greeting_morning")
            : h < 17
                ? tForm("greeting_afternoon")
                : tForm("greeting_evening");
    }, [tForm]);

    return (
        <section
            className="flex h-[min(640px,85dvh)] w-[min(440px,calc(100vw-2rem))] flex-col overflow-hidden rounded-lg bg-(--color-surface-base) dark:bg-[#18181b] shadow-xl relative"
            role="dialog"
            aria-label="Live chat support"
            aria-modal="false"
            style={{ "--chat-input-height": `${chatInputHeight}px` } as React.CSSProperties}
        >
            {/* Header */}
            <ChatHeader
                phase={phase}
                adminName={adminName}
                showSearch={showSearch}
                onToggleSearch={() => {
                    setShowSearch((v) => !v);
                    if (showSearch) setSearchQuery("");
                }}
                onNewSession={() => {
                    handleCloseSearch();
                    onNewSession();
                }}
                onMinimize={onMinimize}
                onClose={onClose}
            />

            {/* Khung tìm kiếm tin nhắn */}
            <ChatSearchTray
                show={showSearch}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                totalMatches={totalMatches}
                currentMatchIndex={currentMatchIndex}
                onNext={handleNextMatch}
                onPrev={handlePrevMatch}
                onClose={handleCloseSearch}
            />

            {/* Banner lỗi */}
            {error && (
                <div
                    className="mx-3 mt-3 rounded-md border border-(--color-error)/30 bg-(--color-error)/10 px-3 py-2 text-xs text-(--color-error)"
                    role="alert"
                >
                    <div className="flex items-start justify-between gap-2">
                        <span>{error}</span>
                        <button
                            type="button"
                            onClick={onClearError}
                            className="shrink-0 underline "
                            aria-label="Dismiss error"
                        >
                            {tChat("error_dismiss")}
                        </button>
                    </div>
                </div>
            )}

            {/* SURVEY phase */}
            {phase === "SURVEY" && sessionId ? (
                <ChatSurvey sessionId={sessionId} onDone={onSurveyDone} />
            ) : phase === "JOINING" ? (
                /* Form kết nối ban đầu */
                <ChatJoiningForm
                    greeting={greeting}
                    userName={userName}
                    isJoining={isJoining}
                    onUserNameChange={onUserNameChange}
                    onJoin={onJoin}
                    nameInputRef={nameInputRef}
                />
            ) : (
                /* Khung chat tin nhắn */
                <>
                    <ChatMessageList
                        messages={visibleMessages}
                        searchQuery={searchQuery}
                        phase={phase}
                        onTranslate={onTranslate}
                        onRevoke={onRevoke}
                        onReply={onReply}
                        onReaction={onReaction}
                        showAiTyping={showAiTyping}
                        isAdminTyping={isAdminTyping}
                        toolProcessing={toolProcessing}
                        isReceiving={isReceiving}
                        adminName={adminName}
                        whatsappUrl={whatsappUrl}
                    />

                    {/* Khay đề xuất câu trả lời nhanh */}
                    <ChatSuggestionsTray
                        isVisible={isSuggestionsVisible}
                        showSuggestions={showSuggestions}
                        hasNewSuggestionsDot={hasNewSuggestionsDot}
                        activeSuggestions={activeSuggestions}
                        chatInputHeight={chatInputHeight}
                        onToggleShow={() => {
                            setShowSuggestions((v) => !v);
                            if (!showSuggestions) {
                                setHasNewSuggestionsDot(false);
                            }
                        }}
                        onDismiss={() => setIsSuggestionsTrayDismissed(true)}
                        onSend={onSend}
                    />

                    {/* Vùng soạn thảo tin nhắn */}
                    <div ref={chatInputWrapperRef} className="relative z-30 shrink-0 bg-[var(--color-surface-base)]">
                        <ChatInput
                            phase={phase}
                            isSending={isSending}
                            replyingTo={replyingTo}
                            onSend={onSend}
                            onRequestHandoff={onRequestHandoff}
                            onHandback={onHandback}
                            onCancelReply={() => onReply(null as unknown as ChatMessageType)}
                            onFileUpload={onFileUpload}
                            onTyping={onTyping}
                        />
                    </div>
                </>
            )}
        </section>
    );
}
