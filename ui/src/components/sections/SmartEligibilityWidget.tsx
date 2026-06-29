"use client";

import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import Image from "next/image";
import { m, AnimatePresence } from "framer-motion";
import { Globe } from "lucide-react";
import { useTranslations } from "next-intl";
import { Combobox, type ComboboxOption } from "@/components/ui/Combobox";
import { fetchExemption } from "@/lib/exemption.client";
import { ApiClientError } from "@/lib/api-client";
import type { ExemptionResult, Nationality } from "@/types/api";
import { getFlagUrl } from "./FeaturedNationalities";
import { useLocalizedCountryName } from "@/hooks/useLocalizedCountryName";

// Import các phụ trợ và sub-components được phân rã
import { EligibilityResultView } from "./eligibility/EligibilityResult";

type EligibilityResult = "eligible" | "ineligible" | null;

interface SmartEligibilityWidgetProps {
    nationalities: Nationality[];
}

/**
 * Widget kiểm tra điều kiện cấp E-Visa trực tuyến (Smart Eligibility Widget).
 * TẠI SAO: Đã được refactor tách phần hiển thị kết quả và các hằng số tra cứu luật của các nước ra các file riêng, giúp file chính giảm từ 568 dòng xuống còn ~200 dòng, cực kỳ gọn gàng và tối ưu hiệu suất render.
 */
