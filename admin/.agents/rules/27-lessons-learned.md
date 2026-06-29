## ⚠️ Bài Học Kinh Nghiệm (Lessons Learned)

### Kinh nghiệm Phase 5 — Lỗi Suy Diễn Thiếu Kiểm Chứng (2026-06-08)

**Tình huống:** Khi cung cấp test case cho `/check-status`, đã mô tả hành vi "lỗi validation ngay trên form" khi nhập mã sai định dạng (VD: `VN-TEST-12345`), nhưng thực tế UI form **chưa có** Regex validation — chỉ có `min(1)`. Thông tin này bị suy diễn từ Backend Validator mà không kiểm chứng code UI thực tế.

**Hậu quả:** User phát hiện form không báo lỗi validation như đã mô tả; thay vào đó request thật được gửi xuống API, API trả về `400`, UI hiển thị thông báo "Không tìm thấy" — gây mất tin tưởng.

**Quy tắc bổ sung (bắt buộc áp dụng):**

> **Bước 6.1 — Client/Server Validation Parity Check (Thêm vào Bước 6):**
> Với mọi form có input validation ở Backend (Zod schema, Regex, Enum), bắt buộc phải:
>
> 1. **Đọc code thực tế** của Zod schema phía UI (không suy diễn từ Backend).
> 2. **Đối chiếu**: mọi rule ở Backend phải có rule tương đương ở UI (đặc biệt là `.regex()`).
> 3. **Test thủ công** input sai định dạng trực tiếp trên UI, xác nhận lỗi xuất hiện **ngay trên form** (dưới input field), không phải sau khi submit.
> 4. **Không được mô tả hành vi kỳ vọng như sự thật** nếu chưa tự kiểm tra bằng code hoặc trình duyệt.

### Kinh nghiệm Phase 6 — Lỗi Type ngầm do sai lệch cấu trúc API Payload (2026-06-08)

**Tình huống:** Khi gọi API trả về list articles, `@ui` khai báo type trả về là `PaginatedResponse` với `data: T[]`. Tuy nhiên, thực tế backend Express lại bọc response qua hàm `res.success()` khiến payload trở thành `{ success: true, data: { items: [], total, page, limit } }`. Lỗi này đã khiến UI render bị crash (`apiGuides.map is not a function`).

**Hậu quả:** Mặc dù đã chạy `npx tsc` pass 100% (do TypeScript chỉ check type đã khai báo, không check thực tế runtime) và gọi `npm run build` pass (do lúc build get static pages có thể API mock đang đúng hoặc không có lỗi trực tiếp xuất ra console build), nhưng khi chạy lên web thì trang `/guide` sập hoàn toàn vì dữ liệu trả về bị lệch cấu trúc.

**Quy tắc bổ sung (bắt buộc áp dụng):**

> **Bước 8.1 — Log Check:**
>
> 1. Không bao giờ chỉ tin tưởng vào `npx tsc --noEmit` và `npm run build`. Sau khi thực hiện: cURL test -> SSR test -> UI test -> API test, bạn **BẮT BUỘC** phải kiểm tra log: `@ui/app.log`, `@api/api.log`
> 2. Theo dõi log trực tiếp trong suốt quá trình server/client fetch data. Nếu có các lỗi runtime type như `TypeError: ... is not a function`, `Cannot read properties of undefined`, Next.js sẽ văng lỗi ngay lập tức trên màn hình dev terminal. Sửa ngay lập tức thay vì cho rằng đã test xong.

### Kinh nghiệm Phase 6 — Lỗi Ảnh 404 từ Dịch vụ Bên Thứ Ba (Unsplash) (2026-06-08)

**Tình huống:** Dù đã cập nhật logic, nhưng một số Component (`ArticleHero.tsx`, `PaymentGuideline.tsx`) và Database Seed (`seed.ts`) vẫn còn trỏ `image_url` về đường link cứng của Unsplash. Kết quả là khi URL bị lỗi 404 (do Unsplash thắt chặt policy), giao diện hiển thị ảnh bị lỗi (broken images).

**Hậu quả:** Người dùng cuối gặp lỗi hiển thị ảnh, làm giảm sự chuyên nghiệp của UI.

**Quy tắc bổ sung (bắt buộc áp dụng):**

