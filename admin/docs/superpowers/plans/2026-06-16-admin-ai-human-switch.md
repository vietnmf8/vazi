# Admin AI/Human Switch Mode — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement realtime AI↔Human mode switching in the admin chat dashboard — toggle switch với confirm dialog, input gating theo `sessionStatus`, global Pusher notifications qua channel `admin-notifications`, và bổ sung Pusher event handlers còn thiếu.

**Architecture:** Backend thêm emit song song vào channel `admin-notifications` tại 2 handoff trigger points. Frontend có `useAdminNotifications` hook mount toàn cục trong `AdminShell`, `SessionChat` dùng toggle pill thay 2 button, `AdminChatInput` disabled khi không phải `HUMAN_HANDLING`.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, pusher-js ^8.5.0, react-hot-toast ^2.6.0, @radix-ui/react-alert-dialog, Tailwind CSS v4, Express 4 (API)

---

## Progress Checklist

> Cập nhật trạng thái từng task trong quá trình implement. Chỉ mark done khi đã verify xong.

### Implementation Tasks

- [x] **Task 1** — Cài `@radix-ui/react-alert-dialog` + tạo AlertDialog wrapper
- [x] **Task 2** — Thêm notification sound `public/sounds/notification.mp3`
- [x] **Task 3** — Tạo `src/lib/soketi.ts` + refactor `useAdminChat`
- [x] **Task 4** — API: emit `admin_handoff_request` vào channel `admin-notifications`
- [x] **Task 5** — Tạo `src/hooks/useAdminNotifications.tsx`
- [x] **Task 6** — Cập nhật `AdminShell` (Toaster + wire notifications)
- [x] **Task 7** — Cập nhật `AdminSidebar` (badge pending)
- [x] **Task 8** — Cập nhật `useSessions` (auto-refresh on custom event)
- [x] **Task 9** — Cập nhật `SessionChat` (toggle switch + confirm dialog)
- [x] **Task 10** — Cập nhật `AdminChatInput` (disabled gating)
- [x] **Task 11** — Cập nhật Session Detail Page
- [x] **Task 12** — Thêm i18n keys vào `vi.json`

### Verification Phase

- [x] **V1** — TypeScript check (admin + api) — PASS
- [x] **V2** — Dev servers + Soketi running (user-enabled); CURL verified live
- [x] **V3-V5** — CURL Tests — 15/15 pass (EC-3 fixed: reject message on CLOSED session)
- [x] **V6** — Admin SSR: login 200, sessions/history 307 (auth redirect)
- [x] **V7** — Log analysis — no critical errors in api.log / app.log
- [x] **V8** — Build pass; lint pre-existing ESLint config error
- [x] **V9** — Test Report — filled below

---

## User Flow

### Flow 1: User request human → Admin nhận notification → Join → Handle → Handback

```
[User side]
  User mở chat widget → nhập tên → join session (status: AI_HANDLING)
  User bấm "Gặp nhân viên" hoặc gõ "I need a human agent"
    → POST /chat/handoff (hoặc keyword detection)
    → API emit "handoff_request" → chat-{sessionId}
    → API emit "admin_handoff_request" → admin-notifications   ← MỚI

[Admin side — bất kỳ trang nào trong dashboard]
  useAdminNotifications nhận "admin_handoff_request"
  → Toast popup + âm thanh: "TestUser cần hỗ trợ" + nút [Vào xử lý]
  → Sidebar badge tăng lên 1
  → Session list tự refresh (refetch-sessions event)

Admin click [Vào xử lý] → navigate /sessions/{sessionId}
  → Toggle pill: [● AI] [ Human ] — AI pill amber, Human disabled
  → Input textarea: disabled, placeholder "AI đang xử lý..."

Admin click pill [Human] → confirm dialog:
  "Tiếp quản hỗ trợ? Bạn sẽ là người hỗ trợ trực tiếp..."
  [Huỷ] [Tiếp quản]
  
Admin click [Tiếp quản] → POST /chat/admin-join
  → Status = HUMAN_HANDLING
  → Toggle: [AI] [● Human] — Human pill teal
  → Input textarea: enabled

Admin gõ và gửi tin nhắn → POST /chat/message (sender: ADMIN)
  → Message hiển thị bên phải (bubble xanh)
  → User nhận realtime qua Pusher

Admin click pill [AI] → confirm dialog:
  "Chuyển lại cho AI? User sẽ được thông báo..."
  [Huỷ] [Chuyển lại AI]

Admin click [Chuyển lại AI] → POST /chat/handback
  → Status = AI_HANDLING
  → Toggle trở về [● AI] [ Human]
  → Input disabled lại
```

### Flow 2: Session bị đóng từ xa (admin khác close)

```
Admin A đang trong session → Admin B (hoặc cùng Admin A ở tab khác) đóng session
  → Pusher emit "session_closed" → chat-{sessionId}
  → useAdminChat.bind("session_closed") → onSessionClosed callback
  → toast.success("Phiên chat đã được đóng")
  → router.push("/sessions") — tự redirect
```

### Flow 3: Vào session đã CLOSED (từ Lịch sử chat)

```
Admin vào /history → click [Xem] → /sessions/{closedSessionId}
  → sessionStatus = "CLOSED"
  → Toggle: cả 2 pill disabled (opacity 40%)
  → Badge: "Đã đóng" (destructive)
  → Input: disabled, placeholder "Phiên chat đã đóng"
  → Chỉ xem lịch sử messages, không action
```

---

## Expected Results

| Scenario | Pre-condition | Action | Expected Result |
|----------|--------------|--------|-----------------|
| Notification realtime | Session AI_HANDLING, admin ở dashboard | User request handoff | Toast xuất hiện trong 1s + âm thanh + badge tăng |
| Session list refresh | Admin ở `/sessions` | User request handoff | List reload không cần F5 |
| Toggle hiển thị đúng | Session AI_HANDLING | Mở session detail | Pill "AI" amber active, "Human" inactive |
| Confirm dialog join | Session AI_HANDLING | Admin click "Human" pill | Dialog title "Tiếp quản hỗ trợ?" xuất hiện |
| Cancel không đổi mode | Dialog đang mở | Click Huỷ | Mode giữ nguyên AI_HANDLING |
| Confirm join | Dialog đang mở | Click Tiếp quản | Status = HUMAN_HANDLING, input enabled |
| Input gating AI | Session AI_HANDLING | Nhìn vào input | Textarea disabled, placeholder đúng |
| Input gating Human | Session HUMAN_HANDLING | Nhìn vào input | Textarea enabled |
| Input gating Closed | Session CLOSED | Nhìn vào input | Textarea disabled, placeholder "đã đóng" |
| Handback confirm | Session HUMAN_HANDLING | Click "AI" pill | Dialog "Chuyển lại cho AI?" xuất hiện |
| Confirm handback | Dialog handback | Click Chuyển lại AI | Status = AI_HANDLING, input disabled |
| Session closed redirect | Đang trong session | session_closed Pusher event | Toast + redirect /sessions |
| Badge reset | Badge > 0 | Navigate sang /sessions | Badge về 0 |

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `admin/src/lib/soketi.ts` | **CREATE** | Shared Pusher client factory |
| `admin/src/hooks/useAdminNotifications.ts` | **CREATE** | Global sub `admin-notifications` → toast + badge |
| `admin/src/components/ui/AlertDialog.tsx` | **CREATE** | Radix AlertDialog wrapper |
| `admin/src/hooks/useAdminChat.ts` | **MODIFY** | Import soketi, thêm 3 Pusher handlers, `onSessionClosed` |
| `admin/src/components/layout/AdminShell.tsx` | **MODIFY** | Add `<Toaster>`, wire `useAdminNotifications` |
| `admin/src/components/layout/AdminSidebar.tsx` | **MODIFY** | Badge pending chat count |
| `admin/src/hooks/useSessions.ts` | **MODIFY** | Auto-refresh on custom event |
| `admin/src/components/SessionChat.tsx` | **MODIFY** | Toggle pill + AlertDialog confirm |
| `admin/src/components/AdminChatInput.tsx` | **MODIFY** | `sessionStatus` prop + disabled gating |
| `admin/src/app/(dashboard)/sessions/[sessionId]/page.tsx` | **MODIFY** | Wire sessionStatus + onSessionClosed |
| `admin/src/messages/vi.json` | **MODIFY** | Thêm chat i18n keys |
| `admin/public/sounds/notification.mp3` | **ADD** | Notification audio |
| `api/src/services/chat.service.ts` | **MODIFY** | Emit `admin_handoff_request` tại 2 locations |

