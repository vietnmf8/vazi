"use client";
/* eslint-disable react-hooks/refs */

import * as React from "react";
import { useState, useRef, useCallback, useEffect } from "react";
import {
    Controller,
    type Control,
    type UseFormRegister,
    type UseFormSetValue,
    type UseFormTrigger,
    type FieldErrors,
} from "react-hook-form";
import toast from "react-hot-toast";
import { Input } from "@/components/ui/Input";
import { DatePicker } from "@/components/ui/DatePicker";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/Select";
import { FormField } from "./FormField";
import { ImageUploadZone } from "@/components/ui";
import { genderValues, type Step2FormValues } from "./applySchemas";
import type { Nationality, PassportFieldConfidence } from "@/types/api";
import { usePassportOCR } from "./hooks/usePassportOCR";
import { useTranslations } from "next-intl";
import { useLocalizedCountryName } from "@/hooks/useLocalizedCountryName";

interface ApplicantCardProps {
    index: number;
    control: Control<Step2FormValues>;
    register: UseFormRegister<Step2FormValues>;
    setValue: UseFormSetValue<Step2FormValues>;
    trigger: UseFormTrigger<Step2FormValues>;
    applicantErrors?: FieldErrors<Step2FormValues["applicants"][number]>;
    fastTrackEnabled: boolean;
    /** Khi true: hiển thị upload zone ảnh chân dung bắt buộc (yêu cầu E-Visa Chính phủ VN) */
    isEvisa?: boolean;
    nationalities?: Nationality[];
    useNationalitySelect: boolean;
    today: Date;
    minBirthDate: Date;
    applicantCount: number;
}

type FieldConfidenceMap = Partial<Record<
    "full_name" | "gender" | "nationality" | "date_of_birth" | "passport_number" | "passport_expiry_date",
    PassportFieldConfidence
>>;



function HologramOverlay({ visible }: { visible: boolean }) {
    return (
        <div
            className={`absolute inset-0 z-10 overflow-hidden transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0 pointer-events-none"}`}
            style={{ background: "rgba(10, 14, 13, 0.88)" }}
            aria-hidden
        >
            <div className="hologram-sweep" />
        </div>
    );
}

/**
 * Card hiển thị và nhập liệu thông tin cá nhân cho một khách đăng ký E-Visa (Applicant).
 * TẠI SAO: Đóng gói toàn bộ form nhập liệu chi tiết và upload passport của từng khách vào một component giúp giữ cho Step2ApplicantDetails.tsx cực kỳ tinh giản, dễ theo dõi cấu trúc.
 */
