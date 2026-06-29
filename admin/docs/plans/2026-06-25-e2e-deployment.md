# FASTVISA E2E Production Deployment Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

## 1. Checklist Theo Dõi Tiến Độ
- [ ] Phân tích User Flow & Kết quả kỳ vọng
- [x] Task 1: Cấu hình User bảo mật & Cài đặt môi trường cơ bản (NVM, Node v22, Nginx, Certbot)
- [x] Task 2: Cài đặt & Cấu hình MySQL Server 5.7 bảo mật
- [x] Task 3: Cấu hình & Chạy Soketi WebSockets Server (Node 18)
- [x] Task 4: Triển khai phân hệ Backend API (`@api`) & Seed Database
- [ ] Task 5: Triển khai phân hệ Client UI (`@ui`) & Cấu hình môi trường Next.js
- [ ] Task 6: Triển khai phân hệ Admin UI (`@admin`) & Cấu hình môi trường Next.js
- [ ] Task 7: Cấu hình Nginx Reverse Proxy cho 3 phân hệ & Xin chứng chỉ SSL (HTTPS)
- [ ] Verification: Health Check API (HTTPS) 100% Ok
- [ ] Verification: E2E Live Web Client & Admin UI load thành công

## 2. User Flow & Kết Quả Kỳ Vọng
- **User Flow**:
  1. Người dùng truy cập trang chủ `https://vazi.io.vn` thấy giao diện UI mượt mà, đầy đủ dữ liệu.
  2. Người quản trị truy cập `https://admin.vazi.io.vn`, đăng nhập bằng email `vietnmf8@fullstack.edu.vn` và mật khẩu quản trị.
  3. Mọi tương tác CRUD từ Admin UI sẽ cập nhật dữ liệu vào database MySQL và tự động gửi webhook revalidate cache sang cổng UI Client (`https://vazi.io.vn/api/revalidate`) realtime.