---

## Task 1: Cài @radix-ui/react-alert-dialog + AlertDialog wrapper

**Files:**
- Modify: `admin/package.json`
- Create: `admin/src/components/ui/AlertDialog.tsx`

- [ ] **Step 1: Cài package**

```bash
cd "d:/F8_K15_BTVN/FASTVISA/admin" && npm install @radix-ui/react-alert-dialog
```

Expected: Package installed, `package.json` cập nhật dependency.

- [ ] **Step 2: Tạo `src/components/ui/AlertDialog.tsx`**

```tsx
"use client"

import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog"
import { cn } from "@/lib/utils"

const AlertDialog = AlertDialogPrimitive.Root
const AlertDialogTrigger = AlertDialogPrimitive.Trigger
const AlertDialogPortal = AlertDialogPrimitive.Portal

function AlertDialogOverlay({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay>) {
  return (
    <AlertDialogPrimitive.Overlay
      className={cn(
        "fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        className
      )}
      {...props}
    />
  )
}

function AlertDialogContent({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>) {
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content
        className={cn(
          "fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] rounded-2xl p-6 shadow-xl",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          "data-[state=closed]:slide-out-to-left-1/2 data-[state=open]:slide-in-from-left-1/2",
          className
        )}
        style={{ backgroundColor: "var(--color-surface-elevated)" }}
        {...props}
      />
    </AlertDialogPortal>
  )
}

function AlertDialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-2 mb-5", className)} {...props} />
}

function AlertDialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex justify-end gap-2 mt-6", className)} {...props} />
}

function AlertDialogTitle({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>) {
  return (
    <AlertDialogPrimitive.Title
      className={cn("font-semibold", className)}
      style={{ color: "var(--color-text-primary)", fontSize: "var(--font-size-lg)" }}
      {...props}
    />
  )
}

function AlertDialogDescription({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>) {
  return (
    <AlertDialogPrimitive.Description
      className={cn("leading-relaxed", className)}
      style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-md)" }}
      {...props}
    />
  )
}

function AlertDialogAction({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action>) {
  return (
    <AlertDialogPrimitive.Action
      className={cn(
        "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-40",
        className
      )}
      {...props}
    />
  )
}

function AlertDialogCancel({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel>) {
  return (
    <AlertDialogPrimitive.Cancel
      className={cn(
        "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium transition-opacity hover:opacity-80",
        className
      )}
      style={{
        backgroundColor: "var(--color-surface-base)",
        color: "var(--color-text-muted)",
        border: "1px solid var(--color-border-default)",
      }}
      {...props}
    />
  )
}

export {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd "d:/F8_K15_BTVN/FASTVISA/admin" && npx tsc --noEmit --skipLibCheck 2>&1 | head -20
```

Expected: Không có lỗi liên quan AlertDialog.

---

## Task 2: Thêm notification sound

**Files:**
- Add: `admin/public/sounds/notification.mp3`

- [ ] **Step 1: Tạo thư mục và tải file âm thanh**

```bash
mkdir -p "d:/F8_K15_BTVN/FASTVISA/admin/public/sounds"
curl -L "https://cdn.pixabay.com/audio/2021/08/04/audio_0625c1539c.mp3" \
  -o "d:/F8_K15_BTVN/FASTVISA/admin/public/sounds/notification.mp3"
```

Nếu không có kết nối internet, tạo file placeholder (toast vẫn hoạt động, chỉ thiếu âm thanh):
```bash
mkdir -p "d:/F8_K15_BTVN/FASTVISA/admin/public/sounds"
type nul > "d:/F8_K15_BTVN/FASTVISA/admin/public/sounds/notification.mp3"
```

- [ ] **Step 2: Verify file tồn tại**

```bash
ls "d:/F8_K15_BTVN/FASTVISA/admin/public/sounds/"
```

Expected: `notification.mp3` xuất hiện trong danh sách.

---

## Task 3: Tạo shared Soketi utility + refactor useAdminChat

**Files:**
- Create: `admin/src/lib/soketi.ts`
- Modify: `admin/src/hooks/useAdminChat.ts`

- [ ] **Step 1: Tạo `src/lib/soketi.ts`**

```typescript
import Pusher from "pusher-js"

/**
 * Đọc cấu hình Soketi từ env vars.
 */
export function getSoketiConfig() {
  return {
    key: process.env.NEXT_PUBLIC_SOKETI_KEY ?? "",
    host: process.env.NEXT_PUBLIC_SOKETI_HOST ?? "127.0.0.1",
    port: Number(process.env.NEXT_PUBLIC_SOKETI_PORT ?? "6001"),
    cluster: process.env.NEXT_PUBLIC_SOKETI_CLUSTER ?? "mt1",
    forceTLS: process.env.NEXT_PUBLIC_SOKETI_FORCE_TLS === "true",
  }
}

/**
 * Tạo Pusher client với config Soketi.
 * Trả về null nếu NEXT_PUBLIC_SOKETI_KEY chưa được cấu hình.
 */
export function createPusherClient(): Pusher | null {
  const config = getSoketiConfig()
  if (!config.key) return null
  return new Pusher(config.key, {
    cluster: config.cluster,
    wsHost: config.host,
    wsPort: config.port,
    wssPort: config.port,
    forceTLS: config.forceTLS,
    enabledTransports: config.forceTLS ? ["wss"] : ["ws"],
    disableStats: true,
  })
}
```

- [ ] **Step 2: Ghi đè toàn bộ `src/hooks/useAdminChat.ts`**

