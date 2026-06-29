"use client"

import React, { createContext, useCallback, useContext, useState, useEffect } from "react"
import { AnimatePresence } from "framer-motion"
import { usePathname } from "next/navigation"
import { EntryGateModal, type EntryChoice } from "@/app/apply/_components/EntryGateModal"
import { ResumeDraftModal } from "./ResumeDraftModal"
import { loadApplyDraft, saveApplyDraft, clearApplyDraft } from "@/app/apply/_components/applyDraftStorage"
import type { ApplyDraft } from "@/app/apply/_components/applySchemas"
import { useStinger } from "@/hooks/useStinger"

/**
 * Cấu hình các hàm callback cho từng lựa chọn của người dùng trong EntryGateModal.
 * Việc gom các callback này giúp các nút bấm ở nhiều nơi (Header, Hero, QuickForm)
 * có thể tùy biến hành vi chuyển hướng khác nhau mà không cần tự render modal riêng biệt.
 */
type GateOptions = {
  hideFastTrack: boolean
  onConfirmNew: () => void
  onConfirmUrgent: () => void
  onConfirmFastTrack?: () => void
  newCategory?: string
}

interface EntryGateContextType {
  openGate: (options: GateOptions) => void
  whatsappUrl: string
}

const EntryGateContext = createContext<EntryGateContextType | undefined>(undefined)

interface EntryGateProviderProps {
  children: React.ReactNode
  whatsappUrl?: string
}

function PathnameListener({ onChange }: { onChange: (path: string) => void }) {
  const pathname = usePathname()
  useEffect(() => {
    onChange(pathname)
  }, [pathname, onChange])
  return null
}

/**
 * Provider quản lý trạng thái đóng/mở và nội dung của Entry Gate Modal toàn cục.
 * Giúp tránh hiện tượng lặp code render modal ở nhiều component trang chủ, marketing,
 * đồng thời giải quyết triệt để lỗi chuyển hướng không mong muốn khi người dùng đóng modal (bằng X, ESC, Backdrop).
 */
