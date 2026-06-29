/**
 * E2E Test: Virtual Mouse — Conditional Buttons + Navigate Destinations (2026-06-23)
 *
 * Mở rộng coverage cho các target CHƯA test bằng lệnh AI thật:
 *   - 8 click target cần trạng thái đặc biệt (virtual-mouse-buttons.spec.ts đã chủ động BỎ QUA
 *     8 target này — xem comment đầu file đó): check_status_download, contact_send_another,
 *     emergency_ask_another, faqs_ask_another, next_step3, apply_step2_back, apply_step3_back, pay_with.
 *   - 9 navigate_to_page destination chưa có NLP Cache.
 *
 * Khác với virtual-mouse-buttons.spec.ts (trigger trực tiếp qua window.useAgentStore — chỉ test
 * VirtualMouseEngine), file này gửi LỆNH AI THẬT qua chat widget (giống virtual-mouse-combo-flow.spec.ts)
 * — verify cả tầng routing AI (Gemini/NLP Cache chọn đúng target) + tầng click thật.
 *
 * Đưa app đến đúng trạng thái bằng cách:
 *   - Điền form thật qua UI (contact/emergency/faqs) rồi submit thật (tạo ticket thật trong DB,
 *     cùng pattern với virtual-mouse-buttons.spec.ts đã làm cho contact_submit/emergency_submit).
 *   - Dùng cơ chế `ai_fill_form` CustomEvent có sẵn trong Step1VisaOptions/Step2ApplicantDetails
 *     (chính là hook mà 1 tool auto_fill_form trong tương lai sẽ dùng) để set giá trị form bước 1/2
 *     mà không cần click qua từng Select/DatePicker — nhanh và đúng với cơ chế app đã thiết kế sẵn.
 *   - pay_with: CHẶN network request POST /api/v1/applications/submit (page.route) để chỉ verify
 *     đúng nút được click, KHÔNG tạo hồ sơ thật / KHÔNG gọi PayPal thật.
 *   - check_status_download: dùng 1 application COMPLETED có sẵn trong DB (seed từ trước).
 */

import { test, expect, type Page } from "@playwright/test";

const AI_RESPONSE_TIMEOUT = 25_000;

// ─────────────────────────────────────────────────────────────────
// Helpers chung — mở chat, gửi tin nhắn, assert virtual click
// ─────────────────────────────────────────────────────────────────

