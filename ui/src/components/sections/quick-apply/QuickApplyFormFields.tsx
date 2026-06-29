"use client";

import * as React from "react";
import { m } from "framer-motion";
import { useTranslations } from "next-intl";
import {
    Users,
    CalendarDays,
    User,
    Globe,
    MapPin,
    Layers,
    Tag,
    Clock,
} from "lucide-react";
import { DatePicker } from "@/components/ui/DatePicker";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/Select";
import { Combobox } from "@/components/ui/Combobox";
import { cn } from "@/lib/utils";
import { useNationalities } from "@/hooks/useNationalities";
import {
    PORTS,
    PROCESSING_OPTIONS,
    triggerCls,
    type VisaCategory,
    type VisaOption,
    type ProcessingSpeed,
    type VisaItem,
} from "./constants";

import type { PortEntry } from "@/lib/api/config";
import type { Nationality } from "@/lib/api/home.api";
import { AiContext } from "@/components/features/chat/AiContext";

interface QuickApplyFormFieldsProps {
    category: VisaCategory;
    setCategory: (cat: VisaCategory) => void;
    visaOption: VisaOption;
    setVisaOption: (opt: VisaOption) => void;
    nationality: string;
    setNationality: (nat: string) => void;
    port: string;
    setPort: (port: string) => void;
    arrivalDate: string;
    setArrivalDate: (date: string) => void;
    count: number;
    setCount: (count: number) => void;
    hoverCount: number | null;
    setHoverCount: (count: number | null) => void;
    speed: ProcessingSpeed;
    setSpeed: (speed: ProcessingSpeed) => void;
    minDate: Date | undefined;
    openDropdown: "nationality" | "port" | "arrivalDate" | "visaOption" | "speed" | null;
    setOpenDropdown: React.Dispatch<React.SetStateAction<"nationality" | "port" | "arrivalDate" | "visaOption" | "speed" | null>>;
    filteredOptions: VisaItem[];
    activeOption: VisaItem | undefined;
    ports?: PortEntry[];
    apiNationalities?: Nationality[];
}

/**
 * Danh sách các trường nhập liệu và chọn lựa của Quick Apply Form (Múi giờ, Loại visa, Ngày nhập cảnh, Quốc tịch, Số người).
 * TẠI SAO: Đóng gói toàn bộ cụm trường nhập liệu giúp tách biệt luồng xử lý UI/Control ra khỏi khối tính giá (Pricing Orchestrator) của QuickApplyForm.
 */
