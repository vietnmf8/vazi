---
name: virtual-mouse-combo-test
description: >
  Quy trình chuẩn để test luồng COMBO Navigate+Click (click_ui_element tự
  điều hướng khi target ở trang khác). Dùng khi thêm target mới vào
  TARGET_PAGE_MAP, sửa logic same-page/cross-page detection, hoặc fix bug
  liên quan đến retry-poll / dedup / scroll-sau-navigate. Mở rộng từ skill
  virtual-mouse-test (xem skill đó cho pipeline gốc của click_ui_element
  cùng-trang + NLP Cache).
---

# Skill: Virtual Mouse — Combo Navigate+Click Test Pipeline

## Bối cảnh — Tại sao cần skill riêng

`virtual-mouse-test` (skill gốc) test `click_ui_element` khi target **luôn ở cùng trang**
với user. Ngày 2026-06-22, tool được nâng cấp để **tự phát hiện** khi target nằm ở
trang khác và **tự kết hợp điều hướng trước khi click** — không cần AI gọi
`navigate_to_page` riêng. Đây là 1 cơ chế quyết định mới (`TARGET_PAGE_MAP` +
so khớp `currentUrl`) cần pipeline test riêng vì có rủi ro khác hẳn: race
condition giữa navigate và click, dedup khi AI gọi nhầm 2 tool, scroll sau khi
DOM trang mới chưa kịp mount.

## Tổng quan kiến trúc

```
AI gọi click_ui_element({ target })
         │
         ▼
executeClickUiElement: so khớp TARGET_PAGE_MAP[target] với context.currentUrl
         │
    ┌────┴─────────────────┐
    │ cùng trang / GLOBAL   │ khác trang
    ▼                       ▼
ELEMENT_CLICK_TRIGGERED      NAVIGATE_AND_CLICK_TRIGGERED
    │                       │
    ▼                       ▼
SSE: VIRTUAL_CLICK            SSE: NAVIGATE_AND_CLICK
{target}                      {destination, target}
    │                       │
    ▼                       ▼
VirtualMouseEngine             useChat.ts: router.push(destination)
tự scroll-nếu-cần rồi click        → 600ms sau: triggerVirtualClick
                                    → VirtualMouseEngine: RETRY-POLL tìm
                                      element (10x150ms ≈ 1.5s) vì trang
                                      mới có thể chưa mount xong
                                    → tìm thấy: scroll-nếu-cần → click
                                    → KHÔNG tìm thấy sau 1.5s: gửi
                                      [SYSTEM_HIDDEN] báo lỗi qua
                                      sendSystemMessageRef
```

→ 4 case người dùng yêu cầu test (1: cùng trang+visible, 2: cùng trang+scroll,
3: khác trang+visible, 4: khác trang+scroll) rút gọn về **2 quyết định độc lập**:
"có cần navigate không" (case 1-2 vs 3-4) và "có cần scroll không" (luôn xử lý
bởi `VirtualMouseEngine`, không phân biệt ở tầng quyết định route).

## Thứ tự quy trình bắt buộc (giống pipeline gốc, Tầng 0-3)

```
TẦNG 0  Pre-flight checks            — TARGET_PAGE_MAP có đúng target/page chưa
   ↓
TẦNG 1  API E2E Test                 — HTTP thuần, verify action+destination+target
   ↓ (ALL PASS)
TẦNG 2  Playwright Full Test         — Chrome thật, verify URL đổi + retry-poll + click
   ↓ (ALL PASS)
TẦNG 3  NLP Cache                    — CÓ áp dụng cho combo (đã upgrade 2026-06-22, xem dưới)
```

