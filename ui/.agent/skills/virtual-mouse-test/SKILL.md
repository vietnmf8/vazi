---
name: virtual-mouse-test
description: >
  Quy trình chuẩn để thêm button mới vào Virtual Mouse (AI click UI),
  chạy test toàn pipeline, xác nhận animation đúng bằng screenshot,
  rồi mới cache vào NLP. Dùng khi thêm data-ai-element mới hoặc fix bug cursor.
---

# Skill: Virtual Mouse — Test & Cache Pipeline

## Tổng quan kiến trúc

```
User chat message
      │
      ▼
[NLP Classifier]  ← model-vN.json  (< 1ms, không tốn Gemini quota)
      │ HIT score ≥ 0.95
      ├──────────────────────────► SSE { action:"VIRTUAL_CLICK", target }
      │ MISS
      ▼
[Gemini AI + click_ui_element tool]
      │ gọi tool với target chọn theo priority rules
      ▼
ELEMENT_CLICK_TRIGGERED → gemini.service.ts
      │
      ▼
SSE { action:"VIRTUAL_CLICK", target }
      │
      ▼ (useChat.ts → agentStore.triggerVirtualClick)
[VirtualMouseEngine.tsx]
  t=0ms    cursor fade-in tại center màn hình
  t+200ms  animate(x,y) → di chuyển đến element (800ms easeInOut)
  t+900ms  classList.add("ai-cursor-hover")  → scale 1.05 + indigo glow
  t+1050ms classList.remove("hover") → add("ai-cursor-press") + el.click()
  t+1350ms setVisible(false) → fade-out + reportActionSuccess()
```

## Thứ tự quy trình bắt buộc

```
TẦNG 0  Pre-flight checks
   ↓ (pass hết mới chạy tiếp)
TẦNG 1  API E2E Test          — HTTP thuần, không cần browser, ~2s/case
   ↓ (ALL PASS)
TẦNG 2  Playwright Full Test  — Chrome thật, animation thật, screenshot bằng chứng
   ↓ (ALL PASS)
TẦNG 3  NLP Cache             — Insert DB → retrain → restart → verify
```

> **Lý do NLP Cache ở CUỐI:** Cache là "đóng dấu chính thức". Chỉ cache khi
> CẢ HAI tầng 1 và 2 xác nhận: AI chọn đúng target VÀ animation hiển thị đúng
> trong browser thật. Cache sai rất khó undo vì phải retrain lại model.

---

## TẦNG 0: Pre-flight Checks

Thực hiện trước khi viết bất kỳ test nào.

### 0a. Kiểm tra `data-ai-element` trong HTML

```bash
# Tìm element trong UI source
grep -r 'data-ai-element="TEN_TARGET"' ui/src/
```

Nếu chưa có → thêm vào component:
```tsx
<button data-ai-element="ten_target_moi" ...>
  Tên nút
</button>
```

### 0b. Kiểm tra MISSING_MESSAGE (BẮT BUỘC)

**Triệu chứng lỗi:** `app.log` xuất hiện:
```
[browser] Error: MISSING_MESSAGE: Could not resolve `Chat.tool_click_ui_element`
```

**Nguyên nhân:** Thêm tool mới nhưng quên thêm translation key.

**Kiểm tra:**
```bash
grep "tool_click_ui_element" ui/src/messages/vi.json
grep "tool_click_ui_element" ui/src/messages/en.json
grep "tool_click_ui_element" ui/src/messages/ko.json
```

**Fix — thêm vào cả 3 file, trong namespace `"Chat"`, sau `"tool_navigate_to_page"`:**

```json
// vi.json
"tool_click_ui_element": "Đang thao tác giao diện..."

// en.json
"tool_click_ui_element": "Interacting with interface..."

// ko.json
"tool_click_ui_element": "인터페이스 조작 중..."
```

> Nếu thêm tool MỚI (không phải click_ui_element) → pattern key là `tool_<tên_tool>`.
> Phải thêm vào CẢ 3 ngôn ngữ, thiếu 1 cũng gây lỗi.

### 0c. Đăng ký target trong tool

Mở `api/src/services/chatbot/tools/click-ui-element.tool.ts`:

