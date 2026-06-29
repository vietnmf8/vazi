"use client";

import { useState, useEffect, useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Download, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { checkStatus } from "@/lib/api/application.api";
import { ApiClientError } from "@/lib/api-client";
import { formatUsd, formatVisaTypeLabel, formatVisaCategoryLabel } from "@/lib/enum-mappers";
import { cn } from "@/lib/utils";
import type { ApplicationStatus, ApplicationStatusResult } from "@/types/api";
import { AnimatePresence, m } from "framer-motion";

import { useTranslations } from "next-intl";

function statusColorClasses(status: ApplicationStatus): string {
    if (status === "COMPLETED")
        return "text-(--color-success) bg-[rgba(52,211,153,0.12)] border-[rgba(52,211,153,0.25)]";
    if (status === "PROCESSING" || status === "PAID")
        return "text-(--color-primary) bg-(--color-primary-subtle) border-[rgba(200,150,90,0.25)]";
    return "text-(--color-text-secondary) bg-(--color-surface-3) border-(--color-border)";
}

/**
 * Form tra cứu trạng thái đơn — GET /applications/status.
 * Redesigned: Modern 2026 Travel dark theme.
 */
export function CheckStatusForm() {
    const t = useTranslations("CheckStatusForm");

    const checkStatusSchema = z.object({
        bookingNumber: z
            .string()
            .min(1, t("errors.booking_required"))
            .regex(/^VN-\d{8}-[A-Z0-9]{5}$/, t("errors.booking_invalid")),
        email: z.string().email(t("errors.email_invalid")),
    });

    type CheckStatusFormValues = z.infer<typeof checkStatusSchema>;

    const [result, setResult] = useState<ApplicationStatusResult | null>(null);
    const [submittedBooking, setSubmittedBooking] = useState<string>("");
    const [notFound, setNotFound] = useState(false);
    const [networkError, setNetworkError] = useState(false);
    const [showSpinner, setShowSpinner] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<CheckStatusFormValues>({
        resolver: zodResolver(checkStatusSchema),
        defaultValues: { bookingNumber: "", email: "" },
    });

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (isSubmitting) {
            timer = setTimeout(() => setShowSpinner(true), 300);
        } else {
            timer = setTimeout(() => setShowSpinner(false), 0);
        }
        return () => clearTimeout(timer);
    }, [isSubmitting]);

    const onSubmit = async (data: CheckStatusFormValues) => {
        setSubmittedBooking(data.bookingNumber.trim());

        try {
            const statusResult = await checkStatus(
                data.bookingNumber.trim(),
                data.email.trim(),
            );
            setResult(statusResult);
            setNotFound(false);
            setNetworkError(false);
        } catch (err) {
            setResult(null);
            if (err instanceof ApiClientError && err.status === 404) {
                setNotFound(true);
                setNetworkError(false);
                return;
            }
            if (err instanceof TypeError) {
                setNetworkError(true);
                setNotFound(false);
                return;
            }
            if (err instanceof ApiClientError && err.status === 400) {
                // If it's a validation error from server but slipped through client Zod somehow
                setNotFound(true); 
                setNetworkError(false);
                return;
            }
            if (err instanceof ApiClientError) {
                setNotFound(true);
                setNetworkError(false);
                return;
            }
            setNetworkError(true);
            setNotFound(false);
        } finally {
            setTimeout(() => {
                containerRef.current?.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                });
            }, 200);
        }
    };

    return (
        <div ref={containerRef} data-ai-target="check_status_form">
            <div className="mb-6">
                <p className="section-label mb-2">
                    {t("lookup_title")}
                </p>
                <p className="text-(--color-text-secondary) leading-relaxed">
                    {t("lookup_desc")}
                </p>
                <p className="mt-2 text-xs text-(--color-text-muted)">
                    {t("booking_format")}{" "}
                    <code className="font-family-mono text-(--color-primary) text-xs bg-(--color-primary-subtle) px-1.5 py-0.5 rounded">
                        VN-YYYYMMDD-XXXXX
                    </code>
                </p>
            </div>

            <form
                onSubmit={handleSubmit(onSubmit)}
                className="mb-6 space-y-6 rounded-xl border border-(--color-border-strong) bg-(--color-surface-2) p-8"
                data-ai-id="check-status-form"
                data-ai-desc="Form tra cứu trạng thái đơn E-Visa. Yêu cầu nhập Booking Number (Mã đặt chỗ) và Email"
                noValidate
            >
                <div>
                    <label
                        htmlFor="bookingNumber"
                        className="mb-2 block text-sm font-medium text-(--color-text-primary)"
                    >
                        {t("booking_number")}
                    </label>
                    <Input
                        id="bookingNumber"
                        placeholder={t("booking_placeholder")}
                        error={!!errors.bookingNumber}
                        icon={<Search className="h-4 w-4" aria-hidden />}
                        aria-describedby={
                            errors.bookingNumber
                                ? "bookingNumber-error"
                                : undefined
                        }
                        className="font-family-mono bg-(--color-surface-1) border border-(--color-border-strong) rounded-sm py-3 pr-4 pl-11 text-base text-(--color-text-primary) placeholder:text-(--color-text-muted) focus:border-(--color-primary) focus:shadow-[0_0_0_3px_rgba(200,150,90,0.15)] focus:outline-none transition-all duration-200"
                        {...register("bookingNumber")}
                    />
                    <AnimatePresence mode="wait">
                        {errors.bookingNumber && (
                            <m.div
                                key="bookingNumber-error"
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <p
                                    id="bookingNumber-error"
                                    className="mt-2 text-sm text-(--color-error)"
                                    role="alert"
                                >
                                    {errors.bookingNumber.message}
                                </p>
                            </m.div>
                        )}
                    </AnimatePresence>
                </div>

                <div>
                    <label
                        htmlFor="email"
                        className="mb-2 block text-sm font-medium text-(--color-text-primary)"
                    >
                        {t("email")}
                    </label>
                    <Input
                        id="email"
                        type="email"
                        placeholder={t("email_placeholder")}
                        error={!!errors.email}
                        aria-describedby={
                            errors.email ? "email-error" : undefined
                        }
                        className="bg-(--color-surface-1) border border-(--color-border-strong) rounded-sm px-4 py-3 text-base text-(--color-text-primary) placeholder:text-(--color-text-muted) focus:border-(--color-primary) focus:shadow-[0_0_0_3px_rgba(200,150,90,0.15)] focus:outline-none transition-all duration-200"
                        {...register("email")}
                    />
                    <AnimatePresence mode="wait">
                        {errors.email && (
                            <m.div
                                key="email-error"
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <p
                                    id="email-error"
                                    className="mt-2 text-sm text-(--color-error)"
                                    role="alert"
                                >
                                    {errors.email.message}
                                </p>
                            </m.div>
                        )}
                    </AnimatePresence>
                </div>

                <Button
                    type="submit"
                    isLoading={showSpinner}
                    className="w-full sm:w-auto"
                    data-ai-element="check_status_submit"
                >
                    {t("check_status_btn")}
                </Button>
            </form>

            <AnimatePresence mode="wait">
                {networkError && (
                    <m.div
                        key="network-error"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div
                            className={cn(
                                "mt-6 rounded-md border border-(--color-error)/40 bg-(--color-error)/8 px-5 py-4 transition-opacity duration-300",
                                showSpinner && "opacity-50 pointer-events-none"
                            )}
                            role="alert"
                        >
                            <p className="text-sm text-(--color-error)">
                                {t("network_error")}
                            </p>
                        </div>
                    </m.div>
                )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
                {notFound && !networkError && (
                    <m.div
                        key="not-found"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div
                            className={cn(
                                "mt-6 rounded-md border border-(--color-error)/40 bg-(--color-error)/8 px-5 py-4 transition-opacity duration-300",
                                showSpinner && "opacity-50 pointer-events-none"
                            )}
                            role="alert"
                        >
                            <p className="text-sm text-(--color-error)">
                                {t("not_found")}
                            </p>
                        </div>
                    </m.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {result && (
                    <m.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div
                            className={cn(
                                "mt-6 rounded-xl border border-(--color-border-strong) bg-(--color-surface-2) overflow-hidden transition-opacity duration-300",
                                showSpinner && "opacity-50 pointer-events-none"
                            )}
                            aria-live="polite"
                        >
                            <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-5 border-b border-(--color-border)">
                        <h2 className="text-base font-semibold text-(--color-text-primary) font-body">
                            {t("status_title")}
                        </h2>
                        <span
                            className={`inline-flex items-center rounded-(--radius-full) border px-3 py-1 text-xs font-bold uppercase tracking-wide ${statusColorClasses(result.status)}`}
                        >
                            {result.status}
                        </span>
                    </div>
                    <div className="px-6 py-5 space-y-4">
                        <dl className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <dt className="text-xs font-medium text-(--color-text-muted) uppercase tracking-wide mb-1">
                                    {t("booking_number")}
                                </dt>
                                <dd className="font-family-mono text-sm font-medium text-(--color-text-primary)">
                                    {submittedBooking}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs font-medium text-(--color-text-muted) uppercase tracking-wide mb-1">
                                    {t("visa_type")}
                                </dt>
                                <dd className="text-sm font-medium text-(--color-text-primary)">
                                    {formatVisaTypeLabel(result.visa_type)}{" "}
                                    —{" "}
                                    {formatVisaCategoryLabel(
                                        result.visa_category,
                                        result.extra_services
                                    )}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs font-medium text-(--color-text-muted) uppercase tracking-wide mb-1">
                                    {t("arrival_date")}
                                </dt>
                                <dd className="text-sm font-medium text-(--color-text-primary)">
                                    {result.arrival_date}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs font-medium text-(--color-text-muted) uppercase tracking-wide mb-1">
                                    {t("applicants")}
                                </dt>
                                <dd className="text-sm font-medium text-(--color-text-primary)">
                                    {result.applicant_count}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs font-medium text-(--color-text-muted) uppercase tracking-wide mb-1">
                                    {t("total_amount")}
                                </dt>
                                <dd className="font-family-mono text-sm font-bold text-(--color-primary) tabular-nums">
                                    {formatUsd(result.total_amount)}
                                </dd>
                            </div>
                        </dl>

                        {result.status === "COMPLETED" &&
                            result.download_url && (
                                <Button
                                    asChild
                                    className="mt-2"
                                    data-ai-element="check_status_download"
                                >
                                    <a
                                        href={`/api/download-visa?url=${encodeURIComponent(result.download_url)}&filename=${encodeURIComponent(`Vietnam-Evisa-${result.application_code || submittedBooking}.pdf`)}`}
                                        download={`Vietnam-Evisa-${result.application_code || submittedBooking}.pdf`}
                                        aria-label="Download approved visa document"
                                    >
                                        <Download
                                            className="mr-2 h-4 w-4"
                                            aria-hidden
                                        />
                                        {t("download_visa")}
                                    </a>
                                </Button>
                            )}
                    </div>
                        </div>
                    </m.div>
                )}
            </AnimatePresence>
        </div>
    );
}
