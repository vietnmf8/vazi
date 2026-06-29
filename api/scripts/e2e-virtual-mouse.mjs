/**
 * E2E Test: Virtual Mouse Engine (Track B) — SSE event VIRTUAL_CLICK
 *
 * Mục tiêu:
 *   Khi AI quyết định điều hướng đến /apply, backend phải gửi SSE event
 *   { action: "VIRTUAL_CLICK", target: "btn-apply-header" } thay vì NAVIGATION.
 *   Với các trang khác, backend vẫn gửi NAVIGATION như cũ.
 *
 * Coverage:
 *   T1 — Main: tiếng Việt, intent rõ ràng đến /apply        → VIRTUAL_CLICK
 *   T2 — Main: tiếng Việt, điều hướng trang liên hệ         → NAVIGATION (/contact-us), không VIRTUAL_CLICK
 *   T3 — Main: tiếng Anh, intent đến apply page             → VIRTUAL_CLICK
 *   T4 — Edge: lời chào, không có navigation intent          → không có action event nào
 *   T5 — Edge: điều hướng trang kiểm tra trạng thái         → NAVIGATION (/check-status), không VIRTUAL_CLICK
 *
 * Chạy: node scripts/e2e-virtual-mouse.mjs
 */

import http from 'http';

const HOST        = '127.0.0.1';
const PORT        = 5000;
const JOIN_PATH   = '/api/v1/chat/join';
const STREAM_PATH = '/api/v1/chat/message/stream';

const GREEN  = '\x1b[32m';
const RED    = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN   = '\x1b[36m';
const BLUE   = '\x1b[34m';
const MAGENTA= '\x1b[35m';
const DIM    = '\x1b[2m';
const RESET  = '\x1b[0m';
const BOLD   = '\x1b[1m';

const ts  = () => new Date().toISOString().slice(11, 23);
const log = (...a) => console.log(`[${ts()}]`, ...a);
const sep = (n = 70, ch = '─') => console.log(ch.repeat(n));

// ─────────────────────────────────────────────────────────────────
// HTTP helpers
// ─────────────────────────────────────────────────────────────────

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
    const res = await httpPost(JOIN_PATH, { user_name: 'VirtualMouseTester', website_language: lang });
    const json = JSON.parse(res.body);
    if (!json.data?.session_id) throw new Error('Không lấy được session_id: ' + res.body);
    log(`${DIM}Session tạo: ${json.data.session_id}${RESET}`);
    return json.data.session_id;
}

/**
 * Gửi message qua SSE streaming endpoint.
 * Trả về mảng TẤT CẢ SSE events đã nhận được + full text AI.
 * Log từng event ngay khi nhận để theo dõi real-time.
 */