**1. Thêm vào `description` string (phần DANH SÁCH):**
```typescript
"  'ten_target_moi' → Mô tả ngắn về nút này\n" +
```

**2. Thêm vào mảng `enum`:**
```typescript
"ten_target_moi",
```

**3. Nếu có thể nhầm với nút khác cùng tên → thêm priority rule:**
```typescript
"⚠️ QUY TẮC ƯU TIÊN:\n" +
"  Khi user không chỉ định vị trí → LUÔN chọn 'ten_target_chinh'\n" +
"  Chỉ chọn 'ten_target_phu' khi user nói RÕ 'header'/'cuối trang'\n" +
"  → KHÔNG HỎI LẠI — tự áp dụng ưu tiên\n\n" +
```

---

## TẦNG 1: API E2E Test

**Không cần browser. Gửi HTTP request thật → parse SSE → assert target.**

### Thêm test case vào script

File: `api/scripts/e2e-virtual-mouse-all-buttons.mjs`

```javascript
{
    id: 'B18', target: 'ten_target_moi',
    desc: 'Mô tả nút mới',
    message: 'Câu user nói rõ ràng (tránh từ khoá conflict)',
    currentUrl: '/trang-chua-nut',
},
```

**Nguyên tắc viết `message` tránh NLP conflict:**
- ✅ Dùng: màu sắc ("nút màu cam"), vị trí rõ ("trong form check status")
- ❌ Tránh: "liên hệ" (→ navigate.contact), "nộp đơn/apply" (→ navigate.apply)
- ✅ Dùng: tên chính xác trên UI ("Submit Question", "Continue to Apply")

### Chạy

```bash
cd api/
node scripts/e2e-virtual-mouse-all-buttons.mjs
```

**Kết quả mong đợi:**
```
✅ PASS — VIRTUAL_CLICK target="ten_target_moi"
KẾT QUẢ: 18/18 PASS
```

**Nếu FAIL:**
- `NO ACTION` → AI không gọi tool → kiểm tra message có bị match bởi intent khác không
- `VIRTUAL_CLICK target="sai_target"` → priority rule trong tool description chưa đủ rõ
- `ERROR: HTTP 500` → API server chưa chạy hoặc tool chưa được import trong `tools/index.ts`

---

## TẦNG 2: Playwright Full Pipeline Test

**Mở Chrome thật, chat thật, verify animation thật, lưu screenshot bằng chứng.**

### Playwright hoạt động như thế nào

```
Playwright (Node.js)
      │ Chrome DevTools Protocol (CDP)
      ▼
Chrome Browser (headless)
      │ HTTP request thật
      ▼
localhost:3000 (Next.js)  →  localhost:5000 (API)  →  Gemini AI
      │
      ▼ SSE stream về browser
useChat.ts xử lý VIRTUAL_CLICK
      │
      ▼
VirtualMouseEngine mount [data-testid="virtual-cursor"] vào DOM
      │
      ▼ Playwright observe DOM qua CDP
toBeVisible() → screenshot() → waitForTimeout(1400) → not.toBeVisible()
```

Playwright **không mock gì cả** — mọi thứ đều thật như user ngồi gõ tay.

### Thêm test case

File: `ui/tests/e2e/virtual-mouse-full-flow.spec.ts`

```typescript
test("B18 — ten_target_moi: user nhắn '...' → cursor click", async ({ page }) => {
  await page.goto("/trang-chua-nut", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => !!(window as any).useAgentStore, { timeout: 10_000 });

  await assertFullFlow(page, {
    message: "Câu user nói rõ ràng — giống hệt message trong Tầng 1",
    expectedTarget: "ten_target_moi",
    screenshotId: "B18-ten-target-moi",
    // scrollToTarget: true,  // bật nếu element ở dưới fold
  });
});
```

### Chạy

```bash
cd ui/
npm run test:e2e -- virtual-mouse-full-flow
```

**Kết quả mong đợi:**
```
✓ B18 — ten_target_moi: user nhắn '...' → cursor click (12.3s)
Screenshots: tests/e2e/screenshots/full-flow/B18-ten-target-moi-cursor-moving.png
             tests/e2e/screenshots/full-flow/B18-ten-target-moi-press-animation.png
```