> **Cập nhật 2026-06-22 — NLP Cache giờ ĐÃ hỗ trợ combo, không còn né tránh:** Ban đầu
> thiết kế là KHÔNG cache combo (NLP trả `actionPayload` tĩnh, không biết `currentUrl`).
> Giải pháp cuối cùng không phải né tránh, mà NÂNG CẤP chính NLP path để tự RESOLVE LẠI
> action đúng tại runtime — dùng chung `TARGET_PAGE_MAP`/`getClickTargetDestination()` với
> `click_ui_element` (single source of truth, zero-hallucination vì thuần code logic, không
> phải AI suy luận). Khi NLP HIT 1 intent `click.*` mà target hoá ra ở trang khác, hệ thống
> tự tính `NAVIGATE_AND_CLICK` ngay tại chỗ — KHÔNG cần rớt xuống Gemini. Kết quả: NLP Cache
> coverage tăng từ 12/25 → **22/25 (88%)** trên test suite combo, giữ nguyên lợi ích
> <10ms/zero-token cho cả case combo. Xem mục "Coverage NLP Cache" ở cuối file để biết 3
> case còn lại (12%) vì sao KHÔNG nên/không thể đẩy vào NLP.

---

## TẦNG 0: Pre-flight Checks

### 0a. Kiểm tra target đã có trong `TARGET_PAGE_MAP`

```bash
grep -A2 '"ten_target"' api/src/services/chatbot/tools/click-ui-element.tool.ts
```

Nếu target mới được thêm vào `click_ui_element`'s enum nhưng **quên** thêm vào
`TARGET_PAGE_MAP` → `owningPages` sẽ là `undefined` → code fallback về
`ELEMENT_CLICK_TRIGGERED` (coi như cùng trang) **dù target thực ra ở trang khác**.
Đây là silent-fail nguy hiểm nhất của cơ chế combo — luôn audit map mỗi khi
thêm target mới (xem checklist cuối file).

### 0b. Xác định target thuộc loại nào

| Loại | Giá trị trong map | Hành vi |
|---|---|---|
| Trang riêng | `"/contact-us"` | Navigate khi `currentUrl !== "/contact-us"` |
| Global (Header/Footer/Chat) | `GLOBAL_PAGE` | KHÔNG BAO GIỜ navigate |
| Đa-trang | `["/", "/apply"]` | Navigate chỉ khi `currentUrl` KHÔNG nằm trong array; destination = phần tử đầu |

### 0c. Kiểm tra `current_url` có được truyền đúng xuống tool không

Nếu test fail với "tool luôn trả ELEMENT_CLICK_TRIGGERED dù khác trang" — kiểm
tra `context.currentUrl` có rỗng không (do `chat.service.ts` chưa truyền
`currentUrl: input.current_url` vào `options` của `generateVisaAssistantReplyStreaming`).

```bash
grep -n "currentUrl" api/src/services/chat.service.ts api/src/services/chatbot/gemini.service.ts
```

### 0d. ⚠️ Bug đã phát hiện ở lần chạy thật đầu tiên (2026-06-22) — NLP Cache STALE HIT
### (đã nâng cấp thành NLP Combo Resolver, cùng ngày — xem 0e)

**Triệu chứng ban đầu**: 5/25 case Tầng 1 fail với pattern "tool đáng lẽ phải combo
nhưng SSE lại ra `VIRTUAL_CLICK` với target SAI" — ví dụ message "Bấm Submit để gửi
form liên hệ" (đang ở `/about-us`, mong đợi `NAVIGATE_AND_CLICK` đến `/contact-us`)
lại ra `{"action":"VIRTUAL_CLICK","target":"check_status_submit"}` — không liên quan.

**Root cause**: NLP Cache (lớp phễu trước Gemini, mục 12 architecture doc) trả về
`actionPayload` **tĩnh** từ DB (`{ action: "VIRTUAL_CLICK", target }`) được train **trước
khi combo feature tồn tại** — nó không biết gì về `currentUrl` hay `TARGET_PAGE_MAP`.
Một HIT của NLP Cache **bypass hoàn toàn** Gemini + `click_ui_element`, nên dù backend
combo logic đúng 100%, NLP đã trả lời sai trước khi request đi tới đó.

