"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { m } from "framer-motion"
import { Calendar, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react"
import { useTranslations } from "next-intl"
import toast from "react-hot-toast"


const CARD_WIDTH = 420
const CARD_HEIGHT = 380
const FLANK_OFFSET = 390
const FLANK_ROTATE = 18

export function BlogPreviewSection() {
  const t = useTranslations("HomePage.BlogPreviewSection")
  const tData = useTranslations("HomePage.Data.BlogPosts")
  const BLOG_POSTS = [
    { id: "danang", title: tData("2.title"), excerpt: tData("2.excerpt"), image: "/images/da-nang.jpg", date: tData("2.date"), category: tData("2.category") },
    { id: "hochiminh", title: tData("3.title"), excerpt: tData("3.excerpt"), image: "/images/sai-gon.webp", date: tData("3.date"), category: tData("3.category") },
    { id: "passes", title: tData("4.title"), excerpt: tData("4.excerpt"), image: "/images/cac-tinh-mien-nam-2.jpg", date: tData("4.date"), category: tData("4.category") },
    { id: "halong", title: tData("0.title"), excerpt: tData("0.excerpt"), image: "/images/ha-long-bay.jpg", date: tData("0.date"), category: tData("0.category") },
    { id: "hanoi", title: tData("1.title"), excerpt: tData("1.excerpt"), image: "/images/bun-cha.jpg", date: tData("1.date"), category: tData("1.category") },
  ];
  const total = BLOG_POSTS.length
  const [currentIndex, setCurrentIndex] = React.useState(0)
  const [cardWidth, setCardWidth] = React.useState(CARD_WIDTH)

  React.useEffect(() => {
    const update = () => {
      setCardWidth(window.innerWidth < 480 ? Math.min(CARD_WIDTH, window.innerWidth - 32) : CARD_WIDTH)
    }
    update()
    window.addEventListener("resize", update, { passive: true })
    return () => window.removeEventListener("resize", update)
  }, [])

  const goNext = React.useCallback(() => {
    setCurrentIndex((i) => (i + 1) % total)
  }, [total])

  const goPrev = React.useCallback(() => {
    setCurrentIndex((i) => (i - 1 + total) % total)
  }, [total])

  // Keyboard navigation for accessibility
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        goPrev()
      } else if (e.key === "ArrowRight") {
        goNext()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [goNext, goPrev])

  return (
    <section id="blog" data-ai-target="blog_preview" className="w-full py-20 px-4 sm:px-6 lg:px-8 border-t border-(--color-border) reveal-on-scroll overflow-x-hidden">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">

            </div>
            <h2 className="section-title !text-left">
              {t("title_start")} <span className="text-(--color-primary)">{t("title_highlight")}</span>
            </h2>
            <p className="section-desc max-w-xl">
              {t("desc")}
            </p>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <Link
              href="/guide"
              className="inline-flex items-center gap-1.5 text-sm font-bold uppercase tracking-wider text-(--color-secondary) hover:text-(--color-secondary-light) transition-all group font-body"
            >
              {t("view_all")}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <div className="flex gap-2">
              <button
                onClick={goPrev}
                className="flex size-9 items-center justify-center rounded-full border border-(--color-border-strong) bg-(--color-surface-1) text-(--color-text-primary) hover:border-(--color-primary) hover:text-(--color-primary) transition-all shadow-sm hover:shadow "
                aria-label="Previous article"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                onClick={goNext}
                className="flex size-9 items-center justify-center rounded-full border border-(--color-border-strong) bg-(--color-surface-1) text-(--color-text-primary) hover:border-(--color-primary) hover:text-(--color-primary) transition-all shadow-sm hover:shadow "
                aria-label="Next article"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        </div>

        {/* 3D Card Carousel */}
        <div
          className="relative mx-auto flex items-center justify-center"
          style={{ height: CARD_HEIGHT + 60, perspective: "1200px" }}
          aria-label="Article carousel — use arrows to browse"
        >
          {BLOG_POSTS.map((post, postIndex) => {
            const offset = (postIndex - currentIndex + total) % total
            const normalizedOffset = offset > total / 2 ? offset - total : offset

            const isActive = normalizedOffset === 0
            const isLeft = normalizedOffset === -1
            const isRight = normalizedOffset === 1
            const isVisible = isActive || isLeft || isRight

            if (!isVisible) return null

            const xVal = isActive ? 0 : isLeft ? -FLANK_OFFSET : FLANK_OFFSET
            const rotateY = isActive ? 0 : isLeft ? -FLANK_ROTATE : FLANK_ROTATE
            const scaleVal = isActive ? 1 : 0.82
            const opacityVal = isActive ? 1 : 0.55
            const zIndex = isActive ? 10 : 5

            return (
              <m.article
                key={post.id}
                drag={isActive ? "x" : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.2}
                dragMomentum={false}
                onDragEnd={(_, info) => {
                  if (info.offset.x < -80) goNext()
                  else if (info.offset.x > 80) goPrev()
                }}
                animate={{ x: xVal, rotateY, scale: scaleVal, opacity: opacityVal, zIndex }}
                whileDrag={{ scale: 1.03, cursor: "grabbing", zIndex: 100 }}
                transition={{ type: "spring", stiffness: 420, damping: 30, mass: 0.7 }}
                style={{
                  position: "absolute",
                  top: 20,
                  width: cardWidth,
                  cursor: isActive ? "grab" : "pointer",
                  transformOrigin: "center center",
                  transformStyle: "preserve-3d",
                }}
                className="overflow-hidden rounded-2xl border border-(--color-border) bg-(--color-surface-1) shadow-lg select-none dark:dark-glass"
                onClick={!isActive ? (isLeft ? goPrev : goNext) : undefined}
                aria-hidden={!isActive}
              >
                {/* Card image */}
                <div className="relative w-full overflow-hidden bg-stone-100" style={{ height: 220 }}>
                  <Image
                    src={post.image}
                    alt={post.title}
                    fill
                    className="object-cover"
                    draggable={false}
                    loading="lazy"
                    sizes="420px"
                  />
                  <span className="absolute left-4 top-4 rounded-full bg-(--color-surface-1)/90 backdrop-blur-md px-3 py-1 text-sm font-extrabold uppercase tracking-wider text-(--color-primary) border border-(--color-border)">
                    {post.category}
                  </span>
                </div>

                {/* Card body */}
                <div className="p-5 space-y-2.5">
                  <div className="flex items-center gap-2 text-sm text-(--color-text-muted) font-bold font-body uppercase">
                    <Calendar className="size-3.5 text-(--color-primary)" />
                    {post.date}
                  </div>
                  <h3 className="section-subtitle !text-base leading-snug line-clamp-2">
                    {post.title}
                  </h3>
                  <p className="text-sm text-(--color-text-secondary) leading-relaxed line-clamp-2 font-body">
                    {post.excerpt}
                  </p>
                  <Link
                    href="#"
                    className="inline-flex items-center gap-1.5 text-sm font-bold text-(--color-primary) hover:text-(--color-primary-dark) transition-all font-body"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toast("Coming soon...", { icon: "🚀", position: 'top-center' });
                    }}
                    tabIndex={isActive ? 0 : -1}
                  >
                    {t("read_full")}
                    <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              </m.article>
            )
          })}
        </div>

        {/* Dot indicators */}
        <div className="flex items-center justify-center gap-2 mt-6" aria-label="Article navigation">
          {BLOG_POSTS.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`rounded-full transition-all duration-300  ${i === currentIndex
                ? "w-6 h-2 bg-(--color-primary)"
                : "w-2 h-2 bg-(--color-border-strong) hover:bg-(--color-primary)/50 transition-all"
                }`}
              aria-label={`Go to article ${i + 1}`}
              aria-current={i === currentIndex ? "true" : undefined}
            />
          ))}
        </div>

      </div>
    </section>
  )
}
