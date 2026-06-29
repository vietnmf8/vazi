# Nationalities Redesign Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

## 📋 Checklist Theo Dõi Tiến Độ
- [ ] Task 1: Cài đặt thư viện `i18n-iso-countries`
- [ ] Task 2: Thêm ảnh cờ vào cột Quốc gia trên UI
- [ ] Task 3: Bổ sung dropdown chọn quốc gia vào Form thêm/sửa
- [ ] Task 4: Kiểm chứng (Verification) toàn diện theo chuẩn Phase Verification

**Goal:** Thêm ảnh cờ quốc gia vào bảng danh sách và bổ sung tính năng chọn quốc gia từ danh sách toàn cầu (dùng thư viện `i18n-iso-countries`) để tự động điền "Mã" và "Đa ngôn ngữ" khi thêm mới/chỉnh sửa.

**Architecture:** Sử dụng dịch vụ `flagcdn.com` để hiển thị cờ. Cài đặt `i18n-iso-countries` để lấy danh sách quốc gia. Form sẽ tự động cập nhật state khi người dùng chọn từ dropdown, nhưng người dùng vẫn có thể ghi đè nếu muốn.

**Tech Stack:** React, Next.js, i18n-iso-countries, flagcdn.

## 👤 User Flow & Kết Quả Kỳ Vọng

**User Flow:**
1. Quản trị viên truy cập trang Quốc tịch (`/master/nationalities`).
2. Quan sát thấy cột "Quốc gia" hiển thị kèm cờ minh họa đẹp mắt, trực quan.
3. Quản trị viên nhấn vào một quốc gia để sửa, hoặc sử dụng form bên phải để thêm mới.
4. Tại Form bên phải, quản trị viên mở dropdown chọn một quốc gia.
5. Hệ thống tự động điền "Mã" thành VD: `JP`, "Tiếng Việt" thành `Nhật Bản`, "English" thành `Japan`.
6. Quản trị viên chỉ cần nhập số ngày miễn visa, chọn nhóm và nhấn "Lưu".

**Kết Quả Kỳ Vọng:**
- Giảm thiểu sai sót khi nhập tay mã quốc gia và tên đa ngôn ngữ.
- Cải thiện UX với cờ minh họa.
- Không gây vỡ layout (layout shift) khi tải ảnh cờ.
- Các API xử lý lưu dữ liệu chính xác và báo lỗi rõ ràng nếu trùng mã quốc gia.

---

### Task 1: Cài đặt thư viện i18n-iso-countries

**Files:**
- Modify: `package.json`

**Step 1: Install dependency**

Run: `npm install i18n-iso-countries`
Expected: Cài đặt thành công.

---

### Task 2: Thêm ảnh cờ vào cột Quốc gia

**Files:**
- Modify: `d:\F8_K15_BTVN\FASTVISA\admin\src\components\features\master\MasterPages.tsx`

**Step 1: Cập nhật hàm columns của bảng Nationalities**

Thêm thẻ `<img>` vào bên trái tên quốc gia trong `MasterPages.tsx` (cột `country_name`):

```tsx
{ 
  accessorKey: "country_name", 
  header: t("master.colCountry"),
  cell: ({ row }) => (
    <div className="flex items-center gap-2">
      <img
        src={`https://flagcdn.com/w20/${row.original.country_code.toLowerCase()}.png`}
        alt={`${row.original.country_code} flag`}
        className="w-5 h-auto rounded-sm object-cover"
        loading="lazy"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
      <span>{row.original.country_name}</span>
    </div>
  ),
}
```

---

### Task 3: Bổ sung combobox/dropdown chọn quốc gia vào Form

**Files:**
- Modify: `d:\F8_K15_BTVN\FASTVISA\admin\src\components\features\master\MasterPages.tsx`

**Step 1: Import thư viện và load danh sách**

```tsx
import * as countries from "i18n-iso-countries"
import enLocale from "i18n-iso-countries/langs/en.json"
import viLocale from "i18n-iso-countries/langs/vi.json"

