/**
 * E2E Test: Virtual Mouse — COMBO Navigate+Click coverage (Track B, 2026-06-22)
 *
 * Mục tiêu: Xác nhận click_ui_element tự quyết định đúng giữa 2 nhánh:
 *   - ELEMENT_CLICK_TRIGGERED  → SSE { action: "VIRTUAL_CLICK", target }            (cùng trang)
 *   - NAVIGATE_AND_CLICK_TRIGGERED → SSE { action: "NAVIGATE_AND_CLICK", destination, target } (khác trang)
 *
 * 4 case chính (theo yêu cầu thiết kế combo):
 *   1. Click button đang hiện trên màn hình, cùng trang        → VIRTUAL_CLICK, không scroll
 *   2. Click button cùng trang nhưng dưới fold                  → VIRTUAL_CLICK (scroll xử lý ở Tầng 2/client)
 *   3. Click button ở trang khác, hiện ngay sau khi sang trang → NAVIGATE_AND_CLICK, không scroll (xử lý ở Tầng 2)
 *   4. Click button ở trang khác, phải cuộn sau khi sang trang → NAVIGATE_AND_CLICK, có scroll (xử lý ở Tầng 2)
 *
 * Tầng 1 (file này) CHỈ verify được phần backend: tool có chọn đúng action/destination/target
 * không — KHÔNG verify được hành vi scroll thật (đó là DOM/client, xem Tầng 2 Playwright).
 *
 * 53 test cases = 10 intent x 4-5 BIẾN THỂ ĐA NGỮ NGHĨA THẬT (đổi động từ, tên gọi nút,
 * cấu trúc câu, mức trang trọng, ngôn ngữ) + 3 edge case cấu trúc (GLOBAL/dedup).
 * Một số biến thể đánh dấu expectNlp:true để verify Guard isQuestion-directive-exception
 * (câu hỏi lịch sự như "Bạn có thể... không?" / "Could you...?" PHẢI đi qua NLP Cache).
 *
 * Chạy: node scripts/e2e-virtual-mouse-combo.mjs
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

// ─────────────────────────────────────────────────────────────────
// HTTP helpers (giống e2e-virtual-mouse-all-buttons.mjs)
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
    const res = await httpPost(JOIN_PATH, { user_name: 'ComboTester', website_language: lang });
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

/**
 * Case 1/2 (cùng trang) — phải thấy VIRTUAL_CLICK, KHÔNG được có NAVIGATE_AND_CLICK.
 * expectNlp=true → bắt buộc action phải có field "intent" (chứng minh đi qua NLP Cache,
 * không phải Gemini fallback) — dùng để verify Guard isQuestion-directive-exception.
 */
function assertSamePageClick(events, expectedTarget, testId, expectNlp) {
    const allActions = events.filter(e => e.action);
    const navAndClick = allActions.find(e => e.action === 'NAVIGATE_AND_CLICK');
    const click = allActions.find(e => e.action === 'VIRTUAL_CLICK');

    if (navAndClick) {
        return fail(testId, `Lẽ ra cùng trang nhưng tool lại NAVIGATE_AND_CLICK đến "${navAndClick.destination}" — sai logic same-page detection`, allActions);
    }
    if (!click) {
        return fail(testId, `Không có VIRTUAL_CLICK trong stream | actions: ${JSON.stringify(allActions)}`, allActions);
    }
    if (click.target !== expectedTarget) {
        return fail(testId, `VIRTUAL_CLICK sai target | got: "${click.target}" | expected: "${expectedTarget}"`, allActions);
    }
    if (expectNlp && !click.intent) {
        return fail(testId, `Kỳ vọng đi qua NLP Cache (Guard isQuestion-exception) nhưng lại rớt xuống Gemini (không có field "intent")`, allActions);
    }
    pass(testId, `VIRTUAL_CLICK target="${expectedTarget}" (cùng trang, đúng như kỳ vọng${expectNlp ? ', qua NLP' : ''})`);
}

