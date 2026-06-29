/**
 * E2E Test: focus_ui_field Phase 3 — AI mở + chọn giá trị cho nhóm field Select của
 * QuickApplyForm (port, loại visa, tốc độ xử lý) (2026-06-24)
 *
 * Khác nationality (Phase 2): giá trị là enum nhỏ/đóng nên Phase 3 này SẼ cache theo cặp
 * (target,value) ở Task 9 — nhưng file này chạy TRƯỚC khi seed, baseline qua Gemini thật.
 *
 * Pipeline: Chat Input → API → Gemini → focus_ui_field tool (value=mã code) →
 * FOCUS_AND_SELECT_TRIGGERED/NAVIGATE_AND_SELECT_TRIGGERED → SSE VIRTUAL_SELECT/NAVIGATE_AND_SELECT
 * → useChat.ts → VirtualMouseEngine PHASE 5 (đã tổng quát hoá ở Task 4): tìm option Select bằng
 * data-value, cuộn nếu cần, click thật → Select đóng lại, SelectValue hiển thị đúng.
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
    await nameInput.fill("E2E Select Group Test");
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

test.describe("focus_ui_field — nhóm Select: port (Real AI Message)", () => {
  test.setTimeout(120_000);

  test.beforeEach(async ({ page }) => {
    page.on("dialog", (d) => d.dismiss());
    page.on("console", (msg) => console.log(`[Browser] ${msg.type()}: ${msg.text()}`));
    await page.goto("/", { waitUntil: "domcontentloaded" });
  });

  test("Port Case 1 — mở field không kèm giá trị (open-only)", async ({ page }) => {
    const target = page.locator('[data-ai-element="quick_apply_port"]');
    await expect(target, "SelectTrigger cửa khẩu phải tồn tại trên Home").toBeAttached({ timeout: 5000 });

    const chatInput = await openChatWidget(page);
    await sendChatMessage(page, chatInput, "Mở giúp tôi ô chọn cửa khẩu trong form đăng ký nhanh");

    const cursor = page.locator('[data-testid="virtual-cursor"]');
    await expect(cursor, "Cursor ảo phải xuất hiện").toBeVisible({ timeout: AI_RESPONSE_TIMEOUT });

    await expect(target, "Select phải mở (aria-expanded=true) sau khi AI click").toHaveAttribute(
      "aria-expanded",
      "true",
      { timeout: 5000 }
    );
  });

  test("Port Case 2 — chọn cửa khẩu Tân Sơn Nhất (có value)", async ({ page }) => {
    const target = page.locator('[data-ai-element="quick_apply_port"]');
    await expect(target, "SelectTrigger cửa khẩu phải tồn tại trên Home").toBeAttached({ timeout: 5000 });

    const chatInput = await openChatWidget(page);
    await sendChatMessage(page, chatInput, "Chọn giúp tôi cửa khẩu Tân Sơn Nhất trong form đăng ký nhanh");

    const cursor = page.locator('[data-testid="virtual-cursor"]');
    await expect(cursor, "Cursor ảo phải xuất hiện").toBeVisible({ timeout: AI_RESPONSE_TIMEOUT });

    await expect(target, "SelectTrigger phải đóng lại sau khi chọn xong").toHaveAttribute(
      "aria-expanded",
      "false",
      { timeout: 15000 }
    );
    // NOTE: SelectValue hiển thị TÊN đầy đủ (p.name), không phải mã code (p.code) — value="SGN"
    // chỉ là giá trị nội bộ của Select/data-value trên SelectItem, không phải text hiển thị.
    await expect(target, "SelectValue phải hiển thị tên Tan Son Nhat").toContainText(
      "Tan Son Nhat",
      { timeout: 5000 }
    );
  });

  test("Port Case 3 — combo: đang ở /about-us, chuyển về Home rồi chọn cửa khẩu", async ({ page }) => {
    await page.goto("/about-us", { waitUntil: "domcontentloaded" });
    const target = page.locator('[data-ai-element="quick_apply_port"]');

    const chatInput = await openChatWidget(page);
    await sendChatMessage(page, chatInput, "Chọn giúp tôi cửa khẩu Đà Nẵng trong form đăng ký nhanh");

    await page.waitForURL((url) => url.pathname === "/", { timeout: AI_RESPONSE_TIMEOUT, waitUntil: "commit" });

    const cursor = page.locator('[data-testid="virtual-cursor"]');
    await expect(cursor, "Cursor ảo phải xuất hiện trên trang mới").toBeVisible({ timeout: AI_RESPONSE_TIMEOUT });

    await expect(
      target,
      "SelectValue phải hiển thị tên Da Nang sau combo navigate+select"
    ).toContainText("Da Nang", { timeout: 15000 });
  });

  test("Port Case 4 — mã cửa khẩu không tồn tại → không action giả", async ({ page }) => {
    const chatInput = await openChatWidget(page);
    await sendChatMessage(page, chatInput, "Chọn giúp tôi cửa khẩu mã 'ZZZ' trong form đăng ký nhanh");

    // Chờ AI phản hồi bằng text xin lỗi/hỏi lại — không có cursor ảo nào xuất hiện cho hành động chọn giả
    const cursor = page.locator('[data-testid="virtual-cursor"]');
    await page.waitForTimeout(5000);
    await expect(cursor, "Không được xuất hiện cursor ảo khi mã cửa khẩu không hợp lệ").not.toBeVisible();
  });
});

test.describe("focus_ui_field — nhóm Select: visa_option (Real AI Message)", () => {
  test.setTimeout(120_000);

  test.beforeEach(async ({ page }) => {
    page.on("dialog", (d) => d.dismiss());
    page.on("console", (msg) => console.log(`[Browser] ${msg.type()}: ${msg.text()}`));
    await page.goto("/", { waitUntil: "domcontentloaded" });
  });

  test("VisaOption Case 1 — mở field không kèm giá trị (open-only)", async ({ page }) => {
    const target = page.locator('[data-ai-element="quick_apply_visa_option"]');
    await expect(target, "SelectTrigger loại visa phải tồn tại trên Home").toBeAttached({ timeout: 5000 });

    const chatInput = await openChatWidget(page);
    await sendChatMessage(page, chatInput, "Mở giúp tôi ô chọn loại visa trong form đăng ký nhanh");

    const cursor = page.locator('[data-testid="virtual-cursor"]');
    await expect(cursor, "Cursor ảo phải xuất hiện").toBeVisible({ timeout: AI_RESPONSE_TIMEOUT });

    await expect(target, "Select phải mở sau khi AI click").toHaveAttribute("aria-expanded", "true", {
      timeout: 5000,
    });
  });

  test("VisaOption Case 2 — chọn E-Visa 30 ngày 1 lần (có value)", async ({ page }) => {
    const target = page.locator('[data-ai-element="quick_apply_visa_option"]');
    await expect(target, "SelectTrigger loại visa phải tồn tại trên Home").toBeAttached({ timeout: 5000 });

    const chatInput = await openChatWidget(page);
    await sendChatMessage(page, chatInput, "Chọn giúp tôi loại visa E-Visa 30 ngày 1 lần trong form đăng ký nhanh");

    const cursor = page.locator('[data-testid="virtual-cursor"]');
    await expect(cursor, "Cursor ảo phải xuất hiện").toBeVisible({ timeout: AI_RESPONSE_TIMEOUT });

    await expect(target, "SelectTrigger phải đóng lại sau khi chọn xong").toHaveAttribute(
      "aria-expanded",
      "false",
      { timeout: 15000 }
    );
    // NOTE: SelectItem render `{tc(v.label)} — $price` (QuickApplyFormFields.tsx:323), locale mặc định "en"
    // → i18n key evisa_30_single = "30 Days — Single Entry" (src/messages/en.json:61).
    await expect(target, "SelectTrigger phải hiển thị đúng loại visa đã chọn").toContainText("30 Days", {
      timeout: 5000,
    });
  });
});

test.describe("focus_ui_field — nhóm Select: processing_speed (Real AI Message)", () => {
  test.setTimeout(120_000);

  test.beforeEach(async ({ page }) => {
    page.on("dialog", (d) => d.dismiss());
    page.on("console", (msg) => console.log(`[Browser] ${msg.type()}: ${msg.text()}`));
    await page.goto("/", { waitUntil: "domcontentloaded" });
  });

  test("ProcessingSpeed Case 1 — mở field không kèm giá trị (open-only)", async ({ page }) => {
    const target = page.locator('[data-ai-element="quick_apply_processing_speed"]');
    await expect(target, "SelectTrigger tốc độ xử lý phải tồn tại trên Home").toBeAttached({ timeout: 5000 });

    const chatInput = await openChatWidget(page);
    await sendChatMessage(page, chatInput, "Mở giúp tôi ô chọn tốc độ xử lý trong form đăng ký nhanh");

    const cursor = page.locator('[data-testid="virtual-cursor"]');
    await expect(cursor, "Cursor ảo phải xuất hiện").toBeVisible({ timeout: AI_RESPONSE_TIMEOUT });

    await expect(target, "Select phải mở sau khi AI click").toHaveAttribute("aria-expanded", "true", {
      timeout: 5000,
    });
  });

  test("ProcessingSpeed Case 2 — chọn xử lý khẩn 4 ngày (có value)", async ({ page }) => {
    const target = page.locator('[data-ai-element="quick_apply_processing_speed"]');
    await expect(target, "SelectTrigger tốc độ xử lý phải tồn tại trên Home").toBeAttached({ timeout: 5000 });

    const chatInput = await openChatWidget(page);
    await sendChatMessage(page, chatInput, "Chọn giúp tôi tốc độ xử lý khẩn 4 ngày trong form đăng ký nhanh");

    const cursor = page.locator('[data-testid="virtual-cursor"]');
    await expect(cursor, "Cursor ảo phải xuất hiện").toBeVisible({ timeout: AI_RESPONSE_TIMEOUT });

    await expect(target, "SelectTrigger phải đóng lại sau khi chọn xong").toHaveAttribute(
      "aria-expanded",
      "false",
      { timeout: 15000 }
    );
    // NOTE: SelectItem render `{tc(p.label).split(" — ")[0]} (+$surcharge)` (QuickApplyFormFields.tsx:410),
    // locale mặc định "en" → i18n key urgent_4_days = "Urgent — 4 Working Days" (src/messages/en.json:69)
    // → split(" — ")[0] = "Urgent".
    await expect(target, "SelectTrigger phải hiển thị đúng tốc độ xử lý đã chọn").toContainText("Urgent", {
      timeout: 5000,
    });
  });
});
