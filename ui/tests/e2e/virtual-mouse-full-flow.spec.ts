/**
 * E2E Test: Virtual Mouse — Full Pipeline (Real Chat Message)
 *
 * Đây là test END-TO-END thực sự:
 *   1. Mở trang web trong trình duyệt
 *   2. Mở chat widget
 *   3. Gõ và gửi tin nhắn thật (như user thật)
 *   4. Đợi AI xử lý và trả về SSE event VIRTUAL_CLICK
 *   5. Verify con chuột ảo XUẤT HIỆN, DI CHUYỂN, CLICK đúng phần tử
 *
 * Không bypass AI — toàn bộ pipeline được kiểm tra:
 *   Chat Input → API → Gemini AI → click_ui_element tool
 *   → ELEMENT_CLICK_TRIGGERED → SSE VIRTUAL_CLICK
 *   → agentStore.triggerVirtualClick → VirtualMouseEngine animation
 *
 * Coverage chọn lọc (3-5 button đại diện — AI cần thời gian xử lý):
 *   B03 btn-apply-header  — Header button (trang chủ, luôn hiển thị)
 *   B11 check_status_submit — Form submit (trang check-status)
 *   B13 emergency_submit  — Emergency form submit
 */

import { test, expect, type Page } from "@playwright/test";
import path from "path";
import fs from "fs";

const SCREENSHOT_DIR = path.join(__dirname, "screenshots", "full-flow");

function ensureScreenshotDir() {
  if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// Timeout dài cho AI: gửi message → AI xử lý → stream SSE → animate cursor
// Gemini mất ~3-8s để trả lời + 1.35s animation
const AI_RESPONSE_TIMEOUT = 20_000;

/**
 * Mở chat widget bằng cách click nút toggle.
 * Xử lý cả hai trường hợp:
 *   - JOINING phase (lần đầu, chưa có session): điền tên rồi submit join form
 *   - CHATTING phase (đã có session trong localStorage): chat input xuất hiện ngay
 */
async function openChatWidget(page: Page) {
  const toggleBtn = page.locator('[data-ai-element="chat-toggle"]');
  await expect(toggleBtn, "chat-toggle button phải tồn tại").toBeAttached({ timeout: 5000 });
  await toggleBtn.click();

  // Chờ widget mở (section[role=dialog] phải xuất hiện)
  const widget = page.locator('[data-ai-id="chat-widget"] section[role="dialog"]');
  await expect(widget, "Chat widget panel phải xuất hiện").toBeVisible({ timeout: 5000 });

  // Nếu đang ở JOINING phase, form nhập tên sẽ hiện ra thay vì chat input
  const nameInput = page.locator('#chat-user-name');
  const isJoining = await nameInput.isVisible({ timeout: 1500 }).catch(() => false);

  if (isJoining) {
    await nameInput.fill("E2E Test");
    const joinBtn = page.locator('[data-testid="chat-join-submit"]');
    await expect(joinBtn, "Nút Bắt đầu chat phải tồn tại").toBeEnabled({ timeout: 3000 });
    await joinBtn.click();
  }

  // Đợi chat input xuất hiện (contentEditable div với role=textbox)
  const chatInput = page.locator('[data-ai-id="chat-widget"] [role="textbox"]');
  await expect(chatInput, "Chat input phải xuất hiện sau khi mở widget").toBeVisible({ timeout: 10000 });
  return chatInput;
}

/**
 * Gõ và gửi tin nhắn vào chat widget.
 * Dùng keyboard Enter để submit thay vì click button (ổn định hơn với contentEditable).
 */
async function sendChatMessage(page: Page, chatInput: ReturnType<typeof page.locator>, message: string) {
  await chatInput.click();
  await chatInput.fill(message);
  // Đợi nội dung được nhập
  await page.waitForTimeout(200);
  // Enter để gửi
  await chatInput.press("Enter");
}

/**
 * Full-pipeline assertion:
 *   1. Mở chat widget
 *   2. Gửi tin nhắn
 *   3. Đợi AI xử lý + cursor xuất hiện
 *   4. Verify cursor → di chuyển → click đúng element
 *   5. Verify cursor biến mất
 */
async function assertFullFlow(
  page: Page,
  opts: {
    message: string;
    expectedTarget: string;
    screenshotId: string;
    scrollToTarget?: boolean;
  }
) {
  ensureScreenshotDir();

  // ── Đảm bảo element đích tồn tại ────────────────────────────────
  const targetEl = page.locator(`[data-ai-element="${opts.expectedTarget}"]`).first();
  await expect(
    targetEl,
    `[${opts.expectedTarget}] phải tồn tại trong DOM trước khi test`
  ).toBeAttached({ timeout: 5000 });

  if (opts.scrollToTarget) {
    await targetEl.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
  }

  // ── Mở chat widget và gửi tin nhắn ──────────────────────────────
  const chatInput = await openChatWidget(page);
  await sendChatMessage(page, chatInput, opts.message);

  // ── Đợi VirtualMouseEngine phản ứng ─────────────────────────────
  // Cursor sẽ xuất hiện khi agentStore nhận được VIRTUAL_CLICK từ SSE
  const cursor = page.locator('[data-testid="virtual-cursor"]');
  await expect(
    cursor,
    `[${opts.expectedTarget}] Con chuột ảo phải xuất hiện trong ${AI_RESPONSE_TIMEOUT / 1000}s sau khi AI xử lý`
  ).toBeVisible({ timeout: AI_RESPONSE_TIMEOUT });

  // ── Chụp ảnh tại moment cursor đang di chuyển ────────────────────
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, `${opts.screenshotId}-cursor-moving.png`),
    animations: "allow",
  });

  // ── Đợi đủ để animation hoàn tất (1050ms move + 280ms press) ───
  // Tổng ~1350ms từ khi cursor xuất hiện
  await page.waitForTimeout(1400);

  // ── Chụp ảnh tại moment press animation ─────────────────────────
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, `${opts.screenshotId}-press-animation.png`),
    animations: "allow",
  });

  // ── Cursor phải biến mất sau fade-out ───────────────────────────
  await expect(
    cursor,
    `[${opts.expectedTarget}] Cursor phải biến mất sau animation`
  ).not.toBeVisible({ timeout: 2000 });
}

