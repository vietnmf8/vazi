/**
 * verify-nlp-full.mjs — Full NLP Cache + Edge Case Test Suite
 * Chạy sau khi restart API server để load model-v8 (470 utterances, 22 intents)
 *
 * Coverage:
 *   • TẦNG 1 (17 buttons) — case chính, phải 100% NLP Cache
 *   • BIẾN THỂ (key variants) — case phụ, phải NLP Cache
 *   • EDGE CASES — câu ngắn / tiếng Anh / phong cách / off-topic
 */

import 'dotenv/config';
import http from 'http';

const HOST = '127.0.0.1', PORT = 5000;
const G='\x1b[32m',R='\x1b[31m',Y='\x1b[33m',C='\x1b[36m',RST='\x1b[0m',B='\x1b[1m';
const ts = () => new Date().toISOString().slice(11, 23);
const log = (...a) => console.log(`[${ts()}]`, ...a);
const sep = (n=70, c='─') => console.log(c.repeat(n));

function httpPost(path, body) {
    const raw = JSON.stringify(body);
    return new Promise((resolve, reject) => {
        const req = http.request(
            { hostname: HOST, port: PORT, path, method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(raw) } },
            (res) => { let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(JSON.parse(d))); }
        );
        req.on('error', reject); req.write(raw); req.end();
    });
}

async function streamMsg(sid, msg, url, lang) {
    // Auto-detect: Vietnamese diacritics → vi, otherwise → en
    const website_language = lang ?? (/[àáâãèéêìíòóôõùúýăđơưÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚÝĂĐƠƯ]/.test(msg) ? 'vi' : 'en');
    const body = JSON.stringify({
        session_id: sid, message: msg, sender: 'USER', message_type: 'TEXT',
        current_url: url, page_content: '', page_context: '[]', website_language,
    });
    return new Promise((resolve, reject) => {
        const req = http.request(
            { hostname: HOST, port: PORT, path: '/api/v1/chat/message/stream', method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), Accept: 'text/event-stream' } },
            (res) => {
                const events = []; let buf = '';
                res.on('data', chunk => {
                    buf += chunk;
                    const lines = buf.split('\n'); buf = lines.pop() ?? '';
                    for (const l of lines) {
                        if (!l.startsWith('data: ')) continue;
                        try { const d = JSON.parse(l.slice(6)); events.push(d); } catch {}
                    }
                });
                res.on('end', () => resolve(events));
                res.on('error', reject);
            }
        );
        req.on('error', reject); req.write(body); req.end();
    });
}

async function runTest(tc) {
    const r1 = await httpPost('/api/v1/chat/join', { user_name: 'NLPVerifyBot' });
    const sid = r1.data.session_id;
    const t0 = Date.now();
    const events = await streamMsg(sid, tc.msg, tc.url ?? '/');
    const ms = Date.now() - t0;

    const vc    = events.find(e => e.action === 'VIRTUAL_CLICK');
    const nav   = events.find(e => e.action === 'NAVIGATION');   // ← correct event name
    const cache = events.find(e => e.intent);
    const layer = cache ? `NLP(${ms}ms)` : `Gemini(${ms}ms)`;

    let pass, actual;
    if (tc.expectAction === 'VIRTUAL_CLICK') {
        pass   = vc?.target === tc.expectTarget;
        actual = vc ? `CLICK:${vc.target}` : (nav ? `NAV:${nav.path}` : 'NO_ACTION');
    } else if (tc.expectAction === 'NAVIGATE') {
        pass   = nav?.destination === tc.expectTarget;
        actual = nav ? `NAV:${nav.destination}` : (vc ? `CLICK:${vc.target}` : 'NO_ACTION');
    } else {
        pass   = !vc && !nav;
        actual = vc ? `CLICK:${vc.target}` : (nav ? `NAV:${nav.path}` : 'NO_ACTION');
    }

    const cacheOk = tc.mustCache ? !!cache : true;
    const ok = pass && cacheOk;

    const icon  = ok ? `${G}✅${RST}` : `${R}❌${RST}`;
    const lstr  = cache ? `${G}${layer}${RST}` : `${Y}${layer}${RST}`;
    const xpect = tc.expectAction === 'VIRTUAL_CLICK' ? `CLICK:${tc.expectTarget}`
                : tc.expectAction === 'NAVIGATE'      ? `NAV:${tc.expectTarget}`
                :                                        'NO_ACTION';
    log(`${icon} [${tc.id}] ${lstr} | got=${actual} | expect=${xpect}`);
    if (!pass)    log(`   ${R}→ Wrong action/target${RST}`);
    if (!cacheOk) log(`   ${Y}→ Expected NLP Cache HIT but got Gemini${RST}`);
    return ok;
}

