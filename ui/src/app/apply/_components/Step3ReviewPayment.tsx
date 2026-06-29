"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import type { Step1FormValues, Step2FormValues } from "./applySchemas";
import {
    PORT_OPTIONS,
    PURPOSE_OPTIONS,
    calculatePrice,
    formatUsd,
    getProcessingLabel,
    VISA_CATEGORY_LABELS,
    type PricingConfigData,
} from "./priceCalculator";
import type { PriceBreakdown as ApiPriceBreakdown } from "@/types/api";
import type { Port } from "@/types/api";

import { ReviewRow } from "./ReviewRow";
import ErrorCircleIcon from "@/assets/icons/ui/ErrorCircle.svg";
import { useTranslations } from "next-intl";

export interface Step3ReviewPaymentProps {
    step1: Step1FormValues;
    step2: Step2FormValues;
    apiPrice?: ApiPriceBreakdown | null;
    ports?: Port[];
    termsAccepted: boolean;
    onTermsChange: (v: boolean) => void;
    submitError?: string | null;
    onBack: () => void;
    pricingConfig?: PricingConfigData | null;
}

/**
 * Bước 3 — Soát xét thông tin, chấp thuận điều khoản.
 * Nút "Proceed to Payment" đã được chuyển vào sidebar Order Summary (page.tsx).
 */
export function Step3ReviewPayment({
    step1,
    step2,
    apiPrice,
    ports,
    termsAccepted,
    onTermsChange,
    submitError,
    onBack,
    pricingConfig,
}: Step3ReviewPaymentProps) {
    const t = useTranslations("ApplyPage.Step3");
    const tStep1 = useTranslations("ApplyPage.Step1");
    const localPrice = calculatePrice(step1, pricingConfig);

    const isStandaloneFastTrack = step1.visa_category === "code_fasttrack";
    const useApi = Boolean(apiPrice) && !isStandaloneFastTrack;
    const baseFee = useApi ? apiPrice!.base_fee_per_person : localPrice.baseFee;
    const processingSurcharge = useApi
        ? apiPrice!.processing_surcharge_per_person
        : localPrice.processingSurcharge;
    const vipPerPerson = localPrice.vipPerPerson;
    const basicPerPerson = localPrice.basicPerPerson;
    const applicantCount = useApi
        ? apiPrice!.applicant_count
        : localPrice.applicantCount;
    const total = useApi
        ? (baseFee + processingSurcharge + vipPerPerson + basicPerPerson) * applicantCount
        : localPrice.total;

    const portKey = `port_${step1.port_of_entry.toLowerCase()}`;
    const matchedPort = ports?.find((p) => p.code === step1.port_of_entry);
    const portLabel = tStep1.has(portKey as any) 
        ? tStep1(portKey as any) 
        : (matchedPort?.name || step1.port_of_entry);
    const purposeLabel = step1.purpose_of_visit ? tStep1("purpose_" + step1.purpose_of_visit as any) : "—";

    const formatDate = (iso: string) => {
        if (!iso) return "—";
        try {
            return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
            });
        } catch {
            return iso;
        }
    };

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Tiêu đề bước */}
            <div className="space-y-2">
                <h2 className="section-title text-left">
                    {t("title")}
                </h2>
                <p className="body-text-sm">
                    {t("desc")}
                </p>
            </div>

            {/* Bảng tóm tắt thông tin soát xét */}
            <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-2)] overflow-hidden">
                <div className="border-b border-[var(--color-border)] px-6 py-4">
                    <h3 className="section-label text-(--color-primary)">
                        {t("summary_title")}
                    </h3>
                </div>
                <div className="divide-y divide-[var(--color-border)] px-6 font-body">
                    <ReviewRow
                        label={t("visa_type")}
                        value={tStep1("cat_" + step1.visa_category as any)}
                    />
                    <ReviewRow
                        label={t("applicants")}
                        value={step2.applicants
                            .map((a) => a.full_name || "—")
                            .join(", ")}
                    />
                    <ReviewRow
                        label={t("arrival_date")}
                        value={formatDate(step1.arrival_date)}
                        mono
                    />
                    <ReviewRow label={t("port_of_entry")} value={portLabel} />
                    {step1.purpose_of_visit && (
                        <ReviewRow label={t("purpose")} value={purposeLabel} />
                    )}
                    <ReviewRow
                        label={t("processing_time")}
                        value={tStep1("processing_" + step1.processing_time + "_label")}
                    />
                    <ReviewRow
                        label={t("email")}
                        value={step2.email}
                        mono
                    />
                    <ReviewRow label={t("phone")} value={step2.phone} mono />
                    {step1.vip_fast_track && (
                        <ReviewRow
                            label={t("extra_services")}
                            value={t("vip_fast_track")}
                            badge="teal"
                        />
                    )}
                    {step1.basic_fast_track && (
                        <ReviewRow
                            label={t("extra_services")}
                            value={t("basic_fast_track")}
                            badge="teal"
                        />
                    )}
                </div>
            </div>

            {/* Hiển thị tổng tiền cho di động */}
            <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-6 py-5 lg:hidden">
                <div className="flex items-center justify-between">
                    <span className="font-body text-sm font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
                        {t("total_due")}
                    </span>
                    <span className="font-family-mono text-2xl font-bold tabular-nums text-[var(--color-primary)]">
                        {formatUsd(total)}
                    </span>
                </div>
            </div>

            {/* Đồng ý điều khoản dịch vụ */}
            <div className="flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-5">
                <input
                    type="checkbox"
                    id="terms"
                    checked={termsAccepted}
                    onChange={(e) => onTermsChange(e.target.checked)}
                    className="mt-0.5 size-4 accent-[var(--color-primary)] rounded border-[var(--color-border-strong)]"
                    aria-describedby="terms-desc"
                />
                <label
                    htmlFor="terms"
                    id="terms-desc"
                    className=" text-sm leading-relaxed text-(--color-text-secondary) font-body"
                >
                    {t("terms_prefix")}{" "}
                    <Link
                        href="/faqs"
                        className="text-[var(--color-primary-light)] underline underline-offset-2 hover:text-[var(--color-primary)] transition-all"
                    >
                        {t("terms_link")}
                    </Link>{" "}
                    {t("terms_suffix")}
                </label>
            </div>

            {/* Thông báo lỗi thanh toán — nhận từ page.tsx */}
            {submitError && (
                <p
                    className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-[rgba(248,113,113,0.3)] bg-[rgba(248,113,113,0.08)] px-4 py-3 text-sm text-[var(--color-error)]"
                    role="alert"
                >
                    <ErrorCircleIcon className="size-4 shrink-0" aria-hidden="true" />
                    {submitError}
                </p>
            )}

            {/* Back button — Proceed đã chuyển vào sidebar Order Summary */}
            <div className="pt-2">
                <Button
                    type="button"
                    variant="ghost"
                    size="lg"
                    onClick={onBack}
                    data-ai-element="apply_step3_back"
                >
                    {t("back_btn")}
                </Button>
            </div>
        </div>
    );
}
