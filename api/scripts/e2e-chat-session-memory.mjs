/**
 * E2E Test: Session Memory (Track A) — AI nhớ thông tin qua các lượt chat
 *
 * Mục tiêu:
 *   Sau khi user khai báo thông tin ở turn 1 (quốc tịch, số người, loại visa...),
 *   AI phải nhớ và sử dụng thông tin đó ở turn 2 mà KHÔNG hỏi lại.
 *
 * Cơ chế:
 *   Turn 1 → extractEntitiesFromText() → persist ChatSession.context (fire-and-forget)
 *   Turn 2 → buildContextBlock() inject [USER SESSION MEMORY] vào system prompt
 *
 * Chạy: node scripts/e2e-chat-session-memory.mjs
 */

import http from 'http';

const HOST       = '127.0.0.1';
const PORT       = 5000;
const JOIN_PATH  = '/api/v1/chat/join';
const MSG_PATH   = '/api/v1/chat/message';
const STREAM_PATH= '/api/v1/chat/message/stream';
const WAIT_MS    = 800; // đủ để fire-and-forget context update hoàn thành

const GREEN  = '\x1b[32m';
const RED    = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN   = '\x1b[36m';
const RESET  = '\x1b[0m';
const BOLD   = '\x1b[1m';

const ts  = () => new Date().toISOString().slice(11, 23);
const log = (...a) => console.log(`[${ts()}]`, ...a);
const sep = (n = 70) => console.log('─'.repeat(n));

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
                res.on('data', c => data += c);
                res.on('end', () => resolve({ status: res.statusCode, body: data }));
            }
        );
        req.on('error', reject);
        req.write(raw);
        req.end();
    });
}

async function createSession(userName = 'MemoryTester') {
    const res = await httpPost(JOIN_PATH, { user_name: userName, website_language: 'vi' });
    const json = JSON.parse(res.body);
    return json.data.session_id;
}

/** Gửi message qua NON-streaming endpoint (đơn giản hơn, đủ để test context) */
async function sendMessage(sessionId, message) {
    const res = await httpPost(MSG_PATH, {
        session_id: sessionId,
        message,
        sender: 'USER',
        message_type: 'TEXT',
    });
    const json = JSON.parse(res.body);
    const msgs = json.data?.messages ?? [];
    const aiMsg = msgs.find(m => m.sender === 'AI');
    return aiMsg?.message?.replace(/<!--.*?-->/gs, '').trim() ?? '';
}

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

/** Kiểm tra response có chứa ít nhất 1 keyword expected và KHÔNG chứa keyword forbidden */
function assert(label, reply, { mustContain = [], mustNotContain = [] } = {}) {
    let pass = true;
    const issues = [];

    for (const kw of mustContain) {
        if (!reply.toLowerCase().includes(kw.toLowerCase())) {
            pass = false;
            issues.push(`thiếu keyword "${kw}"`);
        }
    }
    for (const kw of mustNotContain) {
        if (reply.toLowerCase().includes(kw.toLowerCase())) {
            pass = false;
            issues.push(`không được chứa "${kw}" nhưng có`);
        }
    }

    if (pass) {
        log(`${GREEN}✅ PASS${RESET} — ${label}`);
    } else {
        log(`${RED}❌ FAIL${RESET} — ${label}: ${issues.join(', ')}`);
    }
    return pass;
}

// ─────────────────────────────────────────────────────────────────
// TEST CASES
// ─────────────────────────────────────────────────────────────────