```typescript
"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { createPusherClient } from "@/lib/soketi"
import { apiClient } from "@/lib/api"
import type { AdminChatMessage, PusherSendMessagePayload, SessionMessagesResponse } from "@/types/api"

export interface UseAdminChatReturn {
  messages: AdminChatMessage[]
  sessionStatus: string
  guestName: string
  isLoading: boolean
  loadError: string | null
  isSending: boolean
  isUserTyping: boolean
  joinSession: () => Promise<void>
  sendMessage: (text: string) => Promise<void>
  closeSession: () => Promise<void>
  handbackSession: () => Promise<void>
  sendTypingStatus: (isTyping: boolean) => Promise<void>
}

export function useAdminChat(
  sessionId: string,
  options?: { onSessionClosed?: () => void },
): UseAdminChatReturn {
  const [messages, setMessages] = useState<AdminChatMessage[]>([])
  const [sessionStatus, setSessionStatus] = useState("")
  const [guestName, setGuestName] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isSending, setIsSending] = useState(false)
  const [isUserTyping, setIsUserTyping] = useState(false)

  const messageIdsRef = useRef<Set<string>>(new Set())

  // Tải tin nhắn ban đầu
  useEffect(() => {
    let cancelled = false

    async function loadMessages() {
      setIsLoading(true)
      setLoadError(null)
      try {
        const { data } = await apiClient.get<SessionMessagesResponse>(
          `/chat/sessions/${sessionId}/messages`,
        )
        if (cancelled) return
        setMessages(data.messages ?? [])
        setSessionStatus(data.status ?? "")
        setGuestName(data.guest_name ?? "")
        messageIdsRef.current = new Set((data.messages ?? []).map((m) => m.id))
      } catch {
        if (!cancelled) setLoadError("Không thể tải tin nhắn. Vui lòng thử lại.")
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void loadMessages()
    return () => { cancelled = true }
  }, [sessionId])

  // Subscribe Pusher channel
  useEffect(() => {
    const pusher = createPusherClient()
    if (!pusher) return

    const channel = pusher.subscribe(`chat-${sessionId}`)

    channel.bind("typing_status", (payload: { sender: string; is_typing: boolean }) => {
      if (payload.sender === "USER") {
        setIsUserTyping(payload.is_typing)
      }
    })

    channel.bind("handback", () => {
      setSessionStatus("AI_HANDLING")
    })

    // Admin khác join session này
    channel.bind("admin_joined", () => {
      setSessionStatus("HUMAN_HANDLING")
    })

    // Session bị đóng (từ admin khác hoặc timeout)
    channel.bind("session_closed", () => {
      setSessionStatus("CLOSED")
      options?.onSessionClosed?.()
    })

    // User bấm handoff từ UI của họ — cập nhật badge status
    channel.bind("handoff_request", () => {
      setSessionStatus("HUMAN_HANDLING")
    })

    channel.bind("send_message", (payload: PusherSendMessagePayload) => {
      if (messageIdsRef.current.has(payload.id)) return
      messageIdsRef.current.add(payload.id)

      const senderMap: Record<string, string> = { USER: "CUSTOMER", AI: "BOT" }
      const msg: AdminChatMessage = {
        id: payload.id,
        sender_type: senderMap[payload.sender] ?? payload.sender,
        message_type: payload.message_type ?? "TEXT",
        text: payload.message,
        file_url: payload.file_url,
        delivery_status: "DELIVERED",
        created_at: payload.timestamp,
      }
      setMessages((prev) => [...prev, msg])
    })

    return () => {
      channel.unbind_all()
      pusher.unsubscribe(`chat-${sessionId}`)
      pusher.disconnect()
    }
  }, [sessionId, options])

  const joinSession = useCallback(async () => {
    await apiClient.post("/chat/admin-join", { session_id: sessionId })
    setSessionStatus("HUMAN_HANDLING")
  }, [sessionId])

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return
    setIsSending(true)
    try {
      await apiClient.post("/chat/message", {
        session_id: sessionId,
        message: trimmed,
        sender: "ADMIN",
      })
    } finally {
      setIsSending(false)
    }
  }, [sessionId])

  const closeSession = useCallback(async () => {
    await apiClient.patch(`/chat/sessions/${sessionId}/close`)
    setSessionStatus("CLOSED")
  }, [sessionId])

  const handbackSession = useCallback(async () => {
    await apiClient.post("/chat/handback", { session_id: sessionId })
    setSessionStatus("AI_HANDLING")
  }, [sessionId])

  const sendTypingStatus = useCallback(async (isTyping: boolean) => {
    try {
      await apiClient.post("/chat/typing", {
        session_id: sessionId,
        sender: "ADMIN",
        is_typing: isTyping,
      })
    } catch (_) {}
  }, [sessionId])

  return {
    messages,
    sessionStatus,
    guestName,
    isLoading,
    loadError,
    isSending,
    isUserTyping,
    joinSession,
    sendMessage,
    closeSession,
    handbackSession,
    sendTypingStatus,
  }
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd "d:/F8_K15_BTVN/FASTVISA/admin" && npx tsc --noEmit --skipLibCheck 2>&1 | head -30
```

Expected: Không có lỗi type.

---

## Task 4: Backend — emit vào admin-notifications channel

**Files:**
- Modify: `d:/F8_K15_BTVN/FASTVISA/api/src/services/chat.service.ts`

Thêm emit `admin_handoff_request` tại **2 vị trí** sau khi đã emit `handoff_request` vào session channel.

- [ ] **Step 1: Vị trí 1 — keyword detection handoff (~dòng 385)**

Tìm đoạn code (trong hàm `sendChatMessage`, sau block `if (wantsHuman)`):
```typescript
        try {
            await pusher.trigger(chatChannel(sid), "handoff_request", { session_id: sid });
        } catch (err) {
            Sentry.captureException(err, {
                tags: { feature: "chat", phase: "handoff_event" },
                extra: { session_id: sid },
            });
        }
        return { ok: true, messages };
```

Thay bằng:
```typescript
        try {
            await pusher.trigger(chatChannel(sid), "handoff_request", { session_id: sid });
            // Thông báo cho toàn bộ admin panel qua global channel
            await pusher.trigger("admin-notifications", "admin_handoff_request", {
                session_id: sid,
                guest_name: session.guestName ?? "Khách",
                preview_message: maskedText.slice(0, 100),
                timestamp: new Date().toISOString(),
            });
        } catch (err) {
            Sentry.captureException(err, {
                tags: { feature: "chat", phase: "handoff_event" },
                extra: { session_id: sid },
            });
        }
        return { ok: true, messages };
```

- [ ] **Step 2: Vị trí 2 — explicit handoff từ nút button (~dòng 573)**

Tìm đoạn code trong hàm `requestChatHandoff`:
```typescript
    const pusher = getPusher();
    try {
        await pusher.trigger(chatChannel(sid), "handoff_request", { session_id: sid });
    } catch (err) {
        Sentry.captureException(err, {
            tags: { feature: "chat", phase: "handoff_event" },
            extra: { session_id: sid },
        });
    }

    return { ok: true };
```

Thay bằng:
```typescript
    const pusher = getPusher();
    try {
        await pusher.trigger(chatChannel(sid), "handoff_request", { session_id: sid });
        // Thông báo cho toàn bộ admin panel qua global channel
        await pusher.trigger("admin-notifications", "admin_handoff_request", {
            session_id: sid,
            guest_name: session.guestName ?? "Khách",
            preview_message: "User yêu cầu hỗ trợ từ nhân viên.",
            timestamp: new Date().toISOString(),
        });
    } catch (err) {
        Sentry.captureException(err, {
            tags: { feature: "chat", phase: "handoff_event" },
            extra: { session_id: sid },
        });
    }

    return { ok: true };
```

- [ ] **Step 3: Build API verify TypeScript**

```bash
cd "d:/F8_K15_BTVN/FASTVISA/api" && npm run build 2>&1 | tail -10
```

Expected: Exit 0, không có type errors.

---

## Task 5: Tạo useAdminNotifications hook

**Files:**
- Create: `admin/src/hooks/useAdminNotifications.ts`

- [ ] **Step 1: Tạo file**

