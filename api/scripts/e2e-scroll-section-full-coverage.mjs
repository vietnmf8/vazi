/**
 * E2E Test: Scroll Section — FULL COVERAGE toàn bộ 30 target trong SECTION_PAGE_MAP (2026-06-22)
 *
 * Khác với e2e-scroll-section-combo.mjs (chỉ test ~10 case tiêu biểu), file này lặp qua TẤT CẢ
 * section đã định nghĩa trong scroll-page.tool.ts, mỗi section 1 câu "Tôi muốn xem phần [...]"
 * tại ĐÚNG trang sở hữu section đó (same-page) — để xác nhận coverage thật, không bỏ sót section nào.
 *
 * Chạy: node scripts/e2e-scroll-section-full-coverage.mjs
 */

import http from 'http';

const HOST = '127.0.0.1';
const PORT = 5000;
const JOIN_PATH = '/api/v1/chat/join';
const STREAM_PATH = '/api/v1/chat/message/stream';

const GREEN = '\x1b[32m', RED = '\x1b[31m', YELLOW = '\x1b[33m', CYAN = '\x1b[36m', MAGENTA = '\x1b[35m', DIM = '\x1b[2m', RESET = '\x1b[0m', BOLD = '\x1b[1m';
const ts = () => new Date().toISOString().slice(11, 23);
const log = (...a) => console.log(`[${ts()}]`, ...a);
const sep = (n = 70, ch = '─') => console.log(ch.repeat(n));

function httpPost(urlPath, body) {
    const raw = JSON.stringify(body);
    return new Promise((resolve, reject) => {
        const req = http.request(
            { hostname: HOST, port: PORT, path: urlPath, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(raw) } },
            (res) => { let data = ''; res.on('data', c => (data += c)); res.on('end', () => resolve({ status: res.statusCode, body: data })); }
        );
        req.on('error', reject);
        req.write(raw);
        req.end();
    });
}

async function createSession(lang = 'vi') {
    const res = await httpPost(JOIN_PATH, { user_name: 'FullCoverageTester', website_language: lang });
    const json = JSON.parse(res.body);
    if (!json.data?.session_id) throw new Error('Không lấy được session_id: ' + res.body);
    return json.data.session_id;
}

