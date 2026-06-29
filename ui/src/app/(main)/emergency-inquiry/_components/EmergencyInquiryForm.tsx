"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/Select";
import { DatePicker } from "@/components/ui/DatePicker";
import { submitContact } from "@/lib/api/support.api";
import { ApiClientError } from "@/lib/api-client";
import { useTranslations } from "next-intl";

const SUBJECT_OPTIONS = (t: any) => [
    { value: "urgent-travel", label: t("opt_urgent") },
    { value: "wrong-info", label: t("opt_wrong") },
    { value: "payment-urgent", label: t("opt_payment") },
    { value: "airport-issue", label: t("opt_airport") },
] as const;

const emergencySchema = z.object({
    fullName: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Enter a valid email address"),
    bookingNumber: z
        .string()
        .min(1, "Booking number is required for urgent cases"),
    travelDate: z.string().min(1, "Travel date is required"),
    subject: z.string().min(1, "Please select a subject"),
    message: z.string().min(10, "Message must be at least 10 characters"),
});

type EmergencyFormValues = z.infer<typeof emergencySchema>;

const inputClass =
    "bg-(--color-surface-1) border border-(--color-border-strong) rounded-sm px-4 py-3 text-base text-(--color-text-primary) placeholder:text-(--color-text-muted) focus:border-(--color-primary) focus:shadow-[0_0_0_3px_var(--color-primary-subtle)] focus:outline-none transition-all duration-200 w-full";

/**
 * Form khẩn cấp — ưu tiên xử lý, gửi ticket qua POST /support/contact.
 * Redesigned: amber urgency accent, Modern 2026 Travel dark theme.
 */
