/**
 * E2E Test: Virtual Mouse — COMBO Navigate+Click Full Pipeline (2026-06-22)
 *
 * Mở rộng virtual-mouse-full-flow.spec.ts cho 2 case còn lại của combo:
 *   Case 3 — Click button ở TRANG KHÁC, hiện ngay khi sang trang (không cần scroll đích)
 *   Case 4 — Click button ở TRANG KHÁC, PHẢI cuộn sau khi sang trang
 *
 * Pipeline thật, không mock:
 *   Chat Input (đang ở trang A) → API → Gemini AI → click_ui_element tool
 *   → NAVIGATE_AND_CLICK_TRIGGERED → SSE { action:"NAVIGATE_AND_CLICK", destination, target }
 *   → useChat.ts: router.push(destination) → agentStore.triggerVirtualClick (sau 600ms)
 *   → VirtualMouseEngine: retry-poll tìm element (tối đa ~1.5s) → scroll-nếu-cần → cursor → click
 *
 * Đây là phần KHÔNG thể verify ở Tầng 1 (API E2E thuần HTTP) vì cần browser thật để xác nhận:
 *   - URL trình duyệt có đổi đúng sang destination không
 *   - VirtualMouseEngine có tìm thấy element TRÊN TRANG MỚI (retry-poll) không
 *   - Có scroll đúng khi element nằm dưới fold của trang mới không
 */

import { test, expect, type Page } from "@playwright/test";
import path from "path";
import fs from "fs";

const SCREENSHOT_DIR = path.join(__dirname, "screenshots", "combo-flow");

function ensureScreenshotDir() {
  if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// Timeout dài hơn full-flow thường: cần cộng thêm thời gian navigate + retry-poll mount trang mới
const AI_RESPONSE_TIMEOUT = 25_000;

async function openChatWidget(page: Page) {
  const toggleBtn = page.locator('[data-ai-element="chat-toggle"]');
  await expect(toggleBtn, "chat-toggle button phải tồn tại").toBeAttached({ timeout: 5000 });
  await toggleBtn.click();

  const widget = page.locator('[data-ai-id="chat-widget"] section[role="dialog"]');
  await expect(widget, "Chat widget panel phải xuất hiện").toBeVisible({ timeout: 5000 });

  const nameInput = page.locator('#chat-user-name');
  const isJoining = await nameInput.isVisible({ timeout: 1500 }).catch(() => false);

  if (isJoining) {
    await nameInput.fill("E2E Combo Test");
    const joinBtn = page.locator('[data-testid="chat-join-submit"]');
    await expect(joinBtn, "Nút Bắt đầu chat phải tồn tại").toBeEnabled({ timeout: 3000 });
    await joinBtn.click();
  }

  const chatInput = page.locator('[data-ai-id="chat-widget"] [role="textbox"]');
  await expect(chatInput, "Chat input phải xuất hiện sau khi mở widget").toBeVisible({ timeout: 10000 });
  return chatInput;
}

async function sendChatMessage(page: Page, chatInput: ReturnType<typeof page.locator>, message: string) {
  await chatInput.click();
  await chatInput.fill(message);
  await page.waitForTimeout(200);
  await chatInput.press("Enter");
}

/**
 * Full-pipeline assertion cho combo NAVIGATE_AND_CLICK:
 *   1. Mở chat widget TẠI trang xuất phát (startUrl)
 *   2. Gửi tin nhắn yêu cầu click 1 nút ở trang khác
 *   3. Verify URL trình duyệt đổi sang expectedDestination
 *   4. Verify cursor xuất hiện trên trang MỚI (retry-poll phải hoạt động) → di chuyển → click
 *   5. Verify cursor biến mất
 */
async function assertComboFlow(
  page: Page,
  opts: {
    startUrl: string;
    message: string;
    expectedDestination: string;
    expectedTarget: string;
    screenshotId: string;
  }
) {
  ensureScreenshotDir();

  await page.goto(opts.startUrl, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => !!(window as any).useAgentStore, { timeout: 10_000 });

  const chatInput = await openChatWidget(page);
  await sendChatMessage(page, chatInput, opts.message);

  // ── Verify điều hướng thật sang trang đích ──────────────────────
  // waitUntil mặc định là "load" — KHÔNG dùng được vì router.push() của Next.js là
  // client-side History API navigation, không bao giờ bắn ra sự kiện "load" của browser.
  // "commit" khớp với bất kỳ điều hướng nào (kể cả History API) ngay khi URL đổi.
  await page.waitForURL(
    (url) => url.pathname === opts.expectedDestination,
    { timeout: AI_RESPONSE_TIMEOUT, waitUntil: "commit" }
  );

  // ── Verify element đích thực sự tồn tại TRÊN TRANG MỚI ──────────
  const targetEl = page.locator(`[data-ai-element="${opts.expectedTarget}"]`).first();
  await expect(
    targetEl,
    `[${opts.expectedTarget}] phải tồn tại trên trang ${opts.expectedDestination} sau khi navigate`
  ).toBeAttached({ timeout: 5000 });

  // ── Cursor phải xuất hiện — đây chính là phần retry-poll đang được test ──
  const cursor = page.locator('[data-testid="virtual-cursor"]');
  await expect(
    cursor,
    `[${opts.expectedTarget}] Cursor phải xuất hiện sau combo navigate+click (kể cả khi trang mới chưa mount xong ngay lúc trigger)`
  ).toBeVisible({ timeout: AI_RESPONSE_TIMEOUT });

  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, `${opts.screenshotId}-after-navigate-cursor.png`),
    animations: "allow",
  });

  await page.waitForTimeout(1400);

  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, `${opts.screenshotId}-press-animation.png`),
    animations: "allow",
  });

  await expect(
    cursor,
    `[${opts.expectedTarget}] Cursor phải biến mất sau animation`
  ).not.toBeVisible({ timeout: 2000 });
}