function streamMessage(sessionId, message, opts = {}) {
    const { lang = 'vi', currentUrl = '/' } = opts;
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({
            session_id: sessionId, message, sender: 'USER', message_type: 'TEXT',
            current_url: currentUrl, page_content: '', page_context: '[]', website_language: lang,
        });
        log(`${CYAN}  → Gửi (currentUrl=${currentUrl}): "${message}"${RESET}`);
        const req = http.request(
            { hostname: HOST, port: PORT, path: STREAM_PATH, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), Accept: 'text/event-stream' } },
            (res) => {
                if (res.statusCode !== 200) {
                    let errData = ''; res.on('data', c => (errData += c)); res.on('end', () => reject(new Error(`HTTP ${res.statusCode}: ${errData}`)));
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
                            if (data.action) log(`${MAGENTA}  [SSE ACTION] ${JSON.stringify(data)}${RESET}`);
                        } catch { /* ignore */ }
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
const results = [];

function record(tc, ok, sseAction, source, reason) {
    results.push({ ...tc, ok, sseAction, source, reason });
    if (ok) { passed++; log(`${GREEN}  ✅ PASS${RESET} — ${reason}`); }
    else { failed++; log(`${RED}  ❌ FAIL${RESET} — ${reason}`); }
}

// ─────────────────────────────────────────────────────────────────
// 30 SECTION — 1 case "Tôi muốn xem phần [...]" tại ĐÚNG trang sở hữu mỗi section
// ─────────────────────────────────────────────────────────────────

const CASES = [
    // ── Trang chủ (/) ──
    { target: 'how_it_works',          currentUrl: '/',                          message: 'Tôi muốn xem phần quy trình thực hiện' },
    { target: 'pricing',               currentUrl: '/',                          message: 'Tôi muốn xem phần bảng giá tổng quan' },
    { target: 'trust_signals',         currentUrl: '/',                          message: 'Tôi muốn xem phần chứng nhận uy tín' },
    { target: 'faq',                   currentUrl: '/',                          message: 'Tôi muốn xem phần câu hỏi thường gặp' },
    { target: 'comments',              currentUrl: '/',                          message: 'Tôi muốn xem phần bình luận đánh giá của khách hàng' },
    { target: 'nationalities',         currentUrl: '/',                          message: 'Tôi muốn xem phần kiểm tra miễn visa theo quốc tịch' },
    { target: 'quick_apply',           currentUrl: '/',                          message: 'Tôi muốn xem phần đăng ký nhanh chọn quốc tịch' },
    { target: 'blog_preview',          currentUrl: '/',                          message: 'Tôi muốn xem phần bài viết cẩm nang du lịch' },
    { target: 'cta_section',           currentUrl: '/',                          message: 'Tôi muốn xem phần kêu gọi hành động ở cuối trang' },
    // ── Về chúng tôi (/about-us) ──
    { target: 'about_mission',         currentUrl: '/about-us',                  message: 'Tôi muốn xem phần sứ mệnh dịch vụ của các bạn' },
    { target: 'about_scene_slider',    currentUrl: '/about-us',                  message: 'Tôi muốn xem phần trải nghiệm địa danh Việt Nam' },
    { target: 'about_team',            currentUrl: '/about-us',                  message: 'Tôi muốn xem phần đội ngũ nòng cốt' },
    { target: 'about_features',        currentUrl: '/about-us',                  message: 'Tôi muốn xem phần điểm ưu việt của các bạn' },
    // ── Tra cứu trạng thái (/check-status) ──
    { target: 'check_status_form',     currentUrl: '/check-status',              message: 'Tôi muốn xem phần form nhập mã booking để tra cứu' },
    { target: 'check_status_faqs',     currentUrl: '/check-status',              message: 'Tôi muốn xem phần câu hỏi liên quan tra cứu trạng thái' },
    // ── Liên hệ (/contact-us) ──
    { target: 'contact_info',          currentUrl: '/contact-us',                message: 'Tôi muốn xem phần thông tin liên hệ hotline email' },
    { target: 'contact_form',          currentUrl: '/contact-us',                message: 'Tôi muốn xem phần form gửi câu hỏi liên hệ' },
    // ── Khẩn cấp (/emergency-inquiry) ──
    { target: 'emergency_pricing',     currentUrl: '/emergency-inquiry',         message: 'Tôi muốn xem phần bảng giá làm khẩn cấp' },
    { target: 'emergency_timeline',    currentUrl: '/emergency-inquiry',         message: 'Tôi muốn xem phần lịch trình xử lý khẩn cấp' },
    { target: 'emergency_form',        currentUrl: '/emergency-inquiry',         message: 'Tôi muốn xem phần form yêu cầu khẩn cấp' },
    { target: 'emergency_correction',  currentUrl: '/emergency-inquiry',         message: 'Tôi muốn xem phần dịch vụ sửa đổi thông tin visa lỗi' },
    // ── Hỏi đáp (/faqs) ──
    { target: 'faqs_list',             currentUrl: '/faqs',                      message: 'Tôi muốn xem phần danh sách câu hỏi thường gặp' },
    // ── Hướng dẫn nộp đơn (/how-to-apply) ──
    { target: 'how_to_apply_timeline', currentUrl: '/how-to-apply',              message: 'Tôi muốn xem phần quy trình 5 bước nộp hồ sơ' },
    { target: 'how_to_apply_documents',currentUrl: '/how-to-apply',              message: 'Tôi muốn xem phần tài liệu bắt buộc cần chuẩn bị' },
    // ── Hub Guide (/guide) ──
    { target: 'guide_links',           currentUrl: '/guide',                     message: 'Tôi muốn xem phần danh sách bài viết hướng dẫn' },
    // ── Bảng giá visa (/guide/vietnam-visa-fees) ──
    { target: 'pricing_evisa',         currentUrl: '/guide/vietnam-visa-fees',   message: 'Tôi muốn xem phần bảng giá E-Visa' },
    { target: 'pricing_voa',           currentUrl: '/guide/vietnam-visa-fees',   message: 'Tôi muốn xem phần bảng giá VOA' },
    { target: 'pax_discount',          currentUrl: '/guide/vietnam-visa-fees',   message: 'Tôi muốn xem phần ưu đãi giảm giá theo nhóm' },
    { target: 'extra_services_guide',  currentUrl: '/guide/vietnam-visa-fees',   message: 'Tôi muốn xem phần dịch vụ bổ sung đi kèm' },
    // ── Nộp đơn (/apply) ──
    { target: 'apply_form',            currentUrl: '/apply',                     message: 'Tôi muốn xem phần form đăng ký nộp đơn' },
];

async function runOne(tc) {
    sep(60);
    log(`${CYAN}${BOLD}[${tc.target}]${RESET} tại ${tc.currentUrl}`);
    try {
        const sessionId = await createSession('vi');
        const result = await streamMessage(sessionId, tc.message, { lang: 'vi', currentUrl: tc.currentUrl });
        log(`  AI reply (60 ký tự đầu): "${result.fullText.slice(0, 60)}${result.fullText.length > 60 ? '...' : ''}"`);

        const allActions = result.events.filter(e => e.action);
        const scrollHit = allActions.find(e => e.action === 'SCROLL_PAGE' && e.mode === 'element' && e.target === tc.target);
        const wrongAction = allActions.find(e => e.action !== 'SCROLL_PAGE' || e.target !== tc.target);
        const source = scrollHit?.intent ? `NLP Cache (${scrollHit.intent})` : (allActions.length ? 'Gemini' : 'Không gọi tool (chỉ trả text)');

        if (scrollHit) {
            record(tc, true, scrollHit, source, `SCROLL_PAGE target="${tc.target}" đúng như kỳ vọng — nguồn: ${source}`);
        } else {
            record(tc, false, wrongAction || null, source, `Không có SCROLL_PAGE target="${tc.target}" | actions: ${JSON.stringify(allActions)}`);
        }
    } catch (err) {
        record(tc, false, null, 'ERROR', `ERROR: ${err.message}`);
    }
    await new Promise(r => setTimeout(r, 300));
}

async function runTests() {
    sep(70, '═');
    log(`${BOLD}${YELLOW}=== E2E TEST: SCROLL SECTION — FULL COVERAGE (30/30 section) ===${RESET}`);
    log(`${DIM}${CASES.length} case — mỗi section 1 câu "Tôi muốn xem phần [...]" tại đúng trang sở hữu${RESET}`);
    sep(70, '═');

    for (const tc of CASES) await runOne(tc);

    sep(70, '═');
    const total = passed + failed;
    log(`${failed === 0 ? GREEN : RED}${BOLD}KẾT QUẢ: ${passed}/${total} PASS${RESET}`);
    sep(70, '═');

    // In bảng tổng hợp dạng markdown để dễ copy vào báo cáo
    console.log('\n| Target | currentUrl | Message | Khớp? | Nguồn |');
    console.log('|---|---|---|---|---|');
    for (const r of results) {
        console.log(`| \`${r.target}\` | ${r.currentUrl} | "${r.message}" | ${r.ok ? '✅' : '❌'} | ${r.source} |`);
    }

    process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(e => { console.error(`${RED}${BOLD}Fatal: ${e.message}${RESET}`); process.exit(1); });
