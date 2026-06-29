/**
 * E2E Test: Scroll Page Command — lệnh "Cuộn..." THUẦN (không click) (Track B Feature #5)
 *
 * Khác với e2e-virtual-mouse-all-scroll.mjs (scroll LÀ side-effect của click_ui_element),
 * script này verify tool MỚI scroll_page — AI routing đúng action=SCROLL_PAGE, mode, target.
 *
 * Lưu ý: Scroll vật lý thật chỉ kiểm tra được ở TẦNG 2 (Playwright).
 * Script này (TẦNG 1) xác nhận AI routing đúng mode/target — không gọi click.
 *
 * Chạy: node scripts/e2e-scroll-page-command.mjs
 *
 * Cấu trúc:
 *   TB — Top/Bottom (toàn site, không cần target)
 *   EL — Element (cuộn đến 1 section cụ thể, tái sử dụng target click_ui_element)
 *   NG — Negative guard: lệnh có ý click → PHẢI ra VIRTUAL_CLICK, KHÔNG được ra SCROLL_PAGE
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
const BLUE    = '\x1b[34m';
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

async function createSession() {
    const res = await httpPost(JOIN_PATH, { user_name: 'ScrollPageTester', website_language: 'vi' });
    const json = JSON.parse(res.body);
    if (!json.data?.session_id) throw new Error('Không lấy được session_id: ' + res.body);
    return json.data.session_id;
}

function streamMessage(sessionId, message, currentUrl = '/') {
    const lang = /[àáâãèéêìíòóôõùúýăđơưÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚÝĂĐƠƯ]/.test(message) ? 'vi' : 'en';
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

        log(`${BLUE}  → Gửi: "${message}"${RESET}`);

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
                    let err = '';
                    res.on('data', c => (err += c));
                    res.on('end', () => reject(new Error(`HTTP ${res.statusCode}: ${err}`)));
                    return;
                }

                const events = [];
                let buffer = '';
                let fullText = '';
                let chunks = 0;

                res.on('data', (chunk) => {
                    buffer += chunk.toString();
                    const lines = buffer.split('\n');
                    buffer = lines.pop() ?? '';
                    for (const line of lines) {
                        if (!line.startsWith('data: ')) continue;
                        try {
                            const data = JSON.parse(line.slice(6));
                            events.push(data);
                            if (data.chunk) {
                                fullText += data.chunk;
                                chunks++;
                                if (chunks % 5 === 1) process.stdout.write(`\r  ${DIM}[stream] ${chunks} chunks...${RESET}     `);
                            } else if (data.done) {
                                process.stdout.write('\n');
                            } else if (data.action) {
                                process.stdout.write('\n');
                                log(`${MAGENTA}  [SSE ACTION] ${JSON.stringify(data)}${RESET}`);
                            }
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

function assertScrollPage(events, expectedMode, expectedTarget, testId) {
    const sp = events.find(e => e.action === 'SCROLL_PAGE');
    const vc = events.find(e => e.action === 'VIRTUAL_CLICK');

    if (!sp) {
        const allActions = events.filter(e => e.action);
        log(`${RED}  ❌ FAIL${RESET} — Không có SCROLL_PAGE | actions: ${JSON.stringify(allActions)}`);
        failed++;
        failures.push({ id: testId, expected: `mode=${expectedMode} target=${expectedTarget ?? '-'}`, got: 'NO SCROLL_PAGE' });
        return;
    }
    if (vc) {
        log(`${RED}  ❌ FAIL${RESET} — Lệnh cuộn thuần nhưng AI lại trả VIRTUAL_CLICK (lẫn click): ${JSON.stringify(vc)}`);
        failed++;
        failures.push({ id: testId, expected: `mode=${expectedMode}`, got: `VIRTUAL_CLICK:${vc.target}` });
        return;
    }
    const modeOk = sp.mode === expectedMode;
    const targetOk = expectedTarget ? sp.target === expectedTarget : true;
    if (modeOk && targetOk) {
        log(`${GREEN}  ✅ PASS${RESET} — SCROLL_PAGE mode="${sp.mode}"${sp.target ? ` target="${sp.target}"` : ''}`);
        passed++;
    } else {
        log(`${RED}  ❌ FAIL${RESET} — got mode="${sp.mode}" target="${sp.target ?? '-'}" | expected mode="${expectedMode}" target="${expectedTarget ?? '-'}"`);
        failed++;
        failures.push({ id: testId, expected: `mode=${expectedMode} target=${expectedTarget ?? '-'}`, got: `mode=${sp.mode} target=${sp.target ?? '-'}` });
    }
}

function assertVirtualClickOnly(events, expectedTarget, testId) {
    const sp = events.find(e => e.action === 'SCROLL_PAGE');
    const vc = events.find(e => e.action === 'VIRTUAL_CLICK');
    if (sp) {
        log(`${RED}  ❌ FAIL${RESET} — Lệnh có ý click nhưng AI lại trả SCROLL_PAGE: ${JSON.stringify(sp)}`);
        failed++;
        failures.push({ id: testId, expected: `VIRTUAL_CLICK:${expectedTarget}`, got: `SCROLL_PAGE:${sp.mode}` });
        return;
    }
    if (!vc || vc.target !== expectedTarget) {
        log(`${RED}  ❌ FAIL${RESET} — got: ${vc ? `VIRTUAL_CLICK:${vc.target}` : 'NO ACTION'} | expected: VIRTUAL_CLICK:${expectedTarget}`);
        failed++;
        failures.push({ id: testId, expected: `VIRTUAL_CLICK:${expectedTarget}`, got: vc ? `VIRTUAL_CLICK:${vc.target}` : 'NO ACTION' });
        return;
    }
    log(`${GREEN}  ✅ PASS${RESET} — VIRTUAL_CLICK target="${expectedTarget}" (guard: không lẫn scroll command)`);
    passed++;
}

// ─────────────────────────────────────────────────────────────────
// TEST CASES
// ─────────────────────────────────────────────────────────────────

const TESTS = [
    // ══════════════════════════════════════════════════════════════
    // TB — TOP/BOTTOM: cuộn đầu/cuối trang, áp dụng mọi route
    // ══════════════════════════════════════════════════════════════
    { id: 'TB01', mode: 'bottom', desc: 'Cuộn xuống cuối trang — canonical', message: 'Cuộn xuống cuối trang giúp tôi', currentUrl: '/' },
    { id: 'TB02', mode: 'top',    desc: 'Cuộn lên đầu trang — canonical',  message: 'Cuộn lên đầu trang',          currentUrl: '/' },
    { id: 'TB03', mode: 'bottom', desc: 'Biến thể "kéo xuống cuối"',       message: 'kéo xuống cuối trang đi',     currentUrl: '/apply' },
    { id: 'TB04', mode: 'top',    desc: 'Biến thể EN "scroll to the top"', message: 'scroll to the top of the page', currentUrl: '/contact-us' },
    { id: 'TB05', mode: 'bottom', desc: 'Biến thể EN "scroll down to the bottom"', message: 'scroll down to the bottom of the page', currentUrl: '/faqs' },
    { id: 'TB06', mode: 'top',    desc: 'Áp dụng route con /check-status', message: 'cuộn lên đầu trang này',      currentUrl: '/check-status' },
    { id: 'TB07', mode: 'bottom', desc: 'Biến thể ngắn "xuống cuối"',      message: 'xuống cuối trang luôn',       currentUrl: '/how-to-apply' },

    // ══════════════════════════════════════════════════════════════
    // EL — ELEMENT: cuộn đến 1 section cụ thể (đứng tại trang hiện tại)
    // ══════════════════════════════════════════════════════════════
    { id: 'EL01', mode: 'element', target: 'hero_apply',       desc: 'Cuộn đến phần Apply Now hero', message: 'Cuộn đến phần nút Apply Now to ở giữa trang chủ, không cần bấm',  currentUrl: '/' },
    { id: 'EL02', mode: 'element', target: 'cta_check_status', desc: 'Cuộn đến phần CTA Check Status', message: 'Cuộn đến phần Check Status ở cuối trang, mình chỉ muốn xem thôi', currentUrl: '/' },
    { id: 'EL03', mode: 'element', target: 'check_status_submit', desc: 'Cuộn đến form Check Status', message: 'Cuộn đến phần form tra cứu trạng thái hồ sơ',                    currentUrl: '/check-status' },

    // ══════════════════════════════════════════════════════════════
    // NG — NEGATIVE GUARD: lệnh có ý click → PHẢI VIRTUAL_CLICK, không SCROLL_PAGE
    // ══════════════════════════════════════════════════════════════
    { id: 'NG01', target: 'cta_apply', isClick: true, desc: 'Có "cuối trang" nhưng kèm "bấm" → vẫn phải click', message: 'Bấm nút Apply Now ở phần CTA cuối trang chủ', currentUrl: '/' },
];

// ─────────────────────────────────────────────────────────────────
// RUNNER
// ─────────────────────────────────────────────────────────────────

async function runTests() {
    sep(70, '═');
    log(`${BOLD}${YELLOW}=== E2E TEST: SCROLL PAGE COMMAND (lệnh "Cuộn..." thuần) ===${RESET}`);
    log(`${DIM}Track B Feature #5 — scroll_page tool (API routing layer)${RESET}`);
    log(`${DIM}TB=top/bottom toàn site, EL=element/section, NG=negative guard${RESET}`);
    log(`${DIM}Số test cases: ${TESTS.length}${RESET}`);
    sep(70, '═');

    for (const tc of TESTS) {
        sep(60);
        log(`${CYAN}${BOLD}[${tc.id}] ${tc.desc}${RESET}`);
        if (tc.isClick) {
            log(`${DIM}  expect: VIRTUAL_CLICK target="${tc.target}" | url: ${tc.currentUrl}${RESET}`);
        } else {
            log(`${DIM}  expect: SCROLL_PAGE mode="${tc.mode}"${tc.target ? ` target="${tc.target}"` : ''} | url: ${tc.currentUrl}${RESET}`);
        }

        try {
            const sid = await createSession();
            const result = await streamMessage(sid, tc.message, tc.currentUrl);
            log(`  AI reply: "${result.fullText.slice(0, 80)}${result.fullText.length > 80 ? '...' : ''}"`);
            if (tc.isClick) {
                assertVirtualClickOnly(result.events, tc.target, tc.id);
            } else {
                assertScrollPage(result.events, tc.mode, tc.target, tc.id);
            }
        } catch (err) {
            log(`${RED}  💥 ERROR: ${err.message}${RESET}`);
            failed++;
            failures.push({ id: tc.id, expected: tc.mode ?? tc.target, got: 'ERROR: ' + err.message });
        }

        await new Promise(r => setTimeout(r, 300));
    }

    sep(70, '═');
    const total = passed + failed;
    const color = failed === 0 ? GREEN : RED;
    log(`${color}${BOLD}KẾT QUẢ: ${passed}/${total} PASS${RESET}`);

    if (failures.length > 0) {
        sep(40);
        log(`${RED}${BOLD}CHI TIẾT THẤT BẠI:${RESET}`);
        for (const f of failures) {
            log(`  ${RED}[${f.id}]${RESET} expected="${f.expected}" | got="${f.got}"`);
        }
    }

    if (failed === 0) {
        log(`${GREEN}${BOLD}✅ TẤT CẢ PASS — Scroll Page routing đúng cho mọi mode/target!${RESET}`);
    }

    sep(70, '═');
    process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(e => {
    console.error(`${RED}${BOLD}Fatal: ${e.message}${RESET}`);
    process.exit(1);
});