export function QuickApplyFormFields({
    category,
    setCategory,
    setVisaOption,
    nationality,
    setNationality,
    port,
    setPort,
    arrivalDate,
    setArrivalDate,
    count,
    setCount,
    hoverCount,
    setHoverCount,
    speed,
    setSpeed,
    minDate,
    openDropdown,
    setOpenDropdown,
    filteredOptions,
    activeOption,
    ports,
    apiNationalities,
}: QuickApplyFormFieldsProps) {
    const t = useTranslations("HomePage.QuickApply");
    const tc = useTranslations("HomePage.Constants");
    const NATIONALITY_OPTIONS = useNationalities(apiNationalities);

    React.useEffect(() => {
        const handleAiFill = (e: CustomEvent<{fieldName: string, value: string}>) => {
            const { fieldName, value } = e.detail;
            if (fieldName === "nationality") {
                const upperVal = value.toUpperCase();
                const option = NATIONALITY_OPTIONS.find(o => 
                    o.value.toUpperCase() === upperVal || 
                    (o.label && o.label.toUpperCase().includes(upperVal)) ||
                    (upperVal.includes("VIET") && o.value.toUpperCase() === "VIETNAM") ||
                    (upperVal.includes("HÀN") && o.value.toUpperCase() === "SOUTH KOREA") ||
                    (upperVal === "VN" && o.value.toUpperCase() === "VIETNAM") ||
                    (upperVal === "KR" && o.value.toUpperCase() === "SOUTH KOREA")
                );
                if (option) {
                    setNationality(option.value);
                } else {
                    setNationality(value);
                }
            }
            if (fieldName === "port") setPort(value);
            if (fieldName === "arrivalDate") setArrivalDate(value);
            if (fieldName === "visaOption") setVisaOption(value as any);
            if (fieldName === "speed") setSpeed(value as any);
            if (fieldName === "count" && !isNaN(Number(value))) setCount(Number(value));
            if (fieldName === "category") setCategory(value as any);
        };
        window.addEventListener("ai_fill_form", handleAiFill as EventListener);
        return () => window.removeEventListener("ai_fill_form", handleAiFill as EventListener);
    }, [setNationality, setPort, setArrivalDate, setVisaOption, setSpeed, setCount, setCategory, NATIONALITY_OPTIONS]);

    const aiSchema = React.useMemo(() => ({
        form_name: "quick_apply",
        fields: {
            category: ["evisa", "voa", "evisa-code"],
            visaOption: filteredOptions.map(v => v.id),
            port: ports ? ports.map(p => ({ code: p.code, name: p.name })) : PORTS.map(p => ({ code: p.value, name: tc(p.label as any) })),
            speed: PROCESSING_OPTIONS.map(p => ({ code: p.id, name: tc(p.label as any) })),
        }
    }), [filteredOptions, ports]);

    return (
        <div className="flex flex-col gap-4">
            <AiContext schema={aiSchema} />
            {/* Category Tabs */}
            <div className="flex flex-col gap-1" data-ai-field="category">
                <span className="text-xs font-bold uppercase tracking-wider text-(--color-text-muted) flex items-center gap-1.5 font-heading">
                    <Layers className="size-3 text-(--color-primary)" />
                    {t("visa_category")}
                </span>
                <div className="grid grid-cols-3 gap-1 rounded-xl bg-(--color-surface-2) p-1 border border-(--color-border) relative">
                    {(["evisa", "voa", "evisa-code"] as const).map((cat) => {
                        const isSelected = category === cat;
                        return (
                            <button
                                key={cat}
                                type="button"
                                onClick={() => {
                                    setCategory(cat);
                                    setVisaOption(
                                        cat === "evisa"
                                            ? "evisa-30-single"
                                            : cat === "evisa-code"
                                                ? "code-fasttrack"
                                                : "voa-1m-single",
                                    );
                                }}
                                className={cn(
                                    "relative rounded-lg py-1.5 text-sm font-bold transition-all text-center focus:outline-none flex items-center justify-center h-8 overflow-visible",
                                    isSelected
                                        ? (cat === "evisa-code" ? "text-white" : "text-white dark:text-black")
                                        : "text-(--color-text-secondary) hover:text-(--color-text-primary) transition-all",
                                )}
                            >
                                {isSelected && (
                                    <m.div
                                        layoutId="activeVisaCategory"
                                        className={cn(
                                            "absolute inset-0 rounded-lg shadow-sm",
                                            cat === "evisa-code" ? "bg-emerald-600" : "bg-(--color-primary)"
                                        )}
                                        transition={{
                                            type: "spring",
                                            stiffness: 380,
                                            damping: 30,
                                        }}
                                    />
                                )}
                                <span className="relative z-10">
                                    {cat === "evisa"
                                        ? t("evisa")
                                        : cat === "evisa-code"
                                            ? t("fast_track")
                                            : t("visa_on_arrival")}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Nationality + Port of Entry */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1" data-ai-field="nationality">
                    <label className="text-xs font-bold uppercase tracking-wider text-(--color-text-muted) flex items-center gap-1.5 font-heading">
                        <Globe className="size-3 text-(--color-primary)" />
                        {t("nationality")}
                    </label>
                    <Combobox
                        open={openDropdown === "nationality"}
                        onOpenChange={(isOpen) => {
                            if (isOpen) {
                                setOpenDropdown("nationality");
                            } else {
                                setOpenDropdown((curr) =>
                                    curr === "nationality" ? null : curr,
                                );
                            }
                        }}
                        value={nationality}
                        onValueChange={setNationality}
                        options={NATIONALITY_OPTIONS}
                        placeholder={t("select_nationality")}
                        emptyText={t("no_nationality")}
                        className="nationality-combobox"
                        syncLabelWithLanguage
                        aiElementId="quick_apply_nationality"
                    />
                </div>

                <div className="flex flex-col gap-1" data-ai-field="port">
                    <label className="text-xs font-bold uppercase tracking-wider text-(--color-text-muted) flex items-center gap-1.5 font-heading">
                        <MapPin className="size-3 text-(--color-primary)" />
                        {t("port_of_entry")}
                    </label>
                    <Select
                        open={openDropdown === "port"}
                        onOpenChange={(isOpen) => {
                            if (isOpen) {
                                setOpenDropdown("port");
                            } else {
                                setOpenDropdown((curr) =>
                                    curr === "port" ? null : curr,
                                );
                            }
                        }}
                        value={port}
                        onValueChange={setPort}
                    >
                        <SelectTrigger className={triggerCls} data-ai-element="quick_apply_port">
                            <SelectValue className="inline-block align-bottom" />
                        </SelectTrigger>
                        <SelectContent sideOffset={8}>
                            {ports && ports.length > 0 ? (
                                ports.map((p) => (
                                    <SelectItem key={p.code} value={p.code}>
                                        {p.name}
                                    </SelectItem>
                                ))
                            ) : (
                                PORTS.map((p) => (
                                    <SelectItem key={p.value} value={p.value}>
                                        {tc(p.label as any)}
                                    </SelectItem>
                                ))
                            )}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Date of Arrival */}
            <div className="flex flex-col gap-1" data-ai-field="arrivalDate">
                <label className="text-xs font-bold uppercase tracking-wider text-(--color-text-muted) flex items-center gap-1.5 font-heading">
                    <CalendarDays className="size-3 text-(--color-primary)" />
                    {t("date_of_arrival")}
                </label>
                <DatePicker
                    open={openDropdown === "arrivalDate"}
                    onOpenChange={(isOpen) => {
                        if (isOpen) {
                            setOpenDropdown("arrivalDate");
                        } else {
                            setOpenDropdown((curr) =>
                                curr === "arrivalDate" ? null : curr,
                            );
                        }
                    }}
                    value={arrivalDate}
                    onChange={setArrivalDate}
                    placeholder={t("select_arrival_date")}
                    fromDate={minDate}
                    className="h-10"
                />
            </div>

            {/* Visa Option */}
            <div className="flex flex-col gap-1" data-ai-field="visaOption">
                <label className="text-xs font-bold uppercase tracking-wider text-(--color-text-muted) flex items-center gap-1.5 font-heading">
                    <Tag className="size-3 text-(--color-primary)" />
                    {t("visa_option")}
                </label>
                <Select
                    open={openDropdown === "visaOption"}
                    onOpenChange={(isOpen) => {
                        if (isOpen) {
                            setOpenDropdown("visaOption");
                        } else {
                            setOpenDropdown((curr) =>
                                curr === "visaOption" ? null : curr,
                            );
                        }
                    }}
                    value={activeOption?.id || ""}
                    onValueChange={(v) => setVisaOption(v as VisaOption)}
                >
                    <SelectTrigger className={triggerCls} data-ai-element="quick_apply_visa_option">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent sideOffset={8}>
                        {filteredOptions.map((v) => (
                            <SelectItem key={v.id} value={v.id}>
                                {tc(v.label as any)} — ${v.price}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Applicants + Processing Speed */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1" data-ai-field="count">
                    <label className="text-xs font-bold uppercase tracking-wider text-(--color-text-muted) flex items-center gap-1.5 font-heading">
                        <Users className="size-3 text-(--color-primary)" />
                        {t("travellers")}
                    </label>
                    <div
                        className={cn(
                            "flex items-center justify-between gap-3 h-10 px-4 rounded-xl border border-(--color-border-strong) bg-(--color-surface-2) shadow-2xs select-none transition-all",
                            "hover:border-(--color-primary)/50 transition-all",
                            "focus-within:ring-2 focus-within:ring-(--color-primary)/20 focus-within:border-(--color-primary)",
                        )}
                    >
                        <div
                            className="flex items-center gap-1.5"
                            onMouseLeave={() => setHoverCount(null)}
                        >
                            {[1, 2, 3, 4, 5].map((num) => {
                                const isFilled =
                                    hoverCount !== null
                                        ? num <= hoverCount
                                        : num <= count;
                                return (
                                    <button
                                        key={num}
                                        type="button"
                                        onClick={() => setCount(num)}
                                        onMouseEnter={() => setHoverCount(num)}
                                        className="focus:outline-none group p-0.5 transition-all duration-150 active:scale-90"
                                        aria-label={`Select ${num} traveller${num !== 1 ? "s" : ""}`}
                                    >
                                        <User
                                            className={cn(
                                                "size-5 transition-all duration-200",
                                                isFilled
                                                    ? "text-(--color-primary) fill-(--color-primary) scale-110 drop-shadow-[0_0_4px_rgba(217,119,6,0.2)]"
                                                    : "text-(--color-text-muted) hover:scale-105 hover:text-(--color-primary) transition-all",
                                            )}
                                        />
                                    </button>
                                );
                            })}
                        </div>
                        <span
                            className="text-sm font-extrabold text-(--color-text-primary) min-w-[30px] text-right"
                            aria-live="polite"
                            aria-label={`${count} traveller${count !== 1 ? "s" : ""}`}
                        >
                            x{count}
                        </span>
                    </div>
                </div>

                <div className="flex flex-col gap-1" data-ai-field="speed">
                    <label className="text-xs font-bold uppercase tracking-wider text-(--color-text-muted) flex items-center gap-1.5 font-heading">
                        <Clock className="size-3 text-(--color-primary)" />
                        {t("processing_time")}
                    </label>
                    <Select
                        open={openDropdown === "speed"}
                        onOpenChange={(isOpen) => {
                            if (isOpen) {
                                setOpenDropdown("speed");
                            } else {
                                setOpenDropdown((curr) =>
                                    curr === "speed" ? null : curr,
                                );
                            }
                        }}
                        value={speed}
                        onValueChange={(v) => setSpeed(v as ProcessingSpeed)}
                    >
                        <SelectTrigger className={triggerCls} data-ai-element="quick_apply_processing_speed">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent sideOffset={8}>
                            {PROCESSING_OPTIONS.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                    {p.surcharge > 0
                                        ? `${tc(p.label as any).split(" — ")[0]} (+$${p.surcharge})`
                                        : `${tc(p.label as any).split(" — ")[0]} (${t("free")})`}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </div>
    );
}
