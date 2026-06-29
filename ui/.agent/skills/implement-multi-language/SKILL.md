---
name: implement-multi-language
description: Hệ thống hóa quy trình tích hợp đa ngôn ngữ (i18n) cho Next.js App Router bằng next-intl.
---

# Kỹ năng: Tích hợp Đa Ngôn Ngữ (Multi-Language) cho Next.js App Router

Kỹ năng này hướng dẫn AI hoặc Lập trình viên quy trình an toàn, tuần tự để biến một component tĩnh (hardcoded string) thành một component hỗ trợ đa ngôn ngữ sử dụng `next-intl` trong dự án Next.js App Router.

## Bối cảnh & Nguyên tắc
Dự án FASTVISA UI sử dụng `next-intl` để hỗ trợ đa ngôn ngữ. Chúng ta lưu trữ bản dịch trong các file JSON (ví dụ: `src/messages/en.json`, `vi.json`, `ko.json`).

**Nguyên tắc cốt lõi:**
1. **Tuyệt đối không dùng `cat` hay lệnh echo/sed để ghi đè file JSON dịch thuật:** Rất dễ làm mất dữ liệu của các Phase trước.
2. **Luôn dùng script `.js` ngắn gọn bằng Node.js:** Node.js script sử dụng `fs` và `JSON.parse` sẽ giúp cập nhật file an toàn (merge object).
3. **Phân biệt Server và Client:** Server Component dùng `getTranslations`, Client Component dùng `useTranslations`.
4. **Kiểm tra (Verification) là bắt buộc:** Phải luôn `npm run build` sau khi dịch để phát hiện lỗi `MISSING_MESSAGE`.
5. **Luôn bỏ qua các lệnh Git:** Không thực hiện `git add`, `git commit`, `git checkout` hay tạo worktree trong quá trình thực hiện phase này để tránh xung đột môi trường cục bộ của người dùng.

---

## Quy trình 4 bước thực hiện

### Bước 1: Khảo sát & Nhận diện chuỗi tĩnh (Hardcode Strings)
1. Đọc file Component cần chuyển đổi bằng `view_file`.
2. Xác định các text đang bị hardcode.
3. Phân loại cấu trúc dữ liệu tĩnh để đồng bộ hướng giải quyết:
   * **Dữ liệu thuần Text (ví dụ: các mảng hướng dẫn, mô tả các bước):** Có thể di chuyển hoàn toàn vào JSON dịch thuật và tải lên bằng `t.raw("key")` hoặc chuyển thành Factory function trong Component.
   * **Dữ liệu chứa logic nghiệp vụ (ví dụ: bảng giá `VISA_PRICING_ROWS` có giá trị số USD):** Cần giữ nguyên mảng tĩnh tại file cấu hình (như `mock-page-data.ts`) để làm Single Source of Truth (tránh lặp lại số liệu/giá tiền ở nhiều file JSON ngôn ngữ). Khi render, sử dụng ánh xạ động (dynamic mapping) qua translation hook, ví dụ: `t("visaTypes." + row.visaType.replace(/ /g, "_"))`.

### Bước 2: Viết Script Bơm Dữ Liệu (Inject Script)
Tạo một file script bằng công cụ `write_to_file` (ví dụ: `update_locales_xxx.js`) để nạp từ khóa mới vào các file `en.json`, `vi.json`, `ko.json`.

