/**
 * E2E Test: Virtual Mouse — Scroll to Element Flow (Track B Feature #4)
 *
 * Test chuyên biệt cho tính năng scroll: xác nhận VirtualMouseEngine
 * tự cuộn trang đến phần tử trước khi animate cursor.
 *
 * Điểm khác với virtual-mouse-full-flow.spec.ts:
 *   - assertScrollFlow() kiểm tra window.scrollY trước/sau để verify
 *     scroll THỰC SỰ xảy ra (hoặc không xảy ra với guard cases)
 *   - Cố ý KHÔNG pre-scroll để VirtualMouseEngine phải tự xử lý
 *
 * Cấu trúc:
 *   SC — Scroll Case: element dưới fold → scrollIntoView + cursor
 *   SV — Scroll Variant: biến thể message, cùng scroll behavior
 *   SG — Scroll Guard: element đã in viewport → không scroll, cursor bình thường
 */

import { test, expect, type Page } from "@playwright/test";
import path from "path";
import fs from "fs";

const SCROLL_SCREENSHOT_DIR = path.join(__dirname, "screenshots", "scroll-flow");

function ensureDir() {
  if (!fs.existsSync(SCROLL_SCREENSHOT_DIR)) fs.mkdirSync(SCROLL_SCREENSHOT_DIR, { recursive: true });
}

const AI_RESPONSE_TIMEOUT = 20_000;

// ─────────────────────────────────────────────────────────────────
// Helpers — clone từ virtual-mouse-full-flow.spec.ts
// ─────────────────────────────────────────────────────────────────

