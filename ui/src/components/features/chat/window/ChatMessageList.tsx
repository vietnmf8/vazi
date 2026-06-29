/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import * as React from "react";
import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { isSameDay, isSameMinute, parseISO } from "date-fns";
import { m, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { ChatDaySeparator } from "@/components/features/chat/ChatDaySeparator";
import { ChatMessage } from "@/components/features/chat/ChatMessage";
import { VirtualizedChatMessage } from "@/components/features/chat/window/VirtualizedChatMessage";
import { useChatLogic } from "./useChatLogic";
import { useTranslations } from "next-intl";

import type {
    ChatMessage as ChatMessageType,
    ChatWidgetPhase,
} from "@/types/api";

interface ChatMessageListProps {
    messages: ChatMessageType[];
    searchQuery: string;

    phase: ChatWidgetPhase;
    onTranslate: (messageId: string) => Promise<void>;
    onRevoke: (messageId: string) => Promise<void>;
    onReply: (msg: ChatMessageType) => void;
    onReaction: (messageId: string, emoji: string) => Promise<void>;
    showAiTyping: boolean;
    isAdminTyping: boolean;
    isReceiving: boolean;
    adminName: string | null;
    /** URL WhatsApp cho urgent CTA card — được feed từ getFooterSettings() ở server level */
    whatsappUrl?: string;
    toolProcessing?: string | null;
}

export const LIST_ANIMATION_CONFIG = {
    // Thời gian chờ (ms) của tin nhắn User ĐẦU TIÊN (để chờ khối Spacer thu nhỏ 120px -> 32px hoàn tất)
    FIRST_USER_MESSAGE_DELAY_MS: 300,

    // Tốc độ và gia tốc (easing) của tất cả bong bóng chat (User, AI, Typing Bubble)
    CSS_TRANSITION: "grid-template-rows 350ms cubic-bezier(0.2,0.8,0.2,1), margin-top 350ms cubic-bezier(0.2,0.8,0.2,1), opacity 250ms ease, transform 350ms cubic-bezier(0.2,0.8,0.2,1)",

    // Tốc độ biến mất của màn hình chào mừng (Empty State)
    EMPTY_STATE_TRANSITION: "grid-template-rows 350ms cubic-bezier(0.2,0.8,0.2,1), opacity 250ms ease, transform 350ms cubic-bezier(0.2,0.8,0.2,1)",

    // Thời gian lưu giữ DOM Element (ms) để hiệu ứng Exit biến mất kịp trước khi bị xóa hẳn khỏi cây DOM
    UNMOUNT_DELAY_MS: 400,
};

// ==========================================
// CSS Grid 0fr → 1fr animation wrapper (prototype Case 2, 7)
// Chỉ áp dụng cho tin nhắn MỚI (isNew = true) — tin lịch sử render ngay không animate
function MessageAnimWrapper({
    children,
    shouldAnimate,
    isOut,
    delayMs = 0,
}: {
    children: React.ReactNode;
    shouldAnimate: boolean;
    isOut?: boolean;
    delayMs?: number;
}) {
    const [animate] = useState(shouldAnimate);
    const [open, setOpen] = useState(false);
    const [isDone, setIsDone] = useState(!shouldAnimate);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        if (!animate) return;
        let timeoutId: NodeJS.Timeout;
        let delayTimeoutId: NodeJS.Timeout;
        let frameId: number;

        const startAnim = () => {
            if (wrapperRef.current) {
                void wrapperRef.current.offsetWidth; // force reflow to ensure CSS transition works from 0fr
            }
            frameId = requestAnimationFrame(() => {
                setOpen(true);
                timeoutId = setTimeout(() => {
                    setIsDone(true);
                }, LIST_ANIMATION_CONFIG.UNMOUNT_DELAY_MS);
            });
        };

        if (delayMs > 0) {
            delayTimeoutId = setTimeout(startAnim, delayMs);
        } else {
            startAnim();
        }

        return () => {
            clearTimeout(delayTimeoutId);
            clearTimeout(timeoutId);
            cancelAnimationFrame(frameId);
        };
    }, [animate, delayMs]);

    if (!animate) {
        return (
            <div className="grid" style={{ gridTemplateRows: "1fr" }}>
                <div style={{ minHeight: 0, minWidth: 0, overflow: "visible" }}>{children}</div>
            </div>
        );
    }

    return (
        <div
            ref={wrapperRef}
            className="grid"
            style={{
                gridTemplateRows: open ? "1fr" : "0fr",
                opacity: open ? 1 : 0,
                transform: isDone
                    ? "none"
                    : open
                        ? "scale(1) translateY(0)"
                        : "scale(0.9) translateY(10px)",
                transformOrigin: isOut ? "bottom right" : "bottom left",
                transition: LIST_ANIMATION_CONFIG.CSS_TRANSITION,
            }}
        >
            <div style={{ minHeight: 0, minWidth: 0, overflow: isDone ? "visible" : "hidden" }}>{children}</div>
        </div>
    );
}

