"use client"

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { gsap } from "gsap"
import { useGSAP } from "@gsap/react"
import FastVisaLogo from "@/components/ui/FastVisaLogo"
import {
  HOLD_BEFORE_RETRACT,
  LAYER1_COLORS,
  LAYER2_COLORS,
  type StingerCallback,
  type StingerOverlayHandle,
  type StingerOverlayProps,
} from "./StingerTypes"

gsap.registerPlugin(useGSAP)

export const StingerOverlay = forwardRef<StingerOverlayHandle, StingerOverlayProps>(
  function StingerOverlay({ duration, stagger, onAnimatingChange }, ref) {
    const containerRef = useRef<HTMLDivElement>(null)
    const layer1Refs = useRef<(HTMLDivElement | null)[]>([])
    const layer2Refs = useRef<(HTMLDivElement | null)[]>([])
    const gapSealerRef = useRef<HTMLDivElement>(null)
    const meshGlowContainerRef = useRef<HTMLDivElement>(null)
    const logoRef = useRef<HTMLDivElement>(null)
    const isAnimatingRef = useRef(false)
    const mountedRef = useRef(false)
    const onAnimatingChangeRef = useRef(onAnimatingChange)
    const [mounted, setMounted] = useState(false)

    useEffect(() => { onAnimatingChangeRef.current = onAnimatingChange }, [onAnimatingChange])

    useEffect(() => {
      mountedRef.current = true
      setMounted(true)
      return () => { mountedRef.current = false }
    }, [])

    const { contextSafe } = useGSAP({
      scope: containerRef,
      dependencies: [mounted],
    })

    const trigger = contextSafe(async (callback: StingerCallback) => {
      if (isAnimatingRef.current) return
      isAnimatingRef.current = true
      onAnimatingChangeRef.current?.(true)

      const l1 = layer1Refs.current.filter(Boolean) as HTMLDivElement[]
      const l2 = layer2Refs.current.filter(Boolean) as HTMLDivElement[]
      const logo = logoRef.current

      const gapSealer = gapSealerRef.current

      // Reset: KHÔNG dùng clearProps:"all" vì nó gọi element.style.cssText=""
      // làm mất background:color đã được React set qua inline style prop.
      // Chỉ reset đúng các property GSAP đã từng set ở lần chạy trước.
      if (logo) gsap.set(logo, { opacity: 0, scale: 0.5, rotation: -45 })
      if (gapSealer) gsap.set(gapSealer, { display: "none" })
      if (meshGlowContainerRef.current) gsap.set(meshGlowContainerRef.current, { opacity: 0, display: "none" })
      gsap.set([...l1, ...l2], { display: "none", xPercent: 0, yPercent: 0, clearProps: "clipPath" })

      // L1 diagonal: x+y = 103 (mở rộng đến 108%)
      // L2 diagonal: x+y = 100 (giữ ở 105%)
      // → overlap band 3% dọc đường chéo, triệt tiêu hoàn toàn sub-pixel gap
      gsap.set(l1, {
        display: "block",
        clipPath: "polygon(-5% -5%, 108% -5%, -5% 108%)",
        xPercent: -100,
        yPercent: -100,
      })
      gsap.set(l2, {
        display: "block",
        clipPath: "polygon(105% 105%, -5% 105%, 105% -5%)",
        xPercent: 100,
        yPercent: 100,
      })

      const maxStag       = stagger * 2
      const fullCover     = duration + maxStag
      const logoAt        = fullCover - 0.2
      
      // SỬA LỖI TIMELINE:
      // Điểm Climax (Hang time) của back.out(2.5) xảy ra ở 52.38% thời gian.
      // 0.6s * 0.5238 ≈ 0.314s. Tại đây Logo to nhất và xoay lớn nhất.
      // Dừng timeline đúng tại đỉnh climax này để tận dụng độ trễ Render của React
      // tạo ra cảm giác "lơ lửng" (hang time) vật lý cực kỳ tự nhiên.
      const climaxTime    = logoAt + 0.314
      const pauseAt       = climaxTime
      const retractAt     = pauseAt

      const tl = gsap.timeline({
        onComplete: () => {
          isAnimatingRef.current = false
          onAnimatingChangeRef.current?.(false)
        },
      })

      // Fly IN
      tl.to(l1, { xPercent: 0, yPercent: 0, duration, ease: "expo.inOut", stagger }, 0)
      tl.to(l2, { xPercent: 0, yPercent: 0, duration, ease: "expo.inOut", stagger }, 0)

      // Logo appear (sync)
      if (logo) {
        tl.to(logo, {
          opacity: 1, scale: 1.2, rotation: 0,
          duration: 0.6, ease: "back.out(2.5)",
        }, logoAt)
      }
      if (meshGlowContainerRef.current) {
        tl.to(meshGlowContainerRef.current, {
          opacity: 1, display: "block",
          duration: 0.6, ease: "power2.out",
        }, logoAt)
      }

      // Gap sealer: show khi tất cả layers đã che kín → che mọi anti-aliasing artifact ở đường chéo
      if (gapSealer) tl.call(() => gsap.set(gapSealer, { display: "block" }), [], fullCover)

      // Async-aware hold at blind spot
      tl.call(async () => {
        tl.pause()
        try {
          await Promise.resolve(callback())
        } catch {
          // navigation errors are expected (router.push sometimes throws)
        } finally {
          // Fix độ khựng (stutter) lúc Fly OUT: 
          // Không gọi play() ngay lập tức vì router.push() sẽ block main thread.
          // Nhường 1 frame (rAF) để React đưa tác vụ Render vào queue, 
          // sau đó dùng requestIdleCallback chờ Render xong hẳn mới play().
          requestAnimationFrame(() => {
            if (typeof window !== "undefined" && "requestIdleCallback" in window) {
              (window as any).requestIdleCallback(() => {
                if (mountedRef.current) tl.play()
              }, { timeout: 500 })
            } else {
              setTimeout(() => {
                if (mountedRef.current) tl.play()
              }, 100)
            }
          })
        }
      }, [], pauseAt)

      // Gap sealer: ẩn trước fly-out để fly-out diễn ra bình thường
      if (gapSealer) tl.call(() => gsap.set(gapSealer, { display: "none" }), [], retractAt)

      // Logo hide — simultaneous with fly out
      if (logo) {
        tl.to(logo, {
          opacity: 0, scale: 0.5, rotation: -45,
          duration: 0.35, ease: "power2.in",
        }, retractAt)
      }
      if (meshGlowContainerRef.current) {
        tl.to(meshGlowContainerRef.current, {
          opacity: 0, display: "none",
          duration: 0.35, ease: "power2.in",
        }, retractAt)
      }

      // Fly OUT
      tl.to(l1, {
        xPercent: -100, yPercent: -100,
        duration, ease: "expo.inOut",
        stagger: { each: stagger, from: "end" },
      }, retractAt)
      tl.to(l2, {
        xPercent: 100, yPercent: 100,
        duration, ease: "expo.inOut",
        stagger: { each: stagger, from: "end" },
      }, retractAt)
    })

    useImperativeHandle(ref, () => ({ trigger }), [trigger])

    if (!mounted) return null

    return createPortal(
      <div
        ref={containerRef}
        className="fixed inset-0 overflow-hidden pointer-events-none"
        style={{ zIndex: 9999 }}
        aria-hidden="true"
      >
        {/* Group 1 — top-left diagonal */}
        {LAYER1_COLORS.map((color, i) => (
          <div
            key={`l1-${i}`}
            ref={el => { layer1Refs.current[i] = el }}
            className="absolute inset-0"
            style={{ display: "none", background: color }}
          />
        ))}

        {/* Group 2 — bottom-right diagonal */}
        {LAYER2_COLORS.map((color, i) => (
          <div
            key={`l2-${i}`}
            ref={el => { layer2Refs.current[i] = el }}
            className="absolute inset-0"
            style={{ display: "none", background: color }}
          />
        ))}

        {/* Gap sealer: toàn màn, không clip-path, che mọi sub-pixel artifact ở đường chéo */}
        <div
          ref={gapSealerRef}
          className="absolute inset-0"
          style={{ display: "none", background: "var(--background)" }}
        />

        {/* Mesh Glow Container (Animated by GSAP) */}
        <div
          ref={meshGlowContainerRef}
          className="absolute inset-0 pointer-events-none overflow-hidden"
          style={{ display: "none", opacity: 0 }}
        >
          {/* Tùy chỉnh opacity theo Dark/Light Mode */}
          <div className="absolute inset-0 opacity-30 dark:opacity-50">
            {/* Đốm Mesh 1: Amber Glow */}
            <div
              className="absolute -top-[10%] -left-[10%] w-[60vw] h-[60vw] rounded-full filter blur-[80px] dark:blur-[120px]"
              style={{
                background: "radial-gradient(circle, rgba(217, 119, 6, 0.25) 0%, transparent 70%)",
              }}
            />
            {/* Đốm Mesh 2: Teal Glow */}
            <div
              className="absolute -bottom-[10%] -right-[10%] w-[60vw] h-[60vw] rounded-full filter blur-[80px] dark:blur-[120px]"
              style={{
                background: "radial-gradient(circle, rgba(15, 118, 110, 0.2) 0%, transparent 70%)",
              }}
            />
          </div>
        </div>

        {/* Logo — solid box 1:1, FastVisa SVG */}
        <div
          ref={logoRef}
          className="absolute inset-0 flex items-center justify-center"
          style={{ opacity: 0 }}
        >
          <div
            className="flex items-center justify-center rounded-4xl"
            style={{
              width: 152,
              height: 152,
              background: "var(--color-surface-elevated)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.10)",
            }}
          >
            <FastVisaLogo width={100} height={100} />
          </div>
        </div>
      </div>,
      document.body
    )
  }
)
