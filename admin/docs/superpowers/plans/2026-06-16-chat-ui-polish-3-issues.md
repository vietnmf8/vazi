# Chat UI Polish — 3 Issues Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sửa 3 vấn đề UI/UX: AdminChatInput height bug, badge z-index, và admin system message wording.

**Architecture:** 3 fixes hoàn toàn độc lập nhau. Mỗi fix chỉ thay đổi 1–2 file. Không có API changes.

**Tech Stack:** Next.js 15, React 19, TypeScript strict, Tailwind CSS.

---

## Files Thay Đổi

| File | Loại | Mục đích |
|------|------|----------|
| `admin/src/components/AdminChatInput.tsx` | Modify | Fix height min 40px, bỏ scrollbar bên trong input |
| `ui/src/components/features/chat/ChatWidget.tsx` | Modify | Thêm z-10 cho badge để không bị che bởi button hover |
| `admin/src/components/chat/AdminChatMessage.tsx` | Modify | SYSTEM connecting msg hiển thị "{guestName} đang cần bạn hỗ trợ trực tiếp" |
| `admin/src/components/chat/AdminChatMessageList.tsx` | Modify | connectedText = "AI chuyển giao cho admin tư vấn" |

---

## Task 1: Fix AdminChatInput height

**File:** `admin/src/components/AdminChatInput.tsx`

**Root cause:** `measuredHeight` khởi tạo 24px. Clone div rỗng có `scrollHeight = padding only = 16px` → `Math.max(16, 24) = 24`. Nhưng 1 dòng với `py-2` + line-height thực tế cần ~40px → content tràn → scrollbar + placeholder bị cắt.

- [ ] **Step 1.1: Thay đổi initial measuredHeight từ 24 → 40**

File: `admin/src/components/AdminChatInput.tsx`

Tìm (line ~48):
```typescript
const [measuredHeight, setMeasuredHeight] = useState(24)
```

Sửa:
```typescript
const [measuredHeight, setMeasuredHeight] = useState(40)
```

- [ ] **Step 1.2: Thay đổi minimum trong updateHeight từ 24 → 40**

Tìm (line ~83):
```typescript
const newHeight = Math.min(Math.max(scrollHeight, 24), 91)
```

Sửa:
```typescript
const newHeight = Math.min(Math.max(scrollHeight, 40), 120)
```

Lưu ý: maxHeight cũng tăng từ 91 → 120 (tương ứng ~5 dòng) để tỷ lệ expand thoải mái hơn. maxHeight style bên dưới cũng cần cập nhật.

- [ ] **Step 1.3: Thêm minHeight CSS safety net và update maxHeight style**

Tìm style object của editor div (lines ~354–363):
```typescript
style={{
  backgroundColor: "var(--color-surface-elevated)",
  border: "1px solid var(--color-border-default)",
  color: "var(--color-text-primary)",
  fontSize: "var(--font-size-md)",
  height: measuredHeight,
  maxHeight: 91,
  opacity: isDisabled ? 0.5 : 1,
  cursor: isDisabled ? "not-allowed" : "text",
}}
```

Sửa:
```typescript
style={{
  backgroundColor: "var(--color-surface-elevated)",
  border: "1px solid var(--color-border-default)",
  color: "var(--color-text-primary)",
  fontSize: "var(--font-size-md)",
  height: measuredHeight,
  minHeight: "2.5rem",
  maxHeight: 120,
  opacity: isDisabled ? 0.5 : 1,
  cursor: isDisabled ? "not-allowed" : "text",
}}
```

- [ ] **Step 1.4: Update setMeasuredHeight trong handleSubmit reset**

Sau khi submit, height reset về 24. Phải đồng bộ với giá trị mới:

Tìm (line ~169):
```typescript
setMeasuredHeight(24)
```

Sửa:
```typescript
setMeasuredHeight(40)
```

---

## Task 2: Fix badge z-index

**File:** `ui/src/components/features/chat/ChatWidget.tsx`

**Root cause:** Badge `<span>` là `absolute`, không có z-index. Button có `hover:scale-[1.02]` — khi scale, browser có thể render button trên badge vì button nằm sau badge trong DOM.

- [ ] **Step 2.1: Thêm z-10 vào badge span**

Tìm (lines ~98–103):
```tsx
<span
  className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-[var(--color-error)] text-xs font-bold text-white"
  aria-label={`${chat.unreadCount} unread messages`}
>
```

Thêm `z-10`:
```tsx
<span
  className="absolute -right-1 -top-1 z-10 flex size-5 items-center justify-center rounded-full bg-[var(--color-error)] text-xs font-bold text-white"
  aria-label={`${chat.unreadCount} unread messages`}
>
```

---

## Task 3: Admin system message wording

**Context:**
- API gửi cùng 1 Pusher SYSTEM message cho cả user lẫn admin: `"Đang kết nối bạn với nhân viên hỗ trợ, vui lòng chờ..."`
- Admin không nên thấy user-facing text này
- `isHandoffConnectingText(text)` trong `admin/src/lib/chat-handoff.ts` detect đúng loại message này
- `resolveHandoffConnectingMessages` trong `AdminChatMessageList` thay thế text khi "superseded" bằng `connectedText` param

