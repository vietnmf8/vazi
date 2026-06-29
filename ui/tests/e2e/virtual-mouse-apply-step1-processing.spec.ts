/**
 * E2E Test: click_ui_element — processing_time ở /apply Step 1 (7 target apply_step1_processing_*)
 *
 * processing_time KHÔNG dùng Radix Select (khác 5 field còn lại của pilot) — mỗi option là 1 button
 * radio độc lập trong ProcessingTimeSelector.tsx, nên dùng pattern click_ui_element (click thẳng vào
 * đúng button) thay vì focus_ui_field + optionCode.
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
    await nameInput.fill("E2E Processing Time Test");
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

test.describe("click_ui_element — processing_time /apply Step 1 (Real AI Message)", () => {
  test.setTimeout(120_000);

  test.beforeEach(async ({ page }) => {
    page.on("dialog", (d) => d.dismiss());
  });

  test("chọn 'Urgent · 4 Working Days' qua chat → đúng radio button được chọn (aria-checked=true)", async ({ page }) => {
    await page.goto("/apply", { waitUntil: "domcontentloaded" });

    const target = page.locator('[data-ai-element="apply_step1_processing_urgent_4d"]');
    await expect(target, "Button processing urgent_4d phải tồn tại trên /apply Step 1").toBeAttached({ timeout: 5000 });
    await expect(target).toHaveAttribute("aria-checked", "false");

    const chatInput = await openChatWidget(page);
    await sendChatMessage(page, chatInput, "I'd like urgent 4 working days processing for my visa application step 1");

    const cursor = page.locator('[data-testid="virtual-cursor"]');
    await expect(cursor, "Cursor ảo phải xuất hiện").toBeVisible({ timeout: AI_RESPONSE_TIMEOUT });

    await expect(target, "Radio urgent_4d phải được chọn (aria-checked=true)").toHaveAttribute(
      "aria-checked",
      "true",
      { timeout: 25000 }
    );
  });
});
