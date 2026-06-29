"use client";

import { AnimatePresence, m } from "framer-motion";
import { cn } from "@/lib/utils";
import { ValidationBadge } from "./ValidationBadge";

export interface FormFieldProps {
    label: React.ReactNode;
    htmlFor?: string;
    error?: string;
    successMessage?: string;
    required?: boolean;
    children: React.ReactNode;
    className?: string;
    fieldName?: string;
    badgeDelay?: number;
}

export function FormField({
    label,
    htmlFor,
    error,
    successMessage,
    required,
    children,
    className,
    fieldName,
    badgeDelay,
}: FormFieldProps) {
    return (
        <div className={cn("space-y-2", className)} data-field={fieldName}>
            <label
                {...(htmlFor ? { htmlFor } : {})}
                className="flex items-center gap-1 text-sm font-medium leading-none text-[var(--color-text-primary)]"
            >
                {label}
                {required && (
                    <span
                        className="text-xs leading-none text-[var(--color-error)]"
                        aria-hidden
                    >
                        *
                    </span>
                )}
            </label>
            {children}
            <AnimatePresence mode="wait">
                {successMessage && !error ? (
                    <m.div
                        key="success"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22, ease: "easeOut", delay: (badgeDelay ?? 0) / 1000 }}
                        style={{ overflow: "hidden" }}
                    >
                        <ValidationBadge status="success" message={successMessage} />
                    </m.div>
                ) : error ? (
                    <m.div
                        key="error"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22, ease: "easeOut" }}
                        style={{ overflow: "hidden" }}
                    >
                        <ValidationBadge status="error" message={error} />
                    </m.div>
                ) : null}
            </AnimatePresence>
        </div>
    );
}

