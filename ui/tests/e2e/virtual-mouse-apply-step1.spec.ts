/**
 * E2E Test: focus_ui_field — Pilot Tray Suggestion /apply Step 1 (5 target apply_step1_*)
 *
 * Pipeline giống virtual-mouse-select-option.spec.ts (Quick Apply), nhưng trên /apply Step 1:
 * Chat Input → API → Gemini → focus_ui_field tool (target=apply_step1_*) → FOCUS_AND_SELECT_TRIGGERED →
 * SSE VIRTUAL_SELECT → useChat.ts → VirtualMouseEngine PHASE 5: tìm option Radix Select bằng
 * data-value, click thật → SelectTrigger hiển thị label đã chọn.
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
    await nameInput.fill("E2E Apply Step1 Test");
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

test.describe("focus_ui_field — /apply Step 1 (Real AI Message)", () => {
  test.setTimeout(120_000);

  test.beforeEach(async ({ page }) => {
    page.on("dialog", (d) => d.dismiss());
    page.on("console", (msg) => console.log(`[Browser] ${msg.type()}: ${msg.text()}`));
  });

  test("Case 1 — chọn visa_type E-Visa qua chat → SelectTrigger hiện 'E-Visa'", async ({ page }) => {
    await page.goto("/apply", { waitUntil: "domcontentloaded" });

    const target = page.locator('[data-ai-element="apply_step1_visa_type"]');
    await expect(target, "SelectTrigger visa_type phải tồn tại trên /apply Step 1").toBeAttached({ timeout: 5000 });

    const chatInput = await openChatWidget(page);
    await sendChatMessage(page, chatInput, "Tôi muốn chọn loại visa E-Visa");

    const cursor = page.locator('[data-testid="virtual-cursor"]');
    await expect(cursor, "Cursor ảo phải xuất hiện").toBeVisible({ timeout: AI_RESPONSE_TIMEOUT });

    await expect(target, "SelectTrigger phải hiện 'E-Visa' sau khi chọn").toContainText("E-Visa", {
      timeout: 25000,
    });
  });

  test("Case 2 — chọn cửa khẩu Tân Sơn Nhất qua chat → SelectTrigger hiện đúng port", async ({ page }) => {
    await page.goto("/apply", { waitUntil: "domcontentloaded" });

    const target = page.locator('[data-ai-element="apply_step1_port_of_entry"]');
    await expect(target).toBeAttached({ timeout: 5000 });

    const chatInput = await openChatWidget(page);
    await sendChatMessage(page, chatInput, "Chọn giúp tôi cửa khẩu Tân Sơn Nhất ở bước 1");

    const cursor = page.locator('[data-testid="virtual-cursor"]');
    await expect(cursor, "Cursor ảo phải xuất hiện").toBeVisible({ timeout: AI_RESPONSE_TIMEOUT });

    // Tan Son Nhat = SGN — label hiển thị tùy DB/i18n, chỉ assert KHÔNG còn placeholder mặc định.
    await expect(target).not.toContainText("Select", { timeout: 25000 });
  });

  test("Case 3 — chọn số người nộp đơn = 3 qua chat → SelectTrigger hiện '3'", async ({ page }) => {
    await page.goto("/apply", { waitUntil: "domcontentloaded" });

    const target = page.locator('[data-ai-element="apply_step1_applicant_count"]');
    await expect(target).toBeAttached({ timeout: 5000 });

    const chatInput = await openChatWidget(page);
    await sendChatMessage(page, chatInput, "Tôi đăng ký cho 3 người ở bước 1");

    const cursor = page.locator('[data-testid="virtual-cursor"]');
    await expect(cursor, "Cursor ảo phải xuất hiện").toBeVisible({ timeout: AI_RESPONSE_TIMEOUT });

    await expect(target).toContainText("3", { timeout: 25000 });
  });

  test("Case 4 — fallback: dispatch ai_fill_form trực tiếp với target=step1_form (giả lập DOM node mất)", async ({ page }) => {
    await page.goto("/apply", { waitUntil: "domcontentloaded" });

    const target = page.locator('[data-ai-element="apply_step1_purpose_of_visit"]');
    await expect(target).toBeAttached({ timeout: 5000 });
    await page.waitForTimeout(500);

    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("ai_fill_form", {
          detail: { target: "step1_form", fieldName: "purpose_of_visit", value: "business" },
        })
      );
    });

    await expect(target, "SelectTrigger phải hiện 'Business' sau khi fallback set state").toContainText(
      "Business",
      { timeout: 5000 }
    );
  });
});