> **Bước 9.1 — Third-Party Image & Asset Verification (Thêm vào Bước 9):**
>
> 1. Trừ các nguồn CDN ổn định cực cao (như `flagcdn.com`), tuyệt đối **KHÔNG** sử dụng URL ảnh từ bên thứ 3 (như Unsplash, Picsum) làm link gốc hoặc fallback cứng trong Code UI và Database Seed.
> 2. Bắt buộc phải **tải hình ảnh dự phòng (local fallback)** về lưu cục bộ (VD: `/public/images/...`).
> 3. Kiểm tra toàn bộ UI Components: Luôn phải dùng `<Image>` của `next/image` kết hợp fallback cục bộ (VD: `src={apiImage || '/images/local-fallback.jpg'}`) để xử lý mọi tình huống lỗi tải ảnh.

### Kinh nghiệm Phase 8 — Lỗi Cache Cứng Next.js & Lỗi Hiển Thị Dữ Liệu Null (2026-06-09)

**Tình huống 1 (Lỗi Cache Cứng):** Sau khi đã viết script seed dữ liệu mới vào Database thành công, giao diện Next.js App Router vẫn trả về mảng rỗng `[]` như cũ do Next.js lưu fetch cache cực kỳ mạnh (aggressive caching). Restart `npm run dev` không đủ để xoá fetch cache.
**Tình huống 2 (Lỗi Null Data Render):** Mock data cũ có trường (VD: `features` gồm 4 dòng). Khi chuyển sang gọi DB, một số trường như `plan.processing` bị `null`, dẫn đến UI render ra một thẻ `<span>` rỗng kèm một icon dấu tick vô nghĩa.

**Hậu quả:**

- Dev lầm tưởng code API hoặc Seed chưa chạy.
- Giao diện bị khuyết tật (empty checkmarks, broken layout) do thiết kế không lường trước việc dữ liệu null.

**Quy tắc bổ sung (bắt buộc áp dụng):**

> **Bước 7.1 — Xoá Cache Triệt Để Sau Khi Seed (Thêm vào Bước 7):**
>
> 1. Bất cứ khi nào cấu trúc DB hoặc dữ liệu Seed thay đổi, bắt buộc phải xoá trắng thư mục `.next` (`rm -rf .next` hoặc `Remove-Item -Recurse -Force .next`) trước khi start lại UI dev server. Nếu không, bài test cURL/SSR sẽ không chính xác. Hãy yêu cầu tôi tự chạy lại `npm run dev 2>&1 | tee -a api.log` (không tự ý chạy trên terminal của bạn)

> **Bước 9.2 — Conditional Rendering & Null Checks (Thêm vào Bước 9):**
>
> 1. Khi map dữ liệu từ Backend, tuyệt đối không render thẳng các object properties lên UI mà không bọc điều kiện kiểm tra tồn tại (VD: dùng `{plan.processing && <span>{plan.processing}</span>}`).
> 2. Luôn lường trước việc Backend trả về `null` hoặc mảng rỗng. Bố cục UI phải tự sập (collapse) gọn gàng chứ không để lại rác UI (icon dư, khoảng trắng thừa).

### Kinh nghiệm Phase 2 — Lỗi Cấu trúc Dữ Liệu Lồng Nhau & Giả Định Đa Ngôn Ngữ Sai Lệch (2026-06-11)

**Tình huống 1 (Lỗi Cấu Trúc Lồng Nhau):** Khi lấy dữ liệu Config trang chủ, thay vì trích xuất đúng Locale hiện tại (VD: `homeConfigData.hero[locale]`), UI Component lại được truyền toàn bộ Object đa ngôn ngữ. Dẫn đến Next.js không báo lỗi đỏ, UI không crash, HTTP vẫn 200, nhưng text bị rỗng hoàn toàn trên giao diện.
**Tình huống 2 (Lỗi Giả Định Đa Ngôn Ngữ):** Dù đã sửa cấu trúc Config tĩnh đúng, khi chuyển sang Tiếng Hàn (`ko`), các component lấy dữ liệu động từ API như `PricingPreview`, `HowItWorks` vẫn hiện Tiếng Anh. Nguyên nhân là DB Seed thực tế KHÔNG có bản dịch Tiếng Hàn, khiến Fallback ngầm kích hoạt (trả về Tiếng Anh). Dev lầm tưởng là đã thành công.
**Tình huống 3 (Lỗi CSS Wrapping):** Khi thay đổi nội dung ngôn ngữ và cấu trúc DOM, cụm "4.9★" ở HeroSection bị rớt dòng do không ép cấu trúc single-line nghiêm ngặt.

