"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, m, useInView } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { TeamMember } from "@/types/api";
export function AboutTeam({ data, teamMembers }: { data?: any, teamMembers: TeamMember[] }) {
    const [activeIndex, setActiveIndex] = useState(0);
    const member = teamMembers[activeIndex] || teamMembers[0];
    const sectionRef = useRef<HTMLElement>(null);
    const isInView = useInView(sectionRef, { margin: "300px" });

    useEffect(() => {
        // Priority flag in next/image will handle preloading
    }, [isInView, teamMembers]);

    if (!member) return null;

    return (
        <section ref={sectionRef} aria-labelledby="team-heading" data-ai-target="about_team" className="overflow-x-clip">
            {/* ── CTA Strip — trên section heading ── */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-[2rem] border border-(--color-border) bg-(--color-surface-2) p-8 mb-12 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.03)]">
                <div className="space-y-1 max-w-2xl">
                    <h3 className="text-xl font-bold text-(--color-text-primary) tracking-tight">
                        {data?.ctaTitle}
                    </h3>
                    <p className="text-sm text-(--color-text-muted)">
                        {data?.ctaDesc}
                    </p>
                </div>
                <div className="shrink-0 flex sm:justify-center">
                    <Button
                        asChild
                        size="lg"
                        className="group/btn gap-2 rounded-2xl shadow-(--shadow-sm)"
                    >
                        <Link href="/contact-us">
                            {data?.ctaButton}
                            <ArrowRight className="size-4 transition-transform duration-300 group-hover/btn:translate-x-1" />
                        </Link>
                    </Button>
                </div>
            </div>

            {/* ── Section heading ── */}
            <div className="flex items-center gap-3 mb-8">
                <span className="text-xs font-bold uppercase tracking-widest text-(--color-primary) bg-(--color-primary-subtle) px-3 py-1.5 rounded-full">
                    {data?.label}
                </span>
                <h2
                    id="team-heading"
                    className="text-2xl sm:text-3xl font-bold tracking-tight text-(--color-text-primary)"
                >
                    {data?.title}
                </h2>
            </div>

            {/* ── Character Selection Layout ──
           Mobile: flex-col (info trên, portrait dưới bleed footer)
           Desktop sm+: grid 5:7 (portrait trái, info phải)
           overflow:visible cho phép portrait bleed ra ngoài section vào footer
      ── */}
            <div
                className="relative overflow-visible flex flex-col sm:grid sm:grid-cols-[5fr_7fr]"
                style={{
                    minHeight: "clamp(400px, 55vw, 700px)",
                }}
            >
                {/* ── Info Column — mobile: order-1 (trên), desktop: col-2 ── */}
                <div className="order-1 sm:order-2 sm:col-start-2 flex flex-col justify-between px-6 sm:px-10 pt-8 sm:pt-12 pb-10">
                    {/* Animated name / role / description */}
                    <AnimatePresence mode="wait">
                        <m.div
                            key={activeIndex}
                            initial={{ opacity: 0, x: 16, filter: "blur(4px)" }}
                            animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                            exit={{ opacity: 0, x: 16, filter: "blur(4px)" }}
                            transition={{
                                duration: 0.25,
                                delay: 0.05,
                                ease: [0.25, 0.46, 0.45, 0.94],
                            }}
                        >
                            <h3 className="text-4xl sm:text-6xl lg:text-7xl font-black uppercase tracking-tighter text-(--color-text-primary) leading-[0.9] break-words">
                                {member.name}
                            </h3>
                            <p className="mt-3 text-xl sm:text-2xl font-bold uppercase tracking-wide text-[#E87613]">
                                {member.role}
                            </p>
                            <p className="mt-4 text-sm sm:text-base text-(--color-text-secondary) leading-relaxed max-w-xl">
                                {member.description}
                            </p>
                        </m.div>
                    </AnimatePresence>

                    {/* Thumbnail selector strip */}
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 w-full flex justify-center sm:static sm:translate-x-0 sm:w-auto sm:justify-start sm:mt-8 sm:pt-6 sm:border-t sm:border-(--color-border)">
                        <div className="flex gap-3 sm:gap-4">
                            {teamMembers.map((char, i) => (
                                <m.button
                                    key={char.id}
                                    layout
                                    type="button"
                                    onClick={() => setActiveIndex(i)}
                                    aria-label={`Xem thông tin ${char.name}`}
                                    aria-pressed={i === activeIndex}
                                    className={[
                                        "relative shrink-0 overflow-hidden rounded-sm transition-all duration-300 ease-out",
                                        "w-16 h-24 sm:w-20 sm:h-28",
                                        i === activeIndex
                                            ? "opacity-100 scale-110 -translate-y-1 ring-[3px] ring-[#E87613] ring-offset-4 ring-offset-[#FBFBF9] shadow-[0_0_20px_rgba(232,118,19,0.35)] z-10"
                                            : "opacity-50 grayscale hover:opacity-100 hover:grayscale-0 hover:-translate-y-2 hover:shadow-lg z-0 transition-all",
                                    ].join(" ")}
                                    style={{ backgroundColor: char.thumbBg }}
                                >
                                    <Image
                                        src={char.imageUrl}
                                        alt={char.name}
                                        fill
                                        sizes="(max-width: 640px) 64px, 80px"
                                        className="object-cover object-top"
                                        priority={true}
                                    />
                                </m.button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── Portrait Column — mobile: order-2 (bên dưới), desktop: col-1 ──
             overflow:visible + portrait absolute bottom:-40px → bleed vào footer
        ── */}
                <div className="order-2 sm:order-1 sm:col-start-1 relative overflow-visible flex items-end justify-center h-96 sm:h-auto mt-16 sm:mt-0">
                    {/* Orange radial glow */}
                    <div
                        aria-hidden="true"
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                        style={{
                            width: "280px",
                            height: "280px",
                            background: "#E87613",
                            borderRadius: "50%",
                            filter: "blur(80px)",
                            opacity: 0.18,
                            zIndex: 1,
                        }}
                    />

                    {/* Animated portrait — bleed 40px (desktop) / 26px (mobile) vào footer */}
                    <AnimatePresence mode="wait">
                        <m.div
                            key={activeIndex}
                            initial={{
                                opacity: 0,
                                scale: 0.95,
                                x: -16,
                                filter: "blur(4px)",
                            }}
                            animate={{
                                opacity: 1,
                                scale: 1,
                                x: 0,
                                filter: "blur(0px)",
                            }}
                            exit={{
                                opacity: 0,
                                scale: 0.95,
                                x: -16,
                                filter: "blur(4px)",
                            }}
                            transition={{
                                duration: 0.25,
                                ease: [0.25, 0.46, 0.45, 0.94],
                            }}
                            className="absolute top-0 inset-x-0 -bottom-6.5 sm:-bottom-10"
                            style={{ zIndex: 3 }}
                        >
                            <Image
                                src={member.imageUrl}
                                alt={`${member.name} — ${member.role}`}
                                fill
                                sizes="(max-width: 640px) 768px, 1200px"
                                className="object-cover object-top scale-[1.2] origin-bottom sm:scale-100 sm:origin-top transition-transform duration-300"
                                priority={true}
                            />
                        </m.div>
                    </AnimatePresence>
                </div>
            </div>
        </section>
    );
}