**6 điểm Playwright kiểm tra trong `assertFullFlow`:**

| # | Kiểm tra | Playwright call |
|---|---------|----------------|
| ① | Element tồn tại trong DOM | `toBeAttached({ timeout: 5000 })` |
| ② | Cursor xuất hiện sau AI xử lý | `toBeVisible({ timeout: 20_000 })` |
| ③ | Screenshot tại t≈cursor-moving | `page.screenshot()` ngay khi cursor visible |
| ④ | Screenshot tại t≈1100ms (press window) | `waitForTimeout(1400)` → `page.screenshot()` |
| ⑤ | Cursor biến mất sau 1350ms | `not.toBeVisible({ timeout: 2000 })` |
| ⑥ | File screenshot lưu đúng path | Verify file tồn tại sau test |

**Nếu FAIL:**
- Cursor không xuất hiện → kiểm tra API E2E Tầng 1 trước (SSE có đúng không?)
- Cursor xuất hiện nhưng không biến mất → kiểm tra cleanup trong VirtualMouseEngine
- Timeout 20s → Gemini AI slow hoặc API server chưa chạy
- Screenshot trắng → headless mode không render animation (thêm `animations: "allow"`)

---

## TẦNG 3: NLP Cache (chỉ chạy sau khi Tầng 1 + 2 đều PASS)

### 3a. Thêm vào script cache

**Nếu là button mới** → thêm vào `api/scripts/e2e-and-cache-buttons.mjs`:

```javascript
// Trong BUTTON_TESTS array:
{ id:'B18', target:'ten_target_moi',
  msg:'Câu test từ Tầng 1',
  url:'/trang-chua-nut' },

// Trong NLP_INTENTS array:
{ name:'click.ten_target_moi', payload:{ action:'VIRTUAL_CLICK', target:'ten_target_moi' },
  utterances:[
    {text:'câu rõ ràng từ test tầng 1', lang:'vi'},
    {text:'cách nói khác bằng tiếng việt', lang:'vi'},
    {text:'english version of the same intent', lang:'en'},
  ]},
```

**Nếu là trường hợp ambiguous (nhiều nút cùng tên)** → dùng `api/scripts/e2e-and-cache-ambiguous.mjs`:

```javascript
// Trong NEW_UTTERANCES:
{ intentName: 'click.ten_target_mac_dinh', utterances: [
    { text: 'câu mơ hồ không chỉ định vị trí', lang: 'vi' },
    { text: 'cách nói khác', lang: 'vi' },
    { text: 'english ambiguous variant', lang: 'en' },
]},
```

### 3b. Chạy cache script

```bash
cd api/
# Button mới:
node scripts/e2e-and-cache-buttons.mjs

# Ambiguous cases:
node scripts/e2e-and-cache-ambiguous.mjs
```

Script tự động:
1. Chạy lại tất cả E2E test (guard cuối trước khi insert)
2. Insert `NlpIntent` + `NlpUtterance` vào DB (upsert, không tạo trùng)
3. Retrain model → lưu `api/data/nlp/model-vN.json`

### 3c. Load model mới vào API (2 cách)

**Cách 1 — Hot-swap (không cần restart, ưu tiên):**

```bash
cd api/
node scripts/trigger-retrain.mjs
# Login admin → gọi POST /api/v1/admin/nlp-cache/retrain
# API hot-swap this.manager trong singleton đang chạy (~300ms)
```

**Cách 2 — Restart server (dự phòng):**

```
⚠️ Retrain hoàn tất. Bạn cần restart API server để load model mới.
   Sau khi restart xong, xác nhận để chạy verification test.
```

Chờ user gõ "ok" / "đã restart" / "done" trước khi chạy bước tiếp theo.

### 3d. Full Verification (BẮT BUỘC sau khi load model)

```bash
cd api/
node scripts/verify-nlp-full.mjs
```

**Kết quả mong đợi:** `OVERALL: 48/48 PASS`

| Suite | Mục tiêu |
|-------|---------|
| TẦNG 1 (B01–B17) | 17/17 — 100% NLP Cache |
| BIẾN THỂ (V01–V22) | 22/22 — 100% NLP Cache |
| EDGE CASES (E01–E09) | 9/9 — kết quả đúng (NLP hoặc Gemini) |