**Hậu quả:**
- UI bị mất nội dung dù SSR HTTP trả về 200.
- Tính năng đa ngôn ngữ bị "nửa mùa" (chỉ dịch phần vỏ tĩnh, ruột động vẫn Tiếng Anh).
- Lỗi hiển thị giao diện (Layout shift/wrap) trên mobile.

**Quy tắc bổ sung (bắt buộc áp dụng):**

> **Bước 9.3 — Multi-language Data & Object Integrity Check (Thêm vào Bước 9):**
> 
> 1. Khi UI fetch JSON Object đa ngôn ngữ từ DB, **bắt buộc** kiểm tra logic truy xuất đúng thuộc tính theo locale (VD: `data[locale] || data['en']`), không truyền nguyên Object xuống Component con.
> 2. Tuyệt đối không suy diễn "Tiếng Việt hoạt động thì Tiếng Hàn cũng sẽ hoạt động". Bắt buộc phải **test đủ 3 ngôn ngữ (Anh, Việt, Hàn) cho MỌI thành phần trên giao diện**, từ thẻ tĩnh đến dữ liệu động từ API, đảm bảo hiển thị đúng chuẩn và pass 100% không còn sót lại tiếng Anh lọt vào ngôn ngữ khác.

> **Bước 9.4 — Strict Single-Line CSS & Layout Wrapping Check:**
> 
> 1. Đối với các cụm thông tin thống kê, Icon + Text quan trọng cần nằm ngang, không dùng `flex-wrap` tuỳ tiện. Nên sử dụng cấu trúc `flex-row items-center whitespace-nowrap overflow-hidden` và tinh chỉnh `text-size` phù hợp cho Mobile để tránh vỡ/rớt dòng.

### Kinh nghiệm Phase 3 — Lỗi Ghi Đè Dữ Liệu Cũ và Parsing JSON Đa Ngôn Ngữ Ẩn (2026-06-11)

**Tình huống 1 (Ghi đè/Thêm thừa dữ liệu):** Thay vì bảo toàn số lượng 3 thành viên Team Member như ban đầu, tôi đã dùng hàm `create` thêm mới 3 thành viên khiến DB bị nhân đôi (6 người) làm hỏng thiết kế UI.
**Tình huống 2 (Lỗi Đa ngôn ngữ bị ẩn & Dịch thuật sót):** Dữ liệu Team Member cho `role` và `description` trong Schema Prisma được định nghĩa là kiểu `String` thuần túy, do đó tôi đã không hỗ trợ đa ngôn ngữ ngay từ đầu vì lầm tưởng nó không thể. Thực tế, ta có thể lưu chuỗi JSON stringified `{"en": "CEO", "vi": "Giám Đốc"}` vào kiểu String và parse lại trên Server Component của Next.js. Ngoài ra, việc dịch thuật cẩu thả (để nguyên "CEO" cho bản Hàn Quốc) khiến người dùng đánh giá chưa đạt.

**Hậu quả:**
- UI bị phá vỡ bố cục do thừa số lượng Item.
- Mất tính năng đa ngôn ngữ, hoặc có đa ngôn ngữ nhưng dịch thiếu/sót (dịch nửa mùa) khiến UI hiện sai ngôn ngữ.

**Quy tắc bổ sung (bắt buộc áp dụng):**

