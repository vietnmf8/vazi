# Chat Polish — 4 Issues Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sửa 4 vấn đề còn tồn đọng: audio 404, double-tick per-message logic, unread badge khi widget ẩn, và admin layout overflow.

**Architecture:** Mỗi fix độc lập. Fix 2 (double-tick) là phức tạp nhất: thêm `isReplied` prop qua chain `ChatMessageList → ChatMessage → ChatMessageFooter` (user side) và `AdminChatMessageList → AdminChatMessage` (admin side). Fix 1/3/4 là thay đổi nhỏ, có thể làm cùng lúc.

**Tech Stack:** Next.js 15, React 19, TypeScript strict, Tailwind CSS, Pusher/Soketi.

---

## Files Thay Đổi

| File | Loại | Mục đích |
|------|------|----------|
| `ui/public/sounds/chat-notification.mp3` | Create | Copy từ admin để fix audio 404 |
| `ui/src/hooks/useChat.ts` | Modify | Fix play() error, remove setPhase("CLOSED") từ closeWidget |
| `ui/src/components/features/chat/window/ChatMessageList.tsx` | Modify | Tính `isUserMessagesReplied`, pass `isReplied` xuống ChatMessage |
| `ui/src/components/features/chat/ChatMessage.tsx` | Modify | Thêm `isReplied?: boolean` prop, forward xuống ChatMessageFooter |
| `ui/src/components/features/chat/ChatMessageFooter.tsx` | Modify | `DeliveryStatusIcon` dùng `isReplied` thay vì `phase === "HUMAN_MODE"` |
| `admin/src/components/chat/AdminChatMessageList.tsx` | Modify | Tính `isAdminMessagesReplied`, pass `isReplied` xuống AdminChatMessage |
| `admin/src/components/chat/AdminChatMessage.tsx` | Modify | Thêm `isReplied?: boolean`, dùng thay vì `sessionStatus === "HUMAN_HANDLING"` |
| `admin/src/app/(dashboard)/sessions/[sessionId]/page.tsx` | Modify | Thêm `overflow-hidden` để fix extra scrollbar |

---

## Task 1: Fix audio 404 + play() error handling

**Files:**
- Create: `ui/public/sounds/chat-notification.mp3`
- Modify: `ui/src/hooks/useChat.ts:154-165`

- [ ] **Step 1.1: Copy audio file**

```bash
cp "d:/F8_K15_BTVN/FASTVISA/admin/public/sounds/notification.mp3" \
   "d:/F8_K15_BTVN/FASTVISA/ui/public/sounds/chat-notification.mp3"
```

Verify: `ls ui/public/sounds/` phải hiện `chat-notification.mp3`.

- [ ] **Step 1.2: Thêm .catch() vào play() trong useChat.ts**

File: `ui/src/hooks/useChat.ts`

Tìm đoạn (lines ~155–164):
```typescript
function playNotificationSound() {
    if (typeof window === "undefined") return;
    try {
        if (!notificationAudio) {
            notificationAudio = new Audio("/sounds/chat-notification.mp3");
        }
        notificationAudio.currentTime = 0;
        void notificationAudio.play();
    } catch { /* browser may block autoplay */ }
}
```

Thay `void notificationAudio.play();` bằng:
```typescript
notificationAudio.play().catch(() => {});
```

Kết quả sau sửa:
```typescript
function playNotificationSound() {
    if (typeof window === "undefined") return;
    try {
        if (!notificationAudio) {
            notificationAudio = new Audio("/sounds/chat-notification.mp3");
        }
        notificationAudio.currentTime = 0;
        notificationAudio.play().catch(() => {});
    } catch { /* browser may block autoplay */ }
}
```

---

## Task 2: Fix unread badge — remove setPhase("CLOSED") từ closeWidget

**Files:**
- Modify: `ui/src/hooks/useChat.ts:568-571`

Khi user nhấn X để ẩn widget (không phải kết thúc session), `setPhase("CLOSED")` sai — nó làm widget behave như session đã kết thúc, khiến Pusher subscription bị reset và unreadCount không tăng được khi có tin mới.

- [ ] **Step 2.1: Xóa setPhase("CLOSED") khỏi closeWidget**

File: `ui/src/hooks/useChat.ts`

