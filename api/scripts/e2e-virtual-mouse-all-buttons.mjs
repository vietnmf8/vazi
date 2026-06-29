/**
 * E2E Test: Virtual Mouse — ALL BUTTONS coverage (Track B)
 *
 * Mục tiêu: Xác nhận rằng với mỗi tin nhắn thật của user trong Live Chat,
 * AI sẽ gọi đúng tool click_ui_element với target chính xác, và backend
 * gửi SSE event { action: "VIRTUAL_CLICK", target: "<expected>" }.
 *
 * Đây là test END-TO-END thực sự:
 *   User message → API → Gemini AI → click_ui_element tool → ELEMENT_CLICK_TRIGGERED
 *   → gemini.service.ts → SSE { action: "VIRTUAL_CLICK", target } → Frontend cursor
 *
 * Chạy: node scripts/e2e-virtual-mouse-all-buttons.mjs
 *
 * Lưu ý: AI là non-deterministic. Nếu 1 test fail, thử chạy lại.
 * Câu hỏi được thiết kế RÕ RÀNG để AI chọn đúng target với xác suất cao.
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
    return json.data.session_id;
}

/**
 * Gửi message qua SSE streaming và thu thập tất cả events.
 * currentUrl cho AI biết user đang ở trang nào để chọn đúng target.
 */
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
                            if (data.chunk) {
                                fullText += data.chunk;
                                chunkCount++;
                                if (chunkCount % 5 === 1) {
                                    process.stdout.write(
                                        `\r  ${DIM}[stream] ${chunkCount} chunks...${RESET}     `
                                    );
                                }
                            } else if (data.done) {
                                process.stdout.write('\n');
                            } else if (data.action) {
                                process.stdout.write('\n');
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

function assertVirtualClick(events, expectedTarget, testId) {
    const vc = events.find(e => e.action === 'VIRTUAL_CLICK');
    const hasAny = !!vc;
    const hasCorrect = vc?.target === expectedTarget;
    const allActions = events.filter(e => e.action);

    if (!hasAny) {
        log(`${RED}  ❌ FAIL${RESET} — Không có VIRTUAL_CLICK trong stream | actions: ${JSON.stringify(allActions)}`);
        failed++;
        failures.push({ id: testId, expected: expectedTarget, got: 'NO VIRTUAL_CLICK', allActions });
    } else if (!hasCorrect) {
        log(`${RED}  ❌ FAIL${RESET} — VIRTUAL_CLICK sai target | got: "${vc.target}" | expected: "${expectedTarget}"`);
        failed++;
        failures.push({ id: testId, expected: expectedTarget, got: vc.target, allActions });
    } else {
        log(`${GREEN}  ✅ PASS${RESET} — VIRTUAL_CLICK target="${expectedTarget}"`);
        passed++;
    }
}

// ─────────────────────────────────────────────────────────────────
// TEST CASES — 17 buttons, mỗi case 1 tin nhắn rõ ràng
// currentUrl cho AI biết context để chọn đúng target trên đúng trang
// ─────────────────────────────────────────────────────────────────

const TESTS = [
    // ══ TRANG CHỦ ══
    {
        id: 'B01', target: 'hero_apply',
        desc: 'Nút Apply Now lớn giữa Hero (trang chủ)',
        message: 'Bấm nút Apply Now to lớn ở giữa trang chủ cho tôi',
        currentUrl: '/',
    },
    {
        id: 'B02', target: 'hero_check_status',
        desc: 'Nút Check Status trong Hero section (trang chủ)',
        message: 'Nhấn nút Check Status ngay trong phần hero ở trang chủ',
        currentUrl: '/',
    },
    {
        id: 'B03', target: 'btn-apply-header',
        desc: 'Nút Apply Now trên thanh header (luôn hiển thị)',
        message: 'Bấm nút Apply Now trên thanh điều hướng header ở trên cùng',
        currentUrl: '/',
    },
    {
        id: 'B04', target: 'header_check_status',
        desc: 'Link Check Status trên header',
        message: 'Click vào link Check Status trên thanh header',
        currentUrl: '/',
    },
    {
        id: 'B05', target: 'lang-selector',
        desc: 'Nút chọn ngôn ngữ trên header',
        message: 'Nhấn nút chọn ngôn ngữ trên header để đổi sang tiếng Anh',
        currentUrl: '/',
    },
    {
        id: 'B06', target: 'chat-toggle',
        desc: 'Nút mở/đóng widget Chat',
        message: 'Đóng widget chat này lại',
        currentUrl: '/',
    },
    {
        id: 'B07', target: 'cta_apply',
        desc: 'Nút Apply Now ở CTA section cuối trang',
        message: 'Bấm nút Apply Now ở phần CTA cuối trang chủ',
        currentUrl: '/',
    },
    {
        id: 'B08', target: 'cta_check_status',
        desc: 'Nút Check Status ở CTA section cuối trang',
        message: 'Nhấn nút Check Status ở phần cuối trang (CTA section)',
        currentUrl: '/',
    },
    {
        id: 'B09', target: 'continue_to_apply',
        desc: 'Nút Continue to Apply trong Quick Apply Form',
        message: 'Bấm nút Continue to Apply để tiến vào form đăng ký',
        currentUrl: '/',
    },

    // ══ HOW TO APPLY ══
    {
        id: 'B10', target: 'how_to_apply_start',
        desc: 'Nút Start Application trên trang /how-to-apply',
        message: 'Nhấn nút màu cam ở trang hướng dẫn visa',
        currentUrl: '/how-to-apply',
    },

    // ══ CHECK STATUS ══
    {
        id: 'B11', target: 'check_status_submit',
        desc: 'Nút Submit trong form Check Status',
        message: 'Nhấn nút Submit màu xanh trong form check status giúp tôi',
        currentUrl: '/check-status',
    },

    // ══ CONTACT US ══
    {
        id: 'B12', target: 'contact_submit',
        desc: 'Nút Send gửi form liên hệ',
        message: 'Nhấn nút Send để gửi form liên hệ',
        currentUrl: '/contact-us',
    },

    // ══ EMERGENCY INQUIRY ══
    {
        id: 'B13', target: 'emergency_submit',
        desc: 'Nút Submit form yêu cầu khẩn cấp',
        message: 'Bấm Submit để gửi form yêu cầu khẩn cấp',
        currentUrl: '/emergency-inquiry',
    },
    {
        id: 'B14', target: 'emergency_correction_whatsapp',
        desc: 'Nút WhatsApp sửa hồ sơ trong Emergency page',
        message: 'Bấm nút WhatsApp màu xanh lá để sửa thông tin hồ sơ',
        currentUrl: '/emergency-inquiry',
    },

    // ══ FAQS ══
    {
        id: 'B15', target: 'faqs_submit_question',
        desc: 'Nút Submit gửi câu hỏi trong /faqs',
        message: 'Click nút Submit Question trong trang FAQs để gửi câu hỏi',
        currentUrl: '/faqs',
    },

    // ══ APPLY FLOW ══
    {
        id: 'B16', target: 'next_step2',
        desc: 'Nút Next chuyển từ bước 1 → bước 2 trong /apply',
        message: 'Nhấn Next để chuyển sang bước 2 trong form nộp đơn',
        currentUrl: '/apply',
    },

    // ══ MOBILE ══
    {
        id: 'B17', target: 'header_mobile_menu',
        desc: 'Nút hamburger mở menu trên điện thoại',
        message: 'Mở menu hamburger trên điện thoại',
        currentUrl: '/',
    },
];

// ─────────────────────────────────────────────────────────────────
// RUNNER
// ─────────────────────────────────────────────────────────────────

async function runTests() {
    sep(70, '═');
    log(`${BOLD}${YELLOW}=== E2E TEST: VIRTUAL MOUSE — ALL BUTTONS COVERAGE ===${RESET}`);
    log(`${DIM}Host: ${HOST}:${PORT}  |  Endpoint: POST ${STREAM_PATH}${RESET}`);
    log(`${DIM}Pipeline: user message → Gemini AI → click_ui_element → SSE VIRTUAL_CLICK${RESET}`);
    log(`${DIM}Số test cases: ${TESTS.length} (mỗi case = 1 button)${RESET}`);
    sep(70, '═');

    for (const tc of TESTS) {
        sep(60);
        log(`${CYAN}${BOLD}[${tc.id}] ${tc.desc}${RESET}`);
        log(`${DIM}  target mong đợi: "${tc.target}" | context URL: ${tc.currentUrl}${RESET}`);

        try {
            const sessionId = await createSession('vi');
            const result = await streamMessage(sessionId, tc.message, {
                lang: 'vi',
                currentUrl: tc.currentUrl,
            });

            log(`  AI reply (80 ký tự đầu): "${result.fullText.slice(0, 80)}${result.fullText.length > 80 ? '...' : ''}"`);

            assertVirtualClick(result.events, tc.target, tc.id);
        } catch (err) {
            log(`${RED}  💥 ERROR: ${err.message}${RESET}`);
            failed++;
            failures.push({ id: tc.id, expected: tc.target, got: 'ERROR: ' + err.message });
        }

        // Tránh rate limit (max 10 messages/60s per session — mỗi test dùng session mới nên an toàn)
        await new Promise(r => setTimeout(r, 300));
    }

    // ── Tổng kết ──
    sep(70, '═');
    const total = passed + failed;
    const color = failed === 0 ? GREEN : RED;
    log(`${color}${BOLD}KẾT QUẢ: ${passed}/${total} PASS${RESET}`);

    if (failures.length > 0) {
        sep(40, '─');
        log(`${RED}${BOLD}CHI TIẾT THẤT BẠI:${RESET}`);
        for (const f of failures) {
            log(`  ${RED}[${f.id}]${RESET} expected="${f.expected}" | got="${f.got}"`);
            if (f.allActions?.length) {
                log(`  ${DIM}     actions nhận được: ${JSON.stringify(f.allActions)}${RESET}`);
            }
        }
    }

    if (failed === 0) {
        log(`${GREEN}${BOLD}✅ TẤT CẢ PASS — 17 buttons đều được AI click đúng!${RESET}`);
    } else {
        log(`${YELLOW}Gợi ý: AI non-deterministic — thử chạy lại 1-2 lần nếu fail ít test.${RESET}`);
        log(`${YELLOW}Nếu fail nhiều → kiểm tra import click-ui-element.tool trong tools/index.ts${RESET}`);
        log(`${YELLOW}hoặc xem log API để biết Gemini có gọi tool không.${RESET}`);
    }

    sep(70, '═');
    process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(e => {
    console.error(`${RED}${BOLD}Fatal: ${e.message}${RESET}`);
    process.exit(1);
});