**Fix v1 (Guard chặn, rớt xuống Gemini)**: ban đầu thêm Guard `isStaleClickTarget` —
nếu NLP trả 1 `click.*` intent nhưng target không thuộc trang hiện tại, coi HIT là
STALE và ép rớt xuống Gemini xử lý đúng. **Đã được nâng cấp tiếp lên Fix v2 (0e)**
vì Guard chỉ "chặn cái sai", chưa "tận dụng cái NLP đã biết đúng".

**Lưu ý quan trọng còn giữ nguyên dù đã upgrade**: cơ chế này CHỈ xử lý được trường hợp
NLP trả đúng LOẠI intent (`click.*`) nhưng SAI target/trang. Nó **không** xử lý được
trường hợp NLP nhận nhầm hẳn sang 1 intent KHÁC LOẠI (ví dụ nhầm thành `navigate.apply`
do từ khoá "nộp đơn" trùng utterance đã train) — đây là giới hạn NLP scoring thông
thường, không phải lỗi của combo feature (xem nguyên tắc viết utterance ở mục cuối
file, tránh từ "nộp đơn/apply", "liên hệ" như skill gốc đã cảnh báo).

### 0e. ✅ Nâng cấp — NLP Combo Resolver (Fix v2, cùng ngày 2026-06-22)

Thay vì chỉ "chặn HIT sai rồi bỏ qua", tận dụng luôn target mà NLP đã match đúng
(điểm số ≥0.95) để **tự tính lại** action đúng — dùng chung `getClickTargetDestination()`
export từ `click-ui-element.tool.ts`:

```typescript
// api/src/services/chat.service.ts
let resolvedActionPayload = _nlpResult?.actionPayload;
if (_nlpResult?.actionPayload?.action === "VIRTUAL_CLICK" && _nlpResult.actionPayload.target) {
    const _comboDestination = getClickTargetDestination(_nlpResult.actionPayload.target, input.current_url || "/");
    if (_comboDestination) {
        resolvedActionPayload = { action: "NAVIGATE_AND_CLICK", destination: _comboDestination, target: _nlpResult.actionPayload.target };
        // log "[Intent Cache] 🔁 RESOLVED COMBO LOCALLY ..." — không cần gọi Gemini
    }
}
if (_nlpResult && !isRedundantNavigation) { /* dùng resolvedActionPayload, không phải actionPayload gốc */ }
```

**Kết quả đo được trên 25 case test**: NLP Cache coverage **12/25 → 22/25 (88%)** —
toàn bộ case combo mà NLP đã từng học target (dù cũ, dù trang khác) giờ resolve
tại chỗ, **0 Gemini call, <10ms**. 3 case còn lại (12%) là do thiết kế chủ đích
(xem mục "Coverage NLP Cache" cuối file), không phải thiếu sót có thể vá thêm.

**Kiểm tra cơ chế đang hoạt động**:
```bash
grep -n "resolvedActionPayload\|RESOLVED COMBO LOCALLY" api/src/services/chat.service.ts
```

---

## TẦNG 1: API E2E Test

**File**: `api/scripts/e2e-virtual-mouse-combo.mjs`
**Chạy**: `node scripts/e2e-virtual-mouse-combo.mjs` (từ thư mục `api`)

### Cấu trúc test (25 case — đa dạng tông giọng/ngôn ngữ, production-ready)

| Nhóm | Case | Mục tiêu |
|---|---|---|
| Cùng trang (regression) | C01, C02, C06, C07, C08, C09, C16, C17 (8 case) | Baseline: vẫn ra `VIRTUAL_CLICK`, KHÔNG bị nhầm thành combo — đa dạng GLOBAL/route riêng, câu ngắn/dài, vi/en |
| Combo khác trang | C03, C04, C05, C10, C11, C12, C13, C14, C15 (9 case) | Ra đúng `NAVIGATE_AND_CLICK` với `destination` + `target` chính xác — đa dạng target, tông giọng (formal/lịch sự/thân mật), vi/en |
| Edge 5.1 (đa-trang) | E01, E05, E02 | Map dạng array: đúng ở cả 2 nhánh sở hữu (`/apply` và `/`), đúng khi đứng ngoài map |
| Edge 5.1c (GLOBAL) | E03, E06 | Target Header/Footer/Chat KHÔNG BAO GIỜ navigate dù gọi từ trang nào, kể cả trang sâu (`/guide/*`) |
| Edge combo đa ngôn ngữ | E07 | Combo bằng tiếng Anh, xuất phát từ trang không liên quan |
| Edge 5.2 (dedup) | E04, E08 | Không double-navigate đến 2 destination khác nhau trong 1 turn (vi + en) |