Tìm (lines ~568-571):
```typescript
const closeWidget = useCallback(() => {
    setIsOpen(false);
    setPhase("CLOSED");
}, []);
```

Sửa thành:
```typescript
const closeWidget = useCallback(() => {
    setIsOpen(false);
}, []);
```

**Lý do:** `isOpen = false` đã đủ để ẩn widget. Phase giữ nguyên (CHATTING / HUMAN_MODE) để Pusher tiếp tục nhận tin, `unreadCount` tăng khi có tin mới. Badge UI đã tồn tại trong `ChatWidget.tsx` (line 97-104), sẽ hiển thị tự động khi `unreadCount > 0 && !isOpen`.

---

## Task 3: Admin layout — thêm overflow-hidden

**Files:**
- Modify: `admin/src/app/(dashboard)/sessions/[sessionId]/page.tsx:52-62`

- [ ] **Step 3.1: Thêm overflow-hidden vào SessionChatWrapper**

File: `admin/src/app/(dashboard)/sessions/[sessionId]/page.tsx`

Tìm (lines ~52-62):
```tsx
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <SessionChat sessionId={sessionId} chat={chat} />
      <AdminChatInput
        onSend={chat.sendWithFiles}
        isSending={chat.isSending}
        onTyping={chat.sendTypingStatus}
        sessionStatus={chat.sessionStatus}
      />
    </div>
  )
```

Thêm `overflow-hidden`:
```tsx
  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <SessionChat sessionId={sessionId} chat={chat} />
      <AdminChatInput
        onSend={chat.sendWithFiles}
        isSending={chat.isSending}
        onTyping={chat.sendTypingStatus}
        sessionStatus={chat.sessionStatus}
      />
    </div>
  )
```

---

## Task 4: User side — DeliveryStatusIcon dùng isReplied

**Files:**
- Modify: `ui/src/components/features/chat/ChatMessageFooter.tsx:6-23` (DeliveryStatusIcon)

**Logic:** Blue tick khi và chỉ khi `isReplied === true` (admin/assistant đã gửi tin sau tin USER cuối cùng). Bỏ logic `phase === "HUMAN_MODE"` để chính xác hơn.

- [ ] **Step 4.1: Cập nhật DeliveryStatusIcon trong ChatMessageFooter.tsx**

File: `ui/src/components/features/chat/ChatMessageFooter.tsx`

**Bước 4.1a:** Sửa `DeliveryStatusIcon` (lines 6–23):

```typescript
export function DeliveryStatusIcon({
    isReplied,
}: {
    isReplied?: boolean;
}) {
    return (
        <CheckCheck
            className={cn(
                "size-3",
                isReplied ? "text-blue-400" : "text-[var(--color-text-muted)]",
            )}
            aria-label={isReplied ? "Seen" : "Sent"}
        />
    );
}
```

**Bước 4.1b:** Cập nhật `ChatMessageFooterProps` — thêm `isReplied`, giữ các props cũ:

```typescript
interface ChatMessageFooterProps {
    isUser: boolean;
    isRevoked: boolean;
    timestamp: string;
    deliveryStatus?: string;
    phase?: string;
    isReplied?: boolean;
    messageText?: string;
    isTranslating?: boolean;
    showTranslation: boolean;
    onToggleTranslate: () => void;
    delayedGroupedNext?: boolean;
}
```

**Bước 4.1c:** Thêm `isReplied` vào destructure của `ChatMessageFooter`:

```typescript
export function ChatMessageFooter({
    isUser,
    isRevoked,
    timestamp,
    deliveryStatus,
    phase: _phase,
    isReplied,
    messageText,
    isTranslating,
    showTranslation,
    onToggleTranslate,
    delayedGroupedNext,
}: ChatMessageFooterProps) {
```

**Bước 4.1d:** Trong JSX của `ChatMessageFooter` (line ~76), cập nhật call `DeliveryStatusIcon`:

Tìm:
```tsx
<DeliveryStatusIcon status={deliveryStatus} phase={phase} />
```

Sửa thành:
```tsx
<DeliveryStatusIcon isReplied={isReplied} />
```

---

## Task 5: User side — thêm isReplied prop vào ChatMessage