**Mẫu Script chuẩn (Safe Merge Pattern):**
```javascript
const fs = require('fs');
const path = require('path');

const locales = ['en', 'vi', 'ko'];
const basePath = path.join(__dirname, 'src', 'messages');

const newTranslations = {
  en: {
    ComponentNamePage: {
      title: "Title",
      paxTiers: {
        off: "{discount}% off" // Sử dụng tham số {discount} thay vì chuỗi tĩnh để hỗ trợ ngữ pháp đa ngôn ngữ
      }
    }
  },
  vi: {
    ComponentNamePage: {
      title: "Tiêu đề",
      paxTiers: {
        off: "Giảm {discount}%" // Hỗ trợ đảo ngữ pháp động
      }
    }
  },
  ko: {
    ComponentNamePage: {
      title: "제목",
      paxTiers: {
        off: "{discount}% 할인"
      }
    }
  }
};

locales.forEach(lang => {
  const filePath = path.join(basePath, `${lang}.json`);
  if (fs.existsSync(filePath)) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Merge an toàn ở cấp độ key Component, tránh lồng ghép sai cấu trúc
    if (!data.ComponentNamePage) data.ComponentNamePage = {};
    data.ComponentNamePage = { ...data.ComponentNamePage, ...newTranslations[lang].ComponentNamePage };
    
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`Updated ${lang}.json`);
  }
});
```
Chạy script bằng `run_command`: `node update_locales_xxx.js` và xóa file script ngay sau khi chạy xong để giữ dự án sạch sẽ.

### Bước 3: Cập nhật Component
Sử dụng `replace_file_content` hoặc ghi đè để thay thế text tĩnh bằng `useTranslations` (Client) hoặc `getTranslations` (Server).

* **Với Client Component:**
  ```tsx
  import { useTranslations } from "next-intl";
  
  export function MyComponent() {
      const t = useTranslations("ComponentNamePage");
      return <div>{t("title")}</div>;
  }
  ```

* **Xử lý mảng dữ liệu (Data Array):**
  KHÔNG gọi `t()` ở ngoài React Component scope. Đẩy mảng vào bên trong Component hoặc chuyển mảng thành một Factory function:
  ```tsx
  const getMenuData = (t) => [
      { id: "1", title: t("menu_1") },
      { id: "2", title: t("menu_2") }
  ];
  // Gọi bên trong component: const menu = getMenuData(t);
  ```

* **SEO và Metadata:**
  Với Server Component, sử dụng `generateMetadata()` kết hợp `getTranslations`:
  ```typescript
  export async function generateMetadata(): Promise<Metadata> {
      const t = await getTranslations("ComponentNamePage");
      return {
          title: t("title"),
          description: t("subtitle"),
      };
  }
  ```

### Bước 4: Chạy kiểm tra (Verification Phase)
Sau khi thay đổi Component, chạy tuần tự các lệnh sau để đảm bảo hệ thống không có lỗi:
1. `npm run dev`: Chạy thử và test trên trình duyệt để kiểm tra runtime và các lỗi `MISSING_MESSAGE`.
2. `npm run build`: Phải chạy thành công (Compiled successfully), không có lỗi Type hay Build.
3. `npm run lint`: Phải pass 100% (0 errors).

---

## Bài học & Đúc kết quan trọng (Lessons Learned)
* **Tránh lỗi lồng ghép JSON (Nested Keys):** Khi viết script merge JSON, hãy đảm bảo gán đúng nhánh con (ví dụ: `newTranslations[lang].ComponentNamePage`) để tránh tạo ra cấu trúc lồng lặp dạng `{ ComponentPage: { ComponentPage: { ... } } }`, gây lỗi crash ở runtime.
* **Tham số hóa chuỗi dịch (Parameterized Translations):** Thay vì sử dụng chuỗi dịch tĩnh ghép nối, hãy dùng cú pháp `{key}` (ví dụ: `{discount}% off` và `Giảm {discount}%`). Điều này giải quyết triệt để vấn đề đảo ngữ pháp giữa các ngôn ngữ (tiếng Anh, tiếng Việt, tiếng Hàn).
* **Quản lý file tạm:** Luôn xóa các file script update locales (`update_locales_*.js`) ngay sau khi chạy xong để tránh làm nhiễu không gian làm việc của dự án.
* **Tên riêng / Danh lam thắng cảnh:** Khi dịch thuật các nội dung có chứa tên riêng, địa danh, hoặc danh lam thắng cảnh (ví dụ: Vịnh Hạ Long, Ruộng Bậc Thang, Phố Cổ Hội An), hãy LUÔN GIỮ NGUYÊN tên bằng Tiếng Việt (hoặc ngôn ngữ gốc) cho tất cả các bản dịch (en.json, vi.json, ko.json). Việc này giúp bảo toàn giá trị văn hóa và độ nhận diện của địa danh.
