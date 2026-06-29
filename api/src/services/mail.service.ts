import nodemailer from "nodemailer";
import path from "path";
import ejs from "ejs";

import { getEnv } from "@/configs/env.config";
import { getPusher } from "@/lib/pusher-client";

/** Theo Nodemailer + Gmail: STARTTLS port 587, `secure: false`. */
const GMAIL_SMTP_HOST = "smtp.gmail.com";
const GMAIL_SMTP_PORT = 587;

/**
 * Gmail hiển thị App Password có khoảng trắng — SMTP cần chuỗi 16 ký tự liền.
 *
 * @param raw - Giá trị từ env (có thể chứa space)
 */
export function normalizeGmailAppPassword(raw: string): string {
    return raw.replace(/\s+/g, "");
}

/**
 * Kiểm tra đã đủ biến để gửi mail qua Gmail hay chưa (không throw).
 */
export function isMailConfigured(): boolean {
    const env = getEnv();
    return Boolean(env.MAIL_FROM_ADDRESS.trim() && env.MAIL_APP_PASSWORD.trim());
}

/**
 * Hộp thư nhận ticket nội bộ — fallback cùng inbox Gmail khi dev chỉ có một account.
 */
function resolveAdminNotifyAddress(env = getEnv()): string {
    const explicit = env.ADMIN_NOTIFY_EMAIL.trim();
    if (explicit.length > 0) {
        return explicit;
    }
    return env.MAIL_FROM_ADDRESS.trim();
}

/**
 * Header From RFC5322 — có display name khi `MAIL_FROM_NAME` khác rỗng.
 */
function formatFromHeader(env = getEnv()): string {
    const addr = env.MAIL_FROM_ADDRESS.trim();
    const nameRaw = env.MAIL_FROM_NAME.trim();
    if (!nameRaw) {
        return addr;
    }
    const escaped = nameRaw.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    return `"${escaped}" <${addr}>`;
}

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

/**
 * Gửi auto-reply khách + thông báo admin sau khi lưu ticket.
 *
 * Khi env mail chưa cấu hình thì no-op — ticket vẫn được lưu trước đó.
 *
 * @throws Error — bọc qua caller để Sentry (SMTP/network)
 */
export async function sendSupportTicketEmails(opts: {
    ticketId: string;
    customerEmail: string;
    customerName: string;
    subject: string;
    message: string;
    bookingNumber: string | null;
}): Promise<void> {
    if (!isMailConfigured()) {
        return;
    }

    const env = getEnv();
    const authUser = env.MAIL_FROM_ADDRESS.trim();
    const pass = normalizeGmailAppPassword(env.MAIL_APP_PASSWORD);

    const transporter = nodemailer.createTransport({
        host: GMAIL_SMTP_HOST,
        port: GMAIL_SMTP_PORT,
        secure: false,
        auth: {
            user: authUser,
            pass,
        },
    });

    const from = formatFromHeader(env);
    const adminTo = resolveAdminNotifyAddress(env);

    const bookingLine =
        opts.bookingNumber !== null && opts.bookingNumber.length > 0
            ? `\nBooking / application id: ${opts.bookingNumber}\n`
            : "\n";

    await transporter.sendMail({
        from,
        to: opts.customerEmail,
        subject: `[FastVisa] We received your message — ${opts.subject}`,
        text:
            `Hi ${opts.customerName},\n\n` +
            `Thank you for contacting FastVisa. Your ticket id is ${opts.ticketId}.${bookingLine}` +
            `Our team will respond as soon as possible.\n`,
        html:
            `<p>Hi ${escapeHtml(opts.customerName)},</p>` +
            `<p>Thank you for contacting FastVisa.</p>` +
            `<p><strong>Ticket ID:</strong> ${escapeHtml(opts.ticketId)}</p>` +
            (opts.bookingNumber
                ? `<p><strong>Booking:</strong> ${escapeHtml(opts.bookingNumber)}</p>`
                : "") +
            `<p>Our team will respond as soon as possible.</p>`,
    });

    await transporter.sendMail({
        from,
        to: adminTo,
        subject: `[FastVisa Support] New ticket ${opts.ticketId} — ${opts.subject}`,
        text:
            `Ticket ID: ${opts.ticketId}\n` +
            `From: ${opts.customerName} <${opts.customerEmail}>\n` +
            (opts.bookingNumber ? `Booking: ${opts.bookingNumber}\n` : "") +
            `Subject: ${opts.subject}\n\n` +
            `${opts.message}\n`,
        html:
            `<p><strong>Ticket ID:</strong> ${escapeHtml(opts.ticketId)}</p>` +
            `<p><strong>From:</strong> ${escapeHtml(opts.customerName)} &lt;${escapeHtml(opts.customerEmail)}&gt;</p>` +
            (opts.bookingNumber
                ? `<p><strong>Booking:</strong> ${escapeHtml(opts.bookingNumber)}</p>`
                : "") +
            `<p><strong>Subject:</strong> ${escapeHtml(opts.subject)}</p>` +
            `<hr/><pre style="white-space:pre-wrap">${escapeHtml(opts.message)}</pre>`,
    });
}

