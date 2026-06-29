# Skill: NodeMailer + DB-backed Queue

**Trigger:** "gửi email", "send mail", "queue email", "mail template", "verification email"

## Overview

Project gửi email **KHÔNG await** trong request handler — đẩy vào DB queue, worker xử lý.

```
Controller → queueService.push("sendXEmail", payload) → response NGAY
                  ↓
DB table `queue` (status: pending)
                  ↓
queue.ts worker (poll 3s) → tasks["sendXEmail"](payload)
                  ↓
MailService.sendXEmail() → NodeMailer SMTP → status: completed/failed
```

---

## Bước 1: Setup config

```typescript
// src/configs/mail.ts
export default {
    host: process.env.MAIL_HOST ?? "smtp.gmail.com",
    port: parseInt(process.env.MAIL_PORT ?? "587", 10),
    secure: false, // STARTTLS
    user: process.env.MAIL_USER ?? "",
    password: process.env.MAIL_APP_PASSWORD ?? "", // Gmail App Password (16 ký tự)
    from: {
        name: process.env.MAIL_FROM_NAME ?? "MyApp",
        address: process.env.MAIL_FROM_ADDRESS ?? "noreply@myapp.com",
    },
    templatesDir: "src/resource/mail",
} as const;
```

## Bước 2: Lấy Gmail App Password

1. Bật 2-Step Verification: https://myaccount.google.com/security
2. Vào https://myaccount.google.com/apppasswords
3. Generate password cho "Mail" → "Other (custom name)" → "MyApp Backend"
4. Copy 16-character password (không có dấu cách) → paste vào `MAIL_APP_PASSWORD`
   ⚠️ **App Password ≠ Gmail password thường**. Phải dùng App Password mới gửi SMTP được.

## Bước 3: Mail service template

```typescript
// src/services/mail.service.ts
import nodemailer, { Transporter } from "nodemailer";
import { renderFile } from "ejs";
import { join } from "node:path";
import mailConfig from "@/configs/mail";

class MailService {
    private transporter: Transporter;

    constructor() {
        this.transporter = nodemailer.createTransport({
            host: mailConfig.host,
            port: mailConfig.port,
            secure: mailConfig.secure,
            auth: {
                user: mailConfig.user,
                pass: mailConfig.password,
            },
        });
    }

    private async send(options: {
        to: string;
        subject: string;
        template: string; // e.g. "auth/verify"
        templateData: Record<string, any>;
    }) {
        const templatePath = join(
            process.cwd(),
            mailConfig.templatesDir,
            `${options.template}.ejs`,
        );
        const html = await renderFile(templatePath, options.templateData);

        return this.transporter.sendMail({
            from: `"${mailConfig.from.name}" <${mailConfig.from.address}>`,
            to: options.to,
            subject: options.subject,
            html,
        });
    }

    async sendVerificationEmail(user: {
        email: string;
        name: string;
        token: string;
    }) {
        const verifyUrl = `${process.env.APP_BASE_URL}/verify?token=${user.token}`;
        return this.send({
            to: user.email,
            subject: "Xác thực email của bạn",
            template: "auth/verify",
            templateData: { name: user.name, verifyUrl },
        });
    }

    async sendPasswordResetEmail(user: {
        email: string;
        name: string;
        token: string;
    }) {
        const resetUrl = `${process.env.APP_BASE_URL}/reset-password?token=${user.token}`;
        return this.send({
            to: user.email,
            subject: "Đặt lại mật khẩu",
            template: "auth/reset-password",
            templateData: { name: user.name, resetUrl },
        });
    }
}

export default new MailService();
```

## Bước 4: EJS template

```html
<!-- src/resource/mail/auth/verify.ejs -->
<!DOCTYPE html>
<html>
    <head>
        <meta charset="UTF-8" />
        <title>Xác thực email</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <h1 style="color: #333;">Xin chào <%= name %>,</h1>
            <p>
                Cảm ơn bạn đã đăng ký. Vui lòng click vào nút bên dưới để xác
                thực email:
            </p>
            <p style="margin: 30px 0;">
                <a
                    href="<%= verifyUrl %>"
                    style="background: #0066cc; color: #fff; padding: 12px 24px; 
                      text-decoration: none; border-radius: 4px;"
                >
                    Xác thực email
                </a>
            </p>
            <p>Link sẽ hết hạn sau 24 giờ.</p>
            <p style="color: #999; font-size: 12px;">
                Nếu nút không hoạt động, copy link sau vào trình duyệt:<br />
                <%= verifyUrl %>
            </p>
        </div>
    </body>
</html>
```

