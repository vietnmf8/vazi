"use client"

import { AdminHeader } from "@/components/layout/AdminHeader"
import { AdminSidebar } from "@/components/layout/AdminSidebar"
import { AdminNotificationsProvider } from "@/hooks/useAdminNotifications"

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <AdminNotificationsProvider>
      <div className="flex flex-col h-svh overflow-hidden">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-white"
        >
          Bỏ qua đến nội dung chính
        </a>
        <AdminHeader />
        <div className="flex flex-1 overflow-hidden">
          <AdminSidebar />
          <main
            id="main-content"
            className="flex-1 overflow-auto"
            style={{ backgroundColor: "var(--color-surface-base)" }}
          >
            {children}
          </main>
        </div>
      </div>
    </AdminNotificationsProvider>
  )
}
