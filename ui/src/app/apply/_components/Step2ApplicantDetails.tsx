"use client";

import { useEffect, useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { startOfDay, subYears } from "date-fns";
import { useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FormField } from "./FormField";
import {
    buildStep2Schema,
    type Step1FormValues,
    type Step2FormValues,
    type ApplicantFormValues,
} from "./applySchemas";
import { scrollToFirstError } from "./scrollToFirstError";
import type { Nationality } from "@/types/api";

// Import sub-component được phân rã
import { ApplicantCard } from "./ApplicantCard";
import { DatePicker } from "@/components/ui/DatePicker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { PORTS, PROCESSING_OPTIONS, type ProcessingSpeed } from "@/components/sections/quick-apply/constants";
import { Typography } from "@/components/ui/Typography";
import { ExtraServicesSelector } from "./ExtraServicesSelector";
import { useTranslations } from "next-intl";
import { useAgentStore } from "@/stores/agentStore";
import { AiContext } from "@/components/features/chat/AiContext";

export interface Step2ApplicantDetailsProps {
    step1: Step1FormValues;
    defaultValues?: Partial<Step2FormValues>;
    /** Quốc tịch ISO code từ API — fallback Input text nếu chưa có */
    nationalities?: Nationality[];
    onBack: () => void;
    onNext: (data: Step2FormValues) => void;
    onDraftChange?: (data: Step2FormValues) => void;
    onStep1Change?: (patch: Partial<Step1FormValues>) => void;
}

function createEmptyApplicant() {
    return {
        full_name: "",
        gender: "male" as const,
        nationality: "",
        date_of_birth: "",
        passport_number: "",
        passport_expiry_date: "",
        passport_image: "",
        /** Ảnh chân dung — bắt buộc với E-Visa, để trống với loại khác */
        portrait_image: "",
        flight_ticket: "",
    };
}

/**
 * Bước 2 - Nhập liệu thông tin cá nhân chi tiết (Họ tên, Ngày sinh, Passport) và tải ảnh giấy tờ cho từng khách đăng ký.
 * TẠI SAO: Đã được refactor tách toàn bộ form thông tin của từng Applicant ra component con ApplicantCard giúp tệp này cực kỳ gọn gàng (~130 dòng) và dễ quản lý.
 */
export function Step2ApplicantDetails({
    step1,
    defaultValues,
    nationalities,
    onBack,
    onNext,
    onDraftChange,
    onStep1Change,
}: Step2ApplicantDetailsProps) {
    "use no memo";
    const useNationalitySelect = Boolean(
        nationalities && nationalities.length > 0,
    );
    const vipEnabled = step1.vip_fast_track;
    const basicEnabled = step1.basic_fast_track || false;
    const vipOrBasicEnabled = vipEnabled || basicEnabled;
    // Ảnh chân dung chỉ bắt buộc với E-Visa (yêu cầu của Cổng điện tử Chính phủ VN)
    const isEvisa = step1.visa_type === "evisa";
    const today = useMemo(() => startOfDay(new Date()), []);
    const minBirthDate = useMemo(() => subYears(today, 100), [today]);
    const t = useTranslations("ApplyPage.Step2");
    const tStep1 = useTranslations("ApplyPage.Step1");
    
    // Khởi tạo schema dựa trên cài đặt VIP/Basic, ngày đến và loại visa (isEvisa)
    const schema = buildStep2Schema(vipOrBasicEnabled, step1.arrival_date || undefined, isEvisa);

    // TẠI SAO: Nếu defaultValues chứa mảng applicants từ một bản nháp cũ có số lượng hành khách ít hơn hoặc nhiều hơn, 
    // cú pháp spread (...defaultValues) sẽ ghi đè và làm mất mảng applicants có độ dài chuẩn (step1.applicant_count).
    // Do đó, ta cần chuẩn hóa độ dài của mảng applicants thông qua useMemo trước khi truyền vào useForm.
    const formApplicants = useMemo(() => {
        const targetLength = step1.applicant_count;
        const baseApplicants = defaultValues?.applicants || [];
        const result = [...baseApplicants];
        
        if (result.length > targetLength) {
            return result.slice(0, targetLength);
        } else if (result.length < targetLength) {
            const diff = targetLength - result.length;
            for (let i = 0; i < diff; i++) {
                result.push(createEmptyApplicant());
            }
        }
        return result;
    }, [defaultValues?.applicants, step1.applicant_count]);

    const {
        control,
        register,
        handleSubmit,
        setValue,
        trigger,
        formState: { errors, isSubmitted },
    } = useForm<Step2FormValues>({
        resolver: zodResolver(schema) as any, // TẠI SAO: buildStep2Schema extend runtime làm type không khớp tĩnh với Step2FormValues; cast là hợp lệ vì cả hai compatible tại runtime
        defaultValues: {
            email: "",
            phone: "",
            ...defaultValues,
            applicants: formApplicants as ApplicantFormValues[], // TẠI SAO: formApplicants đảm bảo độ dài applicants khớp step1.applicant_count
        },
        mode: "onChange",
    });

    useEffect(() => {
        const handleAiFill = (e: CustomEvent<{target: string, fieldName: string, value: string}>) => {
            const { target, fieldName, value } = e.detail;
            if (target === "step2_form") {

                if (fieldName === "email" || fieldName === "phone") {
                    setValue(fieldName, value, { shouldValidate: true, shouldDirty: true });
                } else if (fieldName.startsWith("applicants.")) {
                    // e.g. applicants.0.full_name
                    setValue(fieldName as any, value, { shouldValidate: true, shouldDirty: true });
                }
            }
        };

        window.addEventListener("ai_fill_form", handleAiFill as EventListener);
        return () => {
            window.removeEventListener("ai_fill_form", handleAiFill as EventListener);
        };
    }, [setValue]);

    const watchedValues = useWatch({ control });
    useEffect(() => {
        onDraftChange?.(watchedValues as Step2FormValues);
    }, [watchedValues, onDraftChange]);

    const aiSchema = useMemo(() => ({
        form_name: "step2_form",
        fields: {
            email: "email",
            phone: "phone number",
            "applicants.i.full_name": "text",
            "applicants.i.gender": ["male", "female", "other"],
            "applicants.i.nationality": nationalities ? nationalities.map(n => ({ code: n.code, name: n.name })) : [],
            "applicants.i.date_of_birth": "YYYY-MM-DD",
            "applicants.i.passport_number": "text",
            "applicants.i.passport_expiry_date": "YYYY-MM-DD",
        }
    }), [nationalities]);

    return (
        <form
            id="step2-form"
            onSubmit={handleSubmit(onNext, (errs) => requestAnimationFrame(() => scrollToFirstError(errs, isSubmitted ? 50 : 300)))}
            className="space-y-10 pb-24 md:pb-8 animate-in fade-in slide-in-from-bottom-4 duration-300"
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

            {/* Fast Track fields (if Standalone Fast Track) */}
            {step1.visa_category === "code_fasttrack" && onStep1Change && (
                <div className="rounded-[var(--radius-xl)] border border-[var(--color-border-strong)] bg-[var(--color-surface-1)] overflow-hidden">
                    <div className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-6 py-4">
                        <h3 className="font-body text-base font-semibold text-(--color-text-primary)">
                            {t("travel_processing_title")}
                        </h3>
                    </div>
                    <div className="p-6 md:p-8 grid grid-cols-1 gap-6 md:grid-cols-2">
                        <FormField label={t("arrival_date")} htmlFor="step1_arrival_date">
                            <DatePicker
                                id="step1_arrival_date"
                                value={step1.arrival_date}
                                onChange={(date) => onStep1Change({ arrival_date: date })}
                                fromDate={today}
                                placeholder={t("select_arrival_date")}
                            />
                        </FormField>
                        <FormField label={t("port_of_entry")} htmlFor="step1_port">
                            <Select
                                value={step1.port_of_entry}
                                onValueChange={(val) => onStep1Change({ port_of_entry: val })}
                            >
                                <SelectTrigger id="step1_port">
                                    <SelectValue placeholder={t("select_port")} />
                                </SelectTrigger>
                                <SelectContent>
                                    {PORTS.map((p) => (
                                        <SelectItem key={p.value} value={p.value}>
                                            {tStep1.has(("port_" + p.value.toLowerCase()) as any) 
                                                ? tStep1(("port_" + p.value.toLowerCase()) as any) 
                                                : p.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </FormField>
                    </div>
                </div>
            )}

            {/* Extra Services Selector */}
            {onStep1Change && (
                <ExtraServicesSelector 
                    vipEnabled={vipEnabled} 
                    basicEnabled={basicEnabled}
                    visaCategory={step1.visa_category}
                    onChange={(vip, basic) => onStep1Change({ vip_fast_track: vip, basic_fast_track: basic })} 
                />
            )}

            {/* Vòng lặp hiển thị card nhập liệu cho từng Applicant */}
            {Array.from({ length: step1.applicant_count }).map((_, index) => (
                <ApplicantCard
                    key={`applicant-${index}`}
                    index={index}
                    control={control}
                    register={register}
                    setValue={setValue}
                    trigger={trigger}
                    applicantErrors={errors.applicants?.[index]}
                    fastTrackEnabled={vipOrBasicEnabled}
                    isEvisa={isEvisa}
                    nationalities={nationalities}
                    useNationalitySelect={useNationalitySelect}
                    today={today}
                    minBirthDate={minBirthDate}
                    applicantCount={step1.applicant_count}
                />
            ))}

            {/* Thông tin liên hệ chung của đơn hàng */}
            <div className="rounded-[var(--radius-xl)] border border-[var(--color-border-strong)] bg-[var(--color-surface-1)] overflow-hidden">
                <div className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-6 py-4">
                    <h3 className="font-body text-base font-semibold text-(--color-text-primary)">
                        {t("contact_info_title")}
                    </h3>
                </div>
                <div className="p-6 md:p-8">
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <FormField
                            label={t("email")}
                            htmlFor="email"
                            error={errors.email?.message}
                            required
                            fieldName="email"
                        >
                            <Input
                                id="email"
                                type="email"
                                placeholder={t("email_placeholder")}
                                error={Boolean(errors.email)}
                                autoComplete="off"
                                {...register("email")}
                            />
                        </FormField>

                        <FormField
                            label={t("phone")}
                            htmlFor="phone"
                            error={errors.phone?.message}
                            required
                            fieldName="phone"
                        >
                            <Input
                                id="phone"
                                type="tel"
                                placeholder="+1 (555) 000-0000"
                                error={Boolean(errors.phone)}
                                autoComplete="off"
                                {...register("phone")}
                            />
                        </FormField>
                    </div>
                </div>
            </div>

            {/* Thanh điều hướng Back & Next */}
            <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:justify-between">
                {step1.visa_category !== "code_fasttrack" && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="lg"
                        onClick={onBack}
                        data-ai-element="apply_step2_back"
                    >
                        {t("back_btn")}
                    </Button>
                )}
            </div>
        </form>
    );
}
