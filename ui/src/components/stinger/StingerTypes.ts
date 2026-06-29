// src/components/stinger/StingerTypes.ts

import type { ReactNode } from "react"

export type StingerCallback = () => void | Promise<void>

export interface StingerOverlayHandle {
  trigger: (callback: StingerCallback) => void
}

export interface StingerOverlayProps {
  duration: number
  stagger: number
  onAnimatingChange?: (value: boolean) => void
}

export interface StingerProviderProps {
  children: ReactNode
  duration?: number
  stagger?: number
}

export interface StingerContextValue {
  triggerStinger: (callback: StingerCallback) => void
  isAnimating: boolean
}

// Layer colors — deepest (index 0) to frontmost (index 2)
// Index 0+1: màu thương hiệu — tạo hiệu ứng quét màn hình ấn tượng
// Index 2: var(--background) — lớp trước nhất hoà vào nền trang tại điểm mù,
//          đảm bảo chuyển cảnh liền mạch (light/dark adaptive, như SplashScreen)
export const LAYER1_COLORS = [
  "rgba(217,119,6,0.55)",       // amber-600/55 — deepest, top-left
  "#d97706",                     // amber-600 solid
  "var(--background)",          // frontmost — blends with page bg at blind spot
] as const

export const LAYER2_COLORS = [
  "rgba(15,118,110,0.55)",      // teal-700/55 — deepest, bottom-right
  "#0f766e",                     // teal-700 solid
  "var(--background)",          // frontmost — blends with page bg at blind spot
] as const

export const HOLD_BEFORE_RETRACT = 0.2
