"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ArrowRight } from "lucide-react";
import { AnimatePresence, m } from "framer-motion";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export type FAQItemType = {
    id: string;
    question: string;
    answer: string;
};

export interface FAQPreviewProps {
    items?: readonly FAQItemType[] | FAQItemType[];
    title?: string;
    subtitle?: string;
}

/**
 * Component hiển thị danh sách câu hỏi FAQ dưới dạng accordion.
 * Sử dụng Framer Motion để tạo hiệu ứng đóng mở mượt mà.
 * 
 * WHY: Cần hỗ trợ nhận items từ ngoài truyền vào để trang "How to Apply" có thể 
 * tái sử dụng lại giao diện accordion này với tập câu hỏi riêng của nó.
 */
export function FAQPreview({
    items,
    title,
    subtitle,
}: FAQPreviewProps) {
    const t = useTranslations("HomePage.FAQ");
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    const defaultItems = [
        { id: "1", question: t("q1"), answer: t("a1") },
        { id: "2", question: t("q2"), answer: t("a2") },
        { id: "3", question: t("q3"), answer: t("a3") },
        { id: "4", question: t("q4"), answer: t("a4") },
        { id: "5", question: t("q5"), answer: t("a5") },
    ];

    const displayItems = items || defaultItems;
    const displayTitle = title || t("title");
    const displaySubtitle = subtitle || t("subtitle");

    const toggle = (index: number) => {
        setOpenIndex((prev) => (prev === index ? null : index));
    };

    return (
        <section
            id="faq"
            data-ai-target="faq"
            aria-labelledby="faq-heading"
            className="w-full py-16 md:py-20 lg:py-24 border-b border-(--color-border) reveal-on-scroll"
        >
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                {/* Section header */}
                <div className="text-center mb-16">
                    <h2
                        id="faq-heading"
                        className="section-title"
                    >
                        {displayTitle}
                    </h2>
                    <p className="mt-4 section-desc max-w-xl mx-auto">
                        {displaySubtitle}
                    </p>
                </div>

                {/* Accordion */}
                <div className="mx-auto max-w-3xl space-y-3">
                    {displayItems.map((item, index) => {
                        const isOpen = openIndex === index;
                        const panelId = `faq-panel-${item.id}`;
                        const buttonId = `faq-button-${item.id}`;

                        return (
                            <div
                                key={item.id}
                                className={cn(
                                    "overflow-hidden rounded-2xl border transition-all duration-300",
                                    isOpen
                                        ? "border-(--color-primary) bg-(--color-surface-1) shadow-sm"
                                        : "border-(--color-border) bg-(--color-surface-1) hover:border-(--color-primary)/40 transition-all"
                                )}
                            >
                                <h3>
                                    <button
                                        id={buttonId}
                                        type="button"
                                        className="flex min-h-16 w-full items-center justify-between gap-4 px-6 py-5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-primary) focus-visible:ring-offset-2 focus-visible:ring-offset-(--color-surface-1) "
                                        aria-expanded={isOpen}
                                        aria-controls={panelId}
                                        onClick={() => toggle(index)}
                                    >
                                        <span className="font-body text-sm sm:text-base font-bold text-(--color-text-primary) transition-all">
                                            {item.question}
                                        </span>
                                        <ChevronDown
                                            className={cn(
                                                "h-5 w-5 shrink-0 text-(--color-primary) transition-transform duration-300",
                                                isOpen ? "rotate-180" : "rotate-0"
                                            )}
                                            aria-hidden="true"
                                        />
                                    </button>
                                </h3>

                                <AnimatePresence initial={false}>
                                    {isOpen && (
                                        <m.div
                                            key="content"
                                            id={panelId}
                                            role="region"
                                            aria-labelledby={buttonId}
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.25, ease: "easeInOut" }}
                                            className="overflow-hidden"
                                        >
                                            <p className="border-t border-(--color-border) bg-(--color-surface-2) px-6 py-5 text-sm leading-relaxed text-(--color-text-secondary) font-body">
                                                {item.answer}
                                            </p>
                                        </m.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    })}
                </div>

                {/* View all link */}
                <div className="mt-12 text-center">
                    <Link
                        href="/faqs"
                        className="inline-flex items-center gap-1.5 text-sm font-bold uppercase tracking-wider text-(--color-secondary) hover:text-(--color-secondary-light) transition-all font-body"
                    >
                        {t("view_all")}
                        <ArrowRight className="size-4" />
                    </Link>
                </div>
            </div>
        </section>
    );
}
