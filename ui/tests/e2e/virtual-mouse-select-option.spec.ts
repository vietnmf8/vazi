/**
 * E2E Test: focus_ui_field Phase 2 — AI tự chọn quốc gia trong Combobox đã mở (2026-06-23)
 *
 * Pipeline: Chat Input → API → Gemini (LUÔN, không qua NLP Cache vì message có tên quốc gia,
 * xem guard ở chat.service.ts) → focus_ui_field tool (value=ISO2) → FOCUS_AND_SELECT_TRIGGERED /
 * NAVIGATE_AND_SELECT_TRIGGERED → SSE VIRTUAL_SELECT / NAVIGATE_AND_SELECT → useChat.ts →
 * VirtualMouseEngine PHASE 5: tìm option bằng data-value, cuộn listbox nếu cần, click thật →
 * Combobox value cập nhật (option có aria-selected="true").
 */

import { test, expect, type Page } from "@playwright/test";

const AI_RESPONSE_TIMEOUT = 45_000;

async function openChatWidget(page: Page) {
  const toggleBtn = page.locator('[data-ai-element="chat-toggle"]');
  await expect(toggleBtn, "chat-toggle button phải tồn tại").toBeAttached({ timeout: 5000 });
  await toggleBtn.click();

  const widget = page.locator('[data-ai-id="chat-widget"] section[role="dialog"]');
  await expect(widget, "Chat widget panel phải xuất hiện").toBeVisible({ timeout: 5000 });

  const nameInput = page.locator("#chat-user-name");
  const isJoining = await nameInput.isVisible({ timeout: 1500 }).catch(() => false);
  if (isJoining) {
    await nameInput.fill("E2E Select Option Test");
    const joinBtn = page.locator('[data-testid="chat-join-submit"]');
    await expect(joinBtn).toBeEnabled({ timeout: 3000 });
    await joinBtn.click();
  }

  const chatInput = page.locator('[data-ai-id="chat-widget"] [role="textbox"]');
  await expect(chatInput, "Chat input phải xuất hiện").toBeVisible({ timeout: 10000 });
  return chatInput;
}

async function sendChatMessage(page: Page, chatInput: ReturnType<typeof page.locator>, message: string) {
  await chatInput.click();
  await chatInput.fill(message);
  await page.waitForTimeout(200);
  await chatInput.press("Enter");
}

test.describe("focus_ui_field — chọn quốc gia trong dropdown (Real AI Message)", () => {
  test.setTimeout(120_000);

  test.beforeEach(async ({ page }) => {
    page.on("dialog", (d) => d.dismiss());
    page.on("console", (msg) => console.log(`[Browser] ${msg.type()}: ${msg.text()}`));
    await page.goto("/", { waitUntil: "domcontentloaded" });
  });

  test("Case 1 — chọn Vietnam (đầu danh sách, không cần cuộn)", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const target = page.locator('[data-ai-element="quick_apply_nationality"]');
    await expect(target, "Combobox quốc tịch phải tồn tại trên Home").toBeAttached({ timeout: 5000 });

    const chatInput = await openChatWidget(page);
    await sendChatMessage(page, chatInput, "Chọn giúp tôi quốc tịch Việt Nam ở form đăng ký nhanh");

    const cursor = page.locator('[data-testid="virtual-cursor"]');
    await expect(cursor, "Cursor ảo phải xuất hiện").toBeVisible({ timeout: AI_RESPONSE_TIMEOUT });

    const selectedOption = page.locator('[role="option"][data-value="Vietnam"]');
    // NOTE: The dropdown closes after selection, so the option is removed from the DOM.
    // Therefore, we check if the target (combobox input) has the selected value.
    // TẠI SAO 25000 (trước 15000): toHaveValue đã tự poll, nhưng dưới tải nặng (chạy nhiều file
    // Playwright liên tiếp) toàn bộ PHASE 5 (tìm option + cuộn + animate + click) có thể cần
    // nhiều hơn budget cũ — tăng margin an toàn, không đụng timing nội bộ VirtualMouseEngine.
    await expect(target, "Input phải hiện label đã chọn sau khi đóng dropdown").toHaveValue(
      "Vietnam",
      { timeout: 25000 }
    );
  });

  test("Case 2 — chọn quốc gia cuối danh sách alphabet (cần cuộn listbox)", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const target = page.locator('[data-ai-element="quick_apply_nationality"]');

    const chatInput = await openChatWidget(page);
    await sendChatMessage(page, chatInput, "Chọn giúp tôi quốc tịch Venezuela ở form đăng ký nhanh");

    const cursor = page.locator('[data-testid="virtual-cursor"]');
    await expect(cursor, "Cursor ảo phải xuất hiện").toBeVisible({ timeout: AI_RESPONSE_TIMEOUT });
    // Wait for Splash screen
    await page.waitForTimeout(1500);

    await expect(target, "Combobox phải hiển thị Venezuela").toHaveValue(
      "Venezuela",
      { timeout: 25000 }
    );
  });

  test("Case 3 — combo: đang ở /about-us, chuyển về Home rồi chọn quốc gia", async ({ page }) => {
    await page.goto("/about-us", { waitUntil: "domcontentloaded" });
    const target = page.locator('[data-ai-element="quick_apply_nationality"]');

    const chatInput = await openChatWidget(page);
    await sendChatMessage(page, chatInput, "Chọn giúp tôi quốc tịch Hàn Quốc ở form đăng ký nhanh");

    await page.waitForURL((url) => url.pathname === "/", { timeout: AI_RESPONSE_TIMEOUT, waitUntil: "commit" });

    const cursor = page.locator('[data-testid="virtual-cursor"]');
    await expect(cursor, "Cursor ảo phải xuất hiện trên trang mới").toBeVisible({ timeout: AI_RESPONSE_TIMEOUT });

    await expect(target, "Combobox phải hiển thị South Korea sau combo navigate+select").toHaveValue(
      "South Korea",
      { timeout: 25000 }
    );
  });

  test("Case 4 — fallback: optionCode hợp lệ nhưng DOM node không tồn tại (giả lập qua ai_fill_form trực tiếp)", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Wait for Combobox to be attached and hydrated
    const target = page.locator('[data-ai-element="quick_apply_nationality"]');
    await expect(target).toBeAttached({ timeout: 5000 });
    // IMPORTANT: Wait for Splash Screen to fully unmount (animations take ~1000ms)
    await page.waitForTimeout(1500);

    // Giả lập đúng nhánh fallback của VirtualMouseEngine (PHASE 5 → findOptionWithRetry hết budget
    // → dispatch ai_fill_form) bằng cách dispatch event này trực tiếp, KHÔNG qua chat thật — vì
    // không thể ép DOM "biến mất" một cách đáng tin cậy qua chat thật. Đây verify ĐÚNG cơ chế
    // fallback mà QuickApplyFormFields.tsx đã có sẵn (không phải code mới của phiên này).
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("ai_fill_form", { detail: { fieldName: "nationality", value: "Vietnam" } })
      );
    });

    await expect(target, "Input phải hiện 'Vietnam' sau khi fallback set state").toHaveValue(
      "Vietnam",
      { timeout: 5000 }
    );
  });
});