**Files:**
- Modify: `ui/src/components/features/chat/ChatMessage.tsx:35-56` (ChatMessageProps interface)
- Modify: `ui/src/components/features/chat/ChatMessage.tsx:~790-803` (ChatMessageFooter call)

- [ ] **Step 5.1: Thêm isReplied vào ChatMessageProps interface**

File: `ui/src/components/features/chat/ChatMessage.tsx`

Tìm interface `ChatMessageProps` (lines ~35-56), thêm field `isReplied` sau `whatsappUrl`:

```typescript
interface ChatMessageProps {
    message: ChatMessageType;
    searchQuery?: string;
    onTranslate: (messageId: string) => void;
    onCopy?: (text: string) => void;
    onRevoke?: (messageId: string) => void;
    onReply?: (message: ChatMessageType) => void;
    onReaction?: (messageId: string, emoji: string) => void;
    /** Message gốc để hiển thị quoted reply (nếu có reply_to_id) */
    replyToMessage?: ChatMessageType;
    /** TẠI SAO thêm phase: Nhận trạng thái phase hiện tại từ cửa sổ chat để quyết định số lượng ticks (1 tick vs 2 ticks) */
    phase?: string;
    /** Callback khi ảnh đính kèm load xong — scroll correction nếu đang ở đáy */
    onImageLoad?: () => void;
    /** Grouping flags từ danh sách */
    isGroupedWithPrev?: boolean;
    isGroupedWithNext?: boolean;
    /** Cờ đánh dấu tin nhắn mới để áp dụng delay gom nhóm */
    isNewMessage?: boolean;
    /** URL WhatsApp cho urgent CTA card — được feed từ getFooterSettings() ở server level */
    whatsappUrl?: string;
    /** Tin nhắn đã được đọc bởi bên kia (admin/assistant đã reply) — xanh tick */
    isReplied?: boolean;
}
```

- [ ] **Step 5.2: Forward isReplied vào ChatMessageFooter call**

File: `ui/src/components/features/chat/ChatMessage.tsx`

Tìm đoạn gọi `<ChatMessageFooter` (~line 790):
```tsx
<ChatMessageFooter
    isUser={isUser}
    isRevoked={isRevoked}
    timestamp={message.timestamp}
    deliveryStatus={message.delivery_status}
    phase={phase}
    messageText={cleanMessageText}
    isTranslating={message.isTranslating}
    showTranslation={showTranslation}
    onToggleTranslate={handleToggleTranslate}
    delayedGroupedNext={delayedGroupedNext}
/>
```

Thêm `isReplied`:
```tsx
<ChatMessageFooter
    isUser={isUser}
    isRevoked={isRevoked}
    timestamp={message.timestamp}
    deliveryStatus={message.delivery_status}
    phase={phase}
    isReplied={isReplied}
    messageText={cleanMessageText}
    isTranslating={message.isTranslating}
    showTranslation={showTranslation}
    onToggleTranslate={handleToggleTranslate}
    delayedGroupedNext={delayedGroupedNext}
/>
```

Lưu ý: `ChatMessageInner` (inner component) cũng nhận props từ `ChatMessage` outer component. Phải kiểm tra và thêm `isReplied` vào destructure của `ChatMessageInner` nếu nó là component riêng, và forward từ outer `ChatMessage` wrapper. Grep trong file xem `ChatMessageInner` nhận props như thế nào.

---

## Task 6: User side — tính isUserMessagesReplied trong ChatMessageList

**Files:**
- Modify: `ui/src/components/features/chat/window/ChatMessageList.tsx` — phần map `renderedMessages`

**Logic:**
- Tìm index của tin nhắn USER cuối cùng trong `activeMessagesList`
- Nếu sau đó có bất kỳ tin nhắn nào từ ASSISTANT hoặc ADMIN → `isUserMessagesReplied = true`
- Tất cả USER messages trong render đều nhận `isReplied={isUserMessagesReplied}`

- [ ] **Step 6.1: Thêm computation trước renderedMessages.map()**

File: `ui/src/components/features/chat/window/ChatMessageList.tsx`

Thêm đoạn tính toán ngay trước `{renderedMessages.map(...)}` (khoảng line 416):