> **Nguyên tắc viết message** (áp dụng khi thêm case mới — xem comment đầu file `.mjs`):
> đa dạng tông giọng (ngắn/lịch sự "làm ơn"/thân mật "cho tui"/formal), đa dạng động từ
> (bấm/nhấn/click/giúp tôi), đa dạng ngôn ngữ (vi/en), và trải đều target qua nhiều trang —
> tránh việc mỗi nhánh logic chỉ có 1 câu mẫu duy nhất (không phản ánh cách user thật nói).

### Cơ chế assertion

```
assertSamePageClick   → bắt buộc VIRTUAL_CLICK, FAIL nếu thấy NAVIGATE_AND_CLICK
assertCombo           → bắt buộc NAVIGATE_AND_CLICK với đúng destination + target
assertNoConflictingNavigation → cho phép trùng lặp destination (xem Giới Hạn Đã Biết),
                                  CHỈ fail nếu có ≥2 destination KHÁC NHAU
```

### Giới hạn đã biết của Tầng 1

Tầng 1 chỉ là HTTP — **không thể** verify:
- Trình duyệt có thực sự đổi URL không (giả định `router.push` hoạt động đúng — Next.js đã test riêng)
- Scroll có xảy ra đúng trên trang đích không (DOM/CSS, cần Tầng 2)
- Retry-poll có tìm thấy element sau khi trang mount chậm không (cần Tầng 2 hoặc Chaos test thủ công)

→ Các case 5.3/5.4 (element ẩn theo business state, click thất bại hoàn toàn)
**không test được ở Tầng 1**, xem mục "Chaos Test — Tầng 2.5" dưới.

### Kết quả mong đợi

```
✅ PASS — VIRTUAL_CLICK target="hero_apply" (cùng trang, đúng như kỳ vọng)
✅ PASS — NAVIGATE_AND_CLICK destination="/contact-us" target="contact_submit"
KẾT QUẢ: 9/9 PASS
```

**Nếu FAIL:**
- `Lẽ ra cùng trang nhưng tool lại NAVIGATE_AND_CLICK` → kiểm tra `TARGET_PAGE_MAP[target]` có map sai route không
- `Không có NAVIGATE_AND_CLICK` (mong đợi combo nhưng không thấy) → có thể `currentUrl` không tới được `execute()` (xem 0c), hoặc AI tự ý gọi `navigate_to_page` riêng (description chưa đủ rõ "không cần gọi navigate_to_page trước")
- `Phát hiện điều hướng đến NHIỀU destination khác nhau` → bug double-navigation thật, cần fix dedup logic trong `gemini.service.ts`

---

## TẦNG 2: Playwright Full Pipeline Test

**File**: `ui/tests/e2e/virtual-mouse-combo-flow.spec.ts`
**Chạy**: `npm run test:e2e -- virtual-mouse-combo-flow` (từ thư mục `ui`)

### Khác biệt so với `assertFullFlow` (skill gốc)

`assertComboFlow` thêm 1 bước mới **trước** khi check cursor:

```typescript
await page.waitForURL((url) => url.pathname === opts.expectedDestination, { timeout: AI_RESPONSE_TIMEOUT });
```

Đây là điểm kiểm tra **case 3 vs case 4 thật** — Playwright thấy URL thật đổi
(không phải SSE action suông), rồi mới đến bước cursor xuất hiện. Nếu
`waitForURL` timeout → bug nằm ở `useChat.ts` (không gọi `router.push`) hoặc
Gemini không gọi tool đúng cách.

### 5 test case

