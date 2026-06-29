/**
 * E2E Test: Virtual Mouse — SCROLL TO ELEMENT (Track B Feature #4)
 *
 * Xác nhận rằng AI chọn đúng target cho các phần tử nằm dưới/trên fold,
 * và các phần tử trong viewport vẫn hoạt động bình thường (guard).
 *
 * Lưu ý: Scroll vật lý chỉ kiểm tra được ở TẦNG 2 (Playwright).
 * Script này (TẦNG 1) xác nhận AI routing đúng target.
 *
 * Chạy: node scripts/e2e-virtual-mouse-all-scroll.mjs
 *
 * Cấu trúc:
 *   SC — Scroll Case (canonical, below fold)
 *   SV — Scroll Variant (biến thể cách nói)
 *   SG — Scroll Guard (in-viewport, no scroll needed)
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
    const res = await httpPost(JOIN_PATH, { user_name: 'ScrollTester', website_language: 'vi' });
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

function assertVirtualClick(events, expectedTarget, testId) {
    const vc  = events.find(e => e.action === 'VIRTUAL_CLICK');
    const ok  = vc?.target === expectedTarget;
    if (!vc) {
        const allActions = events.filter(e => e.action);
        log(`${RED}  ❌ FAIL${RESET} — Không có VIRTUAL_CLICK | actions: ${JSON.stringify(allActions)}`);
        failed++;
        failures.push({ id: testId, expected: expectedTarget, got: 'NO VIRTUAL_CLICK' });
    } else if (!ok) {
        log(`${RED}  ❌ FAIL${RESET} — VIRTUAL_CLICK sai target | got: "${vc.target}" | expected: "${expectedTarget}"`);
        failed++;
        failures.push({ id: testId, expected: expectedTarget, got: vc.target });
    } else {
        const layer = vc.intent ? `NLP Cache` : `Gemini`;
        log(`${GREEN}  ✅ PASS${RESET} — VIRTUAL_CLICK target="${expectedTarget}" [${layer}]`);
        passed++;
    }
}

// ─────────────────────────────────────────────────────────────────
// TEST CASES
// ─────────────────────────────────────────────────────────────────

const TESTS = [

    // ══════════════════════════════════════════════════════════════
    // SC — SCROLL CASE: phần tử dưới fold (below viewport)
    // ══════════════════════════════════════════════════════════════

    {
        id: 'SC01', target: 'cta_apply',
        desc: 'Apply CTA cuối trang — canonical message',
        message: 'Bấm nút Apply Now ở phần CTA cuối trang chủ',
        currentUrl: '/',
    },
    {
        id: 'SC02', target: 'cta_check_status',
        desc: 'Check Status CTA cuối trang — canonical message',
        message: 'Nhấn nút Check Status ở phần cuối trang (CTA section)',
        currentUrl: '/',
    },

    // ══════════════════════════════════════════════════════════════
    // SV — SCROLL VARIANT: biến thể cách diễn đạt cho cùng target
    // ══════════════════════════════════════════════════════════════

    {
        id: 'SV01', target: 'cta_apply',
        desc: 'cta_apply — VI ngắn "cuối trang"',
        message: 'bấm apply ở cuối trang',
        currentUrl: '/',
    },
    {
        id: 'SV02', target: 'cta_apply',
        desc: 'cta_apply — VI "phần dưới cùng"',
        message: 'click vào nút đăng ký ở phần dưới cùng trang chủ',
        currentUrl: '/',
    },
    {
        id: 'SV03', target: 'cta_apply',
        desc: 'cta_apply — EN "bottom of the page"',
        message: 'click apply now at the bottom of the page',
        currentUrl: '/',
    },
    {
        id: 'SV04', target: 'cta_apply',
        desc: 'cta_apply — VI ngắn phong cách khác "phía cuối"',
        message: 'nhấn apply phía cuối trang',
        currentUrl: '/',
    },
    {
        id: 'SV05', target: 'cta_check_status',
        desc: 'cta_check_status — VI ngắn "dưới cùng"',
        message: 'ấn kiểm tra trạng thái ở dưới cùng',
        currentUrl: '/',
    },
    {
        id: 'SV06', target: 'cta_check_status',
        desc: 'cta_check_status — VI đầy đủ với "CTA section"',
        message: 'bấm nút check status ở khu vực CTA section phía cuối trang',
        currentUrl: '/',
    },
    {
        id: 'SV07', target: 'cta_check_status',
        desc: 'cta_check_status — EN "bottom of page"',
        message: 'hit check status button at the bottom of the page',
        currentUrl: '/',
    },

    // ══════════════════════════════════════════════════════════════
    // SG — SCROLL GUARD: phần tử đã trong viewport (không cần scroll)
    // Kiểm tra không bị ảnh hưởng bởi scroll feature mới
    // ══════════════════════════════════════════════════════════════

    {
        id: 'SG01', target: 'hero_apply',
        desc: 'hero_apply — in viewport, no scroll needed',
        message: 'Bấm nút Apply Now to lớn ở giữa trang chủ cho tôi',
        currentUrl: '/',
    },
    {
        id: 'SG02', target: 'hero_check_status',
        desc: 'hero_check_status — in viewport, no scroll needed',
        message: 'Nhấn nút Check Status ngay trong phần hero ở trang chủ',
        currentUrl: '/',
    },
    {
        id: 'SG03', target: 'btn-apply-header',
        desc: 'btn-apply-header — sticky header, no scroll needed',
        message: 'Bấm nút Apply Now trên thanh điều hướng header ở trên cùng',
        currentUrl: '/',
    },
];

// ─────────────────────────────────────────────────────────────────
// RUNNER
// ─────────────────────────────────────────────────────────────────

async function runTests() {
    sep(70, '═');
    log(`${BOLD}${YELLOW}=== E2E SCROLL TEST: VIRTUAL MOUSE — SCROLL TO ELEMENT ===${RESET}`);
    log(`${DIM}Track B Feature #4 — scroll+click pipeline (API routing layer)${RESET}`);
    log(`${DIM}SC=canonical, SV=biến thể, SG=guard (in-viewport)${RESET}`);
    log(`${DIM}Số test cases: ${TESTS.length}${RESET}`);
    sep(70, '═');

    for (const tc of TESTS) {
        sep(60);
        log(`${CYAN}${BOLD}[${tc.id}] ${tc.desc}${RESET}`);
        log(`${DIM}  target: "${tc.target}" | url: ${tc.currentUrl}${RESET}`);

        try {
            const sid = await createSession();
            const result = await streamMessage(sid, tc.message, tc.currentUrl);
            log(`  AI reply: "${result.fullText.slice(0, 80)}${result.fullText.length > 80 ? '...' : ''}"`);
            assertVirtualClick(result.events, tc.target, tc.id);
        } catch (err) {
            log(`${RED}  💥 ERROR: ${err.message}${RESET}`);
            failed++;
            failures.push({ id: tc.id, expected: tc.target, got: 'ERROR: ' + err.message });
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
        log(`${GREEN}${BOLD}✅ TẤT CẢ PASS — Scroll routing đúng cho mọi target!${RESET}`);
    }

    sep(70, '═');
    process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(e => {
    console.error(`${RED}${BOLD}Fatal: ${e.message}${RESET}`);
    process.exit(1);
});