export const ApplicantCard = React.memo(function ApplicantCard({
    index,
    control,
    register,
    setValue,
    trigger,
    applicantErrors,
    fastTrackEnabled,
    isEvisa = false,
    nationalities,
    useNationalitySelect,
    today,
    minBirthDate,
    applicantCount,
}: ApplicantCardProps) {
    const { isExtracting, fieldConfidence, handlePassportUpload } = usePassportOCR({ index, setValue, nationalities });
    const t = useTranslations("ApplyPage.ApplicantCard");
    const tStep2 = useTranslations("ApplyPage.Step2");
    const { getLocalizedName, locale } = useLocalizedCountryName();

    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const debouncedTrigger = useCallback((fieldName: any) => {
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(() => {
            void trigger(fieldName);
        }, 150);
    }, [trigger]);

    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        };
    }, []);

    const sortedNationalities = React.useMemo(() => {
        if (!nationalities) return [];
        return [...nationalities].map(n => ({
            ...n,
            localizedName: getLocalizedName(n.code, n.name, (n as any).is_custom_name)
        })).sort((a, b) => a.localizedName.localeCompare(b.localizedName, locale));
    }, [nationalities, getLocalizedName, locale]);

    function confidenceClass(field: keyof typeof fieldConfidence): string {
        const c = fieldConfidence[field];
        if (!c) return "";
        return c === "high"
            ? "ring-1 ring-[var(--color-secondary)]/40 shadow-[0_0_8px_rgba(20,184,166,0.15)] rounded-[var(--radius)]"
            : "ring-1 ring-[var(--color-warning)] shadow-[0_0_8px_rgba(245,158,11,0.15)] rounded-[var(--radius)]";
    }

    function confidenceLabel(base: string, field: keyof typeof fieldConfidence): React.ReactNode {
        if (fieldConfidence[field] !== "low") return base;
        return (
            <>
                {base}
                <span className="ml-1 inline-flex items-center rounded px-1 py-0.5 text-[10px] font-semibold bg-[var(--color-warning)]/10 text-[var(--color-warning)]">
                    {t("verify_warning")}
                </span>
            </>
        );
    }

    return (
        <div className="rounded-[var(--radius-xl)] border border-[var(--color-border-strong)] bg-[var(--color-surface-1)] overflow-hidden">
            {/* Card header */}
            <div className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-6 py-4">
                <div className="flex items-center gap-3">
                    <span
                        className="flex size-8 items-center justify-center rounded-[var(--radius-full)] bg-[var(--color-primary-subtle)] font-[family-name:var(--font-family-mono)] text-sm font-semibold text-[var(--color-primary)]"
                        aria-hidden
                    >
                        {index + 1}
                    </span>
                    <h3 className="font-body text-base font-semibold text-(--color-text-primary)">
                        {t("applicant_number", { index: index + 1 })}{" "}
                        <span className="font-normal text-(--color-text-muted)">
                            {t("of", { total: applicantCount })}
                        </span>
                    </h3>
                </div>
            </div>

            {/* Card body */}
            <div className="relative space-y-6 p-6 md:p-8">
                {/* Upload tệp ảnh: Ảnh chân dung (E-Visa only) + Passport + Vé máy bay */}
                <div className="relative z-20 space-y-4">
                    {/* Hàng 1: Ảnh chân dung | Passport */}
                    <div className={`grid gap-4 ${isEvisa ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"}`}>
                        {/* Ảnh chân dung 4×6 — luôn hiển khi E-Visa */}
                        {(isEvisa) && (
                            <Controller
                                name={`applicants.${index}.portrait_image`}
                                control={control}
                                render={({ field: f, fieldState }) => (
                                    <ImageUploadZone
                                        label={t("portrait_photo")}
                                        description={t("portrait_photo_desc")}
                                        value={f.value ?? ""}
                                        onChange={(url) => f.onChange(url ?? "")}
                                        error={fieldState.error?.message}
                                        mainText={tStep2("dropzone_click_drag")}
                                        dropText={tStep2("dropzone_drop")}
                                    />
                                )}
                            />
                        )}
                        {/* Ảnh Passport — luôn hiển */}
                        <Controller
                            name={`applicants.${index}.passport_image`}
                            control={control}
                            render={({ field: f, fieldState }) => (
                                <ImageUploadZone
                                    label={t("passport_data_page")}
                                    description={t("passport_data_desc")}
                                    value={f.value}
                                    onChange={async (url: string | null, file?: File, isBackgroundSuccess?: boolean) => {
                                        f.onChange(url);
                                        await handlePassportUpload(url, file, isBackgroundSuccess);
                                    }}
                                    error={fieldState.error?.message}
                                    mainText={tStep2("dropzone_click_drag")}
                                    dropText={tStep2("dropzone_drop")}
                                />
                            )}
                        />
                    </div>
                    {/* Hàng 2: Vé máy bay — full width, chỉ hiển thị nếu có Fast Track */}
                    {fastTrackEnabled && (
                        <Controller
                            name={`applicants.${index}.flight_ticket`}
                            control={control}
                            render={({ field: f, fieldState }) => (
                                <ImageUploadZone
                                    label={t("flight_ticket")}
                                    description={t("flight_ticket_desc")}
                                    value={f.value ?? ""}
                                    onChange={(url) => f.onChange(url ?? "")}
                                    error={fieldState.error?.message}
                                    mainText={tStep2("dropzone_click_drag")}
                                    dropText={tStep2("dropzone_drop")}
                                />
                            )}
                        />
                    )}
                </div>

                {/* Form section */}
                <div className="relative z-0">
                    {/* Phân ranh giới */}
                    <div className="h-px bg-[var(--color-border)]" />

                    {/* Các trường nhập liệu thông tin cá nhân */}
                    <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                        {/* Full Name */}
                        <FormField
                            label={confidenceLabel(t("full_name"), "full_name")}
                            htmlFor={`applicants-${index}-full_name`}
                            error={applicantErrors?.full_name?.message}
                            required
                            fieldName={`applicants.${index}.full_name`}
                        >
                            <div className={confidenceClass("full_name")}>
                                <Input
                                    id={`applicants-${index}-full_name`}
                                    placeholder={t("full_name_placeholder")}
                                    error={Boolean(applicantErrors?.full_name)}
                                    autoComplete="off"
                                    {...register(`applicants.${index}.full_name`, {
                                        onChange: () => debouncedTrigger(`applicants.${index}.full_name`),
                                    })}
                                />
                            </div>
                        </FormField>

                        {/* Gender */}
                        <FormField
                            label={confidenceLabel(t("gender"), "gender")}
                            htmlFor={`applicants-${index}-gender`}
                            error={applicantErrors?.gender?.message}
                            fieldName={`applicants.${index}.gender`}
                        >
                            <div className={confidenceClass("gender")}>
                                <Controller
                                    name={`applicants.${index}.gender`}
                                    control={control}
                                    render={({ field: f }) => (
                                        <Select
                                            value={f.value}
                                            onValueChange={f.onChange}
                                        >
                                            <SelectTrigger
                                                id={`applicants-${index}-gender`}
                                                aria-invalid={
                                                    applicantErrors?.gender ? "true" : "false"
                                                }
                                            >
                                                <SelectValue placeholder={<span>{t("select_gender")}</span>} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {genderValues.map((g) => (
                                                    <SelectItem key={g} value={g}>
                                                        <span>
                                                            {g.charAt(0).toUpperCase() + g.slice(1)}
                                                        </span>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </div>
                        </FormField>

                        {/* Nationality */}
                        <FormField
                            label={confidenceLabel(t("nationality"), "nationality")}
                            htmlFor={`applicants-${index}-nationality`}
                            error={applicantErrors?.nationality?.message}
                            required
                            fieldName={`applicants.${index}.nationality`}
                        >
                            {useNationalitySelect ? (
                                <div className={confidenceClass("nationality")}>
                                    <Controller
                                        name={`applicants.${index}.nationality`}
                                        control={control}
                                        render={({ field: f }) => (
                                            <Select
                                                value={f.value}
                                                onValueChange={f.onChange}
                                            >
                                                <SelectTrigger
                                                    id={`applicants-${index}-nationality`}
                                                    aria-invalid={
                                                        applicantErrors?.nationality ? "true" : "false"
                                                    }
                                                >
                                                    <SelectValue placeholder={<span>{t("select_nationality")}</span>} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {sortedNationalities.map((n) => (
                                                        <SelectItem key={n.code} value={n.code}>
                                                            <span>{n.localizedName}</span>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                </div>
                            ) : (
                                <div className={confidenceClass("nationality")}>
                                    <Input
                                        id={`applicants-${index}-nationality`}
                                        placeholder={t("nationality_placeholder")}
                                        error={Boolean(applicantErrors?.nationality)}
                                        {...register(`applicants.${index}.nationality`)}
                                    />
                                </div>
                            )}
                        </FormField>

                        {/* Date of Birth */}
                        <FormField
                            label={confidenceLabel(t("date_of_birth"), "date_of_birth")}
                            htmlFor={`applicants-${index}-date_of_birth`}
                            error={applicantErrors?.date_of_birth?.message}
                            required
                            fieldName={`applicants.${index}.date_of_birth`}
                        >
                            <div className={confidenceClass("date_of_birth")}>
                                <Controller
                                    name={`applicants.${index}.date_of_birth`}
                                    control={control}
                                    render={({ field }) => (
                                        <DatePicker
                                            id={`applicants-${index}-date_of_birth`}
                                            value={field.value}
                                            onChange={field.onChange}
                                            fromDate={minBirthDate}
                                            toDate={today}
                                            placeholder={t("select_date_of_birth")}
                                            error={Boolean(applicantErrors?.date_of_birth)}
                                        />
                                    )}
                                />
                            </div>
                        </FormField>

                        {/* Passport Number */}
                        <FormField
                            label={confidenceLabel(t("passport_number"), "passport_number")}
                            htmlFor={`applicants-${index}-passport_number`}
                            error={applicantErrors?.passport_number?.message}
                            required
                            fieldName={`applicants.${index}.passport_number`}
                        >
                            <div className={confidenceClass("passport_number")}>
                                <Input
                                    id={`applicants-${index}-passport_number`}
                                    placeholder={t("passport_number_placeholder")}
                                    error={Boolean(applicantErrors?.passport_number)}
                                    autoComplete="off"
                                    {...register(`applicants.${index}.passport_number`, {
                                        onChange: () => debouncedTrigger(`applicants.${index}.passport_number`),
                                    })}
                                />
                            </div>
                        </FormField>

                        {/* Passport Expiry Date */}
                        <FormField
                            label={confidenceLabel(t("passport_expiry_date"), "passport_expiry_date")}
                            htmlFor={`applicants-${index}-passport_expiry_date`}
                            error={applicantErrors?.passport_expiry_date?.message}
                            required
                            fieldName={`applicants.${index}.passport_expiry_date`}
                        >
                            <div className={confidenceClass("passport_expiry_date")}>
                                <Controller
                                    name={`applicants.${index}.passport_expiry_date`}
                                    control={control}
                                    render={({ field }) => (
                                        <DatePicker
                                            id={`applicants-${index}-passport_expiry_date`}
                                            value={field.value}
                                            onChange={field.onChange}
                                            fromDate={today}
                                            placeholder={t("select_expiry_date")}
                                            error={Boolean(applicantErrors?.passport_expiry_date)}
                                        />
                                    )}
                                />
                            </div>
                        </FormField>
                    </div>

                </div>

                {/* Hologram overlay — inset-0 phủ toàn card body kể cả padding, fade in/out */}
                <HologramOverlay visible={isExtracting} />
            </div>
        </div>
    );
});