> **Bước 9.5 — Data Seed Constraint & JSON Parsing Check (Thêm vào Bước 9):**
>
> 1. Trừ khi được yêu cầu thêm, bắt buộc phải bảo toàn đúng **SỐ LƯỢNG** các thành phần UI (cards, list items, team members) như file mock ban đầu. Luôn xoá dữ liệu cũ `deleteMany({})` hoặc dùng `upsert` cẩn thận trước khi seed lại để không bị phình to (duplicate) dữ liệu.
> 2. Nếu một trường trong DB chỉ hỗ trợ kiểu `String` nhưng yêu cầu UI là đa ngôn ngữ, bắt buộc phải dùng kỹ thuật lưu trữ **chuỗi JSON (stringified JSON)** và thực hiện lệnh `JSON.parse` trên Next.js Server Component để truy xuất đúng locale (VD: `JSON.parse(m.role)[locale]`). 
> 3. **Bắt buộc phải kiểm tra và test 100% trên đủ 3 ngôn ngữ (English, Tiếng Việt, 한국어)**. Không được để sót bất cứ từ nào chưa được dịch ở bất kỳ phiên bản ngôn ngữ nào (VD: "CEO" sang Hàn Quốc phải là "최고경영자" hoặc "대표이사").
> 4. **Kiểm tra kỹ các file config chứa mảng dữ liệu (ví dụ: `footer.api.ts`, `header.api.ts`, `seed.ts`) để đảm bảo MỌI item đều có đủ các key ngôn ngữ (`en`, `vi`, `ko`).** Đừng chỉ kiểm tra một vài ngôn ngữ rồi bỏ sót ngôn ngữ thứ 3. Đồng thời, phải kiểm tra kỹ `app.log` và `api.log`. **Bất kỳ request hình ảnh 404 nào (ví dụ: `GET /images/about-us/journey.jpg 404`) cũng đều là lỗi nghiêm trọng**. Phải loại bỏ các option/item chứa data hình ảnh rác hoặc cập nhật đúng đường dẫn.
> 5. **Hiểu rõ ưu tiên dữ liệu (Fallback vs Database):** Khi UI fetch dữ liệu qua API (ví dụ mảng Navigation), dữ liệu trả về từ Database sẽ luôn ghi đè các biến `FALLBACK` ở UI. Nếu giao diện bị thiếu đa ngôn ngữ, không chỉ sửa file API (fallback) bên `ui/` mà **BẮT BUỘC** phải kiểm tra và cập nhật JSON trong file `api/prisma/seed.ts`, sau đó chạy `npx prisma db seed` để đưa dữ liệu đa ngôn ngữ thực tế vào Database.

### Kinh nghiệm Phase 4 — Lỗi Rỗng Dữ Liệu Do Trích Xuất Data (Double Extraction) & Thiếu Fallback Array (2026-06-11)

**Tình huống 1 (Double `.data` extraction):** Khi gọi API từ Server Component, Axios interceptor hoặc hàm helper đã tự động parse JSON (ví dụ: `return res.data` chứa payload `{ hero: ..., pricing: ... }`). Nhưng ở Page component lại lấy thêm một lần nữa `settingsRes?.data`, khiến cho object trả về bị `undefined` (`{}` rỗng), dẫn tới toàn bộ page render ra chữ trống trơn mặc dù API HTTP trả 200.
**Tình huống 2 (Thiếu Fallback ở map):** Do dữ liệu bị rỗng (`undefined`), khi gọi hàm `config.tiers.map(...)` hoặc `config.steps.map(...)`, Next.js bị crash SSR (`TypeError: Cannot read properties of undefined`).

**Hậu quả:**
- UI render trống rỗng (blank text) vì dữ liệu không ánh xạ được.
- Gây lỗi sập Server Component (SSR Crash).
- Dev lầm tưởng do cURL ra status 200 là thành công mà không check kỹ log lỗi `TypeError` trong `app.log`.

**Quy tắc bổ sung (bắt buộc áp dụng):**

> **Bước 8.2 — Double Extraction & SSR Crash Check (Thêm vào Bước 8):**
>
> 1. BẮT BUỘC phải đọc kỹ cấu trúc Response trả về từ Client SDK. Nếu hàm wrapper (như `apiClient.get()`) đã unwrap payload, tuyệt đối không chấm `.data` (`.data.data`) thêm lần nữa.
> 2. Mọi đoạn code dùng vòng lặp `.map()` để render UI từ một list dữ liệu lấy từ API, BẮT BUỘC phải có mảng Fallback trống `|| []` để chống vỡ SSR. VD: `(config.tiers || []).map(...)`.
> 3. Tuyệt đối không kết luận thành công chỉ qua mã 200 của HTTP. Bắt buộc kiểm tra Log xem có lỗi `Cannot read properties of undefined` không.

### Kinh nghiệm Phase 10 — Lỗi Cache Realtime Admin-UI và Thiếu Type Exports (2026-06-16)