> Edge cases E05, E07 (câu hỏi lịch sự có từ "không") và E08–E09 (off-topic) **được phép dùng Gemini** — mustCache=false trong test spec. Đây là hành vi đúng.

Kiểm tra log API xác nhận hit:
```
[Intent Cache] ✅ HIT | intent=click.ten_target_moi score=1.000
```

**Nếu verify fail:** Chạy `node scripts/probe-scores.mjs` để xem điểm NLP từng phrase.

---

## CSS Animation Reference

```css
/* globals.css — PHẢI dùng !important để override Tailwind transition */

[data-ai-element].ai-cursor-hover {
    transform: scale(1.05) !important;
    filter: brightness(1.1) !important;
    box-shadow: 0 0 0 3px rgba(99,102,241,0.35), 0 4px 16px rgba(99,102,241,0.2) !important;
    transition: transform 0.15s ease-out, filter 0.15s ease-out, box-shadow 0.15s ease-out !important;
}

[data-ai-element].ai-cursor-press {
    animation: ai-button-press 0.32s cubic-bezier(0.34,1.56,0.64,1) forwards !important;
    transition: none !important;
}

@keyframes ai-button-press {
    0%   { transform: scale(1.05); }
    30%  { transform: scale(0.91); }   /* ← điểm nhấn sâu nhất */
    70%  { transform: scale(1.04); }
    100% { transform: scale(1); }
}
```

> ⚠️ **KHÔNG dùng** `animate(domElement, { scale })` của Framer Motion trên
> non-motion elements — Tailwind `transition` classes sẽ override, animation bị vô hiệu.
> **Luôn dùng CSS class approach** với `classList.add/remove`.

---

## Checklist nhanh khi thêm button mới

```
□ 0a. Thêm data-ai-element="target" vào HTML element
□ 0b. Kiểm tra vi/en/ko.json có key "tool_click_ui_element" chưa
       (grep "tool_click_ui_element" ui/src/messages/*.json)
□ 0c. Thêm target vào enum + description trong click-ui-element.tool.ts
□ 0d. Nếu tên nút trùng với nút khác → thêm priority rule vào description
□ 1.  Thêm test case vào e2e-virtual-mouse-all-buttons.mjs
□ 1.  Chạy: node scripts/e2e-virtual-mouse-all-buttons.mjs → ALL PASS
□ 2.  Thêm Playwright test vào virtual-mouse-full-flow.spec.ts
□ 2.  Chạy: npm run test:e2e -- virtual-mouse-full-flow → ALL PASS + screenshots
□ 3.  Thêm utterances vào e2e-and-cache-buttons.mjs (hoặc e2e-and-cache-ambiguous.mjs)
□ 3.  Chạy cache script → retrain hoàn tất
□ 3.  Hot-swap: node scripts/trigger-retrain.mjs (hoặc yêu cầu restart server)
□ 3.  Full verify: node scripts/verify-nlp-full.mjs → OVERALL: 48/48 PASS
       Verify log: [Intent Cache] ✅ HIT | intent=click.ten_target
```

---

## NLP Model Versions

| Version | Intents | Utterances | Nội dung |
|---------|---------|-----------|---------|
| model-v1 | 5 | ~80 | Navigation intents |
| model-v2 | 10 | ~130 | + Question intents |
| model-v3 | 22 | ~180 | + 17 click.* intents (17 buttons) |
| model-v4 | 22 | ~193 | + 13 utterances ambiguous (đăng ký ngay mặc định) |
| model-v5 | 22 | 194 | Re-verify run |
| model-v6 | 22 | ~280 | + expand-utterances.mjs (Gemini generate batch) |
| model-v7 | 22 | ~360 | + manual seed 6 intents thiếu (87 utterances) |
| model-v8 | 22 | 470 | Full retrain sau fix navigate.apply actionPayload |
| model-v9 | 22 | 470 | Retrain sau fix language detection bug |
| model-v10 | 22 | 475 | Retrain sau fix Vietnamese Unicode regex → **48/48 PASS** |

Model lưu tại: `api/data/nlp/model-vN.json`