/** Subject cố định theo roadmap Stage 4 — recovery abandoned cart (không đi qua i18n HTTP). */
const ABANDONED_CART_SUBJECT =
    "Bạn còn quên hoàn thành đơn visa của mình!";

/**
 * Gửi email nhắc hoàn tất thanh toán đơn visa đang treo (Magic Link resume).
 *
 * Khi SMTP chưa cấu hình thì no-op — worker vẫn có thể chạy dry-run logic khác sau này.
 *
 * @param opts.to - Email liên hệ trên đơn
 * @param opts.magicLink - URL FE có `resume=true`
 * @throws Error — SMTP/network; caller bọc Sentry nếu cần
 */
export async function sendAbandonedCartEmail(opts: {
    to: string;
    magicLink: string;
}): Promise<void> {
    if (!isMailConfigured()) {
        return;
    }

    const env = getEnv();
    const authUser = env.MAIL_FROM_ADDRESS.trim();
    const pass = normalizeGmailAppPassword(env.MAIL_APP_PASSWORD);

    const transporter = nodemailer.createTransport({
        host: GMAIL_SMTP_HOST,
        port: GMAIL_SMTP_PORT,
        secure: false,
        auth: {
            user: authUser,
            pass,
        },
    });

    const from = formatFromHeader(env);

    const safeLink = escapeHtml(opts.magicLink);

    await transporter.sendMail({
        from,
        to: opts.to.trim(),
        subject: ABANDONED_CART_SUBJECT,
        text:
            `Xin chào,\n\n` +
            `Bạn đã bắt đầu một đơn xin visa nhưng chưa hoàn tất thanh toán. ` +
            `Đơn của bạn vẫn được giữ — chỉ cần một bước nữa là xong.\n\n` +
            `Tiếp tục ngay tại đường dẫn sau:\n${opts.magicLink}\n\n` +
            `Mã hồ sơ sẽ được cấp sau khi thanh toán PayPal thành công.\n\n` +
            `Gợi ý: nên hoàn tất trong khoảng 48 giờ để tránh giá hoặc chỗ giữ slot thay đổi.\n\n` +
            `Trân trọng,\nFastVisa`,
        html:
            `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#222;">` +
            `<p>Xin chào,</p>` +
            `<p>Bạn đã bắt đầu một đơn xin visa nhưng chưa hoàn tất thanh toán. ` +
            `Đơn của bạn vẫn được giữ — chỉ cần <strong>một bước nữa</strong> là xong.</p>` +
            `<p style="margin:28px 0;">` +
            `<a href="${safeLink}" style="display:inline-block;background:#0d6efd;color:#fff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;">Tiếp tục đơn &amp; thanh toán</a>` +
            `</p>` +
            `<p style="font-size:14px;color:#555;">Nếu nút không hoạt động, copy link sau vào trình duyệt:<br/><span style="word-break:break-all;">${safeLink}</span></p>` +
            `<p style="font-size:14px;color:#666;">Mã hồ sơ (VN-…) sẽ được cấp sau khi thanh toán PayPal thành công.</p>` +
            `<p style="font-size:14px;color:#666;">Gợi ý: nên hoàn tất trong khoảng <strong>48 giờ</strong> để tránh thay đổi giá hoặc chỗ giữ slot.</p>` +
            `<p>Trân trọng,<br/>FastVisa</p>` +
            `</div>`,
    });
}

function buildCheckStatusUrl(): string {
    const base = getEnv().FRONTEND_URL.replace(/\/+$/, "");
    return `${base}/check-status`;
}