```typescript
"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import toast from "react-hot-toast"
import { useRouter } from "next/navigation"
import { createPusherClient } from "@/lib/soketi"

interface AdminHandoffRequestPayload {
  session_id: string
  guest_name: string
  preview_message: string
  timestamp: string
}

export interface UseAdminNotificationsReturn {
  pendingCount: number
  clearPending: () => void
}

/**
 * Hook toàn cục subscribe channel `admin-notifications`.
 * Mount 1 lần duy nhất trong AdminShell.
 * Nhận handoff request từ bất kỳ session nào → toast + badge + auto-refresh list.
 */
export function useAdminNotifications(): UseAdminNotificationsReturn {
  const [pendingCount, setPendingCount] = useState(0)
  const router = useRouter()
  const pusherRef = useRef<ReturnType<typeof createPusherClient>>(null)

  const clearPending = useCallback(() => setPendingCount(0), [])

  useEffect(() => {
    const pusher = createPusherClient()
    if (!pusher) return

    pusherRef.current = pusher
    const channel = pusher.subscribe("admin-notifications")

    channel.bind("admin_handoff_request", (payload: AdminHandoffRequestPayload) => {
      setPendingCount((prev) => prev + 1)

      // Trigger để session list refresh ngay lập tức
      window.dispatchEvent(new CustomEvent("refetch-sessions"))

      // Phát âm thanh (bỏ qua nếu browser chặn autoplay)
      try {
        void new Audio("/sounds/notification.mp3").play()
      } catch { /* browser autoplay policy */ }

      // Toast custom với nút CTA
      toast.custom(
        (toastInstance) => (
          <div
            className="flex flex-col gap-2 rounded-xl px-4 py-3 shadow-xl pointer-events-auto min-w-72 max-w-sm"
            style={{
              backgroundColor: "var(--color-surface-elevated)",
              border: "1px solid var(--color-border-default)",
            }}
          >
            <p
              className="font-semibold"
              style={{ color: "var(--color-text-primary)", fontSize: "var(--font-size-md)" }}
            >
              {payload.guest_name} cần hỗ trợ
            </p>
            <p
              className="line-clamp-2"
              style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)" }}
            >
              {payload.preview_message}
            </p>
            <div className="flex gap-2 mt-1">
              <button
                className="flex-1 rounded-lg py-1.5 text-sm font-medium transition-opacity hover:opacity-80"
                style={{ backgroundColor: "var(--color-primary)", color: "#fff" }}
                onClick={() => {
                  toast.dismiss(toastInstance.id)
                  router.push(`/sessions/${payload.session_id}`)
                }}
              >
                Vào xử lý
              </button>
              <button
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

    return () => {
      channel.unbind_all()
      pusher.unsubscribe("admin-notifications")
      pusher.disconnect()
    }
  }, [router])

  return { pendingCount, clearPending }
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd "d:/F8_K15_BTVN/FASTVISA/admin" && npx tsc --noEmit --skipLibCheck 2>&1 | head -30
```

Expected: Không có lỗi.

---

## Task 6: Cập nhật AdminShell — Toaster + wire notifications

**Files:**
- Modify: `admin/src/components/layout/AdminShell.tsx`

- [ ] **Step 1: Ghi đè toàn bộ file**

```tsx
"use client"

import { Toaster } from "react-hot-toast"
import { AdminHeader } from "@/components/layout/AdminHeader"
import { AdminSidebar } from "@/components/layout/AdminSidebar"
import { useAdminNotifications } from "@/hooks/useAdminNotifications"

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { pendingCount, clearPending } = useAdminNotifications()

  return (
    <div className="flex flex-col h-svh overflow-hidden">
      <Toaster
        position="top-right"
        toastOptions={{ style: { background: "transparent", boxShadow: "none", padding: 0 } }}
      />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-white"
      >
        Bỏ qua đến nội dung chính
      </a>
      <AdminHeader />
      <div className="flex flex-1 overflow-hidden">
        <AdminSidebar pendingChatCount={pendingCount} onChatPageVisit={clearPending} />
        <main
          id="main-content"
          className="flex-1 overflow-auto"
          style={{ backgroundColor: "var(--color-surface-base)" }}
        >
          {children}
        </main>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript** — sẽ báo lỗi `AdminSidebar` props — đó là expected, fix ở Task 7.

---

## Task 7: Cập nhật AdminSidebar — badge pending

**Files:**
- Modify: `admin/src/components/layout/AdminSidebar.tsx`

- [ ] **Step 1: Ghi đè toàn bộ file**

```tsx
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect } from "react"
import { navGroups } from "@/components/layout/nav-config"
import { t } from "@/lib/i18n"
import { cn } from "@/lib/utils"

interface AdminSidebarProps {
  pendingChatCount: number
  onChatPageVisit: () => void
}

