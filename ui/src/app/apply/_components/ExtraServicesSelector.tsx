"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import CheckIcon from "@/assets/icons/ui/Check.svg";
import { useTranslations } from "next-intl";

interface ExtraServicesSelectorProps {
    vipEnabled: boolean;
    basicEnabled: boolean;
    visaCategory: string;
    onChange: (vip: boolean, basic: boolean) => void;
}

/**
 * Khối lựa chọn dịch vụ gia tăng (Basic & VIP Airport Fast-track).
 * TẠI SAO: Đóng gói các checkbox dịch vụ đi kèm loại trừ lẫn nhau và quản lý ràng buộc Standalone Fast-Track mode.
 */
export function ExtraServicesSelector({
    vipEnabled,
    basicEnabled,
    visaCategory,
    onChange,
}: ExtraServicesSelectorProps) {
    const t = useTranslations("ApplyPage.Step2");
    const isStandaloneFastTrack = visaCategory === "code_fasttrack";

    const handleVipToggle = () => {
        if (vipEnabled) {
            // Nếu đang bật VIP, tắt đi
            if (isStandaloneFastTrack) {
                // Standalone mode: không được tắt cả hai, chuyển sang Basic
                onChange(false, true);
            } else {
                // Bình thường: tắt hẳn
                onChange(false, false);
            }
        } else {
            // Bật VIP, tự động tắt Basic
            onChange(true, false);
        }
    };

    const handleBasicToggle = () => {
        if (basicEnabled) {
            // Nếu đang bật Basic, tắt đi
            if (isStandaloneFastTrack) {
                // Standalone mode: không được tắt cả hai, chuyển sang VIP
                onChange(true, false);
            } else {
                // Bình thường: tắt hẳn
                onChange(false, false);
            }
        } else {
            // Bật Basic, tự động tắt VIP
            onChange(false, true);
        }
    };

    return (
        <div className="space-y-4">
            <h3 className="font-body text-lg font-semibold text-(--color-text-primary)">
                {t("extra_services_title")}
            </h3>
            
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* Basic Fast-track Button */}
                <button
                    type="button"
                    role="checkbox"
                    aria-checked={basicEnabled}
                    onClick={handleBasicToggle}
                    className={cn(
                        "flex w-full items-start gap-4 rounded-[var(--radius-xl)] border p-5 text-left transition-all duration-200",
                        basicEnabled
                            ? "border-[rgba(58,186,180,0.6)] bg-[rgba(58,186,180,0.08)] shadow-[0_0_0_1px_rgba(58,186,180,0.3)]"
                            : "border-[var(--color-border)] bg-[var(--color-surface-2)] hover:-translate-y-0.5 hover:border-[var(--color-border-strong)] hover:shadow-md transition-all",
                    )}
                >
                    {/* Checkbox indicator */}
                    <span
                        className={cn(
                            "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border-2 transition-all duration-200",
                            basicEnabled
                                ? "border-[rgba(58,186,180,1)] bg-[rgba(58,186,180,1)]"
                                : "border-[var(--color-border-strong)]",
                        )}
                        aria-hidden
                    >
                        {basicEnabled && <CheckIcon className="size-3 text-[var(--color-text-inverse)]" />}
                    </span>
                    <div className="min-0 flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                            <span className="font-body text-sm font-semibold text-(--color-text-primary)">
                                {t("basic_fasttrack_label")}
                            </span>
                            <span className="rounded-full bg-[rgba(58,186,180,0.15)] px-2.5 py-0.5 text-xs font-semibold text-[var(--color-secondary)]">
                                {t("basic_fasttrack_price")}
                            </span>
                        </div>
                        <p className="caption-text">
                            {t("basic_fasttrack_desc")}
                        </p>
                    </div>
                </button>

                {/* VIP Fast-track Button */}
                <button
                    type="button"
                    role="checkbox"
                    aria-checked={vipEnabled}
                    onClick={handleVipToggle}
                    className={cn(
                        "flex w-full items-start gap-4 rounded-[var(--radius-xl)] border p-5 text-left transition-all duration-200",
                        vipEnabled
                            ? "border-[rgba(200,150,90,0.6)] bg-[var(--color-primary-subtle)] shadow-[0_0_0_1px_rgba(200,150,90,0.3)]"
                            : "border-[var(--color-border)] bg-[var(--color-surface-2)] hover:-translate-y-0.5 hover:border-[var(--color-border-strong)] hover:shadow-md transition-all",
                    )}
                >
                    {/* Checkbox indicator */}
                    <span
                        className={cn(
                            "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border-2 transition-all duration-200",
                            vipEnabled
                                ? "border-[rgba(200,150,90,1)] bg-[rgba(200,150,90,1)]"
                                : "border-[var(--color-border-strong)]",
                        )}
                        aria-hidden
                    >
                        {vipEnabled && <CheckIcon className="size-3 text-[var(--color-text-inverse)]" />}
                    </span>
                    <div className="min-0 flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                            <span className="font-body text-sm font-semibold text-(--color-text-primary)">
                                {t("vip_fasttrack_label")}
                            </span>
                            <span className="rounded-full bg-[rgba(200,150,90,0.15)] px-2.5 py-0.5 text-xs font-semibold text-[rgba(200,150,90,1)]">
                                {t("vip_fasttrack_price")}
                            </span>
                        </div>
                        <p className="caption-text">
                            {t("vip_fasttrack_desc")}
                        </p>
                    </div>
                </button>
            </div>
        </div>
    );
}