**Tình huống 1 (Next.js Aggressive Caching):** Khi Admin thay đổi dữ liệu (VD: đổi tên "Canada" thành "Canader"), Next.js Cache Component ở UI vẫn trả về kết quả cũ ("Canada"). Dù Backend API đã gọi Webhook `POST /api/revalidate` để clear cache thành công, trình duyệt của User không tự động làm mới trang, buộc người dùng phải F5 thủ công mới thấy thay đổi.
**Tình huống 2 (Thiếu TypeScript Exports Ngầm):** Thêm Type mới (`Nationality`) vào hook ở `useNationalities.ts` bằng cách import từ `home.api.ts`, nhưng quên export trong chính file `home.api.ts`. IDE có thể tự do suggest import giả, dẫn đến `tsc` báo lỗi lúc build nhưng dev dễ dàng bỏ qua nếu chỉ tin vào màn hình dev server.
**Tình huống 3 (Import Lỗi Module):** Sử dụng hàm `getFlagUrl` nhưng IDE auto-import nhầm từ thư viện `/lib/flagcdn` thay vì `/components/sections/nationalities/data`, làm sập UI (HTTP 500) vì biến/hàm không tồn tại.

**Hậu quả:**
- Tính năng real-time thất bại, User phải F5 thủ công — trải nghiệm kém.
- Build Next.js sẽ crash nếu deploy (vì TypeScript lỗi).
- UI crash ngầm (HTTP 500) nếu import sai thư viện/hàm.

**Quy tắc bổ sung (bắt buộc áp dụng):**

> **Bước 10.1 — Realtime Cache Invalidation Pattern (Thêm vào Bước 10):**
>
> 1. Khi một tính năng yêu cầu Real-time Sync (cập nhật ngay lập tức từ Admin sang màn hình End User mà không F5), **bắt buộc** phải sử dụng kiến trúc Websocket (Soketi/Pusher). 
> 2. Backend API sau khi gọi webhook revalidate xong, phải bắn thêm 1 event (VD: `cache_revalidated` trên channel `system-events`).
> 3. Ở UI, luôn cần một Provider chạy ngầm (VD: `SystemEventsProvider`) lắng nghe event này, và thực thi `router.refresh()` thay vì quản lý bằng state. Đừng dùng `useState` cho dữ liệu lấy từ Server Components.

> **Bước 10.2 — Strict Export & Import Validation (Thêm vào Bước 10):**
>
> 1. Nếu thêm Type/Interface mới để import vào Hook hoặc Component, **phải mở trực tiếp file đích** lên để thêm `export interface X` chứ không mặc định giả định IDE đã tự sửa.
> 2. Chạy `npx tsc --noEmit` ở cả dự án `@api` và `@ui` là **bước BẮT BUỘC** (không được phép bỏ qua) ngay sau khi sửa import/export.
> 3. Nếu import một Helper function, luôn kiểm tra hàm đó có tồn tại trong đường dẫn import hay không, đề phòng IDE auto-import nhầm tên giống nhau giữa các module khác nhau.

### Kinh nghiệm Phase 11 — Lỗi Fallback Đa Ngôn Ngữ, Tiêu đề Trang và Hiệu Năng Animation (2026-06-17)

**Tình huống 1 (Lỗi Fallback Dịch Thuật):** Sử dụng `{t("common.confirmDeleteTitle") || "Xác nhận xoá?"}` trên UI nhưng không biết rằng hàm `t()` khi không tìm thấy key sẽ trả về chính tên key đó (chuỗi `"common.confirmDeleteTitle"`). Điều này làm toán tử `||` không bao giờ được kích hoạt, dẫn đến UI hiển thị tên key thay vì text fallback.
**Tình huống 2 (Lỗi Tiêu đề Trang / Metadata):** Cố gắng cập nhật tiêu đề Tab trình duyệt bằng `useEffect(() => { document.title = ... })` bên trong Client Component (`"use client"`). Cách làm này bị xung đột với cơ chế SSR Metadata của Next.js App Router, khiến tiêu đề trang không hiển thị khi Refresh (F5) hoặc bị chớp (flicker).
**Tình huống 3 (Lỗi Cú pháp ngầm khi dùng công cụ AI):** Khi dùng tính năng Revert/Replace code qua công cụ AI, đã vô tình làm mất dấu ngoặc nhọn `}` đóng của Interface `PageHeaderProps`. Nếu không có bước check log/tsc sẽ khiến toàn bộ build Next.js sập.
**Tình huống 4 (Hiệu năng Framer Motion):** Import trực tiếp `motion.div` từ `framer-motion` thay vì dùng `m.div` (LazyMotion) gây nặng Client Bundle và ảnh hưởng performance khi render danh sách.

