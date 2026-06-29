# Design Spec: Admin AI/Human Switch Mode

**Date:** 2026-06-16  
**Status:** Approved  
**Scope:** Admin dashboard — tính năng chuyển mode AI ↔ Human cho live chat

---

## 1. Tổng quan

Khi user phía UI request human agent (qua toggle, keyword, hoặc button), admin cần:
1. Nhận notification realtime — không phụ thuộc vào 30s polling
2. Trong session, chuyển đổi mode AI/Human qua toggle switch rõ ràng thay vì 2 button rời
3. Input box bị gating theo mode — không cho gõ khi AI đang handle
4. Nhận đủ Pusher events hiện đang thiếu (`admin_joined`, `session_closed`, `handoff_request`)

---

## 2. Kiến trúc tổng thể

```
User UI (toggle/keyword)
    │
    ▼
POST /api/v1/chat/handoff
    │
    ├──► Pusher emit → chat-{sessionId}   (handoff_request)
    └──► Pusher emit → admin-notifications (admin_handoff_request)  ← MỚI
                              │
                    ┌─────────┴─────────────┐
                    ▼                       ▼
          AdminShell (global)     Sessions list (auto-refresh)
          useAdminNotifications
          │
          ├── toast.custom() [react-hot-toast]
          ├── play notification sound
          └── increment pendingCount → sidebar badge
```

---

## 3. API Changes (Backend — `d:\F8_K15_BTVN\FASTVISA\api`)

### 3.1 Thêm emit vào channel `admin-notifications`

File: `src/services/chat.service.ts`

Trong 3 chỗ hiện đang emit `handoff_request` vào `chat-{sessionId}`, thêm emit song song vào channel `admin-notifications`:

```typescript
// Sau dòng emit handoff_request hiện có, thêm:
await pusher.trigger("admin-notifications", "admin_handoff_request", {
  session_id: session.id,
  guest_name: session.guestName,
  preview_message: messageText.slice(0, 100),
  timestamp: new Date().toISOString(),
})
```

**3 trigger points:**
1. Keyword detection trong `sendChatMessage` (regex `/\b(agent|human|support)\b/i`)
2. `POST /handoff` explicit
3. Không cần thêm cho `POST /admin-join` (admin chủ động, không cần notify lại)

**Payload type:**
```typescript
interface AdminHandoffRequestPayload {
  session_id: string
  guest_name: string
  preview_message: string
  timestamp: string
}
```

---

## 4. Frontend Changes (Admin — `d:\F8_K15_BTVN\FASTVISA\admin`)

### 4.1 Hook mới: `useAdminNotifications`

File mới: `src/hooks/useAdminNotifications.ts`

**Responsibilities:**
- Subscribe channel `admin-notifications` khi mount (dùng cùng `getSoketiConfig()` pattern)
- Nhận `admin_handoff_request` → toast + badge
- Expose `pendingCount: number` để sidebar hiển thị badge
- Export `clearPending()` để reset badge khi admin vào `/sessions`

**Interface:**
```typescript
export interface UseAdminNotificationsReturn {
  pendingCount: number
  clearPending: () => void
}

export function useAdminNotifications(): UseAdminNotificationsReturn
```

**Toast format (react-hot-toast `toast.custom()`):**
```
[🔔 Tin nhắn từ {guest_name}]
"{preview_message}..."
[Vào xử lý →]  [Bỏ qua]
```
- Duration: 8000ms
- Click "Vào xử lý" → `router.push('/sessions/{session_id}')` + `toast.dismiss()`
- Sound: `new Audio('/sounds/notification.mp3').play()` (file cần thêm vào `public/sounds/`)

**Cleanup:** unbind + disconnect Pusher khi component unmount.

---

### 4.2 Sửa `AdminShell`

File: `src/components/layout/AdminShell.tsx`

Thêm:
1. `<Toaster position="top-right" />` từ `react-hot-toast`
2. `useAdminNotifications()` hook + pass `pendingCount`/`clearPending` xuống `AdminSidebar` qua props

**Interface mới cho AdminShell:**
```typescript
// AdminShell truyền props xuống AdminSidebar
<AdminSidebar
  pendingChatCount={pendingCount}
  onChatPageVisit={clearPending}
/>
```

---

### 4.3 Sửa `AdminSidebar`

File: `src/components/layout/AdminSidebar.tsx`

**Thay đổi:**
- Nhận props `pendingChatCount: number` và `onChatPageVisit: () => void`
- Khi render nav item `/sessions`: nếu `pendingChatCount > 0`, hiển thị badge số đỏ bên phải icon
- Khi `pathname` chuyển vào `/sessions` (useEffect trên `pathname`): gọi `onChatPageVisit()`