/**
 * Case 3/4 (khác trang) — phải thấy NAVIGATE_AND_CLICK với đúng destination + target.
 * expectNlp=true → bắt buộc đi qua NLP Combo Resolver (có field "intent"), không phải Gemini.
 */
function assertCombo(events, expectedDestination, expectedTarget, testId, expectNlp) {
    const allActions = events.filter(e => e.action);
    const combo = allActions.find(e => e.action === 'NAVIGATE_AND_CLICK');

    if (!combo) {
        return fail(testId, `Không có NAVIGATE_AND_CLICK trong stream | actions: ${JSON.stringify(allActions)}`, allActions);
    }
    if (combo.destination !== expectedDestination) {
        return fail(testId, `Sai destination | got: "${combo.destination}" | expected: "${expectedDestination}"`, allActions);
    }
    if (combo.target !== expectedTarget) {
        return fail(testId, `Sai target | got: "${combo.target}" | expected: "${expectedTarget}"`, allActions);
    }
    if (expectNlp && !combo.intent) {
        return fail(testId, `Kỳ vọng đi qua NLP Combo Resolver (Guard isQuestion-exception) nhưng lại rớt xuống Gemini (không có field "intent")`, allActions);
    }
    pass(testId, `NAVIGATE_AND_CLICK destination="${expectedDestination}" target="${expectedTarget}"${expectNlp ? ' (qua NLP)' : ''}`);
}

/**
 * Edge 5.2 — Dedup: nếu Gemini lỡ gọi cả navigate_to_page VÀ click_ui_element trong cùng yêu cầu,
 * không được phép có 2 destination KHÁC NHAU (double navigation đến 2 nơi khác nhau là bug thật).
 * Trùng 1 destination lặp lại (do round-trip nhiều lượt gọi tool) được coi là chấp nhận được —
 * đây là hạn chế đã biết (xem SKILL.md mục "Giới hạn đã biết"), không phải lỗi mới.
 */
function assertNoConflictingNavigation(events, testId) {
    const allActions = events.filter(e => e.action);
    const destinations = new Set(
        allActions
            .filter(e => e.action === 'NAVIGATE_AND_CLICK' || e.action === 'NAVIGATION')
            .map(e => e.destination)
            .filter(Boolean)
    );

    if (destinations.size > 1) {
        return fail(testId, `Phát hiện điều hướng đến NHIỀU destination khác nhau trong 1 turn: ${JSON.stringify([...destinations])} — double-navigation bug thật`, allActions);
    }
    pass(testId, `Không có double-navigation xung đột (destinations: ${JSON.stringify([...destinations])})`);
}

// ─────────────────────────────────────────────────────────────────
// TEST CASES — "Biến thể đa ngữ nghĩa" (semantic paraphrase variants)
// ─────────────────────────────────────────────────────────────────
//
// MỖI intent (target) có 4-5 BIẾN THỂ THẬT — cùng mục đích nhưng diễn đạt khác nhau,
// mô phỏng cách user thật gõ chat (không phải 1 câu mẫu cố định):
//   ✅ Đổi động từ      : bấm / nhấn / click / tap / "giúp tôi" / "cho tui"
//   ✅ Đổi tên gọi nút  : tên tiếng Anh gốc / nhãn tiếng Việt / mô tả mơ hồ ("cái nút to to")
//   ✅ Đổi cấu trúc câu : trực tiếp / gián tiếp / câu hỏi lịch sự / yêu cầu ngắn
//   ✅ Đổi mức trang trọng: thân mật ("giùm/cho tui") / lịch sự ("làm ơn/could you") / formal
//   ✅ Đổi ngôn ngữ     : vi + en
//   ✅ Đổi currentUrl   : trải đều same-page và combo (khác trang) cho cùng 1 target
//
// expectNlp: true → case này verify Guard isQuestion-directive-exception (câu hỏi lịch sự
// PHẢI đi qua NLP Cache, không phải Gemini) — xem chat.service.ts isIndirectDirective.
// ─────────────────────────────────────────────────────────────────

