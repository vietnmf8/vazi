"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

interface ChatEmptyStateProps {
    searchQuery?: string;
}

/**
 * Hiển thị thông báo khi không có tin nhắn nào trong phòng chat hoặc không khớp với từ khóa tìm kiếm.
 * TẠI SAO: Đóng gói trạng thái trống giúp giao diện gọn gàng, dễ dàng mở rộng thiết kế minh họa (illustrations) nếu cần trong tương lai.
 */
export function ChatEmptyState({ searchQuery }: ChatEmptyStateProps) {
    const t = useTranslations("Chat");

    if (searchQuery) {
        return (
            <div className="flex flex-col items-center gap-1.5 px-4 text-center">
                <p className="text-sm font-medium text-[var(--color-text-primary)]">
                    {t("empty_no_match", { query: searchQuery })}
                </p>
            </div>
        );
    }

    return (
        <p className="text-center text-sm text-[var(--color-text-muted)]">
            {t("empty_start")}
        </p>
    );
}
