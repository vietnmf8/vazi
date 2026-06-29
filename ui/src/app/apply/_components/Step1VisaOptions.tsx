"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { startOfDay } from "date-fns";
import { Controller, useForm } from "react-hook-form";
import { Button } from "@/components/ui/Button";
import { DatePicker } from "@/components/ui/DatePicker";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/Select";
import { Typography } from "@/components/ui/Typography";
import { FormField } from "./FormField";
import {
    Step1Form,
    type Step1FormValues,
    type visaCategoryValues,
} from "./applySchemas";
import {
    EVISA_CATEGORIES,
    PORT_OPTIONS,
    PURPOSE_OPTIONS,
    VOA_CATEGORIES,
} from "./priceCalculator";
import { scrollToFirstError } from "./scrollToFirstError";
import type { Port } from "@/types/api";
import type { PricingConfigData } from "./priceCalculator";

// Import các sub-components được phân rã
import { ProcessingTimeSelector } from "./ProcessingTimeSelector";
import { useStep1Logic } from "./hooks/useStep1Logic";
import { useTranslations } from "next-intl";
import { useAgentStore } from "@/stores/agentStore";
import { AiContext } from "@/components/features/chat/AiContext";

export interface Step1VisaOptionsProps {
    defaultValues?: Partial<Step1FormValues>;
    /** Cửa khẩu từ API — fallback mock nếu chưa load */
    ports?: Port[];
    portsLoading?: boolean;
    onNext: (data: Step1FormValues) => void;
    onChange?: (data: Step1FormValues) => void;
    pricingConfig?: PricingConfigData | null;
}

/**
 * Bước 1 - Chọn loại visa, cửa khẩu nhập cảnh, số lượng người đăng ký và các dịch vụ bổ trợ.
 * TẠI SAO: Đã được refactor phân rã danh sách chọn Processing Time và Extra Services ra các component riêng giúp file Step1.tsx giảm từ 597 dòng xuống còn ~250 dòng, cực kỳ gọn gàng và dễ đọc.
 */