countries.registerLocale(enLocale)
countries.registerLocale(viLocale)

// Ở ngoài component
const allCountries = Object.keys(countries.getNames("en", {select: "official"})).map(code => ({
  code,
  nameEn: countries.getName(code, "en", {select: "official"}),
  nameVi: countries.getName(code, "vi", {select: "official"}) || countries.getName(code, "en", {select: "official"}),
}))
```

**Step 2: Thêm dropdown vào `EditPanel`**

Thêm thẻ `<select>` hoặc danh sách chọn ngay trên ô nhập Code:

```tsx
              <div className="flex flex-col gap-1">
                <select
                  className="rounded-lg px-3 py-2 min-h-11 w-full text-sm"
                  style={{ border: "1px solid var(--color-border-strong)", background: "transparent" }}
                  onChange={(e) => {
                    const c = allCountries.find(x => x.code === e.target.value)
                    if (c) {
                      setForm(f => ({ ...f, country_code: c.code }))
                      setLocaleFields(prev => ({
                        ...prev,
                        vi: { ...prev.vi, country_name: c.nameVi },
                        en: { ...prev.en, country_name: c.nameEn }
                      }))
                    }
                  }}
                >
                  <option value="">-- Chọn từ thư viện quốc gia (Tùy chọn) --</option>
                  {allCountries.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.nameVi} ({c.code})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted">Chọn để tự động điền Mã và Tên bên dưới</p>
              </div>
```

---

### Task 4: Kiểm Chứng (Phase Verification)

Áp dụng quy trình kiểm chứng nghiêm ngặt để đảm bảo chất lượng:

**Bước 1-4: Unit/Integration Tests (Nếu có)**
- Kiểm tra tính đúng đắn của logic auto-fill khi chọn dropdown (nếu có UI test).

**Bước 5: Type Checking**
- Chạy: `npx tsc --noEmit` ở thư mục `admin`.
- Kỳ vọng: 0 errors.

**Bước 6: Live API Testing (cURL)**
Giả lập Admin Flow tạo quốc gia mới (Happy, Secondary, Edge cases):
- **Happy Case (Tạo mới thành công):** 
  Sử dụng lệnh `curl` gọi API `POST /api/admin/nationalities` (hoặc cấu trúc backend thực tế) với payload đầy đủ (`country_code`, đa ngôn ngữ, số ngày). 
  Báo cáo Input & Output đạt HTTP 200/201.
- **Edge Case (Trùng lặp mã quốc gia):**
  Thử tạo lại quốc gia vừa tạo.
  Báo cáo Input & Output đạt HTTP 400 (Lỗi validation trùng mã).

**Bước 7: Live UI Server SSR Check (cURL)**
- Chạy: `curl -s -o NUL -w "%{http_code}" http://localhost:3001/master/nationalities` (Admin chạy ở port 3001).
- Kỳ vọng: Trả về HTTP 200 (chứng minh trang không bị crash SSR do ảnh cờ hay dropdown).

**Bước 8: Live UI Log Analysis**
- Quan sát file log: `app.log` (Admin) và `api.log` (API).
- Đảm bảo không có warning hay lỗi runtime (VD: "Missing message", lỗi Hydration).

**Bước 9: UI Integrity Check & Data Mapping**
- Đảm bảo cờ quốc gia load được, hiển thị fallback ẩn ảnh khi 404 (do thư viện flagcdn thiếu cờ).
- Kiểm tra dropdown hiển thị đúng tên Tiếng Việt và Mã quốc gia (VD: "Nhật Bản (JP)").
- Form giữ nguyên tính tương tác, có thể chỉnh sửa lại sau khi chọn dropdown.

**Bước 10: Lint & Build**
- Chạy: `npm run lint` và `npm run build` ở `admin`
- Kỳ vọng: Pass 100%, không cảnh báo (warning) và lỗi (error). Báo cáo thành công trước khi kết thúc.
