/**
 * E2E Test: focus_ui_field — 5 target mới apply_step1_* (Pilot Tray Suggestion /apply Step 1)
 *
 * Theo đúng pattern của e2e-focus-ui-field-select.mjs (Quick Apply) — verify TẦNG BACKEND:
 * tool có trả đúng action/optionCode/error không khi currentUrl = "/apply".
 *
 * Chạy: node scripts/e2e-focus-ui-field-apply-step1.mjs
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
            { hostname: HOST, port: PORT, path: urlPath, method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(raw) } },
            (res) => { let data = ''; res.on('data', c => (data += c)); res.on('end', () => resolve({ status: res.statusCode, body: data })); }
        );
        req.on('error', reject);
        req.write(raw);
        req.end();
    });
}

async function createSession(lang = 'vi') {
    const res = await httpPost(JOIN_PATH, { user_name: 'ApplyStep1Tester', website_language: lang });
    const json = JSON.parse(res.body);
    if (!json.data?.session_id) throw new Error('Không lấy được session_id: ' + res.body);
    return json.data.session_id;
}

// page_content giả lập đúng format mà useChat.ts build: "Form Schema Context:\n{...}\nVisible Page Content:\n..."
const STEP1_SCHEMA = JSON.stringify({
    form_name: "step1_form",
    fields: {
        visa_type: [{ code: "evisa", name: "E-Visa" }, { code: "voa", name: "Visa on Arrival" }],
        visa_category: [
            { code: "evisa_30d_single", name: "30 Days Single Entry" },
            { code: "evisa_90d_single", name: "90 Days Single Entry" },
        ],
        port_of_entry: [{ code: "SGN", name: "Tan Son Nhat Airport" }, { code: "HAN", name: "Noi Bai Airport" }],
        purpose_of_visit: [{ code: "tourism", name: "Tourism" }, { code: "business", name: "Business" }],
    },
});
const STEP1_PAGE_CONTENT = `Form Schema Context:\n${STEP1_SCHEMA}\nVisible Page Content:\nBuoc 1 - Chon loai visa`;

function streamMessage(sessionId, message, opts = {}) {
    const { lang = 'vi', currentUrl = '/apply', pageContent = STEP1_PAGE_CONTENT } = opts;
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({
            session_id: sessionId, message, sender: 'USER', message_type: 'TEXT',
            current_url: currentUrl, page_content: pageContent, page_context: '[]', website_language: lang,
        });
        log(`${CYAN}  → Gửi (currentUrl=${currentUrl}): "${message}"${RESET}`);
        const req = http.request(
            { hostname: HOST, port: PORT, path: STREAM_PATH, method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), Accept: 'text/event-stream' } },
            (res) => {
                if (res.statusCode !== 200) {
                    let errData = ''; res.on('data', c => (errData += c));
                    res.on('end', () => reject(new Error(`HTTP ${res.statusCode}: ${errData}`)));
                    return;
                }
                const events = []; let buffer = '';
                res.on('data', (chunk) => {
                    buffer += chunk.toString();
                    const lines = buffer.split('\n');
                    buffer = lines.pop() ?? '';
                    for (const line of lines) {
                        if (!line.startsWith('data: ')) continue;
                        try {
                            const data = JSON.parse(line.slice(6));
                            events.push(data);
                            if (data.action || data.event) log(`${MAGENTA}  [SSE] ${JSON.stringify(data)}${RESET}`);
                        } catch {}
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

let passed = 0, failed = 0;
const failures = [];
function fail(id, reason) { log(`${RED}  ❌ FAIL${RESET} — ${reason}`); failed++; failures.push({ id, reason }); }
function pass(id, reason) { log(`${GREEN}  ✅ PASS${RESET} — ${reason}`); passed++; }
function wentThroughGemini(events) { return events.some(e => e.event === 'tool_processing' && e.tool === 'focus_ui_field'); }

async function run() {
    sep();
    log('TEST 1 — Đang ở /apply Step1, chọn visa_type "E-Visa" → VIRTUAL_SELECT target=apply_step1_visa_type optionCode=evisa');
    {
        const sid = await createSession('vi');
        const { events } = await streamMessage(sid, 'Tôi muốn chọn loại visa E-Visa', { currentUrl: '/apply' });
        const select = events.find(e => e.action === 'VIRTUAL_SELECT');
        if (!select) fail('T1', `Không có VIRTUAL_SELECT | events: ${JSON.stringify(events.filter(e => e.action || e.event))}`);
        else if (select.target !== 'apply_step1_visa_type') fail('T1', `Sai target | got: "${select.target}"`);
        else if (select.optionCode?.toLowerCase() !== 'evisa') fail('T1', `Sai optionCode | got: "${select.optionCode}"`);
        else if (!wentThroughGemini(events)) fail('T1', 'Không thấy tool_processing event');
        else pass('T1', `VIRTUAL_SELECT target="apply_step1_visa_type" optionCode="evisa"`);
    }

    sep();
    log('TEST 2 — Chọn cửa khẩu Tân Sơn Nhất → VIRTUAL_SELECT target=apply_step1_port_of_entry optionCode=SGN (validate qua DB thật)');
    {
        const sid = await createSession('vi');
        const { events } = await streamMessage(sid, 'Chọn giúp tôi cửa khẩu Tân Sơn Nhất ở bước 1', { currentUrl: '/apply' });
        const select = events.find(e => e.action === 'VIRTUAL_SELECT');
        if (!select) fail('T2', `Không có VIRTUAL_SELECT | events: ${JSON.stringify(events.filter(e => e.action || e.event))}`);
        else if (select.target !== 'apply_step1_port_of_entry') fail('T2', `Sai target | got: "${select.target}"`);
        else if (select.optionCode?.toUpperCase() !== 'SGN') fail('T2', `Sai optionCode | got: "${select.optionCode}"`);
        else pass('T2', `VIRTUAL_SELECT target="apply_step1_port_of_entry" optionCode="SGN"`);
    }

    sep();
    log('TEST 3 — Chọn số người nộp đơn = 3 → VIRTUAL_SELECT target=apply_step1_applicant_count optionCode=3');
    {
        const sid = await createSession('vi');
        const { events } = await streamMessage(sid, 'Tôi đăng ký cho 3 người ở bước 1', { currentUrl: '/apply' });
        const select = events.find(e => e.action === 'VIRTUAL_SELECT');
        if (!select) fail('T3', `Không có VIRTUAL_SELECT | events: ${JSON.stringify(events.filter(e => e.action || e.event))}`);
        else if (select.target !== 'apply_step1_applicant_count') fail('T3', `Sai target | got: "${select.target}"`);
        else if (select.optionCode !== '3') fail('T3', `Sai optionCode | got: "${select.optionCode}"`);
        else pass('T3', `VIRTUAL_SELECT target="apply_step1_applicant_count" optionCode="3"`);
    }

    sep();
    log('TEST 4 — Đang ở Home (/), yêu cầu chọn visa_category ở bước 1 → NAVIGATE_AND_SELECT về /apply');
    {
        const sid = await createSession('vi');
        const { events } = await streamMessage(sid, 'Chọn giúp tôi hạng mục visa 30 ngày 1 lần ở bước 1 trang apply', { currentUrl: '/' });
        const combo = events.find(e => e.action === 'NAVIGATE_AND_SELECT');
        if (!combo) fail('T4', `Không có NAVIGATE_AND_SELECT | events: ${JSON.stringify(events.filter(e => e.action || e.event))}`);
        else if (combo.destination !== '/apply') fail('T4', `Sai destination | got: "${combo.destination}"`);
        else if (combo.target !== 'apply_step1_visa_category') fail('T4', `Sai target | got: "${combo.target}"`);
        else if (combo.optionCode?.toLowerCase() !== 'evisa_30d_single') fail('T4', `Sai optionCode | got: "${combo.optionCode}"`);
        else pass('T4', `NAVIGATE_AND_SELECT destination="/apply" target="apply_step1_visa_category" optionCode="evisa_30d_single"`);
    }

    sep();
    log('TEST 5 — Số người nộp đơn không hợp lệ (vd 9 người) → tool trả lỗi rõ ràng, không trả action giả');
    {
        const sid = await createSession('vi');
        const { events } = await streamMessage(sid, 'Tôi đăng ký cho 9 người ở bước 1', { currentUrl: '/apply' });
        const select = events.find(e => e.action === 'VIRTUAL_SELECT' || e.action === 'NAVIGATE_AND_SELECT');
        if (select) fail('T5', `Lẽ ra phải lỗi (9 > 5) nhưng lại trả action "${select.action}" optionCode="${select.optionCode}"`);
        else pass('T5', 'Không có action select giả nào khi số lượng > 5');
    }

    sep();
    log('TEST 6 — Quick Apply (target cũ) KHÔNG bị regression: chọn quốc tịch ở Home vẫn ra VIRTUAL_SELECT như trước');
    {
        const sid = await createSession('vi');
        const { events } = await streamMessage(sid, 'Chọn giúp tôi quốc tịch Việt Nam ở form đăng ký nhanh', { currentUrl: '/', pageContent: '' });
        const select = events.find(e => e.action === 'VIRTUAL_SELECT');
        if (!select) fail('T6', `Không có VIRTUAL_SELECT | events: ${JSON.stringify(events.filter(e => e.action || e.event))}`);
        else if (select.target !== 'quick_apply_nationality') fail('T6', `Sai target | got: "${select.target}"`);
        else if (select.optionCode?.toLowerCase() !== 'vn') fail('T6', `Sai optionCode | got: "${select.optionCode}"`);
        else pass('T6', `VIRTUAL_SELECT target="quick_apply_nationality" optionCode="vn" — không regression`);
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

run().catch(err => { log(`${RED}LỖI CHẠY TEST: ${err.message}${RESET}`); process.exit(1); });