const MAIL_TRANSLATIONS = {
    vi: {
        greeting: "Xin chào,",
        updateMsg: (code: string) => `Hồ sơ visa của bạn với mã <strong>${code}</strong> vừa có cập nhật mới:`,
        thanks: "Trân trọng,<br><strong>Đội ngũ FASTVISA</strong>",
        autoFooter: "Đây là email tự động từ hệ thống FASTVISA. Vui lòng không trả lời email này.",
        paidSubject: (code: string) => `[FastVisa] Thanh toán thành công — ${code}`,
        paidMessage: (amount: string, url: string) => `Thanh toán PayPal của bạn đã được xác nhận. Tổng tiền: $${amount} USD.<br><br>Vui lòng theo dõi tiến trình tại: <a href="${url}">Tra cứu trạng thái</a>`,
        processingSubject: (code: string) => `[FastVisa] Đang xử lý hồ sơ — ${code}`,
        processingMessage: (url: string) => `Hồ sơ của bạn đang được xử lý. Chúng tôi sẽ thông báo ngay khi hoàn tất.<br><br>Tra cứu tiến trình tại: <a href="${url}">Tra cứu trạng thái</a>`,
        completedSubject: (code: string) => `[FastVisa] Hồ sơ đã hoàn tất — ${code}`,
        completedMessage: (url: string, downloadUrl: string | null, fileName: string) => {
            let msg = `Hồ sơ của bạn đã được xử lý xong (COMPLETED). Cảm ơn bạn đã sử dụng dịch vụ của FastVisa.<br><br>Tra cứu tiến trình tại: <a href="${url}">Tra cứu trạng thái</a>`;
            if (downloadUrl) {
                msg += `
<div style="text-align: center; margin: 30px 0;">
    <a href="${downloadUrl}" style="display: inline-block; background-color: #ffffff; border: 2px solid #e5e7eb; padding: 16px 24px; border-radius: 12px; text-decoration: none; color: #374151; font-weight: 600; font-size: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
        <span style="font-size: 20px; vertical-align: middle;">📄</span> 
        <span style="margin-left: 8px; vertical-align: middle;">Tải về: ${fileName}.pdf</span>
    </a>
</div>`;
            }
            return msg;
        },
        rejectedSubject: (code: string) => `[FastVisa] Hồ sơ bị từ chối — ${code}`,
        rejectedMessage: (url: string) => `Hồ sơ của bạn đã bị từ chối (REJECTED). Vui lòng liên hệ bộ phận hỗ trợ để biết thêm chi tiết.<br><br>Tra cứu tiến trình tại: <a href="${url}">Tra cứu trạng thái</a>`
    },
    en: {
        greeting: "Hello,",
        updateMsg: (code: string) => `Your visa application with code <strong>${code}</strong> has a new update:`,
        thanks: "Best regards,<br><strong>The FASTVISA Team</strong>",
        autoFooter: "This is an automated email from the FASTVISA system. Please do not reply to this email.",
        paidSubject: (code: string) => `[FastVisa] Payment Successful — ${code}`,
        paidMessage: (amount: string, url: string) => `Your PayPal payment has been confirmed. Total amount: $${amount} USD.<br><br>Please track your progress at: <a href="${url}">Check Status</a>`,
        processingSubject: (code: string) => `[FastVisa] Application Processing — ${code}`,
        processingMessage: (url: string) => `Your application is currently being processed. We will notify you once completed.<br><br>Track your progress at: <a href="${url}">Check Status</a>`,
        completedSubject: (code: string) => `[FastVisa] Application Completed — ${code}`,
        completedMessage: (url: string, downloadUrl: string | null, fileName: string) => {
            let msg = `Your application has been processed (COMPLETED). Thank you for using FastVisa services.<br><br>Track your progress at: <a href="${url}">Check Status</a>`;
            if (downloadUrl) {
                msg += `
<div style="text-align: center; margin: 30px 0;">
    <a href="${downloadUrl}" style="display: inline-block; background-color: #ffffff; border: 2px solid #e5e7eb; padding: 16px 24px; border-radius: 12px; text-decoration: none; color: #374151; font-weight: 600; font-size: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
        <span style="font-size: 20px; vertical-align: middle;">📄</span> 
        <span style="margin-left: 8px; vertical-align: middle;">Download: ${fileName}.pdf</span>
    </a>
</div>`;
            }
            return msg;
        },
        rejectedSubject: (code: string) => `[FastVisa] Application Rejected — ${code}`,
        rejectedMessage: (url: string) => `Your application has been rejected (REJECTED). Please contact support for more details.<br><br>Track your progress at: <a href="${url}">Check Status</a>`
    }
};

/**
 * Email xác nhận thanh toán thành công — gửi ngay sau PayPal capture.
 */