**Hậu quả:**
- Giao diện người dùng hiện lỗi key ngôn ngữ khó hiểu (VD: "common.confirmDeleteTitle").
- Tab trình duyệt không hiển thị đúng ngữ cảnh trang web, SEO kém.
- Web sập hoàn toàn do lỗi cú pháp cơ bản.
- Trải nghiệm chuyển trang chậm chạp hơn mức cần thiết.

**Quy tắc bổ sung (bắt buộc áp dụng):**

> **Bước 11.1 — Safe Translation Fallback:**
> 1. Luôn kiểm tra hàm `t()` hoặc helper tương đương hỗ trợ đối số fallback như thế nào. Nếu có đối số thứ 2 làm fallback (VD: `t(key, fallback)`), **bắt buộc** dùng nó: `t("key", "Text mặc định")`. Tuyệt đối không dùng `t("key") || "Text"`.

> **Bước 11.2 — Next.js Metadata API Protocol:**
> 1. Trong Next.js App Router, tuyệt đối không dùng `useEffect` để gán `document.title` cho các trang cố định.
> 2. Phải tạo file `layout.tsx` (Server Component) tại thư mục route tương ứng và export `metadata` API chuẩn của Next.js. Ví dụ: `export const metadata: Metadata = { title: "Tên trang | FastVisa" }`.

> **Bước 11.3 — Strict Code Integrity Check (Bổ sung Bước 10.2):**
> 1. Mọi thao tác Replace Code/Revert đều có nguy cơ mất ngoặc `}`, dấu phẩy `,` hoặc break syntax. Sau khi sửa bất kỳ file `.tsx/.ts` nào, lệnh `npx tsc --noEmit` là rào cản cuối cùng bắt buộc phải Pass 100% trước khi phản hồi người dùng.

> **Bước 11.4 — Animation Performance Rule:**
> 1. Tuyệt đối không dùng `import { motion } from "framer-motion"`. Bắt buộc đổi sang `import { m } from "framer-motion"` và `<m.div>` cùng với `LazyMotion` bao bọc ở cấp Root để tối ưu hiệu năng SSR và Bundle Size.

### Kinh nghiệm Phase 12 — Kiến trúc Real-time "Chậm 1 Nhịp" & Bẫy `"use cache"` SWR (2026-06-18)

**Tình huống:** Tính năng "Hướng dẫn các bước" (`HowItWorks`) được cập nhật từ Admin nhưng UI người dùng luôn hiển thị dữ liệu **trễ 1 lần lưu**. Lưu lần 1 → UI vẫn thấy cũ. Lưu lần 2 → UI mới hiện kết quả lần 1. So sánh với `/master/nationalities` cùng cơ chế Pusher + `router.refresh()` nhưng lại không bị lag.

**Nguyên nhân gốc rễ (đã chứng minh bằng test thực nghiệm):**

1. **Bẫy `"use cache"` SWR (Stale-While-Revalidate):** Khi nhiều hàm API cùng dùng một tag chung (`cacheTag("home-data")`), `revalidateTag("home-data")` chỉ **đánh dấu stale** toàn bộ nhóm cache đó. Next.js kích hoạt hành vi SWR: trả về data cũ ngay lập tức + bắt đầu background fetch. Khi `router.refresh()` (từ Pusher event) đến, nó nhận được **data cũ từ SWR** chứ không phải data mới.

2. **Pusher bắn SAU webhook:** `revalidateCache()` cũ gọi `await fetch(webhook)` trước rồi mới `pusher.trigger()`. Điều này khiến Browser nhận Pusher event khi background fetch chưa hoàn tất → `router.refresh()` nhận data cũ.

3. **`nationalities` không bị ảnh hưởng vì:** Tag `"nationalities"` là **độc lập**, không chia sẻ cache entry với section nào khác → `revalidateTag("nationalities")` invalidate đúng 1 entry → không SWR confuse.

**Hậu quả:**
- Real-time thất bại hoàn toàn — luôn trễ 1 nhịp dù Pusher event bắn đúng.
- Các giải pháp tạm thời như `setTimeout(router.refresh, 400)` che giấu vấn đề thay vì giải quyết gốc rễ.
- `revalidateTag` trong Route Handler **KHÔNG** tương đương với Server Action — không thể dùng `updateTag` bên ngoài Server Action.