async function openChatWidget(page: Page) {
  const toggleBtn = page.locator('[data-ai-element="chat-toggle"]');
  await expect(toggleBtn, "chat-toggle button phải tồn tại").toBeAttached({ timeout: 5000 });
  await toggleBtn.click();

  const widget = page.locator('[data-ai-id="chat-widget"] section[role="dialog"]');
  await expect(widget, "Chat widget panel phải xuất hiện").toBeVisible({ timeout: 5000 });

  const nameInput = page.locator("#chat-user-name");
  const isJoining = await nameInput.isVisible({ timeout: 1500 }).catch(() => false);
  if (isJoining) {
    await nameInput.fill("E2E Conditional Test");
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

/**
 * Gửi 1 lệnh AI thật qua chat, verify cursor ảo xuất hiện + click đúng target + biến mất.
 * Yêu cầu element [data-ai-element="target"] đã tồn tại sẵn trong DOM (đúng trạng thái) trước khi gọi.
 */
async function assertRealAiClick(page: Page, message: string, target: string) {
  const el = page.locator(`[data-ai-element="${target}"]`).first();
  await expect(el, `[${target}] phải tồn tại trong DOM trước khi gửi lệnh AI`).toBeAttached({ timeout: 5000 });

  let clickCaptured = false;
  const consoleHandler = (msg: { text(): string }) => {
    if (msg.text() === `[VM_CLICK]${target}`) clickCaptured = true;
  };
  page.on("console", consoleHandler as any);

  await page.evaluate((t: string) => {
    const element = document.querySelector<HTMLElement>(`[data-ai-element="${t}"]`);
    element?.addEventListener("click", () => console.log(`[VM_CLICK]${t}`), { capture: true, once: true });
  }, target);

  const chatInput = await openChatWidget(page);
  await sendChatMessage(page, chatInput, message);

  const cursor = page.locator('[data-testid="virtual-cursor"]');
  await expect(cursor, `[${target}] cursor phải xuất hiện sau lệnh AI "${message}"`).toBeVisible({
    timeout: AI_RESPONSE_TIMEOUT,
  });

  // TẠI SAO dùng expect.poll thay vì waitForTimeout(1400) + check 1 lần: click thật xảy ra ở
  // t+1050ms theo thiết kế VirtualMouseEngine, nhưng dưới tải nặng (chạy nhiều file Playwright
  // liên tiếp, nhiều lệnh Gemini thật) chuỗi setTimeout có thể trễ hơn 1400ms wall-clock — fixed
  // sleep + check 1 lần không có cơ hội phục hồi, gây flaky không liên quan logic click thật
  // (root cause của "apply_step2_back flaky do cross-test interference" đã ghi nhận trước đây).
  // Poll chủ động tới 4000ms — không đụng timing nội bộ của VirtualMouseEngine (đã tune đúng).
  await expect
    .poll(() => clickCaptured, {
      message: `[${target}] el.click() phải được VirtualMouseEngine gọi`,
      timeout: 4000,
    })
    .toBe(true);
  page.off("console", consoleHandler as any);

  await expect(cursor, `[${target}] cursor phải biến mất sau animation`).not.toBeVisible({ timeout: 2000 });
}

test.describe("Virtual Mouse — Conditional Buttons + Navigate (Real AI Message)", () => {
  test.setTimeout(70_000); // điền form thật + chờ AI response + animation cursor, mặc định 30s không đủ

  test.beforeEach(async ({ page }) => {
    page.on("dialog", (d) => d.dismiss());
    page.context().on("page", (p) => p.close());
  });

  // ═══════════════════════════════════════════════════════════════
  // 9 NAVIGATE DESTINATION CHƯA CÓ NLP CACHE
  // ═══════════════════════════════════════════════════════════════

  test.describe("Navigate destinations", () => {
    // LƯU Ý: phải dùng phrasing rõ Ý ĐỊNH ĐIỀU HƯỚNG ("cho tôi xem TRANG...") — câu hỏi thông tin
    // thuần ("tôi muốn biết về X") sẽ bị Gemini trả lời bằng văn bản (get_page_content) thay vì
    // navigate, đúng theo rule "UI ACTION PRIORITY" đã thêm vào SYSTEM_INSTRUCTION (gemini.service.ts).
    const NAV_CASES: Array<{ id: string; message: string; destination: string }> = [
      { id: "about-us", message: "Cho tôi xem trang giới thiệu về công ty của các bạn", destination: "/about-us" },
      { id: "emergency-inquiry", message: "Tôi cần hỗ trợ khẩn cấp gấp", destination: "/emergency-inquiry" },
      { id: "faqs", message: "Cho tôi xem trang có đầy đủ các câu hỏi thường gặp", destination: "/faqs" },
      { id: "how-to-apply", message: "Cho tôi xem trang hướng dẫn cách nộp đơn xin visa", destination: "/how-to-apply" },
      { id: "guide", message: "Cho tôi xem trang có các bài hướng dẫn của các bạn", destination: "/guide" },
      { id: "guide-payment", message: "Cho tôi xem trang nói về các phương thức thanh toán phí visa", destination: "/guide/payment-guideline" },
      { id: "guide-extra", message: "Cho tôi xem trang có các dịch vụ thêm", destination: "/guide/extra-services" },
      { id: "guide-extension", message: "Cho tôi xem trang hướng dẫn gia hạn visa", destination: "/guide/visa-extension" },
      { id: "guide-exemptions", message: "Cho tôi xem trang nói về miễn visa cho các quốc gia", destination: "/guide/visa-exemptions" },
    ];

    for (const tc of NAV_CASES) {
      test(`${tc.id} — "${tc.message}" → navigate ${tc.destination}`, async ({ page }) => {
        await page.goto("/", { waitUntil: "domcontentloaded" });
        await page.waitForFunction(() => !!(window as any).useAgentStore, { timeout: 10_000 });

        const chatInput = await openChatWidget(page);
        await sendChatMessage(page, chatInput, tc.message);

        await page.waitForURL((url) => url.pathname === tc.destination, {
          timeout: AI_RESPONSE_TIMEOUT,
          waitUntil: "commit",
        });
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // contact_send_another — submit contact form thật rồi gửi lệnh AI "gửi thêm câu hỏi"
  // ═══════════════════════════════════════════════════════════════

  test("contact_send_another — submit form liên hệ thật, AI bấm gửi câu hỏi khác", async ({ page }) => {
    await page.goto("/contact-us", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => !!(window as any).useAgentStore, { timeout: 10_000 });

    await page.locator("#fullName").fill("E2E Conditional Tester");
    await page.locator("#contact-email").fill("e2e-conditional@fastvisa.test");
    await page.locator('button[role="combobox"], [id="subject"]').first().click();
    await page.getByRole("option").first().click();
    await page.locator("textarea").first().fill("Đây là tin nhắn test tự động từ Playwright E2E, vui lòng bỏ qua.");
    await page.locator('[data-ai-element="contact_submit"]').click();

    await expect(page.getByText(/success|thành công/i).first()).toBeVisible({ timeout: 10_000 });

    await assertRealAiClick(page, "Cho tôi gửi thêm một tin nhắn liên hệ khác nữa", "contact_send_another");
  });

  // ═══════════════════════════════════════════════════════════════
  // emergency_ask_another — submit form khẩn cấp thật rồi gửi lệnh AI "gửi thêm yêu cầu khác"
  // ═══════════════════════════════════════════════════════════════

  test("emergency_ask_another — submit form khẩn cấp thật, AI bấm gửi yêu cầu khác", async ({ page }) => {
    await page.goto("/emergency-inquiry", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => !!(window as any).useAgentStore, { timeout: 10_000 });

    await page.locator("#emergency-fullName").fill("E2E Conditional Tester");
    // Backend validate booking_number theo regex /^VN-\d{8}-[A-Z0-9]{5}$/ (xem applications.validator.ts)
    await page.locator("#bookingNumber").fill("VN-20260623-TEST1");
    await page.locator("#emergency-email").fill("e2e-conditional@fastvisa.test");

    // DatePicker travelDate: mở popup, chọn ngày cuối cùng hiển thị (luôn enabled), bấm Apply
    await page.locator("#travelDate").click();
    await page.locator('button:not([disabled])').filter({ hasText: /^\d{1,2}$/ }).last().click();
    await page.getByRole("button", { name: "Apply", exact: true }).click();

    await page.locator("#emergency-subject").click();
    await page.getByRole("option").first().click();
    await page.locator("#emergency-message").fill("Đây là yêu cầu test tự động từ Playwright E2E, vui lòng bỏ qua.");
    await page.locator('[data-ai-element="emergency_submit"]').click();

    // Success view dùng text "Urgent inquiry received" (EN) — không khớp regex success/thành công,
    // chờ trực tiếp nút ask_another xuất hiện cho chắc (đây cũng là điều kiện thật cần cho bước sau).
    await expect(page.locator('[data-ai-element="emergency_ask_another"]')).toBeVisible({ timeout: 10_000 });

    await assertRealAiClick(page, "Tôi muốn báo thêm một trường hợp khẩn cấp khác nữa", "emergency_ask_another");
  });

  // ═══════════════════════════════════════════════════════════════
  // faqs_ask_another — submit form hỏi đáp thật rồi gửi lệnh AI "hỏi thêm câu nữa"
  // ═══════════════════════════════════════════════════════════════

  test("faqs_ask_another — submit câu hỏi FAQ thật, AI bấm hỏi thêm câu khác", async ({ page }) => {
    await page.goto("/faqs", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => !!(window as any).useAgentStore, { timeout: 10_000 });

    await page.locator("#faq-name").fill("E2E Conditional Tester");
    await page.locator("#faq-email").fill("e2e-conditional@fastvisa.test");
    await page.locator("#faq-question").fill("Đây là câu hỏi test tự động từ Playwright E2E, vui lòng bỏ qua.");
    await page.locator('[data-ai-element="faqs_submit_question"]').click();

    await expect(page.getByText(/success|thành công/i).first()).toBeVisible({ timeout: 10_000 });

    await assertRealAiClick(page, "Tôi muốn hỏi thêm một câu nữa", "faqs_ask_another");
  });

  // ═══════════════════════════════════════════════════════════════
  // check_status_download — tra cứu 1 hồ sơ COMPLETED có sẵn, AI bấm tải file visa
  // ═══════════════════════════════════════════════════════════════

  test("check_status_download — tra cứu hồ sơ COMPLETED có sẵn, AI bấm tải file visa", async ({ page }) => {
    await page.goto("/check-status", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => !!(window as any).useAgentStore, { timeout: 10_000 });

    await page.locator("#bookingNumber").fill("VN-20260622-UR71Q");
    await page.locator("#email").fill("vietnm.oes@gmail.com");
    await page.locator('[data-ai-element="check_status_submit"]').click();

    await expect(page.locator('[data-ai-element="check_status_download"]')).toBeVisible({ timeout: 10_000 });

    await assertRealAiClick(page, "Tôi muốn tải file visa của tôi xuống", "check_status_download");
  });

  // ═══════════════════════════════════════════════════════════════
  // LUỒNG /apply — next_step3, apply_step2_back, apply_step3_back, pay_with
  // Dùng ai_fill_form CustomEvent (cơ chế có sẵn trong Step1VisaOptions/Step2ApplicantDetails)
  // để điền form bước 1/2 nhanh, không cần click qua từng Select/DatePicker.
  // ═══════════════════════════════════════════════════════════════

  async function fillStep1AndAdvance(page: Page) {
    await page.goto("/apply", { waitUntil: "domcontentloaded" });
    // Xóa draft cũ trong localStorage trước — useApplyFlow tự resume draft từ lần test trước,
    // có thể hydrate thiếu field (vd arrival_date) gây sai lệch với dữ liệu ai_fill_form mới.
    await page.evaluate(() => window.localStorage.clear());
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => !!(window as any).useAgentStore, { timeout: 10_000 });

    // Dispatch TỪNG field riêng + chờ giữa các lần — dispatch dồn 1 batch trong cùng 1 tick
    // gây race với re-render React (3 field đầu set được, 3 field sau bị rớt do listener
    // useEffect re-subscribe đúng lúc đang detach/attach).
    const d = new Date();
    d.setDate(d.getDate() + 10);
    const arrival = d.toISOString().slice(0, 10);
    const step1Fields: Array<[string, string]> = [
      ["visa_type", "evisa"],
      ["visa_category", "evisa_30d_single"],
      ["applicant_count", "1"],
      ["arrival_date", arrival],
      ["port_of_entry", "SGN"],
      ["purpose_of_visit", "tourism"],
      ["processing_time", "normal_7d"],
    ];
    for (const [fieldName, value] of step1Fields) {
      await page.evaluate(([fieldName, value]) => {
        window.dispatchEvent(new CustomEvent("ai_fill_form", { detail: { target: "step1_form", fieldName, value } }));
      }, [fieldName, value]);
      await page.waitForTimeout(150);
    }
    await page.waitForTimeout(400);

    await page.locator('[data-ai-element="next_step2"]').first().click();
    await expect(page.locator("#step2-form, [id='step2-form']").first()).toBeAttached({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(800);
  }

  async function fillStep2(page: Page) {
    const expiry = new Date();
    expiry.setFullYear(expiry.getFullYear() + 3);
    const expiryStr = expiry.toISOString().slice(0, 10);
    const step2Fields: Array<[string, string]> = [
      ["email", "e2e-conditional@fastvisa.test"],
      ["phone", "+84912345678"],
      ["applicants.0.full_name", "JOHN DOE"],
      ["applicants.0.gender", "male"],
      ["applicants.0.nationality", "US"],
      ["applicants.0.date_of_birth", "1990-01-15"],
      ["applicants.0.passport_number", "A12345678"],
      ["applicants.0.passport_expiry_date", expiryStr],
      ["applicants.0.passport_image", "https://example.com/fake-passport-e2e-test.jpg"],
    ];
    for (const [fieldName, value] of step2Fields) {
      await page.evaluate(([fieldName, value]) => {
        window.dispatchEvent(new CustomEvent("ai_fill_form", { detail: { target: "step2_form", fieldName, value } }));
      }, [fieldName, value]);
      await page.waitForTimeout(150);
    }
    await page.waitForTimeout(400);
  }

  test("next_step3 — điền step1+2 thật qua ai_fill_form, AI bấm qua bước tiếp theo", async ({ page }) => {
    await fillStep1AndAdvance(page);
    await fillStep2(page);

    await assertRealAiClick(page, "Tôi điền xong rồi, cho tôi qua bước tiếp theo", "next_step3");
  });

  test("apply_step2_back — đang ở step2, AI bấm sửa lại thông tin bước trước", async ({ page }) => {
    await fillStep1AndAdvance(page);

    await assertRealAiClick(page, "Tôi muốn sửa lại thông tin ở bước trước", "apply_step2_back");
  });

  test("apply_step3_back — đang ở step3, AI bấm quay lại bước điền thông tin", async ({ page }) => {
    await fillStep1AndAdvance(page);
    await fillStep2(page);
    await page.locator('[data-ai-element="next_step3"]').first().click();
    await page.waitForTimeout(500);

    await assertRealAiClick(page, "Cho tôi quay lại bước điền thông tin người nộp đơn", "apply_step3_back");
  });

  test("pay_with — đang ở step3, AI bấm thanh toán (chặn network, không tạo hồ sơ thật)", async ({ page }) => {
    // Chặn POST submit application — chỉ verify click xảy ra, KHÔNG tạo hồ sơ thật / không gọi PayPal thật.
    await page.route("**/api/v1/applications/submit", (route) =>
      route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "blocked-by-e2e-test" }) })
    );

    await fillStep1AndAdvance(page);
    await fillStep2(page);
    await page.locator('[data-ai-element="next_step3"]').first().click();
    await page.waitForTimeout(500);

    await page.locator("#terms").check();

    await assertRealAiClick(page, "Tôi muốn thanh toán luôn bây giờ", "pay_with");
  });
});