**Hai thay đổi:**
1. `AdminChatMessage`: khi render SYSTEM message mà `isHandoffConnectingText`, show `"{guestName} đang cần bạn hỗ trợ trực tiếp"`
2. `AdminChatMessageList`: đổi `connectedText` từ `"Đã kết nối với nhân viên hỗ trợ"` → `"AI chuyển giao cho admin tư vấn"`

### Task 3a: AdminChatMessage — map connecting text

**File:** `admin/src/components/chat/AdminChatMessage.tsx`

- [ ] **Step 3a.1: Import isHandoffConnectingText**

Tìm imports hiện tại ở đầu file (khoảng line 1–10):
```typescript
"use client"

import React, { useCallback, useMemo } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { CheckCheck, Download, FileIcon, FileSpreadsheet, FileText } from "lucide-react"
import { cn } from "@/lib/utils"
import { t } from "@/lib/i18n"
import type { AdminChatMessage as AdminChatMessageType } from "@/types/api"
```

Thêm import:
```typescript
import { isHandoffConnectingText } from "@/lib/chat-handoff"
```

- [ ] **Step 3a.2: Map connecting text trong isSystem block**

Tìm đoạn `isSystem` block (lines ~212–232):
```typescript
if (isSystem) {
    // Safety net cho messages cũ trong DB vẫn còn raw key
    const displayText =
      message.text === "HANDBACK_SYSTEM_MESSAGE"
        ? "Đã chuyển lại cho Trợ lý AI Kimi."
        : (message.text ?? "")

    return (
      <div className="flex justify-center my-2 w-full">
        <span
          className="px-3 py-1 rounded-full text-center"
          style={{
            backgroundColor: "color-mix(in srgb, var(--color-border-default) 40%, transparent)",
            color: "var(--color-text-tertiary)",
            fontSize: "var(--font-size-xs)",
          }}
        >
          {displayText}
        </span>
      </div>
    )
```

Sửa `displayText` logic để thêm case cho connecting text:
```typescript
if (isSystem) {
    // Mapping admin-friendly display text cho các system message đặc biệt
    const displayText =
      message.text === "HANDBACK_SYSTEM_MESSAGE"
        ? "Đã chuyển lại cho Trợ lý AI Kimi."
        : message.text && isHandoffConnectingText(message.text)
          ? `${guestName || "Khách hàng"} đang cần bạn hỗ trợ trực tiếp`
          : (message.text ?? "")

    return (
      <div className="flex justify-center my-2 w-full">
        <span
          className="px-3 py-1 rounded-full text-center"
          style={{
            backgroundColor: "color-mix(in srgb, var(--color-border-default) 40%, transparent)",
            color: "var(--color-text-tertiary)",
            fontSize: "var(--font-size-xs)",
          }}
        >
          {displayText}
        </span>
      </div>
    )
```

### Task 3b: AdminChatMessageList — đổi connectedText

**File:** `admin/src/components/chat/AdminChatMessageList.tsx`

- [ ] **Step 3b.1: Thay đổi connectedText param**

Tìm (lines ~73–77):
```typescript
const visibleMessages = resolveHandoffConnectingMessages(
    messages.filter((m) => !m.text?.startsWith("[SYSTEM_HIDDEN]")),
    sessionStatus,
    "Đã kết nối với nhân viên hỗ trợ",
)
```

Sửa:
```typescript
const visibleMessages = resolveHandoffConnectingMessages(
    messages.filter((m) => !m.text?.startsWith("[SYSTEM_HIDDEN]")),
    sessionStatus,
    "AI chuyển giao cho admin tư vấn",
)
```

---

## Task 4: Build verify

- [ ] **Step 4.1: Build admin**

```bash
cd "d:/F8_K15_BTVN/FASTVISA/admin" && npm run build
```

Expected: exit 0, không type error.

- [ ] **Step 4.2: Build ui**

```bash
cd "d:/F8_K15_BTVN/FASTVISA/ui" && npm run build
```

Expected: exit 0, không type error.

- [ ] **Step 4.3: Nếu fail → Auto Fix Loop**

Xem lỗi, sửa, chạy lại build. Không báo done cho đến khi cả 2 đều pass.

---

## Self-Review Checklist

| Requirement | Task |
|-------------|------|
| Input height ≥ 40px, không scrollbar | Task 1 |
| measuredHeight reset về 40 sau submit | Task 1.4 |
| Badge z-10 trên button hover | Task 2 |
| Admin connecting message = "{guestName} đang cần..." | Task 3a |
| Superseded message = "AI chuyển giao..." | Task 3b |
| Build verify | Task 4 |

### Edge cases

- `guestName` rỗng → fallback `"Khách hàng"` trong Task 3a.2 ✓
- Khi admin đã gửi tin (superseded): `resolveHandoffConnectingMessages` đổi text thành `"AI chuyển giao cho admin tư vấn"` → `isHandoffConnectingText("AI chuyển giao...")` = false → hiển thị as-is ✓
- `HANDBACK_SYSTEM_MESSAGE` vẫn được handle trước case mới ✓
