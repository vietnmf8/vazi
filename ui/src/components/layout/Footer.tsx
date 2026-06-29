import Link from "next/link";
import { Suspense, type ComponentType } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { Typography } from "@/components/ui/Typography";
import { CopyrightYear } from "./CopyrightYear";
import { SubscribeForm } from "@/components/ui/SubscribeForm";
import { Mail, Phone, MapPin } from "lucide-react";

import FacebookIcon from "@/assets/icons/social/Facebook.svg";
import WhatsAppIcon from "@/assets/icons/social/WhatsApp.svg";
import { getFooterSettings } from "@/lib/api/footer.api";

const SOCIAL_ICON_MAP: Record<string, ComponentType<{ className?: string }>> = {
    facebook: FacebookIcon,
    whatsapp: WhatsAppIcon,
};

const linkClassName =
    "text-sm text-[var(--color-text-muted)] transition-all hover:text-[var(--color-text-primary)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface-1)] rounded-sm";

const sectionHeadingClassName = "mb-4 section-label";

const contactCardClassName =
    "group flex items-start gap-4 p-5 rounded-[18px] bg-[var(--color-surface-2)] border border-[var(--color-border)] transition-all duration-300 hover:border-[rgba(200,150,90,0.3)] hover:-translate-y-0.5 hover:shadow-md cursor-default";

const socialIconClassName =
    "p-2 rounded-lg bg-[var(--color-surface-1)] border border-[var(--color-border)] text-[var(--color-text-muted)] transition-all duration-300 hover:text-[var(--color-primary)] hover:border-[var(--color-primary)]";

/**
 * Footer toàn site — Phase 5 redesign: Modern 2026 Travel.
 * Server Component — không dùng event handlers.
 */
export async function Footer() {
    const t = await getTranslations("Footer");
    const locale = await getLocale();
    const contact = await getFooterSettings();

    return (
        <footer
            role="contentinfo"
            data-ai-id="footer"
            data-ai-desc="Chân trang web chứa thông tin liên hệ và biểu mẫu đăng ký email"
            className="relative z-10 mt-auto border-t border-[var(--color-border)] bg-[var(--color-bg)] dark:bg-[var(--color-surface-4)]"
        >
            <div className="mx-auto max-w-7xl px-4 py-12 md:py-16 sm:px-6 lg:px-8">
                {/* ── Top Contact Band — 3 cards ── */}
                <div className="ft-info grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 border-b border-[var(--color-border)] pb-10">
                    {/* Hotlines Card */}
                    <div className={contactCardClassName}>
                        <div className="p-3 shrink-0 rounded-[12px] bg-[var(--color-primary-subtle)] text-[var(--color-primary)]">
                            <Phone className="size-5" />
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                                {t("hotline_support")}
                            </span>
                            <a
                                href={`tel:${contact.hotline.replace(/[.\s]/g, "")}`}
                                className="text-sm font-semibold text-[var(--color-text-primary)] hover:text-[var(--color-primary)] transition-all"
                            >
                                {contact.hotline}
                            </a>
                            <a
                                href={`tel:${contact.hotlineTel.replace(/-/g, "")}`}
                                className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-all"
                            >
                                {t("tel")} {contact.hotlineTel}
                            </a>
                            <span className="text-xs text-emerald-500 font-medium">
                                {t("whatsapp_priority_desc")}
                            </span>
                        </div>
                    </div>

                    {/* Email Card */}
                    <div className={contactCardClassName}>
                        <div className="p-3 shrink-0 rounded-[12px] bg-[var(--color-primary-subtle)] text-[var(--color-primary)]">
                            <Mail className="size-5" />
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                                {t("support_email")}
                            </span>
                            <a
                                href={`mailto:${contact.email}`}
                                className="text-sm font-semibold text-[var(--color-text-primary)] hover:text-[var(--color-primary)] transition-all break-all"
                            >
                                {contact.email}
                            </a>
                            <span className="text-xs text-[var(--color-text-muted)]">
                                {t("response_time")}
                            </span>
                        </div>
                    </div>

                    {/* Address Card */}
                    <div className={contactCardClassName}>
                        <div className="p-3 shrink-0 rounded-[12px] bg-[var(--color-primary-subtle)] text-[var(--color-primary)]">
                            <MapPin className="size-5" />
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                                {t("hanoi_office")}
                            </span>
                            <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                                {contact.address.district}
                            </span>
                            <span className="text-xs text-[var(--color-text-muted)]">
                                {contact.address.city}
                            </span>
                        </div>
                    </div>
                </div>

                {/* ── Main 4-column grid ── */}
                <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
                    {/* Brand Column */}
                    <div className="flex flex-col gap-4">
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] rounded-sm"
                            aria-label="VietnamEVisa — Home"
                        >
                            <div className="relative h-[48px] flex items-center">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src="/logo-lm.png"
                                    alt="VietnamEVisa Logo"
                                    className="block dark:hidden h-[48px] w-auto object-contain animate-none"
                                />
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src="/logo-dm.png"
                                    alt="VietnamEVisa Logo"
                                    className="hidden dark:block h-[48px] w-auto object-contain animate-none"
                                />
                            </div>
                        </Link>

                        <Typography
                            variant="caption"
                            as="p"
                            className="leading-relaxed text-[var(--color-text-muted)]"
                        >
                            {t("description")}
                        </Typography>

                        {/* Social Icons Row */}
                        <div className="flex items-center gap-2 mt-2">
                            {contact.socialLinks.map((social) => {
                                const Icon = SOCIAL_ICON_MAP[social.platform];
                                if (!Icon) return null;
                                return (
                                    <a
                                        key={social.platform}
                                        href={social.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label={social.label}
                                        className={socialIconClassName}
                                    >
                                        <Icon className="size-4 fill-current" aria-hidden={true} />
                                    </a>
                                );
                            })}
                        </div>

                        {/* Government Disclaimer */}
                        <div className="mt-2 border-t border-[var(--color-border)] pt-3">
                            <p className="text-[9px] uppercase font-bold text-[var(--color-primary)] tracking-wider mb-1">
                                {t("gov_disclaimer")}
                            </p>
                            <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                                {t("gov_disclaimer_desc")}
                            </p>
                        </div>
                    </div>

                    {/* Quick Links Column */}
                    <div>
                        <h2 className={sectionHeadingClassName}>{t("quick_links")}</h2>
                        <ul className="space-y-3" role="list">
                            {contact.footerQuickLinks.map((link) => (
                                <li key={link.href}>
                                    <Link
                                        href={link.href}
                                        className={linkClassName}
                                    >
                                        {link.translations[locale] || link.translations.en}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Guide Column */}
                    <div>
                        <h2 className={sectionHeadingClassName}>{t("guide")}</h2>
                        <ul className="space-y-3" role="list">
                            {contact.footerGuideLinks.map((link) => (
                                <li key={link.href}>
                                    <Link
                                        href={link.href}
                                        className={linkClassName}
                                    >
                                        {link.translations[locale] || link.translations.en}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Subscribe Column */}
                    <div>
                        <h2 className={sectionHeadingClassName}>
                            {t("stay_updated")}
                        </h2>
                        <SubscribeForm />
                    </div>
                </div>

                <div className="mt-10 pt-6 border-t border-[var(--color-border-strong)]">
                    <p className="text-center caption-text">
                        &copy;{" "}
                        <Suspense
                            fallback={<span aria-hidden="true">2026</span>}
                        >
                            <CopyrightYear />
                        </Suspense>{" "}
                        {t("all_rights_reserved")}
                    </p>
                </div>
            </div>
        </footer>
    );
}