export async function sendApplicationPaidEmail(opts: {
    to: string;
    applicationCode: string;
    totalAmountUsd: number;
    visaType?: string;
    buyerName?: string;
    lang?: "vi" | "en";
}): Promise<void> {
    if (!isMailConfigured()) return;

    const env = getEnv();
    const authUser = env.MAIL_FROM_ADDRESS.trim();
    const pass = normalizeGmailAppPassword(env.MAIL_APP_PASSWORD);
    const transporter = nodemailer.createTransport({
        host: GMAIL_SMTP_HOST,
        port: GMAIL_SMTP_PORT,
        secure: false,
        auth: { user: authUser, pass },
    });
    const from = formatFromHeader(env);
    const checkUrl = buildCheckStatusUrl();
    const amount = opts.totalAmountUsd.toFixed(2);
    const lang = opts.lang || "vi";
    const t = MAIL_TRANSLATIONS[lang];

    console.info(`[MAIL] Đang gửi email PAID cho ${opts.to} (Mã hồ sơ: ${opts.applicationCode})...`);

    try {
        const templatePath = path.join(__dirname, "../templates/mail/application-status.ejs");
        const html = await ejs.renderFile(templatePath, {
            applicationCode: opts.applicationCode,
            status: "PAID",
            statusMessage: t.paidMessage(amount, checkUrl),
            color: "#3b82f6", // Blue
            t
        });

        getPusher()?.trigger("system-events", "application_status_changed", {
            applicationCode: opts.applicationCode,
            status: "PAID",
            timestamp: Date.now(),
            buyerName: opts.buyerName || opts.to.split("@")[0],
            visaType: opts.visaType || "E_VISA"
        }).catch(err => console.error("[MAIL] Lỗi trigger Pusher:", err));

        await transporter.sendMail({
            from,
            to: opts.to.trim(),
            subject: t.paidSubject(opts.applicationCode),
            html,
        });

        console.info(`[MAIL] Gửi email PAID thành công cho ${opts.to}`);
    } catch (error) {
        console.error(`[MAIL] Lỗi khi gửi email PAID cho ${opts.to}:`, error);
    }
}

/**
 * Email thông báo hồ sơ đang được xử lý — admin chuyển sang PROCESSING.
 */
export async function sendApplicationProcessingEmail(opts: {
    to: string;
    applicationCode: string;
    lang?: "vi" | "en";
}): Promise<void> {
    if (!isMailConfigured()) return;

    const env = getEnv();
    const authUser = env.MAIL_FROM_ADDRESS.trim();
    const pass = normalizeGmailAppPassword(env.MAIL_APP_PASSWORD);
    const transporter = nodemailer.createTransport({
        host: GMAIL_SMTP_HOST,
        port: GMAIL_SMTP_PORT,
        secure: false,
        auth: { user: authUser, pass },
    });
    const from = formatFromHeader(env);
    const checkUrl = buildCheckStatusUrl();
    const lang = opts.lang || "vi";
    const t = MAIL_TRANSLATIONS[lang];

    console.info(`[MAIL] Đang gửi email PROCESSING cho ${opts.to} (Mã hồ sơ: ${opts.applicationCode})...`);

    try {
        const templatePath = path.join(__dirname, "../templates/mail/application-status.ejs");
        const html = await ejs.renderFile(templatePath, {
            applicationCode: opts.applicationCode,
            status: "PROCESSING",
            statusMessage: t.processingMessage(checkUrl),
            color: "#f59e0b", // Amber/Yellow
            t
        });

        getPusher()?.trigger("system-events", "application_status_changed", {
            applicationCode: opts.applicationCode,
            status: "PROCESSING",
            timestamp: Date.now()
        }).catch(err => console.error("[MAIL] Lỗi trigger Pusher:", err));

        await transporter.sendMail({
            from,
            to: opts.to.trim(),
            subject: t.processingSubject(opts.applicationCode),
            html,
        });

        console.info(`[MAIL] Gửi email PROCESSING thành công cho ${opts.to}`);
    } catch (error) {
        console.error(`[MAIL] Lỗi khi gửi email PROCESSING cho ${opts.to}:`, error);
    }
}

