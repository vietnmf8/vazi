import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getPricingPreview, getHomeConfig } from "@/lib/api/home.api";
import { getLocale, getTranslations } from "next-intl/server";

/**
 * Preview 3 gói E-Visa — 3 cấp độ trực quan rõ ràng:
 * Tier 0 (standard): card trắng, viền mỏng, không elevation.
 * Tier 1 (featured "Best Value"): amber gradient, viền vàng, scale-up nhẹ, shadow-lg.
 * Tier 2 (premium): viền teal đậm, slight elevation — phân biệt với tier 0.
 */
export async function PricingPreview({ data: initialData }: { data?: any }) {
    const locale = await getLocale();
    let data = initialData;
    if (!data) {
        const homeConfigData = await getHomeConfig(locale);
        data = homeConfigData?.pricingPreview?.[locale] || homeConfigData?.pricingPreview?.en || {};
    }
    const t = (key: string) => data?.[key] || "";
    const plans = await getPricingPreview(locale).catch(() => []);

    return (
        <section
            id="pricing"
            data-ai-target="pricing"
            aria-labelledby="pricing-heading"
            className="w-full py-12 md:py-16 lg:py-20"
        >
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-16">
                {/* Section header */}
                <div className="text-center mb-14">
                    <h2 id="pricing-heading" className="section-title">
                        {t("title")}
                    </h2>
                    <p className="mt-4 section-desc max-w-150 mx-auto">
                        {t("desc")}
                    </p>
                </div>

                {/* Pricing cards — equal height stretched */}
                <ul className="grid gap-6 md:grid-cols-3 md:items-stretch">
                    {plans.map((plan, index) => {
                        const tier =
                            index === 0
                                ? "standard"
                                : index === 1
                                ? "featured"
                                : "premium";

                        const cardClass = {
                            standard:
                                "relative flex w-full h-full flex-col overflow-hidden rounded-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md border border-(--color-border) bg-(--color-surface-1) dark:dark-glass",
                            featured:
                                "premium-gradient-border relative flex w-full h-full flex-col overflow-hidden rounded-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl shadow-lg",
                            premium:
                                "relative flex w-full h-full flex-col overflow-hidden rounded-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-lg border-2 border-(--color-secondary)/40 bg-(--color-surface-1) shadow-sm dark:dark-glass",
                        }[tier];

                        return (
                            <li key={plan.id || plan.key} className="flex">
                                <div className={cardClass}>
                                    {/* Best Value badge */}
                                    {tier === "featured" && (
                                        <span className="absolute right-4 top-6 rounded-full bg-(--color-primary-subtle) px-3 py-1 text-xs font-extrabold tracking-wider uppercase font-body text-(--color-primary) border border-(--color-primary)/30">
                                            {t("best_value")}
                                        </span>
                                    )}

                                    {/* Popular badge */}
                                    {tier === "premium" && (
                                        <span className="absolute right-4 top-5 rounded-full bg-(--color-secondary-subtle) px-3 py-1 text-xs font-extrabold tracking-wider uppercase font-body text-(--color-secondary) border border-(--color-secondary)/30">
                                            {t("popular")}
                                        </span>
                                    )}

                                    <div className="flex flex-1 flex-col p-6 pt-5">
                                        {/* Plan name — bold for clear hierarchy */}
                                        <h3 className="section-subtitle pr-24">
                                            {plan.name}
                                        </h3>

                                        {/* Price */}
                                        <div className="mt-4 flex items-baseline gap-1">
                                            <span
                                                className={[
                                                    "font-family-mono text-4xl font-semibold",
                                                    tier === "featured"
                                                        ? "text-(--color-primary)"
                                                        : tier === "premium"
                                                        ? "text-(--color-secondary)"
                                                        : "text-(--color-primary)",
                                                ].join(" ")}
                                            >
                                                ${plan.price}
                                            </span>
                                            <span className="text-sm text-(--color-text-muted)">
                                                {t("per_person")}
                                            </span>
                                        </div>

                                        {/* Features */}
                                        <div className="mt-4 flex-1 space-y-2">
                                            {plan.processing && (
                                                <div className="flex items-center gap-2">
                                                    <Check
                                                        className="h-4 w-4 shrink-0 text-(--color-secondary)"
                                                        aria-hidden="true"
                                                    />
                                                    <span className="text-sm text-(--color-text-secondary)">
                                                        {plan.processing}
                                                    </span>
                                                </div>
                                            )}
                                            {Array.isArray(plan.features) ? plan.features.map((feature: any, idx: number) => (
                                                <div
                                                    key={idx}
                                                    className="flex items-center gap-2"
                                                >
                                                    <Check
                                                        className="h-4 w-4 shrink-0 text-(--color-secondary)"
                                                        aria-hidden="true"
                                                    />
                                                    <span className="text-sm text-(--color-text-secondary)">
                                                        {feature}
                                                    </span>
                                                </div>
                                            )) : Object.values(plan.features || {}).map((feature: any, idx: number) => (
                                                <div
                                                    key={idx}
                                                    className="flex items-center gap-2"
                                                >
                                                    <Check
                                                        className="h-4 w-4 shrink-0 text-(--color-secondary)"
                                                        aria-hidden="true"
                                                    />
                                                    <span className="text-sm text-(--color-text-secondary)">
                                                        {feature}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>

                                        {/* CTA */}
                                        <div className="mt-6">
                                            <Button
                                                asChild
                                                size="lg"
                                                variant={
                                                    tier === "featured"
                                                        ? "default"
                                                        : "outline"
                                                }
                                                className="w-full rounded-full"
                                            >
                                                <Link href="/apply">{t("apply_btn")}</Link>
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </li>
                        );
                    })}
                </ul>

                {/* Footer link */}
                <div className="mt-10 text-center">
                    <Link
                        href="/guide/vietnam-visa-fees"
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-(--color-text-link) hover:text-(--color-primary) transition-all"
                    >
                        {t("see_full_pricing")}
                        <span aria-hidden="true">→</span>
                    </Link>
                </div>
            </div>
        </section>
    );
}