const INTENT_VARIANTS = [
    // ── hero_apply (same-page, "/") ──────────────────────────────
    { id: 'V-hero_apply-1', target: 'hero_apply', kind: 'same', currentUrl: '/',
      desc: 'hero_apply — baseline',
      message: 'Bấm nút Apply Now to lớn ở giữa trang chủ cho tôi' },
    { id: 'V-hero_apply-2', target: 'hero_apply', kind: 'same', currentUrl: '/',
      desc: 'hero_apply — đổi động từ + nhãn tiếng Việt',
      message: 'NHẤN nút Đăng ký ngay ở trên màn hình' },
    { id: 'V-hero_apply-3', target: 'hero_apply', kind: 'same', currentUrl: '/',
      desc: 'hero_apply — mô tả mơ hồ, casual',
      message: 'click vào cái nút to to giữa trang đó' },
    { id: 'V-hero_apply-4', target: 'hero_apply', kind: 'same', currentUrl: '/',
      desc: 'hero_apply — gián tiếp, đổi thứ tự câu',
      message: 'giúp tôi bấm vào nút apply chính giữa' },
    { id: 'V-hero_apply-5', target: 'hero_apply', kind: 'same', currentUrl: '/',
      desc: 'hero_apply — tiếng Anh',
      message: 'Tap the big Apply Now button in the middle of the homepage' },

    // ── header_check_status (GLOBAL) — verify Guard isQuestion-directive-exception ──
    { id: 'V-header_check_status-1', target: 'header_check_status', kind: 'same', currentUrl: '/', expectNlp: true,
      desc: 'header_check_status — câu hỏi lịch sự gián tiếp (Guard fix)',
      message: 'Bạn có thể bấm giúp tôi vào link Check Status trên thanh header không?' },
    { id: 'V-header_check_status-2', target: 'header_check_status', kind: 'same', currentUrl: '/about-us',
      desc: 'header_check_status — formal, nhãn tiếng Việt',
      message: 'Nhấn vào link tra cứu trạng thái ở thanh điều hướng phía trên' },
    { id: 'V-header_check_status-3', target: 'header_check_status', kind: 'same', currentUrl: '/faqs',
      desc: 'header_check_status — casual ngắn',
      message: 'click Check Status trên header đi' },
    { id: 'V-header_check_status-4', target: 'header_check_status', kind: 'same', currentUrl: '/', expectNlp: true,
      desc: 'header_check_status — câu hỏi lịch sự tiếng Anh (Guard fix)',
      message: 'Could you click the Check Status link on the header for me?' },
    { id: 'V-header_check_status-5', target: 'header_check_status', kind: 'same', currentUrl: '/contact-us',
      desc: 'header_check_status — gián tiếp',
      message: 'giúp tôi mở link check status trên đầu trang' },

    // ── contact_submit (combo) — verify Guard isQuestion-directive-exception ────────
    { id: 'V-contact_submit-1', target: 'contact_submit', kind: 'combo', destination: '/contact-us', currentUrl: '/about-us',
      desc: 'contact_submit — baseline combo',
      message: 'Bấm Submit để gửi form liên hệ giúp tôi' },
    { id: 'V-contact_submit-2', target: 'contact_submit', kind: 'combo', destination: '/contact-us', currentUrl: '/check-status', expectNlp: true,
      desc: 'contact_submit — câu hỏi lịch sự tiếng Anh + combo (Guard fix)',
      message: 'Could you please click the send button on the contact page for me?' },
    { id: 'V-contact_submit-3', target: 'contact_submit', kind: 'combo', destination: '/contact-us', currentUrl: '/',
      desc: 'contact_submit — casual "giùm"',
      message: 'nhấn nút gửi trên form liên hệ giùm tôi' },
    { id: 'V-contact_submit-4', target: 'contact_submit', kind: 'combo', destination: '/contact-us', currentUrl: '/faqs',
      desc: 'contact_submit — đổi cấu trúc câu',
      message: 'Tôi muốn gửi thông tin liên hệ, bấm Send giúp tôi nhé' },
    { id: 'V-contact_submit-5', target: 'contact_submit', kind: 'combo', destination: '/contact-us', currentUrl: '/apply',
      // Lưu ý: tránh "submit the form" trống không — nghe như yêu cầu AI tự ĐIỀN form
      // (capability chưa có, auto_fill_form), phải nói rõ "click the button" để rõ ý UI action.
      desc: 'contact_submit — tiếng Anh casual',
      message: 'please click the send button on the contact form for me' },

    // ── faqs_submit_question (combo) ─────────────────────────────
    { id: 'V-faqs_submit_question-1', target: 'faqs_submit_question', kind: 'combo', destination: '/faqs', currentUrl: '/',
      desc: 'faqs_submit_question — baseline',
      message: 'Nhấn Submit Question để gửi câu hỏi trong trang FAQs' },
    { id: 'V-faqs_submit_question-2', target: 'faqs_submit_question', kind: 'combo', destination: '/faqs', currentUrl: '/emergency-inquiry',
      desc: 'faqs_submit_question — gián tiếp, dài',
      message: 'Tôi có câu hỏi muốn gửi cho đội ngũ hỗ trợ trong trang FAQs, bấm giúp tôi nút gửi đi' },
    { id: 'V-faqs_submit_question-3', target: 'faqs_submit_question', kind: 'combo', destination: '/faqs', currentUrl: '/about-us',
      desc: 'faqs_submit_question — casual, nhãn tiếng Việt "hỏi đáp"',
      message: 'click nút gửi câu hỏi ở trang hỏi đáp' },
    { id: 'V-faqs_submit_question-4', target: 'faqs_submit_question', kind: 'combo', destination: '/faqs', currentUrl: '/contact-us',
      desc: 'faqs_submit_question — tiếng Anh lịch sự',
      message: 'submit my question on the FAQs page please' },
    { id: 'V-faqs_submit_question-5', target: 'faqs_submit_question', kind: 'combo', destination: '/faqs', currentUrl: '/',
      desc: 'faqs_submit_question — gián tiếp ngắn',
      message: 'giúp tôi bấm gửi câu hỏi bên trang FAQ' },

    // ── emergency_correction_whatsapp (combo + scroll) ───────────
    { id: 'V-emergency_whatsapp-1', target: 'emergency_correction_whatsapp', kind: 'combo', destination: '/emergency-inquiry', currentUrl: '/',
      desc: 'emergency_whatsapp — baseline',
      message: 'Bấm nút WhatsApp màu xanh lá để sửa thông tin hồ sơ khẩn cấp' },
    { id: 'V-emergency_whatsapp-2', target: 'emergency_correction_whatsapp', kind: 'combo', destination: '/emergency-inquiry', currentUrl: '/contact-us',
      desc: 'emergency_whatsapp — tiếng Anh',
      message: 'Please click the WhatsApp button to fix my profile information.' },
    { id: 'V-emergency_whatsapp-3', target: 'emergency_correction_whatsapp', kind: 'combo', destination: '/emergency-inquiry', currentUrl: '/faqs',
      desc: 'emergency_whatsapp — casual',
      message: 'nhấn vào nút whatsapp để chỉnh sửa hồ sơ khẩn' },
    { id: 'V-emergency_whatsapp-4', target: 'emergency_correction_whatsapp', kind: 'combo', destination: '/emergency-inquiry', currentUrl: '/apply',
      desc: 'emergency_whatsapp — đổi cấu trúc câu',
      message: 'tôi cần sửa thông tin đơn khẩn cấp, bấm nút whatsapp giúp tôi' },
    { id: 'V-emergency_whatsapp-5', target: 'emergency_correction_whatsapp', kind: 'combo', destination: '/emergency-inquiry', currentUrl: '/',
      desc: 'emergency_whatsapp — tiếng Anh casual',
      message: 'click the green whatsapp icon to correct my emergency application' },

    // ── continue_to_apply (đa-trang) — trải đều same-page + combo qua biến thể ──
    { id: 'V-continue_to_apply-1', target: 'continue_to_apply', kind: 'same', currentUrl: '/apply',
      desc: 'continue_to_apply — same-page (/apply, nhánh 1 trong array)',
      message: 'Bấm nút Continue to Apply' },
    { id: 'V-continue_to_apply-2', target: 'continue_to_apply', kind: 'same', currentUrl: '/',
      desc: 'continue_to_apply — same-page (/, nhánh 2 trong array)',
      message: 'Bấm Continue to Apply để tiếp tục đăng ký' },
    { id: 'V-continue_to_apply-3', target: 'continue_to_apply', kind: 'combo', destination: '/', currentUrl: '/about-us',
      desc: 'continue_to_apply — combo, đứng ngoài map',
      message: 'Bấm nút Continue to Apply để bắt đầu đăng ký' },
    { id: 'V-continue_to_apply-4', target: 'continue_to_apply', kind: 'combo', destination: '/', currentUrl: '/check-status',
      desc: 'continue_to_apply — combo, casual VI',
      message: 'nhấn tiếp tục để vào form đăng ký visa' },
    { id: 'V-continue_to_apply-5', target: 'continue_to_apply', kind: 'combo', destination: '/', currentUrl: '/faqs',
      desc: 'continue_to_apply — combo, tiếng Anh',
      message: 'click continue to start my application' },

    // ── chat-toggle (GLOBAL) ──────────────────────────────────────
    { id: 'V-chat_toggle-1', target: 'chat-toggle', kind: 'same', currentUrl: '/faqs',
      desc: 'chat_toggle — baseline',
      message: 'đóng chat lại' },
    { id: 'V-chat_toggle-2', target: 'chat-toggle', kind: 'same', currentUrl: '/guide/vietnam-visa-fees',
      desc: 'chat_toggle — trang sâu',
      message: 'tắt chat giúp tôi' },
    { id: 'V-chat_toggle-3', target: 'chat-toggle', kind: 'same', currentUrl: '/',
      desc: 'chat_toggle — tiếng Anh',
      message: 'close this chat window' },
    { id: 'V-chat_toggle-4', target: 'chat-toggle', kind: 'same', currentUrl: '/apply',
      desc: 'chat_toggle — casual',
      message: 'ẩn cái khung chat đi' },
    { id: 'V-chat_toggle-5', target: 'chat-toggle', kind: 'same', currentUrl: '/contact-us',
      desc: 'chat_toggle — tiếng Anh lịch sự',
      message: 'minimize the chat bubble please' },

    // ── next_step2 (same-page /apply + combo) ────────────────────
    { id: 'V-next_step2-1', target: 'next_step2', kind: 'same', currentUrl: '/apply',
      desc: 'next_step2 — baseline, cực ngắn',
      message: 'tiếp tục bước 2' },
    { id: 'V-next_step2-2', target: 'next_step2', kind: 'combo', destination: '/apply', currentUrl: '/',
      desc: 'next_step2 — combo, tiếng Anh',
      message: 'click the next button to go to step 2 of the application' },
    { id: 'V-next_step2-3', target: 'next_step2', kind: 'same', currentUrl: '/apply',
      desc: 'next_step2 — casual',
      message: 'nhấn Next để qua bước 2' },
    { id: 'V-next_step2-4', target: 'next_step2', kind: 'combo', destination: '/apply', currentUrl: '/about-us',
      desc: 'next_step2 — combo, gián tiếp',
      message: 'giúp tôi chuyển sang bước thứ hai trong form đăng ký' },
    { id: 'V-next_step2-5', target: 'next_step2', kind: 'same', currentUrl: '/apply',
      desc: 'next_step2 — tiếng Anh ngắn',
      message: 'move to step 2 please' },

    // ── how_to_apply_start (combo, đã auto-learn qua retrain) ────
    { id: 'V-how_to_apply_start-1', target: 'how_to_apply_start', kind: 'combo', destination: '/how-to-apply', currentUrl: '/',
      desc: 'how_to_apply_start — baseline, casual "cho tui"',
      message: 'cho tui cái nút màu cam bắt đầu ở trang hướng dẫn nha' },
    { id: 'V-how_to_apply_start-2', target: 'how_to_apply_start', kind: 'combo', destination: '/how-to-apply', currentUrl: '/faqs',
      desc: 'how_to_apply_start — formal',
      message: 'nhấn nút bắt đầu trên trang how to apply' },
    { id: 'V-how_to_apply_start-3', target: 'how_to_apply_start', kind: 'combo', destination: '/how-to-apply', currentUrl: '/check-status',
      desc: 'how_to_apply_start — tiếng Anh',
      message: 'click the start button on the how to apply page' },
    { id: 'V-how_to_apply_start-4', target: 'how_to_apply_start', kind: 'combo', destination: '/how-to-apply', currentUrl: '/contact-us',
      desc: 'how_to_apply_start — gián tiếp',
      message: 'giúp tôi mở phần bắt đầu làm đơn ở trang hướng dẫn' },
    { id: 'V-how_to_apply_start-5', target: 'how_to_apply_start', kind: 'combo', destination: '/how-to-apply', currentUrl: '/',
      desc: 'how_to_apply_start — tiếng Anh gián tiếp',
      message: 'take me to start my visa application' },

    // ── check_status_submit (same-page /check-status + combo) ───
    { id: 'V-check_status_submit-1', target: 'check_status_submit', kind: 'same', currentUrl: '/check-status',
      desc: 'check_status_submit — baseline, thân mật',
      message: 'Giúp tui bấm nút Submit để tra cứu hồ sơ với' },
    { id: 'V-check_status_submit-2', target: 'check_status_submit', kind: 'combo', destination: '/check-status', currentUrl: '/faqs',
      desc: 'check_status_submit — combo, lịch sự "làm ơn"',
      message: 'Làm ơn bấm giúp tôi nút Submit để tra cứu trạng thái hồ sơ' },
    { id: 'V-check_status_submit-3', target: 'check_status_submit', kind: 'same', currentUrl: '/check-status',
      desc: 'check_status_submit — casual',
      message: 'nhấn nút tra cứu trạng thái đơn' },
    { id: 'V-check_status_submit-4', target: 'check_status_submit', kind: 'combo', destination: '/check-status', currentUrl: '/about-us', expectNlp: true,
      // Lưu ý: tránh phrasing "check my application status" — dễ bị Gemini hiểu là dùng
      // business tool check_visa_status (cần booking code) thay vì UI action click_ui_element.
      // Phải nói rõ "click the submit BUTTON" để loại bỏ nhập nhằng với tool khác.
      desc: 'check_status_submit — combo, câu hỏi lịch sự tiếng Anh (Guard fix)',
      message: 'Could you click the submit button on the check status page for me?' },
    { id: 'V-check_status_submit-5', target: 'check_status_submit', kind: 'same', currentUrl: '/check-status',
      desc: 'check_status_submit — ngắn',
      message: 'bấm tra cứu hồ sơ giúp tôi' },
];

