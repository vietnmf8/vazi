"use client"

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import toast from "react-hot-toast"
import { useRouter, usePathname } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { getPusherClient } from "@/lib/soketi"

export type NotificationType = "session" | "application" | "comment" | "newsletter"

export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  description: string
  timestamp: string
  read: boolean
  link: string
}

export interface AdminNotificationsContextValue {
  counts: Record<NotificationType, number>
  totalCount: number
  notifications: AppNotification[]
  chatUnreadCounts: Record<string, number>
  totalChatUnread: number
  onlineSessions: Set<string>
  clearCount: (type: NotificationType) => void
  markAsRead: (id: string) => void
  clearChatUnread: (sessionId: string) => void
}

const AdminNotificationsContext = createContext<AdminNotificationsContextValue | undefined>(undefined)

interface AdminHandoffRequestPayload {
  session_id: string
  guest_name: string
  preview_message: string
  timestamp: string
}

interface AdminNewSessionPayload {
  session_id: string
  guest_name: string
  timestamp: string
}

export function AdminNotificationsProvider({ children }: { children: React.ReactNode }) {
  const [counts, setCounts] = useState<Record<NotificationType, number>>({
    session: 0,
    application: 0,
    comment: 0,
    newsletter: 0,
  })
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  
  // Badge theo từng session
  const [chatUnreadCounts, setChatUnreadCounts] = useState<Record<string, number>>({})
  const totalChatUnread = Object.values(chatUnreadCounts).reduce((a, b) => a + b, 0)
  
  // Trạng thái online
  const [onlineSessions, setOnlineSessions] = useState<Set<string>>(new Set())
  const onlineTimeoutsRef = useRef<Record<string, NodeJS.Timeout>>({})

  const router = useRouter()
  const pathname = usePathname()
  const routerRef = useRef(router)
  routerRef.current = router
  const queryClient = useQueryClient()

  const totalCount = Object.values(counts).reduce((a, b) => a + b, 0)

  const clearChatUnread = useCallback((sessionId: string) => {
    setChatUnreadCounts(prev => {
      const next = { ...prev }
      delete next[sessionId]
      return next
    })
  }, [])

  // Auto clear chat unread when currently viewing that session
  useEffect(() => {
    const match = pathname.match(/^\/sessions\/([^/]+)/)
    if (match) {
      const sessionId = match[1]
      clearChatUnread(sessionId)
    }
  }, [pathname, clearChatUnread])

  const clearCount = useCallback((type: NotificationType) => {
    setCounts((prev) => ({ ...prev, [type]: 0 }))
    setNotifications((prev) => 
      prev.map(n => n.type === type ? { ...n, read: true } : n)
    )
  }, [])

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }, [])

  const addNotification = useCallback((type: NotificationType, title: string, description: string, link: string) => {
    setCounts((prev) => ({ ...prev, [type]: prev[type] + 1 }))
    setNotifications((prev) => [
      {
        id: Math.random().toString(36).substring(7),
        type,
        title,
        description,
        timestamp: new Date().toISOString(),
        read: false,
        link
      },
      ...prev
    ])
  }, [])

  useEffect(() => {
    const pusher = getPusherClient()
    if (!pusher) return

    const channel = pusher.subscribe("admin-notifications")
    const systemChannel = pusher.subscribe("system-events")

    channel.bind("pusher:subscription_error", (err: unknown) => {
      console.error("[Notifications] Subscription error:", err)
    })

    const handleSessionClosed = (payload: { session_id: string }) => {
      if (payload && payload.session_id) {
        setChatUnreadCounts(prev => {
          const next = { ...prev }
          delete next[payload.session_id]
          return next
        })
      }
      window.dispatchEvent(new CustomEvent("refetch-sessions"))
    }

    channel.bind("SESSION_CLOSED_BY_CLIENT", handleSessionClosed)
    channel.bind("SESSION_CLOSED", handleSessionClosed)

    channel.bind("admin_new_session", (payload: AdminNewSessionPayload) => {
      addNotification("session", `Có khách mới: ${payload.guest_name}`, "Vừa bắt đầu chat", `/sessions/${payload.session_id}`)
      
      if (window.location.pathname !== `/sessions/${payload.session_id}`) {
        setChatUnreadCounts(prev => ({
          ...prev,
          [payload.session_id]: (prev[payload.session_id] || 0) + 1
        }))
      }

      window.dispatchEvent(new CustomEvent("refetch-sessions"))

      toast.custom(
        (toastInstance) => (
          <div
            className="flex flex-col gap-2 rounded-xl px-4 py-3 shadow-lg pointer-events-auto min-w-72 max-w-sm"
            style={{
              backgroundColor: "var(--color-surface-elevated)",
              border: "1px solid var(--color-border-default)",
            }}
          >
            <p className="font-semibold" style={{ color: "var(--color-text-primary)", fontSize: "var(--font-size-md)" }}>
              Có khách mới: {payload.guest_name}
            </p>
            <p style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)" }}>
              Vừa bắt đầu chat
            </p>
            <div className="flex gap-2 mt-1">
              <button
                type="button"
                className="flex-1 rounded-lg py-1.5 text-sm font-medium transition-opacity hover:opacity-80"
                style={{ backgroundColor: "var(--color-info)", color: "#fff" }}
                onClick={() => {
                  toast.dismiss(toastInstance.id)
                  routerRef.current.push(`/sessions/${payload.session_id}`)
                }}
              >
                Xem session
              </button>
              <button
                type="button"
                className="rounded-lg px-3 py-1.5 text-sm transition-opacity hover:opacity-80"
                style={{
                  backgroundColor: "var(--color-surface-base)",
                  color: "var(--color-text-muted)",
                  border: "1px solid var(--color-border-default)",
                }}
                onClick={() => toast.dismiss(toastInstance.id)}
              >
                Bỏ qua
              </button>
            </div>
          </div>
        ),
        { duration: 6000 },
      )
    })

    channel.bind("admin_handoff_request", (payload: AdminHandoffRequestPayload) => {
      addNotification("session", `${payload.guest_name} cần hỗ trợ`, payload.preview_message, `/sessions/${payload.session_id}`)
      
      if (window.location.pathname !== `/sessions/${payload.session_id}`) {
        setChatUnreadCounts(prev => ({
          ...prev,
          [payload.session_id]: (prev[payload.session_id] || 0) + 1
        }))
      }

      window.dispatchEvent(new CustomEvent("refetch-sessions"))

      toast.custom(
        (toastInstance) => (
          <div
            className="flex flex-col gap-2 rounded-xl px-4 py-3 shadow-xl pointer-events-auto min-w-72 max-w-sm"
            style={{
              backgroundColor: "var(--color-surface-elevated)",
              border: "1px solid var(--color-border-default)",
            }}
          >
            <p className="font-semibold" style={{ color: "var(--color-text-primary)", fontSize: "var(--font-size-md)" }}>
              {payload.guest_name} cần hỗ trợ
            </p>
            <p className="line-clamp-2" style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)" }}>
              {payload.preview_message}
            </p>
            <div className="flex gap-2 mt-1">
              <button
                type="button"
                className="flex-1 rounded-lg py-1.5 text-sm font-medium transition-opacity hover:opacity-80"
                style={{ backgroundColor: "var(--color-primary)", color: "#fff" }}
                onClick={() => {
                  toast.dismiss(toastInstance.id)
                  routerRef.current.push(`/sessions/${payload.session_id}`)
                }}
              >
                Vào xử lý
              </button>
              <button
                type="button"
                className="rounded-lg px-3 py-1.5 text-sm transition-opacity hover:opacity-80"
                style={{
                  backgroundColor: "var(--color-surface-base)",
                  color: "var(--color-text-muted)",
                  border: "1px solid var(--color-border-default)",
                }}
                onClick={() => toast.dismiss(toastInstance.id)}
              >
                Bỏ qua
              </button>
            </div>
          </div>
        ),
        { duration: 8000 },
      )
    })

    channel.bind("admin_new_message", (payload: { session_id: string, guest_name: string, preview_message: string }) => {
      if (window.location.pathname === `/sessions/${payload.session_id}`) {
        window.dispatchEvent(new CustomEvent("refetch-sessions"))
        return;
      }
      
      setChatUnreadCounts(prev => ({
        ...prev,
        [payload.session_id]: (prev[payload.session_id] || 0) + 1
      }))

      addNotification("session", `${payload.guest_name} đã nhắn tin`, payload.preview_message, `/sessions/${payload.session_id}`)
      window.dispatchEvent(new CustomEvent("refetch-sessions"))
    })

    channel.bind("admin_user_online", (payload: { session_id: string }) => {
      setOnlineSessions(prev => {
        const next = new Set(prev)
        next.add(payload.session_id)
        return next
      })

      if (onlineTimeoutsRef.current[payload.session_id]) {
        clearTimeout(onlineTimeoutsRef.current[payload.session_id])
      }

      onlineTimeoutsRef.current[payload.session_id] = setTimeout(() => {
        setOnlineSessions(prev => {
          const next = new Set(prev)
          next.delete(payload.session_id)
          return next
        })
      }, 30_000)
    })

    // Simulated placeholders for other events (to be triggered from API later)
    channel.bind("admin_new_application", (payload: { id: string, name: string }) => {
      addNotification("application", `Đơn visa mới`, `Từ ${payload.name}`, `/applications/${payload.id}`)
    })

    systemChannel.bind("application_status_changed", (data: { applicationCode: string, status: string, timestamp: number }) => {
      if (data.status === "PAID") {
        addNotification("application", `Đơn hàng mới`, `Mã hồ sơ: ${data.applicationCode} vừa thanh toán`, `/applications`)
        toast.success(`Có đơn hàng mới: ${data.applicationCode}`, { position: "bottom-left", duration: 6000 })
      } else {
        addNotification("application", `Cập nhật đơn`, `Hồ sơ ${data.applicationCode} -> ${data.status}`, `/applications`)
        const msg = `Đơn ${data.applicationCode} -> ${data.status}`
        if (data.status === "COMPLETED") toast.success(msg, { position: "bottom-left" })
        else if (data.status === "REJECTED") toast.error(msg, { position: "bottom-left" })
        else toast.success(msg, { position: "bottom-left", icon: "ℹ️" })
      }
    })

    channel.bind("admin_new_comment", (payload: { article_id: string, user: string }) => {
      addNotification("comment", `Bình luận mới`, `Bởi ${payload.user}`, `/content`)
    })

    channel.bind("admin_new_newsletter", (payload: { email: string }) => {
      addNotification("newsletter", `Đăng ký Newsletter mới`, `${payload.email}`, `/marketing`)
    })

    channel.bind("users_updated", (payload: any) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users-requests"] })
      queryClient.invalidateQueries({ queryKey: ["admin-users"] })
      
      if (payload?.action === "register") {
        toast.success("Có admin mới đăng ký tài khoản!", { position: "bottom-left", duration: 6000 })
      }
    })

    return () => {
      channel.unbind_all()
      systemChannel.unbind_all()
    }
  }, [addNotification, queryClient])

  return (
    <AdminNotificationsContext.Provider value={{
      counts,
      totalCount,
      notifications,
      chatUnreadCounts,
      totalChatUnread,
      onlineSessions,
      clearCount,
      markAsRead,
      clearChatUnread
    }}>
      {children}
    </AdminNotificationsContext.Provider>
  )
}

export function useAdminNotifications() {
  const context = useContext(AdminNotificationsContext)
  if (!context) {
    throw new Error("useAdminNotifications must be used within an AdminNotificationsProvider")
  }
  return context
}