export function Step1VisaOptions({
    defaultValues,
    ports,
    portsLoading = false,
    onNext,
    onChange,
    pricingConfig,
}: Step1VisaOptionsProps) {
    const portOptions = PORT_OPTIONS;

    const {
        form: { control, handleSubmit, trigger, formState: { errors, isSubmitted }, setValue },
        today,
        openDropdown,
        setOpenDropdown,
        categoryOptions,
        getSuccessMessage,
        getFieldError,
    } = useStep1Logic({ defaultValues, onChange, pricingConfig });

    const t = useTranslations("ApplyPage.Step1");


    useEffect(() => {
        const handleAiFill = (e: CustomEvent<{target: string, fieldName: string, value: string}>) => {
            const { target, fieldName, value } = e.detail;
            if (target === "step1_form") {
                
                // Parse date if it's arrival_date
                if (fieldName === "arrival_date" && value) {
                    setValue("arrival_date", value, { shouldValidate: true, shouldDirty: true });
                } else if (fieldName === "applicant_count") {
                    setValue("applicant_count", Number(value), { shouldValidate: true, shouldDirty: true });
                } else if (fieldName === "vip_fast_track" || fieldName === "basic_fast_track") {
                    setValue(fieldName as any, value === "true", { shouldValidate: true, shouldDirty: true });
                } else if (fieldName === "visa_category" || fieldName === "processing_time" || fieldName === "visa_type" || fieldName === "purpose_of_visit") {
                    let val = value.toLowerCase();
                    setValue(fieldName as keyof Step1FormValues, val as any, { shouldValidate: true, shouldDirty: true });
                } else if (fieldName === "port_of_entry") {
                    setValue(fieldName as keyof Step1FormValues, value.toUpperCase() as any, { shouldValidate: true, shouldDirty: true });
                } else {
                    setValue(fieldName as keyof Step1FormValues, value as any, { shouldValidate: true, shouldDirty: true });
                }
            }
        };

        window.addEventListener("ai_fill_form", handleAiFill as EventListener);
        return () => {
            window.removeEventListener("ai_fill_form", handleAiFill as EventListener);
        };
    }, [setValue]);

    const aiSchema = useMemo(() => ({
        form_name: "step1_form",
        fields: {
            visa_type: [
                { code: "evisa", name: t("fields.evisa") },
                { code: "voa", name: t("fields.voa") }
            ],
            visa_category: categoryOptions.map(c => ({ code: c.value, name: t("cat_" + c.value) })),
            port_of_entry: ports ? ports.map(p => ({ code: p.code, name: p.name })) : PORT_OPTIONS.map(p => ({ code: p.value, name: t.has(("port_" + p.value.toLowerCase()) as any) ? t(("port_" + p.value.toLowerCase()) as any) : p.label })),
            purpose_of_visit: PURPOSE_OPTIONS.map(p => ({ code: p.value, name: t("purpose_" + p.value) })),
            processing_time: [
                { code: "normal_7d", name: "Bình thường / Normal (7 Days)" },
                { code: "urgent_4d", name: "Khẩn cấp / Urgent (4 Days)" },
                { code: "urgent_2d", name: "Rất khẩn / Super Urgent (2 Days)" },
                { code: "urgent_1d", name: "Hỏa tốc / Express (1 Day)" },
                { code: "urgent_4h", name: "Hỏa tốc / Express (4 Hours)" },
                { code: "urgent_2h", name: "Hỏa tốc / Express (2 Hours)" },
                { code: "last_minute", name: "Cấp bách / Last Minute (Weekend/Holiday)" }
            ],
        }
    }), [ports]);

    return (
        <form
            id="step1-form"
            data-ai-id="apply-form-step-1"
            data-ai-type="container"
            data-ai-desc="Form Bước 1: Khởi tạo hồ sơ, chọn loại Visa, cửa khẩu, số người và thời gian xử lý hồ sơ"
            onSubmit={handleSubmit(onNext, (errs) => requestAnimationFrame(() => scrollToFirstError(errs, isSubmitted ? 50 : 300)))}
            className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-300"
            noValidate
        >
            <AiContext schema={aiSchema} />
            {/* Tiêu đề bước */}
            <div className="space-y-2">
                <h2 className="section-title mb-4 text-left">
                    {t("title")}
                </h2>
                <Typography
                    variant="body"
                    className="body-text text-left"
                >
                    {t("desc")}
                </Typography>
            </div>

            {/* Lưới form chính */}
            <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface-1)] p-6 md:p-8">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <FormField
                        label={t("fields.visa_type")}
                        error={getFieldError("visa_type")}
                        successMessage={getSuccessMessage("visa_type", t("fields.visa_type_success"))}
                        fieldName="visa_type"
                        badgeDelay={0}
                    >
                        <Controller
                            name="visa_type"
                            control={control}
                            render={({ field }) => (
                                <Select
                                    open={openDropdown === "visa_type"}
                                    onOpenChange={(isOpen) => setOpenDropdown(isOpen ? "visa_type" : null)}
                                    value={field.value}
                                    onValueChange={(v) =>
                                        field.onChange(
                                            v as Step1FormValues["visa_type"],
                                        )
                                    }
                                >
                                    <SelectTrigger
                                        data-ai-element="apply_step1_visa_type"
                                        aria-invalid={
                                            errors.visa_type ? "true" : "false"
                                        }
                                    >
                                        <SelectValue
                                            placeholder={
                                                <span>{t("fields.select_type")}</span>
                                            }
                                        />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="evisa">
                                            <span>
                                                {t("fields.evisa")}
                                            </span>
                                        </SelectItem>
                                        <SelectItem value="voa">
                                            <span>
                                                {t("fields.voa")}
                                            </span>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            )}
                        />
                    </FormField>

                    <FormField
                        label={t("fields.visa_category")}
                        error={getFieldError("visa_category")}
                        successMessage={getSuccessMessage("visa_category", t("fields.visa_category_success"))}
                        fieldName="visa_category"
                        badgeDelay={100}
                    >
                        <Controller
                            name="visa_category"
                            control={control}
                            render={({ field }) => (
                                <Select
                                    open={openDropdown === "visa_category"}
                                    onOpenChange={(isOpen) => setOpenDropdown(isOpen ? "visa_category" : null)}
                                    value={field.value}
                                    onValueChange={field.onChange}
                                >
                                    <SelectTrigger
                                        data-ai-element="apply_step1_visa_category"
                                        aria-invalid={
                                            errors.visa_category
                                                ? "true"
                                                : "false"
                                        }
                                    >
                                        <SelectValue
                                            placeholder={
                                                <span>{t("fields.select_category")}</span>
                                            }
                                        />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categoryOptions.map((opt) => (
                                            <SelectItem
                                                key={opt.value}
                                                value={opt.value}
                                            >
                                                <span>
                                                    {t("cat_" + opt.value)} — {opt.price}
                                                    /person
                                                </span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        />
                    </FormField>

                    <FormField
                        label={t("fields.applicant_count")}
                        error={getFieldError("applicant_count")}
                        successMessage={getSuccessMessage("applicant_count", t("fields.applicant_count_success"))}
                        fieldName="applicant_count"
                        badgeDelay={200}
                    >
                        <Controller
                            name="applicant_count"
                            control={control}
                            render={({ field }) => (
                                <Select
                                    open={openDropdown === "applicant_count"}
                                    onOpenChange={(isOpen) => setOpenDropdown(isOpen ? "applicant_count" : null)}
                                    value={String(field.value)}
                                    onValueChange={(v) =>
                                        field.onChange(Number(v))
                                    }
                                >
                                    <SelectTrigger
                                        data-ai-element="apply_step1_applicant_count"
                                        aria-invalid={
                                            errors.applicant_count
                                                ? "true"
                                                : "false"
                                        }
                                    >
                                        <SelectValue
                                            placeholder={
                                                <span>{t("fields.select_count")}</span>
                                            }
                                        />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {[1, 2, 3, 4, 5].map((n) => (
                                            <SelectItem
                                                key={n}
                                                value={String(n)}
                                            >
                                                <span>
                                                    {n}{" "}
                                                    {n === 1
                                                        ? t("fields.person")
                                                        : t("fields.people")}
                                                </span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        />
                    </FormField>

                    <FormField
                        label={t("fields.arrival_date")}
                        htmlFor="arrival_date"
                        error={getFieldError("arrival_date")}
                        successMessage={getSuccessMessage("arrival_date", t("fields.arrival_date_success"))}
                        required
                        fieldName="arrival_date"
                    >
                        <Controller
                            name="arrival_date"
                            control={control}
                            render={({ field }) => (
                                <DatePicker
                                    id="arrival_date"
                                    open={openDropdown === "arrival_date"}
                                    onOpenChange={(isOpen) => setOpenDropdown(isOpen ? "arrival_date" : null)}
                                    value={field.value}
                                    onChange={(date) => {
                                        field.onChange(date);
                                        void trigger("arrival_date");
                                    }}
                                    fromDate={today}
                                    placeholder={t("fields.select_date")}
                                    error={Boolean(getFieldError("arrival_date"))}
                                />
                            )}
                        />
                    </FormField>

                    <FormField
                        label={t("fields.port_of_entry")}
                        error={getFieldError("port_of_entry")}
                        successMessage={getSuccessMessage("port_of_entry", t("fields.port_of_entry_success"))}
                        required
                        fieldName="port_of_entry"
                        className="md:col-span-2"
                    >
                        <Controller
                            name="port_of_entry"
                            control={control}
                            render={({ field }) => (
                                <Select
                                    open={openDropdown === "port_of_entry"}
                                    onOpenChange={(isOpen) => setOpenDropdown(isOpen ? "port_of_entry" : null)}
                                    value={field.value}
                                    onValueChange={field.onChange}
                                    disabled={portsLoading}
                                >
                                    <SelectTrigger
                                        data-ai-element="apply_step1_port_of_entry"
                                        aria-invalid={
                                            errors.port_of_entry
                                                ? "true"
                                                : "false"
                                        }
                                    >
                                        <SelectValue
                                            placeholder={
                                                <span>
                                                    {portsLoading
                                                        ? t("fields.loading_ports")
                                                        : t("fields.select_port")}
                                                </span>
                                            }
                                        />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ports && ports.length > 0 ? (
                                            ports.map((p) => (
                                                <SelectItem key={p.code} value={p.code}>
                                                    <span>{p.name}</span>
                                                </SelectItem>
                                            ))
                                        ) : (
                                            portOptions.map((port) => (
                                                <SelectItem
                                                    key={port.value}
                                                    value={port.value}
                                                >
                                                    <span>{t.has(("port_" + port.value.toLowerCase()) as any) ? t(("port_" + port.value.toLowerCase()) as any) : port.label}</span>
                                                </SelectItem>
                                            ))
                                        )}
                                    </SelectContent>
                                </Select>
                            )}
                        />
                    </FormField>

                    <FormField
                        label={t("fields.purpose")}
                        error={getFieldError("purpose_of_visit")}
                        successMessage={getSuccessMessage("purpose_of_visit", t("fields.purpose_success"))}
                        required
                        fieldName="purpose_of_visit"
                        className="md:col-span-2"
                    >
                        <Controller
                            name="purpose_of_visit"
                            control={control}
                            render={({ field }) => (
                                <Select
                                    open={openDropdown === "purpose_of_visit"}
                                    onOpenChange={(isOpen) => setOpenDropdown(isOpen ? "purpose_of_visit" : null)}
                                    value={field.value}
                                    onValueChange={field.onChange}
                                >
                                    <SelectTrigger
                                        data-ai-element="apply_step1_purpose_of_visit"
                                        aria-invalid={
                                            errors.purpose_of_visit
                                                ? "true"
                                                : "false"
                                        }
                                    >
                                        <SelectValue
                                            placeholder={
                                                <span>{t("fields.select_purpose")}</span>
                                            }
                                        />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {PURPOSE_OPTIONS.map((p) => (
                                            <SelectItem
                                                key={p.value}
                                                value={p.value}
                                            >
                                                <span>{t("purpose_" + p.value)}</span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        />
                    </FormField>
                </div>
            </div>

            {/* Khối lựa chọn thời gian xử lý */}
            <ProcessingTimeSelector control={control} setValue={setValue} pricingConfig={pricingConfig} />
        </form>
    );
}
