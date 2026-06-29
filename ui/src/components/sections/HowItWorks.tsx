import { ClipboardList, CreditCard, FileText, Mail, ChevronRight } from "lucide-react";
import { getHowItWorks, getHomeConfig } from "@/lib/api/home.api";
import { getLocale, getTranslations } from "next-intl/server";

const STEP_ICONS = [ClipboardList, FileText, CreditCard, Mail] as const;

/** Component tự fetch data để Suspense có thể re-stream khi cache invalidate — không nhận props từ page.tsx */
export async function HowItWorks() {
    const locale = await getLocale();
    const [steps, t, homeConfigData] = await Promise.all([
        getHowItWorks(locale).catch(() => []),
        getTranslations("HomePage"),
        getHomeConfig(locale).catch(() => null),
    ]);

    // Trích xuất phần config của section how-it-works theo locale
    const data = homeConfigData?.howItWorks?.[locale] || homeConfigData?.howItWorks?.en || {};


    return (
        <section
            id="how-it-works"
            data-ai-target="how_it_works"
            data-ai-id="how-it-works"
            data-ai-desc={`Phần Hướng dẫn quy trình nộp đơn (How it Works), bao gồm ${steps.length} bước`}
            aria-labelledby="how-it-works-heading"
            className="w-full py-16 md:py-20 lg:py-24 border-b border-(--color-border) reveal-on-scroll"
        >
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                {/* Section header */}
                <div className="text-center mb-16">
                    <h2
                        id="how-it-works-heading"
                        className="section-title"
                    >
                        {data?.title}
                    </h2>
                    <p className="mt-4 section-desc max-w-150 mx-auto">
                        {data?.desc?.replace(/\d+(?=\s*(bước|simple steps|easy steps))/i, steps.length.toString()) || data?.desc}
                    </p>
                </div>

                {/* Steps container */}
                <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch lg:gap-6">
                    {steps.map((item, index) => {
                        const stepNum = index + 1;
                        const Icon = STEP_ICONS[stepNum - 1] ?? ClipboardList;
                        const isLast = index === steps.length - 1;
                        const stepTitle =
                            item.title?.trim() || t(`HowItWorks.steps.step_${stepNum}_title`);
                        const stepDesc =
                            item.description?.trim() || t(`HowItWorks.steps.step_${stepNum}_desc`);
                        return (
                            <div
                                key={item.id || index}
                                className="flex flex-col lg:flex-row items-center lg:items-stretch flex-1 gap-6"
                            >
                                {/* Card */}
                                <div 
                                    className="group relative flex flex-col items-center w-full rounded-2xl border border-(--color-border) bg-(--color-bg) p-7 pt-11 text-center transition-all duration-300 hover:-translate-y-1 hover:border-(--color-primary)/30 hover:shadow-md dark:dark-glass dark:bg-(--color-bg)/20"
                                    data-ai-id={`how-it-works-step-${stepNum}`}
                                    data-ai-desc={`Bước ${stepNum}: ${stepTitle} - ${stepDesc}`}
                                >
                                    {/* Step number */}
                                    <span
                                        className="absolute top-4 left-4 flex size-8 items-center justify-center rounded-full bg-(--color-primary-subtle) font-mono text-sm font-extrabold text-(--color-primary) border border-[var(--color-primary)]/10 shadow-xs"
                                        aria-hidden="true"
                                    >
                                        0{stepNum}
                                    </span>

                                    {/* Icon */}
                                    <div className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-(--color-secondary-subtle) text-(--color-secondary) group-hover:scale-110 group-hover:bg-[var(--color-primary-subtle)] group-hover:text-[var(--color-primary)] transition-all duration-300 shadow-sm border border-[var(--color-border)]">
                                        <Icon className="h-6 w-6" aria-hidden="true" />
                                    </div>

                                    <h3 className="section-subtitle !text-base mb-2 group-hover:text-(--color-primary) transition-all">
                                        {stepTitle}
                                    </h3>
                                    <p className="text-sm leading-relaxed text-(--color-text-secondary) font-body">
                                        {stepDesc}
                                    </p>
                                </div>

                                {/* Arrow connector — between cards on desktop */}
                                {!isLast && (
                                    <div
                                        className="hidden lg:flex items-center justify-center shrink-0 text-(--color-primary)"
                                        aria-hidden="true"
                                    >
                                        <ChevronRight className="size-7 stroke-[2.5]" />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