function streamMessage(sessionId, message, lang = 'vi') {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({
            session_id: sessionId,
            message,
            sender: 'USER',
            message_type: 'TEXT',
            current_url: '/',
            page_content: '',
            page_context: '[]',
            website_language: lang,
        });

        log(`${BLUE}  → Gửi: "${message}"${RESET}`);

        const req = http.request(
            {
                hostname: HOST,
                port: PORT,
                path: STREAM_PATH,
                method: 'POST',
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
                let chunkCount = 0;

                res.on('data', (chunk) => {
                    buffer += chunk.toString();
                    const lines = buffer.split('\n');
                    buffer = lines.pop() ?? '';

                    for (const line of lines) {
                        if (!line.startsWith('data: ')) continue;
                        try {
                            const data = JSON.parse(line.slice(6));
                            events.push(data);

                            // Log từng event — chunk thì gộp đếm, action events thì log ngay
                            if (data.chunk) {
                                fullText += data.chunk;
                                chunkCount++;
                                // Log mỗi 5 chunk để không flood console
                                if (chunkCount % 5 === 1) {
                                    process.stdout.write(
                                        `\r  ${DIM}[SSE] chunk #${chunkCount}: "${fullText.slice(-40)}..."${RESET}     `
                                    );
                                }
                            } else if (data.done) {
                                process.stdout.write('\n');
                                log(`${DIM}  [SSE] done — tổng ${chunkCount} chunk, ${fullText.length} ký tự${RESET}`);
                            } else if (data.action) {
                                process.stdout.write('\n');
                                log(`${MAGENTA}  [SSE ACTION] ${JSON.stringify(data)}${RESET}`);
                            }
                        } catch {
                            // skip malformed SSE line
                        }
                    }
                });

                res.on('end', () => {
                    process.stdout.write('\n');
                    log(`${DIM}  Stream kết thúc. Tổng events: ${events.length}${RESET}`);
                    resolve({ events, fullText });
                });

                res.on('error', reject);
            }
        );

        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

// ─────────────────────────────────────────────────────────────────
// Assertion helpers
// ─────────────────────────────────────────────────────────────────

/** Kiểm tra stream có event VIRTUAL_CLICK với target đúng không */
function hasVirtualClick(events, expectedTarget = 'btn-apply-header') {
    return events.some(e => e.action === 'VIRTUAL_CLICK' && e.target === expectedTarget);
}

/** Kiểm tra stream có event NAVIGATION đến đúng destination không */
function hasNavigation(events, expectedDest) {
    return events.some(e => e.action === 'NAVIGATION' && e.destination === expectedDest);
}

/** Kiểm tra stream KHÔNG có bất kỳ VIRTUAL_CLICK nào */
function noVirtualClick(events) {
    return !events.some(e => e.action === 'VIRTUAL_CLICK');
}

/** Kiểm tra stream KHÔNG có bất kỳ NAVIGATION nào */
function noNavigation(events) {
    return !events.some(e => e.action === 'NAVIGATION');
}

/** Kiểm tra stream KHÔNG có bất kỳ action event nào (chỉ text) */
function noActionEvents(events) {
    return !events.some(e => e.action && e.action !== undefined);
}

let passed = 0;
let failed = 0;

function assertCondition(label, condition, detail = '') {
    if (condition) {
        log(`${GREEN}  ✅ PASS${RESET} — ${label}`);
        passed++;
    } else {
        log(`${RED}  ❌ FAIL${RESET} — ${label}${detail ? ` | ${detail}` : ''}`);
        failed++;
    }
}

// ─────────────────────────────────────────────────────────────────
// TEST CASES
// ─────────────────────────────────────────────────────────────────

const TESTS = [
    // ── T1: Main case — tiếng Việt, intent apply rõ ràng ──
    {
        id: 'T1',
        desc: 'Main — tiếng Việt: "chuyển đến trang apply" → VIRTUAL_CLICK (không NAVIGATION)',
        lang: 'vi',
        message: 'Hãy dẫn tôi đến trang nộp đơn xin visa ngay bây giờ',
        checks: [
            {
                label: 'Có event VIRTUAL_CLICK với target "btn-apply-header"',
                fn: ({ events }) => hasVirtualClick(events),
                detail: events => `Events nhận được: ${JSON.stringify(events.filter(e => e.action))}`,
            },
            {
                label: 'Không có event NAVIGATION (thay thế bằng VIRTUAL_CLICK)',
                fn: ({ events }) =>
                    !events.some(e => e.action === 'NAVIGATION' && e.destination === '/apply'),
                detail: events => `Navigation events: ${JSON.stringify(events.filter(e => e.action === 'NAVIGATION'))}`,
            },
        ],
    },

    // ── T2: Main case — điều hướng trang khác, KHÔNG phải /apply ──
    {
        id: 'T2',
        desc: 'Main — tiếng Việt: "mở trang liên hệ" → NAVIGATION /contact-us (không VIRTUAL_CLICK)',
        lang: 'vi',
        message: 'Bạn hãy mở trang liên hệ cho tôi ngay bây giờ',
        checks: [
            {
                label: 'Có event NAVIGATION đến /contact-us',
                fn: ({ events }) => hasNavigation(events, '/contact-us'),
                detail: events => `Action events: ${JSON.stringify(events.filter(e => e.action))}`,
            },
            {
                label: 'Không có event VIRTUAL_CLICK (chỉ /apply mới dùng cursor)',
                fn: ({ events }) => noVirtualClick(events),
                detail: events => `Virtual click events: ${JSON.stringify(events.filter(e => e.action === 'VIRTUAL_CLICK'))}`,
            },
        ],
    },

    // ── T3: Main case — tiếng Anh ──
    {
        id: 'T3',
        desc: 'Main — tiếng Anh: "navigate to apply page" → VIRTUAL_CLICK',
        lang: 'en',
        message: 'Please take me directly to the visa application page',
        checks: [
            {
                label: 'Có event VIRTUAL_CLICK với target "btn-apply-header"',
                fn: ({ events }) => hasVirtualClick(events),
                detail: events => `Events nhận được: ${JSON.stringify(events.filter(e => e.action))}`,
            },
            {
                label: 'target đúng là "btn-apply-header"',
                fn: ({ events }) => {
                    const vc = events.find(e => e.action === 'VIRTUAL_CLICK');
                    return vc?.target === 'btn-apply-header';
                },
                detail: events => {
                    const vc = events.find(e => e.action === 'VIRTUAL_CLICK');
                    return `VIRTUAL_CLICK event: ${JSON.stringify(vc)}`;
                },
            },
        ],
    },

    // ── T4: Edge case — câu chào hỏi, không có navigation intent ──
    {
        id: 'T4',
        desc: 'Edge — lời chào "xin chào" → không có action event nào (AI chỉ trả lời text)',
        lang: 'vi',
        message: 'Xin chào bạn, bạn là ai vậy?',
        checks: [
            {
                label: 'Không có VIRTUAL_CLICK (không có navigation intent)',
                fn: ({ events }) => noVirtualClick(events),
                detail: events => `Action events thực tế: ${JSON.stringify(events.filter(e => e.action))}`,
            },
            {
                label: 'Không có NAVIGATION (câu hỏi chung, AI chỉ trả lời)',
                fn: ({ events }) => noNavigation(events),
                detail: events => `Action events thực tế: ${JSON.stringify(events.filter(e => e.action))}`,
            },
            {
                label: 'AI có trả lời text (stream không rỗng)',
                fn: ({ fullText }) => fullText.trim().length > 10,
                detail: ({ fullText }) => `fullText: "${fullText.slice(0, 100)}"`,
            },
        ],
    },

    // ── T5: Edge case — trang check-status (NAVIGATION, không VIRTUAL_CLICK) ──
    {
        id: 'T5',
        desc: 'Edge — "trang kiểm tra trạng thái" → NAVIGATION /check-status (không VIRTUAL_CLICK)',
        lang: 'vi',
        message: 'Cho tôi đến trang kiểm tra trạng thái hồ sơ của mình',
        checks: [
            {
                label: 'Có event NAVIGATION đến /check-status',
                fn: ({ events }) => hasNavigation(events, '/check-status'),
                detail: events => `Action events: ${JSON.stringify(events.filter(e => e.action))}`,
            },
            {
                label: 'Không có VIRTUAL_CLICK (chỉ /apply mới trigger cursor)',
                fn: ({ events }) => noVirtualClick(events),
                detail: events => `Virtual click events: ${JSON.stringify(events.filter(e => e.action === 'VIRTUAL_CLICK'))}`,
            },
        ],
    },
];

// ─────────────────────────────────────────────────────────────────
// RUNNER
// ─────────────────────────────────────────────────────────────────

async function runTests() {
    sep(70, '═');
    log(`${BOLD}${YELLOW}=== E2E TEST: VIRTUAL MOUSE ENGINE (Track B) ===${RESET}`);
    log(`${DIM}Host: ${HOST}:${PORT}  |  SSE endpoint: ${STREAM_PATH}${RESET}`);
    log(`${DIM}Mục tiêu: /apply → VIRTUAL_CLICK | khác → NAVIGATION${RESET}`);
    sep(70, '═');

    for (const tc of TESTS) {
        sep(60);
        log(`${CYAN}${BOLD}[${tc.id}] ${tc.desc}${RESET}`);

        try {
            const sessionId = await createSession(tc.lang);
            const result = await streamMessage(sessionId, tc.message, tc.lang);

            log(`  AI Text (100 ký tự đầu): "${result.fullText.slice(0, 100)}${result.fullText.length > 100 ? '...' : ''}"`);

            // Hiện tổng hợp action events đã nhận
            const actionEvents = result.events.filter(e => e.action);
            if (actionEvents.length > 0) {
                log(`${MAGENTA}  Action events (${actionEvents.length}): ${JSON.stringify(actionEvents)}${RESET}`);
            } else {
                log(`${DIM}  Không có action event nào trong stream.${RESET}`);
            }

            for (const check of tc.checks) {
                // fn nhận cả object { events, fullText }
                const ok = check.fn(result);
                // Lazy eval: chỉ tính detail khi fail, tránh exception khi check pass
                const detail = (!ok && typeof check.detail === 'function')
                    ? check.detail(result.events)
                    : '';
                assertCondition(check.label, ok, detail);
            }
        } catch (err) {
            log(`${RED}  💥 ERROR: ${err.message}${RESET}`);
            // Mỗi check trong test case này bị coi là FAIL
            for (const check of tc.checks) {
                log(`${RED}  ❌ FAIL${RESET} — ${check.label} (lỗi kết nối)`);
                failed++;
            }
        }

        // Rate limit nhẹ giữa các test
        await new Promise(r => setTimeout(r, 500));
    }

    sep(70, '═');
    const total = passed + failed;
    const color = failed === 0 ? GREEN : RED;
    log(`${color}${BOLD}KẾT QUẢ CUỐI: ${passed}/${total} assertion PASS${RESET}`);

    if (failed === 0) {
        log(`${GREEN}${BOLD}✅ TẤT CẢ PASS — Virtual Mouse Engine hoạt động đúng!${RESET}`);
        log(`${GREEN}   /apply → VIRTUAL_CLICK ✓   |   Các trang khác → NAVIGATION ✓${RESET}`);
    } else {
        log(`${RED}${failed} assertion FAIL — xem chi tiết ở trên.${RESET}`);
        log(`${YELLOW}Gợi ý: Gemini có thể không gọi navigate_to_page nếu intent không đủ rõ.${RESET}`);
        log(`${YELLOW}       Thử chạy lại — AI non-deterministic nhưng với câu rõ thì pass ổn định.${RESET}`);
    }

    sep(70, '═');
    process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(e => {
    console.error(`${RED}${BOLD}Fatal: ${e.message}${RESET}`);
    process.exit(1);
});
