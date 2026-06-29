/**
 * E2E Test: focus_ui_field Phase 3 — nhóm Select (port/visa_option/processing_speed) (2026-06-24)
 *
 * Tầng 1 (file này) CHỈ verify phần backend: tool có trả đúng action/optionCode/error không —
 * KHÔNG verify hành vi DOM thật (đó là Playwright Tầng 2, xem virtual-mouse-select-group.spec.ts).
 *
 * Chạy: node scripts/e2e-focus-ui-field-select-group.mjs
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
    const res = await httpPost(JOIN_PATH, { user_name: 'SelectGroupTester', website_language: lang });
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

        log(`${CYAN}  → Gửi (currentUrl=${currentUrl}): "${message}"${RESET}`);

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

                res.on('data', (chunk) => {
                    buffer += chunk.toString();
                    const lines = buffer.split('\n');
                    buffer = lines.pop() ?? '';

                    for (const line of lines) {
                        if (!line.startsWith('data: ')) continue;
                        try {
                            const data = JSON.parse(line.slice(6));
                            events.push(data);
                            if (data.action || data.event) {
                                log(`${MAGENTA}  [SSE] ${JSON.stringify(data)}${RESET}`);
                            }
                        } catch {
                            // bỏ qua SSE line lỗi
                        }
                    }
                });

                res.on('end', () => resolve({ events }));
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

async function run() {
    sep();
    log('TEST 1 — port: chọn cửa khẩu Tân Sơn Nhất (VIRTUAL_SELECT)');
    {
        const sid = await createSession('vi');
        const { events } = await streamMessage(sid, 'Chọn giúp tôi cửa khẩu Tân Sơn Nhất trong form đăng ký nhanh', { currentUrl: '/' });
        const select = events.find(e => e.action === 'VIRTUAL_SELECT');
        if (!select) fail('T1', `Không có VIRTUAL_SELECT | events: ${JSON.stringify(events.filter(e => e.action || e.event))}`);
        else if (select.target !== 'quick_apply_port') fail('T1', `Sai target | got: "${select.target}"`);
        else if (select.optionCode?.toUpperCase() !== 'SGN') fail('T1', `Sai optionCode | got: "${select.optionCode}"`);
        else pass('T1', `VIRTUAL_SELECT target="quick_apply_port" optionCode="SGN"`);
    }

    sep();
    log('TEST 2 — port: mã không hợp lệ → không action giả');
    {
        const sid = await createSession('vi');
        const { events } = await streamMessage(sid, "Chọn giúp tôi cửa khẩu mã 'ZZZ' trong form đăng ký nhanh", { currentUrl: '/' });
        const select = events.find(e => e.action === 'VIRTUAL_SELECT' || e.action === 'NAVIGATE_AND_SELECT');
        if (select) fail('T2', `Lẽ ra phải lỗi nhưng lại trả action "${select.action}"`);
        else pass('T2', 'Không có action select giả nào được trả khi mã cửa khẩu không hợp lệ');
    }

    sep();
    log('TEST 3 — port: mở field không kèm giá trị → VIRTUAL_CLICK (không phải VIRTUAL_SELECT)');
    {
        const sid = await createSession('vi');
        const { events } = await streamMessage(sid, 'Mở giúp tôi ô chọn cửa khẩu trong form đăng ký nhanh', { currentUrl: '/' });
        const click = events.find(e => e.action === 'VIRTUAL_CLICK');
        const select = events.find(e => e.action === 'VIRTUAL_SELECT');
        if (select) fail('T3', `Lẽ ra chỉ mở field nhưng lại VIRTUAL_SELECT optionCode="${select.optionCode}"`);
        else if (!click || click.target !== 'quick_apply_port') fail('T3', `Không có VIRTUAL_CLICK target=quick_apply_port`);
        else pass('T3', 'VIRTUAL_CLICK target="quick_apply_port" (không có value)');
    }

    sep();
    log('TEST 4 — visa_option: chọn E-Visa 30 ngày 1 lần (VIRTUAL_SELECT)');
    {
        const sid = await createSession('vi');
        const { events } = await streamMessage(sid, 'Chọn giúp tôi loại visa E-Visa 30 ngày 1 lần trong form đăng ký nhanh', { currentUrl: '/' });
        const select = events.find(e => e.action === 'VIRTUAL_SELECT');
        if (!select) fail('T4', `Không có VIRTUAL_SELECT | events: ${JSON.stringify(events.filter(e => e.action || e.event))}`);
        else if (select.target !== 'quick_apply_visa_option') fail('T4', `Sai target | got: "${select.target}"`);
        else if (select.optionCode !== 'evisa-30-single') fail('T4', `Sai optionCode | got: "${select.optionCode}"`);
        else pass('T4', `VIRTUAL_SELECT target="quick_apply_visa_option" optionCode="evisa-30-single"`);
    }

    sep();
    log('TEST 5 — processing_speed: chọn xử lý khẩn 4 ngày (VIRTUAL_SELECT)');
    {
        const sid = await createSession('vi');
        const { events } = await streamMessage(sid, 'Chọn giúp tôi tốc độ xử lý khẩn 4 ngày trong form đăng ký nhanh', { currentUrl: '/' });
        const select = events.find(e => e.action === 'VIRTUAL_SELECT');
        if (!select) fail('T5', `Không có VIRTUAL_SELECT | events: ${JSON.stringify(events.filter(e => e.action || e.event))}`);
        else if (select.target !== 'quick_apply_processing_speed') fail('T5', `Sai target | got: "${select.target}"`);
        else if (select.optionCode !== 'urgent-4d') fail('T5', `Sai optionCode | got: "${select.optionCode}"`);
        else pass('T5', `VIRTUAL_SELECT target="quick_apply_processing_speed" optionCode="urgent-4d"`);
    }

    sep();
    log('TEST 6 — port: combo từ /about-us → NAVIGATE_AND_SELECT');
    {
        const sid = await createSession('vi');
        const { events } = await streamMessage(sid, 'Chọn giúp tôi cửa khẩu Đà Nẵng trong form đăng ký nhanh', { currentUrl: '/about-us' });
        const combo = events.find(e => e.action === 'NAVIGATE_AND_SELECT');
        if (!combo) fail('T6', `Không có NAVIGATE_AND_SELECT | events: ${JSON.stringify(events.filter(e => e.action || e.event))}`);
        else if (combo.destination !== '/') fail('T6', `Sai destination | got: "${combo.destination}"`);
        else if (combo.optionCode?.toUpperCase() !== 'DAD') fail('T6', `Sai optionCode | got: "${combo.optionCode}"`);
        else pass('T6', `NAVIGATE_AND_SELECT destination="/" optionCode="DAD"`);
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
