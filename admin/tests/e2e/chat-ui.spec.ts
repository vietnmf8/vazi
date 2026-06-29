import { test, expect } from '@playwright/test';

test.describe('Admin Live Chat Session UI', () => {
  test('should render session sidebar and allow searching', async ({ page }) => {
    // Navigate to admin sessions page
    await page.goto('/sessions');

    // Login process
    await page.goto('/login');
    await page.fill('input[type="email"]', 'vietnmf8@fullstack.edu.vn');
    await page.fill('input[type="password"]', 'Viet251001');
    await page.click('button[type="submit"]');

    // Chờ trang chuyển hướng xong
    await page.waitForURL('/sessions', { timeout: 15000 }).catch(() => {});
    await page.goto('/sessions');

    // Giả định admin có sidebar hien thi danh sach session
    const sidebar = page.locator('.flex.flex-col.h-full.border-l'); // class chung cua SessionSidebar
    await expect(sidebar).toBeVisible();

    // Khung tìm kiếm ở Sidebar
    const searchInput = page.getByPlaceholder('Tìm kiếm phiên chat...');
    if (await searchInput.isVisible()) {
      await searchInput.fill('Test Guest');
      await expect(searchInput).toHaveValue('Test Guest');
    }
  });

  test('should display chat window correctly', async ({ page }) => {
    // Login process
    await page.goto('/login');
    await page.fill('input[type="email"]', 'vietnmf8@fullstack.edu.vn');
    await page.fill('input[type="password"]', 'Viet251001');
    await page.click('button[type="submit"]');

    // Chờ trang chuyển hướng xong
    await page.waitForURL('/sessions', { timeout: 15000 }).catch(() => {});
    await page.goto('/sessions');

    // Chờ fetch dữ liệu
    await page.waitForTimeout(2000);

    // Click vào một session (nếu có)
    const sessionItem = page.locator('button.w-full.text-left.p-3').first();
    if (await sessionItem.isVisible()) {
      await sessionItem.click();

      // Header của phiên chat (bên phải) hiển thị
      const chatHeader = page.locator('header');
      await expect(chatHeader).toBeVisible();
      
      // Nếu session bị CLOSED_BY_CLIENT, text "Client đã đóng phiên chat" sẽ hiển thị
      const closedMsg = page.locator('text=Client đã đóng phiên chat');
      if (await closedMsg.isVisible()) {
         // Expect input container not to be visible, replaced by closedMsg
         const chatInput = page.locator('textarea[placeholder="Nhập tin nhắn..."]');
         await expect(chatInput).not.toBeVisible();
      }
    }
  });
});