## Nguyên Tắc Viết Utterance Cho Biến Thể

> Áp dụng khi thêm utterance mới vào NlpIntent để NLP Cache nhận ra cách diễn đạt khác nhau.

### Tại sao biến thể quan trọng?

Cùng 1 intent nhưng user nói theo nhiều cách — NLP phải nhận ra hết:
```
click.continue_to_apply:
  VI đầy đủ: "Bấm nút Continue to Apply để tiến vào form đăng ký"
  VI ngắn  : "tiếp tục đăng ký", "bấm tiếp tục"
  EN       : "click continue to apply", "proceed to apply"
```

### Quy tắc viết utterance tốt

```
✅ Đa dạng độ dài    : cực ngắn (2-3 từ) + trung bình + đầy đủ
✅ Đa dạng động từ   : bấm / nhấn / ấn / click / tap / press
✅ Đa dạng ngôn ngữ  : VI + EN (ít nhất 2-3 câu tiếng Anh mỗi intent)
✅ Biến thể vị trí   : "ở cuối trang", "trên header", "trong form..."
✅ Biến thể không có "bấm": "tiếp tục đăng ký", "gửi form khẩn cấp"

❌ Không thêm câu hỏi  : "bạn có thể bấm không?" → isQuestion Guard chặn, cache vô nghĩa
❌ Không dùng từ conflict: "apply" chung → nhầm hero_apply vs btn-apply-header vs cta_apply
❌ Không thêm câu quá mơ hồ thiếu context → score thấp < 0.95 → Gemini fallback vẫn tốt hơn
```

### Lưu ý Vietnamese Unicode (bug quan trọng)

Khi detect ngôn ngữ để classify, API dùng regex:
```typescript
/[À-ɏḀ-ỿ]/.test(text)  // Bao phủ U+00C0-U+024F + U+1E00-U+1EFF
```

Các ký tự như `ấ` (U+1EA5), `ế` (U+1EBF), `ở` (U+1EDF) **chỉ nằm trong U+1E00-U+1EFF** — nếu regex thiếu range này, câu như "bấm tiếp tục" bị nhận nhầm là tiếng Anh → NLP classify sai intent. Đây là root cause của 5 test thất bại trước khi fix.

### Sau khi thêm utterance

```bash
node scripts/trigger-retrain.mjs      # hot-swap model mới vào API
node scripts/verify-nlp-full.mjs      # phải đạt 48/48 PASS
```

Nếu phrase cụ thể vẫn fail → dùng `probe-scores.mjs` để xem top-5 score và điều chỉnh.

---

## Scripts Hỗ Trợ

| Script | Mục đích |
|--------|---------|
| `verify-nlp-full.mjs` | 48-test suite đầy đủ: TẦNG 1 + BIẾN THỂ + EDGE CASES |
| `trigger-retrain.mjs` | Hot-swap model không cần restart: login admin → POST /retrain |
| `probe-scores.mjs` | Phân tích top-5 NLP score cho phrase cụ thể |
| `check-api-model.mjs` | Kiểm tra version model đang chạy trong API |
| `e2e-and-cache-buttons.mjs` | E2E test + insert NlpIntent + retrain (17 buttons) |
| `e2e-and-cache-ambiguous.mjs` | E2E test + insert utterances (câu mơ hồ) |

---

## Files cần chạm khi thêm button mới

```
ui/src/
  components/[trang]/[Component].tsx        ← thêm data-ai-element
  messages/vi.json                          ← thêm tool_* key (nếu tool mới)
  messages/en.json                          ← thêm tool_* key
  messages/ko.json                          ← thêm tool_* key
  tests/e2e/virtual-mouse-full-flow.spec.ts ← thêm Playwright test case

api/src/services/chatbot/tools/
  click-ui-element.tool.ts                  ← thêm target vào description + enum
  index.ts                                  ← import nếu là tool file mới

api/scripts/
  e2e-virtual-mouse-all-buttons.mjs         ← thêm TESTS entry
  e2e-and-cache-buttons.mjs                 ← thêm BUTTON_TESTS + NLP_INTENTS entry
  e2e-and-cache-ambiguous.mjs               ← thêm nếu có trường hợp ambiguous
```
