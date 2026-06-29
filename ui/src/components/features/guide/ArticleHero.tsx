"use client"

import { m } from "framer-motion"
import Image from "next/image"
import type { Article } from "@/types/api"

type ArticleHeroProps = {
  article: Article
}

import { useTranslations, useLocale } from "next-intl"

// Mảng các màu trừu tượng cho nền nếu không có hình ảnh (Premium Look)
const abstractColors = [
  "bg-stone-100 dark:bg-stone-900",
  "bg-zinc-100 dark:bg-zinc-900",
  "bg-[#f3f1e9] dark:bg-[#121212]",
]

export function ArticleHero({ article }: ArticleHeroProps) {
  const t = useTranslations("ArticleHero")
  const locale = useLocale()
  const isNews = article.type === "news"
  
  // Use a local fallback image
  const fallbackImage = isNews 
    ? "/images/guide/hero-news.jpg" 
    : "/images/guide/hero-guide.jpg" 
    
  const displayImage = article.image_url || fallbackImage

  return (
    <section className="relative flex min-h-[60vh] sm:min-h-[70vh] w-full items-end justify-start overflow-hidden border-b border-(--color-border)">
      {/* Background Image Layer */}
      <div className="absolute inset-0 z-0">
        <m.div
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative h-full w-full"
        >
          <Image
            src={displayImage}
            alt={article.title}
            fill
            className="object-cover object-center transition-transform duration-[10s] ease-out hover:scale-110"
            priority
            sizes="100vw"
          />
        </m.div>
        
        {/* Subtle Gradient Overlays for Text Readability */}
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent" />
      </div>

      {/* Content Layer */}
      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col px-6 py-20 lg:px-8 text-white">
        <m.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          className="max-w-4xl"
        >
          <div className="mb-6 flex items-center gap-4">
            <span className="rounded-full bg-white/20 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-white backdrop-blur-md shadow-sm">
              {isNews ? t("latestNews") : t("guide")}
            </span>
            <span className="text-xs font-semibold uppercase tracking-widest text-white/90 drop-shadow-md">
              {new Date(article.created_at).toLocaleDateString(locale, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>

          <h1 className="text-balance text-5xl font-extrabold tracking-tighter leading-[1.05] text-white drop-shadow-xl md:text-6xl lg:text-7xl xl:text-[5rem]">
            {article.title}
          </h1>

          {article.subtitle && (
            <p className="mt-8 max-w-[54ch] text-lg leading-relaxed text-white/90 drop-shadow-lg md:text-xl font-medium">
              {article.subtitle}
            </p>
          )}
          
          {/* Elegant horizontal divider */}
          <m.div 
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 1, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="mt-12 h-px w-24 bg-white/40 origin-left"
          />
        </m.div>
      </div>
    </section>
  )
}
