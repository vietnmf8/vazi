"use client";

import { m } from "framer-motion";
import { cn } from "@/lib/utils";
import { Typography } from "@/components/ui/Typography";
import CheckIcon from "@/assets/icons/ui/Check.svg";
import { useTranslations } from "next-intl";

export interface ApplicationStepperProps {
    currentStep: number;
    /** Step cao nhất từng được truy cập — cho phép click lại các step đã thăm */
    maxStepReached?: number;
    onStepClick?: (step: number) => void;
    hideLabels?: boolean;
    isFastTrack?: boolean;
}

const REGULAR_STEPS = [
    { title: "Visa Options", step: 1, displayStep: 1 },
    { title: "Applicant Details", step: 2, displayStep: 2 },
    { title: "Review & Pay", step: 3, displayStep: 3 },
] as const;

const FAST_TRACK_STEPS = [
    { title: "Applicant Details", step: 2, displayStep: 1 },
    { title: "Review & Pay", step: 3, displayStep: 2 },
] as const;

/**
 * Thanh tiến trình 3 bước — nhấn vào step đã hoàn thành để quay lại.
 * Line dùng scaleX Framer Motion với originX=0: phóng trái→phải khi tiến, thu phải→trái khi lùi.
 */
export function ApplicationStepper({ currentStep, maxStepReached, onStepClick, hideLabels, isFastTrack }: ApplicationStepperProps) {
    const t = useTranslations("ApplyPage.ApplicationStepper");
    const highestReached = maxStepReached ?? currentStep;
    const steps = isFastTrack ? FAST_TRACK_STEPS : REGULAR_STEPS;
    
    return (
        <nav aria-label="Application progress" className="w-full py-4">
            <ol
                className="max-w-3xl mx-auto grid items-start"
                style={{ gridTemplateColumns: `repeat(${steps.length}, 1fr)` }}
            >
                {steps.map((item, index) => {
                    const isActive = currentStep === item.step;
                    const isCompleted = currentStep > item.step;
                    // Clickable khi step này đã từng được truy cập VÀ không phải step hiện tại
                    const isClickable = item.step <= highestReached && item.step !== currentStep;

                    return (
                        <li key={item.step} className="flex flex-col items-center relative">
                            {/* Connector lines: base gray + animated teal overlay */}
                            {index > 0 && (
                                <>
                                    <div
                                        aria-hidden
                                        className="absolute top-4 h-px -translate-y-1/2 bg-[var(--color-border-default)]"
                                        style={{ right: "calc(50% + 20px)", width: "calc(100% - 40px)" }}
                                    />
                                    <m.div
                                        aria-hidden
                                        className="absolute top-4 h-px -translate-y-1/2 bg-[var(--color-secondary-light)]"
                                        style={{ right: "calc(50% + 20px)", width: "calc(100% - 40px)", originX: 0 }}
                                        initial={false}
                                        animate={{ scaleX: currentStep >= item.step ? 1 : 0 }}
                                        transition={{ duration: 0.35, ease: "easeInOut" }}
                                    />
                                </>
                            )}

                            {/* Circle: button khi đã từng truy cập (có thể click lại), span khi active/locked */}
                            {isClickable ? (
                                <button
                                    type="button"
                                    onClick={() => onStepClick?.(item.step)}
                                    className={cn(
                                        "relative z-10 flex size-8 items-center justify-center rounded-full border-2 transition-opacity hover:opacity-70",
                                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-secondary-light)]",
                                        isCompleted
                                            ? "border-[var(--color-secondary-light)] bg-transparent text-[var(--color-secondary-light)]"
                                            : "border-[var(--color-secondary-light)] bg-transparent text-[var(--color-secondary-light)] text-sm font-bold",
                                    )}
                                    aria-label={`Go to step ${item.displayStep}: ${t(`step_${item.step}`)}`}
                                >
                                    {isCompleted ? <CheckIcon className="size-4" /> : item.displayStep}
                                </button>
                            ) : (
                                <span
                                    className={cn(
                                        "relative z-10 flex size-8 items-center justify-center rounded-full border-2 text-sm font-bold transition-all",
                                        isActive
                                            ? "border-[var(--color-text-primary)] bg-[var(--color-text-primary)] text-[var(--color-surface-base)]"
                                            : "border-[var(--color-border-default)] bg-[var(--color-surface-base)] text-[var(--color-text-tertiary)]",
                                    )}
                                    aria-current={isActive ? "step" : undefined}
                                >
                                    {item.displayStep}
                                </span>
                            )}

                            {/* Label */}
                            {!hideLabels && (
                                <Typography
                                    variant="caption"
                                    className={cn(
                                        "mt-2 hidden text-center sm:block",
                                        isActive
                                            ? "font-medium text-[var(--color-text-primary)]"
                                            : isCompleted
                                                ? "text-[var(--color-secondary-light)] hover:opacity-70 transition-all"
                                                : "text-[var(--color-text-tertiary)]",
                                    )}
                                    onClick={isClickable ? () => onStepClick?.(item.step) : undefined}
                                >
                                    {t(`step_${item.step}`)}
                                </Typography>
                            )}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}
