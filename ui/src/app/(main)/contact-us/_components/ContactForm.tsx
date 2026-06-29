"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { CheckCircle2, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/Select";
import { submitContact } from "@/lib/api/support.api";
import { ApiClientError } from "@/lib/api-client";

const contactSchema = z.object({
    fullName: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Enter a valid email address"),
    subject: z.string().min(1, "Please select a subject"),
    message: z.string().min(10, "Message must be at least 10 characters"),
});

type ContactFormValues = z.infer<typeof contactSchema>;

const inputClass =
    "bg-(--color-surface-1) border border-(--color-border-strong) rounded-sm px-4 py-3 text-base text-(--color-text-primary) placeholder:text-(--color-text-muted) focus:border-(--color-primary) focus:shadow-[0_0_0_3px_rgba(200,150,90,0.15)] focus:outline-none transition-all duration-200 w-full";

/**
 * Form liên hệ CSKH — gửi ticket qua POST /support/contact.
 * Redesigned: Modern 2026 Travel dark theme.
 */
export function ContactForm() {
    const [submitted, setSubmitted] = useState(false);
    const [ticketId, setTicketId] = useState<string | null>(null);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const t = useTranslations("ContactUs");

    // SUBJECT_KEYS stays static (values used by Zod/API); only labels come from i18n
    const SUBJECT_OPTIONS = (
        ["payment", "application", "edit_info", "refund", "other"] as const
    ).map((key) => ({
        value: key === "edit_info" ? "edit-info" : key,
        label: t(`subjects.${key}` as const),
    }));

    const {
        register,
        handleSubmit,
        control,
        formState: { errors, isSubmitting },
        reset,
    } = useForm<ContactFormValues>({
        resolver: zodResolver(contactSchema),
        defaultValues: {
            fullName: "",
            email: "",
            subject: "",
            message: "",
        },
    });

    const onSubmit = async (data: ContactFormValues) => {
        setSubmitError(null);
        try {
            const res = await submitContact({
                full_name: data.fullName.trim(),
                email: data.email.trim(),
                subject: data.subject,
                message: data.message.trim(),
            });
            setTicketId(res.ticket_id);
            setSubmitted(true);
            reset();
        } catch (err) {
            if (err instanceof ApiClientError) {
                setSubmitError(err.message);
            } else {
                setSubmitError(t("error_generic"));
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
                    <p className="text-lg font-semibold text-(--color-text-primary) font-body">
                        {t("success_title")}
                    </p>
                    <p className="mt-2 text-sm text-(--color-text-secondary) leading-relaxed">
                        {t("success_desc")}
                        {ticketId ? (
                            <>
                                {" "}
                                {t("success_reference", { ticketId })}
                            </>
                        ) : null}
                    </p>
                    <Button
                        type="button"
                        variant="outline"
                        className="mt-5"
                        onClick={() => {
                            setSubmitted(false);
                            setTicketId(null);
                        }}
                        data-ai-element="contact_send_another"
                    >
                        {t("send_another")}
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-6 rounded-xl border border-(--color-border-strong) bg-(--color-surface-2) p-8"
            data-ai-target="contact_form"
            data-ai-id="contact-form"
            data-ai-desc="Form liên hệ (Contact Us) dùng để gửi câu hỏi, khiếu nại hoặc yêu cầu hỗ trợ"
            noValidate
        >
            <div className="mb-6">
                <p className="section-label mb-2">
                    {t("form_title")}
                </p>
                <h2 className="section-subtitle">
                    {t("form_subtitle")}
                </h2>
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
                <div className="space-y-2">
                    <label htmlFor="fullName" className="text-sm font-medium text-(--color-text-primary)">
                        {t("full_name_label")}{" "}
                        <span className="text-(--color-error)" aria-hidden>*</span>
                    </label>
                    <Input
                        id="fullName"
                        placeholder="Your full name"
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
                    <label htmlFor="contact-email" className="text-sm font-medium text-(--color-text-primary)">
                        {t("email_label")}{" "}
                        <span className="text-(--color-error)" aria-hidden>*</span>
                    </label>
                    <Input
                        id="contact-email"
                        type="email"
                        placeholder="your@email.com"
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
            </div>

            <div className="space-y-2">
                <label htmlFor="subject" className="text-sm font-medium text-(--color-text-primary)">
                    {t("subject_label")}{" "}
                    <span className="text-(--color-error)" aria-hidden>*</span>
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
                                id="subject"
                                aria-invalid={!!errors.subject}
                                className="bg-(--color-surface-1) border border-(--color-border-strong) rounded-sm px-4 py-3 text-base text-(--color-text-primary) focus:border-(--color-primary) focus:shadow-[0_0_0_3px_rgba(200,150,90,0.15)] focus:outline-none transition-all duration-200"
                            >
                                <SelectValue placeholder={<span className="text-(--color-text-muted)">{t("subject_placeholder")}</span>} />
                            </SelectTrigger>
                            <SelectContent>
                                {SUBJECT_OPTIONS.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>
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

            <div className="space-y-2">
                <label htmlFor="message" className="text-sm font-medium text-(--color-text-primary)">
                    {t("message_label")}{" "}
                    <span className="text-(--color-error)" aria-hidden>*</span>
                </label>
                <textarea
                    id="message"
                    rows={5}
                    placeholder="Describe your question or issue in detail..."
                    className="flex w-full bg-(--color-surface-1) border border-(--color-border-strong) rounded-sm px-4 py-3 text-base text-(--color-text-primary) placeholder:text-(--color-text-muted) focus:border-(--color-primary) focus:shadow-[0_0_0_3px_rgba(200,150,90,0.15)] focus:outline-none transition-all duration-200 resize-y disabled:opacity-50"
                    aria-invalid={!!errors.message}
                    {...register("message")}
                />
                {errors.message && (
                    <p className="text-sm text-(--color-error)" role="alert">
                        {errors.message.message}
                    </p>
                )}
            </div>

            <Button
                type="submit"
                isLoading={isSubmitting}
                className="w-full sm:w-auto"
                data-ai-element="contact_submit"
            >
                <Send className="mr-2 h-4 w-4" aria-hidden />
                {t("send_button")}
            </Button>

        </form>
    );
}
