/**
 * E2E Test: focus_ui_field Phase 2 — AI tự chọn quốc gia trong dropdown (2026-06-23)
 *
 * Tầng 1 (file này) CHỈ verify phần backend: tool có trả đúng action/optionCode/error không —
 * KHÔNG verify hành vi DOM thật (đó là Playwright Tầng 2, xem virtual-mouse-select-option.spec.ts).
 *
 * QUAN TRỌNG: NLP Cache cho intent "focus.quick_apply_nationality" CÓ THỂ đã được seed từ Phase 1.
 * Mọi message ở đây ĐỀU CHỨA tên quốc gia → guard ở chat.service.ts (Task 3) phải ép message này
 * luôn đi Gemini. Test PASS phải thấy event {event:"tool_processing", tool:"focus_ui_field"} trong
 * stream — đây là dấu hiệu chắc chắn đã đi qua Gemini, không phải NLP Cache (NLP Cache không bao
 * giờ phát event "tool_processing" vì nó bypass hoàn toàn vòng lặp function-calling của Gemini).
 *
 * Chạy: node scripts/e2e-focus-ui-field-select.mjs
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
    const res = await httpPost(JOIN_PATH, { user_name: 'FocusSelectTester', website_language: lang });
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

function wentThroughGemini(events) {
    return events.some(e => e.event === 'tool_processing' && e.tool === 'focus_ui_field');
}

async function run() {
    sep();
    log('TEST 1 — Cùng trang Home, chọn quốc gia có sẵn (VIRTUAL_SELECT)');
    {
        const sid = await createSession('vi');
        const { events } = await streamMessage(sid, 'Chọn giúp tôi quốc tịch Việt Nam ở form đăng ký nhanh', { currentUrl: '/' });
        const select = events.find(e => e.action === 'VIRTUAL_SELECT');
        if (!select) {
            fail('T1', `Không có VIRTUAL_SELECT trong stream | events: ${JSON.stringify(events.filter(e => e.action || e.event))}`);
        } else if (select.target !== 'quick_apply_nationality') {
            fail('T1', `Sai target | got: "${select.target}"`);
        } else if (select.optionCode?.toLowerCase() !== 'vn') {
            fail('T1', `Sai optionCode | got: "${select.optionCode}" | expected: "vn"`);
        } else if (!wentThroughGemini(events)) {
            fail('T1', 'Không thấy tool_processing event — nghi ngờ đã đi qua NLP Cache thay vì Gemini');
        } else {
            pass('T1', `VIRTUAL_SELECT target="quick_apply_nationality" optionCode="vn", đi qua Gemini`);
        }
    }

    sep();
    log('TEST 2 — Đang ở /about-us, combo chuyển trang rồi chọn quốc gia (NAVIGATE_AND_SELECT)');
    {
        const sid = await createSession('vi');
        const { events } = await streamMessage(sid, 'Chọn giúp tôi quốc tịch Hàn Quốc ở form đăng ký nhanh', { currentUrl: '/about-us' });
        const combo = events.find(e => e.action === 'NAVIGATE_AND_SELECT');
        if (!combo) {
            fail('T2', `Không có NAVIGATE_AND_SELECT trong stream | events: ${JSON.stringify(events.filter(e => e.action || e.event))}`);
        } else if (combo.destination !== '/') {
            fail('T2', `Sai destination | got: "${combo.destination}"`);
        } else if (combo.optionCode?.toLowerCase() !== 'kr') {
            fail('T2', `Sai optionCode | got: "${combo.optionCode}" | expected: "kr"`);
        } else if (!wentThroughGemini(events)) {
            fail('T2', 'Không thấy tool_processing event');
        } else {
            pass('T2', `NAVIGATE_AND_SELECT destination="/" optionCode="kr"`);
        }
    }

    sep();
    log('TEST 3 — Mở field KHÔNG kèm tên quốc gia → vẫn ra VIRTUAL_CLICK như Phase 1 (không regression)');
    {
        const sid = await createSession('vi');
        const { events } = await streamMessage(sid, 'Mở giúp tôi ô chọn quốc tịch trong form đăng ký nhanh', { currentUrl: '/' });
        const click = events.find(e => e.action === 'VIRTUAL_CLICK');
        const select = events.find(e => e.action === 'VIRTUAL_SELECT');
        if (select) {
            fail('T3', `Lẽ ra chỉ mở field (VIRTUAL_CLICK) nhưng lại VIRTUAL_SELECT (optionCode="${select.optionCode}") — Gemini tự suy đoán sai quốc gia`);
        } else if (!click || click.target !== 'quick_apply_nationality') {
            fail('T3', `Không có VIRTUAL_CLICK target=quick_apply_nationality | events: ${JSON.stringify(events.filter(e => e.action || e.event))}`);
        } else {
            pass('T3', 'VIRTUAL_CLICK target="quick_apply_nationality" (không có value, đúng Phase 1)');
        }
    }

    sep();
    log('TEST 4 — Quốc gia không tồn tại trong DB → tool trả lỗi rõ ràng, không trả action giả');
    {
        const sid = await createSession('vi');
        const { events } = await streamMessage(sid, "Chọn giúp tôi quốc tịch mã 'zz' ở form đăng ký nhanh", { currentUrl: '/' });
        const select = events.find(e => e.action === 'VIRTUAL_SELECT' || e.action === 'NAVIGATE_AND_SELECT');
        if (select) {
            fail('T4', `Lẽ ra phải lỗi nhưng lại trả action "${select.action}" — tool không validate đúng`);
        } else {
            pass('T4', 'Không có action select giả nào được trả khi mã quốc gia không hợp lệ');
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
