"use client"

import { MessageSquare } from "lucide-react"
import { t } from "@/lib/i18n"

export default function SessionsPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center h-full space-y-4" style={{ backgroundColor: "var(--color-surface-base)" }}>
      <div 
        className="w-16 h-16 rounded-full flex items-center justify-center"
        style={{ backgroundColor: "var(--color-surface-elevated)" }}
      >
        <MessageSquare size={32} style={{ color: "var(--color-text-muted)" }} />
      </div>
      <p style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-md)" }}>
        Chọn một đoạn chat từ danh sách bên phải để bắt đầu
      </p>
    </div>
  )
}
