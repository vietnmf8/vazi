/**
 * E2E Test: Showcase Demo Pipeline — Entry Gate (NLP Cache) → Step 1 Sequencing (NLP Cache cho
 * 5/6 field) — verify cứng bằng Playwright thật (real browser, real AI, real virtual cursor,
 * BẤM CHIP THẬT — đúng UX demo thật, không gõ tay) cho ĐÚNG 1 case sẽ dùng khi demo khách hàng.
 *
 * Câu chữ PHẢI giữ nguyên y hệt — đây là script demo cố định đã seed vào NLP Cache (xem
 * api/scripts/seed-nlp-entry-gate-b1.mjs + seed-nlp-step1-fields-demo.mjs), không phải coverage rộng:
 *   Turn 1: gõ "Please guide me through doing an e-visa from start to finish" (không có chip để
 *           bấm — đây là câu mở thoại) → NLP Cache entry_gate.open_dialog → VIRTUAL_CLICK(hero_apply)
 *           → mở EntryGateModal + AI hỏi 3 lựa chọn kèm suggestion chip
 *   Turn 2: BẤM CHIP "No, I need a new E-Visa" → NLP Cache entry_gate.pick_new_application →
 *           VIRTUAL_CLICK(entry_gate_new_application) → click nút thật trong modal → vào /apply
 *   Turn 3: gõ "I want to fill out the visa application" (không có chip — câu mở Step1) → Gemini
 *           hỏi visa_type kèm suggestion chip lấy từ schema form (KHÔNG qua NLP Cache, có chủ đích)
 *   Turn 4-9: BẤM CHIP cho từng field (visa_type → visa_category → port_of_entry →
 *           purpose_of_visit → applicant_count → processing_time) — MỖI lần đều qua NLP Cache
 *           apply_step1.answer_* (~20ms), tự đính kèm suggestion chip cho field kế tiếp.
 *
 * Bằng chứng NLP Cache (không phải Gemini) cho Turn 1-2: text bong bóng PHẢI khớp ĐÚNG NGUYÊN
 * VĂN câu tĩnh hardcode trong chat.service.ts (_nlpFriendlyTextSuccess) — Gemini không bao giờ
 * sinh ra đúng y hệt câu này (free-form generation luôn biến thiên từ ngữ).
 */

import { test, expect, type Page } from "@playwright/test";

const AI_RESPONSE_TIMEOUT = 45_000;
const NLP_CACHE_TIMEOUT = 8_000; // NLP Cache phải trả lời rất nhanh (<100ms ở backend) — timeout ngắn để phân biệt rõ với Gemini (vài giây)

async function openChatWidget(page: Page) {
  const toggleBtn = page.locator('[data-ai-element="chat-toggle"]');
  await expect(toggleBtn).toBeAttached({ timeout: 5000 });
  await toggleBtn.click();
  const widget = page.locator('[data-ai-id="chat-widget"] section[role="dialog"]');
  await expect(widget).toBeVisible({ timeout: 5000 });
  const nameInput = page.locator("#chat-user-name");
  if (await nameInput.isVisible({ timeout: 1500 }).catch(() => false)) {
    await nameInput.fill("E2E Showcase Demo Test");
    const joinBtn = page.locator('[data-testid="chat-join-submit"]');
    await expect(joinBtn).toBeEnabled({ timeout: 3000 });
    await joinBtn.click();
  }
  const chatInput = page.locator('[data-ai-id="chat-widget"] [role="textbox"]');
  await expect(chatInput).toBeVisible({ timeout: 10000 });
  return chatInput;
}

/**
 * Đợi cursor ảo ẩn hẳn (animation click + reportActionSuccess đã hoàn tất, ~1.4s) trước khi
 * gửi turn kế tiếp. QUAN TRỌNG khi NLP Cache trả lời cực nhanh (~20ms): nếu gửi turn mới ngay
 * khi field vừa đổi giá trị (form state đổi NGAY lúc click, sớm hơn animation kết thúc),
 * VirtualMouseEngine sẽ HUỶ animation cũ (activeIdRef đổi) → bỏ qua reportActionSuccess() của
 * turn trước — không phải bug logic, chỉ là tốc độ gửi của script nhanh hơn người dùng thật.
 */
