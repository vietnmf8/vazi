---
activation: always_on
description: Sau khi agent tự chạy dev server để verify — giải phóng cổng và hướng dẫn user chạy tay.
---

# Dev server khi agent verify (API / Node / Next.js)

> Phần của **Build Verify Gate** — rule `25-build-verify-production-ready.mdc`, skill `production-ready-checklist` Phase 0.

## Bắt buộc

1. **Trước khi báo done:** agent phải chạy verify fresh trong phiên hiện tại:
   - Frontend (admin/ui): `npm run dev` → `npm run build` (cả hai pass)
   - API: `npm run build` → `npm run typecheck` → `npm run dev` + curl smoke test
2. **Sau khi verify xong:** nếu agent đã bật `npm run dev` / `npm start` → phải **dừng tiến trình** để `PORT` không bị chiếm (tránh `EADDRINUSE`).
3. Trong báo cáo cuối: ghi **Verify Summary** (pass/fail từng bước), rồi hướng dẫn user **tự chạy** trong terminal của họ:
   - `cd api && cp .env.example .env` (nếu chưa có `.env`)
   - `npm run dev`
4. **Auto Fix Loop:** lỗi phát hiện khi verify → sửa → chạy lại dev + build → lặp đến pass 100%. Không kết luận done khi chưa pass.

## Giải phóng cổng (Windows)

Thay `3000` bằng đúng `PORT` nếu khác.

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

User chạy `npm run dev` trên cùng máy cần cổng trống; tiến trình để lại từ phiên agent gây trùng cổng và lỗi `listen EADDRINUSE`.
