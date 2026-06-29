"use client";

import * as React from "react";

interface ReviewRowProps {
    label: string;
    value: string;
    mono?: boolean;
    badge?: "teal" | "gold";
}

/**
 * Hàng hiển thị thông tin tóm tắt để người dùng soát xét lại (Review Row).
 * TẠI SAO: Đóng gói hàng hiển thị review thành component riêng giúp dễ tùy biến style, hỗ trợ font mono và badge đi kèm đồng nhất.
 */
export function ReviewRow({
    label,
    value,
    mono = false,
    badge,
}: ReviewRowProps) {
    return (
        <div className="flex flex-col justify-between gap-1 py-4 sm:flex-row sm:items-center sm:gap-6">
            <span className="section-label">
                {label}
            </span>
            <span
                className={[
                    "text-sm font-semibold text-[var(--color-text-primary)] sm:text-right",
                    mono
                        ? "font-[family-name:var(--font-family-mono)] tabular-nums"
                        : "",
                ]
                    .filter(Boolean)
                    .join(" ")}
            >
                {value}
                {badge === "teal" && (
                    <span className="ml-2 inline-block rounded-full bg-[rgba(58,186,180,0.15)] px-2 py-0.5 text-xs font-semibold text-[var(--color-secondary)]">
                        Included
                    </span>
                )}
            </span>
        </div>
    );
}