**Badge UI:**
```tsx
// Trong Link của /sessions
<div className="flex items-center justify-between w-full">
  <span className="flex items-center gap-3">
    <Icon size={18} aria-hidden />
    {t(labelKey)}
  </span>
  {href === "/sessions" && pendingChatCount > 0 && (
    <span className="min-w-5 h-5 rounded-full bg-red-500 text-white text-xs
                     flex items-center justify-center px-1 font-medium">
      {pendingChatCount > 9 ? "9+" : pendingChatCount}
    </span>
  )}
</div>
```

> **Không sửa `NavItem` type** trong `nav-config.ts` — badge là runtime state, không phải config tĩnh.

---

### 4.4 Sửa `useAdminChat`

File: `src/hooks/useAdminChat.ts`

**Thêm 3 Pusher event handlers còn thiếu:**

```typescript
// 1. admin_joined — khi admin khác join cùng session
channel.bind("admin_joined", (payload: { session_id: string; admin_name: string }) => {
  setSessionStatus("HUMAN_HANDLING")
})

// 2. session_closed — khi session bị đóng từ nơi khác
channel.bind("session_closed", () => {
  setSessionStatus("CLOSED")
  onSessionClosed?.() // callback để page redirect
})

// 3. handoff_request — cập nhật status badge trong detail view
channel.bind("handoff_request", () => {
  setSessionStatus("HUMAN_HANDLING")
})
```

**Thêm `onSessionClosed` callback vào interface:**
```typescript
export function useAdminChat(
  sessionId: string,
  options?: { onSessionClosed?: () => void }
): UseAdminChatReturn
```

**Fix lỗi hiện tại:** `loadMessages` error hiện bị swallow — thêm `setError` state và expose trong return:
```typescript
const [loadError, setLoadError] = useState<string | null>(null)
// expose: loadError trong UseAdminChatReturn
```

---

### 4.5 Sửa `SessionChat`

File: `src/components/SessionChat.tsx`

**Xóa 2 button cũ** "Join Session" và "Transfer to AI". **Thay bằng toggle switch + confirm dialog.**

**Toggle switch component (inline hoặc tách riêng):**
```
AI mode:     [● AI ] [ Human ]   ← amber pill active bên trái
Human mode:  [ AI ] [● Human ]  ← teal pill active bên phải
Closed:      [ AI ] [ Human ]   ← cả 2 disabled, opacity 40%
```

**Logic switch:**
- Nếu `AI_HANDLING` → click "Human" → confirm dialog → `joinSession()`
- Nếu `HUMAN_HANDLING` → click "AI" → confirm dialog → `handbackSession()`
- Nếu `CLOSED` → toggle disabled, không có action

**Confirm dialog content:**

| Action | Title | Description |
|--------|-------|-------------|
| AI → Human (Join) | "Tiếp quản hỗ trợ?" | "Bạn sẽ là người hỗ trợ trực tiếp cho {guestName}. AI sẽ tạm dừng trả lời." |
| Human → AI (Handback) | "Chuyển lại cho AI?" | "User sẽ được thông báo và AI sẽ tiếp tục hỗ trợ." |

**Dùng `AlertDialog` từ Radix** (đã có `@radix-ui/react-popover`, check xem `@radix-ui/react-alert-dialog` đã cài chưa; nếu chưa thì dùng custom modal với inline state).

**Status badge** trong header: thay raw enum string bằng label i18n:
- `AI_HANDLING` → "Trợ lý AI"
- `HUMAN_HANDLING` → "Nhân viên"
- `CLOSED` → "Đã đóng"

**Close Session button:** giữ nguyên, chỉ polish style.

---

### 4.6 Sửa `AdminChatInput`

File: `src/components/AdminChatInput.tsx`

**Thêm prop `sessionStatus`:**
```typescript
interface AdminChatInputProps {
  onSend: (text: string) => Promise<void>
  isSending: boolean
  onTyping?: (isTyping: boolean) => Promise<void>
  sessionStatus: string  // MỚI
}
```

**Gating logic:**
```typescript
const isDisabled = sessionStatus !== "HUMAN_HANDLING"
const placeholder = sessionStatus === "AI_HANDLING"
  ? "AI đang xử lý — toggle sang Human để tiếp quản"
  : sessionStatus === "CLOSED"
    ? "Phiên chat đã đóng"
    : "Nhắn tin... (Enter để gửi, Shift+Enter xuống dòng)"
```

**UI khi disabled:**
- `textarea` có `disabled={isDisabled}`
- `opacity-50 cursor-not-allowed` khi disabled
- Nút Send cũng `disabled={isDisabled || isSending || !text.trim()}`