// Edge cases cấu trúc (không phải paraphrase) — xem mục "Edge Case Matrix" trong SKILL.md
const EDGE_CASES = [
    {
        id: 'E03-global', kind: 'same',
        target: 'btn-apply-header',
        desc: 'Edge 5.1c — Target GLOBAL (Header) gọi từ trang khác → vẫn KHÔNG navigate (Header có mặt mọi trang)',
        message: 'Bấm nút Apply Now trên thanh điều hướng header',
        currentUrl: '/contact-us',
    },
    {
        id: 'E04-dedup', kind: 'no-conflict',
        desc: 'Edge 5.2 — User yêu cầu rõ "chuyển trang VÀ click" trong 1 câu → không được double-navigate đến 2 nơi khác nhau',
        message: 'Đưa tôi đến trang liên hệ và bấm nút Send gửi form giúp tôi',
        currentUrl: '/',
    },
    {
        id: 'E08-dedup-en', kind: 'no-conflict',
        desc: 'Edge 5.2 (biến thể tiếng Anh) — cùng ý định combo viết theo kiểu yêu cầu kép',
        message: 'Take me to the FAQs page and submit a question for me.',
        currentUrl: '/',
    },
];

// ─────────────────────────────────────────────────────────────────
// RUNNER
// ─────────────────────────────────────────────────────────────────

