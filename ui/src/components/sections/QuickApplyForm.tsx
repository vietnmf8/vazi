"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { m, AnimatePresence } from "framer-motion";
import { ArrowRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { PriceCounter } from "@/components/ui/PriceCounter";
import { COUNTRIES } from "@/lib/constants/nationalities";

import { useRouter } from "next/navigation";
import { useEntryGate } from "@/components/features/entry-gate/EntryGateContext";

// Import các sub-component và phụ trợ được phân rã
import { QuickApplyFormFields } from "./quick-apply/QuickApplyFormFields";
import {
    VISA_OPTIONS,
    PROCESSING_OPTIONS,
    type VisaCategory,
    type VisaOption,
    type ProcessingSpeed,
} from "./quick-apply/constants";
import type { PortEntry, EligibilityRuleData } from "@/lib/api/config";
import type { Nationality } from "@/lib/api/home.api";

interface QuickApplyFormProps {
    ports?: PortEntry[];
    rules?: Record<string, EligibilityRuleData>;
    apiNationalities?: Nationality[];
}

/**
 * Khung tính toán giá vé nhanh cho người dùng (Quick Apply Calculator).
 * TẠI SAO: Đã được refactor tách toàn bộ các trường nhập liệu UI ra component QuickApplyFormFields và các hằng số ra constants.ts, giúp file chính gọn gàng hơn rất nhiều (~200 dòng), dễ kiểm thử và quản lý logic tính giá tập trung.
 */
export function QuickApplyForm({ ports, rules, apiNationalities }: QuickApplyFormProps) {
    const router = useRouter();
    const { openGate } = useEntryGate();
    const t = useTranslations("HomePage.QuickApply");

    const [category, setCategory] = useState<VisaCategory>("evisa");
    const [visaOption, setVisaOption] = useState<VisaOption>("evisa-30-single");
    const [nationality, setNationality] = useState(COUNTRIES[0]);
    const [port, setPort] = useState("HAN");
    const [arrivalDate, setArrivalDate] = useState("");
    const [count, setCount] = useState(1);
    const [hoverCount, setHoverCount] = useState<number | null>(null);
    const [speed, setSpeed] = useState<ProcessingSpeed>("normal");
    const [minDate, setMinDate] = useState<Date | undefined>(undefined);
    const [openDropdown, setOpenDropdown] = useState<
        "nationality" | "port" | "arrivalDate" | "visaOption" | "speed" | null
    >(null);

    // Cập nhật minDate ở client để tránh xung đột hydration (PPR-safe)
    useEffect(() => {
        const raf = requestAnimationFrame(() => setMinDate(new Date()));
        return () => cancelAnimationFrame(raf);
    }, []);

    const filteredOptions = VISA_OPTIONS.filter((v) => v.category === category);
    const activeOption =
        filteredOptions.find((o) => o.id === visaOption) || filteredOptions[0];

    const basePrice = activeOption?.price ?? 0;
    const surcharge =
        PROCESSING_OPTIONS.find((p) => p.id === speed)?.surcharge ?? 0;
    const totalPerPerson = basePrice + surcharge;
    const totalAll = totalPerPerson * count;

    const urgentBadge = speed !== "normal";

    /**
     * Xử lý chuyển hướng / mở cổng Entry Gate khi nhấn Continue to Application.
     * TẠI SAO: Nếu chọn E-Visa hoặc VOA, ta phải bật EntryGateModal 2 tùy chọn (ẩn Fast-Track).
     * Nếu chọn Fast-Track, ta bỏ qua hoàn toàn modal và điều hướng thẳng vào Step 2 của trang đăng ký.
     */
    const handleContinue = () => {
        if (category === "evisa" || category === "voa") {
            openGate({
                hideFastTrack: true, // Chỉ hiện 2 tùy chọn E-visa mới và Hỗ trợ khẩn cấp
                newCategory: category,
                onConfirmNew: () => {
                    router.push(
                        `/apply?category=${category}&option=${activeOption?.id || ""}&nationality=${nationality}&port=${port}&count=${count}&speed=${speed}&arrival=${arrivalDate}`
                    );
                },
                onConfirmUrgent: () => {
                    router.push("/emergency-inquiry");
                },
            });
        } else if (category === "evisa-code") {
            const isVip = activeOption?.id === "code-fasttrack";
            router.push(
                `/apply?category=evisa-code&option=${activeOption?.id}&nationality=${nationality}&port=${port}&count=${count}&speed=${speed}&arrival=${arrivalDate}&vip=${isVip}&step=2`
            );
        }
    };

    return (
        <div
            className={cn(
                "relative z-20 w-full md:w-125 rounded-2xl",
                "border border-(--color-border-strong)",
                "bg-(--color-surface-1)",
                "flex flex-col gap-0 overflow-visible select-none",
            )}
            style={{
                minHeight: "560px",
                boxShadow:
                    "inset 0 1.5px 0 rgba(255,255,255,0.14), inset 0 -1px 0 rgba(0,0,0,0.06)",
            }}
            aria-label="Quick visa price calculator"
            data-ai-target="quick_apply"
            data-ai-id="quick-apply-form"
            data-ai-type="container"
            data-ai-desc="Form biểu giá và đăng ký visa nhanh (Quick Apply Form) cho phép chọn loại visa, quốc tịch, ngày nhập cảnh và tốc độ xử lý"
        >
            {/* Header Strip hiển thị giá ước tính */}
            <div className="bg-linear-to-r from-amber-500/10 via-amber-500/5 to-transparent border-b border-amber-500/20 px-5 py-3 rounded-t-2xl">
                <div className="flex items-center justify-between h-6 mb-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-(--color-primary) font-heading">
                        {t("est_pricing")}
                    </p>
                    {urgentBadge && (
                        <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-(--color-primary) bg-(--color-primary)/15 border border-(--color-primary)/30 rounded-full px-2.5 py-0.5 animate-pulse">
                            <Zap className="size-3 text-(--color-primary)" />
                            {t("express_speed")}
                        </span>
                    )}
                </div>
                <div className="flex items-end gap-1.5">
                    <PriceCounter
                        value={totalAll}
                        className="text-3xl font-extrabold tracking-tight text-(--color-primary)"
                    />
                    <span className="text-sm font-semibold text-(--color-text-secondary) mb-0.5 font-body">
                        {count > 1
                            ? t("total_for_travellers", { count })
                            : t("per_traveller")}
                    </span>
                </div>
                <p className="text-sm text-(--color-text-muted) mt-0.5 font-body">
                    {t("fee_desc", { price: totalPerPerson })}
                </p>
            </div>

            {/* Form Body và các trường nhập liệu */}
            <div className="flex flex-col gap-4 px-5 py-3.5 flex-1 justify-between">
                
                <QuickApplyFormFields
                    category={category}
                    setCategory={setCategory}
                    visaOption={visaOption}
                    setVisaOption={setVisaOption}
                    nationality={nationality}
                    setNationality={setNationality}
                    port={port}
                    setPort={setPort}
                    arrivalDate={arrivalDate}
                    setArrivalDate={setArrivalDate}
                    count={count}
                    setCount={setCount}
                    hoverCount={hoverCount}
                    setHoverCount={setHoverCount}
                    speed={speed}
                    setSpeed={setSpeed}
                    minDate={minDate}
                    openDropdown={openDropdown}
                    setOpenDropdown={setOpenDropdown}
                    filteredOptions={filteredOptions}
                    activeOption={activeOption}
                    ports={ports}
                    apiNationalities={apiNationalities}
                />

                {/* Phần breakdown chi tiết giá tiền */}
                <div className="rounded-[20px] border border-(--color-border) bg-(--color-surface-2) p-4 text-sm font-body">
                    <div className="flex justify-between text-(--color-text-secondary) font-medium">
                        <span>
                            {t("standard_fee")} ({count}{" "}
                            {count > 1 ? t("people") : t("person")})
                        </span>
                        <span>${basePrice * count}</span>
                    </div>
                    <AnimatePresence initial={false}>
                        {surcharge > 0 && (
                            <m.div
                                initial={{ height: 0, opacity: 0, scale: 0.95 }}
                                animate={{ height: "auto", opacity: 1, scale: 1 }}
                                exit={{ height: 0, opacity: 0, scale: 0.95 }}
                                transition={{
                                    duration: 0.35,
                                    ease: [0.25, 1, 0.5, 1],
                                }}
                                className="overflow-hidden"
                                style={{ willChange: "transform, opacity, height" }}
                            >
                                <div className="flex justify-between text-(--color-primary) font-semibold pt-1">
                                    <span>
                                        {t("express_delivery")} ({count}{" "}
                                        {count > 1 ? t("people") : t("person")})
                                    </span>
                                    <span>+${surcharge * count}</span>
                                </div>
                            </m.div>
                        )}
                    </AnimatePresence>
                    <div className="flex justify-between font-extrabold text-(--color-text-primary) border-t border-(--color-border) pt-2 mt-2 text-sm">
                        <span>{t("guaranteed_price")}</span>
                        <span className="text-sm text-(--color-primary)">
                            <PriceCounter value={totalAll} />
                        </span>
                    </div>
                </div>

                {/* Nút hành động chính (CTA) */}
                <Button
                    onClick={handleContinue}
                    size="default"
                    data-ai-element="continue_to_apply"
                    data-ai-id="btn-quick-apply-continue"
                    data-ai-action="click"
                    data-ai-desc="Tiếp tục nộp đơn xin visa"
                    className="w-full h-12 mt-0 font-extrabold rounded-xl transition-all shadow-md hover:shadow-lg focus:ring-2"
                >
                    <span className="flex items-center justify-center gap-2 text-base">
                        {t("continue_to_apply")}
                        <ArrowRight className="size-4" />
                    </span>
                </Button>

                <p className="text-center text-xs text-(--color-text-muted) leading-tight font-body">
                    {rules && rules[nationality]?.note 
                        ? rules[nationality].note
                        : (category === "evisa"
                            ? t("evisa_desc")
                            : category === "voa"
                                ? t("voa_desc")
                                : t("fasttrack_desc"))}
                </p>
            </div>
        </div>
    );
}