// ==========================================
// CSS Grid 0fr → 1fr wrapper cho Typing Bubble (prototype Case 7)
// Điều khiển cả expand (show=true) và collapse (show=false) với cùng timing 350ms
// — giống hệt prototype hideTypingIndicator() Promise/setTimeout(350) pattern
// ==========================================
function TypingBubbleWrapper({
    show,
    shouldAnimate = true,
    children,
}: {
    show: boolean;
    shouldAnimate?: boolean;
    children: React.ReactNode;
}) {
    const [mounted, setMounted] = useState(show);
    const [open, setOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // TẠI SAO dùng useLayoutEffect thay vì gọi setMounted trong render body:
    // Gọi setState trong render phase tạo ra double render cascade (AP1).
    // useLayoutEffect chạy đồng bộ sau DOM commit, trước paint — đảm bảo mount
    // xảy ra trong cùng frame mà không làm React render lại thêm lần nào trong paint cycle.
    useLayoutEffect(() => {
        if (show && !mounted) {
            setMounted(true);
        }
    }, [show, mounted]);

    useEffect(() => {
        if (show) {
            if (!shouldAnimate) {
                setOpen(true);
            }
        } else {
            if (shouldAnimate) {
                setOpen(false);
                const timer = setTimeout(() => {
                    setMounted(false);
                }, LIST_ANIMATION_CONFIG.UNMOUNT_DELAY_MS);
                return () => clearTimeout(timer);
            } else {
                setOpen(false);
                setMounted(false);
            }
        }
    }, [show, shouldAnimate]);

    // Dùng useLayoutEffect để ép reflow giúp hiệu ứng expand hoạt động khi mount
    useLayoutEffect(() => {
        if (show && shouldAnimate && mounted && wrapperRef.current) {
            void wrapperRef.current.offsetWidth; // force reflow
            const id = requestAnimationFrame(() => setOpen(true));
            return () => cancelAnimationFrame(id);
        }
    }, [show, shouldAnimate, mounted]);

    if (!mounted) return null;

    return (
        <div
            ref={wrapperRef}
            className="grid"
            style={{
                gridTemplateRows: open ? "1fr" : "0fr",
                opacity: open ? 1 : 0,
                transform: open ? "scale(1) translateY(0)" : "scale(0.9) translateY(10px)",
                transformOrigin: "bottom left",
                transition: LIST_ANIMATION_CONFIG.CSS_TRANSITION,
            }}
        >
            <div style={{ minHeight: 0, minWidth: 0, overflow: "hidden" }}>{children}</div>
        </div>
    );
}

/**
 * Danh sách tin nhắn với kiến trúc column-reverse (prototype gold standard).
 *
 * TẠI SAO column-reverse:
 * - Browser tự neo scroll xuống đáy — scrollTop = 0 luôn là đáy
 * - Load history: append vào cuối DOM = đỉnh visual, browser giữ vị trí đọc tự động
 * - Không cần ResizeObserver theo dõi content height để auto-scroll
 * - isNearBottom = Math.abs(scrollTop) <= 40 (đơn giản, không có race condition)
 */

// ==========================================
// Empty State Wrapper (1fr -> 0fr top to bottom)
// ==========================================
function EmptyStateAnimWrapper({
    show,
    children,
}: {
    show: boolean;
    children: React.ReactNode;
}) {
    const [mounted, setMounted] = useState(show);
    const [open, setOpen] = useState(show);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (show) {
            setMounted(true);
            setOpen(true);
        } else {
            setOpen(false);
            const timer = setTimeout(() => setMounted(false), LIST_ANIMATION_CONFIG.UNMOUNT_DELAY_MS);
            return () => clearTimeout(timer);
        }
    }, [show]);

    useLayoutEffect(() => {
        if (show && mounted && wrapperRef.current) {
            void wrapperRef.current.offsetWidth;
            const id = requestAnimationFrame(() => setOpen(true));
            return () => cancelAnimationFrame(id);
        }
    }, [show, mounted]);

    if (!mounted) return null;

    return (
        <div
            ref={wrapperRef}
            className="absolute inset-0 flex items-start justify-center pt-32 pointer-events-none z-10"
            style={{
                opacity: open ? 1 : 0,
                transition: "opacity 250ms ease-out",
            }}
        >
            <div className="w-full max-w-sm px-4 pointer-events-auto">{children}</div>
        </div>
    );
}

