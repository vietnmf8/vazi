"use client";

import { AlertCircle } from "lucide-react";
import WhatsAppIcon from "@/assets/icons/social/WhatsApp.svg";
import { useTranslations } from "next-intl";

interface EmergencyNoticeBannerProps {
    whatsappUrl?: string;
    email?: string;
}

export function EmergencyNoticeBanner({
    whatsappUrl = "https://wa.me/84965800392",
    email = "thanhdatvietnamvisa@gmail.com",
}: EmergencyNoticeBannerProps = {}) {
    const t = useTranslations("HomePage.EmergencyNotice");
    return (
        <div className="w-full py-6 px-4 sm:px-6 lg:px-16">
            <div className="mx-auto max-w-(--container-wide)">
                <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-100/90 via-amber-50/80 to-white/50 px-6 py-8 shadow-md backdrop-blur-md transition-all duration-300 hover:shadow-lg hover:border-amber-400 dark:bg-none dark:dark-glass dark:hover:border-amber-300/80 ">
                    {/* Elegant ambient glow */}
                    <div className="absolute -left-10 -top-10 w-48 h-48 rounded-full bg-amber-200/40 dark:bg-amber-500/5 blur-3xl pointer-events-none" />

                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-5 text-center md:text-left">
                        <div className="flex flex-col sm:flex-row items-center gap-4">
                            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 border border-amber-500/30 text-(--color-primary) shadow-sm animate-pulse">
                                <AlertCircle className="size-5" />
                            </div>
                            <div className="space-y-1">
                                <h4 className="section-subtitle !text-base text-(--color-primary)">
                                    {t("title")}
                                </h4>
                                <p className="text-sm text-stone-900 dark:text-stone-300 leading-relaxed max-w-3xl">
                                    {t("need_an")}
                                    <strong className="text-(--color-primary) font-extrabold bg-amber-200/60 dark:bg-amber-950/50 px-1.5 py-0.5 rounded">
                                        {t("emergency_visa")}
                                    </strong>
                                    {t("desc")}
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                            <a
                                href={whatsappUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex h-12 text-base items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-2.5 font-bold text-white shadow-md shadow-emerald-600/10 transition-all hover:scale-[1.02] active:scale-[0.98] border border-emerald-500/20 w-full sm:w-auto"
                            >
                                <WhatsAppIcon className="size-4 fill-white" aria-hidden="true" />
                                WhatsApp 24/7
                            </a>
                            <a
                                href={`mailto:${email}`}
                                className="inline-flex h-12 text-base items-center justify-center gap-1 px-4 py-2.5 font-bold text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white transition-all border border-stone-300 dark:border-white/40 rounded-xl hover:bg-stone-50 dark:hover:bg-stone-900/60 hover:border-stone-400 dark:hover:border-stone-700 w-full sm:w-auto "
                            >
                                {email}
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
