"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Star, X, Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { apiClient } from "@/lib/api-client";
import type { Review, ApiResponse } from "@/types/api";
import { cn } from "@/lib/utils";
import { Combobox } from "@/components/ui/Combobox";
import { useNationalities } from "@/hooks/useNationalities";
import { COUNTRY_ISO_MAP } from "@/lib/flagcdn";
import { useTranslations } from "next-intl";

interface ReviewFormValues {
    author_name: string;
    country_code: string;
    rating: number;
    content: string;
}

export interface LeaveReviewModalProps {
    open: boolean;
    onDismiss: () => void;
}

export function LeaveReviewModal({ open, onDismiss }: LeaveReviewModalProps) {
    const dialogRef = useRef<HTMLDivElement>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [openDropdown, setOpenDropdown] = useState(false);
    const [selectedCountryName, setSelectedCountryName] = useState("");
    const [hoverRating, setHoverRating] = useState<number | null>(null);

    const NATIONALITY_OPTIONS = useNationalities();
    const t = useTranslations("LeaveReview");

    const reviewSchema = z.object({
        author_name: z.string().min(2, t("validation_name")),
        country_code: z.string().length(2, t("validation_country")),
        rating: z.number().min(1, t("validation_rating_min")).max(5),
        content: z.string().min(10, t("validation_content")),
    });
    
    const {
        register,
        handleSubmit,
        setValue,
        watch,
        reset,
        formState: { errors },
    } = useForm<ReviewFormValues>({
        resolver: zodResolver(reviewSchema),
        defaultValues: {
            rating: 5,
        },
    });

    const currentRating = watch("rating");

    // Khóa cuộn trang (scroll lock)
    useEffect(() => {
        if (!open) return;

        const scrollY = window.scrollY;
        document.body.style.setProperty("position", "fixed", "important");
        document.body.style.setProperty("top", `-${scrollY}px`, "important");
        document.body.style.setProperty("width", "100%", "important");
        document.body.style.setProperty("overflow-y", "scroll", "important");

        const handleKey = (e: KeyboardEvent) => {
            if (e.key === "Escape" && !isSubmitting) onDismiss();
        };
        document.addEventListener("keydown", handleKey);

        return () => {
            const savedTop = document.body.style.top;
            document.body.style.removeProperty("position");
            document.body.style.removeProperty("top");
            document.body.style.removeProperty("width");
            document.body.style.removeProperty("overflow-y");
            if (savedTop) window.scrollTo(0, parseInt(savedTop || "0") * -1);
            document.removeEventListener("keydown", handleKey);
        };
    }, [open, onDismiss, isSubmitting]);

    // Focus trap
    useEffect(() => {
        if (open && dialogRef.current) {
            const firstFocusable = dialogRef.current.querySelector<HTMLElement>(
                "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"
            );
            firstFocusable?.focus();
        }
    }, [open]);

    const onSubmit = async (data: ReviewFormValues) => {
        setIsSubmitting(true);
        try {
            await apiClient.post<ApiResponse<Review>>("/api/v1/reviews", {
                ...data,
                country_code: data.country_code.toUpperCase(),
            });
            toast.success(t("success"));
            onDismiss();
            // Đợi tắt modal xong rồi mới reset để UX mượt hơn
            setTimeout(() => {
                reset();
                setSelectedCountryName("");
            }, 300);
        } catch (error) {
            toast.error(t("error"));
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!open || typeof window === "undefined") return null;

    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
        >
            {/* Backdrop tối + blur mịn — click ra ngoài để đóng modal */}
            <div
                className="absolute inset-0 animate-in fade-in duration-200"
                style={{
                    background: "rgba(10, 8, 6, 0.82)",
                    backdropFilter: "blur(18px) saturate(120%)",
                    WebkitBackdropFilter: "blur(18px) saturate(120%)",
                }}
                aria-hidden="true"
                onClick={isSubmitting ? undefined : onDismiss}
            />

            {/* Dialog Card - Cấu trúc tương tự ResumeDraftModal */}
            <div
                ref={dialogRef}
                className={cn(
                    "relative z-10 w-full max-w-2xl rounded-3xl border border-(--color-border-default)",
                    "bg-[var(--color-surface-elevated)] shadow-2xl shadow-black/60",
                    "animate-in fade-in slide-in-from-bottom-4 duration-300 py-5 sm:p-10"
                )}
            >
                {/* Nút đóng góc trên-phải */}
                <button
                    type="button"
                    onClick={onDismiss}
                    disabled={isSubmitting}
                    aria-label="Đóng"
                    className={cn(
                        "absolute top-5 right-5 flex items-center justify-center size-8 rounded-full",
                        "text-(--color-text-tertiary) transition-all",
                        "hover:text-(--color-text-primary) hover:bg-(--color-surface-base) transition-all",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                        isSubmitting && "opacity-40 pointer-events-none"
                    )}
                >
                    <X className="size-5" aria-hidden="true" />
                </button>

                <h2 className="text-xl sm:text-2xl font-bold text-(--color-text-primary) mb-6 sm:mb-8 text-center font-heading">
                    {t("title")}
                </h2>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 sm:space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
                        <div>
                            <label className="block text-sm font-medium text-(--color-text-secondary) mb-1.5">
                                {t("your_name")}
                            </label>
                            <input
                                {...register("author_name")}
                                className="w-full rounded-xl border border-(--color-border) bg-[var(--color-surface-base)] px-4 py-2.5 text-(--color-text-primary) focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                                placeholder={t("name_placeholder")}
                            />
                            {errors.author_name && (
                                <p className="text-red-500 text-xs mt-1">{errors.author_name.message}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-(--color-text-secondary) mb-1.5">
                                {t("nationality")}
                            </label>
                            <Combobox
                                open={openDropdown}
                                onOpenChange={setOpenDropdown}
                                value={selectedCountryName}
                                onValueChange={(val) => {
                                    setSelectedCountryName(val);
                                    const isoCode = COUNTRY_ISO_MAP[val];
                                    if (isoCode) {
                                        setValue("country_code", isoCode.toUpperCase(), { shouldValidate: true });
                                    }
                                }}
                                options={NATIONALITY_OPTIONS}
                                placeholder={t("select_nationality")}
                                emptyText={t("no_country")}
                                className="w-full bg-[var(--color-surface-base)] border-(--color-border) h-[46px] rounded-xl"
                                syncLabelWithLanguage
                            />
                            <input type="hidden" {...register("country_code")} />
                            {errors.country_code && (
                                <p className="text-red-500 text-xs mt-1">{errors.country_code.message}</p>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-(--color-text-secondary) mb-1.5">
                            {t("rating")}
                        </label>
                        <div
                            className={cn(
                                "flex items-center justify-between gap-3 h-[46px] px-4 rounded-xl border border-(--color-border) bg-[var(--color-surface-base)] shadow-2xs select-none transition-all",
                                "hover:border-primary/50",
                                "focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary",
                            )}
                        >
                            <div
                                className="flex items-center gap-1.5"
                                onMouseLeave={() => setHoverRating(null)}
                            >
                                {[1, 2, 3, 4, 5].map((star) => {
                                    const isFilled =
                                        hoverRating !== null
                                            ? star <= hoverRating
                                            : star <= currentRating;
                                    return (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => setValue("rating", star, { shouldValidate: true })}
                                            onMouseEnter={() => setHoverRating(star)}
                                            className="focus:outline-none group p-0.5 transition-all duration-150 active:scale-90"
                                        >
                                            <Star
                                                className={cn(
                                                    "size-6 transition-all duration-200",
                                                    isFilled
                                                        ? "text-[#34e0a1] fill-[#34e0a1] scale-110 drop-shadow-[0_0_4px_rgba(52,224,161,0.4)]"
                                                        : "text-(--color-text-muted) hover:scale-105 hover:text-[#34e0a1] transition-all",
                                                )}
                                            />
                                        </button>
                                    );
                                })}
                            </div>
                            <span className="text-sm font-extrabold text-(--color-text-primary) min-w-[30px] text-right">
                                {currentRating} {currentRating === 1 ? t("star") : t("stars")}
                            </span>
                        </div>
                        {errors.rating && (
                            <p className="text-red-500 text-xs mt-1">{errors.rating.message}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-(--color-text-secondary) mb-1.5">
                            {t("your_review")}
                        </label>
                        <textarea
                            {...register("content")}
                            rows={4}
                            className="w-full rounded-xl border border-(--color-border) bg-[var(--color-surface-base)] px-4 py-2.5 text-(--color-text-primary) focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none resize-none"
                            placeholder={t("review_placeholder")}
                        />
                        {errors.content && (
                            <p className="text-red-500 text-xs mt-1">{errors.content.message}</p>
                        )}
                    </div>

                    {/* Action buttons - mô phỏng giống form action của ResumeDraftModal */}
                    <div className="flex flex-wrap justify-end gap-3 pt-6 mt-6 border-t border-(--color-border-default)">
                        <button
                            type="button"
                            onClick={onDismiss}
                            disabled={isSubmitting}
                            className={cn(
                                "px-5 py-2.5 text-sm rounded-xl border border-(--color-border-default) font-medium text-(--color-text-secondary) transition-all",
                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                                !isSubmitting && "hover:bg-(--color-surface-base)",
                                isSubmitting && "opacity-40 pointer-events-none"
                            )}
                        >
                            {t("cancel")}
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={cn(
                                "flex items-center gap-2 px-6 py-2.5 text-sm rounded-xl",
                                "bg-primary text-primary-foreground font-semibold transition-opacity",
                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ring-offset-2 ring-offset-background",
                                !isSubmitting && "hover:opacity-90",
                                isSubmitting && "opacity-70 cursor-not-allowed"
                            )}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="size-4 animate-spin" />
                                    {t("submitting")}
                                </>
                            ) : (
                                t("submit")
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
