"use client"

import { useEffect, useState, useRef } from "react"
import { m, useInView  } from "framer-motion"
import { useTranslations } from "next-intl"

/**
 * Leaf component quản lý hiệu ứng chạy số đếm (Perpetual Motion)
 * Giúp cô lập trạng thái re-render liên tục khi tăng số, tối ưu hóa GPU theo quy tắc hiệu năng.
 * 
 * @param value Giá trị số đích cần chạy tới dưới dạng chuỗi (ví dụ: "150,000+", "24h", "4.9★", "120+")
 */
function CountingNumber({ value }: { value: string }) {
  const [displayValue, setDisplayValue] = useState("0")
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-50px" })

  useEffect(() => {
    if (!isInView) return

    // Phân tách số và hậu tố (ký tự đặc biệt như +, h, ★)
    const numericPart = parseFloat(value.replace(/,/g, "").replace(/[^0-9.]/g, ""))
    const suffix = value.replace(/[0-9.,]/g, "")
    const hasDecimal = value.includes(".")

    let start = 0
    const duration = 1500 // 1.5 giây chạy số
    const startTime = performance.now()

    let animationFrameId: number

    const updateNumber = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1)
      // Dùng hàm easing outQuad để số chạy chậm dần ở cuối
      const easeProgress = progress * (2 - progress)
      const current = start + easeProgress * (numericPart - start)

      if (hasDecimal) {
        setDisplayValue(current.toFixed(1) + suffix)
      } else {
        const formatted = Math.floor(current)
          .toString()
          .replace(/\B(?=(\d{3})+(?!\d))/g, ",")
        setDisplayValue(formatted + suffix)
      }

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(updateNumber)
      } else {
        setDisplayValue(value)
      }
    }

    animationFrameId = requestAnimationFrame(updateNumber)

    return () => {
      cancelAnimationFrame(animationFrameId)
    }
  }, [value, isInView])

  return (
    <span ref={ref} className="tabular-nums text-4xl sm:text-5xl lg:text-4xl xl:text-5xl font-extrabold text-(--color-primary) tracking-tight">
      {displayValue}
    </span>
  )
}

/**
 * Component hiển thị thông số tin cậy (By the Numbers) theo tiêu chuẩn Bento 2.0.
 * Thiết kế tinh gọn, sử dụng hiệu ứng đếm số sống động để thu hút tương tác của khách hàng.
 */
export function AboutStats({ stats }: { stats?: { value: string, labelKey: string }[] }) {
  const t = useTranslations("HomePage.Data.TrustStats");
  const fallbackStats = [
    { value: "150,000+", label: t("0.label") },
    { value: "24h", label: t("1.label") },
    { value: "4.9★", label: t("2.label") },
    { value: "120+", label: t("3.label") },
  ];
  
  const displayStats = stats?.length ? stats.map(s => ({
      value: s.value,
      label: t(s.labelKey as any) || s.labelKey
  })) : fallbackStats;

  return (
    <section aria-labelledby="stats-heading" className="py-4">
      <div className="text-center mb-12">
        <span className="text-xs font-bold uppercase tracking-widest text-(--color-primary) bg-(--color-primary-subtle) px-3 py-1.5 rounded-full">
          Track Record
        </span>
        <h2
          id="stats-heading"
          className="text-3xl sm:text-4xl font-bold tracking-tight text-(--color-text-primary) mt-4"
        >
          By the Numbers
        </h2>
      </div>

      <ul className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
        {displayStats.map((stat, index) => (
          <m.li 
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 85, damping: 16, delay: index * 0.1 }}
          >
            {/* Bento Card 2.0: Bo góc lớn rounded-[2rem], viền mảnh, đổ bóng mịn khuyếch tán */}
            <div className="relative overflow-hidden rounded-[2rem] border border-(--color-border) bg-(--color-surface-2) dark:bg-[#0a2e26] p-6 sm:p-8 text-center hover:border-(--color-primary)/40 transition-all duration-300 shadow-[0_15px_30px_-10px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] hover:-translate-y-1 flex flex-col justify-center items-center">
              <CountingNumber value={stat.value} />
              <p className="mt-3 text-[10px] sm:text-xs font-bold text-(--color-text-muted) uppercase tracking-widest break-words w-full">
                {stat.label}
              </p>
              
              {/* Lớp trang trí gradient nhẹ ở góc card tạo cảm giác sang trọng (Vercel aesthetic) */}
              <div className="absolute top-0 right-0 w-16 h-16 bg-linear-to-bl from-(--color-primary)/5 to-transparent pointer-events-none rounded-tr-[2rem]" />
            </div>
          </m.li>
        ))}
      </ul>
    </section>
  )
}

