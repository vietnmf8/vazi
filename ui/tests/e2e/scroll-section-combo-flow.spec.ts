/**
 * E2E Test: Scroll Section — Combo Navigate+Scroll Full Pipeline (2026-06-22)
 *
 * Mở rộng virtual-mouse-combo-flow.spec.ts (vốn test combo click) cho tool `scroll_page` mới
 * có combo logic — verify pipeline THẬT, không mock:
 *
 *   Chat Input (đang ở trang A) → API → Gemini AI → scroll_page tool
 *   → NAVIGATE_AND_SCROLL_TRIGGERED → SSE { action:"NAVIGATE_AND_SCROLL", destination, target }
 *   → useChat.ts: router.push(destination) → agentStore.triggerScrollPage (sau 600ms)
 *   → ScrollPageEngine: retry-poll tìm [data-ai-target] (tối đa ~1.5s) → scrollIntoView
 *
 * Đây là phần KHÔNG thể verify ở Tầng 1 (API E2E thuần HTTP, xem e2e-scroll-section-combo.mjs)
 * vì cần browser thật để xác nhận:
 *   - URL trình duyệt có đổi đúng sang destination không
 *   - ScrollPageEngine có tìm thấy section TRÊN TRANG MỚI (retry-poll vừa thêm) không
 *   - window.scrollY có thực sự tăng (scroll thật xảy ra) không
 */

import { test, expect, type Page } from "@playwright/test";

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
    await nameInput.fill("E2E Scroll Combo Test");
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
 * Full-pipeline assertion cho combo NAVIGATE_AND_SCROLL:
 *   1. Mở chat widget TẠI trang xuất phát (startUrl)
 *   2. Gửi tin nhắn yêu cầu xem 1 section ở trang khác
 *   3. Verify URL trình duyệt đổi sang expectedDestination
 *   4. Verify section đích tồn tại trên trang MỚI (retry-poll phải hoạt động)
 *   5. Verify window.scrollY thực sự tăng (scroll thật xảy ra)
 */
async function assertScrollComboFlow(
  page: Page,
  opts: {
    startUrl: string;
    message: string;
    expectedDestination: string;
    expectedTarget: string;
  }
) {
  await page.goto(opts.startUrl, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => !!(window as any).useAgentStore, { timeout: 10_000 });

  const chatInput = await openChatWidget(page);
  await sendChatMessage(page, chatInput, opts.message);

  // ── Verify điều hướng thật sang trang đích ──────────────────────
  // "commit" khớp với router.push() (Next.js client-side History API), không bao giờ bắn "load".
  await page.waitForURL(
    (url) => url.pathname === opts.expectedDestination,
    { timeout: AI_RESPONSE_TIMEOUT, waitUntil: "commit" }
  );

  // ── Verify section đích thực sự tồn tại TRÊN TRANG MỚI ──────────
  const targetEl = page.locator(`[data-ai-target="${opts.expectedTarget}"]`).first();
  await expect(
    targetEl,
    `[${opts.expectedTarget}] phải tồn tại trên trang ${opts.expectedDestination} sau khi navigate`
  ).toBeAttached({ timeout: 5000 });

  const scrollBefore = await page.evaluate(() => window.scrollY);

  // ── Chờ ScrollPageEngine retry-poll + scrollIntoView (combo trigger sau 600ms + scroll smooth) ──
  // TẠI SAO dùng expect.poll thay vì waitForTimeout(2200) + check 1 lần: dưới tải nặng (chạy
  // nhiều file Playwright liên tiếp) chuỗi retry-poll + scroll có thể trễ hơn 2200ms wall-clock —
  // fixed sleep + check 1 lần không có cơ hội phục hồi (cùng root cause với flaky "SC01/SV01
  // cta_apply"/"apply_step2_back" đã sửa). Poll chủ động tới 4000ms, không đụng ScrollPageEngine.
  await expect
    .poll(() => page.evaluate(() => window.scrollY), {
      message: `[${opts.expectedTarget}] scrollY phải thay đổi sau combo navigate+scroll trên trang mới (before=${scrollBefore})`,
      timeout: 4000,
    })
    .not.toBe(scrollBefore);
}

test.describe("Scroll Section — Combo Navigate+Scroll (Real AI Message)", () => {
  test.setTimeout(70_000);

  test.beforeEach(async ({ page }) => {
    page.on("dialog", (d) => d.dismiss());
    page.context().on("page", (p) => p.close());
    page.on("console", (msg) => {
      const text = msg.text();
      if (text.startsWith("[ScrollPage]")) console.log(text);
    });
  });

  test("SC-COMBO-01 — pricing_voa: đang ở Home, hỏi bảng giá VOA → navigate /guide/vietnam-visa-fees + scroll", async ({ page }) => {
    await assertScrollComboFlow(page, {
      startUrl: "/",
      message: "Cho tôi xem bảng giá VOA",
      expectedDestination: "/guide/vietnam-visa-fees",
      expectedTarget: "pricing_voa",
    });
  });

  test("SC-COMBO-02 — about_team: đang ở /contact-us, hỏi đội ngũ → navigate /about-us + scroll", async ({ page }) => {
    await assertScrollComboFlow(page, {
      startUrl: "/contact-us",
      message: "Cho tôi xem đội ngũ của FastVisa",
      expectedDestination: "/about-us",
      expectedTarget: "about_team",
    });
  });

  test("SC-COMBO-03 — emergency_pricing: đang ở Home, hỏi bảng giá khẩn cấp → navigate /emergency-inquiry + scroll", async ({ page }) => {
    await assertScrollComboFlow(page, {
      startUrl: "/",
      message: "Cho tôi xem bảng giá làm visa khẩn cấp",
      expectedDestination: "/emergency-inquiry",
      expectedTarget: "emergency_pricing",
    });
  });

  test("SC-COMBO-04 — FLEX: đang ở /about-us, hỏi quy trình thực hiện → navigate /how-to-apply (không combo về Home)", async ({ page }) => {
    await page.goto("/about-us", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => !!(window as any).useAgentStore, { timeout: 10_000 });

    const chatInput = await openChatWidget(page);
    await sendChatMessage(page, chatInput, "Tôi muốn xem quy trình thực hiện");

    await page.waitForURL(
      (url) => url.pathname === "/how-to-apply",
      { timeout: AI_RESPONSE_TIMEOUT, waitUntil: "commit" }
    );

    const timelineEl = page.locator('[data-ai-target="how_to_apply_timeline"]').first();
    await expect(
      timelineEl,
      "how_to_apply_timeline phải tồn tại trên /how-to-apply sau khi navigate"
    ).toBeAttached({ timeout: 5000 });
  });
});
