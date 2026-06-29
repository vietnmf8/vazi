"use client";

import * as React from "react";
import { useEffect, useRef, useState } from "react";
import StarFilledIcon from "@/assets/icons/ui/StarFilled.svg";

type StatFormat = "comma" | "int" | "decimal";

function parseStatConfig(value: string): {
    from: number;
    to: number;
    suffix: string;
    format: StatFormat;
} {
    if (value.includes(",")) {
        const num = parseInt(value.replace(/,/g, "").replace("+", ""));
        return { from: 0, to: num, suffix: "+", format: "comma" };
    }
    if (value.includes("★")) {
        const num = parseFloat(value);
        return { from: 4.0, to: num, suffix: "★", format: "decimal" };
    }
    if (value.endsWith("h")) {
        const num = parseInt(value);
        return {
            from: Math.max(0, num - 4),
            to: num,
            suffix: "h",
            format: "int",
        };
    }
    const num = parseInt(value.replace("+", ""));
    return { from: 0, to: num, suffix: "+", format: "int" };
}

function formatCount(n: number, format: StatFormat): string {
    if (format === "comma") return Math.round(n).toLocaleString("en-US");
    if (format === "decimal") return n.toFixed(1);
    return Math.round(n).toString();
}

/**
 * Custom hook tăng dần số liệu từ giá trị ban đầu đến giá trị đích (Count-up animation).
 * TẠI SAO: Đóng gói logic đếm số để tái sử dụng và kiểm soát hiệu ứng chuyển động dựa trên IntersectionObserver ở phía client.
 */
function useCountUp(
    to: number,
    from: number,
    duration = 2000,
    containerRef: React.RefObject<HTMLDivElement | null>,
) {
    const [count, setCount] = useState(from);
    const [started, setStarted] = useState(false);

    useEffect(() => {
        const reducedMotion = window.matchMedia(
            "(prefers-reduced-motion: reduce)",
        ).matches;

        if (reducedMotion) {
            const raf = requestAnimationFrame(() => setCount(to));
            return () => cancelAnimationFrame(raf);
        }

        const el = containerRef.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) setStarted(true);
            },
            { threshold: 0.2 },
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [to, containerRef]);

    useEffect(() => {
        if (!started) return;
        const startTime = performance.now();
        let raf: number;
        const tick = (now: number) => {
            const progress = Math.min((now - startTime) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(from + (to - from) * eased);
            if (progress < 1) raf = requestAnimationFrame(tick);
            else setCount(to);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [started, to, from, duration]);

    return count;
}

interface AnimatedStatValueProps {
    value: string;
}

/**
 * Hiển thị số liệu có hiệu ứng tăng số động khi cuộn màn hình tới vị trí (Client Component).
 * TẠI SAO: Tách biệt component con tự quản lý ref và hiệu ứng count-up cục bộ, giúp component cha TrustSignals.tsx chuyển thành Server Component tĩnh 100%.
 */
export function AnimatedStatValue({ value }: AnimatedStatValueProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const { from, to, suffix, format } = parseStatConfig(value);
    const count = useCountUp(to, from, 2000, containerRef);
    const display = formatCount(count, format);

    return (
        <div ref={containerRef} className="inline-block">
            {suffix === "★" ? (
                <span
                    className="inline-flex items-center gap-2 font-mono text-3xl font-extrabold text-(--color-primary) sm:text-4xl md:text-5xl"
                    aria-label={value}
                >
                    <span aria-hidden="true">{display}</span>
                    <StarFilledIcon 
                        className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 fill-[#F59E0B] drop-shadow-sm" 
                        aria-hidden="true" 
                    />
                </span>
            ) : (
                <p
                    className="font-mono text-3xl font-extrabold text-(--color-primary) sm:text-4xl md:text-5xl"
                    aria-label={value}
                >
                    <span aria-hidden="true">
                        {display}
                        {suffix}
                    </span>
                </p>
            )}
        </div>
    );
}
