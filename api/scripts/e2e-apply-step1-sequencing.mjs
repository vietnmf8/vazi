/**
 * E2E Test: /apply Step 1 — Guided Sequencing qua chat (Pilot Tray Suggestion, 2026-06-25)
 *
 * Regression guard cho 2 bug THẬT đã phát hiện + sửa trong phiên triển khai pilot:
 *
 * BUG 1 — NLP Cache bypass Gemini: khi user trả lời bằng chính tên 1 option (vd "E-Visa",
 *   "E-Visa · 30 Days Single Entry"), lớp NLP Cache (Naive Bayes classifier, huấn luyện trên
 *   corpus không có ngữ cảnh hội thoại) nhận nhầm thành ý định navigate/click và trả thẳng
 *   "Redirecting you...", bỏ qua Gemini hoàn toàn — directive "APPLY STEP 1 GUIDED SELECTION"
 *   trong gemini.service.ts vô nghĩa vì message không bao giờ tới được đó.
 *   Fix: guard mới trong chat.service.ts (`_isApplyStep1Schema && _looksLikeStep1OptionAnswer`).
 *
 * BUG 2 — Disambiguation: ngay cả khi message tới được Gemini, cần chỉ dẫn rõ "câu trả lời ngắn
 *   sau câu hỏi field-selection PHẢI được hiểu là chọn giá trị, không phải lệnh điều hướng".
 *   Fix: thêm đoạn "CRITICAL DISAMBIGUATION" vào directive trong gemini.service.ts.
 *
 * Coverage:
 *   T1 — Full chain 1 session: "tôi muốn điền hồ sơ" → visa_type → visa_category (lọc đúng theo
 *        visa_type đã chọn) → port_of_entry → processing_time, MỖI lượt (trừ processing_time) phải
 *        ra VIRTUAL_SELECT đúng target/optionCode; processing_time dùng click_ui_element (không
 *        phải Radix Select — xem ProcessingTimeSelector.tsx) nên ra VIRTUAL_CLICK đúng target.
 *   T2 — Regression riêng cho BUG 1: gửi trực tiếp câu trả lời dạng tên option ở /apply Step 1,
 *        PHẢI đi qua Gemini (có event tool_processing) — không được rơi vào NLP Cache HIT.
 *
 * Chạy: node scripts/e2e-apply-step1-sequencing.mjs
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

async function createSession(lang = 'en') {
    const res = await httpPost(JOIN_PATH, { user_name: 'ApplyStep1SequencingTester', website_language: lang });
    const json = JSON.parse(res.body);
    if (!json.data?.session_id) throw new Error('Không lấy được session_id: ' + res.body);
    return json.data.session_id;
}

// page_content giả lập đúng format mà useChat.ts build — bao gồm visa_category CHỈ evisa_*
// (mô phỏng đúng việc UI lọc category theo visa_type đã chọn ở lượt trước).
function buildPageContent(categories) {
    const schema = JSON.stringify({
        form_name: "step1_form",
        fields: {
            visa_type: [{ code: "evisa", name: "E-Visa — All border crossings" }, { code: "voa", name: "Visa on Arrival (VOA) — Air only" }],
            visa_category: categories,
            port_of_entry: [{ code: "SGN", name: "Tan Son Nhat Airport" }, { code: "HAN", name: "Noi Bai Airport" }],
            purpose_of_visit: [{ code: "tourism", name: "Tourism" }, { code: "business", name: "Business" }],
        },
    });
    return `Form Schema Context:\n${schema}\nVisible Page Content:\nStep 1 - choose visa type`;
}

const EVISA_CATEGORIES = [
    { code: "evisa_30d_single", name: "E-Visa · 30 Days Single Entry" },
    { code: "evisa_90d_single", name: "E-Visa · 90 Days Single Entry" },
    { code: "evisa_90d_multiple", name: "E-Visa · 90 Days Multiple Entry" },
];

function streamMessage(sessionId, message, pageContent) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({
            session_id: sessionId, message, sender: 'USER', message_type: 'TEXT',
            current_url: '/apply', page_content: pageContent, page_context: '[]', website_language: 'en',
        });
        log(`${CYAN}  → Gửi: "${message}"${RESET}`);
        const req = http.request(
            { hostname: HOST, port: PORT, path: STREAM_PATH, method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), Accept: 'text/event-stream' } },
            (res) => {
                if (res.statusCode !== 200) {
                    let errData = ''; res.on('data', c => (errData += c));
                    res.on('end', () => reject(new Error(`HTTP ${res.statusCode}: ${errData}`)));
                    return;
                }
                const events = []; let buffer = ''; let fullText = '';
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
                            if (data.action || data.event) log(`${MAGENTA}  [SSE] ${JSON.stringify(data)}${RESET}`);
                        } catch {}
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

let passed = 0, failed = 0;
const failures = [];
function fail(id, reason) { log(`${RED}  ❌ FAIL${RESET} — ${reason}`); failed++; failures.push({ id, reason }); }
function pass(id, reason) { log(`${GREEN}  ✅ PASS${RESET} — ${reason}`); passed++; }
function wentThroughGemini(events) { return events.some(e => e.event === 'tool_processing' && e.tool === 'focus_ui_field'); }
function virtualSelect(events) { return events.find(e => e.action === 'VIRTUAL_SELECT'); }
function virtualClick(events) { return events.find(e => e.action === 'VIRTUAL_CLICK'); }

async function run() {
    sep();
    log('TEST 1 — Full chain trong 1 session: visa_type → visa_category (lọc đúng) → port_of_entry');
    {
        const sid = await createSession('en');

        const r1 = await streamMessage(sid, 'I want to fill out the visa application', buildPageContent(EVISA_CATEGORIES));
        if (r1.fullText.toLowerCase().includes('redirecting')) {
            fail('T1.1', `Bị NLP Cache bắt nhầm — text: "${r1.fullText.slice(0, 100)}"`);
        } else if (!/visa type|type of visa|loại visa/i.test(r1.fullText)) {
            fail('T1.1', `AI không hỏi visa_type | text: "${r1.fullText.slice(0, 150)}"`);
        } else {
            pass('T1.1', 'AI hỏi visa_type, không bị NLP Cache chặn');
        }

        const r2 = await streamMessage(sid, 'E-Visa — All border crossings', buildPageContent(EVISA_CATEGORIES));
        const sel2 = virtualSelect(r2.events);
        if (!sel2) fail('T1.2', `Không có VIRTUAL_SELECT (có thể bị NLP Cache "Redirecting") | text: "${r2.fullText.slice(0, 100)}"`);
        else if (sel2.target !== 'apply_step1_visa_type' || sel2.optionCode?.toLowerCase() !== 'evisa') {
            fail('T1.2', `Sai target/optionCode | got: ${JSON.stringify(sel2)}`);
        } else if (!wentThroughGemini(r2.events)) {
            fail('T1.2', 'Không thấy tool_processing — nghi ngờ đi qua NLP Cache');
        } else if (!/30 days|90 days|category|hạng/i.test(r2.fullText)) {
            fail('T1.2', `AI không tự chuyển sang hỏi visa_category | text: "${r2.fullText.slice(0, 150)}"`);
        } else {
            pass('T1.2', 'focus_ui_field(apply_step1_visa_type, evisa) đúng, AI tự chuyển sang hỏi visa_category');
        }

        const r3 = await streamMessage(sid, 'E-Visa · 30 Days Single Entry', buildPageContent(EVISA_CATEGORIES));
        const sel3 = virtualSelect(r3.events);
        if (!sel3) fail('T1.3', `Không có VIRTUAL_SELECT (có thể bị NLP Cache "Redirecting") | text: "${r3.fullText.slice(0, 100)}"`);
        else if (sel3.target !== 'apply_step1_visa_category' || sel3.optionCode?.toLowerCase() !== 'evisa_30d_single') {
            fail('T1.3', `Sai target/optionCode | got: ${JSON.stringify(sel3)}`);
        } else if (!/port|cửa khẩu|airport/i.test(r3.fullText)) {
            fail('T1.3', `AI không tự chuyển sang hỏi port_of_entry | text: "${r3.fullText.slice(0, 150)}"`);
        } else {
            pass('T1.3', 'focus_ui_field(apply_step1_visa_category, evisa_30d_single) đúng, AI tự chuyển sang hỏi port_of_entry');
        }

        const r4 = await streamMessage(sid, 'Tan Son Nhat Airport', buildPageContent(EVISA_CATEGORIES));
        const sel4 = virtualSelect(r4.events);
        if (!sel4) fail('T1.4', `Không có VIRTUAL_SELECT | text: "${r4.fullText.slice(0, 100)}"`);
        else if (sel4.target !== 'apply_step1_port_of_entry') fail('T1.4', `Sai target | got: ${JSON.stringify(sel4)}`);
        else if (!/purpose|mục đích/i.test(r4.fullText)) fail('T1.4', `AI không tự chuyển sang hỏi purpose_of_visit | text: "${r4.fullText.slice(0, 150)}"`);
        else pass('T1.4', 'focus_ui_field(apply_step1_port_of_entry) đúng, AI tự chuyển sang hỏi purpose_of_visit');

        const r5 = await streamMessage(sid, 'Tourism', buildPageContent(EVISA_CATEGORIES));
        const sel5 = virtualSelect(r5.events);
        if (!sel5) fail('T1.5', `Không có VIRTUAL_SELECT | text: "${r5.fullText.slice(0, 100)}"`);
        else if (sel5.target !== 'apply_step1_purpose_of_visit' || sel5.optionCode?.toLowerCase() !== 'tourism') {
            fail('T1.5', `Sai target/optionCode | got: ${JSON.stringify(sel5)}`);
        } else if (!/applicant|người nộp đơn|how many/i.test(r5.fullText)) fail('T1.5', `AI không tự chuyển sang hỏi applicant_count | text: "${r5.fullText.slice(0, 150)}"`);
        else pass('T1.5', 'focus_ui_field(apply_step1_purpose_of_visit, tourism) đúng, AI tự chuyển sang hỏi applicant_count');

        const r6 = await streamMessage(sid, '1 person', buildPageContent(EVISA_CATEGORIES));
        const sel6 = virtualSelect(r6.events);
        if (!sel6) fail('T1.6', `Không có VIRTUAL_SELECT | text: "${r6.fullText.slice(0, 100)}"`);
        else if (sel6.target !== 'apply_step1_applicant_count' || sel6.optionCode !== '1') {
            fail('T1.6', `Sai target/optionCode | got: ${JSON.stringify(sel6)}`);
        } else if (!/processing (time|speed)|tốc độ xử lý/i.test(r6.fullText)) fail('T1.6', `AI không tự chuyển sang hỏi processing_time | text: "${r6.fullText.slice(0, 150)}"`);
        else pass('T1.6', 'focus_ui_field(apply_step1_applicant_count, 1) đúng, AI tự chuyển sang hỏi processing_time');

        const r7 = await streamMessage(sid, 'Urgent · 4 Working Days', buildPageContent(EVISA_CATEGORIES));
        const click7 = virtualClick(r7.events);
        if (!click7) fail('T1.7', `Không có VIRTUAL_CLICK (processing_time dùng click_ui_element) | text: "${r7.fullText.slice(0, 150)}"`);
        else if (click7.target !== 'apply_step1_processing_urgent_4d') fail('T1.7', `Sai target | got: ${JSON.stringify(click7)}`);
        else pass('T1.7', 'click_ui_element(apply_step1_processing_urgent_4d) đúng — field cuối cùng của pilot');
    }

    sep();
    log('TEST 2 — Regression BUG 1: trả lời bằng tên option ở /apply Step 1 KHÔNG được rơi NLP Cache');
    {
        const sid = await createSession('en');
        await streamMessage(sid, 'I want to fill out the visa application', buildPageContent(EVISA_CATEGORIES));
        const r = await streamMessage(sid, 'E-Visa — All border crossings', buildPageContent(EVISA_CATEGORIES));

        if (r.fullText.toLowerCase().includes('redirecting')) {
            fail('T2', `BUG 1 TÁI XUẤT HIỆN — NLP Cache bắt nhầm thành navigate, text: "${r.fullText}"`);
        } else if (!wentThroughGemini(r.events)) {
            fail('T2', `Không thấy tool_processing event — message không đi qua Gemini | events: ${JSON.stringify(r.events.filter(e => e.action || e.event))}`);
        } else {
            pass('T2', 'Message đi qua Gemini đúng, không bị NLP Cache chặn nhầm');
        }
    }

    sep();
    const total = passed + failed;
    log(`KẾT QUẢ: ${GREEN}${passed} PASS${RESET}, ${failed > 0 ? RED : GREEN}${failed} FAIL${RESET} (tổng ${total})`);
    if (failures.length > 0) {
        sep();
        log('Chi tiết FAIL:');
        failures.forEach(f => log(`  [${f.id}] ${f.reason}`));
        process.exit(1);
    }
}

run().catch(err => { log(`${RED}LỖI CHẠY TEST: ${err.message}${RESET}`); process.exit(1); });