export function buildCompletedEmailHtml(opts: {
    customerName: string;
    code: string;
    templateName?: string; // 'e-visa' | 'voa' | 'fast_track' | 'evisa_fast_track' | 'voa_fast_track'
    downloadUrl: string | null;
    fileName: string;
    pickupImageUrl: string | null;
    checkUrl: string;
}): string {
    const { customerName, code, templateName, downloadUrl, fileName, pickupImageUrl, checkUrl } = opts;
    
    // Order info header
    let html = `<p>Dear ${escapeHtml(customerName)},</p>\n`;
    html += `<p><strong>Order ID: ${escapeHtml(code)} | Status: COMPLETED</strong></p>\n\n`;
    
    // Default fallback if no templateName (giữ lại logic cũ)
    if (!templateName || templateName === "default") {
        html += `<p>Your application has been processed (COMPLETED). Thank you for using FastVisa services.</p>\n`;
        html += `<p>Track your progress at: <a href="${checkUrl}">Check Status</a></p>\n`;
        if (downloadUrl) {
            html += `<div style="text-align: center; margin: 30px 0;">
    <a href="${downloadUrl}" style="display: inline-block; background-color: #ffffff; border: 2px solid #e5e7eb; padding: 16px 24px; border-radius: 12px; text-decoration: none; color: #374151; font-weight: 600; font-size: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
        <span style="font-size: 20px; vertical-align: middle;">📄</span> 
        <span style="margin-left: 8px; vertical-align: middle;">Download: ${escapeHtml(fileName)}.pdf</span>
    </a>
</div>`;
        }
        return html;
    }

    const isEVisa = templateName === "e-visa" || templateName === "evisa_fast_track";
    const isVoa = templateName === "voa" || templateName === "voa_fast_track";
    const hasFastTrack = templateName === "fast_track" || templateName === "evisa_fast_track" || templateName === "voa_fast_track";
    
    if (isEVisa || isVoa) {
        const visaTypeStr = isEVisa ? "Vietnam eVisa" : "Vietnam Visa";
        html += `<p>We are pleased to inform you that your <strong>${visaTypeStr} has been approved successfully.</strong></p>\n`;
        
        html += `<p>Please find attached:</p>\n<ul>\n`;
        html += `<li>${visaTypeStr} (PDF)</li>\n`;
        if (hasFastTrack) {
            html += `<li>Fast Track Meeting Board (reference image)</li>\n`;
        }
        html += `</ul>\n\n`;
        
        if (downloadUrl) {
            html += `<div style="text-align: center; margin: 30px 0;">
    <a href="${downloadUrl}" style="display: inline-block; background-color: #ffffff; border: 2px solid #e5e7eb; padding: 16px 24px; border-radius: 12px; text-decoration: none; color: #374151; font-weight: 600; font-size: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
        <span style="font-size: 20px; vertical-align: middle;">📄</span> 
        <span style="margin-left: 8px; vertical-align: middle;">Download: ${escapeHtml(fileName)}.pdf</span>
    </a>
</div>\n`;
        }
        
        html += `<p>Before your departure, please kindly verify all visa information carefully:</p>\n`;
        html += `<ul>\n<li>Full Name</li>\n<li>Passport Number</li>\n<li>Date of Birth</li>\n<li>Entry Date</li>\n<li>Entry Airport</li>\n</ul>\n`;
        html += `<p>If you notice any incorrect information, please contact us immediately before traveling.</p>\n`;
        
        if (hasFastTrack) {
            html += `<hr style="border: none; border-top: 1px solid #eaeaea; margin: 30px 0;" />\n`;
        }
    }
    
    if (hasFastTrack) {
        html += `<h2>✈️ FAST TRACK ARRIVAL INSTRUCTIONS</h2>\n`;
        html += `<p>To ensure a smooth arrival experience in Vietnam, please follow these steps:</p>\n`;
        html += `<h3>Step 1 — Arrival in Vietnam</h3>\n`;
        html += `<p>After landing, please proceed to the <strong>Arrival / Immigration Area</strong>.</p>\n`;
        html += `<h3>Step 2 — Find Our Meeting Board</h3>\n`;
        html += `<p>Our airport representative will be waiting for you and holding a <strong>welcome sign with your name displayed</strong>.</p>\n`;
        
        if (pickupImageUrl) {
            html += `<p><em>(Please refer to the meeting board image below)</em></p>\n`;
            html += `<div style="margin: 20px 0; text-align: center;"><img src="${pickupImageUrl}" alt="Meeting Board" style="max-width: 100%; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);" /></div>\n`;
        } else {
            html += `<p><em>(Please refer to the attached meeting board image.)</em></p>\n`;
        }
        
        html += `<h3>Step 3 — Meet Our Staff</h3>\n`;
        html += `<p>Once you locate the meeting board:</p>\n`;
        html += `<ul>\n<li>Introduce yourself to our staff</li>\n<li>Present your passport if requested</li>\n</ul>\n`;
        html += `<h3>Step 4 — Follow the Staff’s Guidance</h3>\n`;
        html += `<p>Our staff will assist and guide you throughout the airport arrival process.</p>\n`;
        html += `<p>Please remain with the staff and follow their instructions until the service is completed.</p>\n`;
        
        if (isEVisa || isVoa) {
             html += `<hr style="border: none; border-top: 1px solid #eaeaea; margin: 30px 0;" />\n`;
        } else {
             html += `\n<br>\n`;
        }
    }
    
    if (hasFastTrack) {
        html += `<h2>Important Notes</h2>\n`;
        html += `<ul>\n<li>Please keep your phone accessible after landing</li>\n<li>If your flight schedule changes or is delayed, kindly inform us in advance</li>\n<li>If you cannot locate our staff, please contact us immediately</li>\n</ul>\n`;
    }
    
    html += `<p><strong>Emergency Contact:</strong></p>\n`;
    html += `<ul>\n<li><strong>WhatsApp:</strong> +84 965 800 392</li>\n<li><strong>Email:</strong> thanhdatvietnamvisa@gmail.com</li>\n</ul>\n`;
    html += `<p>Thank you for choosing our service.</p>\n`;
    html += `<p>We wish you a pleasant journey and warmly welcome you to Vietnam 🇻🇳</p>\n`;
    html += `<p>Best regards,</p>\n`;
    html += `<p><strong>Thanh Dat Visa</strong><br>\nvietnamevisa.com.vn<br>\n+84 965 800 392<br>\nthanhdatvietnamvisa@gmail.com</p>\n`;
    
    return html;
}

