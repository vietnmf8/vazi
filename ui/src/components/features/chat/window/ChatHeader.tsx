"use client";

import * as React from "react";
import { MessageCircle, Plus, Search, X, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { useTranslations } from "next-intl";
import type { ChatWidgetPhase } from "@/types/api";

interface ChatHeaderProps {
    phase: ChatWidgetPhase;
    adminName: string | null;
    showSearch: boolean;
    onToggleSearch: () => void;
    onNewSession: () => void;
    onMinimize: () => void;
    onClose: () => void;
}

/**
 * Lấy nhãn phụ đề dựa trên giai đoạn hiện tại của cuộc hội thoại.
 * TẠI SAO: Đóng gói logic chuyển đổi phụ đề để giữ phần render của component sạch sẽ và dễ bảo trì.
 */
function getHeaderSubtitle(
    phase: ChatWidgetPhase,
    adminName: string | null,
    t: (key: string, values?: any) => string
): string {
    switch (phase) {
        case "JOINING":
            return t("header_start");
        case "CHATTING":
            return t("header_desc");
        case "HANDOFF_PENDING":
            return t("header_connecting");
        case "HUMAN_MODE":
            return adminName
                ? t("header_connected", { agentName: adminName })
                : t("header_agent_support");
        case "SURVEY":
            return t("header_experience");
        default:
            return t("header_help");
    }
}

/**
 * Thanh tiêu đề trên cùng của Chat Window.
 * TẠI SAO: Tách biệt phần header để quản lý các tương tác toàn cục (tìm kiếm, tạo phiên mới, đóng chat) độc lập với luồng tin nhắn.
 */
export function ChatHeader({
    phase,
    adminName,
    showSearch,
    onToggleSearch,
    onNewSession,
    onMinimize,
    onClose,
}: ChatHeaderProps) {
    const t = useTranslations("Chat");

    return (
        <header
            className={cn(
                "relative z-20 flex shrink-0 items-center justify-between px-4 py-[14px] bg-[linear-gradient(135deg,var(--color-primary)_0%,var(--color-primary-light)_50%,var(--color-primary)_100%)] text-white dark:text-black",
                "border-b border-(--color-border-default) transition-all duration-200"
            )}
        >
            <div>
                <div className="flex items-center gap-2">
                    <MessageCircle className="size-4" aria-hidden />
                    <h2 className="text-base font-semibold">Kimi</h2>
                </div>
                <p className="mt-0.5 text-xs">
                    {getHeaderSubtitle(phase, adminName, t)}
                </p>
            </div>

            <div className="flex items-center gap-1">
                {(phase === "CHATTING" || phase === "HUMAN_MODE") && (
                    <>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8 text-white dark:text-black hover:bg-white/10 dark:hover:bg-black/10 transition-all"
                            onClick={onToggleSearch}
                            aria-label={t("tooltip_search")}
                        >
                            <Search className="size-6" aria-hidden />
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8 text-white dark:text-black hover:bg-white/10 dark:hover:bg-black/10 transition-all"
                            onClick={onNewSession}
                            aria-label={t("tooltip_new")}
                            title={t("tooltip_new")}
                        >
                            <Plus className="size-6" aria-hidden />
                        </Button>
                    </>
                )}
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 text-white dark:text-black hover:bg-white/10 dark:hover:bg-black/10 transition-all"
                    onClick={onMinimize}
                    aria-label={t("tooltip_minimize")}
                    title={t("tooltip_minimize")}
                >
                    <Minus className="size-6" aria-hidden />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 text-white dark:text-black hover:bg-white/10 dark:hover:bg-black/10 transition-all"
                    onClick={onClose}
                    aria-label={t("tooltip_close")}
                    title={t("tooltip_close")}
                >
                    <X className="size-6" aria-hidden />
                </Button>
            </div>
        </header>
    );
}