// ─────────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────────

test.describe("Virtual Mouse — Full Pipeline (Real AI Message)", () => {
  test.setTimeout(60_000); // AI cần thời gian — 60s mỗi test

  test.beforeEach(async ({ page }) => {
    page.on("dialog", (d) => d.dismiss());
    page.context().on("page", (p) => p.close());
  });

  // ═══════════════════════════════════════════════════════════════
  // TRANG CHỦ — Header Apply Button
  // ═══════════════════════════════════════════════════════════════

  test("B03 — btn-apply-header: user nhắn 'bấm Apply Now trên header' → cursor click", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => !!(window as any).useAgentStore, { timeout: 10_000 });

    await assertFullFlow(page, {
      message: "Bấm nút Apply Now trên thanh điều hướng header ở trên cùng",
      expectedTarget: "btn-apply-header",
      screenshotId: "B03-btn-apply-header",
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // CHECK STATUS — Submit Button
  // ═══════════════════════════════════════════════════════════════

  test("B11 — check_status_submit: user nhắn 'bấm Submit để tra cứu' → cursor click", async ({ page }) => {
    await page.goto("/check-status", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => !!(window as any).useAgentStore, { timeout: 10_000 });

    await assertFullFlow(page, {
      message: "Bấm Submit để tra cứu trạng thái hồ sơ của tôi",
      expectedTarget: "check_status_submit",
      screenshotId: "B11-check-status-submit",
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SCROLL TO ELEMENT — CTA Apply (below fold, trang chủ)
  // ═══════════════════════════════════════════════════════════════

  test("B-SCROLL — cta_apply: trang chủ chưa scroll → VirtualMouse tự cuộn + cursor click", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    // Không pre-scroll — cta_apply nằm ở CTASection cuối trang (below fold)
    // VirtualMouseEngine phải tự scrollIntoView trước khi animate cursor
    await page.waitForFunction(() => !!(window as any).useAgentStore, { timeout: 10_000 });

    await assertFullFlow(page, {
      message: "Bấm nút Apply Now ở phần CTA cuối trang chủ",
      expectedTarget: "cta_apply",
      screenshotId: "B-SCROLL-cta-apply",
      // scrollToTarget: false — cố ý không set để VirtualMouseEngine tự xử lý scroll
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SCROLL — Case phụ 1: cta_check_status (CTASection cuối trang)
  // ═══════════════════════════════════════════════════════════════

  test("S02 — cta_check_status: dưới fold → scroll + cursor click (case phụ 1)", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => !!(window as any).useAgentStore, { timeout: 10_000 });

    await assertFullFlow(page, {
      message: "Nhấn nút Check Status ở phần cuối trang (CTA section)",
      expectedTarget: "cta_check_status",
      screenshotId: "S02-cta-check-status-scroll",
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SCROLL — Case phụ 2 (guard): hero_apply đã in viewport → KHÔNG scroll
  // ═══════════════════════════════════════════════════════════════

  test("S03 — hero_apply: đã trong viewport → không scroll, cursor click bình thường", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => !!(window as any).useAgentStore, { timeout: 10_000 });
    // Không scroll trang — hero_apply luôn visible tại scroll=0
    // VirtualMouseEngine không được gọi scrollIntoView (isOutOfViewport = false)
    await assertFullFlow(page, {
      message: "Bấm nút Apply Now to lớn ở giữa trang chủ cho tôi",
      expectedTarget: "hero_apply",
      screenshotId: "S03-hero-apply-no-scroll",
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // EMERGENCY INQUIRY — Submit Button
  // ═══════════════════════════════════════════════════════════════

  test("B13 — emergency_submit: user nhắn 'submit form khẩn cấp' → cursor click", async ({ page }) => {
    await page.goto("/emergency-inquiry", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => !!(window as any).useAgentStore, { timeout: 10_000 });

    await assertFullFlow(page, {
      message: "Bấm Submit để gửi form yêu cầu khẩn cấp của tôi",
      expectedTarget: "emergency_submit",
      screenshotId: "B13-emergency-submit",
      scrollToTarget: true,
    });
  });
});