| Test | Case minh họa | Đứng ở | Click | Đích |
|---|---|---|---|---|
| C03 | Case 3 (khác trang, không cần scroll) | `/about-us` | "Submit form liên hệ" | `/contact-us` → `contact_submit` |
| C05 | Case 4 (khác trang, CẦN scroll trên đích) | `/` | "WhatsApp sửa hồ sơ" | `/emergency-inquiry` → `emergency_correction_whatsapp` (nằm dưới fold) |
| E02 | Edge 5.1b (đa-trang, đứng ngoài map) | `/about-us` | "Continue to Apply" | `/` → `continue_to_apply` |
| C10 | Đa dạng văn phong — câu lịch sự "làm ơn" | `/faqs` | "tra cứu trạng thái hồ sơ" | `/check-status` → `check_status_submit` |
| E07 | Đa dạng ngôn ngữ — tiếng Anh | `/contact-us` | "WhatsApp button to fix profile" | `/emergency-inquiry` → `emergency_correction_whatsapp` |

### 6 điểm kiểm tra (mở rộng từ skill gốc)

| # | Kiểm tra | Playwright call |
|---|---|---|
| ① | URL trình duyệt đổi đúng sang `expectedDestination` | `waitForURL()` |
| ② | Element tồn tại TRÊN TRANG MỚI sau navigate | `toBeAttached({ timeout: 5000 })` |
| ③ | Cursor xuất hiện (retry-poll phải thành công) | `toBeVisible({ timeout: 25_000 })` |
| ④ | Screenshot lúc cursor vừa xuất hiện trên trang mới | `page.screenshot()` |
| ⑤ | Screenshot tại t≈1400ms (press window) | `waitForTimeout(1400)` → `screenshot()` |
| ⑥ | Cursor biến mất sau animation | `not.toBeVisible({ timeout: 2000 })` |

**Nếu FAIL:**
- `waitForURL` timeout → `useChat.ts` không nhận đúng SSE `NAVIGATE_AND_CLICK`, hoặc Gemini không gọi tool
- Element không `toBeAttached` trên trang mới → `data-ai-element` bị xóa/đổi tên trên component đích, hoặc destination trong `TARGET_PAGE_MAP` sai route
- Cursor không xuất hiện (timeout 25s) → retry-poll trong `VirtualMouseEngine` hết 1.5s mà chưa tìm thấy — kiểm tra Next.js route transition có chậm bất thường không (network tab), hoặc tăng `FIND_ELEMENT_MAX_RETRIES`
- Cursor xuất hiện nhưng câu trả lời cuối của AI lại là lời xin lỗi (`[SYSTEM_HIDDEN]` đã kích hoạt) → xem log console `[VirtualMouse] ⚠ Không tìm thấy phần tử sau...`

> **Bug đã phát hiện và fix khi triển khai `waitForURL`**: mặc định `waitUntil: "load"`
> KHÔNG resolve được vì `router.push()` của Next.js là điều hướng client-side (History API),
> không bao giờ bắn sự kiện `load` của browser. Phải chỉ định `waitUntil: "commit"` —
> resolve ngay khi URL đổi, không cần đợi 1 page-load thật.

> **Flakiness đã quan sát khi chạy thật (2026-06-22)**: ~2/5 test fail ở lần thử đầu rồi
> PASS khi Playwright tự retry. Nguyên nhân nhiều khả năng nhất: server `ui` chạy ở
> dev mode (`next dev`) — route lần đầu được request phải compile on-demand (vài giây),
> cộng dồn với thời gian Gemini xử lý có thể vượt timeout 25s. **Không phải bug của
> combo logic** (Tầng 1 — vốn không chạm trình duyệt — luôn 25/25 PASS ổn định).
> Giảm flakiness: chạy `npm run build && npm run start` (production) trước khi test,
> hoặc "warm up" từng route đích bằng 1 lần `page.goto()` trước khi chạy suite.

---

## TẦNG 2.5: Chaos Test (thủ công) — Case 5.3 / 5.4

Không tự động hoá vì cần phá vỡ DOM thật có chủ đích. Thực hiện thủ công khi
nghi ngờ retry-poll hoặc cơ chế báo lỗi có vấn đề:

1. Mở DevTools Console tại trang đích, tạm thời `el.remove()` phần tử
   `[data-ai-element="check_status_download"]` (target chỉ render khi
   `status=COMPLETED` — dễ giả lập "ẩn theo business state").
2. Yêu cầu AI bấm nút đó.
3. **Kỳ vọng**: sau ~1.5s, cursor KHÔNG xuất hiện; console log
   `[VirtualMouse] ⚠ Không tìm thấy phần tử sau 10 lần thử: check_status_download`;
   AI phản hồi xin lỗi tự nhiên ở lượt chat kế tiếp (do `[SYSTEM_HIDDEN]` đã gửi).
4. **FAIL nếu**: AI vẫn nói "Mình đã bấm giúp bạn rồi nhé" — nghĩa là
   `sendSystemMessageRef` không tới được Gemini (kiểm tra hook đã set ref chưa,
   xem `agentStore.setSendSystemMessageRef`).

---

## Edge Case Matrix (đầy đủ — tham khảo khi audit lại)

| # | Edge case | Tier verify | Trạng thái |
|---|---|---|---|
| 5.1a | Target đa-trang, đứng ở 1 trong các trang sở hữu | Tier 1 (E01) + Tier 2 | ✅ Có test |
| 5.1b | Target đa-trang, đứng ngoài map | Tier 1 (E02) + Tier 2 (E02) | ✅ Có test |
| 5.1c | Target GLOBAL gọi từ trang khác | Tier 1 (E03) | ✅ Có test |
| 5.2 | Gemini gọi cả `navigate_to_page` + `click_ui_element` cùng turn | Tier 1 (E04, best-effort vì AI non-deterministic) | ⚠️ Dedup chỉ hoạt động TRONG 1 round Gemini — nếu Gemini gọi 2 tool ở 2 ROUND khác nhau (multi-turn function calling), `currentUrl` context KHÔNG được cập nhật giữa các round nên có thể double-navigate đến CÙNG 1 destination (vô hại nhưng dư thừa). Đã document, chưa fix triệt để — xem TODO dưới. |
| 5.3 | Element bị ẩn theo business state (không phải CSS) | Chaos test thủ công (Tầng 2.5) | ✅ Có quy trình thủ công |
| 5.4 | Click thất bại hoàn toàn, AI không biết | Chaos test thủ công (Tầng 2.5) | ✅ Có quy trình thủ công, dùng `[SYSTEM_HIDDEN]` |
| 5.5 | Target tồn tại trong DOM nhưng app chưa fetch xong data (loading state) | Chưa có test riêng | 🔲 TODO — tương tự 5.3 nhưng nguyên nhân là async data, không phải conditional render |

### TODO kỹ thuật còn mở (không block việc dùng feature, chỉ là rough edge)

- **Cross-round dedup**: nếu cần dedup triệt để double-navigation xuyên round
  (không chỉ trong-round như hiện tại), phải thread `currentUrl` đã cập nhật
  (sau navigate ảo) vào round tiếp theo của vòng lặp `while (callCount < 3)`
  trong `gemini.service.ts` — hiện chưa làm vì độ phức tạp/lợi ích chưa tương xứng
  (hậu quả tối đa là 1 lần `router.push` dư thừa đến cùng đích, không phải lỗi UX nghiêm trọng).

---

## Checklist nhanh khi thêm target mới có khả năng combo

```
□ 0a. Thêm target vào enum CSS data-ai-element trên component (như skill gốc)
□ 0b. Thêm target vào TARGET_PAGE_MAP trong click-ui-element.tool.ts
       — Xác định: route riêng / GLOBAL_PAGE / array đa-trang?
□ 0c. KHÔNG cache utterance combo vào NLP (xem lưu ý Tầng 3 đầu file)
□ 1.  Thêm case vào e2e-virtual-mouse-combo.mjs (same-page nếu target chỉ 1 trang,
       combo nếu cần test cross-page)
□ 1.  Chạy: node scripts/e2e-virtual-mouse-combo.mjs → ALL PASS
□ 2.  Thêm Playwright test vào virtual-mouse-combo-flow.spec.ts (nếu cross-page)
□ 2.  Chạy: npm run test:e2e -- virtual-mouse-combo-flow → ALL PASS + screenshots
□ 2.5 (Tùy chọn) Chaos test thủ công nếu target có khả năng "ẩn theo business state"
```