- **Kết Quả Kỳ Vọng**:
  * Cả 3 phân hệ chạy ngầm ổn định, an toàn dưới quyền user giới hạn `evisa`.
  * Hiệu năng cao, bảo mật chặt chẽ bằng giao thức HTTPS (SSL Let's Encrypt).
  * Tự động khôi phục (Auto-recovery) sau khi khởi động lại máy chủ (VPS reboot).

---

### Task 1: Cấu hình User & Cài đặt môi trường cơ bản
*Nhiệm vụ này cài đặt nền móng gồm Node.js, PM2, Nginx, Certbot trên một VPS Ubuntu trắng tinh.*

**Files:**
- Create: `/home/evisa/setup_env.sh` (Script hỗ trợ cài đặt tự động)

**Step 1: Tạo user hệ thống `evisa` & Cấp quyền sudo**
* Chạy các lệnh này với tư cách user `root` hiện tại trên VPS:
```bash
# 1. Tạo user evisa mới
adduser evisa
# Nhập mật khẩu của bạn (ví dụ: Viet251001)

# 2. Cấp quyền sudo
usermod -aG sudo evisa

# 3. Đăng nhập vào user evisa để thực hiện mọi tác vụ tiếp theo
su - evisa
```

**Step 2: Chạy script tự động cài đặt runtime dependencies**
* Tạo file `/home/evisa/setup_env.sh` với nội dung dưới đây và thực thi:
```bash
#!/bin/bash
set -e

echo "=== 1. Cập nhật hệ thống ==="
sudo apt update && sudo apt upgrade -y

echo "=== 2. Cài đặt Nginx, Git, Curl, Unzip ==="
sudo apt install -y nginx git curl unzip snapd

echo "=== 3. Cài đặt NVM & Node.js v22 ==="
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm install 18
nvm use 18
nvm alias default 18

echo "=== 4. Cài đặt PM2 toàn cục ==="
npm install -g pm2

echo "=== 5. Cài đặt Soketi ==="
npm install -g @soketi/soketi

echo "=== 6. Cài đặt Certbot (Let's Encrypt) ==="
sudo snap install --classic certbot
sudo ln -sf /snap/bin/certbot /usr/local/bin/certbot

echo "=== HOÀN THÀNH CÀI ĐẶT MÔI TRƯỜNG CƠ BẢN ==="
node -v
npm -v
pm2 -v
nginx -v
```
* Chạy phân quyền & thực thi script:
```bash
chmod +x ~/setup_env.sh
./setup_env.sh
```
* **Expected Output**: Hiển thị phiên bản Node.js (v22.x), PM2 (v5.x), Nginx và hoàn thành không lỗi.

---

### Task 2: Cài đặt & Cấu hình MySQL Server 5.7 bảo mật
*Nhiệm vụ này thiết lập cơ sở dữ liệu MySQL bảo mật và cấu hình tài khoản truy cập nội bộ cho dự án.*

**Step 1: Cài đặt MySQL Server 5.7**
*(Ubuntu 18.04 cài đặt sẵn MySQL 5.7, dự án hoàn toàn tương thích)*
```bash
sudo apt install -y mysql-server
```

**Step 2: Chạy chương trình bảo mật hóa MySQL**
```bash
sudo mysql_secure_installation
# Chọn cấu hình mật khẩu mạnh (Y), xóa user vô danh, chặn root remote login.
```

**Step 3: Tạo Database & Cấp quyền truy cập cho User**
* Đăng nhập vào MySQL Console với quyền root:
```bash
sudo mysql -u root
```
* Thực thi các lệnh SQL sau:
```sql
-- Tạo database fastvisa rỗng
CREATE DATABASE fastvisa CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Tạo user evisa_user kết nối nội bộ với mật khẩu cực mạnh
CREATE USER 'evisa_user'@'localhost' IDENTIFIED BY 'EvisaSecurePass2026@!';

-- Cấp toàn quyền thao tác trên db fastvisa cho user vừa tạo
GRANT ALL PRIVILEGES ON fastvisa.* TO 'evisa_user'@'localhost';

-- Áp dụng thay đổi quyền hạn
FLUSH PRIVILEGES;
EXIT;
```

---

### Task 3: Cấu hình & Chạy Soketi WebSockets Server
*Thiết lập Soketi (chạy bằng Node 18) làm dịch vụ độc lập quản lý qua PM2.*

**Step 1: Tạo tệp cấu hình Soketi**
* Tạo tệp `/home/evisa/soketi_config.json` với cấu hình từ Local của bạn:
```json
{
    "debug": false,
    "port": 6001,
    "appManager.array.apps": [
        {
            "id": "soketi-25",
            "key": "MvvnVXsfh5j64mVzxwgvL29N5mmNMNEEGMSMtvc5w",
            "secret": "k2MdJlVA5bTGbxswFufMNswL2q9jl8vZ0LZhJIDRei4"
        }
    ]
}
```

**Step 2: Chạy Soketi qua PM2 bằng Node 18**
* Lệnh khởi chạy:
```bash
pm2 start /home/evisa/.nvm/versions/node/v18.x.x/bin/soketi --name "fastvisa-soketi" -- start --config=/home/evisa/soketi_config.json
```
*(Ghi chú: Thay v18.x.x bằng phiên bản chính xác cài được ở Task 1, ví dụ v18.20.4).*

---

### Task 4: Triển khai Backend API (`@api`) & Seed Database
*Nhiệm vụ này đưa API Server lên VPS, cấu hình môi trường sản xuất (.env) và khởi tạo database bằng Prisma.*

**Step 1: Cài đặt Node 22 đặc biệt (Unofficial) cho Ubuntu cũ & Đưa mã nguồn API lên**
*(Do Ubuntu 18.04 có GLIBC cũ, ta dùng bản biên dịch sẵn glibc-217 của Node 22)*
```bash
# Cài Node 22 đặc biệt
cd ~
wget https://unofficial-builds.nodejs.org/download/release/v22.12.0/node-v22.12.0-linux-x64-glibc-217.tar.xz
tar -xf node-v22.12.0-linux-x64-glibc-217.tar.xz
sudo cp -r node-v22.12.0-linux-x64-glibc-217/* /usr/local/
hash -r
node -v # Cần đảm bảo ra v22.12.0

# Tạo Swap File (Tránh lỗi hết RAM - ENOMEM khi cài thư viện)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Chuyển mã nguồn
cd /home/evisa/zavi/api
rm -rf node_modules package-lock.json
sudo chown -R 1000:1000 "/home/evisa/.npm"
npm install
npx prisma generate
npx prisma db push
```

**Step 2: Tạo tệp môi trường sản xuất `/home/evisa/api/.env`**
```env
PORT=5000
NODE_ENV=production

# Database URL kết nối tới MySQL local vừa tạo ở Task 2
DATABASE_URL="mysql://evisa_user:EvisaSecurePass2026%40%21@localhost:3306/fastvisa"

# Cấu hình Auth bảo mật
JWT_SECRET="openssl_rand_base64_32_harcoded_value_for_security"
JWT_EXPIRES_IN=7d
ALLOWED_ADMIN_EMAIL=vietnmf8@fullstack.edu.vn

# Đặt mật khẩu seed admin ban đầu
ADMIN_SEED_PASSWORD="Viet251001_AdminPass@!"
ADMIN_SEED_NAME="FastVisa Admin"
ADMIN_SEED_PHONE="0900000000"

# CORS & URLs Public
FRONTEND_URL="https://vazi.io.vn"
ADMIN_URL="https://admin.vazi.io.vn"
UI_BASE_URL="https://vazi.io.vn"

# ISR Secret đồng bộ với UI
REVALIDATE_SECRET="evisa_revalidate_production_secret_key_123@"

# Soketi
SOKETI_APP_ID="soketi-25"
SOKETI_APP_KEY="MvvnVXsfh5j64mVzxwgvL29N5mmNMNEEGMSMtvc5w"
SOKETI_APP_SECRET="k2MdJlVA5bTGbxswFufMNswL2q9jl8vZ0LZhJIDRei4"
SOKETI_APP_CLUSTER="mt1"
SOKETI_HOST="127.0.0.1"
SOKETI_PORT=6001
```

**Step 3: Build & Khởi tạo Database**
```bash
# Biên dịch mã nguồn API sang JS (dist)
npm run build

# Khởi chạy Prisma migration & Seeding dữ liệu hệ thống
npm run db:setup
```

**Step 4: Chạy API Server dưới quyền PM2**
```bash
pm2 start ecosystem.config.cjs
# Xem trạng thái ứng dụng
pm2 status
```
* **Expected Output**: PM2 hiển thị 3 tiến trình hoạt động (`fastvisa-api`, `fastvisa-worker`, `fastvisa-schedule`) ở trạng thái `online`.

---

### Task 5: Triển khai Client UI (`@ui`) - [DONE]
*Đưa ứng dụng Next.js của Client UI lên VPS, cấu hình biến môi trường và chạy PM2.*

**Step 1: Đưa mã nguồn Client UI vào `/home/evisa/ui`**
```bash
cd /home/evisa/ui
npm install
```

**Step 2: Tạo tệp `/home/evisa/ui/.env.production`**
```env
NODE_ENV=production
PORT=3000

# Endpoint của API backend
NEXT_PUBLIC_API_URL="https://api.vazi.io.vn"

# Khóa bí mật đồng bộ hóa Cache (Khớp với API)
REVALIDATE_SECRET="evisa_revalidate_production_secret_key_123@"

# Soketi
NEXT_PUBLIC_SOKETI_KEY="MvvnVXsfh5j64mVzxwgvL29N5mmNMNEEGMSMtvc5w"
NEXT_PUBLIC_SOKETI_HOST="api.vazi.io.vn"
NEXT_PUBLIC_SOKETI_PORT=443
NEXT_PUBLIC_SOKETI_FORCE_TLS=true
```

**Step 3: Biên dịch Next.js & Khởi động qua PM2**
```bash
npm run build
pm2 start ecosystem.config.cjs
```

---

### Task 6: Triển khai Admin UI (`@admin`) - [DONE]
*Đưa dashboard Next.js của Admin UI lên VPS, cấu hình biến môi trường và chạy PM2.*

**Step 1: Đưa mã nguồn Admin UI vào `/home/evisa/admin`**
```bash
cd /home/evisa/admin
npm install
```

**Step 2: Tạo tệp `/home/evisa/admin/.env.production`**
```env
NODE_ENV=production
PORT=3001

# Endpoint của API backend
NEXT_PUBLIC_API_URL="https://api.vazi.io.vn"

# Soketi
NEXT_PUBLIC_SOKETI_KEY="MvvnVXsfh5j64mVzxwgvL29N5mmNMNEEGMSMtvc5w"
NEXT_PUBLIC_SOKETI_HOST="api.vazi.io.vn"
NEXT_PUBLIC_SOKETI_PORT=443
NEXT_PUBLIC_SOKETI_FORCE_TLS=true
```

**Step 3: Biên dịch Next.js & Khởi động qua PM2**
```bash
npm run build
pm2 start ecosystem.config.cjs
```

---

### Task 7: Cấu hình Nginx Reverse Proxy & SSL (HTTPS) - [DONE]
*Liên kết các cổng nội bộ (3000, 3001, 5000) ra internet qua các tên miền public bằng HTTPS.*

**Step 1: Tạo cấu hình Nginx Server Blocks**
* Tạo tệp cấu hình mới `/etc/nginx/sites-available/fastvisa`:
```nginx
# Client UI - https://vazi.io.vn
server {
    listen 80;
    server_name vazi.io.vn;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Admin Dashboard - https://admin.vazi.io.vn
server {
    listen 80;
    server_name admin.vazi.io.vn;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Backend API - https://api.vazi.io.vn
server {
    listen 80;
    server_name api.vazi.io.vn;

    # Backend API Express
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Soketi WebSockets
    location ~* ^/(app|apps)/ {
        proxy_pass http://127.0.0.1:6001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }
}
```

**Step 2: Kích hoạt cấu hình mới & Khởi động lại Nginx**
```bash
# Link cấu hình sang thư mục sites-enabled để kích hoạt
sudo ln -sf /etc/nginx/sites-available/fastvisa /etc/nginx/sites-enabled/

# Gỡ bỏ cấu hình mặc định (default) tránh tranh chấp cổng
sudo rm -f /etc/nginx/sites-enabled/default

# Kiểm tra cú pháp cấu hình Nginx xem có lỗi không
sudo nginx -t

# Tải lại cấu hình Nginx
sudo systemctl reload nginx
```

**Step 3: Thiết lập SSL HTTPS bằng Certbot**
```bash
sudo certbot --nginx -d vazi.io.vn -d admin.vazi.io.vn -d api.vazi.io.vn
# Chọn tự động redirect (mặc định) nếu được hỏi.
```

**Step 4: Lưu trạng thái và cấu hình Persistence cho PM2**
```bash
# Đăng ký PM2 khởi động cùng hệ điều hành
pm2 startup systemd
# Chạy dòng lệnh copy được từ kết quả lệnh trên để phân quyền (nếu có yêu cầu)

# Lưu lại danh sách tiến trình đang hoạt động
pm2 save
```

---

## Verification Plan (Bắt Buộc)

> **CẢNH BÁO:** Bắt buộc áp dụng tiêu chuẩn kiểm chứng nghiêm ngặt tương tự `phase-verification`. Không được tự động kết luận thành công nếu chưa pass toàn bộ các bước dưới đây.

**1. Mô phỏng cURL Http Request Thực Tế (Báo cáo Input/Output):**
* Kiểm tra Health Check của API:
  ```bash
  curl -i https://api.vazi.io.vn/api/v1/health
  ```
  *Kết quả kỳ vọng:* Trạng thái `HTTP/2 200 OK` và JSON: `{ "data": { "status": "ok" } }`

* Kiểm tra Client UI:
  ```bash
  curl -i https://vazi.io.vn
  ```
  *Kết quả kỳ vọng:* Trạng thái `HTTP/2 200 OK` trả về nội dung HTML của trang Next.js.

* Kiểm tra Admin UI:
  ```bash
  curl -i https://admin.vazi.io.vn
  ```
  *Kết quả kỳ vọng:* Trạng thái `HTTP/2 200 OK` trả về nội dung HTML của trang quản trị.

**2. System Log Analysis:**
* Kiểm tra logs hoạt động của PM2:
  ```bash
  pm2 logs
  ```
  *Tiêu chí:* Không thấy lỗi Error, Warn liên quan đến thiếu kết nối db hoặc thiếu biến môi trường.

**3. Build & Lint Check:**
* Mọi tiến trình build Next.js (`npm run build`) tại `@ui` và `@admin` đều đã được biên dịch thành công hoàn hảo trên VPS, không bị dính lỗi Typecheck hay tràn bộ nhớ.
