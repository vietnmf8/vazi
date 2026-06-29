# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: virtual-mouse-showcase-demo.spec.ts >> Showcase Demo — Entry Gate (NLP Cache) → Step 1 Sequencing (Gemini) >> Full chain: trigger phrase → NLP Cache mở modal → chọn 'hồ sơ mới' → NLP Cache vào /apply → dẫn dắt 6 field qua Gemini
- Location: tests\e2e\virtual-mouse-showcase-demo.spec.ts:124:7

# Error details

```
Error: Không bấm được chip sau 30000ms: "E-Visa · 30 Days Single Entry"
```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e2]:
    - generic [ref=e4]:
      - generic [ref=e5]:
        - generic [ref=e6]:
          - combobox "New York (GMT-5)" [ref=e7]
          - img
        - generic [ref=e8]: Jun 24, 21:55 (GMT-5)
      - generic [ref=e9]:
        - 'link "WhatsApp (24/7): +84.96.5800.392" [ref=e10]':
          - /url: https://wa.me/84965800392
          - img [ref=e11]
          - text: "WhatsApp (24/7): +84.96.5800.392"
        - generic [ref=e13]: "|"
        - link "thanhdatvietnamvisa@gmail.com" [ref=e14]:
          - /url: mailto:thanhdatvietnamvisa@gmail.com
          - img [ref=e15]
          - text: thanhdatvietnamvisa@gmail.com
    - banner [ref=e18]:
      - generic [ref=e19]:
        - link "VietnamEVisa — Home" [ref=e20]:
          - /url: /
          - img "VietnamEVisa Logo" [ref=e22]
        - navigation "Main navigation" [ref=e23]:
          - link "How to Apply" [ref=e24]:
            - /url: /how-to-apply
          - link "Visa Fees" [ref=e25]:
            - /url: /guide/vietnam-visa-fees
          - link "FAQs" [ref=e26]:
            - /url: /faqs
          - link "About Us" [ref=e27]:
            - /url: /about-us
          - link "Emergency" [ref=e28]:
            - /url: /emergency-inquiry
          - link "Guide" [ref=e30]:
            - /url: /guide
        - generic [ref=e31]:
          - button "Change language — currently United States" [ref=e32]:
            - generic [ref=e33]: US
          - button "Toggle theme" [ref=e34]:
            - img [ref=e36]
          - link "Check Status" [ref=e42]:
            - /url: /check-status
          - button "Apply Now" [ref=e43]
  - main [ref=e44]:
    - navigation "Application progress" [ref=e46]:
      - list [ref=e47]:
        - listitem [ref=e48]:
          - generic [ref=e49]: "1"
          - generic [ref=e50]: Visa Options
        - listitem [ref=e51]:
          - generic [ref=e53]: "2"
          - generic [ref=e54]: Applicant Details
        - listitem [ref=e55]:
          - generic [ref=e57]: "3"
          - generic [ref=e58]: Review & Pay
    - generic [ref=e60]:
      - generic [ref=e62]:
        - generic [ref=e63]:
          - heading "Visa Options" [level=2] [ref=e64]
          - paragraph [ref=e65]: Select the type of visa you need and your travel details.
        - generic [ref=e67]:
          - generic [ref=e68]:
            - generic [ref=e69]: Visa Type
            - combobox [active] [ref=e70]:
              - generic [ref=e71]:
                - generic: E-Visa — All border crossings
              - img [ref=e72]
            - combobox [ref=e74]
            - generic [ref=e76]:
              - img [ref=e77]
              - generic [ref=e80]: Visa type confirmed
          - generic [ref=e81]:
            - generic [ref=e82]: Visa Category
            - combobox [ref=e83]:
              - generic [ref=e84]:
                - generic:
                  - generic: E-Visa · 30 Days Single Entry — $55/person
              - img [ref=e85]
            - combobox [ref=e87]
            - generic [ref=e89]:
              - img [ref=e90]
              - generic [ref=e93]: Visa category confirmed
          - generic [ref=e94]:
            - generic [ref=e95]: Number of Applicants
            - combobox [ref=e96]:
              - generic [ref=e97]:
                - generic:
                  - generic: 1 Person
              - img [ref=e98]
            - combobox [ref=e100]
            - generic [ref=e102]:
              - img [ref=e103]
              - generic [ref=e106]: Number of applicants confirmed
          - generic [ref=e107]:
            - generic [ref=e108]:
              - text: Arrival Date
              - generic [ref=e109]: "*"
            - button "Arrival Date" [ref=e110]:
              - img [ref=e111]
              - text: Select arrival date
          - generic [ref=e113]:
            - generic [ref=e114]:
              - text: Port of Entry
              - generic [ref=e115]: "*"
            - combobox [ref=e116]:
              - generic [ref=e117]:
                - generic: Select airport / border gate
              - img [ref=e118]
            - combobox [ref=e120]
          - generic [ref=e121]:
            - generic [ref=e122]:
              - text: Purpose of Visit
              - generic [ref=e123]: "*"
            - combobox [ref=e124]:
              - generic [ref=e125]:
                - generic: Select purpose
              - img [ref=e126]
            - combobox [ref=e128]
        - generic [ref=e129]:
          - generic [ref=e130]:
            - heading "Processing Time" [level=3] [ref=e131]
            - paragraph [ref=e132]: Surcharge is added per person on top of the base service fee.
          - radiogroup "Processing time" [ref=e133]:
            - radio "Normal · 7 Working Days Standard processing — included in base fee Included" [checked] [ref=e135]:
              - generic [ref=e138]:
                - generic [ref=e140]: Normal · 7 Working Days
                - paragraph [ref=e141]: Standard processing — included in base fee
              - generic [ref=e142]: Included
            - radio "Urgent · 4 Working Days Popular Faster processing Surcharge varies by visa duration +$35 ~ $45" [ref=e144]:
              - generic [ref=e147]:
                - generic [ref=e148]:
                  - generic [ref=e149]: Urgent · 4 Working Days
                  - generic [ref=e150]: Popular
                - paragraph [ref=e151]: Faster processing
                - paragraph [ref=e152]: Surcharge varies by visa duration
              - generic [ref=e153]: +$35 ~ $45
            - radio "Urgent · 2 Working Days Priority queue Surcharge varies by visa duration +$65 ~ $75" [ref=e155]:
              - generic [ref=e158]:
                - generic [ref=e160]: Urgent · 2 Working Days
                - paragraph [ref=e161]: Priority queue
                - paragraph [ref=e162]: Surcharge varies by visa duration
              - generic [ref=e163]: +$65 ~ $75
            - radio "Urgent · 1 Working Day Next-day processing +$125" [ref=e165]:
              - generic [ref=e168]:
                - generic [ref=e170]: Urgent · 1 Working Day
                - paragraph [ref=e171]: Next-day processing
              - generic [ref=e172]: +$125
            - radio "Urgent · 4 Working Hours Review Required Same-day processing Manual eligibility check required before confirming +$125" [ref=e174]:
              - generic [ref=e177]:
                - generic [ref=e178]:
                  - generic [ref=e179]: Urgent · 4 Working Hours
                  - generic [ref=e180]: Review Required
                - paragraph [ref=e181]: Same-day processing
                - paragraph [ref=e182]: Manual eligibility check required before confirming
              - generic [ref=e183]: +$125
            - radio "Urgent · 2 Working Hours Review Required Emergency processing Manual eligibility check required before confirming +$195" [ref=e185]:
              - generic [ref=e188]:
                - generic [ref=e189]:
                  - generic [ref=e190]: Urgent · 2 Working Hours
                  - generic [ref=e191]: Review Required
                - paragraph [ref=e192]: Emergency processing
                - paragraph [ref=e193]: Manual eligibility check required before confirming
              - generic [ref=e194]: +$195
            - radio "Last Minute / Holiday Outside business hours or public holidays +$295" [ref=e196]:
              - generic [ref=e199]:
                - generic [ref=e201]: Last Minute / Holiday
                - paragraph [ref=e202]: Outside business hours or public holidays
              - generic [ref=e203]: +$295
      - complementary [ref=e204]:
        - generic [ref=e206]:
          - heading "Order Summary" [level=3] [ref=e208]
          - generic [ref=e209]:
            - generic [ref=e210]:
              - paragraph [ref=e211]: Selected
              - paragraph [ref=e212]: E-Visa · 30 Days Single Entry
            - generic [ref=e213]:
              - generic [ref=e214]:
                - generic [ref=e215]: Base Service Fee
                - generic [ref=e216]: $55.00
              - generic [ref=e217]:
                - generic [ref=e218]: Processing
                - generic [ref=e219]: Included
              - generic [ref=e220]:
                - generic [ref=e221]: Applicants
                - generic [ref=e222]: × 1 person
          - generic [ref=e224]:
            - generic [ref=e225]: Total
            - generic [ref=e227]:
              - generic: $55
              - generic [ref=e228]: $55
          - 'button "Next: Application Details" [ref=e230]'
  - generic "Live chat widget" [ref=e231]:
    - dialog "Live chat support" [ref=e233]:
      - banner [ref=e234]:
        - generic [ref=e235]:
          - generic [ref=e236]:
            - img [ref=e237]
            - heading "Kimi" [level=2] [ref=e239]
          - paragraph [ref=e240]: AI assistant · Vietnam e-Visa support
        - generic [ref=e241]:
          - button "Search messages" [ref=e242]:
            - img [ref=e243]
          - button "New conversation" [ref=e246]:
            - img [ref=e247]
          - button "Minimize" [ref=e248]:
            - img [ref=e249]
          - button "Close chat" [ref=e250]:
            - img [ref=e251]
      - log [ref=e255]:
        - article "Message from AI Assistant" [ref=e261]:
          - generic [ref=e262]: AI Assistant
          - generic [ref=e263]:
            - paragraph [ref=e267]: Selecting your visa type...
            - generic [ref=e268]:
              - button "React to message" [ref=e269]:
                - img [ref=e270]
              - button "Reply to message" [ref=e273]:
                - img [ref=e274]
          - generic [ref=e280]: 09:55 AM
        - article "Message from You" [ref=e285]:
          - generic [ref=e286]:
            - generic [ref=e287]:
              - button "React to message" [ref=e288]:
                - img [ref=e289]
              - button "Reply to message" [ref=e292]:
                - img [ref=e293]
            - paragraph [ref=e298]: E-Visa — All border crossings
          - generic [ref=e301]:
            - generic [ref=e302]: 09:55 AM
            - img "Seen" [ref=e303]
        - article "Message from AI Assistant" [ref=e310]:
          - generic [ref=e311]:
            - paragraph [ref=e315]: I've opened the application form for you! Which visa type would you like to apply for?
            - generic [ref=e316]:
              - button "React to message" [ref=e317]:
                - img [ref=e318]
              - button "Reply to message" [ref=e321]:
                - img [ref=e322]
          - generic [ref=e328]: 09:55 AM
        - article "Message from AI Assistant" [ref=e333]:
          - generic [ref=e334]: AI Assistant
          - generic [ref=e335]:
            - paragraph [ref=e339]: Opening the application form for you...
            - generic [ref=e340]:
              - button "React to message" [ref=e341]:
                - img [ref=e342]
              - button "Reply to message" [ref=e345]:
                - img [ref=e346]
          - generic [ref=e351]: 09:55 AM
        - article "Message from You" [ref=e356]:
          - generic [ref=e357]:
            - generic [ref=e358]:
              - button "React to message" [ref=e359]:
                - img [ref=e360]
              - button "Reply to message" [ref=e363]:
                - img [ref=e364]
            - paragraph [ref=e369]: I want to fill out the visa application
          - generic [ref=e372]:
            - generic [ref=e373]: 09:55 AM
            - img "Seen" [ref=e374]
      - generic [ref=e410]:
        - generic [ref=e411]:
          - generic [ref=e412]:
            - textbox "Type your message…" [ref=e413]
            - generic: Type your message…
          - generic [ref=e414]:
            - generic [ref=e415]:
              - button "Attach document file hidden input" [ref=e416]
              - button "Attach image hidden input" [ref=e417]
              - button "Attach image" [ref=e418]:
                - img [ref=e419]
              - button "Attach document file" [ref=e423]:
                - img [ref=e424]
              - button "Pick emoji" [ref=e426]:
                - img [ref=e427]
            - generic [ref=e430]:
              - button "Switch between AI and Human mode" [ref=e431]:
                - img [ref=e433]
              - button "Send thumbs up" [ref=e437]:
                - img [ref=e438]
        - paragraph [ref=e440]: Enter to send · Shift+Enter new line
    - button "Close live chat" [expanded] [ref=e442]:
      - img [ref=e443]
  - button "Open Next.js Dev Tools" [ref=e450] [cursor=pointer]:
    - img [ref=e451]
  - alert [ref=e454]: Apply for Vietnam E-Visa | FASTVISA | FastVisa
  - generic:
    - generic:
      - generic:
        - img