---

### 4.7 Sửa Session Detail Page

File: `src/app/(dashboard)/sessions/[sessionId]/page.tsx`

Truyền `sessionStatus` xuống `AdminChatInput` và xử lý `onSessionClosed` redirect:

```typescript
function SessionChatWrapper({ sessionId }: { sessionId: string }) {
  const router = useRouter()
  const chat = useAdminChat(sessionId, {
    onSessionClosed: () => {
      toast.success("Phiên chat đã được đóng")
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
        sessionStatus={chat.sessionStatus}  // MỚI
      />
    </>
  )
}
```

---

## 5. File Changes Summary

### API (backend)

| File | Type | Thay đổi |
|------|------|----------|
| `src/services/chat.service.ts` | Modify | Thêm emit `admin-notifications` tại 2 handoff trigger points |

### Admin (frontend)

| File | Type | Thay đổi |
|------|------|----------|
| `src/hooks/useAdminNotifications.ts` | **CREATE** | Global Pusher subscription cho `admin-notifications` |
| `src/hooks/useAdminChat.ts` | Modify | Thêm 3 Pusher handlers + `onSessionClosed` callback + `loadError` |
| `src/components/layout/AdminShell.tsx` | Modify | Thêm `<Toaster>` + wire `useAdminNotifications` |
| `src/components/layout/AdminSidebar.tsx` | Modify | Nhận `pendingChatCount` prop + hiển thị badge |
| `src/components/SessionChat.tsx` | Modify | Xóa 2 button cũ, thêm toggle switch + confirm dialog + i18n status |
| `src/components/AdminChatInput.tsx` | Modify | Thêm `sessionStatus` prop + disabled gating |
| `src/app/(dashboard)/sessions/[sessionId]/page.tsx` | Modify | Truyền `sessionStatus` + xử lý `onSessionClosed` |
| `public/sounds/notification.mp3` | **ADD** | Notification sound (file nhỏ ~10KB) |

---

## 6. Edge Cases

| Case | Xử lý |
|------|-------|
| Admin vào session đã `CLOSED` | Toggle disabled, input disabled, không có action |
| 2 admin cùng join 1 session | Người sau nhận `admin_joined` event → status update, có thể cả 2 vẫn chat |
| Notification khi admin đang trong đúng session đó | Không toast (check `pathname === /sessions/{session_id}`) |
| Soketi không configured (`NEXT_PUBLIC_SOKETI_KEY` rỗng) | `useAdminNotifications` skip silently — fallback polling 30s như cũ |
| `pendingCount` sau khi admin join | Khi admin `joinSession()` thành công → gọi `clearPending()` |
| Session list tự refresh | `useAdminNotifications` trigger `window.dispatchEvent(new CustomEvent('refetch-sessions'))` + `useSessions` lắng nghe event |

---

## 7. i18n Keys cần thêm (vi)

```json
{
  "chat": {
    "statusAiHandling": "Trợ lý AI",
    "statusHumanHandling": "Nhân viên",
    "statusClosed": "Đã đóng",
    "toggleJoinTitle": "Tiếp quản hỗ trợ?",
    "toggleJoinDesc": "Bạn sẽ là người hỗ trợ trực tiếp. AI sẽ tạm dừng trả lời.",
    "toggleHandbackTitle": "Chuyển lại cho AI?",
    "toggleHandbackDesc": "User sẽ được thông báo và AI sẽ tiếp tục hỗ trợ.",
    "inputDisabledAi": "AI đang xử lý — toggle sang Human để tiếp quản",
    "inputDisabledClosed": "Phiên chat đã đóng",
    "notificationTitle": "Yêu cầu hỗ trợ từ {name}",
    "notificationCta": "Vào xử lý",
    "sessionClosedRedirect": "Phiên chat đã được đóng"
  }
}
```

---

## 8. Dependency Check

| Dependency | Status |
|------------|--------|
| `react-hot-toast ^2.6.0` | ✅ Đã cài |
| `pusher-js ^8.5.0` | ✅ Đã cài |
| `@radix-ui/react-alert-dialog` | ❓ Cần kiểm tra — nếu chưa có dùng inline state modal |
| Notification sound file | ❌ Cần thêm vào `public/sounds/` |

---

## 9. Out of Scope

- Rich messages (images, files, cards) trong admin — MVP sau
- Phân quyền AGENT role riêng — hiện dùng ADMIN
- Multiple admin assignment / queue management
- Read receipts / seen status cho admin
- Session list realtime (vẫn dùng 30s polling + event-based refresh)