async function openChatWidget(page: Page) {
  const toggleBtn = page.locator('[data-ai-element="chat-toggle"]');
  await expect(toggleBtn, "chat-toggle phải tồn tại").toBeAttached({ timeout: 5000 });
  await toggleBtn.click();

  const widget = page.locator('[data-ai-id="chat-widget"] section[role="dialog"]');
  await expect(widget, "Chat widget panel phải xuất hiện").toBeVisible({ timeout: 5000 });

  const nameInput = page.locator('#chat-user-name');
  const isJoining = await nameInput.isVisible({ timeout: 1500 }).catch(() => false);
  if (isJoining) {
    await nameInput.fill("Scroll Test");
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

// ─────────────────────────────────────────────────────────────────
// assertScrollFlow — wrapper chính, có thêm kiểm tra scrollY
// ─────────────────────────────────────────────────────────────────

async function assertScrollFlow(
  page: Page,
  opts: {
    message: string;
    expectedTarget: string;
    screenshotId: string;
    expectScroll: boolean; // true = element dưới fold, VirtualMouse phải scroll
  }
) {
  ensureDir();

  // ① Element tồn tại trong DOM
  const targetEl = page.locator(`[data-ai-element="${opts.expectedTarget}"]`).first();
  await expect(
    targetEl,
    `[${opts.expectedTarget}] phải tồn tại trong DOM trước khi test`
  ).toBeAttached({ timeout: 5000 });

  // ② Ghi nhớ scrollY trước khi gửi tin nhắn
  const scrollBefore = await page.evaluate(() => window.scrollY);

  // ③ Mở chat và gửi tin nhắn
  const chatInput = await openChatWidget(page);
  await sendChatMessage(page, chatInput, opts.message);

  // ④ Chờ VirtualMouseEngine kích hoạt cursor
  // Cursor xuất hiện SAU khi scroll hoàn tất (scrollDelay=700ms)
  const cursor = page.locator('[data-testid="virtual-cursor"]');
  await expect(
    cursor,
    `Cursor phải xuất hiện trong ${AI_RESPONSE_TIMEOUT / 1000}s`
  ).toBeVisible({ timeout: AI_RESPONSE_TIMEOUT });

  // ⑤ Đọc scrollY sau scroll
  // TẠI SAO dùng expect.poll thay vì waitForTimeout(600) + check 1 lần: trước đây giả định
  // smooth scroll luôn xong trong 600ms sau khi cursor xuất hiện — dưới tải nặng (chạy nhiều
  // file Playwright liên tiếp, nhiều lệnh Gemini thật) layout/paint có thể bị trễ hơn mốc này,
  // fixed sleep + check 1 lần không có cơ hội phục hồi (root cause thật của flaky "SC01/SV01
  // cta_apply" đã ghi nhận trước đây — tái lập + xác nhận bằng log thật: "scrollY before=0
  // after=0" dù scroll instant theo thiết kế). Poll chủ động tới 3000ms, không đụng timing nội
  // bộ VirtualMouseEngine (đã tune đúng).
  if (opts.expectScroll) {
    // Element dưới fold → VirtualMouseEngine gọi scrollIntoView trước cursor
    await expect
      .poll(() => page.evaluate(() => window.scrollY), {
        message: `[${opts.expectedTarget}] scrollY phải tăng > 100px sau scroll (before=${scrollBefore})`,
        timeout: 3000,
      })
      .toBeGreaterThan(scrollBefore + 100);
  } else {
    // Element đã trong viewport → KHÔNG scroll, scrollY giữ nguyên — kiểm tra ngay, không cần poll
    const scrollAfter = await page.evaluate(() => window.scrollY);
    expect(
      scrollAfter,
      `[${opts.expectedTarget}] scrollY phải giữ nguyên (element trong viewport) ` +
      `(before=${scrollBefore}, after=${scrollAfter})`
    ).toBeLessThanOrEqual(scrollBefore + 10);
  }

  // ⑥ Screenshot cursor đang di chuyển
  await page.screenshot({
    path: path.join(SCROLL_SCREENSHOT_DIR, `${opts.screenshotId}-cursor-moving.png`),
    animations: "allow",
  });

  // ⑦ Chờ animation hoàn tất (1050ms move + 300ms press = ~1350ms tổng)
  await page.waitForTimeout(1400);

  // ⑧ Screenshot tại moment press
  await page.screenshot({
    path: path.join(SCROLL_SCREENSHOT_DIR, `${opts.screenshotId}-press-animation.png`),
    animations: "allow",
  });

  // ⑨ Cursor phải biến mất
  await expect(
    cursor,
    `Cursor phải biến mất sau animation`
  ).not.toBeVisible({ timeout: 2000 });
}

// ─────────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────────

test.describe("Virtual Mouse — Scroll to Element (Track B Feature #4)", () => {
  test.setTimeout(60_000);

  test.beforeEach(async ({ page }) => {
    page.on("dialog", (d) => d.dismiss());
    page.context().on("page", (p) => p.close());
    // Forward log [VirtualMouse] từ browser console ra terminal, đồng bộ
    // style với log [Intent Cache] phía API để xem chung một luồng
    page.on("console", (msg) => {
      const text = msg.text();
      if (text.startsWith("[VirtualMouse]")) console.log(text);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SC — SCROLL CASE: element dưới fold → VirtualMouse tự cuộn
  // Bắt đầu ở scrollY=0, không pre-scroll
  // ═══════════════════════════════════════════════════════════════

  test("SC01 — cta_apply: dưới fold → scrollIntoView + cursor click (case chính)", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => !!(window as any).useAgentStore, { timeout: 10_000 });
    // scrollY = 0, cta_apply ở ReadyToApplyCTA (section #9) → dưới fold

    await assertScrollFlow(page, {
      message: "Bấm nút Apply Now ở phần CTA cuối trang chủ",
      expectedTarget: "cta_apply",
      screenshotId: "SC01-cta-apply",
      expectScroll: true,
    });
  });

  test("SC02 — cta_check_status: dưới fold → scrollIntoView + cursor click (case chính 2)", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => !!(window as any).useAgentStore, { timeout: 10_000 });
    // scrollY = 0, cta_check_status ở CTASection (section #10) → dưới fold

    await assertScrollFlow(page, {
      message: "Nhấn nút Check Status ở phần cuối trang (CTA section)",
      expectedTarget: "cta_check_status",
      screenshotId: "SC02-cta-check-status",
      expectScroll: true,
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SV — SCROLL VARIANT: biến thể message, cùng scroll behavior
  // ═══════════════════════════════════════════════════════════════

  test("SV01 — cta_apply biến thể ngắn: 'bấm apply ở cuối trang' → scroll + click", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => !!(window as any).useAgentStore, { timeout: 10_000 });

    await assertScrollFlow(page, {
      message: "bấm apply ở cuối trang",
      expectedTarget: "cta_apply",
      screenshotId: "SV01-cta-apply-variant",
      expectScroll: true,
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SG — SCROLL GUARD: element đã trong viewport → KHÔNG scroll
  // Kiểm tra scroll feature KHÔNG phá vỡ button trong viewport
  // ═══════════════════════════════════════════════════════════════

  test("SG01 — hero_apply: đã trong viewport → scrollY giữ nguyên, cursor click bình thường", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => !!(window as any).useAgentStore, { timeout: 10_000 });
    // hero_apply nằm ngay Hero section (section #1) → luôn visible tại scrollY=0
    // isOutOfViewport = false → scrollDelay = 0, không gọi scrollIntoView

    await assertScrollFlow(page, {
      message: "Bấm nút Apply Now to lớn ở giữa trang chủ cho tôi",
      expectedTarget: "hero_apply",
      screenshotId: "SG01-hero-apply-guard",
      expectScroll: false,
    });
  });
});