export function AdminSidebar({ pendingChatCount, onChatPageVisit }: AdminSidebarProps) {
  const pathname = usePathname()

  // Reset badge khi admin điều hướng sang /sessions
  useEffect(() => {
    if (pathname === "/sessions" || pathname.startsWith("/sessions/")) {
      onChatPageVisit()
    }
  }, [pathname, onChatPageVisit])

  return (
    <aside
      className="flex flex-col w-56 shrink-0 overflow-y-auto"
      style={{
        backgroundColor: "var(--color-surface-elevated)",
        borderRight: "1px solid var(--color-border-default)",
      }}
      aria-label="Menu điều hướng"
    >
      <nav className="flex-1 px-3 py-4 space-y-6">
        {navGroups.map((group) => (
          <div key={group.labelKey} className="space-y-1">
            {group.items.length > 1 && (
              <p
                className="px-3 mb-2 font-medium uppercase tracking-wide"
                style={{
                  fontSize: "var(--font-size-xs)",
                  color: "var(--color-text-tertiary)",
                }}
              >
                {t(group.labelKey)}
              </p>
            )}
            {group.items.map(({ href, labelKey, icon: Icon }) => {
              const isActive =
                href === "/"
                  ? pathname === "/"
                  : pathname === href || pathname.startsWith(`${href}/`)
              const showChatBadge = href === "/sessions" && pendingChatCount > 0

              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors min-h-11",
                    isActive ? "font-medium" : "hover:opacity-80",
                  )}
                  style={{
                    fontSize: "var(--font-size-md)",
                    color: isActive ? "var(--color-primary)" : "var(--color-text-muted)",
                    backgroundColor: isActive
                      ? "var(--color-primary-subtle)"
                      : "transparent",
                  }}
                  aria-current={isActive ? "page" : undefined}
                >
                  <span className="flex items-center gap-3">
                    <Icon size={18} aria-hidden />
                    {t(labelKey)}
                  </span>
                  {showChatBadge && (
                    <span
                      className="min-w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center px-1 font-medium"
                      aria-label={`${pendingChatCount} phiên chờ xử lý`}
                    >
                      {pendingChatCount > 9 ? "9+" : pendingChatCount}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>
    </aside>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd "d:/F8_K15_BTVN/FASTVISA/admin" && npx tsc --noEmit --skipLibCheck 2>&1 | head -30
```

Expected: Không có lỗi.

---

## Task 8: Cập nhật useSessions — auto-refresh on custom event

**Files:**
- Modify: `admin/src/hooks/useSessions.ts`

- [ ] **Step 1: Ghi đè toàn bộ file**

```typescript
"use client"

import { useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api"
import type { ChatSession, ChatSessionsResponse } from "@/types/api"

async function fetchSessions(status: string): Promise<ChatSessionsResponse> {
  const { data } = await apiClient.get<ChatSessionsResponse>("/chat/sessions", {
    params: { status },
  })
  return data
}

export function useSessions(status: string) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["sessions", status],
    queryFn: () => fetchSessions(status),
    refetchInterval: 30_000,
  })

  // Refresh ngay khi nhận event từ useAdminNotifications (không cần đợi 30s)
  useEffect(() => {
    const handler = () => { void refetch() }
    window.addEventListener("refetch-sessions", handler)
    return () => window.removeEventListener("refetch-sessions", handler)
  }, [refetch])

  return {
    sessions: (data?.sessions ?? []) as ChatSession[],
    total: data?.total ?? 0,
    isLoading,
    error,
    refetch,
  }
}
```

---

## Task 9: Cập nhật SessionChat — toggle switch + confirm dialog

**Files:**
- Modify: `admin/src/components/SessionChat.tsx`

- [ ] **Step 1: Ghi đè toàn bộ file**

```tsx
"use client"

import { useEffect, useRef, useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/AlertDialog"
import { cn } from "@/lib/utils"
import { t } from "@/lib/i18n"
import type { UseAdminChatReturn } from "@/hooks/useAdminChat"

interface SessionChatProps {
  sessionId: string
  chat: UseAdminChatReturn
}

type PendingAction = "join" | "handback" | null

function getStatusLabel(status: string): string {
  if (status === "HUMAN_HANDLING") return t("chat.statusHuman")
  if (status === "CLOSED") return t("chat.statusClosed")
  return t("chat.statusAi")
}

export function SessionChat({ chat }: SessionChatProps) {
  const {
    messages,
    sessionStatus,
    guestName,
    isLoading,
    loadError,
    joinSession,
    closeSession,
    handbackSession,
    isUserTyping,
  } = chat

  const [pendingAction, setPendingAction] = useState<PendingAction>(null)
  const [isConfirming, setIsConfirming] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleConfirm = async () => {
    if (!pendingAction) return
    setIsConfirming(true)
    try {
      if (pendingAction === "join") {
        await joinSession()
      } else {
        await handbackSession()
      }
    } finally {
      setIsConfirming(false)
      setPendingAction(null)
    }
  }

  const isClosed = sessionStatus === "CLOSED"
  const isAiMode = sessionStatus === "AI_HANDLING"
  const isHumanMode = sessionStatus === "HUMAN_HANDLING"

  return (
    <>
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Session header */}
        <div
          className="flex items-center justify-between px-5 py-3 shrink-0"
          style={{ borderBottom: "1px solid var(--color-border-default)" }}
        >
          <div className="flex items-center gap-3">
            <span
              className="font-semibold"
              style={{ color: "var(--color-text-primary)", fontSize: "var(--font-size-2xl)" }}
            >
              {guestName || t("common.loading")}
            </span>
            {sessionStatus && (
              <Badge variant={isHumanMode ? "success" : isClosed ? "destructive" : "warning"}>
                {getStatusLabel(sessionStatus)}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Toggle pill AI / Human */}
            {sessionStatus && (
              <div
                className="flex items-center rounded-full p-0.5 gap-0.5"
                style={{ border: "1px solid var(--color-border-default)", opacity: isClosed ? 0.4 : 1 }}
                role="group"
                aria-label="Chế độ xử lý chat"
              >
                <button
                  onClick={() => !isClosed && setPendingAction("handback")}
                  disabled={isAiMode || isClosed}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                    isAiMode ? "text-white" : "opacity-50",
                    !isAiMode && !isClosed ? "cursor-pointer hover:opacity-70" : "cursor-not-allowed",
                  )}
                  style={isAiMode ? { backgroundColor: "var(--color-warning)", color: "#fff" } : {}}
                  aria-pressed={isAiMode}
                >
                  AI
                </button>
                <button
                  onClick={() => !isClosed && setPendingAction("join")}
                  disabled={isHumanMode || isClosed}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                    isHumanMode ? "text-white" : "opacity-50",
                    !isHumanMode && !isClosed ? "cursor-pointer hover:opacity-70" : "cursor-not-allowed",
                  )}
                  style={isHumanMode ? { backgroundColor: "var(--color-success)", color: "#fff" } : {}}
                  aria-pressed={isHumanMode}
                >
                  Human
                </button>
              </div>
            )}

            {/* Close session button */}
            {!isClosed && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => void closeSession()}
                style={{ color: "var(--color-error)", borderColor: "var(--color-error)" }}
              >
                {t("common.close")}
              </Button>
            )}
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <span style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-md)" }}>
                {t("common.loading")}
              </span>
            </div>
          ) : loadError ? (
            <div className="flex items-center justify-center h-full">
              <span style={{ color: "var(--color-error)", fontSize: "var(--font-size-md)" }}>
                {loadError}
              </span>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <span style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-md)" }}>
                {t("chat.empty")}
              </span>
            </div>
          ) : (
            messages.map((msg) => {
              const isAdmin = msg.sender_type === "ADMIN"
              const isUser = msg.sender_type === "USER" || msg.sender_type === "CUSTOMER"
              const isAi = msg.sender_type === "AI" || msg.sender_type === "BOT"
              const isSystem = msg.sender_type === "SYSTEM"

              if (isSystem) {
                return (
                  <div key={msg.id} className="flex justify-center my-2 w-full">
                    <span
                      className="px-3 py-1 rounded-full text-center"
                      style={{
                        backgroundColor: "color-mix(in srgb, var(--color-border-default) 40%, transparent)",
                        color: "var(--color-text-tertiary)",
                        fontSize: "var(--font-size-xs)",
                      }}
                    >
                      {msg.text}
                    </span>
                  </div>
                )
              }

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col gap-1 ${isAdmin ? "items-end" : "items-start"}`}
                >
                  <span style={{ color: "var(--color-text-tertiary)", fontSize: "var(--font-size-xs)" }}>
                    {isAdmin ? "Admin" : isAi ? "AI Assistant" : isUser ? t("chat.guest") : msg.sender_type}
                  </span>
                  <div
                    className="max-w-[70%] rounded-xl px-3 py-2 break-words"
                    style={
                      isAdmin
                        ? { backgroundColor: "var(--color-info)", color: "#ffffff" }
                        : isAi
                          ? {
                              backgroundColor: "color-mix(in srgb, var(--color-success) 15%, transparent)",
                              color: "var(--color-text-primary)",
                              border: "1px solid color-mix(in srgb, var(--color-success) 30%, transparent)",
                            }
                          : {
                              backgroundColor: "var(--color-surface-elevated)",
                              color: "var(--color-text-primary)",
                              border: "1px solid var(--color-border-default)",
                            }
                    }
                  >
                    <p style={{ fontSize: "var(--font-size-md)" }}>{msg.text}</p>
                  </div>
                  <span style={{ color: "var(--color-text-tertiary)", fontSize: "var(--font-size-xs)" }}>
                    {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                  </span>
                </div>
              )
            })
          )}

          {isUserTyping && (
            <div className="flex flex-col gap-1 items-start mt-2">
              <span style={{ color: "var(--color-text-tertiary)", fontSize: "var(--font-size-xs)" }}>
                {guestName || t("chat.guest")} đang gõ...
              </span>
              <div
                className="rounded-xl px-4 py-2 flex items-center justify-center gap-1"
                style={{
                  backgroundColor: "var(--color-surface-elevated)",
                  border: "1px solid var(--color-border-default)",
                  maxWidth: "80px",
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Confirm dialog cho mode toggle */}
      <AlertDialog
        open={pendingAction !== null}
        onOpenChange={(open) => { if (!open) setPendingAction(null) }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction === "join" ? t("chat.toggleJoinTitle") : t("chat.toggleHandbackTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction === "join"
                ? t("chat.toggleJoinDesc").replace("{name}", guestName || t("chat.guest"))
                : t("chat.toggleHandbackDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingAction(null)}>
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isConfirming}
              onClick={() => void handleConfirm()}
              style={{ backgroundColor: "var(--color-primary)", color: "#fff" }}
            >
              {isConfirming
                ? t("common.saving")
                : pendingAction === "join"
                  ? t("chat.toggleJoinConfirm")
                  : t("chat.toggleHandbackConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd "d:/F8_K15_BTVN/FASTVISA/admin" && npx tsc --noEmit --skipLibCheck 2>&1 | head -30
```

---

## Task 10: Cập nhật AdminChatInput — disabled gating

**Files:**
- Modify: `admin/src/components/AdminChatInput.tsx`

- [ ] **Step 1: Ghi đè toàn bộ file**

```tsx
"use client"

import { useState, useRef } from "react"
import { Send } from "lucide-react"
import { t } from "@/lib/i18n"

interface AdminChatInputProps {
  onSend: (text: string) => Promise<void>
  isSending: boolean
  onTyping?: (isTyping: boolean) => Promise<void>
  sessionStatus: string
}

export function AdminChatInput({ onSend, isSending, onTyping, sessionStatus }: AdminChatInputProps) {
  const [text, setText] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isTypingRef = useRef(false)

  const isDisabled = sessionStatus !== "HUMAN_HANDLING"

  const placeholder = sessionStatus === "AI_HANDLING"
    ? t("chat.inputDisabledAi")
    : sessionStatus === "CLOSED"
      ? t("chat.inputDisabledClosed")
      : t("chat.inputPlaceholder")

  const handleSend = async () => {
    const trimmed = text.trim()
    if (!trimmed || isSending || isDisabled) return
    setText("")

    if (onTyping && isTypingRef.current) {
      isTypingRef.current = false
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      void onTyping(false)
    }

    await onSend(trimmed)
    textareaRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setText(val)

    if (onTyping && !isDisabled) {
      if (!isTypingRef.current && val.trim().length > 0) {
        isTypingRef.current = true
        void onTyping(true)
      }
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = setTimeout(() => {
        isTypingRef.current = false
        void onTyping(false)
      }, 2000)
    }
  }

  return (
    <div
      className="shrink-0 px-5 py-3 flex items-end gap-3"
      style={{ borderTop: "1px solid var(--color-border-default)" }}
    >
      <textarea
        ref={textareaRef}
        value={text}
        onChange={handleTextChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={2}
        disabled={isDisabled}
        className="flex-1 rounded-xl px-3 py-2 resize-none outline-none transition-colors"
        style={{
          backgroundColor: "var(--color-surface-elevated)",
          border: "1px solid var(--color-border-default)",
          color: "var(--color-text-primary)",
          fontSize: "var(--font-size-md)",
          opacity: isDisabled ? 0.5 : 1,
          cursor: isDisabled ? "not-allowed" : "text",
        }}
      />
      <button
        onClick={() => void handleSend()}
        disabled={isSending || !text.trim() || isDisabled}
        className="flex items-center justify-center w-9 h-9 rounded-xl transition-colors disabled:opacity-40"
        style={{ backgroundColor: "var(--color-info)", color: "#ffffff" }}
        aria-label={t("chat.sendMessage")}
      >
        <Send size={15} />
      </button>
    </div>
  )
}
```

---

## Task 11: Cập nhật Session Detail Page

**Files:**
- Modify: `admin/src/app/(dashboard)/sessions/[sessionId]/page.tsx`

- [ ] **Step 1: Ghi đè toàn bộ file**

```tsx
"use client"

import { use } from "react"
import toast from "react-hot-toast"
import { useRouter } from "next/navigation"
import { SessionChat } from "@/components/SessionChat"
import { AdminChatInput } from "@/components/AdminChatInput"
import { useAdminChat } from "@/hooks/useAdminChat"
import { t } from "@/lib/i18n"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"

interface SessionPageProps {
  params: Promise<{ sessionId: string }>
}

export default function SessionDetailPage({ params }: SessionPageProps) {
  const { sessionId } = use(params)

  return (
    <div className="flex flex-col h-full">
      <div
        className="flex items-center gap-2 px-4 h-12 shrink-0"
        style={{ borderBottom: "1px solid var(--color-border-default)" }}
      >
        <Link
          href="/sessions"
          className="flex items-center gap-1 text-sm transition-colors hover:opacity-70"
          style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-md)" }}
        >
          <ChevronLeft size={14} />
          {t("chat.backToSessions")}
        </Link>
      </div>

      <SessionChatWrapper sessionId={sessionId} />
    </div>
  )
}

function SessionChatWrapper({ sessionId }: { sessionId: string }) {
  const router = useRouter()

  const chat = useAdminChat(sessionId, {
    onSessionClosed: () => {
      toast.success(t("chat.sessionClosedRedirect"))
      router.push("/sessions")
    },
  })

  return (
    <>
      <SessionChat sessionId={sessionId} chat={chat} />
      <AdminChatInput
        onSend={chat.sendMessage}
        isSending={chat.isSending}
        onTyping={chat.sendTypingStatus}
        sessionStatus={chat.sessionStatus}
      />
    </>
  )
}
```

---

## Task 12: Thêm i18n keys

**Files:**
- Modify: `admin/src/messages/vi.json`

- [ ] **Step 1: Tìm section `"chat"` (dòng ~113) và thay bằng:**

```json
"chat": {
    "liveTitle": "Chat trực tuyến",
    "historyTitle": "Lịch sử chat",
    "guest": "Khách",
    "status": "Trạng thái",
    "lastMessage": "Tin nhắn cuối",
    "time": "Thời gian",
    "join": "Tham gia",
    "view": "Xem",
    "empty": "Không có phiên chat",
    "statusHuman": "Nhân viên",
    "statusAi": "Trợ lý AI",
    "statusClosed": "Đã đóng",
    "backToSessions": "Quay lại danh sách",
    "toggleJoinTitle": "Tiếp quản hỗ trợ?",
    "toggleJoinDesc": "Bạn sẽ là người hỗ trợ trực tiếp cho {name}. AI sẽ tạm dừng trả lời.",
    "toggleJoinConfirm": "Tiếp quản",
    "toggleHandbackTitle": "Chuyển lại cho AI?",
    "toggleHandbackDesc": "User sẽ được thông báo và AI sẽ tiếp tục hỗ trợ.",
    "toggleHandbackConfirm": "Chuyển lại AI",
    "inputDisabledAi": "AI đang xử lý — toggle sang Human để tiếp quản",
    "inputDisabledClosed": "Phiên chat đã đóng",
    "inputPlaceholder": "Nhắn tin... (Enter để gửi, Shift+Enter xuống dòng)",
    "sendMessage": "Gửi tin nhắn",
    "sessionClosedRedirect": "Phiên chat đã được đóng"
}
```

- [ ] **Step 2: Verify JSON hợp lệ**

```bash
node -e "require('./src/messages/vi.json'); console.log('JSON valid')" 2>&1
```

Expected: `JSON valid`

---

---

# VERIFICATION PHASE

> Chạy sau khi hoàn thành tất cả 12 implementation tasks. Dựa trên phase-verification skill.

---

## V1: TypeScript Check

- [ ] **Step 1: Typecheck admin**

```bash
cd "d:/F8_K15_BTVN/FASTVISA/admin" && npx tsc --noEmit --skipLibCheck 2>&1
```

Expected: Exit 0, **zero errors**.

- [ ] **Step 2: Typecheck API**

```bash
cd "d:/F8_K15_BTVN/FASTVISA/api" && npm run typecheck 2>&1
```

Expected: Exit 0, **zero type errors**.

---

## V2: Start Dev Servers + Setup Logs

- [ ] **Step 1: Start API với log**

```bash
cd "d:/F8_K15_BTVN/FASTVISA/api" && npm run dev 2>&1 | tee api.log
```

> Chờ output: `✓ Server running on http://localhost:<PORT>` — ghi nhớ port (thường 3000).

- [ ] **Step 2: Start Admin với log**

Mở terminal khác:
```bash
cd "d:/F8_K15_BTVN/FASTVISA/admin" && npm run dev:log
```

> Chờ output: `✓ Ready on http://localhost:3001`

- [ ] **Step 3: Lấy admin credentials từ .env**

```bash
cat "d:/F8_K15_BTVN/FASTVISA/api/.env" | grep -i "admin\|email\|password"
```

Ghi nhận `ADMIN_EMAIL` và `ADMIN_PASSWORD` để dùng trong các CURL test.

---

## V3: API CURL Tests — Primary Cases

> Chạy tuần tự. Thay `3000` bằng port thực tế của API, `ADMIN_EMAIL` và `ADMIN_PASSWORD` bằng giá trị từ `.env`.

- [ ] **Step 1: Lấy admin JWT token**

```bash
curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ADMIN_EMAIL","password":"ADMIN_PASSWORD"}' | jq .
```

**Input:** `{ email, password }`
**Expected output:** `{ "success": true, "data": { "token": "<JWT>", ... } }`

Lưu token:
```bash
ADMIN_TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ADMIN_EMAIL","password":"ADMIN_PASSWORD"}' | jq -r '.data.token')
echo "Token: $ADMIN_TOKEN"
```

---

- [ ] **Step 2 [PC-1]: User tạo session mới**

```bash
SESSION_RESP=$(curl -s -X POST http://localhost:3000/api/v1/chat/join \
  -H "Content-Type: application/json" \
  -d '{"guest_name":"TestUser","nationality":"VN","visa_interest":"tourism"}')
echo $SESSION_RESP | jq .
SESSION_ID=$(echo $SESSION_RESP | jq -r '.data.session_id')
echo "Session ID: $SESSION_ID"
```

**Input:** `{ guest_name, nationality, visa_interest }`  
**Expected:** `{ "success": true, "data": { "session_id": "<id>", "status": "AI_HANDLING" } }`

---

- [ ] **Step 3 [PC-2]: User explicit handoff (nút button)**

```bash
curl -s -X POST http://localhost:3000/api/v1/chat/handoff \
  -H "Content-Type: application/json" \
  -d "{\"session_id\":\"$SESSION_ID\"}" | jq .
```

**Input:** `{ session_id }`  
**Expected:** `{ "success": true, "data": { "ok": true } }`  
**Side effect:** API emit `handoff_request` + `admin_handoff_request` — admin toast xuất hiện nếu admin đang online.

---

- [ ] **Step 4 [PC-3]: Admin get sessions list**

```bash
curl -s -X GET "http://localhost:3000/api/v1/chat/sessions?status=AI_HANDLING,HUMAN_HANDLING" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
```

**Input:** query `status=AI_HANDLING,HUMAN_HANDLING`  
**Expected:** `{ "success": true, "data": { "sessions": [...], "total": N } }` — session vừa tạo phải có mặt với status `HUMAN_HANDLING`.

---

- [ ] **Step 5 [PC-4]: Admin join session**

```bash
curl -s -X POST http://localhost:3000/api/v1/chat/admin-join \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d "{\"session_id\":\"$SESSION_ID\"}" | jq .
```

**Input:** `{ session_id }` + Bearer token  
**Expected:** `{ "success": true, "data": { "ok": true } }`

---

- [ ] **Step 6 [PC-5]: Admin gửi tin nhắn**

```bash
curl -s -X POST http://localhost:3000/api/v1/chat/message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d "{\"session_id\":\"$SESSION_ID\",\"message\":\"Xin chào! Tôi có thể giúp gì cho bạn?\",\"sender\":\"ADMIN\"}" | jq .
```

**Input:** `{ session_id, message, sender: "ADMIN" }`  
**Expected:** `{ "success": true, "data": { "ok": true } }` — không có AI reply khi HUMAN_HANDLING.

---

- [ ] **Step 7 [PC-6]: Admin handback về AI**

```bash
curl -s -X POST http://localhost:3000/api/v1/chat/handback \
  -H "Content-Type: application/json" \
  -d "{\"session_id\":\"$SESSION_ID\"}" | jq .
```

**Input:** `{ session_id }`  
**Expected:** `{ "success": true, "data": { "ok": true } }`

Verify status đã đổi về AI_HANDLING:
```bash
curl -s -X GET "http://localhost:3000/api/v1/chat/sessions/$SESSION_ID/messages" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.data.status'
```

**Expected:** `"AI_HANDLING"`

---

## V4: API CURL Tests — Secondary Cases

- [ ] **Step 1 [SC-1]: Keyword detection handoff**

```bash
SESSION2_ID=$(curl -s -X POST http://localhost:3000/api/v1/chat/join \
  -H "Content-Type: application/json" \
  -d '{"guest_name":"KeywordUser","nationality":"US","visa_interest":"business"}' \
  | jq -r '.data.session_id')

curl -s -X POST http://localhost:3000/api/v1/chat/message \
  -H "Content-Type: application/json" \
  -d "{\"session_id\":\"$SESSION2_ID\",\"message\":\"I need a human agent please\",\"sender\":\"USER\"}" | jq .
```

**Input:** message chứa keyword `human agent`  
**Expected:** `{ "success": true, "data": { "ok": true, "messages": [...] } }` — response có system message + handoff trigger.

Verify status:
```bash
curl -s -X GET "http://localhost:3000/api/v1/chat/sessions/$SESSION2_ID/messages" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.data.status'
```

**Expected:** `"HUMAN_HANDLING"` — keyword detection đã kích hoạt auto-handoff.

---

- [ ] **Step 2 [SC-2]: Admin đóng session**

```bash
curl -s -X PATCH "http://localhost:3000/api/v1/chat/sessions/$SESSION_ID/close" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
```

**Input:** session ID + Bearer token  
**Expected:** `{ "success": true, "data": { "ok": true } }`

Verify:
```bash
curl -s -X GET "http://localhost:3000/api/v1/chat/sessions/$SESSION_ID/messages" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.data.status'
```

**Expected:** `"CLOSED"`

---

- [ ] **Step 3 [SC-3]: Admin get messages của session cụ thể**

```bash
curl -s -X GET "http://localhost:3000/api/v1/chat/sessions/$SESSION2_ID/messages" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '{status: .data.status, count: (.data.messages | length)}'
```

**Expected:** `{ "status": "HUMAN_HANDLING", "count": <số messages> }`

---

- [ ] **Step 4 [SC-4]: Admin close session đang HUMAN_HANDLING**

```bash
curl -s -X PATCH "http://localhost:3000/api/v1/chat/sessions/$SESSION2_ID/close" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
```

**Expected:** `{ "success": true }` — đóng session đang HUMAN_HANDLING cũng thành công.

---

## V5: API CURL Tests — Edge Cases

- [ ] **Step 1 [EC-1]: Admin join không có auth token**

```bash
curl -s -X POST http://localhost:3000/api/v1/chat/admin-join \
  -H "Content-Type: application/json" \
  -d "{\"session_id\":\"$SESSION_ID\"}" | jq .
```

**Input:** Không có Authorization header  
**Expected:** `{ "success": false, "error": { "code": "UNAUTHORIZED", ... } }` — HTTP 401

---

- [ ] **Step 2 [EC-2]: Thao tác trên session không tồn tại**

```bash
curl -s -X POST http://localhost:3000/api/v1/chat/handoff \
  -H "Content-Type: application/json" \
  -d '{"session_id":"nonexistent-session-xyz"}' | jq .
```

**Input:** session_id giả  
**Expected:** `{ "success": false, "error": { "code": "NOT_FOUND", ... } }` — HTTP 404

---

- [ ] **Step 3 [EC-3]: Gửi message trên session đã CLOSED**

```bash
curl -s -X POST http://localhost:3000/api/v1/chat/message \
  -H "Content-Type: application/json" \
  -d "{\"session_id\":\"$SESSION_ID\",\"message\":\"test after close\",\"sender\":\"USER\"}" | jq .
```

**Input:** session đã CLOSED  
**Expected:** `{ "success": false, ... }` — 4xx error vì session đã đóng.

---

- [ ] **Step 4 [EC-4]: admin_handoff_request emit không break handoff response**

```bash
SESSION3_ID=$(curl -s -X POST http://localhost:3000/api/v1/chat/join \
  -H "Content-Type: application/json" \
  -d '{"guest_name":"EmitTest","nationality":"JP","visa_interest":"tourism"}' \
  | jq -r '.data.session_id')

curl -s -X POST http://localhost:3000/api/v1/chat/handoff \
  -H "Content-Type: application/json" \
  -d "{\"session_id\":\"$SESSION3_ID\"}" | jq .
```

**Input:** Valid session, trigger admin-notifications emit  
**Expected:** `{ "success": true, "data": { "ok": true } }` — emit vào admin-notifications (fire-and-forget) không làm chậm hoặc break response.

---

- [ ] **Step 5 [EC-5]: Handback trên session AI_HANDLING (double handback)**

```bash
curl -s -X POST http://localhost:3000/api/v1/chat/handback \
  -H "Content-Type: application/json" \
  -d "{\"session_id\":\"$SESSION3_ID\"}" | jq .
```

**Input:** Session đang AI_HANDLING, gọi handback  
**Expected:** Trả về thành công (idempotent) hoặc lỗi có nghĩa — không crash server.

---

## V6: Admin SSR Checks

- [ ] **Step 1: Check login page**

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/login
```

**Expected:** `200`

- [ ] **Step 2: Check sessions page (unauthenticated)**

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/sessions
```

**Expected:** `307` (redirect to /login) hoặc `200` nếu dùng server-side auth cookie.

- [ ] **Step 3: Check history page**

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/history
```

**Expected:** `307` hoặc `200` — không crash SSR.

---

## V7: Log Analysis

Sau khi chạy tất cả CURL tests, phân tích logs để tìm lỗi ngầm.

- [ ] **Step 1: Kiểm tra API log**

```bash
grep -i "error\|TypeError\|unhandled\|crash\|ECONNREFUSED\|undefined" \
  "d:/F8_K15_BTVN/FASTVISA/api/api.log" | head -20
```

**Expected:** Không có dòng nào match (zero error lines).

Hoặc xem toàn bộ log:
```bash
tail -100 "d:/F8_K15_BTVN/FASTVISA/api/api.log"
```

---

- [ ] **Step 2: Kiểm tra Admin log**

```bash
grep -i "error\|TypeError\|unhandled\|crash\|undefined\|MISSING_MESSAGE" \
  "d:/F8_K15_BTVN/FASTVISA/admin/app.log" | head -20
```

**Expected:** Không có critical errors. Warnings về Pusher config khi `NEXT_PUBLIC_SOKETI_KEY` rỗng là chấp nhận được.

---

- [ ] **Step 3: Kiểm tra không có console.log debug thừa**

```bash
grep -rn "console\.log" \
  "d:/F8_K15_BTVN/FASTVISA/admin/src/hooks/useAdminNotifications.ts" \
  "d:/F8_K15_BTVN/FASTVISA/admin/src/hooks/useAdminChat.ts" \
  "d:/F8_K15_BTVN/FASTVISA/admin/src/components/SessionChat.tsx" \
  "d:/F8_K15_BTVN/FASTVISA/admin/src/components/AdminChatInput.tsx"
```

**Expected:** Không có output (zero console.log).

---

## V8: Build + Lint 100%

- [ ] **Step 1: Kill dev servers**

```bash
# Windows
netstat -ano | findstr :3001
taskkill //PID <PID_admin> //F

netstat -ano | findstr :3000
taskkill //PID <PID_api> //F
```

- [ ] **Step 2: Admin — production build**

```bash
cd "d:/F8_K15_BTVN/FASTVISA/admin" && npm run build 2>&1 | tail -20
```

**Expected:** Exit 0, `✓ Compiled successfully`, không có compile/type errors.

- [ ] **Step 3: Admin — lint**

```bash
cd "d:/F8_K15_BTVN/FASTVISA/admin" && npm run lint 2>&1 | tail -20
```

**Expected:** Exit 0, zero errors. (Warnings là acceptable.)

- [ ] **Step 4: API — production build**

```bash
cd "d:/F8_K15_BTVN/FASTVISA/api" && npm run build 2>&1 | tail -10
```

**Expected:** Exit 0.

- [ ] **Step 5: API — typecheck**

```bash
cd "d:/F8_K15_BTVN/FASTVISA/api" && npm run typecheck 2>&1 | tail -10
```

**Expected:** Exit 0.

---

## V9: Test Report

Điền bảng sau sau khi hoàn thành tất cả verification steps. Báo cáo cho user với bảng này.

### Implementation Summary

| Task | File | Status |
|------|------|--------|
| Task 1 | `src/components/ui/AlertDialog.tsx` | ✅ |
| Task 2 | `public/sounds/notification.mp3` | ✅ |
| Task 3 | `src/lib/soketi.ts` + `useAdminChat.ts` | ✅ |
| Task 4 | API `chat.service.ts` (2 locations + CLOSED guard) | ✅ |
| Task 5 | `src/hooks/useAdminNotifications.tsx` | ✅ |
| Task 6 | `AdminShell.tsx` | ✅ |
| Task 7 | `AdminSidebar.tsx` | ✅ |
| Task 8 | `useSessions.ts` | ✅ |
| Task 9 | `SessionChat.tsx` | ✅ |
| Task 10 | `AdminChatInput.tsx` | ✅ |
| Task 11 | `sessions/[sessionId]/page.tsx` | ✅ |
| Task 12 | `vi.json` | ✅ |

### CURL Test Results

| Case | ID | Input Summary | Expected | Actual | Status |
|------|-----|--------------|----------|--------|--------|
| Primary | PC-1 | Join session | session_id + AI_HANDLING | `success:true`, session_id UUID | ✅ |
| Primary | PC-2 | Explicit handoff | `{ ok: true }` | `{ ok: true }` | ✅ |
| Primary | PC-3 | Admin get sessions | sessions list | `success:true`, total≥1 | ✅ |
| Primary | PC-4 | Admin join | `{ ok: true }` | `{ ok: true }` | ✅ |
| Primary | PC-5 | Admin send message | `{ ok: true }` | message DELIVERED | ✅ |
| Primary | PC-6 | Handback to AI | `{ ok: true }`, status=AI_HANDLING | status=AI_HANDLING | ✅ |
| Secondary | SC-1 | Keyword handoff | HUMAN_HANDLING | status=HUMAN_HANDLING | ✅ |
| Secondary | SC-2 | Admin close | `{ ok: true }`, CLOSED | status=CLOSED | ✅ |
| Secondary | SC-3 | Get messages | messages array | count=2 | ✅ |
| Secondary | SC-4 | Close HUMAN session | `{ ok: true }` | `{ ok: true }` | ✅ |
| Edge | EC-1 | No auth admin-join | 401 UNAUTHORIZED | HTTP 401 | ✅ |
| Edge | EC-2 | Invalid session_id | 404 NOT_FOUND | HTTP 404 | ✅ |
| Edge | EC-3 | Message on CLOSED | 4xx error | HTTP 409 SESSION_CLOSED | ✅ |
| Edge | EC-4 | Emit không break response | `{ ok: true }` | `{ ok: true }` (Soketi on) | ✅ |
| Edge | EC-5 | Double handback | No crash | `{ ok: true }` | ✅ |

### Build & Lint Summary

| Step | Command | Result | Notes |
|------|---------|--------|-------|
| Admin TypeScript | `npx tsc --noEmit` | ✅ | |
| Admin Build | `npm run build` | ✅ | Exit 0 |
| Admin Lint | `npm run lint` | ❌ | Pre-existing ESLint circular config |
| API TypeScript | `npm run typecheck` | ✅ | |
| API Build | `npm run build` | ✅ | Exit 0 |
| API Log | Zero errors | ✅ | No critical lines in api.log |
| Admin Log | Zero errors | ✅ | No critical lines in app.log |

### Final Verdict

**Production Ready:** ✅ (15/15 CURL + build/typecheck pass; lint blocked by pre-existing config)
