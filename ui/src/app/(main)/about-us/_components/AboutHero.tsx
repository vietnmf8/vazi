"use client"

import { m } from "framer-motion"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
export function AboutHero({ data }: { data?: any }) {
  return (
    <section className="relative overflow-hidden pt-20 pb-16 lg:pt-32 lg:pb-24">
      {/* Decorative Premium Glow (Orbs) */}
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-full max-w-4xl h-[400px] bg-(--color-primary)/20 blur-[120px] rounded-[100%] pointer-events-none opacity-60 dark:opacity-30" />
      
      <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center">
        {/* Animated Premium Breadcrumb */}
        <m.nav 
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mb-8 inline-flex items-center gap-2 rounded-full border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-black/20 backdrop-blur-md px-4 py-1.5 text-[11px] sm:text-xs font-bold uppercase tracking-widest text-(--color-text-muted) shadow-sm"
        >
          <Link href="/" className="hover:text-(--color-primary) transition-all">Home</Link>
          <ChevronRight className="size-3 opacity-50" />
          <span className="text-(--color-text-primary)">About Us</span>
        </m.nav>

        {/* Hero Title */}
        <div className="mb-6">
          <m.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
            className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-(--color-text-primary) leading-[1.1] font-family-heading"
            dangerouslySetInnerHTML={{
              __html: data?.title?.replace(/<accent>(.*?)<\/accent>/g, '<span class="text-transparent bg-clip-text bg-gradient-to-r from-(--color-primary) to-amber-500 drop-shadow-sm">$1</span>') || ""
            }}
          />
        </div>

        {/* Hero Subtitle */}
        <m.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          className="max-w-3xl text-lg sm:text-xl text-(--color-text-secondary) font-medium leading-relaxed"
          dangerouslySetInnerHTML={{ __html: data?.subtitle || "" }}
        />
      </div>
    </section>
  )
}

