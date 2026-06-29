"use client"

import { useState } from "react"
import Image from "next/image"
import { m } from "framer-motion"
import { Target, Award, Compass, MapPin } from "lucide-react"
export function AboutMission({ data, images }: { data?: any, images?: Record<string, string> }) {
  const [hoveredId, setHoveredId] = useState<number | null>(null)
  const [lastHoveredId, setLastHoveredId] = useState<number | null>(null)

  return (
    <section
      aria-labelledby="mission-heading"
      data-ai-target="about_mission"
      className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center py-4"
    >
      {/* Cột trái: Văn bản sứ mệnh & Cam kết chất lượng dịch vụ (Chiếm 5/12 cột) */}
      <m.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ type: "spring", stiffness: 80, damping: 18 }}
        className="space-y-6 lg:col-span-5"
      >
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-(--color-primary) bg-(--color-primary-subtle) px-3 py-1.5 rounded-full">
            {data?.label}
          </span>
          <h2
            id="mission-heading"
            className="text-3xl sm:text-4xl font-bold tracking-tight text-(--color-text-primary) mt-4 mb-6 leading-tight"
          >
            {data?.title}
          </h2>
          <p className="text-base text-(--color-text-secondary) leading-relaxed">
            {data?.description}
          </p>
        </div>

        {/* Các điểm nhấn giá trị cốt lõi đi kèm dưới dạng list nhỏ gọn để củng cố thông điệp */}
        <div className="space-y-4 pt-4 border-t border-(--color-border)/60">
          <div className="flex gap-4 items-start">
            <div className="p-2 rounded-lg bg-(--color-primary-subtle) text-(--color-primary) mt-1 shrink-0">
              <Compass className="size-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-(--color-text-primary)">{data?.hassleFreeTitle}</h4>
              <p className="text-xs text-(--color-text-muted) mt-0.5">{data?.hassleFreeDesc}</p>
            </div>
          </div>
          <div className="flex gap-4 items-start">
            <div className="p-2 rounded-lg bg-(--color-primary-subtle) text-(--color-primary) mt-1 shrink-0">
              <Target className="size-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-(--color-text-primary)">{data?.reliabilityTitle}</h4>
              <p className="text-xs text-(--color-text-muted) mt-0.5">{data?.reliabilityDesc}</p>
            </div>
          </div>
        </div>
      </m.div>

      {/* Cột phải: Lưới ảnh Bento bất đối xứng (Chiếm 7/12 cột)
          Tại sao sử dụng Bento Grid: Cấu trúc đã được chuyển sang absolute positioning để hỗ trợ
          hiệu ứng hover scale mượt mà (scale width/height) mà không làm vỡ layout. */}
      <div className="lg:col-span-7 relative h-[400px] sm:h-[480px] w-full mt-8 lg:mt-0">
        
        {/* Ảnh 1 (Trái, khổ dọc): Phong cảnh đồi chè/ruộng bậc thang */}
        <m.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          animate={{
            width: hoveredId === 1 ? '100%' : 'calc((100% - 16px) * 5 / 12)',
            zIndex: hoveredId === 1 || (hoveredId === null && lastHoveredId === 1) ? 30 : 10,
          }}
          transition={{
            width: { type: "spring", stiffness: 150, damping: 25 },
            default: { type: "spring", stiffness: 70, damping: 15, delay: 0.1 }
          }}
          onMouseEnter={() => {
            setHoveredId(1)
            setLastHoveredId(1)
          }}
          onMouseLeave={() => setHoveredId(null)}
          className="absolute left-0 top-0 bottom-0 rounded-2xl overflow-hidden group shadow-(--shadow-md)"
        >
          <Image
            src={images?.sapa || "/images/about-us/mission-sapa.jpg"}
            alt="Vẻ đẹp ruộng bậc thang Việt Nam mùa lúa chín"
            fill
            sizes="(max-width: 768px) 100vw, 60vw"
            className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none flex items-end p-4 lg:p-6">
            <div className="w-[300px] sm:w-[380px] shrink-0 translate-y-4 group-hover:translate-y-0 transition-transform duration-500 ease-out">
              <div className="flex items-center gap-1.5 mb-2">
                <MapPin className="size-4 text-(--color-primary)" />
                <span className="text-xs font-semibold text-(--color-primary) uppercase tracking-wider">Sa Pa, Lao Cai</span>
              </div>
              <h3 className="text-xl md:text-2xl font-bold mb-2 text-white shadow-sm font-family-heading">Terraced Fields</h3>
              <p className="text-sm text-gray-200 line-clamp-2 drop-shadow-md">A masterpiece of nature and mountainous people.</p>
            </div>
          </div>
        </m.div>

        {/* Ảnh 2 (Phải - Trên): Đèn lồng Hội An lung linh sắc màu */}
        <m.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          animate={{
            width: hoveredId === 2 ? '100%' : 'calc((100% - 16px) * 7 / 12)',
            height: hoveredId === 2 ? '100%' : 'calc(50% - 8px)',
            zIndex: hoveredId === 2 || (hoveredId === null && lastHoveredId === 2) ? 30 : 10,
          }}
          transition={{
            width: { type: "spring", stiffness: 150, damping: 25 },
            height: { type: "spring", stiffness: 150, damping: 25 },
            default: { type: "spring", stiffness: 70, damping: 15, delay: 0.2 }
          }}
          onMouseEnter={() => {
            setHoveredId(2)
            setLastHoveredId(2)
          }}
          onMouseLeave={() => setHoveredId(null)}
          className="absolute right-0 top-0 rounded-2xl overflow-hidden group shadow-(--shadow-md)"
        >
          <Image
            src={images?.hoian || "/images/about-us/mission-hoian.jpg"}
            alt="Đường phố Hà Nội với nét đẹp giao thoa cổ kính và hiện đại"
            fill
            sizes="(max-w-768px) 100vw, 60vw"
            className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none flex items-end p-4 lg:p-6">
            <div className="w-[300px] sm:w-[380px] shrink-0 translate-y-4 group-hover:translate-y-0 transition-transform duration-500 ease-out">
              <div className="flex items-center gap-1.5 mb-2">
                <MapPin className="size-4 text-(--color-primary)" />
                <span className="text-xs font-semibold text-(--color-primary) uppercase tracking-wider">Quang Nam</span>
              </div>
              <h3 className="text-xl md:text-2xl font-bold mb-2 text-white shadow-sm font-family-heading">Hoi An Ancient Town</h3>
              <p className="text-sm text-gray-200 line-clamp-2 drop-shadow-md">World cultural heritage with romantic and ancient beauty.</p>
            </div>
          </div>
        </m.div>

        {/* Ảnh 3 (Phải - Dưới): Lập bản đồ hành trình du lịch */}
        <m.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          animate={{
            width: hoveredId === 3 ? '100%' : 'calc((100% - 16px) * 7 / 12)',
            height: hoveredId === 3 ? '100%' : 'calc(50% - 8px)',
            zIndex: hoveredId === 3 || (hoveredId === null && lastHoveredId === 3) ? 30 : 10,
          }}
          transition={{
            width: { type: "spring", stiffness: 150, damping: 25 },
            height: { type: "spring", stiffness: 150, damping: 25 },
            default: { type: "spring", stiffness: 70, damping: 15, delay: 0.3 }
          }}
          onMouseEnter={() => {
            setHoveredId(3)
            setLastHoveredId(3)
          }}
          onMouseLeave={() => setHoveredId(null)}
          className="absolute right-0 bottom-0 rounded-2xl overflow-hidden group shadow-(--shadow-md)"
        >
          <Image
            src={images?.journey || "/images/about-us/mission-journey.jpg"}
            alt="Khung cảnh non nước nên thơ của thiên nhiên Việt Nam"
            fill
            sizes="(max-w-768px) 100vw, 60vw"
            className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none flex items-end p-4 lg:p-6">
            <div className="w-[300px] sm:w-[380px] shrink-0 translate-y-4 group-hover:translate-y-0 transition-transform duration-500 ease-out">
              <div className="flex items-center gap-1.5 mb-2">
                <MapPin className="size-4 text-(--color-primary)" />
                <span className="text-xs font-semibold text-(--color-primary) uppercase tracking-wider">Vietnam</span>
              </div>
              <h3 className="text-xl md:text-2xl font-bold mb-2 text-white shadow-sm font-family-heading">Journey of Discovery</h3>
              <p className="text-sm text-gray-200 line-clamp-2 drop-shadow-md">Pack your bags for unforgettable experiences.</p>
            </div>
          </div>
        </m.div>

      </div>
    </section>
  )
}