**Giải pháp đúng (đã verify 10/10 E2E tests PASS):**

> **Quy tắc 12.1 — Mỗi section PHẢI có `cacheTag` riêng biệt:**
>
> ```ts
> // ❌ SAI — dùng chung tag "home-data" cho tất cả section
> async function fetchWithLocale(endpoint, locale) {
>     "use cache";
>     cacheTag("home-data"); // ← tất cả section bị SWR cùng lúc
> }
>
> // ✅ ĐÚNG — mỗi section có tag riêng
> export async function getHowItWorks(locale) {
>     "use cache";
>     cacheTag("how-it-works"); // ← chỉ invalidate section này
> }
> export async function getTestimonials(locale) {
>     "use cache";
>     cacheTag("testimonials"); // ← chỉ invalidate section này
> }
> ```
>
> **Quy tắc:** Tag phải khớp 1-1 giữa UI (`cacheTag`) và Backend (`revalidateCache(tag)`). Dùng chung tag gây SWR lag dây chuyền.

> **Quy tắc 12.2 — Trigger Pusher SONG SONG với webhook, không tuần tự:**
>
> ```ts
> // ❌ SAI — tuần tự: Browser nhận event TRƯỚC khi cache fresh
> await fetch(webhook);      // t=0 → t=80ms: cache bắt đầu stale
> pusher.trigger(...);       // t=80ms: browser gọi router.refresh() → SWR trả cũ
>
> // ✅ ĐÚNG — song song: cache fresh và Pusher event đến cùng lúc
> await Promise.all([
>     fetch(webhook),        // invalidate cache
>     pusher.trigger(...)    // notify browser
> ]);
> ```

> **Quy tắc 12.3 — `revalidatePath` là backup, KHÔNG phải giải pháp chính:**
>
> `revalidatePath("/")` purge toàn bộ Full Route Cache của trang "/" → không lãng phí nếu mỗi section đã có tag riêng.
> Khi tag riêng được thiết lập đúng, `revalidateTag(tag)` đủ để invalidate chính xác mà không cần `revalidatePath`.
> Chỉ dùng `revalidatePath` như tham số tùy chọn cho các trường hợp đặc biệt.

> **Quy tắc 12.4 — Component phải tự fetch trong Suspense boundary riêng (Bắt buộc, không phải nhầm lẫn):**
>
> Bọc `<Suspense>` xung quanh các component tự fetch dữ liệu là một **Best Practice kiến trúc bắt buộc** chứ không phải sự nhầm lẫn hay giải pháp tạm thời. Nó giải quyết triệt để vấn đề hiệu năng và chặn render (blocking UI) khi cập nhật real-time.
>
> ```tsx
> // ❌ SAI — nhận data từ props của page root → router.refresh() phải re-render cả page
> export default async function page() {
>     const data = await getHowItWorks(locale); // fetch ở root
>     return <HowItWorks data={data} />;         // HowItWorks không tự fetch
> }
>
> // ✅ ĐÚNG — mỗi section tự fetch trong Suspense boundary riêng
> export default async function page() {
>     return (
>         <Suspense fallback={<Skeleton />}>
>             <HowItWorks />  {/* tự gọi getHowItWorks() bên trong */}
>         </Suspense>
>     );
> }
> ```
>
> **Lý do sâu xa:**
> 1. **Cô lập luồng Render (Render Isolation):** Khi Pusher bắn tín hiệu revalidate và client gọi `router.refresh()`, Next.js Server không cần chạy lại toàn bộ hàm `page()` cấp Root để chờ đợi tất cả các API fetch hoàn thành. Nó chỉ đánh giá lại và render đúng Suspense boundary chứa component có cache bị stale (nhờ cache tag riêng biệt).
> 2. **Tránh chặn UI (Non-blocking):** Nhờ có Suspense, Next.js có thể stream (truyền tải bất đồng bộ) kết quả render mới của component con bị thay đổi xuống client. Phần giao diện tĩnh bên ngoài (Header, Footer, Hero) được giữ nguyên lập tức mà không bị khựng lại hay chờ đợi.
> 3. **Tương thích PPR (Partial Prerendering):** Giúp ứng dụng giữ được bản build tĩnh cực nhanh ở CDN cho phần khung trang, trong khi các phần dynamic data vẫn cập nhật real-time mượt mà qua luồng stream độc lập.