export function ChatMessageList({
    messages,
    searchQuery,
    phase,
    onTranslate,
    onRevoke,
    onReply,
    onReaction,
    showAiTyping,
    isAdminTyping,
    isReceiving,
    adminName,
    whatsappUrl,
    toolProcessing,
}: ChatMessageListProps) {
    const {
        scrollRef,
        thumbRef,
        isScrollable,
        isLoadingOld,
        unreadBadgeCount,
        isAtBottom,
        hasUserMessages,
        userMessageCount,
        visibleMessages,
        messageMap,
        activeMessagesList,
        renderedMessages,
        knownIds,
        handleImageLoad,
        handleThumbMouseDown,
        scrollToBottom,
        setUnreadBadgeCount,
    } = useChatLogic({
        messages,
        searchQuery,
        showAiTyping,
        isAdminTyping,
    });

    const t = useTranslations("Chat");
    const tMsg = useTranslations("ChatMessage");

    // Tick xanh cho tin nhắn USER: chỉ khi admin/assistant đã gửi tin nhắn sau tin USER cuối cùng.
    // Không dùng phase để tránh false-positive (admin trong chat nhưng chưa reply cũng tick xanh).
    const lastUserMsgIdx = activeMessagesList.reduceRight(
        (found, msg, idx) => (found !== -1 ? found : msg.sender === "USER" ? idx : -1),
        -1,
    );
    const isUserMessagesReplied =
        lastUserMsgIdx !== -1 &&
        activeMessagesList
            .slice(lastUserMsgIdx + 1)
            .some((m) => m.sender !== "USER" && m.sender !== "SYSTEM");

    return (
        <div className="relative flex-1 min-h-0">
            {/* chatShimmer nằm ngoài scroll container để tránh bị tính là flex item */}
            <style>{`
                @keyframes chatShimmer {
                    0% { background-position: -200% 0; }
                    100% { background-position: 200% 0; }
                }
            `}</style>

            {/* Scroll container — column-reverse: đáy = scrollTop 0, đỉnh = scrollTop max.
                KHÔNG đặt overflow-anchor:none — giữ nguyên overflow-anchor:auto (mặc định) để browser
                bù trừ scroll khi height của item thay đổi (virtualization, animation), tránh giật. */}
            <div
                ref={scrollRef}
                className="absolute inset-0 flex flex-col-reverse overflow-y-auto select-no-scrollbar p-4"
                role="log"
                aria-live="polite"
                aria-relevant="additions"
            >
                {/* Spacer thích ứng đáy:
                    - Lúc đầu (chưa có tin nhắn của User): h-[165px] để tránh Tray đè lên tin nhắn Auto-reply.
                    - Khi User gửi tin nhắn đầu tiên: co mượt mà về h-8, nhường chỗ cho tin nhắn mới. */}
                <div
                    className={cn(
                        "shrink-0 transition-[height] duration-300 ease-in-out",
                        hasUserMessages ? "h-8" : "h-40"
                    )}
                    aria-hidden="true"
                />

                {/* Typing indicators — CSS Grid 0fr→1fr giống message thật (prototype Case 7) */}

                <TypingBubbleWrapper show={showAiTyping && !toolProcessing} shouldAnimate={isAtBottom}>
                    <div className="flex justify-start w-full flex-col gap-1">
                        <span className="text-xs text-(--color-text-muted) select-none pl-1">
                            {tMsg("sender_ai")} · {tMsg("typing")}...
                        </span>
                        <div
                            className="rounded-2xl rounded-bl-md border border-(--color-border-default) bg-(--color-surface-elevated) px-3 py-2 shadow-xs w-fit h-9 flex items-center justify-center relative animate-pulse"
                            aria-label="Kimi is typing…"
                        >
                            <div
                                className="absolute inset-0 rounded-2xl rounded-bl-md"
                                style={{
                                    backgroundImage:
                                        "linear-gradient(90deg, transparent, rgba(139, 92, 26, 0.1), transparent)",
                                    animation:
                                        "chatShimmer 1.6s infinite linear",
                                    backgroundSize: "200% 100%",
                                }}
                            />
                            <span className="flex items-center gap-1.5 py-0.5 relative z-10 text-(--color-text-muted)">
                                <span className="size-1.5 rounded-full bg-current animate-bounce [animation-delay:0ms]" />
                                <span className="size-1.5 rounded-full bg-current animate-bounce [animation-delay:150ms]" />
                                <span className="size-1.5 rounded-full bg-current animate-bounce [animation-delay:300ms]" />
                            </span>
                        </div>
                    </div>
                </TypingBubbleWrapper>

                <TypingBubbleWrapper show={!!toolProcessing} shouldAnimate={isAtBottom}>
                    <div className="flex justify-start w-full flex-col gap-1">
                        <span className="text-xs text-(--color-text-muted) select-none pl-1">
                            {tMsg("sender_ai")} · {toolProcessing ? t(`tool_${toolProcessing}`) : ""}
                        </span>
                        <div
                            className="rounded-2xl rounded-bl-md border border-(--color-border-default) bg-(--color-surface-elevated) px-3 py-2 shadow-xs w-fit h-9 flex items-center justify-center relative animate-pulse"
                            aria-label="AI is processing…"
                        >
                            <div
                                className="absolute inset-0 rounded-2xl rounded-bl-md"
                                style={{
                                    backgroundImage:
                                        "linear-gradient(90deg, transparent, rgba(139, 92, 26, 0.1), transparent)",
                                    animation:
                                        "chatShimmer 1.6s infinite linear",
                                    backgroundSize: "200% 100%",
                                }}
                            />
                            <span className="flex items-center gap-1.5 py-0.5 relative z-10 text-(--color-text-muted)">
                                <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            </span>
                        </div>
                    </div>
                </TypingBubbleWrapper>

                <TypingBubbleWrapper show={isAdminTyping} shouldAnimate={isAtBottom}>
                    <div className="flex justify-start w-full flex-col gap-1">
                        <span className="text-xs text-(--color-text-muted) select-none pl-1">
                            {tMsg("sender_agent")} · {tMsg("typing")}...
                        </span>
                        <div
                            className="rounded-2xl rounded-bl-md border border-(--color-border-default) bg-(--color-surface-elevated) px-3 py-2 shadow-xs w-fit h-9 flex items-center justify-center relative animate-pulse"
                            aria-label="Support is typing…"
                        >
                            <div
                                className="absolute inset-0 rounded-2xl rounded-bl-md"
                                style={{
                                    backgroundImage:
                                        "linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.08), transparent)",
                                    animation:
                                        "chatShimmer 1.6s infinite linear",
                                    backgroundSize: "200% 100%",
                                }}
                            />
                            <span className="flex items-center gap-1.5 py-0.5 relative z-10 text-(--color-text-muted)">
                                <span className="size-1.5 rounded-full bg-current animate-bounce [animation-delay:0ms]" />
                                <span className="size-1.5 rounded-full bg-current animate-bounce [animation-delay:150ms]" />
                                <span className="size-1.5 rounded-full bg-current animate-bounce [animation-delay:300ms]" />
                            </span>
                        </div>
                    </div>
                </TypingBubbleWrapper>

                {renderedMessages.map((msg, idx) => {
                    // idx trong reversed array: 0 = newest, N = oldest
                    // renderedMessages luôn là các phần tử cuối cùng của activeMessagesList bị đảo ngược
                    const globalIdx = activeMessagesList.length - 1 - idx;
                    const prevMsg = activeMessagesList[globalIdx - 1];

                    // Day separator so sánh bằng chuỗi con (substring) thay vì gọi parseISO + isSameDay
                    const showSeparator =
                        !prevMsg ||
                        msg.timestamp.substring(0, 10) !== prevMsg.timestamp.substring(0, 10);

                    const nextMsg = activeMessagesList[globalIdx + 1];
                    const isGroupedWithPrev = Boolean(
                        prevMsg &&
                        prevMsg.sender === msg.sender &&
                        isSameMinute(parseISO(msg.timestamp), parseISO(prevMsg.timestamp))
                    );
                    const isGroupedWithNext = Boolean(
                        nextMsg &&
                        nextMsg.sender === msg.sender &&
                        isSameMinute(parseISO(nextMsg.timestamp), parseISO(msg.timestamp))
                    );

                    const isNew = !knownIds.has(msg.id);
                    const shouldAnimate = isNew && isAtBottom;

                    // Nếu là tin nhắn đầu tiên của user, đợi Spacer thu nhỏ xong (300ms) rồi mới hiện
                    const isVeryFirstUserMessage = userMessageCount === 1 && msg.sender === "USER";
                    const delayMs = isVeryFirstUserMessage ? LIST_ANIMATION_CONFIG.FIRST_USER_MESSAGE_DELAY_MS : 0;

                    return (
                        <MessageAnimWrapper
                            key={msg.client_id || msg.id}
                            shouldAnimate={shouldAnimate}
                            delayMs={delayMs}
                            isOut={msg.sender === "USER"}
                        >
                            <VirtualizedChatMessage id={msg.id} disableVirtualization={!!searchQuery}>
                                {showSeparator && (
                                    <ChatDaySeparator date={msg.timestamp} />
                                )}
                                <ChatMessage
                                    message={msg}
                                    phase={phase}
                                    searchQuery={searchQuery}
                                    onCopy={undefined}
                                    onRevoke={onRevoke}
                                    onReply={onReply}
                                    onReaction={onReaction}
                                    replyToMessage={
                                        msg.reply_to_id
                                            ? messageMap.get(msg.reply_to_id)
                                            : undefined
                                    }
                                    onImageLoad={handleImageLoad}
                                    isGroupedWithPrev={isGroupedWithPrev}
                                    isGroupedWithNext={isGroupedWithNext}
                                    isNewMessage={isNew}
                                    whatsappUrl={whatsappUrl}
                                    isReplied={msg.sender === "USER" ? isUserMessagesReplied : undefined}
                                />
                            </VirtualizedChatMessage>
                        </MessageAnimWrapper>
                    );
                })
                }

                {/* Loading spinner — cuối DOM = đỉnh visual (Case 5) */}
                {isLoadingOld && (
                    <div
                        className="flex justify-center py-2 shrink-0 animate-in fade-in duration-200"
                        aria-live="polite"
                    >
                        <div className="size-5 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
                    </div>
                )}
            </div>

            {/* Badge "Tin nhắn mới" (Case 3) */}
            <AnimatePresence>
                {unreadBadgeCount > 0 && (
                    <m.button
                        initial={{ y: 50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 50, opacity: 0 }}
                        transition={{
                            duration: 0.25,
                            ease: [0.175, 0.885, 0.32, 1.275],
                        }}
                        type="button"
                        className={cn(
                            "absolute left-1/2 -translate-x-1/2 bg-(--color-primary) text-white dark:text-black px-4 py-2 rounded-full text-xs font-semibold shadow-lg z-20 ",
                            "hover:opacity-90 active:scale-95 transition-[opacity,transform]",
                        )}
                        style={{ bottom: 16 }}
                        onClick={scrollToBottom}
                        aria-live="polite"
                    >
                        {unreadBadgeCount} tin nhắn mới ↓
                    </m.button>
                )}
            </AnimatePresence>

            {/* Scrollbar tự chế kéo thả */}
            {isScrollable && (
                <div
                    ref={thumbRef}
                    aria-hidden="true"
                    onMouseDown={handleThumbMouseDown}
                    className="absolute right-1 w-1 rounded-full bg-(--color-primary)/45 hover:bg-(--color-primary)/70 cursor-grab active:cursor-grabbing transition-colors z-20"
                    style={{
                        top: 0,
                    }}
                />
            )}

            {/* Empty State Overlay - Tách rời hoàn toàn khỏi flex-col-reverse để tránh layout shift */}
            <EmptyStateAnimWrapper show={visibleMessages.length === 0}>
                <p className="text-center text-sm text-(--color-text-muted) mb-4">
                    {searchQuery ? (
                        <>{t("empty_no_match", { query: searchQuery })}</>
                    ) : (
                        <>{t("empty_start")}</>
                    )}
                </p>
            </EmptyStateAnimWrapper>
        </div>
    );
}
