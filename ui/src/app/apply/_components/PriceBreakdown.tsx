"use client";

import { useState, useEffect, useRef } from "react";
import { AnimatePresence, m } from "framer-motion";
import { ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    calculatePrice,
    formatUsd,
    VISA_CATEGORY_LABELS,
    type PricingConfigData,
} from "./priceCalculator";
import type { Step1FormValues } from "./applySchemas";
import type { PriceBreakdown as ApiPriceBreakdown } from "@/types/api";
import { PriceCounter } from "@/components/ui/PriceCounter";
import { useTranslations } from "next-intl";

// Config Order Summary
const ORDER_SUMMARY_TOP_OFFSET_PX = 40; // Tăng gap top để không bị sát header

export interface PriceBreakdownProps {
    step1: Step1FormValues | null;
    /** Giá từ API — ưu tiên khi có; fallback local khi loading/lỗi */
    apiPrice?: ApiPriceBreakdown | null;
    isPriceLoading?: boolean;
    variant?: "sidebar" | "mobile";
    className?: string;
    children?: React.ReactNode;
    mobileStepper?: React.ReactNode;
    pricingConfig?: PricingConfigData | null;
}

/**
 * Order summary — sticky desktop, compact bar mobile.
 * Nhận step1 live + apiPrice để cập nhật giá realtime từ backend.
 */