// ─── TẦNG 1: Case Chính (17 buttons) ──────────────────────────────────────────

const TANG1 = [
    { id:'B01', url:'/',                  expectAction:'VIRTUAL_CLICK', expectTarget:'hero_apply',                    mustCache:true,  msg:'Bấm nút Apply Now to lớn ở giữa trang chủ cho tôi' },
    { id:'B02', url:'/',                  expectAction:'VIRTUAL_CLICK', expectTarget:'hero_check_status',             mustCache:true,  msg:'Nhấn nút Check Status ngay trong phần hero ở trang chủ' },
    { id:'B03', url:'/',                  expectAction:'VIRTUAL_CLICK', expectTarget:'btn-apply-header',              mustCache:true,  msg:'Bấm nút Apply Now trên thanh điều hướng header ở trên cùng' },
    { id:'B04', url:'/',                  expectAction:'VIRTUAL_CLICK', expectTarget:'header_check_status',           mustCache:true,  msg:'Click vào link Check Status trên thanh header' },
    { id:'B05', url:'/',                  expectAction:'VIRTUAL_CLICK', expectTarget:'lang-selector',                 mustCache:true,  msg:'Nhấn nút chọn ngôn ngữ trên header để đổi sang tiếng Anh' },
    { id:'B06', url:'/',                  expectAction:'VIRTUAL_CLICK', expectTarget:'chat-toggle',                   mustCache:true,  msg:'Đóng widget chat này lại' },
    { id:'B07', url:'/',                  expectAction:'VIRTUAL_CLICK', expectTarget:'cta_apply',                     mustCache:true,  msg:'Bấm nút Apply Now ở phần CTA cuối trang chủ' },
    { id:'B08', url:'/',                  expectAction:'VIRTUAL_CLICK', expectTarget:'cta_check_status',              mustCache:true,  msg:'Nhấn nút Check Status ở phần cuối trang (CTA section)' },
    { id:'B09', url:'/',                  expectAction:'VIRTUAL_CLICK', expectTarget:'continue_to_apply',             mustCache:true,  msg:'Bấm nút Continue to Apply để tiến vào form đăng ký' },
    { id:'B10', url:'/how-to-apply',      expectAction:'VIRTUAL_CLICK', expectTarget:'how_to_apply_start',            mustCache:true,  msg:'Nhấn nút màu cam ở trang hướng dẫn visa' },
    { id:'B11', url:'/check-status',      expectAction:'VIRTUAL_CLICK', expectTarget:'check_status_submit',           mustCache:true,  msg:'Nhấn nút Submit màu xanh trong form check status giúp tôi' },
    { id:'B12', url:'/contact-us',        expectAction:'VIRTUAL_CLICK', expectTarget:'contact_submit',                mustCache:true,  msg:'Nhấn nút Send để gửi form liên hệ' },
    { id:'B13', url:'/emergency-inquiry', expectAction:'VIRTUAL_CLICK', expectTarget:'emergency_submit',              mustCache:true,  msg:'Bấm Submit để gửi form yêu cầu khẩn cấp' },
    { id:'B14', url:'/emergency-inquiry', expectAction:'VIRTUAL_CLICK', expectTarget:'emergency_correction_whatsapp', mustCache:true,  msg:'Bấm nút WhatsApp màu xanh lá để sửa thông tin hồ sơ' },
    { id:'B15', url:'/faqs',              expectAction:'VIRTUAL_CLICK', expectTarget:'faqs_submit_question',          mustCache:true,  msg:'Click nút Submit Question trong trang FAQs để gửi câu hỏi' },
    { id:'B16', url:'/apply',             expectAction:'VIRTUAL_CLICK', expectTarget:'next_step2',                    mustCache:true,  msg:'Nhấn Next để chuyển sang bước 2 trong form nộp đơn' },
    { id:'B17', url:'/',                  expectAction:'VIRTUAL_CLICK', expectTarget:'header_mobile_menu',            mustCache:true,  msg:'Mở menu hamburger trên điện thoại' },
];