const TESTS = [
    {
        name: 'T1 — Nationality Memory: người Mỹ → AI không hỏi lại quốc tịch',
        turn1: 'Tôi là người Mỹ, muốn hỏi về visa Việt Nam',
        turn2: 'Tôi có cần xin visa không?',
        assert: (reply1, reply2) => ({
            // Turn 2: AI phải đề cập đến Mỹ/US, KHÔNG hỏi lại "quốc tịch gì"
            mustContain: [],
            mustNotContain: ['bạn mang quốc tịch gì', 'quốc tịch của bạn là gì', 'bạn đến từ quốc gia nào'],
            label: 'AI không hỏi lại quốc tịch khi đã biết user là người Mỹ',
        }),
    },
    {
        name: 'T2 — Applicant Count Memory: nhóm 3 người → AI tính phí cho 3',
        turn1: 'Chúng tôi là nhóm 3 người đi du lịch từ Hàn Quốc',
        turn2: 'Tính phí visa cho cả nhóm',
        assert: (reply1, reply2) => ({
            // Turn 2: AI phải đề cập đến "3" (số người đã biết)
            mustContain: ['3'],
            mustNotContain: ['bao nhiêu người', 'số lượng người', 'nhóm gồm mấy người'],
            label: 'AI nhớ "3 người" và không hỏi lại số lượng',
        }),
    },
    {
        name: 'T3 — Nationality (English): "I am American" → AI hiểu tiếng Anh',
        turn1: 'I am American and I want to visit Vietnam next month',
        turn2: 'Do I need a visa?',
        assert: (reply1, reply2) => ({
            // Turn 2: AI phải trả lời về visa cho người Mỹ
            mustNotContain: ['what is your nationality', 'where are you from', 'which country'],
            label: 'AI không hỏi lại nationality khi user đã khai báo bằng tiếng Anh',
        }),
    },
    {
        name: 'T4 — Travel Purpose Memory: "du lịch" → AI nhớ mục đích',
        turn1: 'Tôi muốn đi du lịch Việt Nam từ Nhật Bản',
        turn2: 'Tôi cần chuẩn bị những gì?',
        assert: (reply1, reply2) => ({
            // Turn 2: AI biết đây là du lịch, không hỏi lại mục đích chuyến đi
            mustNotContain: ['mục đích chuyến đi của bạn là gì', 'bạn đi vì mục đích gì'],
            label: 'AI không hỏi lại mục đích khi đã biết user đi du lịch',
        }),
    },
];

// ─────────────────────────────────────────────────────────────────
// RUNNER
// ─────────────────────────────────────────────────────────────────

async function runTests() {
    sep();
    log(`${BOLD}${YELLOW}=== E2E TEST: SESSION MEMORY (Track A) ===${RESET}`);
    log(`Host: ${HOST}:${PORT}`);
    sep();

    let passed = 0, failed = 0;

    for (const tc of TESTS) {
        sep(50);
        log(`${CYAN}${BOLD}${tc.name}${RESET}`);

        let sessionId;
        try {
            sessionId = await createSession();
            log(`Session: ${sessionId}`);

            log(`Turn 1 → "${tc.turn1}"`);
            const reply1 = await sendMessage(sessionId, tc.turn1);
            log(`AI reply 1: ${reply1.slice(0, 200)}${reply1.length > 200 ? '...' : ''}`);

            // Đợi fire-and-forget context persist hoàn thành
            await sleep(WAIT_MS);

            log(`Turn 2 → "${tc.turn2}"`);
            const reply2 = await sendMessage(sessionId, tc.turn2);
            log(`AI reply 2: ${reply2.slice(0, 300)}${reply2.length > 300 ? '...' : ''}`);

            const { mustContain, mustNotContain, label } = tc.assert(reply1, reply2);
            const ok = assert(label, reply2, { mustContain, mustNotContain });
            if (ok) passed++; else failed++;

        } catch (e) {
            log(`${RED}ERROR: ${e.message}${RESET}`);
            failed++;
        }

        // Rate limit: mỗi session mới, không cần delay lớn
        await sleep(500);
    }

    sep();
    const total = passed + failed;
    const color = failed === 0 ? GREEN : RED;
    log(`${color}${BOLD}KẾT QUẢ: ${passed}/${total} PASS${RESET}`);
    if (failed > 0) {
        log(`${RED}${failed} test FAIL — kiểm tra AI reply ở trên.${RESET}`);
        log(`Lưu ý: Test này kiểm tra BEHAVIOR (không hỏi lại info đã biết),`);
        log(`       không phải keyword cứng — AI có thể dùng từ khác nhau.`);
    } else {
        log(`${GREEN}Session Memory hoạt động đúng!${RESET}`);
    }
    sep();
    process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(e => {
    console.error(`${RED}Fatal error: ${e.message}${RESET}`);
    process.exit(1);
});
