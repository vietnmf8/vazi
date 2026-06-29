---
activation: always_on
description: Sau khi agent tự chạy dev server để verify — giải phóng cổng và hướng dẫn user chạy tay.
---

# Dev server khi agent verify (Next.js)

> Phần của **Build Verify Gate** — rule `25-build-verify-production-ready.mdc`, skill `production-ready-checklist` Phase 0.

## Bắt buộc

1. **Trước khi báo done:** chạy `npm run dev` và `npm run build` — cả hai phải pass (xem rule 25).
2. **Sau verify:** kill tiến trình dev để PORT không bị chiếm (mặc định Next.js `:3000`).
3. Báo cáo **Verify Summary** pass/fail; hướng dẫn user tự chạy `npm run dev` trong terminal của họ.

## Giải phóng cổng (Windows)

```bash
netstat -ano | findstr :3000
taskkill //PID <PID> //F
```

## Giải phóng cổng (macOS / Linux)

```bash
lsof -i :3000
kill <PID>
```

## Lý do

User chạy `npm run dev` trên cùng máy cần cổng trống; tiến trình để lại từ phiên agent gây `listen EADDRINUSE`.