// ─── BIẾN THỂ: Case Phụ ───────────────────────────────────────────────────────

const VARIANTS = [
    // Cực ngắn VI
    { id:'V01', url:'/',             expectAction:'VIRTUAL_CLICK', expectTarget:'hero_apply',        mustCache:true, msg:'bấm apply' },
    { id:'V02', url:'/',             expectAction:'VIRTUAL_CLICK', expectTarget:'hero_apply',        mustCache:true, msg:'bấm đăng ký' },
    { id:'V03', url:'/',             expectAction:'VIRTUAL_CLICK', expectTarget:'hero_check_status', mustCache:true, msg:'check status đi' },
    { id:'V04', url:'/',             expectAction:'VIRTUAL_CLICK', expectTarget:'hero_check_status', mustCache:true, msg:'nhấn kiểm tra' },
    { id:'V05', url:'/',             expectAction:'VIRTUAL_CLICK', expectTarget:'chat-toggle',       mustCache:true, msg:'đóng chat' },
    { id:'V06', url:'/',             expectAction:'VIRTUAL_CLICK', expectTarget:'chat-toggle',       mustCache:true, msg:'mở chat lên' },
    { id:'V07', url:'/',             expectAction:'VIRTUAL_CLICK', expectTarget:'continue_to_apply', mustCache:true, msg:'tiếp tục đăng ký' },
    { id:'V08', url:'/',             expectAction:'VIRTUAL_CLICK', expectTarget:'continue_to_apply', mustCache:true, msg:'bấm tiếp tục' },
    { id:'V09', url:'/check-status', expectAction:'VIRTUAL_CLICK', expectTarget:'check_status_submit', mustCache:true, msg:'bấm submit' },
    { id:'V10', url:'/check-status', expectAction:'VIRTUAL_CLICK', expectTarget:'check_status_submit', mustCache:true, msg:'ấn tra cứu đi' },
    // Tiếng Anh ngắn
    { id:'V11', url:'/',             expectAction:'VIRTUAL_CLICK', expectTarget:'hero_apply',        mustCache:true, msg:'click apply now' },
    { id:'V12', url:'/',             expectAction:'VIRTUAL_CLICK', expectTarget:'hero_apply',        mustCache:true, msg:'tap apply' },
    { id:'V13', url:'/',             expectAction:'VIRTUAL_CLICK', expectTarget:'chat-toggle',       mustCache:true, msg:'close the chat' },
    { id:'V14', url:'/',             expectAction:'VIRTUAL_CLICK', expectTarget:'hero_check_status', mustCache:true, msg:'tap check status now' },
    // Biến thể vị trí / phong cách
    { id:'V15', url:'/',             expectAction:'VIRTUAL_CLICK', expectTarget:'cta_apply',         mustCache:true, msg:'bấm apply ở cuối trang' },
    { id:'V16', url:'/',             expectAction:'VIRTUAL_CLICK', expectTarget:'cta_check_status',  mustCache:true, msg:'ấn kiểm tra trạng thái ở dưới cùng' },
    { id:'V17', url:'/',             expectAction:'VIRTUAL_CLICK', expectTarget:'header_check_status', mustCache:true, msg:'ấn nút kiểm tra trạng thái trên cùng' },
    { id:'V18', url:'/apply',        expectAction:'VIRTUAL_CLICK', expectTarget:'next_step2',        mustCache:true, msg:'tiếp tục bước 2' },
    { id:'V19', url:'/emergency-inquiry', expectAction:'VIRTUAL_CLICK', expectTarget:'emergency_submit', mustCache:true, msg:'ấn gửi form khẩn cấp' },
    { id:'V20', url:'/apply',        expectAction:'VIRTUAL_CLICK', expectTarget:'next_step2',        mustCache:true, msg:'proceed to step 2' },
    // Playwright T2 messages (B11-T2 trước bị Gemini, giờ phải NLP Cache)
    { id:'V21', url:'/check-status', expectAction:'VIRTUAL_CLICK', expectTarget:'check_status_submit', mustCache:true, msg:'Bấm Submit để tra cứu trạng thái hồ sơ của tôi' },
    { id:'V22', url:'/emergency-inquiry', expectAction:'VIRTUAL_CLICK', expectTarget:'emergency_submit', mustCache:true, msg:'Bấm Submit để gửi form yêu cầu khẩn cấp của tôi' },
];

