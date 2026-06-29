/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AnimatePresence, m } from "framer-motion";
import {
    Check,
    CheckCheck,
    Copy,
    FileText,
    Sparkles,
    Reply,
    RotateCcw,
    Smile,
    ThumbsUp,
    Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { ChatCard } from "@/components/features/chat/ChatCard";
import { FileAttachmentCard } from "@/components/features/chat/cards/FileAttachmentCard";
import { ReactionPopover } from "@/components/features/chat/ReactionPopover";
import { ReactionBadge } from "@/components/features/chat/ReactionBadge";
import { SearchMatchSpan } from "@/components/features/chat/window/SearchMatchSpan";
import { ChatMessageActions } from "@/components/features/chat/ChatMessageActions";
import { ChatMessageFooter } from "@/components/features/chat/ChatMessageFooter";
import { ImageGallery } from "@/components/shared/image-gallery/ImageGallery";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

import type { ChatMessage as ChatMessageType } from "@/types/api";

interface ChatMessageProps {
    message: ChatMessageType;
    searchQuery?: string;
    onCopy?: (text: string) => void;
    onRevoke?: (messageId: string) => void;
    onReply?: (message: ChatMessageType) => void;
    onReaction?: (messageId: string, emoji: string) => void;
    /** Message gốc để hiển thị quoted reply (nếu có reply_to_id) */
    replyToMessage?: ChatMessageType;
    /** TẠI SAO thêm phase: Nhận trạng thái phase hiện tại từ cửa sổ chat để quyết định số lượng ticks (1 tick vs 2 ticks) */
    phase?: string;
    /** Case 6: Callback khi ảnh đính kèm load xong — scroll correction nếu đang ở đáy */
    onImageLoad?: () => void;
    /** Grouping flags từ danh sách */
    isGroupedWithPrev?: boolean;
    isGroupedWithNext?: boolean;
    /** Cờ đánh dấu tin nhắn mới để áp dụng delay gom nhóm */
    isNewMessage?: boolean;
    /** URL WhatsApp cho urgent CTA card — được feed từ getFooterSettings() ở server level */
    whatsappUrl?: string;
    /** Tin nhắn đã được đọc bởi bên kia (admin/assistant đã reply) — tick xanh */
    isReplied?: boolean;
}

// DeliveryStatusIcon and formatTime moved to ChatMessageFooter

export const ChatHighlightContext = React.createContext<{
    searchQuery?: string;
    isUser: boolean;
}>({ searchQuery: "", isUser: false });

function HighlightText({ text }: { text: string }) {
    const { searchQuery, isUser } = React.useContext(ChatHighlightContext);
    if (!searchQuery || !searchQuery.trim()) return <>{text}</>;
    const q = searchQuery.toLowerCase();
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escaped})`, "gi");
    const parts = text.split(regex);

    return (
        <>
            {parts.map((part, i) => {
                if (i % 2 === 1) {
                    return (
                        <SearchMatchSpan key={i} isUserMessage={isUser}>
                            {part}
                        </SearchMatchSpan>
                    );
                }
                return part;
            })}
        </>
    );
}

function highlightChildren(children: React.ReactNode): React.ReactNode {
    return React.Children.map(children, (child) => {
        if (typeof child === "string") {
            return <HighlightText text={child} />;
        }
        return child;
    });
}

const staticMarkdownComponents = {
    p: ({ children, node, ...props }: any) => <p {...props}>{highlightChildren(children)}</p>,
    span: ({ children, node, ...props }: any) => <span {...props}>{highlightChildren(children)}</span>,
    strong: ({ children, node, ...props }: any) => <strong {...props}>{highlightChildren(children)}</strong>,
    em: ({ children, node, ...props }: any) => <em {...props}>{highlightChildren(children)}</em>,
    del: ({ children, node, ...props }: any) => <del {...props}>{highlightChildren(children)}</del>,
    a: ({ children, node, ...props }: any) => <a {...props}>{highlightChildren(children)}</a>,
    ul: ({ children, node, ...props }: any) => <ul {...props}>{highlightChildren(children)}</ul>,
    ol: ({ children, node, ...props }: any) => <ol {...props}>{highlightChildren(children)}</ol>,
    li: ({ children, node, ...props }: any) => <li {...props}>{highlightChildren(children)}</li>,
    h1: ({ children, node, ...props }: any) => <h1 {...props}>{highlightChildren(children)}</h1>,
    h2: ({ children, node, ...props }: any) => <h2 {...props}>{highlightChildren(children)}</h2>,
    h3: ({ children, node, ...props }: any) => <h3 {...props}>{highlightChildren(children)}</h3>,
    h4: ({ children, node, ...props }: any) => <h4 {...props}>{highlightChildren(children)}</h4>,
    h5: ({ children, node, ...props }: any) => <h5 {...props}>{highlightChildren(children)}</h5>,
    h6: ({ children, node, ...props }: any) => <h6 {...props}>{highlightChildren(children)}</h6>,
    td: ({ children, node, ...props }: any) => <td {...props}>{highlightChildren(children)}</td>,
    th: ({ children, node, ...props }: any) => <th {...props}>{highlightChildren(children)}</th>,
    blockquote: ({ children, node, ...props }: any) => <blockquote {...props}>{highlightChildren(children)}</blockquote>,
};

const SENDER_LABELS = {
    USER: "sender_you",
    AI: "sender_ai",
    ADMIN: "sender_agent",
    SYSTEM: "sender_system",
};

/**
 * Bubble tin nhắn — Markdown cho AI, file/image, delivery status, context menu.
 */
function ChatMessageInner({
    message,
    searchQuery,
    onCopy,
    onRevoke,
    onReply,
    onReaction,
    replyToMessage,
    phase,
    onImageLoad,
    isGroupedWithPrev,
    isGroupedWithNext,
    isNewMessage = false,
    whatsappUrl,
    isReplied,
}: ChatMessageProps) {
    const t = useTranslations("ChatMessage");
    // Trì hoãn hiệu ứng gom nhóm để user nhìn thấy tin nhắn độc lập 1 thời gian ngắn
    const [delayedGroupedPrev, setDelayedGroupedPrev] = useState(
        isNewMessage ? false : isGroupedWithPrev,
    );
    const [delayedGroupedNext, setDelayedGroupedNext] = useState(
        isNewMessage ? false : isGroupedWithNext,
    );

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (isGroupedWithPrev) {
            timer = setTimeout(() => setDelayedGroupedPrev(true), 800);
        } else {
            setDelayedGroupedPrev(false);
        }
        return () => clearTimeout(timer);
    }, [isGroupedWithPrev]);

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (isGroupedWithNext) {
            timer = setTimeout(() => setDelayedGroupedNext(true), 800);
        } else {
            setDelayedGroupedNext(false);
        }
        return () => clearTimeout(timer);
    }, [isGroupedWithNext]);

    const [showMenu, setShowMenu] = useState(false);
    const [showReactionPopover, setShowReactionPopover] = useState(false);
    const [isElevated, setIsElevated] = useState(false);



    // TẠI SAO dùng animationKey thay vì isNew boolean:
    // isNew thượng xuyên bị reset về false khi ChatMessage re-render do local state (hover, menu...)
    // khiến animate={} → emoji bị freeze tại y=-25 giữa chướng.
    // animationKey chỉ tăng khi emoji THỰC SỰ thay đổi (qua useEffect với [currentEmoji] deps)
    // nên nó ổn định hoàn toàn xuyên suốt cả animation 1.2s.
    const currentEmoji = message.reactions
        ? Object.values(message.reactions)[0] ?? null
        : null;
    // Init prevEmojiRef = emoji hiện tại ngay khi mount → scroll lên tin nhắn cũ không animate
    const prevEmojiRef = useRef<string | null>(currentEmoji);
    const [animationKey, setAnimationKey] = useState(0);

    useEffect(() => {
        let timeout: NodeJS.Timeout;
        if (showReactionPopover) {
            setIsElevated(true);
        } else {
            timeout = setTimeout(() => setIsElevated(false), 200); // 200ms matches exit duration
        }
        return () => clearTimeout(timeout);
    }, [showReactionPopover]);

    // TẠI SAO chỉ có [currentEmoji] trong deps (không phải mọi render):
    // Effect này chỉ chạy khi emoji thực sự thay đổi, tăng animationKey một lần duy nhất.
    // Các re-render do local state (hover menu, popover...) không làm effect chạy lại
    // nên animationKey không thay đổi và animation không bị ngắt giữa chướng.
    useEffect(() => {
        if (currentEmoji !== prevEmojiRef.current) {
            if (currentEmoji !== null) {
                setAnimationKey((k) => k + 1);
            }
            prevEmojiRef.current = currentEmoji;
        }
    }, [currentEmoji]);

    const reactionBtnRef = React.useRef<HTMLButtonElement>(null);
    const [copied, setCopied] = useState(false);
    const isUser = message.sender === "USER";
    const isSystem = message.sender === "SYSTEM";
    const isRevoked =
        message.isRevoked ??
        !!message.message?.startsWith("[Message was recalled");
    const isOptimistic = message.id.startsWith("optimistic-");
    const isLikeMessage =
        message.message === "👍" && !message.file_url && !message.card;

    // Làm sạch message text bằng cách xóa tất cả các comment HTML chứa cấu hình nội bộ (suggestions, card)
    // Dùng (?:-->|$) để ẩn đi các thẻ đang bị gõ dở dang trong quá trình streaming.
    const cleanMessageText = React.useMemo(() => {
        const textToClean = (message.sender === "ADMIN" && message.translated_text) ? message.translated_text : message.message;
        if (!textToClean) return "";
        let cleaned = textToClean.replace(/<!--[\s\S]*?(?:-->|$)/g, "").trim();
        if (cleaned.startsWith("[NLP_CACHE]")) {
            cleaned = cleaned.replace(/^\[NLP_CACHE\]\s*/, "").trim();
        }
        return cleaned;
    }, [message.message, message.sender, message.translated_text]);

    const isImageOnlyMessage =
        message.images &&
        message.images.length > 0 &&
        !cleanMessageText &&
        !message.card &&
        !message.file_url &&
        (!message.documents || message.documents.length === 0);
    const isFileOnlyMessage =
        (!!message.file_url ||
            (message.documents && message.documents.length > 0)) &&
        !cleanMessageText &&
        !message.card &&
        (!message.images || message.images.length === 0);
    const isTransparentBubble = isLikeMessage || isFileOnlyMessage;

    // Calculate and schedule recall availability in useEffect (pure render)
    const messageTimestamp = message.timestamp;
    const [canRevoke, setCanRevoke] = useState(false);

    useEffect(() => {
        if (!isUser || isRevoked) {
            setCanRevoke(false);
            return;
        }

        const timeDiff = Date.now() - new Date(messageTimestamp).getTime();
        const WINDOW = 2 * 60 * 1000; // 2 phút

        if (timeDiff >= WINDOW) {
            setCanRevoke(false);
            return;
        }

        // Chỉ cần 1 timeout bắn đúng lúc hết hạn — không cần poll mỗi giây
        setCanRevoke(true);
        const remaining = WINDOW - timeDiff;
        const id = setTimeout(() => setCanRevoke(false), remaining);
        return () => clearTimeout(id);
    }, [isUser, isRevoked, messageTimestamp]);

    const tChat = useTranslations("Chat");

    if (isSystem) {
        const isHandbackMsg =
            cleanMessageText === "HANDBACK_SYSTEM_MESSAGE" ||
            cleanMessageText.includes("AI Kimi") ||
            cleanMessageText.includes("AI 어시스턴트 Kimi");
        const text = isHandbackMsg
            ? tChat("handback_system_message")
            : cleanMessageText;
        // Message Status System
        return (
            <div className="flex justify-center py-2 w-full">
                <span className="text-xs font-medium text-[var(--color-text-muted)] text-center px-4">
                    {text}
                </span>
            </div>
        );
    }

    const handleCopy = () => {
        void navigator.clipboard.writeText(cleanMessageText);
        onCopy?.(cleanMessageText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <>
            <AnimatePresence>
                {showReactionPopover && (
                    <m.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowReactionPopover(false);
                        }}
                        className="fixed inset-0 z-[40] bg-black/5 dark:bg-black/40 backdrop-blur-[2px] cursor-default rounded-[inherit]"
                        aria-hidden="true"
                    />
                )}
            </AnimatePresence>
            <article
                className={cn(
                    "group flex flex-col gap-0 w-full relative transition-[margin-top,transform] duration-500 ease-in-out",
                    isUser ? "items-end" : "items-start",
                    isElevated && "z-[50]",
                    // Khoảng cách giữa các group tách biệt — đặt trên article để label sát bubble hơn
                    !delayedGroupedPrev ? "mt-5" : "",
                )}
                aria-label={`Message from ${
                    SENDER_LABELS[message.sender as keyof typeof SENDER_LABELS]
                        ? t(
                              SENDER_LABELS[
                                  message.sender as keyof typeof SENDER_LABELS
                              ],
                          )
                        : message.sender
                }`}
            >
                {/* Chỉ hiển thị nhãn người gửi ở tin nhắn ĐẦU TIÊN của mỗi group để tránh lặp */}
                {(message.sender === "AI" || message.sender === "ADMIN") &&
                    !delayedGroupedPrev && (
                        <span className="text-xs text-[var(--color-text-muted)] select-none pl-1 font-medium">
                            {t(
                                SENDER_LABELS[
                                    message.sender as keyof typeof SENDER_LABELS
                                ],
                            )}
                        </span>
                    )}

                {/* Quoted reply */}
                {/* TẠI SAO: Tái cấu trúc quoted reply lồng ghép cao cấp.
                Thay vì khối viền thô kệch phía trên, ta tạo bong bóng gốc nhỏ hơn ở phía sau (z-0, opacity cao),
                thụt lề ngang (mr-6/ml-6) để tạo độ lệch so le đẹp mắt, kèm nhãn chỉ hướng tinh xảo có icon Reply. */}
                {replyToMessage ? (
                    <div
                        className={cn(
                            "flex flex-col gap-1 w-full relative top-[10px]",
                            isUser ? "items-end" : "items-start",
                        )}
                    >
                        <div className="flex items-center gap-1 text-[10px] text-[var(--color-text-muted)] font-semibold select-none mb-0.5 opacity-80 pl-1">
                            <Reply className="size-2.5 rotate-180 transform scale-x-[-1]" />
                            <span>
                                {isUser
                                    ? t("replied_you", {
                                          name: SENDER_LABELS[
                                              replyToMessage.sender as keyof typeof SENDER_LABELS
                                          ]
                                              ? t(
                                                    SENDER_LABELS[
                                                        replyToMessage.sender as keyof typeof SENDER_LABELS
                                                    ],
                                                )
                                              : replyToMessage.sender,
                                      })
                                    : t("replied_other", {
                                          name1: SENDER_LABELS[
                                              message.sender as keyof typeof SENDER_LABELS
                                          ]
                                              ? t(
                                                    SENDER_LABELS[
                                                        message.sender as keyof typeof SENDER_LABELS
                                                    ],
                                                )
                                              : message.sender,
                                          name2: SENDER_LABELS[
                                              replyToMessage.sender as keyof typeof SENDER_LABELS
                                          ]
                                              ? t(
                                                    SENDER_LABELS[
                                                        replyToMessage.sender as keyof typeof SENDER_LABELS
                                                    ],
                                                )
                                              : replyToMessage.sender,
                                      })}
                            </span>
                        </div>

                        <div
                            className={cn(
                                "max-w-[70%] rounded-lg px-3 py-2.5 text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 shadow-2xs select-none relative z-0 pb-[20px]",
                                isUser ? " rounded-tr-md" : " rounded-tl-md",
                            )}
                            title={replyToMessage.message}
                        >
                            {/* TẠI SAO dùng line-clamp-3 kết hợp whitespace-pre-wrap break-words:
                            Giới hạn độ dài tối đa là 3 dòng thay vì 1 dòng như trước đây, 
                            đồng thời đảm bảo xuống dòng tự nhiên và tự thêm dấu ba chấm '...' ở cuối dòng thứ 3. */}
                            <p className="line-clamp-3 whitespace-pre-wrap break-words">
                                {replyToMessage.message}
                            </p>
                        </div>
                    </div>
                ) : null}

                <div
                    className={cn(
                        "flex items-end gap-1.5 w-full",
                        isUser ? "justify-end" : "justify-start",
                    )}
                >
                    {/* Cụm hover React/Reply của User đặt bên trái bong bóng tin nhắn */}
                    {isUser && !isOptimistic && !isRevoked && (
                        <ChatMessageActions
                            message={message}
                            isUser={isUser}
                            isElevated={isElevated}
                            showReactionPopover={showReactionPopover}
                            reactionBtnRef={reactionBtnRef}
                            setShowReactionPopover={setShowReactionPopover}
                            onReaction={onReaction}
                            onReply={onReply}
                            align="left"
                        />
                    )}

                    {/*
                     * WRAPPER flex-col (position:relative): bọc bubble + spacer + pill
                     * TẠI SAO cần wrapper riêng:
                     * - Spacer phải là flex item NGOÀI bubble (không làm bubble cao hơn)
                     * - Pill dùng position:absolute bottom-[16px] → cần neo vào wrapper (có relative)
                     * - Khi spacer animated từ 0→16px, wrapper cao dần, pill trượt xuống theo ✔
                     */}
                    <div
                        className={cn(
                            "relative flex flex-col min-w-0 transition-[margin-top] duration-500 ease-in-out",
                            message.message &&
                                /\b\S{8,}[.!?;:]*$/i.test(
                                    message.message.trim(),
                                )
                                ? "max-w-[75%]"
                                : "max-w-[85%]",
                            isUser ? "items-end" : "items-start",
                            // mt-3 đã được chuyển lên article — bubble wrapper chỉ cần mt nhỏ
                            // User non-grouped: article đã có mt-3, bubble không cần thêm
                            // AI/ADMIN non-grouped: mt-0.5 tạo khoảng cách nhỏ giữa label và bubble
                            // Grouped (bất kể sender): mt-0.5 giữ các bubble sát nhau
                            isUser && !delayedGroupedPrev ? "mt-0" : "mt-0.5",
                        )}
                    >
                        {/* Removed Loader2 spinner to improve UX for simple messages */}
                        {/* Mảng hình ảnh (từ upload) - luôn render ngoài bubble không viền */}
                        {message.images &&
                        message.images.length > 0 &&
                        !isRevoked ? (
                            <div
                                className={cn(
                                    "w-full",
                                    !isImageOnlyMessage &&
                                        !isFileOnlyMessage &&
                                        "mb-1",
                                )}
                            >
                                <ImageGallery
                                    images={message.images}
                                    isUser={isUser}
                                />
                            </div>
                        ) : null}

                        {/* Documents (từ upload) - luôn render ngoài bubble không viền */}
                        {!isRevoked && (
                            <>
                                {message.file_url ? (
                                    <div
                                        className={cn(
                                            "w-full flex justify-end",
                                            !isUser && "justify-start",
                                            !isFileOnlyMessage && "mb-1",
                                        )}
                                    >
                                        <FileAttachmentCard
                                            url={message.file_url}
                                            name={message.file_name}
                                            onLoad={onImageLoad}
                                        />
                                    </div>
                                ) : null}

                                {message.documents &&
                                message.documents.length > 0 ? (
                                    <div
                                        className={cn(
                                            "flex w-full flex-col gap-1",
                                            isUser
                                                ? "items-end"
                                                : "items-start",
                                            !isFileOnlyMessage && "mb-1",
                                        )}
                                    >
                                        {message.documents.map((doc, idx) => (
                                            <FileAttachmentCard
                                                key={idx}
                                                url={doc.url}
                                                name={doc.name}
                                                onLoad={onImageLoad}
                                            />
                                        ))}
                                    </div>
                                ) : null}
                            </>
                        )}

                        {/* BUBBLE — giữ nguyên style gốc, chỉ bỏ max-w-[85%] (lên wrapper). Render khi không phải image-only hoặc file-only hoặc bị thu hồi */}
                        {((!isImageOnlyMessage && !isFileOnlyMessage) ||
                            isRevoked) &&
                            (cleanMessageText ||
                                message.card ||
                                isRevoked ||
                                isLikeMessage) && (
                                <div
                                    className={cn(
                                        "relative flex flex-col w-fit min-w-0 transition-[border-radius] duration-500 ease-in-out",
                                        isTransparentBubble
                                            ? cn(
                                                  "bg-transparent shadow-none",
                                                  isUser
                                                      ? "items-end justify-end"
                                                      : "items-start justify-start",
                                                  isLikeMessage &&
                                                      "text-blue-500",
                                                  isFileOnlyMessage && "p-0",
                                              )
                                            : cn(
                                                  "pr-3.5 pl-4.5 pb-2 pt-2.5 text-sm leading-relaxed shadow-xs",
                                                  isUser
                                                      ? cn(
                                                            "bg-[linear-gradient(135deg,var(--color-primary)_0%,var(--color-primary-light)_50%,var(--color-primary)_100%)] text-[var(--color-surface-base)]",
                                                            "rounded-l-2xl",
                                                            !delayedGroupedPrev
                                                                ? "rounded-tr-2xl"
                                                                : "rounded-tr-md",
                                                            !delayedGroupedNext
                                                                ? "rounded-br-2xl"
                                                                : "rounded-br-md",
                                                        )
                                                      : cn(
                                                            "border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)]",
                                                            "rounded-r-2xl",
                                                            !delayedGroupedPrev
                                                                ? "rounded-tl-2xl"
                                                                : "rounded-tl-md",
                                                            !delayedGroupedNext
                                                                ? "rounded-bl-2xl"
                                                                : "rounded-bl-md",
                                                        ),
                                              ),
                                        isRevoked && "opacity-50 italic",
                                        replyToMessage &&
                                            "z-10 -mt-2.5 shadow-sm",
                                    )}
                                >
                                    {isRevoked ? (
                                        <p className="text-xs">
                                            {t("recalled")}
                                        </p>
                                    ) : (
                                        <>
                                            {/* file_url và documents đã được dời ra bên ngoài bubble */}

                                            {cleanMessageText ? (
                                                isLikeMessage ? (
                                                    <ThumbsUp className="size-12 fill-current drop-shadow-sm" />
                                                ) : message.sender === "AI" &&
                                                  !message.isStreaming ? (
                                                    <ChatHighlightContext.Provider value={{ searchQuery, isUser: false }}>
                                                        <div className="prose prose-sm max-w-none dark:prose-invert [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 font-medium prose-a:text-[var(--color-primary)] prose-a:underline prose-a:decoration-dashed prose-a:underline-offset-4 hover:prose-a:decoration-solid hover:prose-a:text-[var(--color-primary-dark)] prose-a:font-semibold">
                                                            <ReactMarkdown
                                                                remarkPlugins={[
                                                                    remarkGfm,
                                                                ]}
                                                                components={
                                                                    staticMarkdownComponents
                                                                }
                                                            >
                                                                {cleanMessageText}
                                                            </ReactMarkdown>
                                                        </div>
                                                    </ChatHighlightContext.Provider>
                                                ) : (
                                                    <ChatHighlightContext.Provider value={{ searchQuery, isUser: message.sender === "USER" }}>
                                                        <p
                                                            className={cn(
                                                                "whitespace-pre-wrap break-words font-medium",
                                                                message.isStreaming &&
                                                                    "after:animate-pulse after:content-['▍']",
                                                            )}
                                                        >
                                                            <HighlightText text={cleanMessageText} />
                                                        </p>
                                                    </ChatHighlightContext.Provider>
                                                )
                                            ) : null}

                                            {/* Structured card từ AI */}
                                            {message.card ? (
                                                <ChatCard
                                                    card={message.card}
                                                    whatsappUrl={whatsappUrl}
                                                />
                                            ) : null}
                                        </>
                                    )}
                                </div>
                            )}

                        {/*
                         * SPACER + PILL — bọc trong AnimatePresence để xử lý cả hai chiều:
                         * - Xuất hiện: spacer animate height 0→16px (bubble trượt lên mượt)
                         * - Biến mất: spacer animate height 16→0px (bubble trượt xuống mượt)
                         *
                         * TẠI SAO dùng key trên Fragment thay vì condition:
                         * AnimatePresence cần phát hiện unmount để chạy exit animation.
                         * Với conditional rendering, React tự unmount khi điều kiện false.
                         */}
                        <AnimatePresence>
                            {message.reactions &&
                                Object.keys(message.reactions).length > 0 && (
                                    // key bắt buộc cho AnimatePresence nhận biết element
                                    <m.div
                                        key="reaction-spacer-pill"
                                        style={{
                                            flexShrink: 0,
                                            overflow: "visible",
                                        }}
                                    >
                                        {/*
                                         * SPACER (flex item trong wrapper, ngoài bubble):
                                         * initial height:0 → animate height:16px khi xuất hiện
                                         * exit height:0 → bubble trượt trở lại vị trí cũ khi reaction bị xóa
                                         */}
                                        <m.div
                                            initial={{ height: 0 }}
                                            animate={{ height: 16 }}
                                            exit={{ height: 0 }}
                                            transition={{
                                                duration: 0.25,
                                                ease: "easeOut",
                                            }}
                                            aria-hidden="true"
                                        />

                                        {/* PILL — absolute đến bottom-[16px] của wrapper */}
                                        {/* Thêm exit={{ opacity: 0, transition: { duration: 0 } }} để biến mất ngay lập tức khi spacer trượt xuống */}
                                        <m.div
                                            exit={{
                                                opacity: 0,
                                                transition: { duration: 0 },
                                            }}
                                        >
                                            <ReactionBadge
                                                reactions={message.reactions}
                                                isUser={isUser}
                                                animationKey={animationKey}
                                                onToggle={() => {
                                                    if (!message.reactions)
                                                        return;
                                                    const userEmoji =
                                                        message.reactions[
                                                            "USER"
                                                        ];
                                                    if (userEmoji) {
                                                        onReaction?.(
                                                            message.id,
                                                            userEmoji,
                                                        );
                                                    } else {
                                                        const firstEmoji =
                                                            Object.values(
                                                                message.reactions,
                                                            )[0];
                                                        if (firstEmoji)
                                                            onReaction?.(
                                                                message.id,
                                                                firstEmoji,
                                                            );
                                                    }
                                                }}
                                            />
                                        </m.div>
                                    </m.div>
                                )}
                        </AnimatePresence>
                    </div>

                    {/* Cụm hover React/Reply của AI/ADMIN đặt bên phải bong bóng tin nhắn */}
                    {!isUser && !isOptimistic && !isRevoked && (
                        <ChatMessageActions
                            message={message}
                            isUser={isUser}
                            isElevated={isElevated}
                            showReactionPopover={showReactionPopover}
                            reactionBtnRef={reactionBtnRef}
                            setShowReactionPopover={setShowReactionPopover}
                            onReaction={onReaction}
                            onReply={onReply}
                            align="right"
                        />
                    )}
                </div>

                {/* TẠI SAO đặt thời gian nhắn, trạng thái tin nhắn và Toggle Translate ra ngoài bong bóng chat:
          Di chuyển các thông tin phụ trợ này xuống hàng ngang dưới bong bóng chat giúp giao diện thoáng đãng, chuyên nghiệp.
          Sử dụng CSS Grid transition để khi M2 gom nhóm với M1, thời gian của M1 sẽ thu nhỏ mượt mà thay vì biến mất đột ngột. */}
                <ChatMessageFooter
                    isUser={isUser}
                    isRevoked={isRevoked}
                    timestamp={message.timestamp}
                    deliveryStatus={message.delivery_status}
                    phase={phase}
                    isReplied={isReplied}
                    messageText={cleanMessageText}
                    delayedGroupedNext={delayedGroupedNext}
                />
            </article>
        </>
    );
}

// Lưu ý: onTranslate, onCopy, onRevoke, onReply không được so sánh ở đây.
// Parent component phải wrap các callbacks này bằng useCallback để đảm bảo
// referential stability, tránh stale closure khi memo skip re-render.
export const ChatMessage = React.memo(
    ChatMessageInner,
    (prev, next) =>
        prev.message.id === next.message.id &&
        prev.message.message === next.message.message &&
        prev.message.translated_text === next.message.translated_text &&
        prev.message.isStreaming === next.message.isStreaming &&
        prev.message.delivery_status === next.message.delivery_status &&
        prev.message.isRevoked === next.message.isRevoked &&
        prev.message.file_url === next.message.file_url &&
        prev.message.file_name === next.message.file_name &&
        prev.message.images === next.message.images &&
        prev.message.documents === next.message.documents &&
        prev.message.card === next.message.card &&
        prev.searchQuery === next.searchQuery &&
        (() => {
            const prevReacts = prev.message.reactions || {};
            const nextReacts = next.message.reactions || {};
            const prevKeys = Object.keys(prevReacts);
            const nextKeys = Object.keys(nextReacts);
            if (prevKeys.length !== nextKeys.length) return false;
            for (const key of prevKeys) {
                if (prevReacts[key] !== nextReacts[key]) return false;
            }
            return true;
        })() &&
        prev.onImageLoad === next.onImageLoad &&
        prev.isGroupedWithPrev === next.isGroupedWithPrev &&
        prev.isGroupedWithNext === next.isGroupedWithNext &&
        prev.isNewMessage === next.isNewMessage &&
        prev.isReplied === next.isReplied &&
        ((!prev.replyToMessage && !next.replyToMessage) ||
            (prev.replyToMessage?.id === next.replyToMessage?.id &&
                prev.replyToMessage?.message === next.replyToMessage?.message)),
);
