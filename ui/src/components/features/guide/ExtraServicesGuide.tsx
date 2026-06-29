"use client"

import { ArticleLayout } from "./ArticleLayout"
import { ArticleContent } from "./ArticleContent"
import { ArticleSection } from "./ArticleSection"
import type { Article } from "@/types/api"
import { Plane, Building, Info, AlertCircle, Phone, Star } from "lucide-react"
import Image from "next/image"
import { useTranslations } from "next-intl"

export interface ExtraServicesGuideProps {
  article: Article
}

export function ExtraServicesGuide({ article }: ExtraServicesGuideProps) {
  const t = useTranslations("ExtraServicesGuide")

  const TOC_SECTIONS = [
    { id: "fast-track", label: t("fastTrack.title") },
    { id: "car-pickup", label: t("carPickup.title") },
    { id: "hotel-reservation", label: t("hotel.title") },
  ]

  return (
    <ArticleLayout article={article} tocSections={TOC_SECTIONS}>
      <ArticleContent>
          
        {/* Section 1: Fast Track Service */}
        <ArticleSection id="fast-track" title={t("fastTrack.title")}>
          <p className="text-center text-stone-600 dark:text-stone-400 mb-12 max-w-2xl mx-auto">
            {t("fastTrack.desc")}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Normal Service Info */}
              <div className="md:col-span-7 group relative rounded-3xl border border-(--color-border) bg-(--color-surface-2) p-8 transition-all hover:shadow-lg overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Plane className="w-24 h-24 text-blue-500" />
                </div>
                <div className="flex justify-between items-center mb-6 relative z-10">
                  <h3 className="text-2xl font-bold flex items-center gap-3">
                    {t("fastTrack.normal")}
                  </h3>
                  <span className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">$25<span className="text-sm font-normal text-stone-500">{t("fastTrack.pax")}</span></span>
                </div>
                <p className="text-stone-600 dark:text-stone-400 leading-relaxed relative z-10 mb-4" dangerouslySetInnerHTML={{ __html: t.raw("fastTrack.normalDesc") }} />
              </div>
              
              {/* Normal Service Image */}
              <div className="md:col-span-5 relative rounded-3xl overflow-hidden min-h-[200px] shadow-sm">
                <Image 
                  src={article.metadata?.fastTrackNormalImage || "/images/guide/fast-track-normal.jpg"} 
                  className="object-cover object-center transition-transform duration-700 hover:scale-105" 
                  alt="Airport Fast Track"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>

              {/* VIP Service Image */}
              <div className="md:col-span-5 relative rounded-3xl overflow-hidden min-h-[200px] shadow-sm hidden md:block">
                <Image 
                  src={article.metadata?.fastTrackVipImage || "/images/guide/fast-track-vip.jpg"} 
                  className="object-cover object-center transition-transform duration-700 hover:scale-105" 
                  alt="VIP Airport Service"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>

              {/* VIP Service Info */}
              <div className="md:col-span-7 group relative rounded-3xl border border-amber-200 bg-amber-50 p-8 transition-all hover:shadow-lg dark:bg-amber-950/20 dark:border-amber-900/50 overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Star className="w-24 h-24 text-(--color-primary)" />
                </div>
                <div className="flex justify-between items-center mb-6 relative z-10">
                  <h3 className="text-2xl font-bold text-(--color-primary) flex items-center gap-3">
                    {t("fastTrack.vip")}
                  </h3>
                  <span className="text-2xl font-extrabold text-(--color-primary)">$45<span className="text-sm font-normal opacity-80">{t("fastTrack.pax")}</span></span>
                </div>
                <p className="text-(--color-primary)/80 leading-relaxed relative z-10 mb-4" dangerouslySetInnerHTML={{ __html: t.raw("fastTrack.vipDesc") }} />
              </div>
              
              {/* VIP Service Image - Mobile only */}
              <div className="md:col-span-5 relative rounded-3xl overflow-hidden min-h-[200px] shadow-sm block md:hidden">
                <Image 
                  src={article.metadata?.fastTrackVipImage || "/images/guide/fast-track-vip.jpg"} 
                  className="object-cover object-center transition-transform duration-700 hover:scale-105" 
                  alt="VIP Airport Service"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
            </div>

            {/* Preparation Note */}
            <div className="mt-8 p-6 rounded-2xl bg-stone-50 border border-stone-200 dark:bg-stone-800/50 dark:border-stone-700/50">
              <h4 className="font-bold flex items-center gap-2 mb-4 text-stone-800 dark:text-stone-200">
                <Info className="w-5 h-5 text-blue-500" />
                {t("fastTrack.noteTitle")}
              </h4>
              <ul className="space-y-3 text-stone-600 dark:text-stone-400 pl-7">
                <li className="relative before:absolute before:-left-5 before:top-2 before:w-1.5 before:h-1.5 before:rounded-full before:bg-(--color-primary)">
                  <strong>$25</strong> {t("fastTrack.note1")}
                </li>
                <li className="relative before:absolute before:-left-5 before:top-2 before:w-1.5 before:h-1.5 before:rounded-full before:bg-(--color-primary)">
                  <strong>$50</strong> {t("fastTrack.note2")}
                </li>
                <li className="relative before:absolute before:-left-5 before:top-2 before:w-1.5 before:h-1.5 before:rounded-full before:bg-(--color-primary)">
                  <strong>$135</strong> {t("fastTrack.note3")}
                </li>
              </ul>
            </div>
        </ArticleSection>

        {/* Section 2: Car Pickup */}
        <ArticleSection id="car-pickup" title={t("carPickup.title")}>
          <p className="text-center text-stone-600 dark:text-stone-400 mb-12 max-w-2xl mx-auto">
            {t("carPickup.desc")}
          </p>

          {/* Gallery / Bento for cars */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="rounded-2xl overflow-hidden aspect-[4/3] relative group shadow-sm border border-(--color-border)">
                 <Image 
                   src={article.metadata?.carSedanImage || "/images/guide/sedan.jpg"} 
                   className="object-cover object-center transition-transform duration-500 group-hover:scale-110" 
                   alt="Sedan 4 seats"
                   fill
                   sizes="(max-width: 768px) 100vw, 25vw"
                 />
                 <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                    <p className="text-white font-bold text-sm tracking-wide">{t("carPickup.sedan")}</p>
                 </div>
              </div>
              <div className="rounded-2xl overflow-hidden aspect-[4/3] relative group shadow-sm border border-(--color-border)">
                 <Image 
                   src={article.metadata?.carSuvImage || "/images/guide/suv.jpg"} 
                   className="object-cover object-center transition-transform duration-500 group-hover:scale-110" 
                   alt="SUV 7 seats"
                   fill
                   sizes="(max-width: 768px) 100vw, 25vw"
                 />
                 <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                    <p className="text-white font-bold text-sm tracking-wide">{t("carPickup.suv")}</p>
                 </div>
              </div>
              <div className="rounded-2xl overflow-hidden aspect-[4/3] relative group shadow-sm border border-(--color-border)">
                 <Image 
                   src={article.metadata?.carMinibusImage || "/images/guide/minibus.jpg"} 
                   className="object-cover object-center transition-transform duration-500 group-hover:scale-110" 
                   alt="Minibus 16-24 seats"
                   fill
                   sizes="(max-width: 768px) 100vw, 25vw"
                 />
                 <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                    <p className="text-white font-bold text-sm tracking-wide">{t("carPickup.minibus")}</p>
                 </div>
              </div>
              <div className="rounded-2xl overflow-hidden aspect-[4/3] relative group shadow-sm border border-(--color-border)">
                 <Image 
                   src={article.metadata?.carCoachImage || "/images/guide/coach.jpg"} 
                   className="object-cover object-center transition-transform duration-500 group-hover:scale-110" 
                   alt="Coach 35-45 seats"
                   fill
                   sizes="(max-width: 768px) 100vw, 25vw"
                 />
                 <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                    <p className="text-white font-bold text-sm tracking-wide">{t("carPickup.coach")}</p>
                 </div>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-(--color-border) bg-(--color-bg) dark:bg-stone-900/50 shadow-sm">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr>
                    <th className="p-5 border-b border-(--color-border) bg-stone-50/50 dark:bg-stone-800/30 text-center font-bold text-stone-900 dark:text-stone-100" colSpan={2}>{t("carPickup.sedan")}</th>
                    <th className="p-5 border-b border-(--color-border) bg-stone-50/50 dark:bg-stone-800/30 text-center font-bold text-stone-900 dark:text-stone-100" colSpan={2}>{t("carPickup.suv")}</th>
                    <th className="p-5 border-b border-(--color-border) bg-stone-50/50 dark:bg-stone-800/30 text-center font-bold text-stone-900 dark:text-stone-100">{t("carPickup.minibus")}</th>
                    <th className="p-5 border-b border-(--color-border) bg-stone-50/50 dark:bg-stone-800/30 text-center font-bold text-stone-900 dark:text-stone-100">{t("carPickup.coach")}</th>
                  </tr>
                  <tr>
                    <th className="p-4 border-b border-r border-(--color-border) text-center text-sm font-semibold text-stone-600 dark:text-stone-400 bg-stone-50/20">{t("carPickup.table.economicClass")}</th>
                    <th className="p-4 border-b border-r border-(--color-border) text-center text-sm font-semibold text-stone-600 dark:text-stone-400 bg-stone-50/20">{t("carPickup.table.businessClass")}</th>
                    <th className="p-4 border-b border-r border-(--color-border) text-center text-sm font-semibold text-stone-600 dark:text-stone-400 bg-stone-50/20">{t("carPickup.table.economicClass")}</th>
                    <th className="p-4 border-b border-r border-(--color-border) text-center text-sm font-semibold text-stone-600 dark:text-stone-400 bg-stone-50/20">{t("carPickup.table.businessClass")}</th>
                    <th className="p-4 border-b border-r border-(--color-border) text-center text-sm font-semibold text-stone-600 dark:text-stone-400 bg-stone-50/20" rowSpan={2}>{t("carPickup.table.fordTransit")}</th>
                    <th className="p-4 border-b border-(--color-border) text-center text-sm font-semibold text-stone-600 dark:text-stone-400 bg-stone-50/20" rowSpan={2}>{t("carPickup.table.huyndai")}</th>
                  </tr>
                  <tr>
                    <th className="p-4 border-b border-r border-(--color-border) text-center text-xs text-stone-500 font-normal">{t("carPickup.table.civic")}</th>
                    <th className="p-4 border-b border-r border-(--color-border) text-center text-xs text-stone-500 font-normal">{t("carPickup.table.camry")}</th>
                    <th className="p-4 border-b border-r border-(--color-border) text-center text-xs text-stone-500 font-normal">{t("carPickup.table.innova")}</th>
                    <th className="p-4 border-b border-r border-(--color-border) text-center text-xs text-stone-500 font-normal">{t("carPickup.table.mercedes")}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-6 border-r border-(--color-border) text-center">
                      <span className="text-2xl font-bold text-(--color-primary)">$25</span>
                    </td>
                    <td className="p-6 border-r border-(--color-border) text-center">
                      <span className="text-2xl font-bold text-(--color-primary)">$50</span>
                    </td>
                    <td className="p-6 border-r border-(--color-border) text-center">
                      <span className="text-2xl font-bold text-(--color-primary)">$30</span>
                    </td>
                    <td className="p-6 border-r border-(--color-border) text-center">
                      <span className="text-2xl font-bold text-(--color-primary)">$70</span>
                    </td>
                    <td className="p-6 border-r border-(--color-border) text-center">
                      <span className="text-2xl font-bold text-(--color-primary)">$50</span>
                    </td>
                    <td className="p-6 text-center">
                      <a href="/contact-us.html" className="inline-flex items-center justify-center rounded-lg bg-(--color-primary) px-4 py-2 text-sm font-bold text-white dark:text-black hover:bg-(--color-primary)/90 transition-all">
                        {t("carPickup.table.contact")}
                      </a>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
        </ArticleSection>

        {/* Section 3: Hotel Reservation */}
        <ArticleSection id="hotel-reservation" title={t("hotel.title")}>
          <div className="flex flex-col md:flex-row items-center gap-10 bg-gradient-to-br from-stone-50 to-stone-100 dark:from-stone-900/50 dark:to-stone-800/10 rounded-3xl p-8 md:p-12 border border-stone-200 dark:border-stone-800">
              <div className="flex-1 space-y-6">
                <p className="text-stone-600 dark:text-stone-300 text-lg leading-relaxed">
                  {t("hotel.desc")}
                </p>
                
                <div>
                  <h4 className="font-bold text-stone-900 dark:text-white flex items-center gap-2 mb-4">
                    <Building className="w-5 h-5 text-(--color-primary)" />
                    {t("hotel.howToBook")}
                  </h4>
                  <ul className="space-y-4">
                    <li className="flex items-start gap-3">
                      <div className="flex size-6 items-center justify-center rounded-full bg-(--color-primary-subtle) text-(--color-primary) font-bold text-xs shrink-0 mt-0.5">1</div>
                      <p className="text-stone-600 dark:text-stone-400">{t("hotel.step1")}</p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="flex size-6 items-center justify-center rounded-full bg-(--color-primary-subtle) text-(--color-primary) font-bold text-xs shrink-0 mt-0.5">2</div>
                      <p className="text-stone-600 dark:text-stone-400" dangerouslySetInnerHTML={{ __html: t.raw("hotel.step2") }} />
                    </li>
                  </ul>
                </div>

                <div className="pt-4 border-t border-stone-200 dark:border-stone-700">
                  <p className="flex items-center gap-2 text-stone-600 dark:text-stone-400">
                    <Phone className="w-4 h-4 text-emerald-500" />
                    {t("hotel.hotline")} <strong className="text-emerald-600 dark:text-emerald-400">(+84) 93 6699 869</strong>
                  </p>
                </div>
              </div>
              
              <div className="hidden md:block w-1/3 shrink-0 relative aspect-square">
                 <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-(--color-primary)/20 to-blue-500/20 animate-pulse blur-3xl"></div>
                 <div className="relative h-full w-full rounded-2xl overflow-hidden shadow-2xl rotate-3 border-4 border-white dark:border-stone-800">
                   <Image 
                     src={article.metadata?.hotelReservationImage || "/images/guide/hotel.jpg"} 
                     alt="Hotel Reservation" 
                     className="object-cover object-center"
                     fill
                     sizes="(max-width: 768px) 100vw, 33vw"
                   />
                 </div>
              </div>
          </div>
        </ArticleSection>
      </ArticleContent>
    </ArticleLayout>
  )
}
