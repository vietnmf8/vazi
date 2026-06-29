/**
 * E2E Test: Virtual Mouse Engine — Button Coverage
 *
 * Mục tiêu: Kiểm tra TỪNG nút có data-ai-element trên toàn website:
 *   1. Phần tử tồn tại trong DOM tại đúng trang
 *   2. Con chuột ảo XUẤT HIỆN sau khi triggerVirtualClick()
 *   3. Con chuột DI CHUYỂN đến tọa độ nút (verified qua click xảy ra)
 *   4. Nút NHẬN click thật (el.click() được gọi)
 *   5. Button PRESS ANIMATION diễn ra (screenshot tại t=1100ms)
 *   6. Con chuột BIẾN MẤT sau animation hoàn tất
 *
 * Cách chạy:
 *   npm run test:e2e
 *
 * Buttons được test (17 always-visible buttons):
 *   hero_apply, hero_check_status, cta_apply, cta_check_status,
 *   continue_to_apply, btn-apply-header, header_check_status,
 *   lang-selector, chat-toggle, header_mobile_menu,
 *   how_to_apply_start, check_status_submit, contact_submit,
 *   emergency_submit, emergency_correction_whatsapp,
 *   faqs_submit_question, next_step2
 *
 * Buttons BỎ QUA (conditional — chỉ xuất hiện sau form success / step 2+):
 *   check_status_download, contact_send_another, emergency_ask_another,
 *   faqs_ask_another, apply_step2_back, next_step3, apply_step3_back, pay_with
 */

import { test, expect, type Page, type ConsoleMessage } from "@playwright/test";
import path from "path";
import fs from "fs";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SCREENSHOT_DIR = path.join(__dirname, "screenshots");

/**
 * Đảm bảo thư mục screenshots tồn tại.
 */
