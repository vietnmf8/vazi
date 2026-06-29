import React from "react";
import { CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

export function DeliveryStatusIcon({
    isReplied,
    ariaLabel,
}: {
    isReplied?: boolean;
    ariaLabel?: string;
}) {
    return (
        <CheckCheck
            className={cn(
                "size-3",
                isReplied ? "text-blue-400" : "text-[var(--color-text-muted)]",
            )}
            aria-label={ariaLabel ?? (isReplied ? "Seen" : "Sent")}
        />
    );
}

// Cache format time
const _timeFormatter = new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
});

export function formatTime(iso: string): string {
    try {
        return _timeFormatter.format(new Date(iso));
    } catch {
        return "";
    }
}

interface ChatMessageFooterProps {
    isUser: boolean;
    isRevoked: boolean;
    timestamp: string;
    deliveryStatus?: string;
    phase?: string;
    isReplied?: boolean;
    messageText?: string;
    delayedGroupedNext?: boolean;
}

export function ChatMessageFooter({
    isUser,
    isRevoked,
    timestamp,
    deliveryStatus: _deliveryStatus,
    phase: _phase,
    isReplied,
    messageText,
    delayedGroupedNext,
}: ChatMessageFooterProps) {
    const t = useTranslations("ChatMessage");
    return (
        <div
            className={cn(
                "transition-[max-height,opacity] duration-500 ease-in-out w-full overflow-hidden origin-top",
                !delayedGroupedNext ? "max-h-[40px] opacity-100" : "max-h-0 opacity-0"
            )}
        >
            <div className="pt-1">
                {isUser ? (
                    <div className="flex items-center justify-end gap-1 pr-1 text-[10px] select-none text-[var(--color-text-muted)] leading-none font-semibold">
                        <span>{formatTime(timestamp)}</span>
                        <DeliveryStatusIcon
                            isReplied={isReplied}
                            ariaLabel={isReplied ? t("delivery_seen") : t("delivery_sent")}
                        />
                    </div>
                ) : isRevoked ? (
                    <div className="flex items-center justify-start gap-1 pl-1 text-[10px] select-none text-[var(--color-text-muted)] leading-none font-semibold">
                        <span>{formatTime(timestamp)}</span>
                    </div>
                ) : (
                    <div className="flex items-center justify-start gap-2.5 pl-1 text-[10px] select-none text-[var(--color-text-muted)] leading-none font-semibold">
                        <span>{formatTime(timestamp)}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