> **Quy tắc 12.5 — Backend tag map phải đồng bộ tuyệt đối với UI cacheTag:**
>
> ```ts
> // api/services/admin/page-settings.admin.service.ts
> const PAGE_TAG_MAP = {
>     "HOME_HOW_IT_WORKS": "how-it-works",   // ← phải khớp với cacheTag("how-it-works") ở UI
>     "HOME_PRICING":      "pricing-preview", // ← phải khớp với cacheTag("pricing-preview")
> };
>
> // api/services/admin/step-guidelines.admin.service.ts
> await revalidateCache("how-it-works"); // ← dùng đúng tag, không dùng generic "home-data"
> ```
>
> Kiểm tra đồng bộ: Mọi khi thêm `cacheTag("X")` ở UI, bắt buộc phải tìm service Backend tương ứng và đổi `revalidateCache("cũ")` → `revalidateCache("X")`.

> **Quy tắc 12.6 — Không dùng `setTimeout` để workaround timing issues:**
>
> `setTimeout(router.refresh, 400)` là dấu hiệu kiến trúc sai. Nếu cần delay để lấy data mới, đó là cache chưa được invalidate đúng cách. Phải sửa tag mapping, không che giấu bằng delay nhân tạo.

> **Quy tắc 12.7 — Test real-time PHẢI chứng minh bằng E2E script, không chỉ thủ công:**
>
> Viết script test có timestamp rõ ràng:
> 1. GET data trước khi thay đổi → log ra
> 2. PUT thay đổi qua Admin API
> 3. GET data ngay sau 0ms delay → kiểm tra marker
> 4. Chứng minh data mới xuất hiện ngay lập tức (< 50ms sau PUT)
>
> Nếu script test PASS nhưng browser vẫn chậm → vấn đề nằm ở Pusher timing hoặc Suspense boundary, không phải cache.

### Kinh nghiệm Phase 13 — Lỗi Chữ Ký Hàm API và Bẫy Tham Số Cache (2026-06-18)

**Tình huống 1 (Lỗi Chữ Ký Hàm API ngầm):** Trong API Webhook `/api/revalidate/route.ts` của Next.js UI, hàm `revalidateTag(tag as string, "max")` được sử dụng với 2 tham số. Tuy nhiên, API gốc của Next.js `revalidateTag` chỉ nhận duy nhất 1 tham số. Do Next.js xử lý nghiêm ngặt hoặc TS sinh lỗi runtime nội bộ, webhook này đã fail ngầm (fail silent ở background) khiến UI Client không bao giờ xóa được cache khi backend gọi webhook.
**Tình huống 2 (Bẫy tham số khi fetch dữ liệu Real-time):** Trong hàm `getNationalities()`, ai đó đã hardcode thêm `limit=12&featured=true` vào URL. Hậu quả là dù Webhook có chạy thành công, cache có xóa thành công, thì UI chỉ fetch lại tối đa 12 quốc gia (featured). Nếu Admin vừa sửa một quốc gia không nằm trong top 12, dữ liệu mới sẽ vĩnh viễn không xuất hiện trên UI (Dropdown bị mất/ẩn danh sách). Dev lầm tưởng do "UI không cập nhật real-time".

**Hậu quả:**
- Tính năng real-time thất bại toàn diện.
- Lỗi bị chuẩn đoán sai là do Caching hoặc Pusher timing, dẫn đến tốn thời gian debug sai hướng.
- Bố cục Dropdown UI bị lỗi do thiếu data.

**Quy tắc bổ sung (bắt buộc áp dụng):**

> **Bước 13.1 — Strict API Signature Validation:**
> 1. Tuyệt đối không truyền thừa tham số vào các hàm Core API của Next.js (như `revalidateTag`, `revalidatePath`, `cookies`, `headers`). Luôn hover (hoặc kiểm tra tài liệu) để đảm bảo chữ ký hàm (function signature) chính xác.

> **Bước 13.2 — Data Fetching Integrity (Chống bẫy tham số):**
> 1. Khi debug lỗi "Không thấy dữ liệu mới trên UI", **bắt buộc** kiểm tra hàm fetch API phía UI xem có bị hardcode các tham số như `limit`, `status`, `featured` khiến dữ liệu mới bị filter mất hay không, trước khi đổ lỗi cho Caching.

