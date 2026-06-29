import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { PageBanner } from "@/components/layout/PageBanner";
import { EmergencyInquiryForm } from "./_components/EmergencyInquiryForm";
import { EmergencyPricing } from "./_components/EmergencyPricing";
import { EmergencyTimeline } from "./_components/EmergencyTimeline";
import { CorrectionService } from "./_components/CorrectionService";
import { getPricing } from "@/lib/api/pricing.api";
import { getEmergencyInquirySettings } from "@/lib/api/emergency-inquiry.api";
import { getLocale } from "next-intl/server";

export const metadata: Metadata = {
    title: "Emergency Inquiry",
    description: "Urgent visa support for travelers with imminent departure.",
};

export default async function EmergencyInquiryPage() {
    const locale = await getLocale();
    const [pricing, settingsRes] = await Promise.all([
        getPricing().catch(() => undefined),
        getEmergencyInquirySettings().catch(() => null)
    ]);
    
    const settings = settingsRes || {};
    const heroContent = settings.hero?.[locale] || settings.hero?.en || {};
    const pricingContent = settings.pricing?.[locale] || settings.pricing?.en || {};
    const timelineContent = settings.timeline?.[locale] || settings.timeline?.en || {};

    return (
        <div className="min-h-screen">
            <PageBanner
                title={heroContent.title || "Emergency Inquiry"}
                subtitle={heroContent.subtitle || ""}
                breadcrumb={[
                    { label: "Home", href: "/" },
                    { label: heroContent.title || "Emergency Inquiry" },
                ]}
            />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
                <div className="space-y-10">
                    <div
                        className="flex items-start gap-4 rounded-xl border border-amber-500/30 bg-[rgba(251,191,36,0.08)] px-6 py-5"
                        role="alert"
                    >
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-500/15">
                            <AlertTriangle className="size-5 text-(--color-primary)" aria-hidden />
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-bold text-(--color-primary) uppercase tracking-wide mb-1">
                                {heroContent.alert_title}
                            </p>
                            <p className="text-sm text-(--color-text-secondary) leading-relaxed">
                                {heroContent.alert_desc_prefix}{" "}
                                <Link
                                    href="/contact-us"
                                    className="text-(--color-primary) hover:text-(--color-primary-light) underline-offset-4 hover:underline transition-all font-semibold"
                                >
                                    {heroContent.alert_desc_link}
                                </Link>{" "}
                                {heroContent.alert_desc_suffix}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
                        <div className="lg:col-span-7 space-y-12">
                            <EmergencyPricing pricing={pricing} config={pricingContent} />
                            <EmergencyTimeline config={timelineContent} />
                        </div>

                        <div className="lg:col-span-5 space-y-8 lg:sticky lg:top-24">
                            <EmergencyInquiryForm />
                            <CorrectionService />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