async function waitCursorSettled(page: Page) {
  const cursor = page.locator('[data-testid="virtual-cursor"]');
  await cursor.waitFor({ state: "hidden", timeout: 5000 }).catch(() => {});
  // Đợi dư thêm cho round-trip reportActionSuccess() → Pusher broadcast → render suggestions
  // chip kế tiếp (không chỉ animation cursor, còn 1 lượt HTTP + WebSocket nữa) — 300ms cũ là
  // nguyên nhân chính gây flaky ở các lần test trước (chip kế tiếp chưa kịp render).
  await page.waitForTimeout(2000);
}

async function sendChatMessage(page: Page, chatInput: ReturnType<typeof page.locator>, message: string) {
  const sendBtn = page.locator('[data-ai-id="chat-widget"] button[type="submit"]');
  // Bong bóng "Message from You" chứa đúng text này — dùng làm bằng chứng tin nhắn ĐÃ THỰC SỰ
  // gửi (không chỉ "input rỗng lại", vì input có thể rỗng do fill() thất bại trên input đang
  // disabled chứ không phải do gửi thành công — false negative đã gặp thật khi NLP Cache trả lời
  // quá nhanh, turn trước chưa kịp hết disable).
  const sentBubble = page.locator('[data-ai-id="chat-widget"] [aria-label="Message from You"]').filter({ hasText: message });

  for (let attempt = 1; attempt <= 4; attempt++) {
    await sendBtn.isEnabled({ timeout: 30000 }).catch(() => {});
    await chatInput.click();
    await chatInput.fill(message);
    await page.waitForTimeout(200);
    await chatInput.press("Enter");

    const stillHasText = await chatInput.evaluate((el) => el.textContent?.trim().length ?? 0).catch(() => 0);
    if (stillHasText > 0 && (await sendBtn.isEnabled().catch(() => false))) {
      await sendBtn.click();
    }

    if (await sentBubble.last().isVisible({ timeout: 3000 }).catch(() => false)) return;
    await page.waitForTimeout(500); // turn trước có thể vẫn đang xử lý — chờ rồi thử lại
  }
  throw new Error(`Không gửi được tin nhắn sau 4 lần thử: "${message}"`);
}

/**
 * Bấm suggestion chip THẬT (đúng UX demo thật, không gõ tay) — xử lý quirk đã phát hiện
 * (useChatSuggestions.ts:103-119): tray chỉ tự auto-expand cho batch suggestions ĐẦU TIÊN trong
 * session; batch thứ 2 trở đi tray đóng, chỉ hiện dot — phải bấm "Expand suggestions" trước.
 */
async function clickSuggestionChip(page: Page, label: string, timeout = 30_000) {
  const sentBubble = page.locator('[data-ai-id="chat-widget"] [aria-label="Message from You"]').filter({ hasText: label });
  const chip = page.getByRole("button", { name: label, exact: true });
  const expandBtn = page.getByRole("button", { name: "Expand suggestions" });
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    // Mở tray nếu đang collapse (quirk batch suggestions thứ 2+ trong session không tự mở).
    if (await expandBtn.isVisible({ timeout: 500 }).catch(() => false)) {
      await expandBtn.click();
      await page.waitForTimeout(300);
    }
    // Poll chip theo TÍN HIỆU THẬT (chip render xong) thay vì đoán thời gian cố định — chip chỉ
    // xuất hiện sau khi round-trip reportActionSuccess()/Gemini hoàn tất, độ trễ thay đổi tuỳ lúc.
    if (await chip.isVisible({ timeout: 800 }).catch(() => false)) {
      await chip.click({ force: true }).catch(() => {});
      if (await sentBubble.last().isVisible({ timeout: 3000 }).catch(() => false)) return;
    }
    await page.waitForTimeout(400);
  }
  throw new Error(`Không bấm được chip sau ${timeout}ms: "${label}"`);
}

