/**
 * E2E Test: click_ui_element — Entry Gate Modal qua chat (Pilot Tray Suggestion B1, 2026-06-25)
 *
 * Pipeline: Chat "tôi muốn làm visa ngay bây giờ" → click_ui_element(hero_apply) → mở
 * EntryGateModal + AI hỏi 3 lựa chọn kèm suggestion chip đúng nhãn 3 nút trong modal →
 * user chọn chip → click_ui_element(entry_gate_new_application) → click nút thật trong modal
 * → điều hướng vào /apply Step 1 → AI tiếp tục dẫn dắt APPLY STEP 1 GUIDED SELECTION.
 */

import { test, expect, type Page } from "@playwright/test";

const AI_RESPONSE_TIMEOUT = 45_000;

async function openChatWidget(page: Page) {
  const toggleBtn = page.locator('[data-ai-element="chat-toggle"]');
  await expect(toggleBtn).toBeAttached({ timeout: 5000 });
  await toggleBtn.click();
  const widget = page.locator('[data-ai-id="chat-widget"] section[role="dialog"]');
  await expect(widget).toBeVisible({ timeout: 5000 });
  const nameInput = page.locator("#chat-user-name");
  if (await nameInput.isVisible({ timeout: 1500 }).catch(() => false)) {
    await nameInput.fill("E2E Entry Gate Test");
    const joinBtn = page.locator('[data-testid="chat-join-submit"]');
    await expect(joinBtn).toBeEnabled({ timeout: 3000 });
    await joinBtn.click();
  }
  const chatInput = page.locator('[data-ai-id="chat-widget"] [role="textbox"]');
  await expect(chatInput).toBeVisible({ timeout: 10000 });
  return chatInput;
}

async function sendChatMessage(page: Page, chatInput: ReturnType<typeof page.locator>, message: string) {
  await chatInput.click();
  await chatInput.fill(message);
  await page.waitForTimeout(200);
  await chatInput.press("Enter");
}

test.describe("click_ui_element — Entry Gate Modal (Real AI Message)", () => {
  test.setTimeout(120_000);

  test.beforeEach(async ({ page }) => {
    page.on("dialog", (d) => d.dismiss());
  });

  test("Bắt đầu xin visa qua chat → mở EntryGateModal, chọn 'hồ sơ mới' → vào /apply Step 1", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const chatInput = await openChatWidget(page);
    await sendChatMessage(page, chatInput, "I want to apply for a visa right now");

    const cursor = page.locator('[data-testid="virtual-cursor"]');
    await expect(cursor, "Cursor ảo phải xuất hiện để click hero_apply").toBeVisible({ timeout: AI_RESPONSE_TIMEOUT });

    const modal = page.locator('#evisa-popup[role="dialog"]');
    await expect(modal, "EntryGateModal phải mở ra sau khi click hero_apply").toBeVisible({ timeout: 15000 });

    const newAppBtn = page.locator('[data-ai-element="entry_gate_new_application"]');
    await expect(newAppBtn, "Nút 'No, I need a new E-Visa' phải tồn tại trong modal").toBeAttached({ timeout: 5000 });

    await sendChatMessage(page, chatInput, "No, I need a new E-Visa");

    await expect(page, "Phải điều hướng vào /apply sau khi chọn 'new application'").toHaveURL(/\/apply/, {
      timeout: 25000,
    });

    const visaTypeField = page.locator('[data-ai-element="apply_step1_visa_type"]');
    await expect(visaTypeField, "Phải vào đúng Step 1, field visa_type tồn tại").toBeAttached({ timeout: 10000 });
  });
});
