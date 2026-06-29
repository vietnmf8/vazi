import type { Metadata } from "next";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { PageBanner } from "@/components/layout/PageBanner";
import { ContactForm } from "./_components/ContactForm";
import { getGlobalSettings } from "@/lib/api/global-settings.api";

export const metadata: Metadata = {
    title: "Contact Us",
    description:
        "Contact FastVisa support for visa application help. Hotline, email, and online contact form.",
};

const CONTACT_ITEMS = [
    {
        icon: Phone,
        label: "Hotline",
        value: "+84 93 6699 869",
        accent: "gold" as const,
    },
    {
        icon: Mail,
        label: "Email",
        value: "support@fastvisa.com",
        accent: "gold" as const,
    },
    {
        icon: MapPin,
        label: "Office",
        value: "Hanoi, Vietnam",
        accent: "gold" as const,
    },
    {
        icon: MessageCircle,
        label: "WhatsApp",
        value: "24/7 Urgent Support",
        accent: "teal" as const,
        href: "https://wa.me/84965800392",
    },
];

/**
 * Contact Us page — 2-column layout: info left, form right.
 * Redesigned: Modern 2026 Travel dark theme.
 */
export default async function ContactUsPage() {
    const settings = await getGlobalSettings({ isPublic: true }).catch(() => ({} as Record<string, any>));
    
    // Fallback to defaults if no DB entries
    const getSetting = (key: string, defaultValue: string) => {
        return settings[key] || defaultValue;
    };

    const dynamicContactItems = [
        {
            icon: Phone,
            label: "Hotline",
            value: getSetting("CONTACT_HOTLINE", "+84 93 6699 869"),
            accent: "gold" as const,
        },
        {
            icon: Mail,
            label: "Email",
            value: getSetting("CONTACT_EMAIL", "support@fastvisa.com"),
            accent: "gold" as const,
        },
        {
            icon: MapPin,
            label: "Office",
            value: getSetting("CONTACT_OFFICE", "Hanoi, Vietnam"),
            accent: "gold" as const,
        },
        {
            icon: MessageCircle,
            label: "WhatsApp",
            value: getSetting("CONTACT_WHATSAPP_LABEL", "24/7 Urgent Support"),
            accent: "teal" as const,
            href: getSetting("CONTACT_WHATSAPP_LINK", "https://wa.me/84965800392"),
        },
    ];

    return (
        <div className="min-h-screen">
            <PageBanner
                title="Contact Us"
                subtitle="Our support team is here to help with your visa application"
                breadcrumb={[
                    { label: "Home", href: "/" },
                    { label: "Contact Us" },
                ]}
            />

            <div className="max-w-275 mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="grid gap-12 lg:grid-cols-3 lg:gap-16">
                    {/* ── Left: Contact Info ── */}
                    <aside className="space-y-8 lg:col-span-1" data-ai-target="contact_info">
                        <div>
                            <p className="section-label mb-3">Reach Us</p>
                            <h2 className="section-subtitle mb-6">
                                Get in Touch
                            </h2>
                            <p className="body-text-sm">
                                Our team is available Monday–Saturday, 8 AM–10
                                PM ICT. Emergency support available 24/7 via
                                WhatsApp.
                            </p>
                        </div>

                        <ul className="space-y-4">
                            {dynamicContactItems.map((item) => {
                                const Icon = item.icon;
                                const iconBg =
                                    item.accent === "teal"
                                        ? "bg-(--color-secondary-subtle)"
                                        : "bg-(--color-primary-subtle)";
                                const iconColor =
                                    item.accent === "teal"
                                        ? "text-(--color-secondary)"
                                        : "text-(--color-primary)";

                                const inner = (
                                    <div className="flex items-start gap-4">
                                        <div
                                            className={`flex size-10 shrink-0 items-center justify-center rounded-full ${iconBg}`}
                                        >
                                            <Icon
                                                className={`h-5 w-5 ${iconColor}`}
                                                aria-hidden
                                            />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold uppercase tracking-wide text-(--color-text-muted) mb-0.5">
                                                {item.label}
                                            </p>
                                            <p className="text-sm font-medium text-(--color-text-primary)">
                                                {item.value}
                                            </p>
                                        </div>
                                    </div>
                                );

                                return (
                                    <li
                                        key={item.label}
                                        className="rounded-xl border border-(--color-border) bg-(--color-surface-2) p-4 hover:border-(--color-border-strong) transition-all"
                                    >
                                        {item.href ? (
                                            <a
                                                href={item.href}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="block"
                                            >
                                                {inner}
                                            </a>
                                        ) : (
                                            inner
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    </aside>

                    {/* ── Right: Contact Form ── */}
                    <div className="lg:col-span-2">
                        <ContactForm />
                    </div>
                </div>
            </div>
        </div>
    );
}