test.describe("Virtual Mouse — Combo Navigate+Click (Real AI Message)", () => {
  test.setTimeout(70_000); // navigate + retry-poll + AI response time

  test.beforeEach(async ({ page }) => {
    page.on("dialog", (d) => d.dismiss());
    page.context().on("page", (p) => p.close());
  });

  // ═══════════════════════════════════════════════════════════════
  // CASE 3 — Khác trang, element hiện ngay (KHÔNG cần scroll trên đích)
  // ═══════════════════════════════════════════════════════════════

  test("C03 — contact_submit: đang ở /about-us, bấm Send form liên hệ → navigate /contact-us + click", async ({ page }) => {
    await assertComboFlow(page, {
      startUrl: "/about-us",
      message: "Bấm Submit để gửi form liên hệ giúp tôi",
      expectedDestination: "/contact-us",
      expectedTarget: "contact_submit",
      screenshotId: "C03-contact-submit-combo",
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // CASE 4 — Khác trang, element PHẢI cuộn sau khi mount trang mới
  // ═══════════════════════════════════════════════════════════════

  test("C05 — emergency_correction_whatsapp: đang ở Home, bấm WhatsApp sửa hồ sơ (dưới fold của /emergency-inquiry)", async ({ page }) => {
    await assertComboFlow(page, {
      startUrl: "/",
      message: "Bấm nút WhatsApp màu xanh lá để sửa thông tin hồ sơ khẩn cấp",
      expectedDestination: "/emergency-inquiry",
      expectedTarget: "emergency_correction_whatsapp",
      screenshotId: "C05-emergency-whatsapp-combo-scroll",
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // EDGE 5.1 — Target đa-trang (continue_to_apply): đang ở trang KHÔNG
  // thuộc map sở hữu → phải navigate đến route đầu tiên trong map ("/")
  // ═══════════════════════════════════════════════════════════════

  test("E02 — continue_to_apply: đang ở /about-us (không sở hữu target) → navigate về Home + click", async ({ page }) => {
    await assertComboFlow(page, {
      startUrl: "/about-us",
      message: "Bấm nút Continue to Apply để bắt đầu đăng ký",
      expectedDestination: "/",
      expectedTarget: "continue_to_apply",
      screenshotId: "E02-continue-to-apply-combo",
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // ĐA DẠNG VĂN PHONG — câu lịch sự kiểu "làm ơn", xuất phát từ /faqs
  // ═══════════════════════════════════════════════════════════════

  test("C10 — check_status_submit: đang ở /faqs, yêu cầu lịch sự 'làm ơn' → navigate /check-status + click", async ({ page }) => {
    await assertComboFlow(page, {
      startUrl: "/faqs",
      message: "Làm ơn giúp tôi bấm nút tra cứu trạng thái hồ sơ",
      expectedDestination: "/check-status",
      expectedTarget: "check_status_submit",
      screenshotId: "C10-check-status-submit-combo",
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // ĐA DẠNG NGÔN NGỮ — tiếng Anh, xuất phát từ trang không liên quan
  // ═══════════════════════════════════════════════════════════════

  test("E07 — emergency_correction_whatsapp (English): đang ở /contact-us → navigate /emergency-inquiry + click", async ({ page }) => {
    await assertComboFlow(page, {
      startUrl: "/contact-us",
      message: "Please click the WhatsApp button to fix my profile information.",
      expectedDestination: "/emergency-inquiry",
      expectedTarget: "emergency_correction_whatsapp",
      screenshotId: "E07-emergency-whatsapp-en-combo",
    });
  });
});