test.describe("Showcase Demo — Entry Gate (NLP Cache) → Step 1 Sequencing (Gemini)", () => {
  test.setTimeout(300_000);

  test.beforeEach(async ({ page }) => {
    page.on("dialog", (d) => d.dismiss());
  });

  test("Full chain: trigger phrase → NLP Cache mở modal → chọn 'hồ sơ mới' → NLP Cache vào /apply → dẫn dắt 6 field qua Gemini", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const chatInput = await openChatWidget(page);

    // ── Turn 1: trigger phrase — PHẢI ra NLP Cache, không phải Gemini ──────────────
    await sendChatMessage(page, chatInput, "Please guide me through doing an e-visa from start to finish");

    const cursor = page.locator('[data-testid="virtual-cursor"]');
    await expect(cursor, "Cursor ảo phải xuất hiện để click hero_apply").toBeVisible({ timeout: AI_RESPONSE_TIMEOUT });

    const modal = page.locator('#evisa-popup[role="dialog"]');
    await expect(modal, "EntryGateModal phải mở sau khi NLP Cache click hero_apply").toBeVisible({ timeout: 15000 });

    // Bằng chứng đây là NLP Cache: text bong bóng khớp ĐÚNG NGUYÊN VĂN câu tĩnh hardcode,
    // KHÔNG phải free-form text của Gemini.
    const bubble1 = page.locator('[data-ai-id="chat-widget"]').getByText(
      "I've opened the application portal for you! Which of these best describes your situation?",
      { exact: false }
    );
    await expect(bubble1, "Text phải khớp đúng câu tĩnh của NLP Cache (entry_gate.open_dialog)").toBeVisible({
      timeout: NLP_CACHE_TIMEOUT,
    });

    // ── Turn 2: bấm chip THẬT (đúng UX demo) — PHẢI ra NLP Cache ────────────────────
    await clickSuggestionChip(page, "No, I need a new E-Visa");

    await expect(page, "Phải điều hướng vào /apply sau khi NLP Cache click entry_gate_new_application").toHaveURL(
      /\/apply/,
      { timeout: 15000 }
    );

    const bubble2 = page.locator('[data-ai-id="chat-widget"]').getByText(
      "I've started your new E-Visa application!",
      { exact: false }
    );
    await expect(bubble2, "Text phải khớp đúng câu tĩnh của NLP Cache (entry_gate.pick_new_application)").toBeVisible(
      { timeout: NLP_CACHE_TIMEOUT }
    );
    await waitCursorSettled(page);

    // ── Turn 3-8: Step 1 — 6 field, dẫn dắt bởi Gemini (APPLY STEP 1 GUIDED SELECTION) ──
    const visaTypeField = page.locator('[data-ai-element="apply_step1_visa_type"]');
    await expect(visaTypeField, "Phải vào đúng Step 1, field visa_type tồn tại").toBeAttached({ timeout: 10000 });

    await sendChatMessage(page, chatInput, "I want to fill out the visa application");
    // Turn này gọi Gemini (text thuần, độ trễ thay đổi 1-10s) — clickSuggestionChip tự poll chip
    // theo tín hiệu thật (không đoán thời gian cố định), timeout dài hơn vì là lượt Gemini.
    await clickSuggestionChip(page, "E-Visa — All border crossings", 45_000);
    await expect(visaTypeField, "visa_type phải hiện 'E-Visa'").toContainText("E-Visa", { timeout: 25000 });
    await waitCursorSettled(page);

    const categoryField = page.locator('[data-ai-element="apply_step1_visa_category"]');
    await clickSuggestionChip(page, "E-Visa · 30 Days Single Entry");
    await expect(categoryField, "visa_category phải hiện '30 Days'").toContainText("30 Days", { timeout: 25000 });
    await waitCursorSettled(page);

    const portField = page.locator('[data-ai-element="apply_step1_port_of_entry"]');
    await clickSuggestionChip(page, "Tan Son Nhat Airport");
    await expect(portField, "port_of_entry phải đổi khỏi placeholder").not.toContainText("Select", { timeout: 25000 });
    await waitCursorSettled(page);

    const purposeField = page.locator('[data-ai-element="apply_step1_purpose_of_visit"]');
    await clickSuggestionChip(page, "Tourism");
    await expect(purposeField, "purpose_of_visit phải hiện 'Tourism'").toContainText("Tourism", { timeout: 25000 });
    await waitCursorSettled(page);

    const countField = page.locator('[data-ai-element="apply_step1_applicant_count"]');
    await clickSuggestionChip(page, "1 person");
    await expect(countField, "applicant_count phải hiện '1'").toContainText("1", { timeout: 25000 });
    await waitCursorSettled(page);

    const processingField = page.locator('[data-ai-element="apply_step1_processing_urgent_4d"]');
    await clickSuggestionChip(page, "Urgent · 4 Working Days");
    await expect(processingField, "processing_time radio 'Urgent 4d' phải được chọn").toBeChecked({ timeout: 25000 });
  });
});
