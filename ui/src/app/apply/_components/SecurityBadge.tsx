"use client";

import * as React from "react";
import LockIcon from "@/assets/icons/ui/Lock.svg";
import ShieldIcon from "@/assets/icons/ui/Shield.svg";
import CheckSolidIcon from "@/assets/icons/ui/CheckSolid.svg";

interface SecurityBadgeProps {
    icon: "lock" | "shield" | "check";
    label: string;
}

/**
 * Huy hiệu bảo mật thông tin thanh toán (Security Badge).
 * TẠI SAO: Đóng gói các icon bảo mật SVG phức tạp giúp mã nguồn của Step3 sạch sẽ và dễ đọc hơn rất nhiều.
 */
export function SecurityBadge({ icon, label }: SecurityBadgeProps) {
    return (
        <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-full bg-[rgba(52,211,153,0.12)] text-[var(--color-success)]">
                {icon === "lock" && (
                    <LockIcon className="size-3.5" aria-hidden="true" />
                )}
                {icon === "shield" && (
                    <ShieldIcon className="size-3.5" aria-hidden="true" />
                )}
                {icon === "check" && (
                    <CheckSolidIcon className="size-3.5" aria-hidden="true" />
                )}
            </span>
            <span className="text-xs font-medium text-[var(--color-text-secondary)]">
                {label}
            </span>
        </div>
    );
}
