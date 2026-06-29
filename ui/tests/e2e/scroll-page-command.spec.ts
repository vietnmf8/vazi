/**
 * E2E Test: Scroll Page Command — lệnh "Cuộn..." THUẦN (Track B Feature #5)
 *
 * Khác với virtual-mouse-scroll-flow.spec.ts (scroll là side-effect của click),
 * spec này verify ScrollPageEngine: cuộn trang thật KHÔNG kèm click/cursor.
 *
 * Cấu trúc:
 *   TB — Top/Bottom: cuộn đầu/cuối trang, áp dụng mọi route
 *   EL — Element: cuộn đến 1 section cụ thể, không click (el không bị .click())
 */

import { test, expect, type Page } from "@playwright/test";

const AI_RESPONSE_TIMEOUT = 20_000;

async function openChatWidget(page: Page) {
  const toggleBtn = page.locator('[data-ai-element="chat-toggle"]');
  await expect(toggleBtn, "chat-toggle phải tồn tại").toBeAttached({ timeout: 5000 });
  await toggleBtn.click();

  const widget = page.locator('[data-ai-id="chat-widget"] section[role="dialog"]');
  await expect(widget, "Chat widget panel phải xuất hiện").toBeVisible({ timeout: 5000 });

  const nameInput = page.locator('#chat-user-name');
  const isJoining = await nameInput.isVisible({ timeout: 1500 }).catch(() => false);
  if (isJoining) {
    await nameInput.fill("Scroll Page Tester");
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

test.describe("Scroll Page Command — lệnh Cuộn thuần (Track B Feature #5)", () => {
  test.setTimeout(60_000);

  test.beforeEach(async ({ page }) => {
    page.on("dialog", (d) => d.dismiss());
    page.context().on("page", (p) => p.close());
    page.on("console", (msg) => {
      const text = msg.text();
      if (text.startsWith("[ScrollPage]")) console.log(text);
    });
  });

  test("TB01 — 'Cuộn xuống cuối trang' → scrollY tăng đến gần cuối, KHÔNG xuất hiện cursor", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => !!(window as any).useAgentStore, { timeout: 10_000 });

    // Chốt maxScroll TRƯỚC khi gửi lệnh — trang chủ có ScrollRevealProvider lazy-mount section khi
    // cuộn tới, khiến scrollHeight tiếp tục tăng SAU khi cuộn → nếu đo maxScroll sau, target sẽ
    // "chạy trốn" và điều kiện không bao giờ đúng.
    const maxScrollBefore = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);

    const chatInput = await openChatWidget(page);
    await sendChatMessage(page, chatInput, "Cuộn xuống cuối trang giúp tôi");

    // Chờ phản hồi AI hiện trong khung chat (thay cho chờ cursor — lệnh này không có cursor)
    await expect(
      page.locator('[data-ai-id="chat-widget"]').getByText(/cuộn|scroll/i).first(),
      `AI phải phản hồi trong ${AI_RESPONSE_TIMEOUT / 1000}s`
    ).toBeVisible({ timeout: AI_RESPONSE_TIMEOUT });

    await expect.poll(async () => {
      return await page.evaluate(() => window.scrollY);
    }, { timeout: 15000, message: "scrollY phải tiến gần cuối trang (chốt trước khi cuộn)" })
      .toBeGreaterThan(maxScrollBefore - 50);

    // Lệnh cuộn thuần KHÔNG kích hoạt VirtualMouseEngine
    await expect(page.locator('[data-testid="virtual-cursor"]')).not.toBeVisible();
  });

  test("TB02 — 'Cuộn lên đầu trang' từ vị trí cuối trang → scrollY về 0", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => !!(window as any).useAgentStore, { timeout: 10_000 });
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(200);

    const chatInput = await openChatWidget(page);
    await sendChatMessage(page, chatInput, "Cuộn lên đầu trang");

    await expect(
      page.locator('[data-ai-id="chat-widget"]').getByText(/cuộn|scroll/i).first(),
      `AI phải phản hồi trong ${AI_RESPONSE_TIMEOUT / 1000}s`
    ).toBeVisible({ timeout: AI_RESPONSE_TIMEOUT });

    await expect.poll(async () => {
      return await page.evaluate(() => window.scrollY);
    }, { timeout: 15000, message: "scrollY phải về gần 0" }).toBeLessThan(50);
  });

  test("EL01 — 'Cuộn đến phần Apply Now' → scrollIntoView, KHÔNG click (el không nhận sự kiện click)", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => !!(window as any).useAgentStore, { timeout: 10_000 });

    // Gắn listener click để xác nhận el KHÔNG bị .click() gọi (phân biệt với click_ui_element)
    await page.evaluate(() => {
      const el = document.querySelector('[data-ai-element="cta_check_status"]');
      if (el) (window as any).__scrollPageClickCount = 0;
      el?.addEventListener("click", () => {
        (window as any).__scrollPageClickCount = ((window as any).__scrollPageClickCount || 0) + 1;
      });
    });

    const scrollBefore = await page.evaluate(() => window.scrollY);

    const chatInput = await openChatWidget(page);
    await sendChatMessage(page, chatInput, "Cuộn đến phần Check Status ở cuối trang, mình chỉ muốn xem thôi");

    await expect(
      page.locator('[data-ai-id="chat-widget"]').getByText(/cuộn|scroll/i).first(),
      `AI phải phản hồi trong ${AI_RESPONSE_TIMEOUT / 1000}s`
    ).toBeVisible({ timeout: AI_RESPONSE_TIMEOUT });

    await expect.poll(async () => {
      return await page.evaluate(() => window.scrollY);
    }, { timeout: 15000, message: `scrollY phải tăng (before=${scrollBefore})` }).toBeGreaterThan(scrollBefore + 100);

    const clickCount = await page.evaluate(() => (window as any).__scrollPageClickCount || 0);
    expect(clickCount, "scroll_page KHÔNG được gọi el.click()").toBe(0);

    await expect(page.locator('[data-testid="virtual-cursor"]')).not.toBeVisible();
  });
});
