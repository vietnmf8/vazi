"use client"

import { m } from "framer-motion"
import { Award, Shield, Target, Users, MapPin, Compass } from "lucide-react"

export function AboutFeatures({ data, featureIcons }: { data?: any, featureIcons?: string[] }) {
  const ICON_MAP: Record<string, any> = { Award, Shield, Target, Users, MapPin, Compass };

  const whyUsItems = [
    data?.items?.noHiddenCharges,
    data?.items?.experience,
    data?.items?.delivery,
    data?.items?.prices,
    data?.items?.guarantee,
  ].filter(Boolean)

  const iconNames = featureIcons || ["Target", "Shield", "Award", "Users", "Shield"]

  return (
    <section aria-labelledby="why-heading" data-ai-target="about_features" className="py-4">
      <div className="mb-10">
        <span className="text-xs font-bold uppercase tracking-widest text-(--color-primary) bg-(--color-primary-subtle) px-3 py-1.5 rounded-full">
          {data?.label}
        </span>
        <h2
          id="why-heading"
          className="text-3xl sm:text-4xl font-bold tracking-tight text-(--color-text-primary) mt-4"
        >
          {data?.title}
        </h2>
      </div>

      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {whyUsItems.map((item, index) => {
          const iconName = iconNames[index] || "Shield"
          const Icon = ICON_MAP[iconName] ?? Shield
          
          
          return (
            <m.li
              key={item.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ type: "spring", stiffness: 80, damping: 17, delay: index * 0.08 }}
              className="group"
            >
              {/* Thẻ Bento 2.0: Căn lề rộng rãi, bo góc lớn rounded-3xl.
                  Hiệu ứng hover: Đổi màu viền, nâng nhẹ thẻ, tăng bóng đổ khuyếch tán */}
              <div className="relative h-full overflow-hidden rounded-[2rem] border border-(--color-border) bg-(--color-surface-2) p-8 transition-all duration-300 hover:border-(--color-primary)/40 hover:-translate-y-1 shadow-[0_15px_30px_-10px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)]">
                
                {/* Khung chứa Icon tròn có micro-interaction khi hover vào thẻ (group-hover: scale & rotate nhẹ) */}
                <div className="flex size-12 items-center justify-center rounded-2xl bg-(--color-primary-subtle) text-(--color-primary) mb-6 transition-all duration-500 ease-out group-hover:scale-110 group-hover:rotate-3">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </div>

                <h3 className="text-lg font-bold text-(--color-text-primary) mb-3 tracking-tight">
                  {item.title}
                </h3>
                
                <p className="text-sm text-(--color-text-secondary) leading-relaxed">
                  {item.description}
                </p>
                
                {/* Lớp phủ sáng mờ ở chân thẻ để làm bật nội dung (ambient gradient) */}
                <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-(--color-primary)/2 rounded-full blur-xl pointer-events-none group-hover:bg-(--color-primary)/5 transition-all duration-300" />
              </div>
            </m.li>
          )
        })}
      </ul>
    </section>
  )
}