/**
 * Email thông báo hồ sơ đã hoàn tất — admin chuyển sang COMPLETED.
 */
export async function sendApplicationCompletedEmail(opts: {
    to: string;
    applicationCode: string;
    downloadUrl: string | null;
    applicantName?: string;
    lang?: "vi" | "en";
    templateName?: string;
    pickupImageUrl?: string | null;
}): Promise<void> {
    if (!isMailConfigured()) return;

    const env = getEnv();
    const authUser = env.MAIL_FROM_ADDRESS.trim();
    const pass = normalizeGmailAppPassword(env.MAIL_APP_PASSWORD);
    const transporter = nodemailer.createTransport({
        host: GMAIL_SMTP_HOST,
        port: GMAIL_SMTP_PORT,
        secure: false,
        auth: { user: authUser, pass },
    });
    const from = formatFromHeader(env);
    const checkUrl = buildCheckStatusUrl();
    const lang = opts.lang || "vi";
    const t = MAIL_TRANSLATIONS[lang];

    console.info(`[MAIL] Đang gửi email COMPLETED cho ${opts.to} (Mã hồ sơ: ${opts.applicationCode})...`);

    try {
        const fileName = opts.applicantName || "E-Visa";
        const statusMessage = buildCompletedEmailHtml({
            customerName: opts.applicantName || opts.to.split("@")[0],
            code: opts.applicationCode,
            templateName: opts.templateName,
            downloadUrl: opts.downloadUrl,
            fileName: escapeHtml(fileName),
            pickupImageUrl: opts.pickupImageUrl || null,
            checkUrl
        });

        const templatePath = path.join(__dirname, "../templates/mail/application-status.ejs");
        const html = await ejs.renderFile(templatePath, {
            applicationCode: opts.applicationCode,
            status: "COMPLETED",
            statusMessage,
            color: "#10b981", // Green
            t
        });

        getPusher()?.trigger("system-events", "application_status_changed", {
            applicationCode: opts.applicationCode,
            status: "COMPLETED",
            timestamp: Date.now()
        }).catch(err => console.error("[MAIL] Lỗi trigger Pusher:", err));

        // 1. Nếu có downloadUrl, ta fetch thử nội dung file PDF thay vì dựa vào Nodemailer
        // Nếu Nodemailer gặp lỗi 401 khi dùng `path: url`, nó sẽ NÉM LỖI và KHÔNG GỬI EMAIL.
        let pdfAttachment: { filename: string; content: Buffer } | undefined = undefined;
        let attachmentError = false;

        if (opts.downloadUrl) {
            try {
                console.info(`[MAIL] Đang tải PDF đính kèm từ Cloudinary...`);
                const res = await fetch(opts.downloadUrl);
                if (res.ok) {
                    const arrayBuffer = await res.arrayBuffer();
                    pdfAttachment = {
                        filename: `${fileName}.pdf`,
                        content: Buffer.from(arrayBuffer)
                    };
                } else {
                    console.warn(`[MAIL] CẢNH BÁO: Không thể tải PDF đính kèm. Cloudinary trả về HTTP ${res.status}. Vui lòng kiểm tra cài đặt 'Restrict delivery of PDF' trong Security settings của Cloudinary.`);
                    attachmentError = true;
                }
            } catch (fetchErr) {
                console.warn(`[MAIL] Lỗi fetch PDF từ Cloudinary:`, fetchErr);
                attachmentError = true;
            }
        }

        // 2. Gửi email
        // Nếu không tải được file PDF (attachmentError = true), ta vẫn GỬI MAIL báo thành công (chỉ có link).
        await transporter.sendMail({
            from,
            to: opts.to.trim(),
            subject: t.completedSubject(opts.applicationCode),
            html,
            attachments: pdfAttachment ? [pdfAttachment] : undefined,
        });

        console.info(`[MAIL] Gửi email COMPLETED thành công cho ${opts.to} (Đính kèm: ${pdfAttachment ? "CÓ" : "KHÔNG"})`);
    } catch (error) {
        console.error(`[MAIL] Lỗi khi gửi email COMPLETED cho ${opts.to}:`, error);
    }
}