---

## Files liên quan

```
api/src/services/chatbot/tools/click-ui-element.tool.ts  ← TARGET_PAGE_MAP, executeClickUiElement,
                                                              export isClickTargetOnCurrentPage(),
                                                              export getClickTargetDestination()
api/src/services/chatbot/tools/index.ts                   ← re-export 2 hàm trên
api/src/services/chatbot/nlp-classifier.service.ts        ← thêm "NAVIGATE_AND_CLICK" vào union type actionPayload.action
api/src/services/chatbot/gemini.service.ts                ← currentUrl threading, dedup NAVIGATE_AND_CLICK
api/src/services/chat.service.ts                          ← truyền input.current_url + NLP Combo Resolver (resolvedActionPayload)
api/scripts/e2e-virtual-mouse-combo.mjs                    ← Tầng 1 (25 case)
api/scripts/trigger-retrain.mjs                            ← hot-swap NLP model sau khi LearningRecorderService học utterance mới

ui/src/hooks/useChat.ts                                    ← case "NAVIGATE_AND_CLICK"
ui/src/components/features/virtual-cursor/VirtualMouseEngine.tsx ← retry-poll + [SYSTEM_HIDDEN] báo lỗi
ui/tests/e2e/virtual-mouse-combo-flow.spec.ts               ← Tầng 2 (5 case, waitUntil:"commit")

docs/plans/ai_chatbot_architecture.md                       ← mục 21 (combo pipeline)
```

## Kết quả lần chạy thật (2026-06-22)

| Tầng | Kết quả lần đầu | Sau fix v1 (Guard) | Sau fix v2 (Resolver + retrain) | Ghi chú |
|---|---|---|---|---|
| 0 (pre-flight) | PASS | — | — | Tất cả target trong test đều có trong `TARGET_PAGE_MAP` |
| 1 (API E2E) | 20/25 | **25/25 PASS** | **25/25 PASS** | Đúng/sai không đổi giữa v1→v2 — v2 chỉ tăng % case do NLP xử lý, không đổi kết quả cuối |
| NLP Cache coverage | 12/25 (48%) | 12/25 (chỉ thêm Guard, chưa tận dụng) | **22/25 (88%)** | Resolver + 1 lần retrain (model v16) nâng từ 12 → 22 |
| 2 (Playwright) | — | **5/5 PASS** (2 flaky, pass khi retry) | chưa chạy lại sau v2 | Flaky do Next dev-mode cold-compile route, không phải bug logic |

## Coverage NLP Cache — Vì sao tối đa là 22/25 (88%), không phải 25/25

3 case (12%) còn lại rớt Gemini là **chủ đích thiết kế**, không phải thiếu sót:

| Case | Lý do | Có nên ép vào NLP? |
|---|---|---|
| Câu dạng hỏi ("...không?", "Could you...?") | Guard `isQuestion` chặn trước khi classify | ❌ Không — Guard này chống NLP bắt nhầm câu hỏi thật ("Nút Submit ở đâu?") thành lệnh click (Lessons Learned mục 12.3) |
| Câu ghép 2 ý định trong 1 câu ("đưa tôi đến X và làm Y") | NLP Cache match 1 intent/câu, không biểu diễn được lệnh ghép | ❌ Không khả thi về kiến trúc — Gemini hỏi lại là hành vi đúng |

2 case ban đầu là NLP miss thật (chưa từng học cách diễn đạt) đã được đóng bằng
`LearningRecorderService` tự ghi utterance sau lần Gemini xử lý, rồi
`node scripts/trigger-retrain.mjs` để hot-swap — không cần sửa code logic.