export function PriceBreakdown({
    step1,
    apiPrice,
    isPriceLoading = false,
    variant = "sidebar",
    className,
    children,
    mobileStepper,
    pricingConfig,
}: PriceBreakdownProps) {
    const isMobile = variant === "mobile";
    const [isMobileExpanded, setIsMobileExpanded] = useState(false);
    const t = useTranslations("ApplyPage.PriceBreakdown");
    const tStep1 = useTranslations("ApplyPage.Step1");

    /* ── Computed values ── */
    const localPrice = step1 ? calculatePrice(step1, pricingConfig) : {
        baseFee: 0,
        processingSurcharge: 0,
        vipPerPerson: 0,
        basicPerPerson: 0,
        applicantCount: 0,
        total: 0
    };
    
    // TẠI SAO: Nếu là dịch vụ Fast-Track độc lập (code_fasttrack), ta bỏ qua dữ liệu từ API và dùng 100% cách tính local
    // nhằm đảm bảo hiển thị đúng base fee là $0 và cộng phí dịch vụ Basic ($35) hoặc VIP ($55).
    // Đồng thời, do backend API không biết về dịch vụ Basic Fast-Track ($35) mà chỉ trả về giá trị mặc định cho VIP ($55)
    // trong trường extra_services_per_person, ta BẮT BUỘC phải tính phí dịch vụ bổ sung (VIP/Basic) theo cấu hình local,
    // sau đó cộng dồn với phí thị thực gốc và phụ phí xử lý khẩn cấp từ API để tránh hiển thị sai lệch tổng tiền.
    const isStandaloneFastTrack = step1?.visa_category === "code_fasttrack";
    const useApiForTotal = Boolean(apiPrice) && !isStandaloneFastTrack;

    const baseFeeForTotal = useApiForTotal ? apiPrice!.base_fee_per_person : localPrice.baseFee;
    const processingSurchargeForTotal = useApiForTotal
        ? apiPrice!.processing_surcharge_per_person
        : localPrice.processingSurcharge;
    const vipPerPersonForTotal = localPrice.vipPerPerson;
    const basicPerPersonForTotal = localPrice.basicPerPerson;
    const applicantCountForTotal = useApiForTotal
        ? apiPrice!.applicant_count
        : localPrice.applicantCount;
    const computedTotal = useApiForTotal
        ? (baseFeeForTotal + processingSurchargeForTotal + vipPerPersonForTotal + basicPerPersonForTotal) * applicantCountForTotal
        : localPrice.total;

    const prevTotalRef = useRef(computedTotal);

    /* ── Empty state ── */
    if (!step1) {
        return (
            <div
                style={!isMobile ? { top: `calc(var(--header-total-height) + ${ORDER_SUMMARY_TOP_OFFSET_PX}px)` } : undefined}
                className={cn(
                    "rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white/40 dark:bg-black/40 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.08)]",
                    !isMobile && "lg:sticky",
                    isMobile && "rounded-none border-x-0 border-b-0",
                    className,
                )}
            >
                <div
                    className={cn(
                        "border-b border-[var(--color-border)] px-6",
                        isMobile ? "py-3" : "py-5",
                    )}
                >
                    <h3 className="section-label text-(--color-primary)">
                        {t("order_summary")}
                    </h3>
                </div>
                <div className={cn("px-6", isMobile ? "py-3" : "py-6")}>
                    <p className="body-text-sm">
                        {t("empty_state")}
                    </p>
                </div>
            </div>
        );
    }

    const total = computedTotal;
    const baseFee = baseFeeForTotal;
    const processingSurcharge = processingSurchargeForTotal;
    const vipPerPerson = vipPerPersonForTotal;
    const basicPerPerson = basicPerPersonForTotal;
    const applicantCount = applicantCountForTotal;

    return (
        <div
            className={cn(
                "rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white/40 dark:bg-black/40 backdrop-blur-[10px] shadow-[0_8px_32px_rgba(0,0,0,0.08)] overflow-hidden flex flex-col",
                isMobile && "rounded-none border-x-0 border-b-0",
                className,
            )}
            aria-live="polite"
            aria-atomic="true"
            data-ai-id="apply-price-breakdown"
            data-ai-desc="Bảng tổng kết phí Visa tạm tính (Order Summary / Price Breakdown) bao gồm phí visa, phụ phí và tổng thanh toán"
            data-ai-context={`Bảng tổng kết phí Visa tạm tính: Tổng tiền hiện tại là ${formatUsd(total)} (Base: ${formatUsd(baseFee)}, Processing: ${formatUsd(processingSurcharge)}, FastTrack: ${formatUsd(vipPerPerson > 0 ? vipPerPerson : basicPerPerson)}, Pax: ${applicantCount})`}
        >
            {/* ── Header ── */}
            <div
                className={cn(
                    "border-b border-[var(--color-border)] px-6",
                    isMobile ? "py-3 flex items-center justify-between " : "py-5",
                )}
                onClick={isMobile ? () => setIsMobileExpanded(!isMobileExpanded) : undefined}
            >
                {isMobile ? (
                    <>
                        <div className="flex-1 pr-4 max-w-[70%]">
                            {mobileStepper}
                        </div>
                        <div className="flex items-center gap-1.5 text-[var(--color-primary)]">
                            <span className="text-xs font-semibold uppercase tracking-wider">{t("summary")}</span>
                            <ChevronUp className={cn("size-4 transition-transform duration-300", isMobileExpanded ? "rotate-180" : "")} />
                        </div>
                    </>
                ) : (
                    <h3 className="section-label text-(--color-primary)">
                        {t("order_summary")}
                    </h3>
                )}
            </div>

            <AnimatePresence initial={false}>
                {(!isMobile || isMobileExpanded) && (
                    <m.div
                        key="content"
                        initial={isMobile ? { height: 0, opacity: 0 } : false}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={isMobile ? { height: 0, opacity: 0 } : undefined}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="overflow-hidden flex flex-col"
                    >
                        <div
                            className={cn(
                                "border-b border-[var(--color-border)] px-6",
                                isMobile ? "py-3" : "py-4",
                            )}
                        >
                            <p className="mb-0.5 section-label">
                                {t("selected")}
                            </p>
                            <p className="font-body text-sm font-semibold text-[var(--color-text-primary)]">
                                {step1.visa_category ? tStep1(`cat_${step1.visa_category}` as any) : "..."}
                            </p>
                        </div>

                        {/* ── Line items — opacity fade khi loading ── */}
                        <div
                            className={cn(
                                "px-6 transition-opacity duration-150",
                                isMobile ? "py-3" : "py-5",
                                isPriceLoading && "opacity-50",
                            )}
                        >
                            <div className="flex items-center justify-between gap-4">
                                <span className="text-sm text-[var(--color-text-muted)]">
                                    {t("base_fee")}
                                </span>
                                <span className="font-[family-name:var(--font-family-mono)] text-sm tabular-nums text-[var(--color-text-primary)]">
                                    {formatUsd(baseFee)}
                                </span>
                            </div>

                            <div className="mt-3 flex items-center justify-between gap-4">
                                <span className="text-sm text-[var(--color-text-muted)]">
                                    {t("processing")}
                                </span>
                                <span className="font-[family-name:var(--font-family-mono)] text-right text-sm tabular-nums text-[var(--color-text-primary)]">
                                    {processingSurcharge === 0
                                        ? t("included")
                                        : `+${formatUsd(processingSurcharge)}`}
                                </span>
                            </div>

                            {/* Fast-track row — single slot */}
                            <AnimatePresence>
                                {(vipPerPerson > 0 || basicPerPerson > 0) && (
                                    <m.div
                                        key="fasttrack-row"
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.22, ease: "easeInOut" }}
                                        style={{ overflow: "hidden" }}
                                    >
                                        <div className="pt-3 flex items-center justify-between gap-4">
                                            <span className="text-sm text-[var(--color-text-muted)]">
                                                {vipPerPerson > 0 ? t("vip_fast_track") : t("basic_fast_track")}
                                            </span>
                                            <span className="font-[family-name:var(--font-family-mono)] text-sm tabular-nums text-[var(--color-text-primary)]">
                                                +{formatUsd(vipPerPerson > 0 ? vipPerPerson : basicPerPerson)}
                                            </span>
                                        </div>
                                    </m.div>
                                )}
                            </AnimatePresence>

                            <div className="mt-3 flex items-center justify-between gap-4 border-t border-[var(--color-border)] pt-3">
                                <span className="text-sm text-[var(--color-text-muted)]">
                                    {t("applicants")}
                                </span>
                                <span className="font-[family-name:var(--font-family-mono)] text-sm tabular-nums text-[var(--color-text-secondary)]">
                                    &times; {applicantCount}{" "}
                                    {applicantCount === 1 ? t("person") : t("people")}
                                </span>
                            </div>
                        </div>
                    </m.div>
                )}
            </AnimatePresence>

            {/* ── Total footer ── */}
            <div
                className={cn(
                    "border-t border-[var(--color-border-strong)] px-6",
                    isMobile ? "py-3" : "py-5",
                )}
            >
                <div className="flex w-full items-center justify-between">
                    <span className="font-body text-sm font-semibold uppercase tracking-widest text-[var(--color-text-secondary)]">
                        {t("total")}
                    </span>
                    <span className="font-family-mono text-2xl font-bold tabular-nums text-[var(--color-primary)]">
                        <PriceCounter value={total} format={true} className="text-3xl font-extrabold tracking-tight" />
                    </span>
                </div>
            </div>

            {/* Render children (e.g. Next Button) inside the Order Summary */}
            {children && (
                <div className="p-6 pt-1">
                    {children}
                </div>
            )}
        </div>
    );
}
