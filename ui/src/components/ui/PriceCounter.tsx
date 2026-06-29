"use client"

import { m, useAnimation } from "framer-motion"
import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { cn } from "@/lib/utils"

interface PriceCounterProps {
  value: number | string
  className?: string
  format?: boolean
}

const emptySubscribe = () => () => {}

// Scale parent để giữ nguyên cảm giác "pop" ban đầu
const SCALE_UP = {
  scale: [1, 1.26, 1.10, 1],
  transition: {
    duration: 0.42,
    ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    times: [0, 0.18, 0.5, 1],
  },
}

const SCALE_DOWN = {
  scale: [1, 1.22, 1.08, 1],
  transition: {
    duration: 0.42,
    ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    times: [0, 0.18, 0.5, 1],
  },
}

// Effect hiển thị màu xanh/đỏ (opacity 0 -> 1 -> 0)
const OPACITY_EFFECT = {
  opacity: [0, 1, 1, 0],
  transition: {
    duration: 0.42,
    ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    times: [0, 0.1, 0.5, 1],
  },
}

// Effect làm mờ text gốc (opacity 1 -> 0 -> 1) để tránh bị lem màu
const OPACITY_NORMAL = {
  opacity: [1, 0, 0, 1],
  transition: {
    duration: 0.42,
    ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    times: [0, 0.1, 0.5, 1],
  },
}

export function PriceCounter({ value, className, format = true }: PriceCounterProps) {
  const numericValue = typeof value === "number" ? value : parseFloat(String(value)) || 0
  const formatted = format ? `$${numericValue}` : String(numericValue)

  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false)
  
  const scaleControls = useAnimation()
  const effectControls = useAnimation()
  const normalControls = useAnimation()
  
  const prevRef = useRef<number | undefined>(undefined)
  const [direction, setDirection] = useState<"up" | "down">("up")

  useEffect(() => {
    // Bỏ qua lần mount đầu tiên
    if (prevRef.current === undefined) {
      prevRef.current = numericValue
      return
    }
    if (prevRef.current === numericValue) return

    const dir = numericValue > prevRef.current ? "up" : "down"
    setDirection(dir)
    prevRef.current = numericValue
    
    scaleControls.start(dir === "up" ? SCALE_UP : SCALE_DOWN)
    effectControls.start(OPACITY_EFFECT)
    normalControls.start(OPACITY_NORMAL)
  }, [numericValue, scaleControls, effectControls, normalControls])

  if (!mounted) {
    return <span className={cn("inline-block tabular-nums", className)}>{formatted}</span>
  }

  return (
    <m.span
      animate={scaleControls}
      // Dùng inline-grid để cho phép 3 layer đè lên nhau chuẩn xác
      className={cn("relative inline-grid tabular-nums", className)}
      style={{ borderRadius: "8px", transformOrigin: "center" }}
    >
      {/* 1. Lớp Box Shadow Background (Absolute) - GPU Optimized (Opacity) */}
      <m.span
        initial={{ opacity: 0 }}
        animate={effectControls}
        className={cn(
          "absolute -inset-x-1.5 -inset-y-0.5 rounded-md pointer-events-none",
          direction === "up"
            ? "bg-emerald-500/20 shadow-[0_0_0_3px_rgba(16,185,129,0.18),0_0_22px_rgba(16,185,129,0.35)]"
            : "bg-red-500/20 shadow-[0_0_0_3px_rgba(239,68,68,0.16),0_0_20px_rgba(239,68,68,0.30)]"
        )}
      />

      {/* 2. Lớp Text Màu Xanh/Đỏ (Absolute) - GPU Optimized (Opacity) */}
      <m.span
        initial={{ opacity: 0 }}
        animate={effectControls}
        className={cn(
          "col-start-1 row-start-1 z-10 pointer-events-none",
          direction === "up" ? "text-emerald-500 dark:text-emerald-400" : "text-red-500 dark:text-red-400"
        )}
        aria-hidden="true"
      >
        {formatted}
      </m.span>

      {/* 3. Lớp Text Gốc (Vàng/Mặc định) - Bị mờ đi khi đang animate để không lem màu */}
      <m.span
        initial={{ opacity: 1 }}
        animate={normalControls}
        className="col-start-1 row-start-1 z-0"
      >
        {formatted}
      </m.span>
    </m.span>
  )
}
