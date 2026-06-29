import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",

  // Mỗi test tối đa 30s — đủ cho animation 1350ms + network load
  timeout: 30_000,

  // Chạy tuần tự để tránh nhiều tab mở cùng lúc gây nhiễu animation
  fullyParallel: false,
  workers: 1,

  // Retry 1 lần nếu fail (AI animations có thể bị lag nhẹ)
  retries: 1,

  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
  ],

  use: {
    baseURL: "http://localhost:3000",
    // Chụp screenshot khi fail + lưu trace để debug
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    // Không headless để có thể quan sát animation trực tiếp nếu muốn
    headless: true,
    // Viewport desktop chuẩn
    viewport: { width: 1280, height: 800 },
    // Chờ đủ để animation mount trước khi assert
    actionTimeout: 10_000,
  },

  projects: [
    {
      name: "Desktop Chrome",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // Tự khởi động Next.js dev server nếu chưa chạy
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true, // Dùng lại server đang chạy nếu có — không khởi động lại
    timeout: 60_000,
  },
});
