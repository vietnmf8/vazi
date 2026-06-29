"use client"

import { ReactNode } from "react"
import { m } from "framer-motion"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

export interface BreadcrumbItem {
  label: string
  href?: string
}

export interface PageBannerProps {
  title: string
  subtitle?: ReactNode
  breadcrumb?: BreadcrumbItem[]
  className?: string
}

/**
 * Banner đầu trang cao cấp (Premium Hero Banner) sử dụng chung cho toàn dự án.
 * Tích hợp Framer Motion, Glowing Orbs, Glassmorphism Breadcrumb.
 */
export function PageBanner({
  title,
  subtitle,
  breadcrumb,
  className,
}: PageBannerProps) {
  return (
    <section className={cn("relative overflow-hidden pt-20 pb-16 lg:pt-32 lg:pb-24 border-b border-[var(--color-border-default)] dark:border-white/5", className)}>
      {/* Decorative Premium Glow (Orbs) */}
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-full max-w-4xl h-[400px] bg-(--color-primary)/20 blur-[120px] rounded-[100%] pointer-events-none opacity-60 dark:opacity-30" />
      
      <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center">
        {/* Animated Premium Breadcrumb */}
        {breadcrumb && breadcrumb.length > 0 && (
          <m.nav 
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="mb-8 inline-flex flex-wrap justify-center items-center gap-2 rounded-full border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-black/20 backdrop-blur-md px-4 py-1.5 text-[11px] sm:text-xs font-bold uppercase tracking-widest text-(--color-text-muted) shadow-sm"
          >
            {breadcrumb.map((item, index) => {
              const isLast = index === breadcrumb.length - 1
              return (
                <div key={`${item.label}-${index}`} className="flex items-center gap-2">
                  {index > 0 && <ChevronRight className="size-3 opacity-50" />}
                  {item.href && !isLast ? (
                    <Link href={item.href} className="hover:text-(--color-primary) transition-all whitespace-nowrap">
                      {item.label}
                    </Link>
                  ) : (
                    <span className="text-(--color-text-primary) whitespace-nowrap">
                      {item.label}
                    </span>
                  )}
                </div>
              )
            })}
          </m.nav>
        )}

        {/* Hero Title */}
        <div className="mb-6">
          <m.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-(--color-text-primary) leading-[1.1] font-family-heading"
          >
            {title}
          </m.h1>
        </div>

        {/* Hero Subtitle */}
        {subtitle && (
          <m.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
            className="max-w-2xl text-base sm:text-lg lg:text-xl text-(--color-text-secondary) font-medium leading-relaxed"
          >
            {subtitle}
          </m.p>
        )}
      </div>
    </section>
  )
}

