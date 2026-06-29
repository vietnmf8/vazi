"use client";

import { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { Controller, useWatch, type Control, type UseFormSetValue } from "react-hook-form";
import { differenceInBusinessDays, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { WHATSAPP_URL } from "@/lib/constants";
import { MessageCircle } from "lucide-react";
import { DEFAULT_PROCESSING_OPTIONS as STATIC_PROCESSING_OPTIONS, PricingConfigData, formatUsd, getDbProcessingValue } from "./priceCalculator";
import type { Step1FormValues } from "./applySchemas";
import {
    m,
    useMotionValue,
    useTransform,
    useSpring,
    type MotionValue,
} from "framer-motion";
import { useTranslations } from "next-intl";

const CONFIG = {
    DOCK_MAX_SCALE: 1.15,
    DOCK_RADIUS: 180,
    PRICE_MAX_SCALE: 1.5,
    PRICE_TRANSLATE_X: -120,
    PRICE_TRANSLATE_Y: 0,
};

interface ProcessingTimeSelectorProps {
    control: Control<Step1FormValues>;
    setValue: UseFormSetValue<Step1FormValues>;
    pricingConfig?: PricingConfigData | null;
}

const PROCESSING_PRICE_LABEL: Record<string, string> = {
    normal_7d: "Included",
    urgent_4d: "+$35 ~ $45",
    urgent_3d: "+$45 ~ $55",
    urgent_2d: "+$65 ~ $75",
    urgent_1d: "+$125",
    urgent_4h: "+$125",
    urgent_2h: "+$195",
    urgent_1h: "+$250",
    last_minute: "+$295",
};

interface DockItemProps {
    opt: {
        value: string;
        label: string;
        caption: string | null;
        badge: string | null;
        note: string | null;
        expectedTime?: string | null;
        price?: number;
    };
    isSelected: boolean;
    isDisabled: boolean;
    onSelect: () => void;
    mouseY: MotionValue<number>;
    groupRef: React.RefObject<HTMLDivElement | null>;
    isDesktop: boolean;
    t: (key: string) => string;
}

function DockProcessingItem({ opt, isSelected, isDisabled, onSelect, mouseY, groupRef, isDesktop, t }: DockItemProps) {
    const itemRef = useRef<HTMLDivElement>(null);

    const rawScale = useTransform(mouseY, (val: number) => {
        if (!isDesktop || val < 0 || !itemRef.current || !groupRef.current) return 1;
        const groupBounds = groupRef.current.getBoundingClientRect();
        const itemBounds = itemRef.current.getBoundingClientRect();
        const itemCenterY = itemBounds.top - groupBounds.top + itemBounds.height / 2;
        const dist = Math.abs(val - itemCenterY);
        const radius = CONFIG.DOCK_RADIUS;
        if (dist > radius) return 1;
        return 1 + (CONFIG.DOCK_MAX_SCALE - 1) * (1 - dist / radius);
    });

    const scale = useSpring(rawScale, { stiffness: 380, damping: 26, mass: 0.4 });
    const priceScale = useTransform(scale, [1, CONFIG.DOCK_MAX_SCALE], [1, CONFIG.PRICE_MAX_SCALE]);
    const priceX = useTransform(scale, [1, CONFIG.DOCK_MAX_SCALE], [0, CONFIG.PRICE_TRANSLATE_X]);
    const priceY = useTransform(scale, [1, CONFIG.DOCK_MAX_SCALE], [0, CONFIG.PRICE_TRANSLATE_Y]);

    return (
        <m.div
            ref={itemRef}
            style={{ scale, transformOrigin: "left center" }}
        >
            <button
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={onSelect}
                disabled={isDisabled}
                data-ai-element={`apply_step1_processing_${opt.value}`}
                className={cn(
                    "w-full flex items-center justify-between rounded-[var(--radius-xl)] border p-5 text-left transition-all duration-200",
                    isSelected
                        ? "border-[rgba(200,150,90,0.6)] bg-[var(--color-primary-subtle)] shadow-[0_0_0_1px_rgba(200,150,90,0.3)]"
                        : "border-[var(--color-border)] bg-[var(--color-surface-2)] hover:border-[var(--color-border-strong)] hover:shadow-md transition-all",
                    isDisabled && "opacity-50 cursor-not-allowed pointer-events-none grayscale-[0.5]"
                )}
            >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                    <span
                        className={cn(
                            "mt-0.5 size-4 shrink-0 rounded-full border-2 transition-all duration-200",
                            isSelected
                                ? "border-[var(--color-primary)] bg-[var(--color-primary)]"
                                : "border-[var(--color-border-strong)]",
                        )}
                        aria-hidden
                    />
                    <div className="min-w-0 space-y-0.5">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="font-body text-sm font-semibold text-(--color-text-primary)">
                                {t(`processing_${opt.value}_label`)}
                            </span>
                            {opt.badge && (
                                <span
                                    className={cn(
                                        "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                                        opt.badge === "Popular"
                                            ? "bg-[rgba(200,150,90,0.15)] text-[var(--color-primary-light)]"
                                            : opt.badge === "Special Service"
                                                ? "bg-[#25D366]/15 text-[#25D366]"
                                                : "bg-[rgba(248,113,113,0.15)] text-[var(--color-error)]",
                                    )}
                                >
                                    {opt.badge === "Popular" ? t("badge_popular") : opt.badge === "Special Service" ? t("badge_special_service") : t("badge_review_req")}
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-(--color-text-muted)">
                            {t(`processing_${opt.value}_caption`)}
                        </p>
                        {opt.note && (
                            <p className="text-xs italic text-(--color-text-muted)">
                                {t(`processing_${opt.value}_note`)}
                            </p>
                        )}
                        {'expectedTime' in opt && opt.expectedTime && (
                            <div className="mt-1.5 space-y-2">
                                <p className="text-xs font-medium text-[#25D366]">
                                    {t(`processing_${opt.value}_expectedTime`)}
                                </p>
                                {['urgent_1d', 'urgent_4h', 'urgent_2h', 'last_minute', 'weekend_processing'].includes(opt.value) && (
                                    <a
                                        href={WHATSAPP_URL}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="inline-flex items-center gap-1.5 rounded-full bg-[#25D366]/10 px-2.5 py-1 text-xs font-medium text-[#25D366] hover:bg-[#25D366]/20 transition-colors"
                                    >
                                        <MessageCircle className="h-3.5 w-3.5" />
                                        Chat on WhatsApp
                                    </a>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                <m.span
                    className={cn(
                        "ml-4 shrink-0 font-family-mono text-base font-semibold tabular-nums",
                        isSelected
                            ? "text-(--color-primary)"
                            : "text-(--color-text-secondary)",
                    )}
                    style={{
                        scale: priceScale,
                        x: priceX,
                        y: priceY,
                        transformOrigin: "right center"
                    }}
                >
                    {opt.value === "normal_7d" ? t("price_included") : PROCESSING_PRICE_LABEL[opt.value]}
                </m.span>
            </button>
        </m.div>
    );
}

export function ProcessingTimeSelector({ control, setValue, pricingConfig }: ProcessingTimeSelectorProps) {
    const groupRef = useRef<HTMLDivElement>(null);
    const mouseY = useMotionValue(-999);
    const [isDesktop, setIsDesktop] = useState(true);
    const t = useTranslations("ApplyPage.Step1");

    const optionsToRender = useMemo(() => {
        if (!pricingConfig || !pricingConfig.PROCESSING_OPTIONS) return STATIC_PROCESSING_OPTIONS;
        return STATIC_PROCESSING_OPTIONS.map(fallbackOpt => {
            const dbVal = getDbProcessingValue(fallbackOpt.value);
            const apiOpt = pricingConfig.PROCESSING_OPTIONS.find(o => o.value === dbVal);
            if (!apiOpt) return fallbackOpt;
            return {
                ...fallbackOpt,
                expectedTime: apiOpt.expectedTime ?? fallbackOpt.expectedTime,
            };
        });
    }, [pricingConfig]);

    const arrivalDateStr = useWatch({ control, name: "arrival_date" });
    const selectedProcessingTime = useWatch({ control, name: "processing_time" });
    const visaType = useWatch({ control, name: "visa_type" });
    const today = useMemo(() => startOfDay(new Date()), []);

    const getDisabledOptions = useCallback((arrivalStr?: string, type?: string) => {
        if (type === "voa") {
            return ["urgent_4d", "urgent_3d", "urgent_2d", "urgent_1d", "urgent_4h", "urgent_2h", "urgent_1h", "last_minute", "weekend_processing"];
        }

        if (!arrivalStr) return [];
        const [y, m, d] = arrivalStr.split("-").map(Number);
        if (!y || !m || !d) return [];
        const arrivalDate = new Date(y, m - 1, d);
        const diff = differenceInBusinessDays(arrivalDate, today);
        
        const disabled = [];
        if (diff < 7) disabled.push("normal_7d");
        if (diff < 4) disabled.push("urgent_4d");
        if (diff < 3) disabled.push("urgent_3d");
        if (diff < 2) disabled.push("urgent_2d");
        if (diff < 1) disabled.push("urgent_1d");
        return disabled;
    }, [today]);

    const disabledOptions = useMemo(() => getDisabledOptions(arrivalDateStr, visaType), [getDisabledOptions, arrivalDateStr, visaType]);

    const prevArrivalDateRef = useRef(arrivalDateStr);

    useEffect(() => {
        // Nếu khách hàng đổi ngày bay, HOẶC gói hiện tại đang bị vô hiệu hoá
        // -> Tự động reset về gói rẻ nhất hợp lệ để khách không bị mất tiền oan.
        const isDateChanged = prevArrivalDateRef.current !== arrivalDateStr;
        const isCurrentDisabled = selectedProcessingTime && disabledOptions.includes(selectedProcessingTime);

        if (isDateChanged || isCurrentDisabled) {
            const firstEnabled = STATIC_PROCESSING_OPTIONS.find(opt => !disabledOptions.includes(opt.value));
            if (firstEnabled) {
                setValue("processing_time", firstEnabled.value as any, { shouldValidate: true, shouldDirty: true });
            }
        }
        
        prevArrivalDateRef.current = arrivalDateStr;
    }, [arrivalDateStr, disabledOptions, selectedProcessingTime, setValue]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsDesktop(window.innerWidth >= 1024);
        const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    return (
        <div className="space-y-5">
            <div className="space-y-1">
                <h3 className="font-body text-lg font-semibold text-(--color-text-primary)">
                    {t("processing_time_title")}
                </h3>
                <p className="body-text-sm">
                    {t("processing_time_desc")}
                </p>
            </div>

            <Controller
                name="processing_time"
                control={control}
                render={({ field }) => (
                    <div
                        ref={groupRef}
                        className="grid grid-cols-1 gap-3"
                        role="radiogroup"
                        aria-label="Processing time"
                        onMouseMove={(e) => {
                            if (!isDesktop) return;
                            const bounds = groupRef.current?.getBoundingClientRect();
                            if (bounds) mouseY.set(e.clientY - bounds.top);
                        }}
                        onMouseLeave={() => {
                            if (isDesktop) mouseY.set(-999);
                        }}
                    >
                        {optionsToRender.map((opt) => (
                            <DockProcessingItem
                                key={opt.value}
                                opt={opt}
                                isSelected={field.value === opt.value}
                                isDisabled={disabledOptions.includes(opt.value)}
                                onSelect={() => field.onChange(opt.value)}
                                mouseY={mouseY}
                                groupRef={groupRef}
                                isDesktop={isDesktop}
                                t={t}
                            />
                        ))}
                    </div>
                )}
            />
        </div>
    );
}