export function EntryGateProvider({
  children,
  whatsappUrl = "https://wa.me/84965800392",
}: EntryGateProviderProps) {
  const { triggerStinger } = useStinger()

  // --- EntryGateModal state (existing) ---
  const [isOpen, setIsOpen] = useState(false)
  const [options, setOptions] = useState<GateOptions | null>(null)
  // pendingChoice: giữ modal mở (hiện spinner) cho đến khi Stinger che kín viewport
  const [pendingChoice, setPendingChoice] = useState<EntryChoice | null>(null)

  // --- ResumeDraftModal state (new) ---
  const [isResumeDraftOpen, setIsResumeDraftOpen] = useState(false)
  const [pendingGateOptions, setPendingGateOptions] = useState<GateOptions | null>(null)
  const [resumeDraft, setResumeDraft] = useState<ApplyDraft | null>(null)
  const [isPendingResume, setIsPendingResume] = useState<"continue" | "restart" | null>(null)

  const openGate = (newOptions: GateOptions) => {
    // Flag được set trong app/apply/page.tsx khi trang apply mount lần đầu tiên.
    if (typeof window !== "undefined" && window.sessionStorage.getItem("has_visited_apply") === "true") {
      const draft = loadApplyDraft()
      
      // Kiểm tra xem lựa chọn mới có khác biệt hoàn toàn với bản nháp không
      let isMismatch = false;
      if (newOptions.newCategory && draft?.step1) {
          const draftType = draft.step1.visa_type;
          const isCodeFastTrack = draft.step1.visa_category === "code_fasttrack";
          
          if (newOptions.newCategory === "evisa" && (draftType !== "evisa" || isCodeFastTrack)) isMismatch = true;
          if (newOptions.newCategory === "voa" && draftType !== "voa") isMismatch = true;
          if (newOptions.newCategory === "evisa-code" && !isCodeFastTrack) isMismatch = true;
      }

      if (draft?.currentStep && draft.currentStep >= 2 && !isMismatch) {
        setPendingGateOptions(newOptions)
        setResumeDraft(draft)
        setIsResumeDraftOpen(true)
        return
      }
      
      if (isMismatch) {
         clearApplyDraft();
      }
      
      newOptions.onConfirmNew()
      return
    }
    setOptions(newOptions)
    setIsOpen(true)
  }

  // --- ResumeDraftModal handlers ---
  // Cả hai đường "tiếp tục" và "bắt đầu lại" đều route về onConfirmNew vì
  // resume dialog chỉ xuất hiện trong context người dùng bắt đầu đơn mới —
  // onConfirmUrgent/onConfirmFastTrack không bao giờ trigger resume path này.
  const handleResumeContinue = useCallback(() => {
    const captured = pendingGateOptions
    if (!captured) return
    setIsResumeDraftOpen(false)
    setPendingGateOptions(null)
    setResumeDraft(null)
    setIsPendingResume(null)
    triggerStinger(captured.onConfirmNew)
  }, [pendingGateOptions, triggerStinger])

  const handleResumeRestart = useCallback(() => {
    const captured = pendingGateOptions
    if (!captured) return
    if (resumeDraft) {
      saveApplyDraft({ ...resumeDraft, currentStep: 1 })
    }
    setIsResumeDraftOpen(false)
    setPendingGateOptions(null)
    setResumeDraft(null)
    setIsPendingResume(null)
    triggerStinger(captured.onConfirmNew)
  }, [pendingGateOptions, resumeDraft, triggerStinger])

  const handleResumeDismiss = useCallback(() => {
    setIsResumeDraftOpen(false)
    setPendingGateOptions(null)
    setResumeDraft(null)
    setIsPendingResume(null)
  }, [])

  // --- EntryGateModal handlers (existing) ---
  const handleClose = (choice: EntryChoice | "close") => {
    // pendingChoice là guard chống double-trigger khi stinger đang chạy
    if (!options || pendingChoice) return

    if (choice === "close") {
      // Người dùng chủ động đóng modal (X, ESC, backdrop) — đóng ngay, không navigate
      setIsOpen(false)
      return
    }

    const captured = options
    const navigate =
      choice === "new-application" ? captured.onConfirmNew
      : choice === "existing-urgent" ? captured.onConfirmUrgent
      : captured.onConfirmFastTrack ?? null

    if (!navigate) return

    // Đặt guard ngay — stinger dạt vào che modal luôn, không cần hiện spinner.
    // Modal đóng bên trong callback khi stinger đã che kín viewport (tại điểm mù).
    setPendingChoice(choice)
    triggerStinger(() => {
      setIsOpen(false)
      setOptions(null)
      setPendingChoice(null)
      navigate()
    })
  }

  const handlePathnameChange = useCallback((_: string) => {
    if (isPendingResume !== null) {
      setIsResumeDraftOpen(false)
      setPendingGateOptions(null)
      setResumeDraft(null)
      setIsPendingResume(null)
    }
  }, [isPendingResume])

  return (
    <EntryGateContext.Provider value={{ openGate, whatsappUrl }}>
      {children}
      <React.Suspense fallback={null}>
        <PathnameListener onChange={handlePathnameChange} />
      </React.Suspense>
      <AnimatePresence>
        {isOpen && options && (
          <EntryGateModal
            isOpen={isOpen}
            hideFastTrack={options.hideFastTrack}
            onClose={handleClose}
            whatsappUrl={whatsappUrl}
          />
        )}
      </AnimatePresence>
      {isResumeDraftOpen && resumeDraft && (
        <ResumeDraftModal
          open={isResumeDraftOpen}
          draft={resumeDraft}
          isPending={isPendingResume}
          onContinue={handleResumeContinue}
          onRestart={handleResumeRestart}
          onDismiss={handleResumeDismiss}
        />
      )}
    </EntryGateContext.Provider>
  )
}

/**
 * Hook để các component con gọi hiển thị Entry Gate Modal nhanh chóng.
 */
export function useEntryGate() {
  const context = useContext(EntryGateContext)
  if (!context) {
    throw new Error("useEntryGate must be used within an EntryGateProvider")
  }
  return context
}
