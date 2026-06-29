import { ReactNode } from "react"
import { SessionSidebar } from "@/components/SessionSidebar"

export default function SessionsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-[calc(100vh-64px)] w-full bg-surface-base">
      {/* Khung Chat giữa (Linh động) */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        {children}
      </div>

      {/* Cột Danh sách Chat phải (Cố định width 384px) */}
      <div className="w-96 shrink-0 h-full flex flex-col">
        <SessionSidebar />
      </div>
    </div>
  )
}
