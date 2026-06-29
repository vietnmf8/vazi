/**
 * E2E Test: Scroll Section — COMBO Navigate+Scroll coverage (2026-06-22)
 *
 * Mục tiêu: Xác nhận tool scroll_page tự quyết định đúng giữa 2 nhánh:
 *   - SCROLL_PAGE_TRIGGERED         → SSE { action: "SCROLL_PAGE", mode:"element", target }     (cùng trang)
 *   - NAVIGATE_AND_SCROLL_TRIGGERED → SSE { action: "NAVIGATE_AND_SCROLL", destination, target } (khác trang)
 *
 * Đồng thời verify FLEX routing: 2 khái niệm có cả preview trên Home VÀ trang chi tiết riêng
 * (quy trình thực hiện ↔ /how-to-apply, bảng giá ↔ /guide/vietnam-visa-fees) phải đi đúng
 * tool/route mà system prompt của scroll_page hướng dẫn — không combo-scroll quay lại Home
 * khi có trang chi tiết phù hợp hơn.
 *
 * Tầng 1 (file này) CHỈ verify được phần backend: tool có chọn đúng action/destination/target
 * không — KHÔNG verify được hành vi scroll thật (đó là DOM/client, xem Playwright Tầng 2).
 *
 * Chạy: node scripts/e2e-scroll-section-combo.mjs
 *
 * Lưu ý: AI là non-deterministic. Nếu 1 test fail, thử chạy lại 1-2 lần trước khi nghi ngờ code.
 */

import http from 'http';

const HOST        = '127.0.0.1';
const PORT        = 5000;
const JOIN_PATH   = '/api/v1/chat/join';
const STREAM_PATH = '/api/v1/chat/message/stream';

const GREEN   = '\x1b[32m';
const RED     = '\x1b[31m';
const YELLOW  = '\x1b[33m';
const CYAN    = '\x1b[36m';
const MAGENTA = '\x1b[35m';
const DIM     = '\x1b[2m';
const RESET   = '\x1b[0m';
const BOLD    = '\x1b[1m';

