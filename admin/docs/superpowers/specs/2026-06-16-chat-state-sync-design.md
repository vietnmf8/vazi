# Design Spec: Chat State Sync (Human Mode + Images + AI Vision)

**Date:** 2026-06-16  
**Status:** Draft — pending user review  
**Scope:** UI user chat + API + Admin chat display  
**Approach:** A — Server-authoritative rejoin (status + messages từ DB)

---

## 1. Tổng quan

Ba bug được báo cáo sau Admin Chat Full Port, cùng gốc **client state không đồng bộ server**:

| # | Triệu chứng | Root cause (đã xác minh trong code) |
|---|-------------|-------------------------------------|
| 1 | Refresh → user về AI, admin vẫn Human | `useChat` hardcode `setPhase("CHATTING")` khi rejoin; API `join` không trả `status` |
| 2 | User gửi ảnh không hiện (kể cả pending) | `appendMessage` bỏ tin chỉ có `images`; HUMAN path không optimistic; localStorage blob URL hết hạn |
| 3 | SYSTEM_HIDDEN lộ admin; AI không đọc ảnh | Admin không filter; double prefix; `loadGeminiHistory` mất URL ảnh |

**Mục tiêu:** Sau rejoin/refresh, user UI phản ánh đúng `session.status` từ DB và hiển thị messages (ảnh Cloudinary URL thật). Realtime Pusher vẫn là nguồn cập nhật live; server là source of truth khi boot.

**Debug policy (theo yêu cầu user):** Thêm `console.log` có prefix `[ChatSync]` / `[ChatImage]` / `[ChatVision]` xuyên suốt flow rejoin, append, upload, Gemini — **giữ đến khi user yêu cầu dọn**.

---

## 2. Kiến trúc

```
User refresh / openWidget
        │
        ▼
POST /api/v1/chat/join  { session_id, user_name }
        │
        ├── session_id
        ├── status          ← MỚI (AI_HANDLING | HUMAN_HANDLING | CLOSED)
        ├── admin_name      ← MỚI (optional, khi HUMAN_HANDLING)
        └── messages[]      ← MỚI (rejoin only — mapped UI format)
        │
        ▼
useChat.hydrateFromJoin()
        ├── mapStatusToPhase(status) → CHATTING | HUMAN_MODE | SURVEY
        ├── setMessages(serverMessages) — thay localStorage
        ├── subscribeToChannel(session_id)
        └── console.log phase + message count

Pusher (live updates, không thay server hydrate)
```

**Nguyên tắc:**
- **Server wins on boot** — localStorage chỉ cache sessionId + userName, không cache phase/messages làm source of truth.
- **Pusher wins on live** — events sau hydrate vẫn append/update như hiện tại.
- **Ảnh luôn dùng HTTPS URL** từ DB sau hydrate; blob URL chỉ dùng optimistic tạm thời.

---

## 3. API Changes (`api`)

### 3.1 Mở rộng `joinChatSession` response

**File:** `src/services/chat.service.ts`, `src/controllers/chat.controller.ts`, `src/validators/chat.validator.ts` (response type)

**Request:** không đổi (`POST /chat/join`).

**Response mới:**

```typescript
interface JoinChatResponse {
  session_id: string
  status: "AI_HANDLING" | "HUMAN_HANDLING" | "CLOSED"
  admin_name?: string | null
  /** Chỉ populate khi client gửi session_id (rejoin) */
  messages?: UserChatMessageDto[]
}
```

**Logic rejoin (`input.session_id` có giá trị):**
1. Load session từ DB → trả `status`.
2. Nếu `HUMAN_HANDLING` và có admin đang join (tùy field hiện có hoặc message SYSTEM gần nhất) → trả `admin_name` nếu có trong DB/event log; nếu chưa lưu admin_name thì `null` (UI fallback "Agent").
3. Load messages: `findMany` orderBy asc, **filter revoked**, map sang DTO user-facing:

```typescript
interface UserChatMessageDto {
  id: string
  session_id: string
  message: string           // originalText (masked)
  sender: "USER" | "AI" | "ADMIN" | "SYSTEM"
  message_type: "TEXT" | "FILE" | "IMAGE" | "SYSTEM"
  file_url?: string
  file_name?: string
  images?: string[]
  documents?: { url: string; name: string }[]
  delivery_status: "SENT" | "DELIVERED" | "SEEN"
  timestamp: string
}
```

**Mapping sender:** `CUSTOMER` → `USER`, `BOT` → `AI`, giữ `ADMIN`/`SYSTEM`.

**Ẩn SYSTEM_HIDDEN khỏi user response:** messages có `originalText.startsWith("[SYSTEM_HIDDEN]")` **không trả về client** (vẫn lưu DB cho AI context nếu cần).

