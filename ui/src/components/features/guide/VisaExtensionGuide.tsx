"use client"

import { ArticleLayout } from "./ArticleLayout"
import { ArticleContent } from "./ArticleContent"
import { ArticleSection } from "./ArticleSection"
import type { Article } from "@/types/api"
import { CheckCircle2, XCircle, Clock, Calendar, FileText, Shield, ArrowRight, ChevronRight } from "lucide-react"
import Image from "next/image"
import { useTranslations } from "next-intl"

export interface VisaExtensionGuideProps {
  article: Article
}

export function VisaExtensionGuide({ article }: VisaExtensionGuideProps) {
  const t = useTranslations("VisaExtensionGuide")

  const TOC_SECTIONS = [
    { id: "definitions", label: t("definitions.title") },
    { id: "visa-types", label: t("visaTypes.title") },
    { id: "procedures", label: t("procedures.title") },
    { id: "why-us", label: t("whyUs.title") },
    { id: "faq", label: t("faq.title") },
  ]

  return (
    <ArticleLayout article={article} tocSections={TOC_SECTIONS}>
      <ArticleContent>

        {/* Section 1: Definitions */}
        <ArticleSection id="definitions" title={t("definitions.title")} titleClassName="mb-10 text-center">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Visa Period */}
              <div className="md:col-span-7 group relative rounded-3xl border border-(--color-border) bg-(--color-surface-2) p-8 transition-all hover:shadow-lg overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Calendar className="w-24 h-24 text-(--color-primary)" />
                </div>
                <h3 className="text-2xl font-bold mb-4 flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-(--color-primary-subtle) text-(--color-primary)">
                    <Calendar className="w-5 h-5" />
                  </span>
                  {t("definitions.visaPeriod")}
                </h3>
                <p className="text-stone-600 dark:text-stone-400 leading-relaxed relative z-10">
                  {t("definitions.visaPeriodDesc")}
                </p>
              </div>

              {/* Visa Period Image */}
              <div className="md:col-span-5 relative rounded-3xl overflow-hidden min-h-[200px] shadow-sm">
                <Image 
                  src={article.metadata?.visaPeriodImage || "/images/guide/visa-period.jpg"} 
                  className="object-cover object-center transition-transform duration-700 hover:scale-105" 
                  alt="Visa Period"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>

              {/* Temporary Stay Image */}
              <div className="md:col-span-5 relative rounded-3xl overflow-hidden min-h-[200px] shadow-sm hidden md:block">
                <Image 
                  src={article.metadata?.tempStayImage || "/images/guide/voa.jpg"} 
                  className="object-cover object-center transition-transform duration-700 hover:scale-105" 
                  alt="Temporary Stay"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>

              {/* Temporary Stay */}
              <div className="md:col-span-7 group relative rounded-3xl border border-(--color-border) bg-(--color-surface-2) p-8 transition-all hover:shadow-lg overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Clock className="w-24 h-24 text-(--color-primary)" />
                </div>
                <h3 className="text-2xl font-bold mb-4 flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-(--color-primary-subtle) text-(--color-primary)">
                    <Clock className="w-5 h-5" />
                  </span>
                  {t("definitions.tempStay")}
                </h3>
                <p className="text-stone-600 dark:text-stone-400 leading-relaxed relative z-10">
                  {t("definitions.tempStayDesc")}
                </p>
              </div>

              {/* Temporary Stay Image - Mobile */}
              <div className="md:col-span-5 relative rounded-3xl overflow-hidden min-h-[200px] shadow-sm block md:hidden">
                <Image 
                  src={article.metadata?.tempStayImage || "/images/guide/voa.jpg"} 
                  className="object-cover object-center transition-transform duration-700 hover:scale-105" 
                  alt="Temporary Stay"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
            </div>

            <div className="mt-8 p-6 rounded-2xl bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-900/50">
              <p className="text-(--color-primary) font-medium">
                <strong dangerouslySetInnerHTML={{ __html: t.raw("definitions.whatIs") }} /> {t("definitions.whatIsDesc")}
              </p>
          </div>
        </ArticleSection>

        {/* Section 2: Visa Types */}
        <ArticleSection id="visa-types" title={t("visaTypes.title")} titleClassName="mb-10 text-center">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* E-VISA */}
              <div className="md:col-span-7 rounded-3xl border border-red-200 bg-red-50 p-8 dark:bg-red-950/20 dark:border-red-900/50 transition-all hover:-translate-y-1">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-red-900 dark:text-red-400">{t("visaTypes.evisa")}</h3>
                  <XCircle className="w-8 h-8 text-red-500" />
                </div>
                <p className="text-red-800/80 dark:text-red-400/80 font-medium leading-relaxed">
                  {t("visaTypes.evisaDesc")}
                </p>
              </div>

              {/* E-VISA Image */}
              <div className="md:col-span-5 relative rounded-3xl overflow-hidden min-h-[200px] shadow-sm">
                <Image 
                  src={article.metadata?.evisaDeniedImage || "/images/guide/evisa-denied.jpg"} 
                  className="object-cover object-center transition-transform duration-700 hover:scale-105 grayscale opacity-80" 
                  alt="E-Visa Denied"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>

              {/* VOA Image */}
              <div className="md:col-span-5 relative rounded-3xl overflow-hidden min-h-[200px] shadow-sm hidden md:block">
                <Image 
                  src={article.metadata?.voaImage || "/images/guide/voa.jpg"} 
                  className="object-cover object-center transition-transform duration-700 hover:scale-105" 
                  alt="Visa On Arrival"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>

              {/* VOA */}
              <div className="md:col-span-7 rounded-3xl border border-emerald-200 bg-emerald-50 p-8 dark:bg-emerald-950/20 dark:border-emerald-900/50 transition-all hover:-translate-y-1">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-emerald-900 dark:text-emerald-400">{t("visaTypes.voa")}</h3>
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                </div>
                <p className="text-emerald-800/80 dark:text-emerald-400/80 font-medium leading-relaxed mb-4">
                  {t("visaTypes.voaDesc")}
                </p>
                <ul className="space-y-2 text-emerald-800/70 dark:text-emerald-400/70 text-sm">
                  <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {t("visaTypes.voa1")}</li>
                  <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {t("visaTypes.voa2")}</li>
                  <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {t("visaTypes.voa3")}</li>
                </ul>
              </div>

              {/* VOA Image - Mobile */}
              <div className="md:col-span-5 relative rounded-3xl overflow-hidden min-h-[200px] shadow-sm block md:hidden">
                <Image 
                  src={article.metadata?.voaImage || "/images/guide/voa.jpg"} 
                  className="object-cover object-center transition-transform duration-700 hover:scale-105" 
                  alt="Visa On Arrival"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
            </div>
        </ArticleSection>

        {/* Section 3: Procedures */}
        <ArticleSection id="procedures">
          <div className="text-center mb-16">
            <h2 className="section-title">{t("procedures.title")}</h2>
            <p className="mt-4 section-desc max-w-2xl mx-auto">
              {t("procedures.desc")}
            </p>
          </div>

          <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch lg:gap-6">
              {/* Step 1 */}
              <div className="group relative flex flex-col items-center w-full rounded-2xl border border-(--color-border) bg-(--color-surface-2) p-7 pt-11 text-center transition-all duration-300 hover:-translate-y-1 hover:border-(--color-primary)/30 hover:shadow-md ">
                <span className="absolute top-4 left-4 flex size-8 items-center justify-center rounded-full bg-(--color-primary-subtle) font-mono text-sm font-extrabold text-(--color-primary) shadow-xs">
                  01
                </span>
                <div className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 group-hover:scale-110 transition-transform">
                  <FileText className="h-6 w-6" />
                </div>
                <h3 className="section-subtitle !text-base mb-2 group-hover:text-(--color-primary) transition-all">{t("procedures.step1")}</h3>
                <p className="text-sm leading-relaxed text-stone-500 dark:text-stone-400">
                  {t("procedures.step1Desc")}
                </p>
              </div>

              <div className="hidden lg:flex items-center justify-center shrink-0 text-stone-300"><ChevronRight className="size-7 stroke-[2.5]" /></div>

              {/* Step 2 */}
              <div className="group relative flex flex-col items-center w-full rounded-2xl border border-(--color-border) bg-(--color-surface-2) p-7 pt-11 text-center transition-all duration-300 hover:-translate-y-1 hover:border-(--color-primary)/30 hover:shadow-md ">
                <span className="absolute top-4 left-4 flex size-8 items-center justify-center rounded-full bg-(--color-primary-subtle) font-mono text-sm font-extrabold text-(--color-primary) shadow-xs">
                  02
                </span>
                <div className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-amber-100 text-(--color-primary) group-hover:scale-110 transition-transform">
                  <Clock className="h-6 w-6" />
                </div>
                <h3 className="section-subtitle !text-base mb-2 group-hover:text-(--color-primary) transition-all">{t("procedures.step2")}</h3>
                <p className="text-sm leading-relaxed text-stone-500 dark:text-stone-400">
                  {t("procedures.step2Desc")}
                </p>
              </div>

              <div className="hidden lg:flex items-center justify-center shrink-0 text-stone-300"><ChevronRight className="size-7 stroke-[2.5]" /></div>

              {/* Step 3 */}
              <div className="group relative flex flex-col items-center w-full rounded-2xl border border-(--color-border) bg-(--color-surface-2) p-7 pt-11 text-center transition-all duration-300 hover:-translate-y-1 hover:border-(--color-primary)/30 hover:shadow-md ">
                <span className="absolute top-4 left-4 flex size-8 items-center justify-center rounded-full bg-(--color-primary-subtle) font-mono text-sm font-extrabold text-(--color-primary) shadow-xs">
                  03
                </span>
                <div className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 group-hover:scale-110 transition-transform">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h3 className="section-subtitle !text-base mb-2 group-hover:text-(--color-primary) transition-all">{t("procedures.step3")}</h3>
                <p className="text-sm leading-relaxed text-stone-500 dark:text-stone-400">
                  {t("procedures.step3Desc")}
                </p>
              </div>
            </div>
        </ArticleSection>

        {/* Section 4: Why Us */}
        <ArticleSection id="why-us" title={t("whyUs.title")} titleClassName="mb-10 text-center">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { title: t("whyUsFeatures.noTravel.title"), desc: t("whyUsFeatures.noTravel.desc") },
                { title: t("whyUsFeatures.guaranteed.title"), desc: t("whyUsFeatures.guaranteed.desc") },
                { title: t("whyUsFeatures.noHidden.title"), desc: t("whyUsFeatures.noHidden.desc") },
                { title: t("whyUsFeatures.fast.title"), desc: t("whyUsFeatures.fast.desc") },
              ].map((feature, i) => (
                <div key={i} className="group relative h-full overflow-hidden rounded-[2rem] border border-(--color-border) bg-(--color-surface-2) p-8 transition-all duration-300 hover:border-(--color-primary)/40 hover:-translate-y-1 shadow-[0_15px_30px_-10px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)]">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-(--color-primary-subtle) text-(--color-primary) mb-6 transition-all duration-500 ease-out group-hover:scale-110 group-hover:rotate-3">
                    <Shield className="w-6 h-6" aria-hidden="true" />
                  </div>
                  <h4 className="text-lg font-bold text-(--color-text-primary) mb-3 tracking-tight">{feature.title}</h4>
                  <p className="text-sm text-(--color-text-secondary) leading-relaxed">{feature.desc}</p>
                  <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-(--color-primary)/2 rounded-full blur-xl pointer-events-none group-hover:bg-(--color-primary)/5 transition-all duration-300" />
                </div>
              ))}
            </div>
        </ArticleSection>

        {/* Section 5: FAQ - Using native HTML details for simplicity, but styled nicely */}
        <ArticleSection id="faq" title={t("faq.title")} titleClassName="mb-10 text-center" className="max-w-3xl mx-auto w-full">
          <div className="space-y-4">
              {[
                {
                  q: t("faqs.q1.q"),
                  a: t("faqs.q1.a")
                },
                {
                  q: t("faqs.q2.q"),
                  a: t("faqs.q2.a")
                },
                {
                  q: t("faqs.q3.q"),
                  a: t("faqs.q3.a")
                }
              ].map((faq, i) => (
                <details key={i} className="group rounded-2xl border border-(--color-border) bg-(--color-surface-2) overflow-hidden open:shadow-md transition-all">
                  <summary className="flex items-center justify-between p-6 font-bold text-lg marker:content-none hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-all">
                    {faq.q}
                    <ChevronRight className="w-5 h-5 transition-transform group-open:rotate-90" />
                  </summary>
                  <div className="px-6 pb-6 text-stone-600 dark:text-stone-400 leading-relaxed border-t border-(--color-border) pt-4">
                    {faq.a}
                  </div>
                </details>
              ))}
            </div>
        </ArticleSection>

      </ArticleContent>
    </ArticleLayout>
  )
}
