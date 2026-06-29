"use client"

import Image from "next/image"
import { m } from "framer-motion"
import { Quote } from "lucide-react"
export function AboutQuote({ data }: { data?: any }) {
  return (
    <section
      aria-labelledby="nyt-quote-heading"
      className="relative overflow-hidden rounded-[2rem] border border-(--color-border) bg-(--color-surface-2) p-4 sm:p-6 lg:p-8"
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8 lg:items-stretch">

        {/* Khung ảnh phong cảnh nghệ thuật ở phía bên trái (Chiếm 5/12 cột trên màn hình lớn)
            Tại sao dùng overflow-hidden và group hover: Để tạo chiều sâu thị giác khi người dùng tương tác,
            bức ảnh sẽ phóng to nhẹ nhàng tạo cảm giác sống động (cinematic feel). */}
        <m.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ type: "spring", stiffness: 60, damping: 15 }}
          className="relative w-full aspect-[3/2] lg:aspect-auto lg:col-span-5 lg:h-full flex flex-col rotate-[-3deg]"
        >
          {/* Trình bày dưới dạng thẻ (Card) giống SceneSlider để lấp đầy chiều cao content */}
          <div className="bg-white dark:bg-[#0a2e26] rounded-[2rem] shadow-xl p-2 flex-1 flex flex-col">
            <div className="border-[2px] border-stone-100 dark:border-white/10 rounded-[2rem] w-full h-full flex flex-col p-[9px]">
              <div className="flex-1 relative rounded-xl overflow-hidden bg-stone-50 dark:bg-black/30 group w-full h-full">
                <Image
                  src="/6a68e80c-4a58-41cf-970c-a9aec237a542.png"
                  alt="Team Members"
                  fill
                  sizes="(max-w-1024px) 100vw, 40vw"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  priority
                />
                <div className="absolute inset-0 bg-black/5 dark:bg-black/20 transition-all duration-300 pointer-events-none" />
              </div>
            </div>
          </div>
        </m.div>

        {/* Nội dung Quote ở phía bên phải (Chiếm 7/12 cột)
            WHY: Giảm padding-top ở mobile (pt-2 pb-6) và giảm lg:pl-12 xuống lg:pl-6 ở desktop để kéo khoảng cách giữa ảnh và quote khít khao hơn. */}
        <m.div
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ type: "spring", stiffness: 60, damping: 15, delay: 0.1 }}
          className="relative flex flex-col justify-center px-4 pt-2 pb-6 sm:p-8 lg:col-span-7 lg:pl-6"
        >
          {/* Icon Quote cỡ lớn chìm ở background để đánh dấu định dạng nội dung mà không gây phân tâm */}
          <Quote
            className="absolute -top-4 -left-2 size-20 text-(--color-primary)/10 pointer-events-none"
            aria-hidden="true"
          />

          <blockquote className="relative space-y-6">
            <p className="text-lg sm:text-xl lg:text-2xl font-serif text-(--color-text-primary) leading-relaxed italic opacity-90">
              {data?.text}
            </p>

            <footer className="flex items-center gap-4 pt-4 border-t border-(--color-border)/60">
              <div className="h-[2px] w-8 bg-(--color-primary)" aria-hidden="true" />
              <cite className="not-italic flex flex-col sm:flex-row sm:items-center sm:gap-2">
                <span className="text-base font-bold tracking-wide text-(--color-text-primary)">
                  {data?.author}
                </span>
                <span className="hidden sm:inline text-(--color-text-muted)">|</span>
                <span className="text-sm text-(--color-text-muted) uppercase tracking-widest font-mono">
                  {data?.section}
                </span>
              </cite>
            </footer>
          </blockquote>
        </m.div>
      </div>
    </section>
  )
}

