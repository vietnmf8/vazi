/**
 * E2E Test: focus_ui_field — Multi-turn cùng 1 session (2026-06-24)
 *
 * Phát hiện 2026-06-24: mọi test trước giờ (Phase 2 + Phase 3 + plan 9-task) đều mở 1 session
 * MỚI cho mỗi tin nhắn — không bao giờ mô phỏng đúng việc user chat liên tục nhiều lượt trong
 * CÙNG 1 phòng chat. Rủi ro thật: khi lịch sử hội thoại đã có 1 lượt gọi tool THÀNH CÔNG, Gemini
 * có xu hướng "lazy success continuation" — trả lời text khẳng định đã chọn xong ở lượt sau mà
 * KHÔNG thực sự gọi lại tool. Đã sửa bằng directive bắt buộc trong description tool
 * (focus-ui-field.tool.ts) — file này verify fix đó bằng cách gửi NHIỀU yêu cầu chọn giá trị
 * KHÁC NHAU liên tiếp trong CÙNG 1 session, qua cả 4 field (nationality/port/visa_option/speed).
 *
 * Chạy: node scripts/e2e-focus-ui-field-multi-turn.mjs
 */

import http from 'http';

const HOST = '127.0.0.1';
const PORT = 5000;
const JOIN_PATH = '/api/v1/chat/join';
const STREAM_PATH = '/api/v1/chat/message/stream';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const MAGENTA = '\x1b[35m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

const ts = () => new Date().toISOString().slice(11, 23);
const log = (...a) => console.log(`[${ts()}]`, ...a);
const sep = (n = 70, ch = '─') => console.log(ch.repeat(n));

function httpPost(urlPath, body) {
    const raw = JSON.stringify(body);
    return new Promise((resolve, reject) => {
        const req = http.request(
            {
                hostname: HOST, port: PORT, path: urlPath, method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(raw) },
            },
            (res) => {
                let data = '';
                res.on('data', c => (data += c));
                res.on('end', () => resolve({ status: res.statusCode, body: data }));
            }
        );
        req.on('error', reject);
        req.write(raw);
        req.end();
    });
}

async function createSession(lang = 'vi') {
    const res = await httpPost(JOIN_PATH, { user_name: 'MultiTurnTester', website_language: lang });
    const json = JSON.parse(res.body);
    if (!json.data?.session_id) throw new Error('Không lấy được session_id: ' + res.body);
    return json.data.session_id;
}

function streamMessage(sessionId, message, opts = {}) {
    const { lang = 'vi', currentUrl = '/' } = opts;
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({
            session_id: sessionId,
            message,
            sender: 'USER',
            message_type: 'TEXT',
            current_url: currentUrl,
            page_content: '',
            page_context: '[]',
            website_language: lang,
        });

        log(`${CYAN}  → [sid=${sessionId.slice(0, 8)}] Gửi: "${message}"${RESET}`);

        const req = http.request(
            {
                hostname: HOST, port: PORT, path: STREAM_PATH, method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(body),
                    Accept: 'text/event-stream',
                },
            },
            (res) => {
                if (res.statusCode !== 200) {
                    let errData = '';
                    res.on('data', c => (errData += c));
                    res.on('end', () => reject(new Error(`HTTP ${res.statusCode}: ${errData}`)));
                    return;
                }

                const events = [];
                let buffer = '';
                let fullText = '';

                res.on('data', (chunk) => {
                    buffer += chunk.toString();
                    const lines = buffer.split('\n');
                    buffer = lines.pop() ?? '';

                    for (const line of lines) {
                        if (!line.startsWith('data: ')) continue;
                        try {
                            const data = JSON.parse(line.slice(6));
                            events.push(data);
                            if (data.chunk) fullText += data.chunk;
                            if (data.action || data.event) {
                                log(`${MAGENTA}    [SSE] ${JSON.stringify(data)}${RESET}`);
                            }
                        } catch {
                            // bỏ qua SSE line lỗi
                        }
                    }
                });

                res.on('end', () => resolve({ events, fullText }));
                res.on('error', reject);
            }
        );

        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

let passed = 0;
let failed = 0;
const failures = [];

function fail(testId, reason) {
    log(`${RED}  ❌ FAIL${RESET} — ${reason}`);
    failed++;
    failures.push({ id: testId, reason });
}

function pass(testId, reason) {
    log(`${GREEN}  ✅ PASS${RESET} — ${reason}`);
    passed++;
}

