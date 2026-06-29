"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { ExemptionResult } from "@/types/api";
import { getCountryRules } from "./constants";

interface EligibilityResultViewProps {
    result: "eligible" | "ineligible";
    nationalityCode: string;
    exemption: ExemptionResult | null;
}

/**
 * Giao diện chi tiết hiển thị kết quả kiểm tra điều kiện E-Visa (Tài liệu cần thiết, Lệ phí, Thời gian xử lý).
 * TẠI SAO: Đóng gói luồng hiển thị kết quả phức tạp giúp giữ cho SmartEligibilityWidget.tsx chính gọn gàng và dễ bảo trì.
 */
export function EligibilityResultView({
    result,
    nationalityCode,
    exemption,
}: EligibilityResultViewProps) {
    const t = useTranslations("HomePage.Eligibility");
    const tc = useTranslations("HomePage.EligibilityConstants");
    const details = nationalityCode ? getCountryRules(tc)[nationalityCode.toLowerCase()] : null;

    if (result === "eligible") {
        return (
            <div className="flex flex-col items-center gap-4 rounded-xl border border-(--color-secondary)/20 bg-(--color-secondary-subtle) p-6 text-center">
                <CheckCircle2
                    className="h-8 w-8 text-(--color-secondary) mb-1"
                    aria-hidden="true"
                />
                <p className="section-subtitle !text-xl">
                    {t("qualify_title")}
                </p>

                {/* Detailed Information Grid */}
                <div className="hidden sm:grid grid-cols-2 gap-4 w-full text-left my-2 text-sm border-y border-(--color-border) py-4 bg-white/40 dark:bg-black/30 dark:border-white/5 px-4 rounded-xl">
                    <div>
                        <span className="text-(--color-text-muted) font-semibold block uppercase tracking-wider text-sm mb-1">{t("visa_type")}</span>
                        <span className="font-bold text-(--color-text-primary)">{details?.status || t("details_status")}</span>
                    </div>
                    <div>
                        <span className="text-(--color-text-muted) font-semibold block uppercase tracking-wider text-sm mb-1">{t("max_duration")}</span>
                        <span className="font-bold text-(--color-text-primary)">{details?.stay || t("details_stay")}</span>
                    </div>
                    <div className="mt-2">
                        <span className="text-(--color-text-muted) font-semibold block uppercase tracking-wider text-sm mb-1">{t("stamping_fee")}</span>
                        <span className="font-bold text-(--color-text-primary)">{details?.fee || t("details_fee")}</span>
                    </div>
                    <div className="mt-2">
                        <span className="text-(--color-text-muted) font-semibold block uppercase tracking-wider text-sm mb-1">{t("processing_speed")}</span>
                        <span className="font-bold text-(--color-text-primary)">{details?.processing || t("details_processing")}</span>
                    </div>
                </div>

                {/* Requirements Checklist */}
                <div className="hidden sm:block w-full text-left bg-white/60 dark:bg-white/4 p-4 rounded-xl border border-(--color-border) dark:border-white/10">
                    <h4 className="section-label !text-sm dark:text-(--color-primary-light) mb-2.5">
                        {t("req_docs")}
                    </h4>
                    <ul className="text-sm text-(--color-text-secondary) font-body space-y-2">
                        {(details?.requirements || [
                            t("req_1"),
                            t("req_2"),
                            t("req_3"),
                            t("req_4")
                        ]).map((req, index) => (
                            <li key={index} className="flex items-start gap-2">
                                <span className="size-1.5 rounded-full bg-(--color-primary) shrink-0 mt-1.5" />
                                <span>{req}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Note / Advisory */}
                {details?.note && (
                    <p className="hidden sm:block text-sm text-stone-500 dark:text-stone-400 text-left leading-relaxed border-l-2 border-(--color-primary) pl-3 italic w-full">
                        <strong>{t("advisory")}:</strong> {details.note}
                    </p>
                )}

                {exemption?.exemption_days ? (
                    <p className="hidden sm:block text-sm text-(--color-text-secondary) font-body mt-1">
                        {t("visa_exemption_1")}{" "}
                        <strong className="text-(--color-secondary)">{exemption.exemption_days}</strong>{" "}
                        {t("visa_exemption_2")}
                    </p>
                ) : null}
                {exemption?.notes && !details?.note ? (
                    <p className="hidden sm:block text-sm text-(--color-text-secondary) font-body italic">
                        {exemption.notes}
                    </p>
                ) : null}

                <Button asChild size="lg" className="rounded-full bg-(--color-secondary) hover:bg-(--color-secondary-light) text-white dark:text-black shadow-sm hover:shadow transition-shadow w-full sm:w-auto mt-2">
                    <Link href="/apply">{t("apply_evisa_now")}</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-(--color-primary)/25 bg-(--color-primary-subtle) p-6 text-center">
            <AlertCircle
                className="h-8 w-8 text-(--color-primary)"
                aria-hidden="true"
            />
            <p className="section-subtitle !text-lg">
                {t("alt_options_req")}
            </p>
            <p className="hidden sm:block text-sm text-(--color-text-secondary) font-body">
                {t("not_eligible_desc")}
            </p>
            {exemption?.notes ? (
                <p className="text-sm text-(--color-text-secondary) font-body italic">
                    {exemption.notes}
                </p>
            ) : null}
            <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-full border-(--color-primary) text-(--color-primary) hover:bg-(--color-primary-subtle) transition-all"
            >
                <Link href="/contact-us">{t("contact_support")}</Link>
            </Button>
        </div>
    );
}