export function EmergencyInquiryForm() {
    const [submitted, setSubmitted] = useState(false);
    const [ticketId, setTicketId] = useState<string | null>(null);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const t = useTranslations("EmergencyInquiryPage");
    const options = SUBJECT_OPTIONS(t);

    const {
        register,
        handleSubmit,
        control,
        formState: { errors, isSubmitting },
        reset,
    } = useForm<EmergencyFormValues>({
        resolver: zodResolver(emergencySchema),
        defaultValues: {
            fullName: "",
            email: "",
            bookingNumber: "",
            travelDate: "",
            subject: "",
            message: "",
        },
    });

    const onSubmit = async (data: EmergencyFormValues) => {
        setSubmitError(null);
        const travelNote = `Travel date: ${data.travelDate}`;
        const body = `${data.message.trim()}\n\n${travelNote}`;

        try {
            const res = await submitContact({
                full_name: data.fullName.trim(),
                email: data.email.trim(),
                subject: `[URGENT] ${data.subject}`,
                message: body,
                booking_number: data.bookingNumber.trim(),
            });
            setTicketId(res.ticket_id);
            setSubmitted(true);
            reset();
        } catch (err) {
            if (err instanceof ApiClientError) {
                setSubmitError(err.message);
            } else {
                setSubmitError(t("form_error"));
            }
        }
    };

    if (submitted) {
        return (
            <div
                className="flex items-start gap-4 rounded-xl border border-(--color-success)/30 bg-[rgba(52,211,153,0.08)] p-8"
                role="status"
                aria-live="polite"
            >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[rgba(52,211,153,0.15)]">
                    <CheckCircle2
                        className="h-5 w-5 text-(--color-success)"
                        aria-hidden
                    />
                </div>
                <div>
                    <p className="text-lg font-semibold text-(--color-text-primary) font-family-heading">
                        {t("form_success_title")}
                    </p>
                    <p className="mt-2 text-sm text-(--color-text-secondary) leading-relaxed">
                        {t("form_success_desc1")}
                        {ticketId ? (
                            <>
                                {" "}
                                {t("form_success_ref")}{" "}
                                <strong className="text-(--color-text-primary) font-family-mono">
                                    {ticketId}
                                </strong>
                            </>
                        ) : null}
                    </p>
                    <Button
                        type="button"
                        variant="outline"
                        className="mt-5 rounded-(--radius-full) border-(--color-border-strong) text-(--color-text-primary) hover:border-(--color-primary)/50 transition-all"
                        onClick={() => {
                            setSubmitted(false);
                            setTicketId(null);
                        }}
                        data-ai-element="emergency_ask_another"
                    >
                        {t("form_success_btn")}
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-6 rounded-xl border border-(--color-primary)/25 bg-(--color-surface-2) p-8"
            data-ai-target="emergency_form"
            noValidate
        >
            {/* Urgency badge row */}
            <div className="flex items-center gap-3 pb-2 border-b border-(--color-border)">
                <div className="flex size-8 items-center justify-center rounded-full bg-(--color-primary)/15">
                    <AlertTriangle className="h-4 w-4 text-(--color-primary)" aria-hidden />
                </div>
                <div>
                    <p className="text-xs font-bold text-(--color-primary) uppercase tracking-wide">
                        {t("form_badge_title")}
                    </p>
                    <p className="text-xs text-(--color-text-muted)">
                        {t("form_badge_desc")}
                    </p>
                </div>
            </div>

            {submitError && (
                <p
                    className="rounded-md border border-(--color-error)/40 bg-(--color-error)/8 px-4 py-3 text-sm text-(--color-error)"
                    role="alert"
                >
                    {submitError}
                </p>
            )}

            <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                    <label
                        htmlFor="emergency-fullName"
                        className="text-sm font-medium text-(--color-text-primary)"
                    >
                        {t("form_name_label")}{" "}
                        <span className="text-(--color-primary)" aria-hidden>*</span>
                    </label>
                    <Input
                        id="emergency-fullName"
                        placeholder={t("form_name_placeholder")}
                        error={!!errors.fullName}
                        className={inputClass}
                        {...register("fullName")}
                    />
                    {errors.fullName && (
                        <p className="text-sm text-(--color-error)" role="alert">
                            {errors.fullName.message}
                        </p>
                    )}
                </div>

                <div className="space-y-2">
                    <label
                        htmlFor="bookingNumber"
                        className="text-sm font-medium text-(--color-text-primary)"
                    >
                        {t("form_booking_label")}{" "}
                        <span className="text-(--color-primary)" aria-hidden>*</span>
                    </label>
                    <Input
                        id="bookingNumber"
                        placeholder={t("form_booking_placeholder")}
                        error={!!errors.bookingNumber}
                        className={`${inputClass} font-family-mono`}
                        {...register("bookingNumber")}
                    />
                    {errors.bookingNumber && (
                        <p className="text-sm text-(--color-error)" role="alert">
                            {errors.bookingNumber.message}
                        </p>
                    )}
                </div>

                <div className="space-y-2">
                    <label
                        htmlFor="emergency-email"
                        className="text-sm font-medium text-(--color-text-primary)"
                    >
                        {t("form_email_label")}{" "}
                        <span className="text-(--color-primary)" aria-hidden>*</span>
                    </label>
                    <Input
                        id="emergency-email"
                        type="email"
                        placeholder={t("form_email_placeholder")}
                        error={!!errors.email}
                        className={inputClass}
                        {...register("email")}
                    />
                    {errors.email && (
                        <p className="text-sm text-(--color-error)" role="alert">
                            {errors.email.message}
                        </p>
                    )}
                </div>

                <div className="space-y-2 sm:col-span-2">
                    <label
                        htmlFor="travelDate"
                        className="text-sm font-medium text-(--color-text-primary)"
                    >
                        {t("form_date_label")}{" "}
                        <span className="text-(--color-primary)" aria-hidden>*</span>
                    </label>
                    <Controller
                        name="travelDate"
                        control={control}
                        render={({ field }) => (
                            <DatePicker
                                id="travelDate"
                                value={field.value}
                                onChange={field.onChange}
                                placeholder={t("form_date_placeholder")}
                                error={!!errors.travelDate}
                            />
                        )}
                    />
                    {errors.travelDate && (
                        <p className="text-sm text-(--color-error)" role="alert">
                            {errors.travelDate.message}
                        </p>
                    )}
                </div>

                <div className="space-y-2 sm:col-span-2">
                    <label
                        htmlFor="emergency-subject"
                        className="text-sm font-medium text-(--color-text-primary)"
                    >
                        {t("form_subject_label")}{" "}
                        <span className="text-(--color-primary)" aria-hidden>*</span>
                    </label>
                    <Controller
                        name="subject"
                        control={control}
                        render={({ field }) => (
                            <Select
                                value={field.value}
                                onValueChange={field.onChange}
                            >
                                <SelectTrigger
                                    id="emergency-subject"
                                    aria-invalid={!!errors.subject}
                                    className="bg-(--color-surface-1) border border-(--color-border-strong) rounded-sm px-4 py-3 text-base text-(--color-text-primary) focus:border-(--color-primary) focus:shadow-[0_0_0_3px_var(--color-primary-subtle)] focus:outline-none transition-all duration-200"
                                >
                                    <SelectValue
                                        placeholder={
                                            <span className="text-(--color-text-muted)">{t("form_subject_placeholder")}</span>
                                        }
                                    />
                                </SelectTrigger>
                                <SelectContent>
                                    {options.map((opt) => (
                                        <SelectItem
                                            key={opt.value}
                                            value={opt.value}
                                        >
                                            <span>{opt.label}</span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    />
                    {errors.subject && (
                        <p className="text-sm text-(--color-error)" role="alert">
                            {errors.subject.message}
                        </p>
                    )}
                </div>

                <div className="space-y-2 sm:col-span-2">
                    <label
                        htmlFor="emergency-message"
                        className="text-sm font-medium text-(--color-text-primary)"
                    >
                        {t("form_message_label")}{" "}
                        <span className="text-(--color-primary)" aria-hidden>*</span>
                    </label>
                    <textarea
                        id="emergency-message"
                        rows={5}
                        placeholder={t("form_message_placeholder")}
                        className="flex w-full bg-(--color-surface-1) border border-(--color-border-strong) rounded-sm px-4 py-3 text-base text-(--color-text-primary) placeholder:text-(--color-text-muted) focus:border-(--color-primary) focus:shadow-[0_0_0_3px_var(--color-primary-subtle)] focus:outline-none transition-all duration-200 resize-y disabled:opacity-50"
                        aria-invalid={!!errors.message}
                        {...register("message")}
                    />
                    {errors.message && (
                        <p className="text-sm text-(--color-error)" role="alert">
                            {errors.message.message}
                        </p>
                    )}
                </div>
            </div>

            <Button
                type="submit"
                isLoading={isSubmitting}
                variant="default"
                className="w-full rounded-(--radius-full) bg-(--color-primary) text-white dark:text-black font-bold py-4 text-base hover:bg-(--color-primary-light) transition-all shadow-sm"
                data-ai-element="emergency_submit"
            >
                {t("form_submit_btn")}
            </Button>
        </form>
    );
}