```

# Test source

```ts
  14  |  *           hỏi visa_type kèm suggestion chip lấy từ schema form (KHÔNG qua NLP Cache, có chủ đích)
  15  |  *   Turn 4-9: BẤM CHIP cho từng field (visa_type → visa_category → port_of_entry →
  16  |  *           purpose_of_visit → applicant_count → processing_time) — MỖI lần đều qua NLP Cache
  17  |  *           apply_step1.answer_* (~20ms), tự đính kèm suggestion chip cho field kế tiếp.
  18  |  *
  19  |  * Bằng chứng NLP Cache (không phải Gemini) cho Turn 1-2: text bong bóng PHẢI khớp ĐÚNG NGUYÊN
  20  |  * VĂN câu tĩnh hardcode trong chat.service.ts (_nlpFriendlyTextSuccess) — Gemini không bao giờ
  21  |  * sinh ra đúng y hệt câu này (free-form generation luôn biến thiên từ ngữ).
  22  |  */
  23  | 
  24  | import { test, expect, type Page } from "@playwright/test";
  25  | 
  26  | const AI_RESPONSE_TIMEOUT = 45_000;
  27  | const NLP_CACHE_TIMEOUT = 8_000; // NLP Cache phải trả lời rất nhanh (<100ms ở backend) — timeout ngắn để phân biệt rõ với Gemini (vài giây)
  28  | 
  29  | async function openChatWidget(page: Page) {
  30  |   const toggleBtn = page.locator('[data-ai-element="chat-toggle"]');
  31  |   await expect(toggleBtn).toBeAttached({ timeout: 5000 });
  32  |   await toggleBtn.click();
  33  |   const widget = page.locator('[data-ai-id="chat-widget"] section[role="dialog"]');
  34  |   await expect(widget).toBeVisible({ timeout: 5000 });
  35  |   const nameInput = page.locator("#chat-user-name");
  36  |   if (await nameInput.isVisible({ timeout: 1500 }).catch(() => false)) {
  37  |     await nameInput.fill("E2E Showcase Demo Test");
  38  |     const joinBtn = page.locator('[data-testid="chat-join-submit"]');
  39  |     await expect(joinBtn).toBeEnabled({ timeout: 3000 });
  40  |     await joinBtn.click();
  41  |   }
  42  |   const chatInput = page.locator('[data-ai-id="chat-widget"] [role="textbox"]');
  43  |   await expect(chatInput).toBeVisible({ timeout: 10000 });
  44  |   return chatInput;
  45  | }
  46  | 
  47  | /**
  48  |  * Đợi cursor ảo ẩn hẳn (animation click + reportActionSuccess đã hoàn tất, ~1.4s) trước khi
  49  |  * gửi turn kế tiếp. QUAN TRỌNG khi NLP Cache trả lời cực nhanh (~20ms): nếu gửi turn mới ngay
  50  |  * khi field vừa đổi giá trị (form state đổi NGAY lúc click, sớm hơn animation kết thúc),
  51  |  * VirtualMouseEngine sẽ HUỶ animation cũ (activeIdRef đổi) → bỏ qua reportActionSuccess() của
  52  |  * turn trước — không phải bug logic, chỉ là tốc độ gửi của script nhanh hơn người dùng thật.
  53  |  */
  54  | async function waitCursorSettled(page: Page) {
  55  |   const cursor = page.locator('[data-testid="virtual-cursor"]');
  56  |   await cursor.waitFor({ state: "hidden", timeout: 5000 }).catch(() => {});
  57  |   // Đợi dư thêm cho round-trip reportActionSuccess() → Pusher broadcast → render suggestions
  58  |   // chip kế tiếp (không chỉ animation cursor, còn 1 lượt HTTP + WebSocket nữa) — 300ms cũ là
  59  |   // nguyên nhân chính gây flaky ở các lần test trước (chip kế tiếp chưa kịp render).
  60  |   await page.waitForTimeout(2000);
  61  | }
  62  | 
  63  | async function sendChatMessage(page: Page, chatInput: ReturnType<typeof page.locator>, message: string) {
  64  |   const sendBtn = page.locator('[data-ai-id="chat-widget"] button[type="submit"]');
  65  |   // Bong bóng "Message from You" chứa đúng text này — dùng làm bằng chứng tin nhắn ĐÃ THỰC SỰ
  66  |   // gửi (không chỉ "input rỗng lại", vì input có thể rỗng do fill() thất bại trên input đang
  67  |   // disabled chứ không phải do gửi thành công — false negative đã gặp thật khi NLP Cache trả lời
  68  |   // quá nhanh, turn trước chưa kịp hết disable).
  69  |   const sentBubble = page.locator('[data-ai-id="chat-widget"] [aria-label="Message from You"]').filter({ hasText: message });
  70  | 
  71  |   for (let attempt = 1; attempt <= 4; attempt++) {
  72  |     await sendBtn.isEnabled({ timeout: 30000 }).catch(() => {});
  73  |     await chatInput.click();
  74  |     await chatInput.fill(message);
  75  |     await page.waitForTimeout(200);
  76  |     await chatInput.press("Enter");
  77  | 
  78  |     const stillHasText = await chatInput.evaluate((el) => el.textContent?.trim().length ?? 0).catch(() => 0);
  79  |     if (stillHasText > 0 && (await sendBtn.isEnabled().catch(() => false))) {
  80  |       await sendBtn.click();
  81  |     }
  82  | 
  83  |     if (await sentBubble.last().isVisible({ timeout: 3000 }).catch(() => false)) return;
  84  |     await page.waitForTimeout(500); // turn trước có thể vẫn đang xử lý — chờ rồi thử lại
  85  |   }
  86  |   throw new Error(`Không gửi được tin nhắn sau 4 lần thử: "${message}"`);
  87  | }
  88  | 
  89  | /**
  90  |  * Bấm suggestion chip THẬT (đúng UX demo thật, không gõ tay) — xử lý quirk đã phát hiện
  91  |  * (useChatSuggestions.ts:103-119): tray chỉ tự auto-expand cho batch suggestions ĐẦU TIÊN trong
  92  |  * session; batch thứ 2 trở đi tray đóng, chỉ hiện dot — phải bấm "Expand suggestions" trước.
  93  |  */
  94  | async function clickSuggestionChip(page: Page, label: string, timeout = 30_000) {
  95  |   const sentBubble = page.locator('[data-ai-id="chat-widget"] [aria-label="Message from You"]').filter({ hasText: label });
  96  |   const chip = page.getByRole("button", { name: label, exact: true });
  97  |   const expandBtn = page.getByRole("button", { name: "Expand suggestions" });
  98  |   const deadline = Date.now() + timeout;
  99  | 
  100 |   while (Date.now() < deadline) {
  101 |     // Mở tray nếu đang collapse (quirk batch suggestions thứ 2+ trong session không tự mở).
  102 |     if (await expandBtn.isVisible({ timeout: 500 }).catch(() => false)) {
  103 |       await expandBtn.click();
  104 |       await page.waitForTimeout(300);
  105 |     }
  106 |     // Poll chip theo TÍN HIỆU THẬT (chip render xong) thay vì đoán thời gian cố định — chip chỉ
  107 |     // xuất hiện sau khi round-trip reportActionSuccess()/Gemini hoàn tất, độ trễ thay đổi tuỳ lúc.
  108 |     if (await chip.isVisible({ timeout: 800 }).catch(() => false)) {
  109 |       await chip.click({ force: true }).catch(() => {});
  110 |       if (await sentBubble.last().isVisible({ timeout: 3000 }).catch(() => false)) return;
  111 |     }
  112 |     await page.waitForTimeout(400);
  113 |   }
> 114 |   throw new Error(`Không bấm được chip sau ${timeout}ms: "${label}"`);
      |         ^ Error: Không bấm được chip sau 30000ms: "E-Visa · 30 Days Single Entry"
  115 | }
  116 | 
  117 | test.describe("Showcase Demo — Entry Gate (NLP Cache) → Step 1 Sequencing (Gemini)", () => {
  118 |   test.setTimeout(300_000);
  119 | 
  120 |   test.beforeEach(async ({ page }) => {
  121 |     page.on("dialog", (d) => d.dismiss());
  122 |   });
  123 | 
  124 |   test("Full chain: trigger phrase → NLP Cache mở modal → chọn 'hồ sơ mới' → NLP Cache vào /apply → dẫn dắt 6 field qua Gemini", async ({ page }) => {
  125 |     await page.goto("/", { waitUntil: "domcontentloaded" });
  126 |     const chatInput = await openChatWidget(page);
  127 | 
  128 |     // ── Turn 1: trigger phrase — PHẢI ra NLP Cache, không phải Gemini ──────────────
  129 |     await sendChatMessage(page, chatInput, "Please guide me through doing an e-visa from start to finish");
  130 | 
  131 |     const cursor = page.locator('[data-testid="virtual-cursor"]');
  132 |     await expect(cursor, "Cursor ảo phải xuất hiện để click hero_apply").toBeVisible({ timeout: AI_RESPONSE_TIMEOUT });
  133 | 
  134 |     const modal = page.locator('#evisa-popup[role="dialog"]');
  135 |     await expect(modal, "EntryGateModal phải mở sau khi NLP Cache click hero_apply").toBeVisible({ timeout: 15000 });
  136 | 
  137 |     // Bằng chứng đây là NLP Cache: text bong bóng khớp ĐÚNG NGUYÊN VĂN câu tĩnh hardcode,
  138 |     // KHÔNG phải free-form text của Gemini.
  139 |     const bubble1 = page.locator('[data-ai-id="chat-widget"]').getByText(
  140 |       "I've opened the application portal for you! Which of these best describes your situation?",
  141 |       { exact: false }
  142 |     );
  143 |     await expect(bubble1, "Text phải khớp đúng câu tĩnh của NLP Cache (entry_gate.open_dialog)").toBeVisible({
  144 |       timeout: NLP_CACHE_TIMEOUT,
  145 |     });
  146 | 
  147 |     // ── Turn 2: bấm chip THẬT (đúng UX demo) — PHẢI ra NLP Cache ────────────────────
  148 |     await clickSuggestionChip(page, "No, I need a new E-Visa");
  149 | 
  150 |     await expect(page, "Phải điều hướng vào /apply sau khi NLP Cache click entry_gate_new_application").toHaveURL(
  151 |       /\/apply/,
  152 |       { timeout: 15000 }
  153 |     );
  154 | 
  155 |     const bubble2 = page.locator('[data-ai-id="chat-widget"]').getByText(
  156 |       "I've started your new E-Visa application!",
  157 |       { exact: false }
  158 |     );
  159 |     await expect(bubble2, "Text phải khớp đúng câu tĩnh của NLP Cache (entry_gate.pick_new_application)").toBeVisible(
  160 |       { timeout: NLP_CACHE_TIMEOUT }
  161 |     );
  162 |     await waitCursorSettled(page);
  163 | 
  164 |     // ── Turn 3-8: Step 1 — 6 field, dẫn dắt bởi Gemini (APPLY STEP 1 GUIDED SELECTION) ──
  165 |     const visaTypeField = page.locator('[data-ai-element="apply_step1_visa_type"]');
  166 |     await expect(visaTypeField, "Phải vào đúng Step 1, field visa_type tồn tại").toBeAttached({ timeout: 10000 });
  167 | 
  168 |     await sendChatMessage(page, chatInput, "I want to fill out the visa application");
  169 |     // Turn này gọi Gemini (text thuần, độ trễ thay đổi 1-10s) — clickSuggestionChip tự poll chip
  170 |     // theo tín hiệu thật (không đoán thời gian cố định), timeout dài hơn vì là lượt Gemini.
  171 |     await clickSuggestionChip(page, "E-Visa — All border crossings", 45_000);
  172 |     await expect(visaTypeField, "visa_type phải hiện 'E-Visa'").toContainText("E-Visa", { timeout: 25000 });
  173 |     await waitCursorSettled(page);
  174 | 
  175 |     const categoryField = page.locator('[data-ai-element="apply_step1_visa_category"]');
  176 |     await clickSuggestionChip(page, "E-Visa · 30 Days Single Entry");
  177 |     await expect(categoryField, "visa_category phải hiện '30 Days'").toContainText("30 Days", { timeout: 25000 });
  178 |     await waitCursorSettled(page);
  179 | 
  180 |     const portField = page.locator('[data-ai-element="apply_step1_port_of_entry"]');
  181 |     await clickSuggestionChip(page, "Tan Son Nhat Airport");
  182 |     await expect(portField, "port_of_entry phải đổi khỏi placeholder").not.toContainText("Select", { timeout: 25000 });
  183 |     await waitCursorSettled(page);
  184 | 
  185 |     const purposeField = page.locator('[data-ai-element="apply_step1_purpose_of_visit"]');
  186 |     await clickSuggestionChip(page, "Tourism");
  187 |     await expect(purposeField, "purpose_of_visit phải hiện 'Tourism'").toContainText("Tourism", { timeout: 25000 });
  188 |     await waitCursorSettled(page);
  189 | 
  190 |     const countField = page.locator('[data-ai-element="apply_step1_applicant_count"]');
  191 |     await clickSuggestionChip(page, "1 person");
  192 |     await expect(countField, "applicant_count phải hiện '1'").toContainText("1", { timeout: 25000 });
  193 |     await waitCursorSettled(page);
  194 | 
  195 |     const processingField = page.locator('[data-ai-element="apply_step1_processing_urgent_4d"]');
  196 |     await clickSuggestionChip(page, "Urgent · 4 Working Days");
  197 |     await expect(processingField, "processing_time radio 'Urgent 4d' phải được chọn").toBeChecked({ timeout: 25000 });
  198 |   });
  199 | });
  200 | 
```