```typescript
// Tick xanh cho tin nhắn USER: chỉ khi admin/assistant đã gửi tin nhắn sau tin USER cuối cùng.
// Không dùng phase để tránh false-positive (admin trong chat nhưng chưa reply cũng tick xanh).
const lastUserMsgIdx = activeMessagesList.reduceRight(
    (found, msg, idx) => (found !== -1 ? found : msg.sender === "USER" ? idx : -1),
    -1,
);
const isUserMessagesReplied =
    lastUserMsgIdx !== -1 &&
    activeMessagesList
        .slice(lastUserMsgIdx + 1)
        .some((m) => m.sender !== "USER" && m.sender !== "SYSTEM");
```

- [ ] **Step 6.2: Pass isReplied vào ChatMessage trong map**

Trong `renderedMessages.map()`, tìm `<ChatMessage` và thêm `isReplied`:

```tsx
<ChatMessage
    message={msg}
    phase={phase}
    searchQuery={searchQuery}
    onTranslate={onTranslate}
    onCopy={undefined}
    onRevoke={onRevoke}
    onReply={onReply}
    onReaction={onReaction}
    replyToMessage={
        msg.reply_to_id
            ? messageMap.get(msg.reply_to_id)
            : undefined
    }
    onImageLoad={handleImageLoad}
    isGroupedWithPrev={isGroupedWithPrev}
    isGroupedWithNext={isGroupedWithNext}
    isNewMessage={isNew}
    whatsappUrl={whatsappUrl}
    isReplied={msg.sender === "USER" ? isUserMessagesReplied : undefined}
/>
```

---

## Task 7: Admin side — AdminChatMessage dùng isReplied thay sessionStatus

**Files:**
- Modify: `admin/src/components/chat/AdminChatMessage.tsx:137-144` (interface)
- Modify: `admin/src/components/chat/AdminChatMessage.tsx:~351-363` (CheckCheck logic)

- [ ] **Step 7.1: Thêm isReplied vào AdminChatMessageProps**

File: `admin/src/components/chat/AdminChatMessage.tsx`

Tìm (lines ~137-144):
```typescript
export interface AdminChatMessageProps {
  message: AdminChatMessageType
  isGroupedWithPrev?: boolean
  isGroupedWithNext?: boolean
  searchQuery?: string
  guestName: string
  sessionStatus?: string
}
```

Thêm `isReplied`:
```typescript
export interface AdminChatMessageProps {
  message: AdminChatMessageType
  isGroupedWithPrev?: boolean
  isGroupedWithNext?: boolean
  searchQuery?: string
  guestName: string
  sessionStatus?: string
  /** Admin message đã được user phản hồi — tick xanh */
  isReplied?: boolean
}
```

- [ ] **Step 7.2: Destructure isReplied trong component function**

Tìm `export function AdminChatMessage({` (~line 149), thêm `isReplied` vào destructure:
```typescript
export function AdminChatMessage({
  message,
  isGroupedWithPrev = false,
  isGroupedWithNext = false,
  searchQuery,
  guestName,
  sessionStatus,
  isReplied,
}: AdminChatMessageProps) {
```

- [ ] **Step 7.3: Dùng isReplied trong CheckCheck footer**

Tìm đoạn CheckCheck (lines ~351-362):
```tsx
{isAdmin && (
  <CheckCheck
    className={cn(
      "size-3",
      sessionStatus === "HUMAN_HANDLING"
        ? "text-blue-400"
        : "text-[var(--color-text-muted)]",
    )}
    aria-label={sessionStatus === "HUMAN_HANDLING" ? "Seen" : "Delivered"}
  />
)}
```

Sửa thành:
```tsx
{isAdmin && (
  <CheckCheck
    className={cn(
      "size-3",
      isReplied ? "text-blue-400" : "text-[var(--color-text-muted)]",
    )}
    aria-label={isReplied ? "Seen" : "Delivered"}
  />
)}
```

---

## Task 8: Admin side — tính isAdminMessagesReplied trong AdminChatMessageList

**Files:**
- Modify: `admin/src/components/chat/AdminChatMessageList.tsx:104-153`

**Logic:**
- Tìm index của tin nhắn ADMIN cuối cùng trong `visibleMessages`
- Nếu sau đó có bất kỳ tin nhắn USER nào → `isAdminMessagesReplied = true`
- Tất cả ADMIN messages nhận `isReplied={isAdminMessagesReplied}`

