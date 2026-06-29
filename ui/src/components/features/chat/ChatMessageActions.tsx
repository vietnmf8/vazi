import React from "react";
import { Smile, RotateCcw } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { ReactionPopover } from "@/components/features/chat/ReactionPopover";
import { cn } from "@/lib/utils";
import type { ChatMessage as ChatMessageType } from "@/types/api";
import { useTranslations } from "next-intl";

interface ChatMessageActionsProps {
    message: ChatMessageType;
    isUser: boolean;
    isElevated: boolean;
    showReactionPopover: boolean;
    reactionBtnRef: React.RefObject<HTMLButtonElement | null>;
    setShowReactionPopover: (show: boolean) => void;
    onReaction?: (messageId: string, emoji: string) => void;
    onReply?: (message: ChatMessageType) => void;
    align?: "left" | "right";
}

export function ChatMessageActions({
    message,
    isUser,
    isElevated,
    showReactionPopover,
    reactionBtnRef,
    setShowReactionPopover,
    onReaction,
    onReply,
    align = "left",
}: ChatMessageActionsProps) {
    const t = useTranslations("ChatMessage");
    return (
        <div className={cn(
            "flex items-center gap-1 transition-opacity duration-150 shrink-0 select-none relative",
            isElevated ? "opacity-100" : "opacity-0 group-hover:opacity-100 transition-all"
        )}>
            <AnimatePresence>
                {showReactionPopover && (
                    <ReactionPopover
                        align={align}
                        triggerRef={reactionBtnRef}
                        onClose={() => setShowReactionPopover(false)}
                        onSelect={(emoji) => {
                            onReaction?.(message.id, emoji);
                            setShowReactionPopover(false);
                        }}
                    />
                )}
            </AnimatePresence>
            <button
                ref={reactionBtnRef}
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    setShowReactionPopover(!showReactionPopover);
                }}
                className="p-1 hover:bg-[var(--color-surface-elevated)] rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-all "
                title={t("tooltip_react")}
                aria-label="React to message"
            >
                <Smile className="size-4" />
            </button>
            {onReply && (
                <button
                    type="button"
                    onClick={() => onReply(message)}
                    className="p-1 hover:bg-[var(--color-surface-elevated)] rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-all "
                    title={t("tooltip_reply")}
                    aria-label="Reply to message"
                >
                    <RotateCcw className="size-4" />
                </button>
            )}
        </div>
    );
}
