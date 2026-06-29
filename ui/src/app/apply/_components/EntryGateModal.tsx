"use client"

import { useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { m } from "framer-motion"
import { X, Zap, FileText } from "lucide-react"
import { cn } from "@/lib/utils"
import { Spinner } from "@/components/ui/Spinner"
import { useTranslations } from "next-intl"

export type EntryChoice = "new-application" | "existing-urgent" | "fast-track-apply"

interface EntryGateModalProps {
  isOpen: boolean
  hideFastTrack?: boolean
  onClose: (choice: EntryChoice | "close") => void
  pendingChoice?: EntryChoice | null
  whatsappUrl?: string
}

/**
 * Entry Gate Expedited Warning Modal (#evisa-popup) — hiển thị dạng Dialog nổi.
 * Phân luồng khách truy cập: làm hồ sơ mới vs. đã nộp nhưng cần hỗ trợ khẩn cấp/Fast-Track.
 */
export function EntryGateModal({
  isOpen,
  hideFastTrack = false,
  onClose,
  pendingChoice = null,
  whatsappUrl = "https://wa.me/84965800392",
}: EntryGateModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const t = useTranslations("EntryGateModal")

  // Khóa cuộn trang (scroll lock) theo pattern chuẩn để tránh giật giao diện (Layout Shift)
  useEffect(() => {
    if (!isOpen) return

    const scrollY = window.scrollY
    document.body.style.setProperty("position", "fixed", "important")
    document.body.style.setProperty("top", `-${scrollY}px`, "important")
    document.body.style.setProperty("width", "100%", "important")
    document.body.style.setProperty("overflow-y", "scroll", "important")

    const handleKey = (e: KeyboardEvent) => {
      // Nhấn ESC sẽ đóng modal tại chỗ, trả về "close" thay vì tự động đi tiếp luồng "new-application"
      if (e.key === "Escape") onClose("close")
    }
    document.addEventListener("keydown", handleKey)

    return () => {
      const savedTop = document.body.style.top
      document.body.style.removeProperty("position")
      document.body.style.removeProperty("top")
      document.body.style.removeProperty("width")
      document.body.style.removeProperty("overflow-y")
      if (savedTop) {
        window.scrollTo(0, parseInt(savedTop || "0") * -1)
      }
      document.removeEventListener("keydown", handleKey)
    }
  }, [isOpen, onClose])

  // Focus trap: chuyển tiêu điểm vào bên trong modal để hỗ trợ tiếp cận (Accessibility)
  useEffect(() => {
    if (isOpen && dialogRef.current) {
      const firstFocusable = dialogRef.current.querySelector<HTMLElement>(
        "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"
      )
      firstFocusable?.focus()
    }
  }, [isOpen])

  if (!isOpen || typeof window === "undefined") return null

  // isNavigating = true khi đang chờ điều hướng sau khi người dùng chọn một option
  const isNavigating = pendingChoice !== null

  const portal = createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      id="evisa-popup"
      aria-modal="true"
      aria-labelledby="entry-gate-title"
      aria-describedby="entry-gate-desc"
    >
      {/* Backdrop tối + blur mịn */}
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0"
        style={{
          background: "rgba(10, 8, 6, 0.82)",
          backdropFilter: "blur(18px) saturate(120%)",
          WebkitBackdropFilter: "blur(18px) saturate(120%)",
        }}
        aria-hidden="true"
        // Click ra ngoài backdrop sẽ đóng modal tại chỗ mà không chuyển trang bừa bãi
        onClick={() => onClose("close")}
      />

      {/* Dialog Card */}
      <m.div
        ref={dialogRef}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className={cn(
          "relative z-10 w-full max-w-4xl rounded-3xl border border-[var(--color-border-default)]",
          "bg-[var(--color-surface-elevated)] shadow-2xl shadow-black/60"
        )}
      >
        {/* Header */}
        <div className="relative border-b border-[var(--color-border-default)] px-8 pt-8 pb-6">
          <button
            type="button"
            // Nút X đóng modal tại chỗ mà không điều hướng đi đâu
            onClick={() => onClose("close")}
            className="absolute right-5 top-5 flex size-9 items-center justify-center rounded-lg text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-base)] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A96E]"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
          <p className="section-label text-(--color-primary) mb-2">
            {t("label")}
          </p>
          <h2
            id="entry-gate-title"
            className="section-subtitle"
          >
            {t("title")}
          </h2>
          <p
            id="entry-gate-desc"
            className="mt-3 body-text-sm max-w-lg"
          >
            {t("desc")}
          </p>
        </div>

        {/* Options Grid: Tự động đổi md:grid-cols-2 hoặc md:grid-cols-3 tùy thuộc vào việc có ẩn Fast-Track hay không */}
        <div className={cn(
          "grid grid-cols-1 gap-5 p-8",
          hideFastTrack ? "md:grid-cols-2" : "md:grid-cols-3"
        )}>

          {/* Option A: New application */}
          <button
            type="button"
            data-ai-element="entry_gate_new_application"
            onClick={() => onClose("new-application")}
            disabled={isNavigating}
            className={cn(
              "group flex flex-col items-start gap-4 rounded-2xl border border-[var(--color-border-default)] p-6 text-left transition-all duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A96E]",
              !isNavigating && "hover:border-[var(--color-text-primary)]/40 hover:bg-[var(--color-surface-base)] transition-all",
              // Button không được chọn sẽ mờ đi khi đang chờ điều hướng
              isNavigating && pendingChoice !== "new-application" && "opacity-40 pointer-events-none"
            )}
          >
            <div className="flex size-12 items-center justify-center rounded-xl bg-[var(--color-surface-base)] border border-[var(--color-border-default)] text-[var(--color-text-tertiary)] group-hover:border-[var(--color-text-primary)]/30 transition-all">
              {pendingChoice === "new-application" ? (
                <Spinner className="size-6" />
              ) : (
                <FileText className="size-6" />
              )}
            </div>
            <div>
              <p className="text-base font-bold text-(--color-text-primary) font-body mb-1.5">
                {t("opt_new_title")}
              </p>
              <p className="caption-text">
                {t("opt_new_desc")}
              </p>
            </div>
          </button>

          {/* Option B: Fast Track Assistance (Chỉ hiển thị khi không bị ẩn) */}
          {!hideFastTrack && (
            <button
              type="button"
              data-ai-element="entry_gate_fast_track_apply"
              onClick={() => onClose("fast-track-apply")}
              disabled={isNavigating}
              className={cn(
                "group flex flex-col items-start gap-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-left transition-all duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
                !isNavigating && "hover:border-emerald-500/60 hover:bg-emerald-500/10 transition-all",
                // Button không được chọn sẽ mờ đi khi đang chờ điều hướng
                isNavigating && pendingChoice !== "fast-track-apply" && "opacity-40 pointer-events-none"
              )}
            >
              <div className="flex size-12 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 dark:text-emerald-400 group-hover:border-emerald-500/50 transition-all">
                {pendingChoice === "fast-track-apply" ? (
                  <Spinner className="size-6 text-emerald-600" />
                ) : (
                  <Zap className="size-6 text-emerald-600" />
                )}
              </div>
              <div>
                <p className="text-base font-bold text-(--color-text-primary) font-body mb-1.5">
                  {t("opt_fasttrack_title")}
                </p>
                <p className="caption-text">
                  {t("opt_fasttrack_desc")}
                </p>
              </div>
            </button>
          )}

          {/* Option C: Already applied, need urgent help */}
          <button
            type="button"
            data-ai-element="entry_gate_existing_urgent"
            onClick={() => onClose("existing-urgent")}
            disabled={isNavigating}
            className={cn(
              "group flex flex-col items-start gap-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 text-left transition-all duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500",
              "group flex flex-col items-start gap-4 rounded-2xl border border-(--color-primary)/30 bg-(--color-primary)/5 p-6 text-left transition-all duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-primary)",
              !isNavigating && "hover:border-(--color-primary)/60 hover:bg-(--color-primary)/10 transition-all",
              // Button không được chọn sẽ mờ đi khi đang chờ điều hướng
              isNavigating && pendingChoice !== "existing-urgent" && "opacity-40 pointer-events-none"
            )}
          >
            <div className="flex size-12 items-center justify-center rounded-xl bg-(--color-primary)/10 border border-(--color-primary)/30 text-(--color-primary) group-hover:border-(--color-primary)/50 transition-all">
              {pendingChoice === "existing-urgent" ? (
                <Spinner className="size-6 text-(--color-primary)" />
              ) : (
                <Zap className="size-6" />
              )}
            </div>
            <div>
              <p className="text-base font-bold text-(--color-text-primary) font-body mb-1.5">
                {t("opt_urgent_title")}
              </p>
              <p className="caption-text">
                {t("opt_urgent_desc")}
              </p>
            </div>
          </button>

        </div>

        {/* Footer note */}
        <div className="border-t border-[var(--color-border-default)] px-8 py-5">
          <p className="caption-text text-center">
            {t("footer_need_help")}{" "}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-500 hover:text-emerald-400 font-semibold transition-all"
            >
              {t("footer_whatsapp")}
            </a>
          </p>
        </div>
      </m.div>
    </div>,
    document.body
  )

  return portal
}