- [ ] **Step 8.1: Thêm computation sau normalizeSender và trước return JSX**

File: `admin/src/components/chat/AdminChatMessageList.tsx`

`normalizeSender` được định nghĩa ở lines ~104-108. Thêm computation sau nó:

```typescript
// Tick xanh cho tin nhắn ADMIN: chỉ khi user đã gửi tin nhắn sau tin ADMIN cuối cùng.
const lastAdminIdx = visibleMessages.reduce((found, msg, idx) => {
  return normalizeSender(msg.sender_type) === "ADMIN" ? idx : found;
}, -1);
const isAdminMessagesReplied =
  lastAdminIdx !== -1 &&
  visibleMessages
    .slice(lastAdminIdx + 1)
    .some((m) => normalizeSender(m.sender_type) === "USER");
```

- [ ] **Step 8.2: Pass isReplied vào AdminChatMessage trong map**

Trong `visibleMessages.map()` (lines ~112-152), tìm `<AdminChatMessage` và thêm `isReplied`:

```tsx
<AdminChatMessage
  message={msg}
  isGroupedWithPrev={isGroupedWithPrev}
  isGroupedWithNext={isGroupedWithNext}
  searchQuery={searchQuery}
  guestName={guestName}
  sessionStatus={sessionStatus}
  isReplied={normalizeSender(msg.sender_type) === "ADMIN" ? isAdminMessagesReplied : undefined}
/>
```

- [ ] **Step 8.3: Xóa console.log debug đã tồn tại**

File: `admin/src/components/chat/AdminChatMessageList.tsx`

Xóa đoạn sau `visibleMessages` computation (khoảng lines 80-83):
```typescript
console.log(
    `[ChatSync] admin messages total=${messages.length} visible=${visibleMessages.length} hidden=${messages.length - visibleMessages.length}`,
)
```

---

## Task 9: Build verify

- [ ] **Step 9.1: Build admin**

```bash
cd "d:/F8_K15_BTVN/FASTVISA/admin" && npm run build
```

Expected: exit 0, không type error.

- [ ] **Step 9.2: Build ui**

```bash
cd "d:/F8_K15_BTVN/FASTVISA/ui" && npm run build
```

Expected: exit 0, không type error.

- [ ] **Step 9.3: Nếu fail → Auto Fix Loop**

Xem lỗi, sửa, chạy lại build. Không báo done cho đến khi cả 2 đều pass.

---

## Self-Review Checklist

### Spec Coverage

| Requirement | Task |
|-------------|------|
| Audio 404 fix (copy mp3) | Task 1 Step 1.1 |
| Audio play() .catch() | Task 1 Step 1.2 |
| closeWidget không setPhase("CLOSED") | Task 2 |
| Unread badge UI (đã có trong ChatWidget.tsx) | Verified: không cần thêm |
| Admin overflow-hidden | Task 3 |
| DeliveryStatusIcon dùng isReplied | Task 4 |
| ChatMessage forward isReplied | Task 5 |
| ChatMessageList tính isUserMessagesReplied | Task 6 |
| AdminChatMessage dùng isReplied | Task 7 |
| AdminChatMessageList tính isAdminMessagesReplied | Task 8 |
| Build verify | Task 9 |

### Type Consistency

- `isReplied?: boolean` — consistent across ChatMessageFooterProps, ChatMessageProps, AdminChatMessageProps
- `DeliveryStatusIcon` nhận `isReplied` thay `phase` — phải update call site trong ChatMessageFooter (Task 4 Step 4.1d)
- `normalizeSender` dùng trong `isAdminMessagesReplied` computation — function trong cùng scope component ✓

### Edge Cases

- Khi `activeMessagesList` rỗng → `lastUserMsgIdx = -1` → `isUserMessagesReplied = false` ✓
- Khi `visibleMessages` rỗng → `lastAdminIdx = -1` → `isAdminMessagesReplied = false` ✓
- Khi user là người nhắn cuối → `isUserMessagesReplied = false` → gray tick ✓
- Khi admin là người nhắn cuối → `isAdminMessagesReplied = false` → gray tick ✓

### Không tạo file mới nào ngoài mp3

✓ Không có component mới hay utility mới — chỉ modify existing files + copy 1 audio file.
