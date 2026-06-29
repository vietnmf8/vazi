# FastVisa - Hệ thống dịch vụ Visa trực tuyến

FastVisa là một hệ thống cung cấp dịch vụ đăng ký Visa trực tuyến, bao gồm 3 phần chính:
- **UI (Giao diện người dùng):** Website cho khách hàng tra cứu thông tin visa, nộp đơn đăng ký trực tuyến, và theo dõi trạng thái hồ sơ.
- **Admin (Trang quản trị):** Hệ thống dành cho quản trị viên quản lý đơn đăng ký visa, người dùng, bài viết hướng dẫn, và cấu hình hệ thống.
- **API (Backend server):** Cung cấp các API RESTful phục vụ cho cả UI và Admin, xử lý nghiệp vụ, quản lý database, hỗ trợ live chat, gửi email, tích hợp AI.

---

## 🛠 Công nghệ sử dụng

### 1. Dự án UI (User Interface)
- **Framework:** Next.js (App Router), React, TypeScript
- **Styling:** Tailwind CSS, Radix UI
- **Animation:** Framer Motion, GSAP
- **State Management:** Zustand

### 2. Dự án Admin (Admin Portal)
- **Framework:** Next.js (App Router), React, TypeScript
- **Styling:** Tailwind CSS, Radix UI
- **Form & Validation:** React Hook Form, Zod

### 3. Dự án API (Backend)
- **Framework:** Node.js, Express.js, TypeScript
- **Database:** Prisma ORM, MariaDB / MySQL
- **Realtime:** Socket.io / Pusher (Soketi) cho live chat
- **AI & NLP:** Node-NLP, Gemini AI cho chatbot
- **Tiện ích:** Zod (Validation), Cloudinary (Upload ảnh)

---

## 🚀 Cách chạy dự án (Local Development)

Hệ thống được chia làm 3 thư mục tương ứng với 3 dự án độc lập.

### Bước 1: Cài đặt Packages
Chạy lệnh `npm install` tại mỗi thư mục `api`, `admin`, và `ui`.

### Bước 2: Thiết lập Biến môi trường (.env)
- **API (`/api`):** Copy file `.env.example` thành `.env`. Cấu hình thông tin `DATABASE_URL`, `JWT_SECRET`, và `REVALIDATE_SECRET`.
- **Admin (`/admin`):** Copy file `.env.example` thành `.env.local`. Cấu hình `NEXT_PUBLIC_API_URL` trỏ tới `http://localhost:5000`.
- **UI (`/ui`):** Copy file `.env.example` thành `.env.local`. Cấu hình `NEXT_PUBLIC_API_URL` trỏ tới `http://localhost:5000` và `REVALIDATE_SECRET` phải khớp với API.

### Bước 3: Khởi tạo Database (Tại thư mục `/api`)
Chạy lệnh sau để migrate cấu trúc database, tạo seed data cơ bản và tạo tài khoản Admin:
```bash
cd api
npm run db:setup
```

### Bước 4: Khởi chạy các server
Mở 3 terminal khác nhau và chạy các server:

**1. Khởi chạy API Server:**
```bash
cd api
npm run dev:all
# API chạy tại http://localhost:5000
```

**2. Khởi chạy UI Server:**
```bash
cd ui
npm run dev
# UI chạy tại http://localhost:3000
```

**3. Khởi chạy Admin Server:**
```bash
cd admin
npm run dev
# Admin chạy tại http://localhost:3001
```

---

## 🔐 Tài khoản Demo

Sau khi chạy lệnh `npm run db:setup`, hệ thống sẽ tự động tạo một tài khoản Admin mặc định:

- **Tài khoản Admin (dùng để đăng nhập cổng `:3001`):**
  - **Email:** `vietnmf8@fullstack.edu.vn`
  - **Mật khẩu:** `Viet251001`

- **Tài khoản User (Khách hàng):**
  - Khách hàng có thể tự đăng nhập/đăng ký trực tiếp trên trang UI (`:3000`).
  - Hoặc sử dụng email cá nhân để tạo đơn hàng. Bạn cũng có thể dùng file `seed-fake-applications.ts` trong API để tạo nhanh các dữ liệu đơn ảo nhằm kiểm thử trên Admin.
