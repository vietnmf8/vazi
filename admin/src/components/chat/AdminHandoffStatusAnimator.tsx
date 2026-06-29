"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import type { HandoffPhase } from "@/hooks/useAdminChat"

interface AdminHandoffStatusAnimatorProps {
 phase: HandoffPhase
 connectingText: string
 joinedText: string
}

/** Wrapper CSS grid 0fr→1fr, timing 350ms — reuse pattern TypingBubbleWrapper UI */
function SlideRow({
 show,
 children,
}: {
 show: boolean
 children: React.ReactNode
}) {
 const [mounted, setMounted] = useState(show)
 const [open, setOpen] = useState(false)
 const wrapperRef = useRef<HTMLDivElement>(null)

 useLayoutEffect(() => {
 if (show && !mounted) setMounted(true)
 }, [show, mounted])

 useEffect(() => {
 if (!show) {
 setOpen(false)
 const t = setTimeout(() => setMounted(false), 350)
 return () => clearTimeout(t)
 }
 }, [show])

 useLayoutEffect(() => {
 if (show && mounted && wrapperRef.current) {
 void wrapperRef.current.offsetWidth
 const id = requestAnimationFrame(() => setOpen(true))
 return () => cancelAnimationFrame(id)
 }
 }, [show, mounted])

 if (!mounted) return null

 return (
 <div
 ref={wrapperRef}
 className="grid"
 style={{
 gridTemplateRows: open ? "1fr" : "0fr",
 opacity: open ? 1 : 0,
 transform: open ? "translateY(0)" : "translateY(8px)",
 transition:
 "grid-template-rows 350ms ease, opacity 350ms ease, transform 350ms ease",
 }}
 >
 <div style={{ overflow: "hidden" }}>{children}</div>
 </div>
 )
}

function StatusPill({ text }: { text: string }) {
 if (!text) return null

 return (
 <div className="flex justify-center py-1">
 <span
 className="px-3 py-1 rounded-full text-center"
 style={{
 backgroundColor: "color-mix(in srgb, var(--color-info) 12%, transparent)",
 color: "var(--color-info)",
 fontSize: "var(--font-size-xs)",
 border: "1px solid color-mix(in srgb, var(--color-info) 25%, transparent)",
 }}
 >
 {text}
 </span>
 </div>
 )
}

/**
 * Animator trạng thái handoff — chỉ hiển thị JOINED (slide xuống rồi về IDLE).
 * Trạng thái CONNECTING không hiển thị ở đây vì gray pill trong list đã đủ,
 * tránh hiển thị 2 dòng trùng nhau.
 */
export function AdminHandoffStatusAnimator({
 phase,
 connectingText: _connectingText,
 joinedText,
}: AdminHandoffStatusAnimatorProps) {
 const showJoined = phase === "JOINED"

 if (phase === "IDLE") return null

 return (
 <div aria-live="polite" aria-atomic="true">
 <SlideRow show={showJoined}>
 <StatusPill text={joinedText} />
 </SlideRow>
 </div>
 )
}