export function SmartEligibilityWidget({ nationalities }: SmartEligibilityWidgetProps) {
    const [nationalityCode, setNationalityCode] = useState<string>("");
    const [result, setResult] = useState<EligibilityResult>(null);
    const [exemption, setExemption] = useState<ExemptionResult | null>(null);
    const [lookupError, setLookupError] = useState<string | null>(null);

    const t = useTranslations("HomePage.Eligibility");
    const { getLocalizedName, locale } = useLocalizedCountryName();

    const exemptionCache = useRef(new Map<string, ExemptionResult>());
    const pendingPrefetches = useRef(new Set<string>());
    const prefetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Prefetch dữ liệu miễn thị thực (Exemption) khi người dùng di chuột qua các lựa chọn trong Combobox
    const prefetchExemption = useCallback((code: string) => {
        if (prefetchTimerRef.current) clearTimeout(prefetchTimerRef.current);
        prefetchTimerRef.current = setTimeout(async () => {
            if (!code) return;
            if (exemptionCache.current.has(code)) return;
            if (pendingPrefetches.current.has(code)) return;
            pendingPrefetches.current.add(code);
            try {
                const detail = await fetchExemption(code);
                exemptionCache.current.set(code, detail);
            } catch {
                // silent — lỗi prefetch không gây ảnh hưởng đến luồng chính
            } finally {
                pendingPrefetches.current.delete(code);
            }
        }, 150);
    }, []);

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (prefetchTimerRef.current) clearTimeout(prefetchTimerRef.current);
        };
    }, []);



    const nationalityOptions = useMemo<ComboboxOption[]>(() => {
        const localizedNats = nationalities.map((n) => ({
            ...n,
            localizedName: getLocalizedName(n.code, (n as any).label || n.name, (n as any).is_custom_name),
        })).sort((a, b) => a.localizedName.localeCompare(b.localizedName, locale));

        const groups = new Map<string, typeof localizedNats>();
        for (const n of localizedNats) {
            const letter = n.localizedName[0].toUpperCase();
            if (!groups.has(letter)) groups.set(letter, []);
            groups.get(letter)!.push(n);
        }
        const result: ComboboxOption[] = [];
        for (const [letter, items] of groups) {
            result.push({ value: `__header_${letter}`, label: letter, isHeader: true });
            for (const n of items) {
                result.push({
                    value: n.code,
                    label: n.localizedName,
                    icon: (
                        <Image
                            src={getFlagUrl((n as any).label || n.name || "", n.code)}
                            width={20}
                            height={20}
                            unoptimized
                            className="w-5 h-5 object-cover rounded-full border border-stone-200/50 shrink-0"
                            alt=""
                        />
                    ),
                });
            }
        }
        return result;
    }, [nationalities, getLocalizedName, locale]);

    // Xử lý thay đổi quốc tịch và tra cứu kết quả điều kiện visa
    const handleNationalityChange = useCallback(
        async (code: string) => {
            setNationalityCode(code);
            setLookupError(null);

            if (!code) {
                setExemption(null);
                setResult(null);
                return;
            }

            const selected = nationalities.find((n) => n.code === code);
            setResult(selected?.is_eligible_evisa ? "eligible" : "ineligible");

            // Kiểm tra cache hit - nếu có dữ liệu đã prefetch thì hiển thị ngay lập tức
            const cached = exemptionCache.current.get(code);
            if (cached) {
                setExemption(cached);
                setResult(cached.is_eligible_evisa ? "eligible" : "ineligible");
                return;
            }

            // Gọi API tra cứu nếu chưa có trong cache
            try {
                const detail = await fetchExemption(code);
                exemptionCache.current.set(code, detail);
                setExemption(detail);
                setResult(detail.is_eligible_evisa ? "eligible" : "ineligible");
            } catch (err) {
                if (selected) {
                    setResult(
                        selected.is_eligible_evisa ? "eligible" : "ineligible",
                    );
                }
                if (err instanceof ApiClientError) {
                    setLookupError(err.message);
                } else {
                    setLookupError(
                        t("error_lookup"),
                    );
                }
            }
        },
        [nationalities, t],
    );
    // Lắng nghe sự kiện điền form từ AI
    useEffect(() => {
        const handleAiFill = (e: CustomEvent<{target?: string, fieldName: string, value: string}>) => {
            const { target, fieldName, value } = e.detail;
            if (target && target !== "eligibility-checker") return;
            if (fieldName === "nationality") {
                const upperVal = value.toUpperCase();
                // Tìm option tương ứng trong nationalities
                const option = nationalities.find(n => 
                    n.code.toUpperCase() === upperVal || 
                    ((n as any).label && (n as any).label.toUpperCase().includes(upperVal)) ||
                    (n.name && n.name.toUpperCase().includes(upperVal)) ||
                    (upperVal.includes("VIET") && n.code === "VN") ||
                    (upperVal.includes("HÀN") && n.code === "KR")
                );
                if (option) {
                    void handleNationalityChange(option.code);
                } else {
                    void handleNationalityChange(value);
                }
            }
        };
        window.addEventListener("ai_fill_form", handleAiFill as EventListener);
        return () => window.removeEventListener("ai_fill_form", handleAiFill as EventListener);
    }, [nationalities, handleNationalityChange]);

    return (
        <section
            id="eligibility"
            aria-labelledby="eligibility-heading"
            data-ai-id="eligibility-checker"
            data-ai-type="container"
            data-ai-desc="Phần kiểm tra điều kiện xin E-Visa Việt Nam (Am I Eligible for Vietnam E-Visa), bao gồm form chọn quốc tịch để tra cứu điều kiện"
            className="w-full py-12 md:py-16 lg:py-20 reveal-on-scroll"
            suppressHydrationWarning
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-16">
                {/* Section header */}
                <div className="text-center mb-12">
                    <h2
                        id="eligibility-heading"
                        className="section-title"
                    >
                        {t("title")}
                    </h2>
                    <p className="mt-4 section-desc max-w-150 mx-auto">
                        {t("desc")}
                    </p>
                </div>

                {/* Widget card */}
                <div
                    className="mx-auto max-w-2xl rounded-2xl border border-(--color-border) bg-(--color-surface-1) p-8 md:p-10 shadow-sm hover:shadow-md transition-shadow duration-300 dark:dark-glass"
                >
                    {/* Icon */}
                    <div className="flex items-center gap-3 mb-6">
                        <div className="flex size-10 items-center justify-center rounded-full bg-(--color-primary-subtle)">
                            <Globe
                                className="h-5 w-5 text-(--color-primary)"
                                aria-hidden="true"
                            />
                        </div>
                        <span className="section-subtitle !text-base">
                            {t("checker")}
                        </span>
                    </div>

                    {/* Combobox chọn quốc tịch */}
                    <div data-ai-field="nationality" data-ai-action="fill">
                        <label
                            className="mb-2 flex section-label items-center gap-1.5"
                        >
                            <Globe className="size-3 text-(--color-primary)" />
                            {t("your_nationality")}
                        </label>
                        <Combobox
                            value={nationalityCode}
                            onValueChange={(code) =>
                                void handleNationalityChange(code)
                            }
                            onOptionHover={(code) => void prefetchExemption(code)}
                            options={nationalityOptions}
                            placeholder={t("select_nationality")}
                            emptyText={t("no_nationality")}
                            className="h-12"
                            inputClassName="h-12"
                        />
                    </div>

                    {/* Lookup error */}
                    {lookupError && (
                        <p
                            className="mt-4 text-center text-sm text-(--color-text-muted)"
                            role="status"
                        >
                            {lookupError}
                        </p>
                    )}

                    {/* Khu vực kết quả */}
                    <AnimatePresence mode="popLayout">
                        {result !== null && (
                            <m.div
                                key="result-panel"
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                                transition={{ duration: 0.25, ease: "easeOut", layout: { duration: 0.3, ease: "easeOut" } }}
                                role="status"
                                aria-live="polite"
                                className="mt-6"
                                style={{ willChange: "transform, opacity" }}
                            >
                                <EligibilityResultView
                                    result={result}
                                    nationalityCode={nationalityCode}
                                    exemption={exemption}
                                />
                            </m.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </section>
    );
}
