"use client"

import { ArticleLayout } from "./ArticleLayout"
import { ArticleContent } from "./ArticleContent"
import { ArticleSection } from "./ArticleSection"
import type { Article } from "@/types/api"
import { CreditCard, MapPin, Info, AlertCircle, Phone, Mail, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useTranslations } from "next-intl"

export function PaymentGuideline() {
  const t = useTranslations("PaymentGuideline")
  const tMock = useTranslations("mockGuideContent")

  const mockArticle: Article = {
    id: "payment-guideline",
    slug: "payment-guideline",
    title: t("heroTitle"),
    subtitle: t("heroSubtitle"),
    type: "guide",
    image_url: "/images/guide/payment-cover.jpg",
    created_at: "2024-05-15T00:00:00Z",
  }

  const TOC_SECTIONS = [
    { id: "payment-options", label: t("toc.paymentOptions") },
    { id: "special-notes", label: t("toc.specialNotes") },
    { id: "need-help", label: t("toc.needHelp") },
  ]

  return (
    <ArticleLayout article={mockArticle} tocSections={TOC_SECTIONS}>
      <ArticleContent>

        {/* Section 1: Payment Options */}
        <ArticleSection id="payment-options" title={t("options.title")}>
          <p className="text-center text-stone-600 dark:text-stone-400 mb-12 max-w-2xl mx-auto">
            {t("options.desc")}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Option 1: Paypal */}
              <div className="group relative rounded-3xl border border-(--color-border) bg-(--color-surface-2) p-8 transition-all hover:shadow-xl overflow-hidden flex flex-col h-full">
                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                  <CreditCard className="w-32 h-32 text-blue-500" />
                </div>
                
                <div className="mb-6 relative z-10 flex items-center gap-4">
                  <div className="flex size-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                    <CreditCard className="w-7 h-7" />
                  </div>
                  <div>
                    <span className="text-sm font-bold tracking-wider text-blue-600 dark:text-blue-400 uppercase">{t("options.opt1")}</span>
                    <h3 className="text-2xl font-bold">{t("options.paypal.title")}</h3>
                  </div>
                </div>

                <div className="relative z-10 flex-1 space-y-4 text-stone-600 dark:text-stone-400 leading-relaxed">
                  <p>
                    {t.rich("options.paypal.desc1", {
                      strong: (chunks) => <strong className="font-bold text-stone-900 dark:text-white">{chunks}</strong>
                    })}
                  </p>
                  <p>
                    {t("options.paypal.desc2")}
                  </p>
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium">
                    <Mail className="w-4 h-4" />
                    support@vietnamevisa.com
                  </div>
                  <div className="mt-6 pt-6 border-t border-stone-100 dark:border-stone-800">
                    <blockquote className="italic text-sm text-stone-500 border-l-2 border-blue-200 dark:border-blue-800 pl-4">
                      {t("options.paypal.quote")}
                    </blockquote>
                  </div>
                </div>
              </div>
              
              {/* Option 2: Cash in Office */}
              <div className="group relative rounded-3xl border border-(--color-border) bg-(--color-surface-2) p-8 transition-all hover:shadow-xl overflow-hidden flex flex-col h-full">
                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                  <MapPin className="w-32 h-32 text-emerald-500" />
                </div>
                
                <div className="mb-6 relative z-10 flex items-center gap-4">
                  <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                    <MapPin className="w-7 h-7" />
                  </div>
                  <div>
                    <span className="text-sm font-bold tracking-wider text-emerald-600 dark:text-emerald-400 uppercase">{t("options.opt2")}</span>
                    <h3 className="text-2xl font-bold">{t("options.cash.title")}</h3>
                  </div>
                </div>

                <div className="relative z-10 flex-1 space-y-4 text-stone-600 dark:text-stone-400 leading-relaxed">
                  <p>
                    {t("options.cash.desc1")}
                  </p>
                  <p>
                    {t("options.cash.desc2")}
                  </p>
                  <div className="bg-stone-50 dark:bg-stone-800/50 p-4 rounded-xl border border-stone-200 dark:border-stone-700 mt-4">
                    <h4 className="font-semibold text-stone-900 dark:text-stone-100 mb-2 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-emerald-500" />
                      {t("options.cash.officeTitle")}
                    </h4>
                    <address className="not-italic text-sm">
                      {t("options.cash.officeDesc1")}<br/>
                      <strong>{t("options.cash.officeDesc2")}</strong>
                    </address>
                  </div>
                </div>
              </div>
            </div>
        </ArticleSection>

        {/* Section 2: Special Notes */}
        <ArticleSection id="special-notes" title={t("notes.title")} titleClassName="mb-8 text-center">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="relative rounded-3xl overflow-hidden aspect-video shadow-lg md:order-2">
                <Image 
                  src="/images/guide/payment-notes.jpg" 
                  className="object-cover object-center transition-transform duration-700 hover:scale-105" 
                  alt={t("notes.imgAlt")} 
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                  <p className="text-white font-medium">{t("notes.imgDesc")}</p>
                </div>
              </div>

              <div className="space-y-6 md:order-1">
                <div className="flex items-start gap-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-(--color-primary-subtle) text-(--color-primary)">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg mb-2">{t("notes.processTitle")}</h4>
                    <p className="text-stone-600 dark:text-stone-400">
                      {t.rich("notes.processDesc", {
                        strong: (chunks) => <strong className="font-bold text-stone-900 dark:text-white">{chunks}</strong>
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-(--color-primary) dark:bg-amber-900/30">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg mb-2">{t("notes.feeTitle")}</h4>
                    <p className="text-stone-600 dark:text-stone-400 mb-2">
                      {t.rich("notes.feeDesc", {
                        strong: (chunks) => <strong className="font-bold text-stone-900 dark:text-white">{chunks}</strong>
                      })}
                    </p>
                    <Link href="/guide/vietnam-visa-fees" className="text-(--color-primary) font-semibold hover:underline inline-flex items-center gap-1 transition-all">
                      {t("notes.viewFee")}
                    </Link>
                  </div>
                </div>
              </div>
          </div>
        </ArticleSection>

        {/* Section 3: Need Help */}
        <ArticleSection id="need-help">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-3xl p-8 md:p-12 border border-blue-100 dark:border-blue-900/50 text-center max-w-4xl mx-auto">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400 mb-6">
                <Info className="w-8 h-8" />
              </div>
              <h2 className="text-3xl font-bold mb-4">{t("help.title")}</h2>
              <p className="text-lg text-stone-600 dark:text-stone-400 mb-8 max-w-2xl mx-auto">
                {t("help.desc")}
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8">
                <a href="https://wa.me/84936699869" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-white dark:bg-stone-800 shadow-sm hover:shadow-md transition-shadow border border-stone-200 dark:border-stone-700 w-full sm:w-auto">
                  <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-full text-green-600 dark:text-green-400">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs text-stone-500 font-medium uppercase tracking-wider">{t("help.hotline")}</div>
                    <div className="font-bold text-stone-900 dark:text-white">(+84) 93-6699-869</div>
                  </div>
                </a>
                
                <a href="mailto:support@vietnamevisa.com" className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-white dark:bg-stone-800 shadow-sm hover:shadow-md transition-shadow border border-stone-200 dark:border-stone-700 w-full sm:w-auto">
                  <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full text-blue-600 dark:text-blue-400">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs text-stone-500 font-medium uppercase tracking-wider">{t("help.email")}</div>
                    <div className="font-bold text-stone-900 dark:text-white">support@vietnamevisa.com</div>
                  </div>
                </a>
              </div>
          </div>
        </ArticleSection>

      </ArticleContent>
    </ArticleLayout>
  )
}