/** Verify 1 lượt trong session: phải có action select (VIRTUAL_SELECT/NAVIGATE_AND_SELECT) với đúng optionCode. */
function assertTurnSelected(testId, events, expectedTarget, expectedCodeCheck) {
    const select = events.find(e => e.action === 'VIRTUAL_SELECT' || e.action === 'NAVIGATE_AND_SELECT');
    if (!select) {
        fail(testId, `KHÔNG có action select nào — Gemini chỉ trả lời text mà không gọi tool (đúng lỗi "lazy success continuation" đã phát hiện) | events: ${JSON.stringify(events.filter(e => e.action || e.event))}`);
        return false;
    }
    if (select.target !== expectedTarget) {
        fail(testId, `Sai target | got: "${select.target}" | expected: "${expectedTarget}"`);
        return false;
    }
    if (!expectedCodeCheck(select.optionCode)) {
        fail(testId, `Sai optionCode | got: "${select.optionCode}"`);
        return false;
    }
    pass(testId, `action="${select.action}" target="${expectedTarget}" optionCode="${select.optionCode}"`);
    return true;
}

async function run() {
    sep();
    log(`${YELLOW}${'='.repeat(70)}${RESET}`);
    log(`${YELLOW}KỊCH BẢN 1 — Nationality: 3 lượt chọn quốc gia KHÁC NHAU, CÙNG 1 session${RESET}`);
    log(`${YELLOW}${'='.repeat(70)}${RESET}`);
    {
        const sid = await createSession('vi');
        const t1 = await streamMessage(sid, 'Chọn giúp tôi quốc tịch Việt Nam ở form đăng ký nhanh');
        assertTurnSelected('MT1-turn1', t1.events, 'quick_apply_nationality', (c) => c?.toLowerCase() === 'vn');

        const t2 = await streamMessage(sid, 'Giúp tôi chọn quốc tịch Venezuela');
        assertTurnSelected('MT1-turn2', t2.events, 'quick_apply_nationality', (c) => c?.toLowerCase() === 've');

        const t3 = await streamMessage(sid, 'Chọn giúp tôi quốc tịch Hàn Quốc');
        assertTurnSelected('MT1-turn3', t3.events, 'quick_apply_nationality', (c) => c?.toLowerCase() === 'kr');
    }

    sep();
    log(`${YELLOW}${'='.repeat(70)}${RESET}`);
    log(`${YELLOW}KỊCH BẢN 2 — Xen kẽ 4 field KHÁC NHAU, CÙNG 1 session (giống user thật điền form)${RESET}`);
    log(`${YELLOW}${'='.repeat(70)}${RESET}`);
    {
        const sid = await createSession('vi');
        const t1 = await streamMessage(sid, 'Chọn giúp tôi quốc tịch Việt Nam ở form đăng ký nhanh');
        assertTurnSelected('MT2-turn1-nationality', t1.events, 'quick_apply_nationality', (c) => c?.toLowerCase() === 'vn');

        const t2 = await streamMessage(sid, 'Chọn giúp tôi cửa khẩu Tân Sơn Nhất trong form đăng ký nhanh');
        assertTurnSelected('MT2-turn2-port', t2.events, 'quick_apply_port', (c) => c?.toUpperCase() === 'SGN');

        const t3 = await streamMessage(sid, 'Chọn giúp tôi loại visa E-Visa 30 ngày 1 lần trong form đăng ký nhanh');
        assertTurnSelected('MT2-turn3-visa_option', t3.events, 'quick_apply_visa_option', (c) => c === 'evisa-30-single');

        const t4 = await streamMessage(sid, 'Chọn giúp tôi tốc độ xử lý khẩn 4 ngày trong form đăng ký nhanh');
        assertTurnSelected('MT2-turn4-speed', t4.events, 'quick_apply_processing_speed', (c) => c === 'urgent-4d');
    }

    sep();
    log(`${YELLOW}${'='.repeat(70)}${RESET}`);
    log(`${YELLOW}KỊCH BẢN 3 — 5 lượt chọn quốc gia liên tiếp (stress nhẹ "lazy success continuation")${RESET}`);
    log(`${YELLOW}${'='.repeat(70)}${RESET}`);
    {
        const sid = await createSession('vi');
        const countries = [
            ['Chọn giúp tôi quốc tịch Mỹ', 'us'],
            ['Chọn giúp tôi quốc tịch Pháp', 'fr'],
            ['Chọn giúp tôi quốc tịch Nhật Bản', 'jp'],
            ['Chọn giúp tôi quốc tịch Úc', 'au'],
            ['Chọn giúp tôi quốc tịch Canada', 'ca'],
        ];
        let idx = 0;
        for (const [msg, expectedCode] of countries) {
            idx++;
            const t = await streamMessage(sid, msg);
            assertTurnSelected(`MT3-turn${idx}`, t.events, 'quick_apply_nationality', (c) => c?.toLowerCase() === expectedCode);
        }
    }

    sep();
    log(`KẾT QUẢ: ${GREEN}${passed} PASS${RESET}, ${failed > 0 ? RED : GREEN}${failed} FAIL${RESET}`);
    if (failures.length > 0) {
        sep();
        log('Chi tiết FAIL:');
        failures.forEach(f => log(`  [${f.id}] ${f.reason}`));
        process.exit(1);
    }
}

run().catch(err => {
    log(`${RED}LỖI CHẠY TEST: ${err.message}${RESET}`);
    process.exit(1);
});