/**
 * Email thông báo hồ sơ bị từ chối — admin chuyển sang REJECTED.
 */
export async function sendApplicationRejectedEmail(opts: {
    to: string;
    applicationCode: string;
    lang?: "vi" | "en";
}): Promise<void> {
    if (!isMailConfigured()) return;

    const env = getEnv();
    const authUser = env.MAIL_FROM_ADDRESS.trim();
    const pass = normalizeGmailAppPassword(env.MAIL_APP_PASSWORD);
    const transporter = nodemailer.createTransport({
        host: GMAIL_SMTP_HOST,
        port: GMAIL_SMTP_PORT,
        secure: false,
        auth: { user: authUser, pass },
    });
    const from = formatFromHeader(env);
    const checkUrl = buildCheckStatusUrl();
    const lang = opts.lang || "vi";
    const t = MAIL_TRANSLATIONS[lang];

    console.info(`[MAIL] Đang gửi email REJECTED cho ${opts.to} (Mã hồ sơ: ${opts.applicationCode})...`);

    try {
        const templatePath = path.join(__dirname, "../templates/mail/application-status.ejs");
        const html = await ejs.renderFile(templatePath, {
            applicationCode: opts.applicationCode,
            status: "REJECTED",
            statusMessage: t.rejectedMessage(checkUrl),
            color: "#ef4444", // Red
            t
        });

        getPusher()?.trigger("system-events", "application_status_changed", {
            applicationCode: opts.applicationCode,
            status: "REJECTED",
            timestamp: Date.now()
        }).catch(err => console.error("[MAIL] Lỗi trigger Pusher:", err));

        await transporter.sendMail({
            from,
            to: opts.to.trim(),
            subject: t.rejectedSubject(opts.applicationCode),
            html,
        });

        console.info(`[MAIL] Gửi email REJECTED thành công cho ${opts.to}`);
    } catch (error) {
        console.error(`[MAIL] Lỗi khi gửi email REJECTED cho ${opts.to}:`, error);
    }
}

/**
 * Gửi email chào mừng khi người dùng đăng ký nhận tin (Newsletter).
 */
export async function sendNewsletterWelcomeEmail(email: string, locale: string = "en"): Promise<void> {
    if (!isMailConfigured()) {
        return;
    }

    const env = getEnv();
    const authUser = env.MAIL_FROM_ADDRESS.trim();
    const pass = normalizeGmailAppPassword(env.MAIL_APP_PASSWORD);
    
    // Use the authenticated user's email as the sender
    const from = `"FastVisa Newsletter" <${authUser}>`;

    const transporter = nodemailer.createTransport({
        host: GMAIL_SMTP_HOST,
        port: GMAIL_SMTP_PORT,
        secure: false,
        auth: {
            user: authUser,
            pass,
        },
    });

    const templatePath = path.join(__dirname, "../templates/mail/newsletter-welcome.ejs");
    const websiteUrl = env.FRONTEND_URL.replace(/\/+$/, "");

    // Multi-language translations
    const t = {
        en: {
            subject: "[FastVisa] Welcome to our Newsletter!",
            title: "Welcome to FastVisa",
            hello: "Hello!",
            p1: "Thank you for subscribing to the FastVisa Newsletter.",
            p2: "You'll now receive updates on e-visa information, policy changes, and travel tips directly to your inbox.",
            btn: "Explore FastVisa",
            ignore: "If you didn't subscribe to our newsletter, you can safely ignore this email.",
            copyright: "FastVisa. All rights reserved."
        },
        vi: {
            subject: "[FastVisa] Chào mừng bạn đến với Bản tin của chúng tôi!",
            title: "Chào mừng đến với FastVisa",
            hello: "Xin chào!",
            p1: "Cảm ơn bạn đã đăng ký nhận bản tin từ FastVisa.",
            p2: "Từ bây giờ, bạn sẽ nhận được thông tin cập nhật về e-visa, thay đổi chính sách và mẹo du lịch trực tiếp qua hộp thư.",
            btn: "Khám phá FastVisa",
            ignore: "Nếu bạn không đăng ký nhận bản tin, xin vui lòng bỏ qua email này.",
            copyright: "FastVisa. Mọi quyền được bảo lưu."
        }
    };

    const lang = t[locale as keyof typeof t] ? locale : "en";
    const translations = t[lang as keyof typeof t];

    const html = await ejs.renderFile(templatePath, {
        websiteUrl,
        currentYear: new Date().getFullYear(),
        t: translations
    });

    await transporter.sendMail({
        from,
        to: email.trim(),
        subject: translations.subject,
        html,
    });
}

