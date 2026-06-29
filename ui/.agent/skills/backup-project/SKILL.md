---
name: backup-project
description: Use when the user requests a backup of the FASTVISA project components (ui, api, admin, business) to the backup folder while excluding heavy folders like node_modules and .next.
---

# Kỹ năng Backup Dự án FASTVISA

## Tổng quan

Kỹ năng này hướng dẫn AI trợ lý tự động thực hiện việc sao lưu toàn bộ 5 dự án con/thư mục (`ui`, `api`, `admin`, `business`, `docs`) từ thư mục `D:\F8_K15_BTVN\FASTVISA` sang thư mục backup chuyên biệt `D:\F8_K15_BTVN\BACKUP\BACKUP PROJECT\FASTVISA #[số tự tăng]` mà không cần tạo file script vật lý trung gian. Quá trình này sẽ loại bỏ hoàn toàn các thư mục cực nặng là `node_modules` và `.next` nhằm tối ưu dung lượng và tốc độ copy.

## Khi nào sử dụng

- Khi người dùng yêu cầu backup toàn bộ dự án FASTVISA.
- Khi người dùng sử dụng workflow `/backup`.
- Khi cần tạo một phiên bản lưu trữ nhanh trước khi tiến hành những thay đổi kiến trúc lớn hoặc cập nhật thư viện.

## Các lệnh PowerShell cốt lõi

Quy trình này chạy trực tiếp trên môi trường Windows thông qua PowerShell. Hãy thực thi các lệnh sau theo trình tự để tính toán số tự tăng và thực hiện sao chép đệ quy.

### Bước 1: Tính toán số tự tăng tiếp theo

Chạy dòng lệnh PowerShell dưới đây để quét thư mục backup, tìm số tự tăng lớn nhất hiện tại của folder `FASTVISA #[số]`, và trả về số thứ tự tiếp theo:

```powershell
$root = "D:\F8_K15_BTVN\BACKUP\BACKUP PROJECT"; if (!(Test-Path $root)) { New-Item -Path $root -ItemType Directory | Out-Null }; $dirs = Get-ChildItem -Path $root -Directory -Filter "FASTVISA #*"; $max = 0; foreach ($d in $dirs) { if ($d.Name -match "FASTVISA #(\d+)") { $num = [int]$Matches[1]; if ($num -gt $max) { $max = $num } } }; $next = $max + 1; Write-Output "NEXT_NUMBER=$next"
```

> [!NOTE]
> Lệnh này sẽ kiểm tra sự tồn tại của thư mục gốc `D:\F8_K15_BTVN\BACKUP\BACKUP PROJECT` trước, nếu chưa có sẽ tự tạo mới, sau đó phân tích tên thư mục để tìm ra số thứ tự lớn nhất.

### Bước 2: Tạo thư mục backup mới

Sau khi nhận được giá trị `$next` từ bước 1 (ví dụ: `1`), hãy chạy lệnh tạo thư mục đích cụ thể:

```powershell
$next = 1; New-Item -Path "D:\F8_K15_BTVN\BACKUP\BACKUP PROJECT\FASTVISA #$next" -ItemType Directory
```
*(Thay thế số `1` bằng số thực tế đã tính được ở Bước 1).*

### Bước 3: Sao chép đệ quy bằng Robocopy (Loại trừ node_modules và .next)

Sử dụng công cụ `Robocopy` (công cụ copy đệ quy hiệu năng cao tích hợp sẵn trên Windows) để sao chép lần lượt 4 dự án con. 
Sử dụng cờ `/E` để copy tất cả thư mục con (bao gồm cả thư mục rỗng) và `/XD` để loại trừ `node_modules` và `.next`:

```powershell
# Sao chép dự án UI
Robocopy "D:\F8_K15_BTVN\FASTVISA\ui" "D:\F8_K15_BTVN\BACKUP\BACKUP PROJECT\FASTVISA #1\ui" /E /XD "node_modules" ".next"

# Sao chép dự án API
Robocopy "D:\F8_K15_BTVN\FASTVISA\api" "D:\F8_K15_BTVN\BACKUP\BACKUP PROJECT\FASTVISA #1\api" /E /XD "node_modules" ".next"

# Sao chép dự án ADMIN
Robocopy "D:\F8_K15_BTVN\FASTVISA\admin" "D:\F8_K15_BTVN\BACKUP\BACKUP PROJECT\FASTVISA #1\admin" /E /XD "node_modules" ".next"

# Sao chép dự án BUSINESS
Robocopy "D:\F8_K15_BTVN\FASTVISA\business" "D:\F8_K15_BTVN\BACKUP\BACKUP PROJECT\FASTVISA #1\business" /E /XD "node_modules" ".next"

# Sao chép tài liệu DOCS
Robocopy "D:\F8_K15_BTVN\FASTVISA\docs" "D:\F8_K15_BTVN\BACKUP\BACKUP PROJECT\FASTVISA #1\docs" /E /XD "node_modules" ".next"
```
*(Thay thế số `#1` bằng số thứ tự thực tế đã tính được ở Bước 1).*

## Lưu ý quan trọng cho AI Trợ lý

- **Exit Codes của Robocopy**: Khác với các lệnh thông thường, `Robocopy` trả về mã exit từ `0` đến `7` cho các trường hợp chạy thành công (trong đó `1` là có tệp tin được sao chép, `0` là không có tệp tin nào thay đổi). ĐỪNG coi các mã exit này là lỗi trừ khi mã exit lớn hơn hoặc bằng `8`.
- **Đường dẫn**: Đảm bảo sử dụng đường dẫn tuyệt đối chính xác để tránh nhầm lẫn thư mục làm việc hiện tại.
- **Tiếng Việt có dấu**: Toàn bộ phản hồi, giải thích và báo cáo tiến trình phải viết bằng Tiếng Việt có dấu rõ nghĩa, lịch sự.