**Session mới (`session_id` absent):** `status: "AI_HANDLING"`, `messages: []` hoặc omit.

### 3.2 `appendMessage` guard (API-side note)

Không đổi API emit — fix phía UI. Đảm bảo `emitSendMessage` luôn gửi `images`/`documents` trong Pusher payload (đã có).

### 3.3 Gemini history — vision context

**File:** `src/services/chat.service.ts` → `loadGeminiHistory`

**Hiện tại:** Chỉ thêm text `[User attached an image]`.

**Mới:** Với mỗi message user có `images[]`, build Gemini turn với `inlineData` parts (reuse logic từ `processImagesForGemini` hoặc extract shared helper).

**Follow-up không gửi ảnh mới:** Khi user hỏi về ảnh đã gửi (text-only follow-up), Gemini vẫn có image trong **history turns** → có thể trả lời "ảnh của bạn có...".

**Giới hạn:** Tối đa 3 ảnh gần nhất trong history window (50 messages) để tránh token explosion — log `[ChatVision] history image count`.

### 3.4 SYSTEM_HIDDEN — server hygiene

**Option (implement):** Khi lưu message USER có prefix `[SYSTEM_HIDDEN]`, set `messageType: "SYSTEM"` và **không emit** qua Pusher tới admin channel display — hoặc emit với flag `hidden: true`.

**Minimal fix (spec chọn):** UI admin filter + API join filter; DB giữ nguyên. Không đổi schema migration.

---

## 4. UI Changes (`ui`)

### 4.1 Types

**File:** `src/types/api.ts`

```typescript
export interface JoinChatResponse {
  session_id: string
  status: "AI_HANDLING" | "HUMAN_HANDLING" | "CLOSED"
  admin_name?: string | null
  messages?: ChatMessage[]
}
```

### 4.2 `hydrateFromJoin()` helper trong `useChat.ts`

Thay mọi chỗ `setPhase("CHATTING")` sau join/rejoin:

```typescript
function mapStatusToPhase(status: JoinChatResponse["status"]): ChatWidgetPhase {
  if (status === "HUMAN_HANDLING") return "HUMAN_MODE"
  if (status === "CLOSED") return "SURVEY"
  return "CHATTING"
}
```

**`openWidget()` flow mới:**
1. Read localStorage sessionId + userName.
2. Nếu có → gọi `joinChat({ session_id, user_name })` (async hydrate).
3. Apply `status`, `admin_name`, `messages` từ response.
4. `subscribeToChannel`.
5. **Không** gửi Form Draft Recovery nếu `status === "HUMAN_HANDLING"` hoặc messages đã có draft recovery gần đây (debounce 1 lần/session).

**Log:** `[ChatSync] openWidget hydrate`, status, phase, messageCount.

### 4.3 Fix `appendMessage()` — Bug 2A

**File:** `ui/src/hooks/useChat.ts` ~L254

```typescript
// TRƯỚC (sai):
if (!payload.message && !payload.file_url && !payload.card) return

// SAU:
const hasContent =
  Boolean(payload.message?.trim()) ||
  Boolean(payload.file_url) ||
  Boolean(payload.card) ||
  (payload.images?.length ?? 0) > 0 ||
  (payload.documents?.length ?? 0) > 0
if (!hasContent) return
```

**Log:** `[ChatImage] appendMessage skip|accept`, id, hasImages.

### 4.4 Optimistic images — HUMAN mode (Bug 2B)

**File:** `useChat.ts` sendMessage HUMAN branch (~L864)

Trước khi upload, push optimistic message giống AI branch:
- `images`: blob URLs tạm
- `delivery_status: "SENDING"`
- `client_id` for ack merge

Sau upload → update URLs Cloudinary → `sendChatMessage`.

### 4.5 localStorage strategy

- **Giữ:** `sessionId`, `userName` trong `SESSION_STORAGE_KEY`.
- **Messages cache:** vẫn persist sau mỗi update (offline resilience) nhưng **ghi đè bằng server messages** sau mỗi successful join hydrate.
- **Không persist:** blob URLs làm sole source — sau hydrate luôn dùng server URLs.

### 4.6 Fix `sendSystemMessage` double prefix (Bug 3B)

```typescript
// TRƯỚC:
const text = `[SYSTEM_HIDDEN] ${systemText}`

// SAU:
const text = systemText.startsWith("[SYSTEM_HIDDEN]")
  ? systemText
  : `[SYSTEM_HIDDEN] ${systemText}`
```

**Log:** `[ChatSync] sendSystemMessage`, length, prefixed.

