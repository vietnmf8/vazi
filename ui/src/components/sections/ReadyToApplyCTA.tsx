"use client"

import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEntryGate } from "@/components/features/entry-gate/EntryGateContext"
import { useTranslations } from "next-intl"
import { Compass, ArrowRight, ShieldCheck, Zap } from "lucide-react"
import { buttonVariants } from "@/components/ui/Button"
import { cn } from "@/lib/utils"

/**
 * ReadyToApplyCTA — Ha Long Bay photo tràn full card làm background.
 * Đã chuyển sang Client Component để liên kết nút bấm "Apply Now" với EntryGateContext toàn cục.
 */
export function ReadyToApplyCTA() {
  const router = useRouter()
  const { openGate } = useEntryGate()
  const t = useTranslations("HomePage.ReadyToApply")

  const handleApplyClick = (e: React.MouseEvent) => {
    e.preventDefault()
    openGate({
      hideFastTrack: false, // Hiện đầy đủ cả 3 tùy chọn phân luồng
      onConfirmNew: () => {
        router.push("/apply")
      },
      onConfirmUrgent: () => {
        router.push("/emergency-inquiry")
      },
      onConfirmFastTrack: () => {
        router.push("/apply?category=evisa-code&option=basic-fasttrack&vip=false&step=2")
      }
    })
  }

  return (
    <section className="w-full py-16 px-4 sm:px-6 lg:px-8 reveal-on-scroll">
      <div className="ready-apply relative overflow-hidden rounded-3xl max-w-5xl mx-auto shadow-lg min-h-70 sm:min-h-65">

        {/* ── Full background image ── */}
        <Image
          src="/images/guide/ready-to-apply-hero.jpg"
          alt=""
          fill
          className="object-cover object-center"
          sizes="(max-width: 768px) 100vw, 1024px"
          loading="lazy"
          aria-hidden="true"
        />

        {/* ── Dark gradient overlay — text readable on left ── */}
        <div
          className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.82)_0%,rgba(0,0,0,0.60)_50%,rgba(0,0,0,0.30)_100%)]"
          aria-hidden="true"
        />

        {/* ── Subtle top border glow ── */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl" aria-hidden="true">
          <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(217,119,6,0.4),transparent)]" />
        </div>

        {/* ── Content ── */}
        <div className="relative z-10 p-8 sm:p-12 flex flex-col lg:flex-row items-end justify-between gap-8">

          {/* Left: content */}
          <div className="flex-1 space-y-5 text-center lg:text-left">
            <div className="space-y-3">
              {/* Eyebrow badge */}
              <span className="inline-flex items-center gap-1.5 rounded-full bg-(--color-primary)/20 border border-(--color-primary)/30 px-3.5 py-1 section-label text-(--color-primary) tracking-[0.12em]">
                <Compass
                  className="size-3.5"
                  style={{ animation: "spin 20s linear infinite" }}
                  aria-hidden="true"
                />
                {t("badge")}
              </span>

              {/* Heading */}
              <h3 className="section-subtitle !text-2xl md:!text-3xl font-extrabold leading-tight text-white">
                {t("title")}
              </h3>

              <p className="section-desc max-w-xl mx-auto lg:mx-0 text-white/85">
                {t("desc")}
              </p>
            </div>

            {/* Trust badges */}
            <div
              className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-1 font-body"
              aria-label="Trust indicators"
            >
              <div className="flex items-center gap-2 text-sm text-white/70">
                <ShieldCheck className="size-4 text-(--color-primary)" aria-hidden="true" />
                <span>{t("trust_1")}</span>
              </div>
              <div className="hidden sm:block text-white/30 select-none" aria-hidden="true">•</div>
              <div className="flex items-center gap-2 text-sm text-white/70">
                <Zap className="size-4 text-teal-400" aria-hidden="true" />
                <span>{t("trust_2")}</span>
              </div>
            </div>
          </div>

          {/* Right: CTA button only */}
          <div className="shrink-0 w-full sm:w-auto lg:w-48">
            <button
              onClick={handleApplyClick}
              className={cn(
                buttonVariants({ variant: "default", size: "lg" }),
                "w-full font-bold rounded-full shadow-lg hover:shadow-xl transition-all border-0 flex items-center justify-center gap-2"
              )}
              aria-label="Apply for Vietnam E-Visa now"
              data-ai-element="cta_apply"
            >
              {t("apply_now")}
              <ArrowRight className="size-4" aria-hidden="true" />
            </button>
          </div>

        </div>
      </div>
    </section>
  )
}
