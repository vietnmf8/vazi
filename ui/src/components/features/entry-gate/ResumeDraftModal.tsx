"use client"

import { useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"
import { Spinner } from "@/components/ui/Spinner"
import type { ApplyDraft, Step1FormValues } from "@/app/apply/_components/applySchemas"
import CloseIcon from "@/assets/icons/ui/Close.svg"
import CheckStrokeIcon from "@/assets/icons/ui/CheckStroke.svg"
import { useTranslations } from "next-intl"

export interface ResumeDraftModalProps {
  open: boolean
  draft: ApplyDraft
  isPending?: "continue" | "restart" | null
  onContinue: () => void
  onRestart: () => void
  onDismiss: () => void
}

// Trả về nhãn hiển thị cho loại visa dựa trên category và processing time
function getVisaLabel(step1: Step1FormValues, t: any): string {
  if (step1.visa_category === "code_fasttrack") return t("fast_track")
  if (step1.visa_type === "voa") return t("voa")
  if (step1.processing_time === "normal_7d") return t("standard")
  if (step1.processing_time === "last_minute") return t("last_minute")
  return t("urgent")
}

// Chuyển chuỗi YYYY-MM-DD sang định dạng DD/MM/YYYY để hiển thị
function formatDate(dateStr: string): string {
  const parts = dateStr.split("-")
  return `${parts[2]}/${parts[1]}/${parts[0]}`
}

/**
 * ResumeDraftModal — hiển thị khi người dùng quay lại trang apply và có draft chưa hoàn thành.
 * Cho phép tiếp tục từ bước cũ hoặc bắt đầu lại với loại visa khác.
 */
export function ResumeDraftModal({ open, draft, isPending = null, onContinue, onRestart, onDismiss }: ResumeDraftModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const t = useTranslations("EntryGate.ResumeDraftModal")
  
  // Kiểm tra loại visa trong bản nháp để xác định đây có phải FastTrack không
  const isFastTrack = draft.step1?.visa_category === "code_fasttrack"
  
  const STEP_LABELS = isFastTrack 
    ? [t("step2"), t("step3")] 
    : [t("step1"), t("step2"), t("step3")]

  // EntryGateContext guarantees draft.currentStep >= 2 before opening this modal
  const rawCurrentStep = draft.currentStep ?? 2
  const currentStep = isFastTrack ? rawCurrentStep - 1 : rawCurrentStep

  // Khóa cuộn trang (scroll lock) theo pattern chuẩn để tránh giật giao diện (Layout Shift)
  useEffect(() => {
    if (!open) return

    const scrollY = window.scrollY
    document.body.style.setProperty("position", "fixed", "important")
    document.body.style.setProperty("top", `-${scrollY}px`, "important")
    document.body.style.setProperty("width", "100%", "important")
    document.body.style.setProperty("overflow-y", "scroll", "important")

    const handleKey = (e: KeyboardEvent) => {
      // Không cho dismiss khi đang chờ navigation — modal đang làm loading overlay
      if (e.key === "Escape" && !isPending) onDismiss()
    }
    document.addEventListener("keydown", handleKey)

    return () => {
      const savedTop = document.body.style.top
      document.body.style.removeProperty("position")
      document.body.style.removeProperty("top")
      document.body.style.removeProperty("width")
      document.body.style.removeProperty("overflow-y")
      if (savedTop) window.scrollTo(0, parseInt(savedTop || "0") * -1)
      document.removeEventListener("keydown", handleKey)
    }
  }, [open, onDismiss, isPending])

  // Focus trap: chuyển tiêu điểm vào bên trong modal để hỗ trợ tiếp cận (Accessibility)
  useEffect(() => {
    if (open && dialogRef.current) {
      const firstFocusable = dialogRef.current.querySelector<HTMLElement>(
        "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"
      )
      firstFocusable?.focus()
    }
  }, [open])

  if (!open || typeof window === "undefined") return null

  // Xây dựng nội dung pill tóm tắt thông tin draft (visa label · số người · ngày đến)
  const step1 = draft.step1
  const pillParts: string[] = []
  if (step1) {
    pillParts.push(getVisaLabel(step1, t))
    if (step1.applicant_count) pillParts.push(`${step1.applicant_count} ${t("people")}`)
    if (step1.arrival_date) pillParts.push(`${t("arrival_prefix")} ${formatDate(step1.arrival_date)}`)
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="resume-draft-title"
      aria-describedby="resume-draft-desc"
    >
      {/* Backdrop tối + blur mịn — click ra ngoài để đóng modal */}
      <div
        className="absolute inset-0 animate-in fade-in duration-200"
        style={{
          background: "rgba(10, 8, 6, 0.82)",
          backdropFilter: "blur(18px) saturate(120%)",
          WebkitBackdropFilter: "blur(18px) saturate(120%)",
        }}
        aria-hidden="true"
        onClick={isPending ? undefined : onDismiss}
      />

      {/* Dialog Card */}
      {/* Điều chỉnh padding nhỏ hơn trên mobile để tăng không gian hiển thị cho các nút hành động và sơ đồ tiến trình */}
      <div
        ref={dialogRef}
        className={cn(
          "relative z-10 w-full max-w-2xl rounded-3xl border border-(--color-border-default)",
          "bg-[var(--color-surface-elevated)] shadow-2xl shadow-black/60",
          "animate-in fade-in slide-in-from-bottom-4 duration-300 py-5 sm:p-10"
        )}
      >
        {/* Nút đóng góc trên-phải */}
        <button
          type="button"
          onClick={onDismiss}
          disabled={isPending !== null}
          aria-label="Đóng"
          className={cn(
            "absolute top-5 right-5 flex items-center justify-center size-8 rounded-full",
            "text-(--color-text-tertiary) transition-all",
            "hover:text-(--color-text-primary) hover:bg-(--color-surface-base) transition-all",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A96E]",
            isPending !== null && "opacity-40 pointer-events-none"
          )}
        >
          <CloseIcon className="size-5" aria-hidden="true" />
        </button>

        <h2
          id="resume-draft-title"
          className="text-xl sm:text-2xl font-bold text-(--color-text-primary) mb-4 text-center"
        >
          {t("title")}
        </h2>

        {/* Pill tóm tắt thông tin visa — chỉ hiện khi step1 có đủ dữ liệu */}
        {pillParts.length > 0 && (
          <div className="flex justify-center mb-6">
            <p className="inline-flex bg-(--color-surface-base) rounded-lg px-3 sm:px-4 py-1.5 sm:py-2 text-sm sm:text-base font-medium text-(--color-text-secondary)">
              {pillParts.join(" · ")}
            </p>
          </div>
        )}

        {/* Mini Stepper — gương ApplicationStepper: circle + line + label */}
        {/* Hạ cỡ chữ của nhãn tiến trình xuống 14px (text-sm) trên mobile nhằm tránh hiện tượng các nhãn bị đè chồng lên nhau gây díu chữ */}
        {/* Dãn khoảng cách dọc của infographic (my-8 sm:my-12) để giao diện thoáng đãng, dễ nhìn hơn */}
        <div
          className="flex items-start my-8 sm:my-12"
          role="list"
          aria-label="Application steps"
        >
          {STEP_LABELS.map((label, idx) => {
            const stepNum = idx + 1
            const isDone = stepNum < currentStep
            const isActive = stepNum === currentStep
            return (
              <div key={label} role="listitem" className="flex-1 flex flex-col items-center relative">
                {/* Connector line — thụt vào 20px mỗi bên để không đè lên circle size-10 */}
                {idx > 0 && (
                  <div
                    aria-hidden
                    className={cn(
                      "absolute top-5 h-px -translate-y-1/2",
                      isDone || isActive
                        ? "bg-[var(--color-secondary-light)]"
                        : "bg-(--color-border-default)",
                    )}
                    style={{ right: "calc(50% + 20px)", width: "calc(100% - 40px)" }}
                  />
                )}
                {/* Circle */}
                <span
                  className={cn(
                    "relative z-10 flex size-10 items-center justify-center rounded-full border-2 text-base font-bold transition-all",
                    isActive && "border-[var(--color-text-primary)] bg-[var(--color-text-primary)] text-[var(--color-surface-base)]",
                    isDone && "border-[var(--color-secondary-light)] bg-transparent text-[var(--color-secondary-light)]",
                    !isActive && !isDone && "border-(--color-border-default) bg-(--color-surface-base) text-(--color-text-tertiary)",
                  )}
                >
                  {isDone ? (
                    <CheckStrokeIcon className="size-5" aria-hidden="true" />
                  ) : stepNum}
                </span>
                {/* Label */}
                <span
                  className={cn(
                    "mt-3 text-sm sm:text-base text-center leading-normal",
                    isActive ? "font-medium text-[var(--color-text-primary)]" : isDone ? "text-[var(--color-secondary-light)]" : "text-[var(--color-text-tertiary)]"
                  )}
                >
                  {label}
                </span>
              </div>
            )
          })}
        </div>

        <p id="resume-draft-desc" className="text-sm sm:text-base text-(--color-text-secondary) mb-6 sm:mb-8 text-center">
          {t("desc_prefix")} {currentStep}/{STEP_LABELS.length}.
          <br />
          {t("desc_suffix")}
        </p>

        {/* Action buttons */}
        {/* Giảm kích thước đệm (padding) và cài đặt cỡ chữ 14px (text-sm) kèm whitespace-nowrap để đảm bảo nút không bị xuống hàng trên màn hình hẹp */}
        <div className="flex flex-wrap gap-2 sm:gap-3 justify-center">
          <button
            type="button"
            onClick={onRestart}
            disabled={isPending !== null}
            className={cn(
              "flex items-center gap-2 px-3 sm:px-5 py-2 sm:py-2.5 text-sm rounded-xl border border-(--color-border-default) whitespace-nowrap",
              "text-(--color-text-secondary) transition-all",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A96E]",
              isPending === null && "hover:bg-(--color-surface-base) transition-all",
              isPending !== null && isPending !== "restart" && "opacity-40 pointer-events-none"
            )}
          >
            {isPending === "restart" ? <Spinner className="size-4" /> : t("restart_btn")}
          </button>
          <button
            type="button"
            onClick={onContinue}
            disabled={isPending !== null}
            className={cn(
              "flex items-center gap-2 px-3 sm:px-5 py-2 sm:py-2.5 text-sm rounded-xl whitespace-nowrap",
              "bg-[var(--color-primary)] text-white dark:text-black font-semibold transition-opacity",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A96E]",
              isPending === null && "hover:opacity-90 transition-all",
              isPending !== null && isPending !== "continue" && "opacity-40 pointer-events-none"
            )}
          >
            {isPending === "continue" ? <Spinner className="size-4" /> : t("continue_btn")}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