function ensureScreenshotDir() {
  if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

/**
 * Core helper: trigger virtual click cho một target, assert toàn bộ pipeline.
 *
 * Thứ tự kiểm tra:
 *   ① Element tồn tại trong DOM
 *   ② Cursor xuất hiện (data-testid="virtual-cursor" visible)
 *   ③ Click xảy ra (console log từ capture-phase listener)
 *   ④ Screenshot chụp tại t~1100ms để capture button press animation
 *   ⑤ Cursor biến mất sau fade-out
 */
async function assertVirtualClick(
  page: Page,
  target: string,
  opts: {
    scrollToElement?: boolean; // cuộn đến nút trước khi trigger
    screenshotSuffix?: string; // hậu tố cho tên screenshot
  } = {}
) {
  ensureScreenshotDir();
  const suffix = opts.screenshotSuffix ?? target;

  // ── ① Element tồn tại ────────────────────────────────────────────────────
  const el = page.locator(`[data-ai-element="${target}"]`).first();
  await expect(el, `[${target}] phải tồn tại trong DOM`).toBeAttached({ timeout: 5000 });

  if (opts.scrollToElement) {
    await el.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300); // chờ layout ổn định sau scroll
  }

  // ── Cài click spy qua console.log (sống sót qua navigation) ──────────────
  let clickCaptured = false;
  const consoleHandler = (msg: ConsoleMessage) => {
    if (msg.text() === `[VM_CLICK]${target}`) clickCaptured = true;
  };
  page.on("console", consoleHandler);

  await page.evaluate((t: string) => {
    const element = document.querySelector<HTMLElement>(`[data-ai-element="${t}"]`);
    if (!element) {
      console.error(`[VM_CLICK_ERROR] Element không tìm thấy: [data-ai-element="${t}"]`);
      return;
    }
    element.addEventListener(
      "click",
      () => console.log(`[VM_CLICK]${t}`),
      { capture: true, once: true }
    );
  }, target);

  // ── ② Trigger virtual click qua window.useAgentStore ──────────────────────
  const storeOk = await page.evaluate((t: string) => {
    const store = (window as unknown as { useAgentStore?: { getState: () => { triggerVirtualClick: (target: string, intent?: string, sessionId?: string) => void } } }).useAgentStore;
    if (!store) return false;
    store.getState().triggerVirtualClick(t, `e2e_test_${t}`, "playwright-session");
    return true;
  }, target);

  expect(storeOk, `window.useAgentStore phải khả dụng (agentStore chưa expose?)`).toBe(true);

  // ── ③ Cursor xuất hiện ───────────────────────────────────────────────────
  const cursor = page.locator('[data-testid="virtual-cursor"]');
  await expect(cursor, `[${target}] cursor phải xuất hiện`).toBeVisible({ timeout: 2000 });

  // ── ④ Đợi cursor di chuyển + click (t=1050ms) — chụp screenshot animation ─
  // Chờ đủ để animation move hoàn tất nhưng chụp ngay SAU khi click
  await page.waitForTimeout(1100);

  // Chụp screenshot tại thời điểm NGAY SAU click — button scale animation [1, 0.91, 1.03, 1]
  // đang chạy (duration 280ms), cursor đang press (scale 0.72, rotate -12°)
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, `${suffix}-press-animation.png`),
    animations: "allow",
  });

  // ── ⑤ Xác nhận click đã xảy ra ──────────────────────────────────────────
  expect(clickCaptured, `[${target}] el.click() phải được gọi bởi VirtualMouseEngine`).toBe(true);
  page.off("console", consoleHandler);

  // ── ⑥ Cursor biến mất sau fade-out (t=1350ms) ───────────────────────────
  await expect(cursor, `[${target}] cursor phải biến mất sau animation`).not.toBeVisible({
    timeout: 1500,
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

test.describe("Virtual Mouse Engine — Button Click Coverage", () => {

  test.beforeEach(async ({ page }) => {
    // Dismiss bất kỳ alert/confirm nào nếu browser trigger
    page.on("dialog", (d) => d.dismiss());
    // Không block tab mới — chỉ đóng ngay để tránh bị treo
    page.context().on("page", (p) => p.close());
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TRANG CHỦ — Home (/)
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe("Home Page (/)", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/", { waitUntil: "domcontentloaded" });
      // Đợi Zustand store được inject vào window
      await page.waitForFunction(() => !!(window as any).useAgentStore, { timeout: 10_000 });
    });

    test("hero_apply — cursor xuất hiện, di chuyển, click Apply Now (Hero)", async ({ page }) => {
      await assertVirtualClick(page, "hero_apply");
    });

    test("hero_check_status — cursor click Check Status (Hero)", async ({ page }) => {
      await assertVirtualClick(page, "hero_check_status");
    });

    test("btn-apply-header — cursor click Apply Now (Header)", async ({ page }) => {
      await assertVirtualClick(page, "btn-apply-header");
    });

    test("header_check_status — cursor click Check Status (Header link)", async ({ page }) => {
      await assertVirtualClick(page, "header_check_status");
    });

    test("lang-selector — cursor click Language Selector (Header)", async ({ page }) => {
      await assertVirtualClick(page, "lang-selector");
    });

    test("chat-toggle — cursor click Chat Toggle button", async ({ page }) => {
      await assertVirtualClick(page, "chat-toggle");
    });

    test("cta_apply — cursor scroll đến + click CTA Apply Now", async ({ page }) => {
      await assertVirtualClick(page, "cta_apply", { scrollToElement: true });
    });

    test("cta_check_status — cursor scroll đến + click CTA Check Status", async ({ page }) => {
      await assertVirtualClick(page, "cta_check_status", { scrollToElement: true });
    });

    test("continue_to_apply — cursor scroll đến + click Quick Apply Continue", async ({ page }) => {
      await assertVirtualClick(page, "continue_to_apply", { scrollToElement: true });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // MOBILE VIEWPORT — header_mobile_menu
  // ═══════════════════════════════════════════════════════════════════════════

  test("header_mobile_menu — cursor click Mobile Menu Toggle (viewport 390px)", async ({ browser }) => {
    // Tạo context riêng với viewport mobile
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    page.on("dialog", (d) => d.dismiss());
    ctx.on("page", (p) => p.close());

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => !!(window as any).useAgentStore, { timeout: 10_000 });

    await assertVirtualClick(page, "header_mobile_menu", { screenshotSuffix: "header_mobile_menu" });

    await ctx.close();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // HOW TO APPLY (/how-to-apply)
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe("How To Apply (/how-to-apply)", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/how-to-apply", { waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => !!(window as any).useAgentStore, { timeout: 10_000 });
    });

    test("how_to_apply_start — cursor scroll đến + click Start Application", async ({ page }) => {
      await assertVirtualClick(page, "how_to_apply_start", { scrollToElement: true });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CHECK STATUS (/check-status)
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe("Check Status (/check-status)", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/check-status", { waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => !!(window as any).useAgentStore, { timeout: 10_000 });
    });

    test("check_status_submit — cursor click Submit (Check Status form)", async ({ page }) => {
      await assertVirtualClick(page, "check_status_submit");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CONTACT US (/contact-us)
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe("Contact Us (/contact-us)", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/contact-us", { waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => !!(window as any).useAgentStore, { timeout: 10_000 });
    });

    test("contact_submit — cursor scroll đến + click Send (Contact form)", async ({ page }) => {
      await assertVirtualClick(page, "contact_submit", { scrollToElement: true });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EMERGENCY INQUIRY (/emergency-inquiry)
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe("Emergency Inquiry (/emergency-inquiry)", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/emergency-inquiry", { waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => !!(window as any).useAgentStore, { timeout: 10_000 });
    });

    test("emergency_submit — cursor scroll đến + click Submit (Emergency form)", async ({ page }) => {
      await assertVirtualClick(page, "emergency_submit", { scrollToElement: true });
    });

    test("emergency_correction_whatsapp — cursor scroll đến + click WhatsApp (Correction)", async ({ page }) => {
      await assertVirtualClick(page, "emergency_correction_whatsapp", { scrollToElement: true });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FAQS (/faqs)
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe("FAQs (/faqs)", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/faqs", { waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => !!(window as any).useAgentStore, { timeout: 10_000 });
    });

    test("faqs_submit_question — cursor scroll đến + click Submit Question (FAQs form)", async ({ page }) => {
      await assertVirtualClick(page, "faqs_submit_question", { scrollToElement: true });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // APPLY FLOW (/apply)
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe("Apply Flow (/apply)", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/apply", { waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => !!(window as any).useAgentStore, { timeout: 10_000 });
    });

    test("next_step2 — cursor click Next Step button (Step 1 sidebar)", async ({ page }) => {
      // next_step2 là sidebar button ở step 1 — luôn hiển thị khi vào /apply
      await assertVirtualClick(page, "next_step2");
    });
  });
});
