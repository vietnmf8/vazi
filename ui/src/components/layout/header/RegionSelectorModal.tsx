"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"
import { m, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { REGION_OPTIONS } from "./constants"
import { getFlagCdnUrl } from "@/lib/flagcdn"

// Cấu hình hiệu ứng MacOS Dock Hover cho grid region.
// TẠI SAO dùng const riêng: dễ điều chỉnh thông số mà không cần đọc lại toàn bộ logic.
const DOCK_CONFIG = {
  MAX_SCALE: 1.5,  // Tỉ lệ phóng to tối đa của card được hover
  RANGE: 250,      // Bán kính ảnh hưởng (px) — phải lớn hơn khoảng cách tâm-tâm card
} as const

export interface RegionSelectorModalProps {
  isOpen: boolean
  onClose: () => void
  selectedRegion: string
  onRegionSelect: (val: string) => void
}

/**
 * RegionSelectorModal - Modal chọn khu vực (Ngôn ngữ).
 */
export function RegionSelectorModal({ isOpen, onClose, selectedRegion, onRegionSelect }: RegionSelectorModalProps) {
  // Ref đến div grid — để gắn mousemove/mouseleave listener
  const gridRef = React.useRef<HTMLDivElement>(null)
  // Ref đến từng card button — để cập nhật transform trực tiếp qua DOM (không re-render)
  const cardRefs = React.useRef<(HTMLButtonElement | null)[]>([])

  // Hiệu ứng MacOS Dock Hover — clone thuật toán ReactionPopover sang 2D grid
  React.useEffect(() => {
    if (!isOpen) return

    const grid = gridRef.current
    // TẠI SAO không lấy cards ở đây: khi effect chạy, framer-motion
    // có thể chưa mount xong → cardRefs rỗng → bail out sớm, không attach listener.
    // Giải pháp: lazy-read cards BÊN TRONG handler mỗi frame.
    if (!grid) return

    const { MAX_SCALE, RANGE } = DOCK_CONFIG

    const handleMouseMove = (e: MouseEvent) => {
      // Lazy-read: đọc refs tại thời điểm event xảy ra, đảm bảo DOM đã mount đủ
      const cards = cardRefs.current.filter(Boolean) as HTMLButtonElement[]
      if (cards.length === 0) return

      const gridRect = grid.getBoundingClientRect()
      // Tọa độ chuột tương đối với grid container
      const mouseX = e.clientX - gridRect.left
      const mouseY = e.clientY - gridRect.top

      // FIX: Dùng offsetLeft/offsetTop để lấy tọa độ GỐC của card (không bị ảnh hưởng bởi transform)
      // Nếu dùng getBoundingClientRect() nó sẽ lấy tọa độ đang bị scale của frame trước -> gây lỗi feedback loop đẩy nhau đi quá xa
      const centerXs = cards.map((card) => card.offsetLeft + card.offsetWidth / 2)
      const centerYs = cards.map((card) => card.offsetTop + card.offsetHeight / 2)
      // Dùng offsetWidth/offsetHeight để lấy kích thước GỐC (không bị ảnh hưởng bởi scale)
      const cardW = cards[0]?.offsetWidth ?? 108
      const cardH = cards[0]?.offsetHeight ?? 108

      // Pass 1: Tính scale — easing linear để gradient rõ ràng giữa các card
      // TẠI SAO dùng linear thay vì quadratic (progress²):
      // Card cách nhau ~125px, RANGE=200 → progress=0.375.
      // quadratic: 0.375² = 0.14 → scale chỉ +7% (gần như vô hình)
      // linear:    0.375   = 0.375 → scale +26% (rõ ràng theo gradient Dock MacOS)
      const scales = cards.map((_, i) => {
        const distance = Math.sqrt(
          Math.pow(mouseX - centerXs[i], 2) + Math.pow(mouseY - centerYs[i], 2)
        )
        if (distance < RANGE) {
          const progress = 1 - distance / RANGE
          // Linear easing: gradient scale giảm dần theo khoảng cách, rõ ràng với mắt người
          return 1 + (MAX_SCALE - 1) * progress
        }
        return 1
      })

      // Lượng pixel mà mỗi card đã scale thêm so với kích thước gốc
      const extraW = scales.map((s) => cardW * (s - 1))
      const extraH = scales.map((s) => cardH * (s - 1))

      // Ngưỡng xác định "cùng hàng" (so sánh Y) và "cùng cột" (so sánh X)
      const ROW_THRESHOLD = cardH * 0.6
      const COL_THRESHOLD = cardW * 0.6

      // Pass 2: Tính translate theo công thức ReactionPopover nhưng mở rộng sang 2D:
      // - Card cùng hàng → đẩy nhau theo trục X (giống hệt công thức gốc 1D)
      // - Card cùng cột → đẩy nhau theo trục Y (phần mở rộng 2D)
      cards.forEach((card, i) => {
        let translateX = 0
        let translateY = 0

        cards.forEach((_, j) => {
          if (i === j) return

          const xDiff = centerXs[i] - centerXs[j]
          const yDiff = centerYs[i] - centerYs[j]
          const inSameRow = Math.abs(yDiff) < ROW_THRESHOLD
          const inSameCol = Math.abs(xDiff) < COL_THRESHOLD

          if (inSameRow) {
            // Cùng hàng: card j đẩy card i theo X (dấu xDiff xác định hướng)
            translateX += Math.sign(xDiff) * extraW[j] / 2
          }
          if (inSameCol) {
            // Cùng cột: card j đẩy card i theo Y
            translateY += Math.sign(yDiff) * extraH[j] / 2
          }
        })

        // TẠI SAO dùng transition 80ms thay vì "none":
        // "none" gây scale đột ngột khi chuột vào vùng ảnh hưởng.
        // 80ms ease-out đủ nhanh để follow chuột mượt mà, đủ chậm để có easing đẹp.
        card.style.transition = "transform 80ms ease-out"
        card.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scales[i]})`
      })
    }

    const handleMouseLeave = () => {
      // Lazy-read để reset tất cả cards dù refs có thay đổi hay không
      const cards = cardRefs.current.filter(Boolean) as HTMLButtonElement[]
      // Transition dài hơn khi leave để animation reset trông tự nhiên
      cards.forEach((card) => {
        card.style.transition = "transform 300ms ease-out"
        card.style.transform = "translate(0px, 0px) scale(1)"
      })
    }

    grid.addEventListener("mousemove", handleMouseMove)
    grid.addEventListener("mouseleave", handleMouseLeave)

    return () => {
      grid.removeEventListener("mousemove", handleMouseMove)
      grid.removeEventListener("mouseleave", handleMouseLeave)
      // FIX: Reset transforms instantly when effect cleans up (e.g. modal is closing)
      handleMouseLeave()
    }
  }, [isOpen])

  // Khóa cuộn trang khi Modal mở (pattern chuẩn từ EntryGateModal)
  React.useEffect(() => {
    if (!isOpen) return
    const scrollY = window.scrollY
    document.body.style.setProperty("position", "fixed", "important")
    document.body.style.setProperty("top", `-${scrollY}px`, "important")
    document.body.style.setProperty("width", "100%", "important")
    document.body.style.setProperty("overflow-y", "scroll", "important")
    return () => {
      const savedTop = document.body.style.top
      document.body.style.removeProperty("position")
      document.body.style.removeProperty("top")
      document.body.style.removeProperty("width")
      document.body.style.removeProperty("overflow-y")
      if (savedTop) window.scrollTo(0, parseInt(savedTop || "0") * -1)
    }
  }, [isOpen])

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="region-modal-title"
    >
      {/* Backdrop tối + blur mịn */}
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0"
        style={{
          background: "rgba(10, 8, 6, 0.82)",
          backdropFilter: "blur(18px) saturate(120%)",
          WebkitBackdropFilter: "blur(18px) saturate(120%)",
        }}
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Modal Container */}
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className={cn(
          "relative z-10 w-full max-w-2xl rounded-3xl border border-[var(--color-border-default)]",
          "bg-[var(--color-surface-elevated)] p-5 sm:p-8 shadow-2xl shadow-black/60",
          !isOpen && "pointer-events-none"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-[var(--color-border-default)]">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)] mb-1">
              Settings
            </p>
            <h2
              id="region-modal-title"
              className="text-xl font-bold text-[var(--color-text-primary)] font-[family-name:var(--font-family-heading)]"
            >
              Select Region
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] focus:outline-none transition-all border-0 bg-transparent"
            aria-label="Close modal"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Grid items */}
        <div ref={gridRef} className="relative grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 py-2">
          {REGION_OPTIONS.map((opt, index) => {
            const isActive = selectedRegion === opt.value
            return (
              <button
                ref={(el) => {
                  // Ghi ref của từng card vào mảng theo index
                  cardRefs.current[index] = el
                }}
                key={opt.value}
                type="button"
                onClick={() => onRegionSelect(opt.value)}
                style={{ willChange: "transform" }}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-3 px-3 py-6 rounded-2xl outline-none",
                  "border bg-[var(--color-surface-1)] transition-all duration-150 origin-center",
                  isActive
                    ? "text-[var(--color-text-primary)] border-[var(--color-primary)]"
                    : "text-[var(--color-text-secondary)] border-[var(--color-border-default)]"
                )}
              >
                {/* Active indicator */}
                {isActive && (
                  <m.div
                    layoutId="activeRegionModalBg"
                    className="absolute inset-0 bg-[var(--color-surface-base)] border border-[var(--color-primary)] rounded-[inherit] shadow-xs z-0"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    exit={{ opacity: 0, transition: { duration: 0.1 } }}
                  />
                )}

                {/* Flag + Short Label */}
                <div className="relative z-10 flex flex-col items-center gap-2 select-none pointer-events-none">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getFlagCdnUrl(opt.countryName, 160)}
                    className="w-10 h-10 object-cover rounded-full border border-stone-200/50 shadow-sm shrink-0"
                    alt=""
                  />
                  <span className="text-sm font-bold tracking-wider font-[family-name:var(--font-family-heading)]">
                    {opt.shortLabel}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </m.div>
    </div>
  )

  return typeof window !== "undefined"
    ? createPortal(
        <AnimatePresence>{isOpen && modalContent}</AnimatePresence>,
        document.body
      )
    : null
}
