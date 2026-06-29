---
description: Sao lưu toàn bộ 4 dự án con (ui, api, admin, business) của dự án FASTVISA sang thư mục BACKUP, loại bỏ thư mục node_modules và .next
---

**BẮT BUỘC:** Nạp và tuân thủ tuyệt đối kỹ năng tại `.agent/skills/backup-project/SKILL.md` để tự động hóa việc sao lưu.

### Các Bước Thực hiện:
1. Nạp kĩ năng sao lưu tại file `D:\F8_K15_BTVN\FASTVISA\ui\.agent\skills\backup-project\SKILL.md`.
2. Chạy lệnh PowerShell để tìm số thứ tự lớn nhất và xác định thư mục backup tiếp theo (ví dụ: `FASTVISA #1`, `FASTVISA #2`).
3. Chạy lệnh sao chép `Robocopy` cho cả 4 thư mục dự án (`ui`, `api`, `admin`, `business`), loại trừ `node_modules` và `.next`.
4. Ghi nhận và thông báo kết quả chi tiết bằng Tiếng Việt có dấu cho người dùng.