// ─── EDGE CASES ───────────────────────────────────────────────────────────────

const EDGES = [
    // Navigate intents (phải NAVIGATE không CLICK)
    { id:'E01', url:'/', expectAction:'NAVIGATE', expectTarget:'/apply',        mustCache:false, msg:'tôi muốn xin visa' },
    { id:'E02', url:'/', expectAction:'NAVIGATE', expectTarget:'/check-status', mustCache:false, msg:'đưa tôi đến trang check status' },
    { id:'E03', url:'/', expectAction:'NAVIGATE', expectTarget:'/contact-us',   mustCache:false, msg:'tôi muốn liên hệ với support' },
    { id:'E04', url:'/apply', expectAction:'NAVIGATE', expectTarget:'/',        mustCache:false, msg:'về trang chủ' },
    // Polite/question — Gemini fallback vẫn phải đúng target
    { id:'E05', url:'/check-status',      expectAction:'VIRTUAL_CLICK', expectTarget:'check_status_submit', mustCache:false, msg:'bạn có thể giúp tôi bấm submit không' },
    { id:'E06', url:'/apply',             expectAction:'VIRTUAL_CLICK', expectTarget:'next_step2',          mustCache:false, msg:'làm ơn nhấn nút tiếp theo cho tôi' },
    { id:'E07', url:'/emergency-inquiry', expectAction:'VIRTUAL_CLICK', expectTarget:'emergency_submit',    mustCache:false, msg:'có thể bấm submit form khẩn cấp giúp tôi không' },
    // Off-topic — NO ACTION
    { id:'E08', url:'/', expectAction:'NO_ACTION', expectTarget:null, mustCache:false, msg:'phí visa điện tử là bao nhiêu' },
    { id:'E09', url:'/', expectAction:'NO_ACTION', expectTarget:null, mustCache:false, msg:'visa mấy ngày thì có kết quả' },
];

// ─── Runner ───────────────────────────────────────────────────────────────────

async function runSuite(label, cases) {
    sep(70,'═');
    log(`${B}${C}${label} (${cases.length} tests)${RST}`);
    sep(70,'═');
    let pass = 0, fail = 0;
    for (const tc of cases) {
        const ok = await runTest(tc);
        if (ok) pass++; else fail++;
        await new Promise(r => setTimeout(r, 250));
    }
    sep(70);
    const icon = fail === 0 ? G : R;
    log(`${icon}${B}RESULT: ${pass}/${cases.length} PASS${fail > 0 ? ` — ${fail} FAIL` : ''}${RST}`);
    return { pass, fail, total: cases.length };
}

async function main() {
    sep(70,'═');
    log(`${B}${Y}=== NLP Full Verification — model-v8 (470 utterances) ===${RST}`);
    sep(70,'═');

    const r1 = await runSuite('TẦNG 1 — Case Chính (17 buttons, mustCache=NLP)', TANG1);
    const r2 = await runSuite('BIẾN THỂ — Case Phụ (variants, short, EN)', VARIANTS);
    const r3 = await runSuite('EDGE CASES — Navigate / Polite / Off-topic', EDGES);

    sep(70,'═');
    log(`${B}${Y}=== TỔNG KẾT ===${RST}`);
    const total  = r1.total + r2.total + r3.total;
    const passed = r1.pass  + r2.pass  + r3.pass;
    const failed = r1.fail  + r2.fail  + r3.fail;
    log(`  Case Chính (TẦNG 1)  : ${r1.pass}/${r1.total}`);
    log(`  Case Phụ  (Biến thể) : ${r2.pass}/${r2.total}`);
    log(`  Edge Cases           : ${r3.pass}/${r3.total}`);
    sep(70);
    const icon = failed === 0 ? G : R;
    log(`${icon}${B}OVERALL: ${passed}/${total} PASS${RST}`);
    sep(70,'═');
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
