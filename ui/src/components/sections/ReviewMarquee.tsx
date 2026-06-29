"use client";

import React, { useRef, useState, useEffect } from "react";
import Image from "next/image";
import { m, useAnimationFrame, useMotionValue } from "framer-motion";
import { getFlagCdnUrl, getFlagCdnUrlByCode, getCountryNameByLocale } from "@/lib/flagcdn";
import { Star } from "lucide-react";

export function ReviewMarquee({ reviews, locale }: { reviews: any[]; locale: string }) {
    const baseVelocity = -1.2; // pixels per frame
    const baseX = useMotionValue(0);
    const [isHovered, setIsHovered] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [contentWidth, setContentWidth] = useState(0);
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const calculateWidth = () => {
            if (contentRef.current) {
                // To support Gap, we also need to account for it. 
                // The gap is 24px (gap-6)
                // Let's get the exact width of the first content block including padding/gap
                const width = contentRef.current.offsetWidth + 24;
                setContentWidth(width);
            }
        };
        
        // Initial calculation
        calculateWidth();
        
        // Recalculate on window resize
        window.addEventListener("resize", calculateWidth);
        return () => window.removeEventListener("resize", calculateWidth);
    }, [reviews]);

    useAnimationFrame((t, delta) => {
        if (isHovered || isDragging || !contentWidth) return;

        // Move based on velocity
        let moveBy = baseVelocity * (delta / 16);
        let newX = baseX.get() + moveBy;

        // Loop seamlessly
        if (newX <= -contentWidth) {
            newX += contentWidth;
        } else if (newX > 0) {
            newX -= contentWidth;
        }

        baseX.set(newX);
    });

    const handlePan = (e: any, info: any) => {
        if (!contentWidth) return;
        let newX = baseX.get() + info.delta.x;
        
        if (newX <= -contentWidth) {
            newX += contentWidth;
        } else if (newX > 0) {
            newX -= contentWidth;
        }
        
        baseX.set(newX);
    };

    if (!reviews || reviews.length === 0) return null;

    return (
        <div 
            className="w-full overflow-hidden cursor-grab active:cursor-grabbing py-8 -mx-4 px-4 sm:mx-0 sm:px-0 select-none"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onPointerDown={() => setIsDragging(true)}
            onPointerUp={() => setIsDragging(false)}
            onPointerCancel={() => setIsDragging(false)}
            style={{ touchAction: "none" }} // Prevent browser vertical scroll when swiping horizontally
        >
            <m.div
                className="flex gap-6 items-stretch w-max"
                style={{ x: baseX }}
                onPan={handlePan}
            >
                <div ref={contentRef} className="flex gap-6 shrink-0 items-stretch">
                    {reviews.map((review, i) => (
                        <ReviewCard key={`r1-${review.id}`} review={review} locale={locale} isNew={i < 3} />
                    ))}
                </div>
                {/* Duplicate blocks to create infinite scrolling illusion */}
                <div className="flex gap-6 shrink-0 items-stretch">
                    {reviews.map((review, i) => (
                        <ReviewCard key={`r2-${review.id}`} review={review} locale={locale} isNew={i < 3} />
                    ))}
                </div>
                <div className="flex gap-6 shrink-0 items-stretch">
                    {reviews.map((review, i) => (
                        <ReviewCard key={`r3-${review.id}`} review={review} locale={locale} isNew={i < 3} />
                    ))}
                </div>
            </m.div>
        </div>
    );
}