const ts  = () => new Date().toISOString().slice(11, 23);
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
    const res = await httpPost(JOIN_PATH, { user_name: 'ScrollComboTester', website_language: lang });
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
                            if (data.action) {
                                log(`${MAGENTA}  [SSE ACTION] ${JSON.stringify(data)}${RESET}`);
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

// ─────────────────────────────────────────────────────────────────
// Assertions
// ─────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const failures = [];

function fail(testId, reason, allActions) {
    log(`${RED}  ❌ FAIL${RESET} — ${reason}`);
    failed++;
    failures.push({ id: testId, reason, allActions });
}

function pass(testId, reason) {
    log(`${GREEN}  ✅ PASS${RESET} — ${reason}`);
    passed++;
}

/** Cùng trang — phải thấy SCROLL_PAGE mode=element target=X, KHÔNG có NAVIGATE_AND_SCROLL. */
function assertSamePageScroll(events, expectedTarget, testId) {
    const allActions = events.filter(e => e.action);
    const navAndScroll = allActions.find(e => e.action === 'NAVIGATE_AND_SCROLL');
    const scroll = allActions.find(e => e.action === 'SCROLL_PAGE' && e.mode === 'element');

    if (navAndScroll) {
        return fail(testId, `Lẽ ra cùng trang nhưng tool lại NAVIGATE_AND_SCROLL đến "${navAndScroll.destination}" — sai logic same-page detection`, allActions);
    }
    if (!scroll) {
        return fail(testId, `Không có SCROLL_PAGE mode=element trong stream | actions: ${JSON.stringify(allActions)}`, allActions);
    }
    if (scroll.target !== expectedTarget) {
        return fail(testId, `SCROLL_PAGE sai target | got: "${scroll.target}" | expected: "${expectedTarget}"`, allActions);
    }
    pass(testId, `SCROLL_PAGE target="${expectedTarget}" (cùng trang, đúng như kỳ vọng)`);
}

/** Khác trang — phải thấy NAVIGATE_AND_SCROLL với đúng destination + target. */
function assertCombo(events, expectedDestination, expectedTarget, testId) {
    const allActions = events.filter(e => e.action);
    const combo = allActions.find(e => e.action === 'NAVIGATE_AND_SCROLL');

    if (!combo) {
        return fail(testId, `Không có NAVIGATE_AND_SCROLL trong stream | actions: ${JSON.stringify(allActions)}`, allActions);
    }
    if (combo.destination !== expectedDestination) {
        return fail(testId, `Sai destination | got: "${combo.destination}" | expected: "${expectedDestination}"`, allActions);
    }
    if (combo.target !== expectedTarget) {
        return fail(testId, `Sai target | got: "${combo.target}" | expected: "${expectedTarget}"`, allActions);
    }
    pass(testId, `NAVIGATE_AND_SCROLL destination="${expectedDestination}" target="${expectedTarget}"`);
}

/** FLEX — kỳ vọng Gemini chọn navigate_to_page thay vì combo scroll (trang chi tiết ưu tiên hơn preview Home). */
function assertPlainNavigate(events, expectedDestination, testId) {
    const allActions = events.filter(e => e.action);
    const nav = allActions.find(e => e.action === 'NAVIGATION');
    const navAndScroll = allActions.find(e => e.action === 'NAVIGATE_AND_SCROLL');

    if (navAndScroll) {
        return fail(testId, `Kỳ vọng navigate_to_page đơn thuần tới "${expectedDestination}" nhưng lại combo scroll về "${navAndScroll.destination}" — FLEX routing sai`, allActions);
    }
    if (!nav) {
        return fail(testId, `Không có NAVIGATION trong stream | actions: ${JSON.stringify(allActions)}`, allActions);
    }
    if (nav.destination !== expectedDestination) {
        return fail(testId, `Sai destination | got: "${nav.destination}" | expected: "${expectedDestination}"`, allActions);
    }
    pass(testId, `NAVIGATION destination="${expectedDestination}" (FLEX routing đúng, không combo về Home)`);
}

// ─────────────────────────────────────────────────────────────────
// TEST CASES
// ─────────────────────────────────────────────────────────────────

const TEST_CASES = [
    // ── Same-page tại trang sở hữu section ───────────────────────
    { id: 'S01-same-pricing-voa', kind: 'same', target: 'pricing_voa', currentUrl: '/guide/vietnam-visa-fees',
      desc: 'Cùng trang /guide/vietnam-visa-fees, hỏi bảng giá VOA → scroll target pricing_voa',
      message: 'Cho tôi xem bảng giá VOA' },
    { id: 'S02-same-pricing-evisa', kind: 'same', target: 'pricing_evisa', currentUrl: '/guide/vietnam-visa-fees',
      desc: 'Cùng trang /guide/vietnam-visa-fees, hỏi bảng giá E-Visa → scroll target pricing_evisa',
      message: 'Tôi muốn xem bảng giá E-Visa' },
    { id: 'S03-same-how-it-works-home', kind: 'same', target: 'how_it_works', currentUrl: '/',
      desc: 'Đang ở Home, hỏi quy trình thực hiện → scroll target how_it_works (không navigate)',
      message: 'Tôi muốn xem quy trình thực hiện' },
    { id: 'S04-same-about-team', kind: 'same', target: 'about_team', currentUrl: '/about-us',
      desc: 'Đang ở /about-us, hỏi về đội ngũ → scroll target about_team',
      message: 'Cho tôi xem đội ngũ của các bạn' },
    { id: 'S05-same-faqs-list', kind: 'same', target: 'faqs_list', currentUrl: '/faqs',
      desc: 'Đang ở /faqs, hỏi xem danh sách câu hỏi → scroll target faqs_list',
      message: 'Cuộn xuống danh sách câu hỏi thường gặp' },

    // ── Combo: khác trang, cần navigate + scroll ─────────────────
    { id: 'C01-combo-pricing-voa', kind: 'combo', target: 'pricing_voa', destination: '/guide/vietnam-visa-fees', currentUrl: '/',
      desc: 'Đang ở Home, hỏi bảng giá VOA → combo NAVIGATE_AND_SCROLL sang /guide/vietnam-visa-fees',
      message: 'Cho tôi xem bảng giá VOA' },
    { id: 'C02-combo-pricing-evisa', kind: 'combo', target: 'pricing_evisa', destination: '/guide/vietnam-visa-fees', currentUrl: '/faqs',
      desc: 'Đang ở /faqs, hỏi bảng giá E-Visa → combo sang /guide/vietnam-visa-fees',
      message: 'Tôi muốn xem bảng giá E-Visa' },
    { id: 'C03-combo-about-team', kind: 'combo', target: 'about_team', destination: '/about-us', currentUrl: '/contact-us',
      desc: 'Đang ở /contact-us, hỏi đội ngũ FastVisa → combo sang /about-us',
      message: 'Cho tôi xem đội ngũ của FastVisa' },
    { id: 'C04-combo-emergency-pricing', kind: 'combo', target: 'emergency_pricing', destination: '/emergency-inquiry', currentUrl: '/',
      desc: 'Đang ở Home, hỏi bảng giá làm khẩn cấp → combo sang /emergency-inquiry',
      message: 'Cho tôi xem bảng giá làm visa khẩn cấp' },
    { id: 'C05-combo-how-to-apply-documents', kind: 'combo', target: 'how_to_apply_documents', destination: '/how-to-apply', currentUrl: '/about-us',
      desc: 'Đang ở /about-us, hỏi tài liệu cần chuẩn bị → combo sang /how-to-apply',
      message: 'Tôi cần xem danh sách tài liệu bắt buộc khi nộp hồ sơ' },

    // ── FLEX routing: ưu tiên trang chi tiết hơn combo-scroll về Home ──
    { id: 'F01-flex-how-it-works-elsewhere', kind: 'flex-nav', destination: '/how-to-apply', currentUrl: '/about-us',
      desc: 'Đang ở /about-us (không phải Home), hỏi quy trình thực hiện → navigate_to_page(/how-to-apply), KHÔNG combo về Home',
      message: 'Tôi muốn xem quy trình thực hiện' },
];

// ─────────────────────────────────────────────────────────────────
// RUNNER
// ─────────────────────────────────────────────────────────────────

async function runOne(tc) {
    sep(60);
    log(`${CYAN}${BOLD}[${tc.id}] ${tc.desc}${RESET}`);
    try {
        const sessionId = await createSession('vi');
        const result = await streamMessage(sessionId, tc.message, { lang: 'vi', currentUrl: tc.currentUrl });
        log(`  AI reply (80 ký tự đầu): "${result.fullText.slice(0, 80)}${result.fullText.length > 80 ? '...' : ''}"`);

        if (tc.kind === 'same') {
            assertSamePageScroll(result.events, tc.target, tc.id);
        } else if (tc.kind === 'combo') {
            assertCombo(result.events, tc.destination, tc.target, tc.id);
        } else if (tc.kind === 'flex-nav') {
            assertPlainNavigate(result.events, tc.destination, tc.id);
        }
    } catch (err) {
        log(`${RED}  💥 ERROR: ${err.message}${RESET}`);
        failed++;
        failures.push({ id: tc.id, reason: 'ERROR: ' + err.message });
    }
    await new Promise(r => setTimeout(r, 300)); // tránh rate-limit
}

async function runTests() {
    sep(70, '═');
    log(`${BOLD}${YELLOW}=== E2E TEST: SCROLL SECTION — COMBO NAVIGATE+SCROLL (Universal Section Scroll) ===${RESET}`);
    log(`${DIM}Host: ${HOST}:${PORT}  |  Endpoint: POST ${STREAM_PATH}${RESET}`);
    log(`${DIM}${TEST_CASES.length} test case (same-page / combo / FLEX routing)${RESET}`);
    sep(70, '═');

    for (const tc of TEST_CASES) {
        await runOne(tc);
    }

    sep(70, '═');
    const total = passed + failed;
    const color = failed === 0 ? GREEN : RED;
    log(`${color}${BOLD}KẾT QUẢ: ${passed}/${total} PASS${RESET}`);

    if (failures.length > 0) {
        sep(40, '─');
        log(`${RED}${BOLD}CHI TIẾT THẤT BẠI:${RESET}`);
        for (const f of failures) {
            log(`  ${RED}[${f.id}]${RESET} ${f.reason}`);
            if (f.allActions?.length) log(`  ${DIM}     actions: ${JSON.stringify(f.allActions)}${RESET}`);
        }
    } else {
        log(`${GREEN}${BOLD}✅ TẤT CẢ PASS — combo navigate+scroll hoạt động đúng cho mọi case!${RESET}`);
    }

    sep(70, '═');
    process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(e => {
    console.error(`${RED}${BOLD}Fatal: ${e.message}${RESET}`);
    process.exit(1);
});