export async function sendCampaignEmail(toEmail: string, subject: string, htmlContent: string) {
    if (!isMailConfigured()) {
        return;
    }
    const env = getEnv();
    const authUser = env.MAIL_FROM_ADDRESS.trim();
    const pass = normalizeGmailAppPassword(env.MAIL_APP_PASSWORD);

    try {
        const transporter = nodemailer.createTransport({
            host: GMAIL_SMTP_HOST,
            port: GMAIL_SMTP_PORT,
            secure: false,
            auth: {
                user: authUser,
                pass,
            },
        });

        const templatePath = path.join(__dirname, "../templates/mail/newsletter-campaign.ejs");
        const websiteUrl = getEnv().FRONTEND_URL.replace(/\/+$/, "");

        const html = await ejs.renderFile(templatePath, {
            subject,
            htmlContent,
            websiteUrl,
            currentYear: new Date().getFullYear()
        });

        const from = `"FastVisa Campaign" <${authUser}>`;

        const info = await transporter.sendMail({
            from,
            to: toEmail,
            subject,
            html,
        });

        console.log(`Newsletter Campaign Email sent to ${toEmail}. MessageId: ${info.messageId}`);
        return true;
    } catch (error) {
        console.error(`Failed to send Campaign email to ${toEmail}:`, error);
        throw error;
    }
}

/**
 * Gửi email xác thực khi tài khoản Admin được duyệt.
 */
export async function sendVerificationEmail(email: string, token: string): Promise<void> {
    if (!isMailConfigured()) {
        return;
    }

    const env = getEnv();
    const authUser = env.MAIL_FROM_ADDRESS.trim();
    const pass = normalizeGmailAppPassword(env.MAIL_APP_PASSWORD);
    
    const transporter = nodemailer.createTransport({
        host: GMAIL_SMTP_HOST,
        port: GMAIL_SMTP_PORT,
        secure: false,
        auth: { user: authUser, pass },
    });

    const from = formatFromHeader(env);
    
    // Giả sử admin UI chạy ở cổng 3001 hoặc domain admin, tạm fix base URL hoặc lấy từ env
    // Vì đây là email để vào admin UI, dùng ADMIN_URL nếu có, nếu không lấy FRONTEND_URL làm tạm
    // URL verify sẽ gọi trực tiếp đến API hoặc UI
    const adminUrl = process.env.ADMIN_URL || env.FRONTEND_URL.replace(/\/+$/, "");
    const verifyLink = `${adminUrl}/verify-email?token=${token}`;

    const html = `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#222;">
            <h2>Yêu cầu tạo tài khoản đã được phê duyệt!</h2>
            <p>Chào bạn,</p>
            <p>Tài khoản quản trị của bạn (<strong>${escapeHtml(email)}</strong>) đã được phê duyệt.</p>
            <p>Vui lòng nhấn vào nút bên dưới để xác thực email của bạn:</p>
            <p style="margin:28px 0;">
                <a href="${escapeHtml(verifyLink)}" style="display:inline-block;background:#0d6efd;color:#fff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;">Xác thực Email</a>
            </p>
            <p style="font-size:14px;color:#555;">Hoặc copy đường dẫn sau vào trình duyệt:<br/><span style="word-break:break-all;">${escapeHtml(verifyLink)}</span></p>
            <p>Trân trọng,<br/>FastVisa Admin</p>
        </div>
    `;

    await transporter.sendMail({
        from,
        to: email.trim(),
        subject: "[FastVisa] Xác thực tài khoản quản trị",
        html,
    });
}

/**
 * Gửi email yêu cầu khôi phục mật khẩu.
 */
export async function sendResetPasswordEmail(email: string, name: string, token: string): Promise<void> {
    if (!isMailConfigured()) {
        return;
    }

    const env = getEnv();
    const authUser = env.MAIL_FROM_ADDRESS.trim();
    const pass = normalizeGmailAppPassword(env.MAIL_APP_PASSWORD);
    
    const transporter = nodemailer.createTransport({
        host: GMAIL_SMTP_HOST,
        port: GMAIL_SMTP_PORT,
        secure: false,
        auth: { user: authUser, pass },
    });

    const from = formatFromHeader(env);
    
    const adminUrl = process.env.ADMIN_URL || env.FRONTEND_URL.replace(/\/+$/, "");
    const resetLink = `${adminUrl}/reset-password?token=${token}`;

    const templatePath = path.join(__dirname, "../templates/mail/reset-password.ejs");
    const websiteUrl = adminUrl;

    const html = await ejs.renderFile(templatePath, {
        name,
        resetLink,
        websiteUrl,
        currentYear: new Date().getFullYear(),
    });

    await transporter.sendMail({
        from,
        to: email.trim(),
        subject: "[FastVisa] Yêu cầu khôi phục mật khẩu",
        html,
    });
}
