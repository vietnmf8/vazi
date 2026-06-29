"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useEntryGate } from "@/components/features/entry-gate/EntryGateContext";
import Image from "next/image";
import Link from "next/link";
import { m } from "framer-motion";
import { Button } from "@/components/ui/Button";

import { QuickApplyForm } from "./QuickApplyForm";
import { useHeroAnimation } from "./hooks/useHeroAnimation";
import type { PortEntry, EligibilityRuleData } from "@/lib/api/config";
import type { Nationality } from "@/lib/api/home.api";

interface HeroSectionProps {
    ports?: PortEntry[];
    rules?: Record<string, EligibilityRuleData>;
    data?: any;
    apiNationalities?: Nationality[];
}

export function HeroSection({ ports, rules, data, apiNationalities }: HeroSectionProps) {
    const router = useRouter();
    const { openGate } = useEntryGate();
    const t = (key: string) => data?.[key] || "";

    const {
        headerVisible,
        eyebrowVariants,
        headlineVariants,
        subVariants,
        ctaVariants,
        statsVariants,
        formVariants,
    } = useHeroAnimation();

    const handleApplyClick = (e: React.MouseEvent) => {
        e.preventDefault();
        openGate({
            hideFastTrack: false, // Hiện đầy đủ 3 tùy chọn
            onConfirmNew: () => {
                router.push("/apply");
            },
            onConfirmUrgent: () => {
                router.push("/emergency-inquiry");
            },
            onConfirmFastTrack: () => {
                router.push("/apply?category=evisa-code&option=basic-fasttrack&vip=false&step=2");
            }
        });
    };

    return (
        // TẠI SAO: Đổi sang bg-transparent trên Mobile để hiển thị nền body (lưới tọa độ & gradient ở Dark Mode)
        // và giữ bg-background trên Desktop làm màu nền dự phòng. Loại bỏ inline backgroundColor để không ghi đè class.
        <section
            id="hero"
            aria-labelledby="hero-heading"
            className="relative w-full overflow-x-hidden bg-transparent sm:bg-background"
            style={{
                marginTop: "calc(-1 * var(--header-total-height))",
            }}
        >
            {/* unoptimized giữ nguyên hành vi cache của trình duyệt (không qua CDN optimizer). hidden sm:block ẩn trên mobile. */}
            <Image
                src="/vn.jpg"
                alt="Vietnam background"
                fill
                unoptimized
                priority
                className="hidden sm:block object-cover object-center"
            />

            {/* ── Dark cinematic overlay ── */}
            <div
                className="pointer-events-none absolute inset-0"
                aria-hidden="true"
            >
                {/* TẠI SAO chỉ hiển thị dải gradient trên Desktop?
                    - Trên Desktop: Dùng gradient từ trái sang phải (to_right) để tạo bóng tương phản cho phần chữ Hero Copy màu trắng nằm bên trái.
                    - Trên Mobile: Không dùng gradient theo yêu cầu của người dùng để giữ màu nền trơn tối giản và tinh tế.
                */}
                <div className="hidden sm:block absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.80)_0%,rgba(0,0,0,0.55)_45%,rgba(0,0,0,0.20)_75%,transparent_100%)]" />
                <div className="absolute bottom-0 right-0 w-125 h-100 rounded-full bg-[rgba(15,118,110,0.08)] blur-[120px]" />
            </div>

            {/* TẠI SAO: Loại bỏ inline backgroundColor để tránh che lấp ảnh nền /vn.jpg trên Desktop
                hoặc nền body trên Mobile khi container này phủ toàn màn hình (min-h-svh). */}
            <div
                className={`relative z-10 mx-auto w-full max-w-(--container-wide) px-4 sm:px-6 lg:px-16 flex items-start sm:items-center min-h-fit sm:min-h-svh pt-[calc(var(--header-total-height)+1.25rem)] pb-6 sm:pb-8 sm:pt-8 ${
                    headerVisible
                        ? "sm:pt-[calc(var(--header-total-height)+3rem)]"
                        : ""
                }`}
                style={{
                    transition:
                        "padding-top 500ms cubic-bezier(0.16, 1, 0.3, 1)",
                }}
                suppressHydrationWarning
            >
                <div className="grid grid-cols-1 gap-8 sm:gap-12 lg:grid-cols-[1.1fr_auto] lg:items-center lg:gap-24 w-full">
                    {/* ── Left: Hero Copy ── */}
                    <div className="hidden sm:flex flex-col items-start max-w-4xl">
                        {/* Eyebrow */}
                        <m.div
                            className="flex items-center gap-3 mb-6"
                            aria-hidden="true"
                            variants={eyebrowVariants}
                            initial="hidden"
                            animate="visible"
                        >
                            <div className="h-px w-12 bg-amber-400" />
                            <span className="font-hero text-sm font-semibold uppercase tracking-[0.15em] text-(--color-primary)">
                                {t("eyebrow")}
                            </span>
                        </m.div>

                        {/* Hero headline */}
                        <m.h1
                            id="hero-heading"
                            className="font-hero text-[clamp(2.25rem,5.5vw,4.25rem)] leading-[1.15] font-extrabold tracking-tight text-white max-w-3xl"
                            variants={headlineVariants}
                            initial="hidden"
                            animate="visible"
                        >
                            <span className="block">{t("headline_1")}</span>
                            <span className="block whitespace-nowrap">
                                {t("headline_2")}
                            </span>
                            <span className="block text-(--color-primary) whitespace-nowrap">
                                {t("headline_3")}
                            </span>
                        </m.h1>

                        {/* Subheadline */}
                        <m.p
                            className="mt-6 max-w-130 text-base md:text-lg text-white/90 leading-relaxed"
                            variants={subVariants}
                            initial="hidden"
                            animate="visible"
                        >
                            {t("subheadline_1")}{" "}
                            <strong className="text-white font-semibold">
                                {t("subheadline_2")}
                            </strong>{" "}
                            {t("subheadline_3")}
                        </m.p>

                        {/* CTA row */}
                        <div className="mt-9 flex w-full flex-col gap-3 sm:flex-row sm:items-center">
                            <m.div
                                variants={ctaVariants}
                                initial="hidden"
                                animate="visible"
                            >
                                <Button onClick={handleApplyClick} size="lg" className=" border-0" data-ai-element="hero_apply">
                                    {t("apply_now")}
                                </Button>
                            </m.div>
                            <m.div
                                className="rounded-full backdrop-blur-md backdrop-saturate-130 backdrop-brightness-50 dark:backdrop-blur-[5px] dark:backdrop-saturate-180"
                                variants={ctaVariants}
                                initial="hidden"
                                animate="visible"
                            >
                                <Button
                                    asChild
                                    variant="outline"
                                    size="lg"
                                    className="border-white/20 text-white bg-white/8 hover:bg-white/18 hover:border-white/40 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)] transition-all"
                                    data-ai-element="hero_check_status"
                                >
                                    <Link href="/check-status">
                                        {t("check_status")}
                                    </Link>
                                </Button>
                            </m.div>
                        </div>

                        {/* Stats row */}
                        <m.div
                            className="mt-10 flex flex-row items-center gap-4 sm:gap-6 lg:gap-8 whitespace-nowrap overflow-hidden"
                            aria-label="Trust statistics"
                            role="list"
                            variants={statsVariants}
                            initial="hidden"
                            animate="visible"
                        >
                            <div
                                className="flex flex-col items-start"
                                role="listitem"
                            >
                                <span className="font-family-mono font-bold text-2xl md:text-3xl leading-none text-white">
                                    {t("stat_1_value")}
                                </span>
                                <span className="mt-1 text-[10px] sm:text-xs font-semibold uppercase tracking-widest text-white/60">
                                    {t("stat_1_label")}
                                </span>
                            </div>
                            <div
                                className="self-stretch w-px bg-white/20 hidden sm:block"
                                aria-hidden="true"
                            />
                            <div
                                className="flex flex-col items-start"
                                role="listitem"
                            >
                                <span className="font-family-mono font-bold text-2xl md:text-3xl leading-none text-white">
                                    {t("stat_2_value")}
                                </span>
                                <span className="mt-1 text-[10px] sm:text-xs font-semibold uppercase tracking-widest text-white/60">
                                    {t("stat_2_label")}
                                </span>
                            </div>
                            <div
                                className="self-stretch w-px bg-white/20 hidden sm:block"
                                aria-hidden="true"
                            />
                            <div
                                className="flex flex-col items-start"
                                role="listitem"
                            >
                                <span className="font-family-mono font-bold text-2xl md:text-3xl leading-none text-white">
                                    {t("stat_3_value")}
                                </span>
                                <span className="mt-1 text-[10px] sm:text-xs font-semibold uppercase tracking-widest text-white/60">
                                    {t("stat_3_label")}
                                </span>
                            </div>
                        </m.div>
                    </div>

                    {/* ── Mobile CTA Buttons (Chỉ hiển thị trên Mobile, nằm trên Form và căn giữa) ── */}
                    {/* TẠI SAO lại định nghĩa cụm nút riêng cho Mobile ở đây?
                        - Đảm bảo 2 nút "Apply Now" và "Check Status" hiển thị ngang hàng (flex-row) trên màn hình nhỏ.
                        - Đặt phía trên Form trong luồng hiển thị của Grid trên Mobile.
                        - Tự động ẩn đi trên màn hình sm trở lên (sm:hidden) để tránh trùng lặp với cụm CTA của Desktop.
                        - TẠI SAO nút Check Status dùng style border-(--color-border-strong) và text-(--color-text-primary)?
                          - Khi bỏ thumbnail và dùng bg-background trên Mobile, nền sáng ở Light Mode sẽ làm nút màu trắng cũ bị chìm.
                          - Style này đồng nhất với nút "See More countries" giúp hiển thị sắc nét, tinh tế ở cả Light và Dark Mode.
                    */}
                    <div className="flex sm:hidden flex-row justify-center items-center gap-4 w-full px-2">
                        <m.div
                            variants={ctaVariants}
                            initial="hidden"
                            animate="visible"
                            className="w-1/2 max-w-[160px]"
                        >
                            <Button 
                                onClick={handleApplyClick} 
                                size="lg" 
                                className="w-full border-0 text-sm py-3 px-4 justify-center whitespace-nowrap"
                            >
                                {t("apply_now")}
                            </Button>
                        </m.div>
                        <m.div
                            className="w-1/2 max-w-[160px]"
                            variants={ctaVariants}
                            initial="hidden"
                            animate="visible"
                        >
                            <Button
                                asChild
                                variant="outline"
                                size="lg"
                                className="w-full border border-(--color-border-strong) text-(--color-text-primary) hover:bg-(--color-surface-2) hover:text-(--color-text-primary) bg-transparent text-sm py-3 px-4 justify-center whitespace-nowrap font-bold shadow-sm rounded-full transition-all duration-200"
                            >
                                <Link href="/check-status">
                                    {t("check_status")}
                                </Link>
                            </Button>
                        </m.div>
                    </div>

                    {/* ── Right: Floating Quick Apply Form ── */}
                    <m.div
                        className="flex justify-center lg:justify-end rounded-2xl dark:backdrop-blur-[5px] dark:backdrop-saturate-180 w-full sm:w-auto"
                        variants={formVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        <QuickApplyForm ports={ports} rules={rules} apiNationalities={apiNationalities} />
                    </m.div>
                </div>
            </div>
        </section>
    );
}