async function runOne(tc, assertFn) {
    sep(60);
    log(`${CYAN}${BOLD}[${tc.id}] ${tc.desc}${RESET}`);
    try {
        const sessionId = await createSession('vi');
        const result = await streamMessage(sessionId, tc.message, { lang: 'vi', currentUrl: tc.currentUrl });
        log(`  AI reply (80 ký tự đầu): "${result.fullText.slice(0, 80)}${result.fullText.length > 80 ? '...' : ''}"`);
        assertFn(result.events);
    } catch (err) {
        log(`${RED}  💥 ERROR: ${err.message}${RESET}`);
        failed++;
        failures.push({ id: tc.id, reason: 'ERROR: ' + err.message });
    }
    await new Promise(r => setTimeout(r, 300)); // tránh rate-limit
}

async function runTests() {
    sep(70, '═');
    log(`${BOLD}${YELLOW}=== E2E TEST: VIRTUAL MOUSE — COMBO NAVIGATE+CLICK (Biến thể đa ngữ nghĩa) ===${RESET}`);
    log(`${DIM}Host: ${HOST}:${PORT}  |  Endpoint: POST ${STREAM_PATH}${RESET}`);
    log(`${DIM}${INTENT_VARIANTS.length} biến thể (10 intent x ~5 cách diễn đạt) + ${EDGE_CASES.length} edge case cấu trúc${RESET}`);
    sep(70, '═');

    log(`${BOLD}--- BIẾN THỂ ĐA NGỮ NGHĨA (mỗi intent 4-5 cách nói khác nhau) ---${RESET}`);
    for (const tc of INTENT_VARIANTS) {
        if (tc.kind === 'same') {
            await runOne(tc, (events) => assertSamePageClick(events, tc.target, tc.id, tc.expectNlp));
        } else {
            await runOne(tc, (events) => assertCombo(events, tc.destination, tc.target, tc.id, tc.expectNlp));
        }
    }

    log(`${BOLD}--- EDGE CASES CẤU TRÚC (GLOBAL / dedup) ---${RESET}`);
    for (const tc of EDGE_CASES) {
        if (tc.kind === 'same') {
            await runOne(tc, (events) => assertSamePageClick(events, tc.target, tc.id));
        } else if (tc.kind === 'combo') {
            await runOne(tc, (events) => assertCombo(events, tc.destination, tc.target, tc.id));
        } else {
            await runOne(tc, (events) => assertNoConflictingNavigation(events, tc.id));
        }
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
        log(`${GREEN}${BOLD}✅ TẤT CẢ PASS — combo navigate+click hoạt động đúng cho mọi case + edge case!${RESET}`);
    }

    sep(70, '═');
    process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(e => {
    console.error(`${RED}${BOLD}Fatal: ${e.message}${RESET}`);
    process.exit(1);
});
