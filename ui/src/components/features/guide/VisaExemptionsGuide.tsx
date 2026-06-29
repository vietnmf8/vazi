"use client"

import { useState, useMemo } from "react"
import { ArticleLayout } from "./ArticleLayout"
import { ArticleContent } from "./ArticleContent"
import { ArticleSection } from "./ArticleSection"
import type { Article } from "@/types/api"
import type { VisaExemptionCountry } from "@/lib/api/exemption-countries.api"
import { Globe2, FileCheck, CheckCircle2, AlertCircle, Clock, MapPin, Building, ShieldCheck, UserCheck, PlaneLanding, Search, ArrowUpDown } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useTranslations } from "next-intl"

export interface VisaExemptionsGuideProps {
  article: Article
  exemptionCountries: VisaExemptionCountry[]
}

export function VisaExemptionsGuide({ article, exemptionCountries }: VisaExemptionsGuideProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null)
  
  const t = useTranslations("VisaExemptionsGuide")

  const TOC_SECTIONS = [
    { id: "what-is-visa-exemption", label: t("whatIs.title") },
    { id: "requirements", label: t("requirements.title") },
    { id: "list-of-countries", label: t("list.title") },
    { id: "other-cases", label: t("otherCases.title") },
    { id: "extension", label: t("extension.title") },
  ]

  const filteredAndSortedCountries = useMemo(() => {
    let result = exemptionCountries.map(c => ({
      ...c,
      code: c.country_code,
      days: c.exemption_days,
      country: t(`countries.${c.country_code}`),
      daysText: t("days", { count: c.exemption_days })
    }))
    
    if (searchQuery) {
      result = result.filter(c => c.country.toLowerCase().includes(searchQuery.toLowerCase()))
    }
    if (sortConfig) {
      result.sort((a, b) => {
        // @ts-ignore
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        // @ts-ignore
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      })
    }
    return result
  }, [searchQuery, sortConfig, exemptionCountries, t])

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  }

  return (
    <ArticleLayout article={article} tocSections={TOC_SECTIONS}>
      <ArticleContent>
          
        {/* Section 1: What is Visa Exemption? */}
        <ArticleSection id="what-is-visa-exemption" title={t("whatIs.title")}>
          <div className="max-w-4xl mx-auto mb-12">
              <p className="text-lg text-center text-stone-600 dark:text-stone-400 mb-8">
                {t("whatIs.desc")}
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Bilateral */}
                <div className="group relative rounded-3xl border border-(--color-border) bg-(--color-surface-2) p-8 transition-all hover:-translate-y-1 hover:shadow-lg dark:hover:shadow-blue-900/10 overflow-hidden flex flex-col h-full">
                  <div className="mb-6 relative z-10 flex items-center gap-4">
                    <div className="flex size-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                      <Globe2 className="w-7 h-7" />
                    </div>
                    <h3 className="text-2xl font-bold">{t("whatIs.bilateral")}</h3>
                  </div>
                  <div className="relative z-10 flex-1 space-y-4 text-stone-600 dark:text-stone-400 leading-relaxed">
                    <p>
                      {t("whatIs.bilateralDesc")}
                    </p>
                  </div>
                </div>

                {/* Unilateral */}
                <div className="group relative rounded-3xl border border-(--color-border) bg-(--color-surface-2) p-8 transition-all hover:-translate-y-1 hover:shadow-lg dark:hover:shadow-emerald-900/10 overflow-hidden flex flex-col h-full">
                  <div className="mb-6 relative z-10 flex items-center gap-4">
                    <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                      <PlaneLanding className="w-7 h-7" />
                    </div>
                    <h3 className="text-2xl font-bold">{t("whatIs.unilateral")}</h3>
                  </div>
                  <div className="relative z-10 flex-1 space-y-4 text-stone-600 dark:text-stone-400 leading-relaxed">
                    <p>
                      {t("whatIs.unilateralDesc")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/50 rounded-2xl p-6 flex items-start gap-4">
                <AlertCircle className="w-6 h-6 text-blue-600 dark:text-blue-400 shrink-0 mt-1" />
                <p className="text-blue-900 dark:text-blue-200 text-sm">
                  {t("whatIs.note")}
                </p>
              </div>
            </div>
        </ArticleSection>

        {/* Section 2: Requirements */}
        <ArticleSection id="requirements" title={t("requirements.title")} titleClassName="mb-8 text-center">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center max-w-6xl mx-auto">
              <div className="relative rounded-3xl overflow-hidden aspect-[4/3] shadow-lg">
                <Image 
                  src={article.metadata?.coverImage || "/images/guide/exemptions-cover.jpg"} 
                  className="object-cover object-center transition-transform duration-700 hover:scale-105" 
                  alt="Passport Requirements" 
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-8">
                  <p className="text-white font-medium text-lg">{t("requirements.desc")}</p>
                </div>
              </div>

              <div className="flex flex-col gap-6">
                <div className="group flex items-start gap-6 p-6 rounded-3xl bg-(--color-surface-2) border border-(--color-border) transition-all hover:shadow-lg dark:hover:shadow-emerald-900/10">
                  <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                    <Globe2 className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg mb-2">{t("requirements.nationality")}</h4>
                    <p className="text-stone-600 dark:text-stone-400">
                      {t("requirements.nationalityDesc")}
                    </p>
                  </div>
                </div>
                
                <div className="group flex items-start gap-6 p-6 rounded-3xl bg-(--color-surface-2) border border-(--color-border) transition-all hover:shadow-lg dark:hover:shadow-blue-900/10">
                  <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                    <Clock className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg mb-2">{t("requirements.validity")}</h4>
                    <p className="text-stone-600 dark:text-stone-400">
                      {t("requirements.validityDesc")}
                    </p>
                  </div>
                </div>
                
                <div className="group flex items-start gap-6 p-6 rounded-3xl bg-(--color-surface-2) border border-(--color-border) transition-all hover:shadow-lg dark:hover:shadow-purple-900/10">
                  <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
                    <FileCheck className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg mb-2">{t("requirements.blankPages")}</h4>
                    <p className="text-stone-600 dark:text-stone-400">
                      {t("requirements.blankPagesDesc")}
                    </p>
                  </div>
                </div>
          </div>
          </div>
        </ArticleSection>

        {/* Section 3: List of Countries */}
        <ArticleSection id="list-of-countries" title={t("list.title")}>
          <p className="text-center text-stone-600 dark:text-stone-400 mb-12 max-w-2xl mx-auto">
              {t("list.desc")}
            </p>

            <div className="max-w-5xl mx-auto">
              <div className="mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="relative w-full sm:max-w-md">
                  <input
                    type="search"
                    placeholder={t("list.search")}
                    className="block w-full bg-(--color-surface-1) border border-(--color-border-strong) rounded-sm py-3 pr-4 pl-11 text-base text-(--color-text-primary) placeholder:text-(--color-text-muted) focus:border-(--color-primary) focus:shadow-[0_0_0_3px_rgba(200,150,90,0.15)] focus:outline-none transition-all duration-200"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-stone-400" />
                  </div>
                </div>
                <div className="text-sm text-stone-500">
                  {t("list.showing", { count: filteredAndSortedCountries.length })}
                </div>
              </div>

              <div className="overflow-hidden rounded-3xl border border-(--color-border) bg-(--color-surface-2) shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-stone-50 dark:bg-stone-800/50">
                        <th className="p-4 font-semibold border-b border-(--color-border) text-center w-16">
                          {t("list.tableNo")}
                        </th>
                        <th className="p-4 font-semibold border-b border-(--color-border) hover:bg-stone-100 dark:hover:bg-stone-800 transition-all select-none outline-none focus:outline-none min-w-[200px]" onClick={() => requestSort('country')}>
                          <div className="flex items-center gap-2">
                            {t("list.tableNationality")}
                            <ArrowUpDown className="w-4 h-4 text-stone-400" />
                          </div>
                        </th>
                        <th className="p-4 font-semibold border-b border-(--color-border) hover:bg-stone-100 dark:hover:bg-stone-800 transition-all select-none outline-none focus:outline-none w-[200px]" onClick={() => requestSort('days')}>
                          <div className="flex items-center gap-2">
                            {t("list.tableDays")}
                            <ArrowUpDown className="w-4 h-4 text-stone-400" />
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAndSortedCountries.map((row, index) => (
                        <tr key={row.code} className="border-b border-(--color-border) last:border-0 hover:bg-stone-50/50 dark:hover:bg-stone-800/30 transition-all">
                          <td className="p-4 text-center text-stone-500">{index + 1}</td>
                          <td className="p-4 font-medium flex items-center gap-3">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={`https://flagcdn.com/w40/${row.code}.png`} alt={`${row.country} flag`} className="w-6 h-auto rounded-sm shadow-sm" loading="lazy" />
                            {row.country}
                          </td>
                          <td className="p-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                              {row.daysText}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {filteredAndSortedCountries.length === 0 && (
                        <tr>
                          <td colSpan={3} className="p-8 text-center text-stone-500">
                            {t("list.noData", { query: searchQuery })}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            <div className="max-w-3xl mx-auto mt-8 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-6 text-sm text-(--color-primary)">
              <h4 className="font-bold flex items-center gap-2 mb-2">
                <AlertCircle className="w-5 h-5" />
                {t("list.notesTitle")}
              </h4>
              <ul className="list-disc pl-6 space-y-2">
                <li><span dangerouslySetInnerHTML={{ __html: t.raw("list.note1") }} /></li>
                <li><span dangerouslySetInnerHTML={{ __html: t.raw("list.note2") }} /></li>
                <li><span dangerouslySetInnerHTML={{ __html: t.raw("list.note3") }} /></li>
              </ul>
          </div>
        </ArticleSection>

        <ArticleSection id="other-cases" title={t("otherCases.title")}>
          <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { icon: <ShieldCheck className="w-6 h-6" />, title: t("otherCases.diplomatic.title"), desc: t("otherCases.diplomatic.desc") },
                { icon: <UserCheck className="w-6 h-6" />, title: t("otherCases.trc.title"), desc: t("otherCases.trc.desc") },
                { icon: <FileCheck className="w-6 h-6" />, title: t("otherCases.vec.title"), desc: t("otherCases.vec.desc") },
                { icon: <Building className="w-6 h-6" />, title: t("otherCases.apec.title"), desc: t("otherCases.apec.desc") },
                { icon: <MapPin className="w-6 h-6" />, title: t("otherCases.sez.title"), desc: t("otherCases.sez.desc") },
              ].map((item, idx) => (
                <div key={idx} className="flex items-start gap-4 p-5 rounded-2xl bg-(--color-surface-2) border border-(--color-border)">
                  <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 shrink-0">
                    {item.icon}
                  </div>
                  <div>
                    <h4 className="font-bold mb-1">{item.title}</h4>
                    <p className="text-sm text-stone-600 dark:text-stone-400">{item.desc}</p>
                  </div>
                </div>
              ))}
          </div>
        </ArticleSection>

        <ArticleSection id="extension" title={t("extension.title")}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center max-w-6xl mx-auto mb-12">
              <div className="space-y-6">
                <div className="bg-(--color-surface-2) rounded-3xl border border-(--color-border) p-8 shadow-sm">
                  <h3 className="text-xl font-bold mb-6">{t("extension.rulesTitle")}</h3>
                  <div className="space-y-6">
                    <div className="flex gap-4">
                      <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
                      <div>
                        <h4 className="font-bold">{t("extension.rules.bilateral.title")}</h4>
                        <p className="text-stone-600 dark:text-stone-400">{t("extension.rules.bilateral.desc")}</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
                      <div>
                        <h4 className="font-bold">{t("extension.rules.unilateral.title")}</h4>
                        <p className="text-stone-600 dark:text-stone-400">{t("extension.rules.unilateral.desc")}</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
                      <div>
                        <h4 className="font-bold">{t("extension.rules.vec.title")}</h4>
                        <p className="text-stone-600 dark:text-stone-400">{t("extension.rules.vec.desc")}</p>
                      </div>
                    </div>
                  </div>
                  <p className="mt-6 text-sm text-stone-500 italic border-t border-(--color-border) pt-4">
                    {t("extension.note")}
                  </p>
                </div>
              </div>

              <div className="relative rounded-3xl overflow-hidden h-full min-h-[400px] shadow-lg">
                <Image 
                  src={article.metadata?.extensionImage || "/images/guide/extension-cover.jpg"} 
                  className="object-cover object-center transition-transform duration-700 hover:scale-105" 
                  alt="Vietnam Immigration"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex flex-col justify-end p-8">
                  <h3 className="text-white text-2xl font-bold mb-2">{t("extension.needExtension")}</h3>
                  <p className="text-white/90 font-medium">{t("extension.needExtensionDesc")}</p>
                </div>
              </div>
            </div>

            <div className="max-w-5xl mx-auto">

              {/* Bento 2.0 Why Us Component */}
              <div className="mt-16">
                <h3 className="text-2xl font-bold text-center mb-8">{t("extension.whyUs")}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="group rounded-[2rem] bg-(--color-surface-2) p-6 transition-all hover:-translate-y-1 shadow-lg dark:hover:shadow-blue-900/10 border border-(--color-border)">
                    <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                      <Clock className="w-6 h-6" />
                    </div>
                    <h4 className="text-lg font-bold mb-2">{t("extension.whyUsFeatures.fast.title")}</h4>
                    <p className="text-stone-600 dark:text-stone-400 text-sm">
                      {t("extension.whyUsFeatures.fast.desc")}
                    </p>
                  </div>
                  <div className="group rounded-[2rem] bg-(--color-surface-2) p-6 transition-all hover:-translate-y-1 shadow-lg dark:hover:shadow-emerald-900/10 border border-(--color-border)">
                    <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                      <FileCheck className="w-6 h-6" />
                    </div>
                    <h4 className="text-lg font-bold mb-2">{t("extension.whyUsFeatures.accuracy.title")}</h4>
                    <p className="text-stone-600 dark:text-stone-400 text-sm">
                      {t("extension.whyUsFeatures.accuracy.desc")}
                    </p>
                  </div>
                  <div className="group rounded-[2rem] bg-(--color-surface-2) p-6 transition-all hover:-translate-y-1 shadow-lg dark:hover:shadow-purple-900/10 border border-(--color-border)">
                    <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                      <Building className="w-6 h-6" />
                    </div>
                    <h4 className="text-lg font-bold mb-2">{t("extension.whyUsFeatures.convenience.title")}</h4>
                    <p className="text-stone-600 dark:text-stone-400 text-sm">
                      {t("extension.whyUsFeatures.convenience.desc")}
                    </p>
                  </div>
                </div>
                
                <div className="mt-10 text-center">
                  <Link href="/contact-us" className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-(--color-primary) text-white dark:text-black font-bold hover:bg-black dark:hover:bg-white dark:hover:text-black transition-all">
                    {t("extension.contactBtn")}
                  </Link>
                </div>
                </div>
              </div>
        </ArticleSection>
      </ArticleContent>
    </ArticleLayout>
  )
}
