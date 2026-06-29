import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { getFlagCdnUrlByCode, getCountryNameByLocale } from "@/lib/flagcdn";
import { AnimatedStatValue } from "./AnimatedStatValue";
import { LeaveReviewButton } from "./LeaveReviewButton";
import { ReviewMarquee } from "./ReviewMarquee";
import { getTestimonials, getHomeConfig } from "@/lib/api/home.api";
import { getLocale } from "next-intl/server";

/**
 * Section hiển thị các tín hiệu uy tín (Stats, TripAdvisor Testimonials, và Payment methods).
 * TẠI SAO: Được refactor thành Server Component hoàn toàn bằng cách tách phần số liệu chuyển động thành Client Component AnimatedStatValue, nâng cao đáng kể hiệu năng PPR và thời gian FCP của trang chủ.
 */
export async function TrustSignals({
    data: initialData,
    statValues: initialStatValues,
}: {
    data?: { title?: string; stat_1?: string; stat_2?: string; stat_3?: string; stat_4?: string };
    statValues?: {
        stat_1_value?: string;
        stat_2_value?: string;
        stat_3_value?: string;
        stat_4_value?: string;
    };
}) {
    const locale = await getLocale();
    
    let data = initialData;
    let statValues = initialStatValues;

    if (!data || !statValues) {
        const homeConfigData = await getHomeConfig(locale);
        data = homeConfigData?.trustSignals?.[locale] || homeConfigData?.trustSignals?.en || {};
        statValues = homeConfigData?.hero?.[locale] || homeConfigData?.hero?.en || {};
    }

    const stats = [
        { value: statValues?.stat_1_value ?? "150,000+", label: data?.stat_1 },
        { value: statValues?.stat_2_value ?? "24h", label: data?.stat_2 },
        { value: statValues?.stat_3_value ?? "4.9★", label: data?.stat_3 },
        { value: statValues?.stat_4_value ?? "120+", label: data?.stat_4 },
    ];

    const [apiReviews] = await Promise.all([
        getTestimonials(locale).catch(() => [] as Awaited<ReturnType<typeof getTestimonials>>),
    ]);

    const reviews = apiReviews ?? [];

    return (
        <section
            id="trust"
            data-ai-target="trust_signals"
            aria-labelledby="trust-heading"
            className="w-full py-16 md:py-20 lg:py-24 border-t border-b border-(--color-border) reveal-on-scroll"
        >
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                {/* Section header */}
                <div className="text-center mb-16">
                    <h2 id="trust-heading" className="section-title">
                        {data?.title}
                    </h2>
                </div>

                {/* Stats grid */}
                <ul className="grid grid-cols-2 gap-0 md:grid-cols-4 mb-16 border-y border-(--color-border) md:border-y-0">
                    {stats.map((stat, index) => (
                        <li
                            key={index}
                            className={cn(
                                "relative flex flex-col items-center text-center py-8 px-4",
                                // Mobile grid borders
                                index % 2 === 0
                                    ? "border-r border-(--color-border)"
                                    : "",
                                index < 2
                                    ? "border-b border-(--color-border)"
                                    : "",
                                // Desktop overrides
                                index < 3
                                    ? "md:border-r md:border-(--color-border)"
                                    : "md:border-r-0",
                                "md:border-b-0",
                            )}
                        >
                            <AnimatedStatValue value={stat.value} />
                            <p className="mt-3 text-sm font-semibold text-(--color-text-muted) font-body uppercase tracking-wide">
                                {stat.label}
                            </p>
                        </li>
                    ))}
                </ul>

                {/* Testimonial cards */}
                {reviews.length > 0 ? (
                    <ReviewMarquee reviews={reviews} locale={locale} />
                ) : null}

                {/* Leave Review Button */}
                <LeaveReviewButton />
            </div>
        </section>
    );
}