## Bước 5: Queue setup (Prisma schema)

```prisma
model QueueJob {
    id        Int      @id @default(autoincrement())
    type      String   @db.VarChar(100)   // task name e.g. "sendVerificationEmail"
    payload   Json
    status    String   @default("pending") @db.VarChar(20)
    // ↑ "pending" | "inprogress" | "completed" | "failed"
    attempts  Int      @default(0)
    error     String?  @db.Text
    createdAt DateTime @default(now()) @map("created_at")
    updatedAt DateTime @updatedAt @map("updated_at")

    @@map("queue_jobs")
    @@index([status, createdAt])
}
```

## Bước 6: Queue service

```typescript
// src/services/queue.service.ts
import { prisma } from "@/configs/db";

class QueueService {
    async push(type: string, payload: any) {
        return prisma.queueJob.create({
            data: { type, payload, status: "pending" },
        });
    }

    async getNext() {
        return prisma.queueJob.findFirst({
            where: { status: "pending", attempts: { lt: 3 } },
            orderBy: { createdAt: "asc" },
        });
    }

    async markInProgress(id: number) {
        return prisma.queueJob.update({
            where: { id },
            data: { status: "inprogress", attempts: { increment: 1 } },
        });
    }

    async markCompleted(id: number) {
        return prisma.queueJob.update({
            where: { id },
            data: { status: "completed" },
        });
    }

    async markFailed(id: number, error: string) {
        return prisma.queueJob.update({
            where: { id },
            data: { status: "failed", error },
        });
    }
}

export default new QueueService();
```

## Bước 7: Queue worker entry point

```typescript
// src/queue.ts
import "dotenv/config";
import "module-alias/register";
import tasks from "@/tasks";
import queueService from "@/services/queue.service";
import queueConfig from "@/configs/queue";

const INTERVAL = parseInt(process.env.QUEUE_INTERVAL_MS ?? "3000", 10);

async function processOneJob() {
    const job = await queueService.getNext();
    if (!job) return;

    console.log(`[queue] Processing job #${job.id} (${job.type})`);
    await queueService.markInProgress(job.id);

    try {
        const handler = tasks[job.type];
        if (!handler) throw new Error(`Unknown task type: ${job.type}`);

        await handler(job.payload);
        await queueService.markCompleted(job.id);
        console.log(`[queue] ✓ Completed #${job.id}`);
    } catch (error: any) {
        await queueService.markFailed(job.id, error.message);
        console.error(`[queue] ✗ Failed #${job.id}: ${error.message}`);
    }
}

console.log(`[queue] Worker started, polling every ${INTERVAL}ms`);
setInterval(processOneJob, INTERVAL);
```

## Bước 8: Task file (auto-discovered)

```typescript
// src/tasks/sendVerificationEmail.task.ts
import mailService from "@/services/mail.service";

export default async (payload: {
    email: string;
    name: string;
    token: string;
}) => {
    await mailService.sendVerificationEmail(payload);
};
```

## Bước 9: Push từ service

```typescript
// src/services/auth.service.ts
import queueService from "@/services/queue.service"

class AuthService {
    async register(data: { email: string; name: string; password: string }) {
        // ... create user, generate verify token ...
        const user = await prisma.user.create({...})
        const token = generateVerifyToken(user.id)

        // ✅ Push email vào queue, KHÔNG await SMTP
        await queueService.push("sendVerificationEmail", {
            email: user.email,
            name: user.name,
            token,
        })

        return user  // User nhận response NGAY, email gửi background
    }
}
```

## Run workflow

```bash
# Terminal 1: HTTP server
npm run dev

# Terminal 2: Queue worker
npm run queue

# Terminal 3 (optional): Scheduler
npm run schedule
```

## Production deployment

PM2 ecosystem:

```javascript
// ecosystem.config.js
module.exports = {
    apps: [
        { name: "server", script: "./dist/server.js", instances: 2 },
        { name: "queue", script: "./dist/queue.js", instances: 1 }, // Chỉ 1 instance
        { name: "schedule", script: "./dist/schedule.js", instances: 1 },
    ],
};
```

## Checklist

- [ ] `.env` có `MAIL_APP_PASSWORD` (App Password, không phải Gmail password)
- [ ] Schema có model `QueueJob`
- [ ] EJS templates trong `src/resource/mail/`
- [ ] Task file đúng naming `<type>.task.ts`
- [ ] `tasks/index.ts` auto-discovery
- [ ] `queue.ts` poll interval = `QUEUE_INTERVAL_MS`
- [ ] Service push thay vì await SMTP
- [ ] PM2/Docker chạy server + queue riêng
