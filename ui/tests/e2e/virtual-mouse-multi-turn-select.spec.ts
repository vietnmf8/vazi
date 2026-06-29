/**
 * E2E Test: focus_ui_field — Multi-turn cùng 1 session, verify cả tầng UI (2026-06-24)
 *
 * Phát hiện 2026-06-24: mọi Playwright spec trước giờ (Phase 2 + Phase 3) đều mở 1 trang/session
 * MỚI cho mỗi case (`test.beforeEach` luôn `page.goto`/join lại) — không có spec nào gửi NHIỀU
 * yêu cầu chọn giá trị KHÁC NHAU liên tiếp trong CÙNG 1 cửa sổ chat đang mở (đúng cách user thật
 * điền form: chọn quốc tịch → chọn cửa khẩu → chọn loại visa... trong 1 phiên chat duy nhất).
 *
 * Rủi ro đã phát hiện qua log thật: khi lịch sử hội thoại đã có 1 lượt gọi tool THÀNH CÔNG,
 * Gemini có xu hướng "lazy success continuation" — trả lời text khẳng định đã chọn xong ở lượt
 * sau mà KHÔNG thực sự gọi lại tool (UI không đổi gì). Đã vá bằng directive bắt buộc trong
 * description tool (focus-ui-field.tool.ts). File này verify ở tầng UI thật: mở chat 1 LẦN, gửi
 * nhiều yêu cầu liên tiếp KHÔNG đóng/mở lại widget, xác nhận MỖI lượt đều đổi đúng DOM.
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
    await nameInput.fill("E2E Multi-Turn Test");
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

test.describe("focus_ui_field — Multi-turn cùng 1 session (Real AI Message)", () => {
  // 3-5 lượt AI thật liên tiếp trong 1 test — budget thời gian rộng hơn các spec single-turn.
  test.setTimeout(180_000);

  test.beforeEach(async ({ page }) => {
    page.on("dialog", (d) => d.dismiss());
    page.on("console", (msg) => console.log(`[Browser] ${msg.type()}: ${msg.text()}`));
    await page.goto("/", { waitUntil: "domcontentloaded" });
  });

  test("MT1 — 3 lượt chọn quốc gia KHÁC NHAU liên tiếp, KHÔNG đóng/mở lại chat", async ({ page }) => {
    const target = page.locator('[data-ai-element="quick_apply_nationality"]');
    await expect(target, "Combobox quốc tịch phải tồn tại").toBeAttached({ timeout: 5000 });

    // Mở chat 1 LẦN duy nhất cho cả 3 lượt — đúng cách user thật giữ 1 cửa sổ chat mở liên tục.
    const chatInput = await openChatWidget(page);

    await sendChatMessage(page, chatInput, "Chọn giúp tôi quốc tịch Việt Nam ở form đăng ký nhanh");
    await expect(target, "Lượt 1: phải hiện Vietnam").toHaveValue("Vietnam", { timeout: AI_RESPONSE_TIMEOUT });

    await sendChatMessage(page, chatInput, "Giúp tôi chọn quốc tịch Venezuela");
    await expect(target, "Lượt 2: phải đổi sang Venezuela (KHÔNG được giữ nguyên Vietnam)").toHaveValue(
      "Venezuela",
      { timeout: AI_RESPONSE_TIMEOUT }
    );

    await sendChatMessage(page, chatInput, "Chọn giúp tôi quốc tịch Hàn Quốc");
    await expect(target, "Lượt 3: phải đổi sang South Korea").toHaveValue("South Korea", {
      timeout: AI_RESPONSE_TIMEOUT,
    });
  });

  test("MT2 — xen kẽ 4 field khác nhau (nationality → port → visa_option → speed), cùng 1 session", async ({
    page,
  }) => {
    const nationalityTrigger = page.locator('[data-ai-element="quick_apply_nationality"]');
    const portTrigger = page.locator('[data-ai-element="quick_apply_port"]');
    const visaOptionTrigger = page.locator('[data-ai-element="quick_apply_visa_option"]');
    const speedTrigger = page.locator('[data-ai-element="quick_apply_processing_speed"]');

    const chatInput = await openChatWidget(page);

    await sendChatMessage(page, chatInput, "Chọn giúp tôi quốc tịch Việt Nam ở form đăng ký nhanh");
    await expect(nationalityTrigger, "Quốc tịch phải đổi sang Vietnam").toHaveValue("Vietnam", {
      timeout: AI_RESPONSE_TIMEOUT,
    });

    await sendChatMessage(page, chatInput, "Chọn giúp tôi cửa khẩu Tân Sơn Nhất trong form đăng ký nhanh");
    await expect(portTrigger, "Cửa khẩu phải hiển thị Tan Son Nhat").toContainText("Tan Son Nhat", {
      timeout: AI_RESPONSE_TIMEOUT,
    });

    await sendChatMessage(page, chatInput, "Chọn giúp tôi loại visa E-Visa 30 ngày 1 lần trong form đăng ký nhanh");
    await expect(visaOptionTrigger, "Loại visa phải hiển thị 30 Days").toContainText("30 Days", {
      timeout: AI_RESPONSE_TIMEOUT,
    });

    await sendChatMessage(page, chatInput, "Chọn giúp tôi tốc độ xử lý khẩn 4 ngày trong form đăng ký nhanh");
    await expect(speedTrigger, "Tốc độ xử lý phải hiển thị Urgent").toContainText("Urgent", {
      timeout: AI_RESPONSE_TIMEOUT,
    });

    // Xác nhận lại quốc tịch lượt đầu KHÔNG bị các lượt sau ghi đè nhầm — guard chống regression chéo field.
    await expect(nationalityTrigger, "Quốc tịch vẫn phải giữ Vietnam sau 3 lượt chọn field khác").toHaveValue(
      "Vietnam"
    );
  });
});
