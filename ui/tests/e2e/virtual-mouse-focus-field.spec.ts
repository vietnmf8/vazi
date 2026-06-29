/**
 * E2E Test: focus_ui_field — Click mở Combobox quốc tịch trong QuickApplyForm (2026-06-23)
 *
 * Baseline qua Gemini THẬT (NLP Cache cho "focus.quick_apply_nationality" CHƯA được seed ở
 * thời điểm chạy file này — xem api/scripts/seed-nlp-focus-quick-apply-nationality.mjs).
 *
 * Pipeline: Chat Input → API → Gemini → focus_ui_field tool → ELEMENT_CLICK_TRIGGERED /
 * NAVIGATE_AND_CLICK_TRIGGERED → SSE VIRTUAL_CLICK / NAVIGATE_AND_CLICK (gemini.service.ts map sẵn,
 * không sửa) → useChat.ts → VirtualMouseEngine: cursor di chuyển, el.click() trên
 * [data-ai-element="quick_apply_nationality"] → input nhận focus → Combobox mở dropdown
 * (aria-expanded="true").
 */

import { test, expect, type Page } from "@playwright/test";

const AI_RESPONSE_TIMEOUT = 25_000;

async function openChatWidget(page: Page) {
  const toggleBtn = page.locator('[data-ai-element="chat-toggle"]');
  await expect(toggleBtn, "chat-toggle button phải tồn tại").toBeAttached({ timeout: 5000 });
  await toggleBtn.click();

  const widget = page.locator('[data-ai-id="chat-widget"] section[role="dialog"]');
  await expect(widget, "Chat widget panel phải xuất hiện").toBeVisible({ timeout: 5000 });

  const nameInput = page.locator("#chat-user-name");
  const isJoining = await nameInput.isVisible({ timeout: 1500 }).catch(() => false);
  if (isJoining) {
    await nameInput.fill("E2E Focus Field Test");
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

test.describe("focus_ui_field — quick_apply_nationality (Real AI Message)", () => {
  test.setTimeout(70_000); // real Gemini + navigation + animation — cùng budget với virtual-mouse-conditional-buttons.spec.ts

  test.beforeEach(async ({ page }) => {
    page.on("dialog", (d) => d.dismiss());
    page.context().on("page", (p) => p.close());
  });

  test("Case 1 — đang ở Home, AI mở Combobox quốc tịch tại chỗ (VIRTUAL_CLICK)", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const target = page.locator('[data-ai-element="quick_apply_nationality"]');
    await expect(target, "Combobox quốc tịch phải tồn tại trong DOM trên Home").toBeAttached({ timeout: 5000 });
    await expect(target, "Combobox phải ở trạng thái đóng trước khi gửi lệnh AI").toHaveAttribute("aria-expanded", "false");

    const chatInput = await openChatWidget(page);
    await sendChatMessage(page, chatInput, "Tôi muốn chọn quốc tịch ở phần đăng ký nhanh");

    const cursor = page.locator('[data-testid="virtual-cursor"]');
    await expect(cursor, "Cursor ảo phải xuất hiện sau lệnh AI").toBeVisible({ timeout: AI_RESPONSE_TIMEOUT });

    await expect(target, "Combobox phải mở (aria-expanded=true) sau khi AI click").toHaveAttribute(
      "aria-expanded",
      "true",
      { timeout: 3000 }
    );

    await expect(cursor, "Cursor phải biến mất sau animation").not.toBeVisible({ timeout: 2000 });
  });

  test("Case 2 — đang ở /about-us, AI chuyển về Home rồi mở Combobox quốc tịch (NAVIGATE_AND_CLICK)", async ({ page }) => {
    await page.goto("/about-us", { waitUntil: "domcontentloaded" });

    const chatInput = await openChatWidget(page);
    await sendChatMessage(page, chatInput, "Tôi muốn chọn quốc tịch ở phần đăng ký nhanh");

    await page.waitForURL((url) => url.pathname === "/", { timeout: AI_RESPONSE_TIMEOUT, waitUntil: "commit" });

    const target = page.locator('[data-ai-element="quick_apply_nationality"]');
    await expect(target, "Combobox quốc tịch phải tồn tại trên Home sau khi điều hướng").toBeAttached({
      timeout: 5000,
    });

    const cursor = page.locator('[data-testid="virtual-cursor"]');
    await expect(cursor, "Cursor ảo phải xuất hiện trên trang mới").toBeVisible({ timeout: AI_RESPONSE_TIMEOUT });

    await expect(target, "Combobox phải mở sau combo navigate+click").toHaveAttribute("aria-expanded", "true", {
      timeout: 3000,
    });
  });
});