### 4.7 Pusher `disableStats` deprecation

Đổi `disableStats: true` → `enableStats: false` trong `useChat.ts` (admin đã fix).

---

## 5. Admin Changes (`admin`)

### 5.1 Filter SYSTEM_HIDDEN

**File:** `AdminChatMessageList.tsx` hoặc `SessionChat.tsx`

Filter trước render (mirror UI):

```typescript
messages.filter(m => !m.text?.startsWith("[SYSTEM_HIDDEN]"))
```

**Log:** `[ChatSync] admin visible messages`, total vs filtered.

Không ảnh hưởng admin nhận realtime events — chỉ ẩn display.

---

## 6. Phase ↔ Status mapping (reference)

| DB `session.status` | UI `phase`     | Input enabled (user) |
|-------------------|----------------|----------------------|
| `AI_HANDLING`     | `CHATTING`     | Yes (AI flow)        |
| `HUMAN_HANDLING`  | `HUMAN_MODE`   | Yes (REST flow)      |
| `CLOSED`          | `SURVEY`       | No                   |

Admin badge: `HUMAN_HANDLING` → "Nhân viên" (đã có).

---

## 7. Debug logging checklist

| Tag | Location | Logs |
|-----|----------|------|
| `[ChatSync]` | `useChat` openWidget, joinSession, hydrateFromJoin | status, phase, msg count |
| `[ChatSync]` | API `joinChatSession` rejoin branch | sessionId, status, msg count |
| `[ChatImage]` | `appendMessage`, sendMessage optimistic | images length, skip reason |
| `[ChatImage]` | upload complete | cloudinary URLs |
| `[ChatVision]` | `loadGeminiHistory`, `processImagesForGemini` | urls loaded, inline parts count |
| `[ChatSync]` | admin message filter | hidden count |

**Không xóa** cho đến khi user confirm cleanup pass.

---

## 8. Error handling

| Case | Behavior |
|------|----------|
| Join fails (session not found) | Clear localStorage, phase → JOINING |
| Join OK but messages empty | Show empty state, vẫn đúng phase |
| Image upload fails | Rollback optimistic, toast error (đã có) |
| Gemini image fetch fails | Log + text fallback `[Image failed to load]` (đã có) |
| Rejoin during streaming | Abort stream ref, hydrate replaces local state |

---

## 9. Testing plan

### Bug 1 — Human mode persistence
1. Admin join session → Human.
2. User thấy Human mode.
3. User **hard refresh** trang.
4. Mở lại chat widget.
5. **Expected:** User vẫn Human mode; admin và user cùng status.

### Bug 2 — Image display
1. User gửi ảnh (Human mode) → hiện pending blob ngay.
2. Sau upload → hiện Cloudinary URL.
3. Admin thấy cùng ảnh.
4. Refresh user → ảnh vẫn hiện từ server hydrate.

### Bug 3 — SYSTEM_HIDDEN + AI vision
1. Admin **không** thấy `[SYSTEM_HIDDEN]` trong chat list.
2. User gửi ảnh passport (AI mode).
3. User hỏi "ảnh của tôi có những thông tin nào".
4. **Expected:** AI trả lời dựa trên nội dung ảnh (tên, số passport masked, v.v.) — không từ chối vision.

### Regression
- AI streaming vẫn hoạt động AI mode.
- Handoff/handback realtime vẫn đổi phase.
- Admin chat full port (search, grouping) không break.

---

## 10. Out of scope

- Reply/revoke/reactions changes
- Suggestions tray
- Persist `admin_name` vào DB nếu chưa có column (fallback null OK)
- Migration schema mới
- Xóa debug logs (chờ user request)

---

## 11. Files dự kiến thay đổi

| Repo | File | Change |
|------|------|--------|
| api | `chat.service.ts` | join response + loadGeminiHistory vision |
| api | `chat.controller.ts` | pass through |
| ui | `types/api.ts` | JoinChatResponse |
| ui | `hooks/useChat.ts` | hydrate, appendMessage, HUMAN optimistic, system msg |
| ui | `lib/soketi` or inline Pusher config | enableStats |
| admin | `AdminChatMessageList.tsx` | filter SYSTEM_HIDDEN |

---

## 12. Spec self-review

- [x] No TBD placeholders
- [x] Architecture matches all 3 bugs
- [x] Single implementation plan scope (one spec)
- [x] Ambiguity resolved: rejoin uses join endpoint enrichment, not new route
- [x] Security: messages only on rejoin with valid session_id (existing join validation)

---

**Next step after approval:** Invoke `writing-plans` skill → `docs/superpowers/plans/2026-06-16-chat-state-sync.md`