function ReviewCard({ review, locale, isNew }: { review: any; locale: string; isNew?: boolean }) {
    const cardRef = useRef<HTMLDivElement>(null);
    const [rotateX, setRotateX] = useState(0);
    const [rotateY, setRotateY] = useState(0);
    const [isReleasing, setIsReleasing] = useState(false);
    const releaseTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!cardRef.current) return;
        setIsReleasing(false);
        if (releaseTimeoutRef.current) clearTimeout(releaseTimeoutRef.current);

        const rect = cardRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;

        const MAX_ROTATE = 12; // tilt angle in degrees
        const rY = (x / (rect.width / 2)) * MAX_ROTATE;
        const rX = -(y / (rect.height / 2)) * MAX_ROTATE;

        setRotateX(rX);
        setRotateY(rY);
    };

    const handlePointerLeave = () => {
        setIsReleasing(true);
        setRotateX(0);
        setRotateY(0);
        
        releaseTimeoutRef.current = setTimeout(() => {
            setIsReleasing(false);
        }, 600); // Wait for spring animation to finish
    };

    return (
        <m.div
            ref={cardRef}
            className="w-[320px] md:w-[380px] shrink-0 h-full"
            style={{ perspective: 1000 }}
            onPointerMove={handlePointerMove}
            onPointerLeave={handlePointerLeave}
        >
            <m.figure 
                className="flex h-full flex-col rounded-2xl border border-(--color-border) bg-(--color-surface-1) p-6 md:p-8 shadow-sm will-change-transform"
                animate={{
                    rotateX,
                    rotateY,
                    scale: rotateX || rotateY ? 1.02 : 1,
                    boxShadow: rotateX || rotateY 
                        ? "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
                        : "0 1px 2px 0 rgba(0, 0, 0, 0.05)"
                }}
                transition={{
                    type: "spring",
                    stiffness: isReleasing ? 200 : 400,
                    damping: isReleasing ? 15 : 30
                }}
            >
                {/* TripAdvisor Badge & Star Rating */}
                <div className="flex items-center justify-between mb-4 pointer-events-none">
                    <div className="inline-flex items-center shrink-0">
                        <Image
                            src="/images/tripadvisor-2.png"
                            alt="TripAdvisor"
                            width={120}
                            height={40}
                            style={{ width: "auto", height: "auto" }}
                            className="h-6 w-auto object-contain dark:brightness-0 dark:invert"
                        />
                    </div>
                    <div className="flex gap-1">
                        {Array.from({ length: review.rating }).map((_, i) => (
                            <Star key={i} className="w-4 h-4 text-[#34e0a1] fill-[#34e0a1]" />
                        ))}
                    </div>
                </div>

                {/* Quote */}
                <blockquote className="flex-1 text-sm leading-relaxed text-(--color-text-secondary) font-body italic mb-6 pointer-events-none">
                    &ldquo;{review.text}&rdquo;
                </blockquote>

                {/* Author */}
                <figcaption className="flex items-center gap-3 border-t border-(--color-border) pt-4 pointer-events-none">
                    <Image
                        src={
                            review.avatar?.trim()
                                ? review.avatar
                                : `https://api.dicebear.com/9.x/fun-emoji/svg?seed=${encodeURIComponent(review.name)}`
                        }
                        alt={review.name}
                        width={40}
                        height={40}
                        unoptimized
                        className="size-10 shrink-0 rounded-full object-cover"
                        aria-hidden="true"
                    />
                    <div>
                        <div className="flex items-center gap-2">
                            <p className="font-body text-sm font-bold text-(--color-text-primary)">
                                {review.name}
                            </p>
                            {isNew && (
                                <span className="px-2 py-0.5 text-[10px] bg-red-100 text-red-600 rounded-full font-bold whitespace-nowrap">
                                    Mới
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <Image
                                src={review.countryCode ? getFlagCdnUrlByCode(review.countryCode) : getFlagCdnUrl(review.country)}
                                alt={getCountryNameByLocale(review.country, locale)}
                                width={16}
                                height={12}
                                unoptimized
                                className="w-4 h-3 object-cover rounded-xs shrink-0"
                            />
                            <p className="text-sm text-(--color-text-muted) font-body line-clamp-1">
                                {getCountryNameByLocale(review.country, locale)}
                            </p>
                        </div>
                    </div>
                </figcaption>
            </m.figure>
        </m.div>
    );
}
