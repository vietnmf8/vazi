/**
 * verify-nlp-scroll.mjs — NLP Verification cho Scroll To Element (Track B Feature #4)
 *
 * Xác nhận các intent liên quan đến scroll target (cta_apply, cta_check_status)
 * và guard target (hero_apply, hero_check_status) hoạt động đúng trong NLP Cache.
 *
 * Cấu trúc:
 *   SUITE 1 — Canonical (mustCache=true): utterance đã có trong model
 *   SUITE 2 — Biến thể mới (mustCache=false): có thể NLP hoặc Gemini
 *   SUITE 3 — Guard in-viewport (mustCache=true): confirm không regression
 *   SUITE 4 — Edge Cases: polite + off-topic với từ khóa "cuối trang"
 *
 * Chạy: node scripts/verify-nlp-scroll.mjs
 */

import 'dotenv/config';
import http from 'http';

const HOST = '127.0.0.1', PORT = 5000;
const G='\x1b[32m', R='\x1b[31m', Y='\x1b[33m', C='\x1b[36m', B='\x1b[1m', RST='\x1b[0m';
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

async function streamMsg(sid, msg, url = '/') {
    const lang = /[àáâãèéêìíòóôõùúýăđơưÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚÝĂĐƠƯ]/.test(msg) ? 'vi' : 'en';
    const body = JSON.stringify({
        session_id: sid, message: msg, sender: 'USER', message_type: 'TEXT',
        current_url: url, page_content: '', page_context: '[]', website_language: lang,
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
    const r = await httpPost('/api/v1/chat/join', { user_name: 'NLPScrollVerify' });
    const sid = r.data.session_id;
    const t0 = Date.now();
    const events = await streamMsg(sid, tc.msg, tc.url ?? '/');
    const ms = Date.now() - t0;

    const vc    = events.find(e => e.action === 'VIRTUAL_CLICK');
    const nav   = events.find(e => e.action === 'NAVIGATION');
    const cache = events.find(e => e.intent);       // intent chỉ có trong NLP Cache SSE
    const layer = cache ? `NLP(${ms}ms)` : `Gemini(${ms}ms)`;

    let pass, actual;
    if (tc.expectAction === 'VIRTUAL_CLICK') {
        pass   = vc?.target === tc.expectTarget;
        actual = vc ? `CLICK:${vc.target}` : (nav ? `NAV:${nav.path}` : 'NO_ACTION');
    } else if (tc.expectAction === 'NO_ACTION') {
        pass   = !vc && !nav;
        actual = vc ? `CLICK:${vc.target}` : (nav ? `NAV:${nav.destination}` : 'NO_ACTION');
    } else {
        pass   = false;
        actual = 'UNKNOWN';
    }

    const cacheOk = tc.mustCache ? !!cache : true;
    const ok      = pass && cacheOk;

    const icon  = ok ? `${G}✅${RST}` : `${R}❌${RST}`;
    const lstr  = cache ? `${G}${layer}${RST}` : `${Y}${layer}${RST}`;
    const xpect = tc.expectAction === 'VIRTUAL_CLICK' ? `CLICK:${tc.expectTarget}` : 'NO_ACTION';
    log(`${icon} [${tc.id}] ${lstr} | got=${actual} | expect=${xpect}`);
    if (!pass)    log(`   ${R}→ Wrong action/target${RST}`);
    if (!cacheOk) log(`   ${Y}→ Expected NLP Cache HIT but got Gemini${RST}`);
    return ok;
}

// ─────────────────────────────────────────────────────────────────
// SUITE 1 — Canonical scroll targets (đã cache, mustCache=true)
// ─────────────────────────────────────────────────────────────────

const SUITE1_CANONICAL = [
    { id:'SC01', url:'/', expectAction:'VIRTUAL_CLICK', expectTarget:'cta_apply',
      mustCache:true,  msg:'Bấm nút Apply Now ở phần CTA cuối trang chủ' },
    { id:'SC02', url:'/', expectAction:'VIRTUAL_CLICK', expectTarget:'cta_check_status',
      mustCache:true,  msg:'Nhấn nút Check Status ở phần cuối trang (CTA section)' },
    { id:'SV01', url:'/', expectAction:'VIRTUAL_CLICK', expectTarget:'cta_apply',
      mustCache:true,  msg:'bấm apply ở cuối trang' },
    { id:'SV05', url:'/', expectAction:'VIRTUAL_CLICK', expectTarget:'cta_check_status',
      mustCache:true,  msg:'ấn kiểm tra trạng thái ở dưới cùng' },
];

// ─────────────────────────────────────────────────────────────────
// SUITE 2 — Biến thể mới (mustCache=false, Gemini/NLP tuỳ model)
// ─────────────────────────────────────────────────────────────────

const SUITE2_VARIANTS = [
    { id:'SV02', url:'/', expectAction:'VIRTUAL_CLICK', expectTarget:'cta_apply',
      mustCache:false, msg:'click vào nút đăng ký ở phần dưới cùng trang chủ' },
    { id:'SV03', url:'/', expectAction:'VIRTUAL_CLICK', expectTarget:'cta_apply',
      mustCache:false, msg:'click apply now at the bottom of the page' },
    { id:'SV04', url:'/', expectAction:'VIRTUAL_CLICK', expectTarget:'cta_apply',
      mustCache:false, msg:'nhấn apply phía cuối trang' },
    { id:'SV06', url:'/', expectAction:'VIRTUAL_CLICK', expectTarget:'cta_check_status',
      mustCache:false, msg:'bấm nút check status ở khu vực CTA section phía cuối trang' },
    { id:'SV07', url:'/', expectAction:'VIRTUAL_CLICK', expectTarget:'cta_check_status',
      mustCache:false, msg:'hit check status button at the bottom of the page' },
];

// ─────────────────────────────────────────────────────────────────
// SUITE 3 — Guard in-viewport (mustCache=true, confirm không regression)
// ─────────────────────────────────────────────────────────────────

const SUITE3_GUARD = [
    { id:'SG01', url:'/', expectAction:'VIRTUAL_CLICK', expectTarget:'hero_apply',
      mustCache:true,  msg:'Bấm nút Apply Now to lớn ở giữa trang chủ cho tôi' },
    { id:'SG02', url:'/', expectAction:'VIRTUAL_CLICK', expectTarget:'hero_check_status',
      mustCache:true,  msg:'Nhấn nút Check Status ngay trong phần hero ở trang chủ' },
    { id:'SG03', url:'/', expectAction:'VIRTUAL_CLICK', expectTarget:'btn-apply-header',
      mustCache:true,  msg:'Bấm nút Apply Now trên thanh điều hướng header ở trên cùng' },
];

// ─────────────────────────────────────────────────────────────────
// SUITE 4 — Edge Cases scroll: polite + off-topic với "cuối trang"
// ─────────────────────────────────────────────────────────────────

const SUITE4_EDGES = [
    // Polite — isQuestion Guard chặn NLP, Gemini fallback vẫn phải click đúng
    { id:'SE01', url:'/', expectAction:'VIRTUAL_CLICK', expectTarget:'cta_apply',
      mustCache:false, msg:'bạn có thể giúp tôi nhấn apply ở cuối trang không' },
    { id:'SE02', url:'/', expectAction:'VIRTUAL_CLICK', expectTarget:'cta_check_status',
      mustCache:false, msg:'có thể bấm check status ở phần dưới trang giúp tôi được không' },
    // Off-topic — có từ "cuối trang" nhưng không phải lệnh click → NO_ACTION
    { id:'SE03', url:'/', expectAction:'NO_ACTION', expectTarget: null,
      mustCache:false, msg:'nút apply ở cuối trang có màu gì' },
];

// ─────────────────────────────────────────────────────────────────
// Runner
// ─────────────────────────────────────────────────────────────────

async function runSuite(label, cases) {
    sep(70, '═');
    log(`${B}${C}${label} (${cases.length} tests)${RST}`);
    sep(70, '═');
    let pass = 0, fail = 0;
    for (const tc of cases) {
        const ok = await runTest(tc);
        if (ok) pass++; else fail++;
        await new Promise(r => setTimeout(r, 300));
    }
    sep(70);
    const color = fail === 0 ? G : R;
    log(`${color}${B}RESULT: ${pass}/${cases.length} PASS${fail > 0 ? ` — ${fail} FAIL` : ''}${RST}`);
    return { pass, fail, total: cases.length };
}

async function main() {
    sep(70, '═');
    log(`${B}${Y}=== NLP SCROLL VERIFY — Track B Feature #4 ===${RST}`);
    log(`SC=canonical, SV=biến thể, SG=guard(in-viewport), SE=edge`);
    sep(70, '═');

    const r1 = await runSuite('SUITE 1 — Canonical scroll targets (mustCache=NLP)',    SUITE1_CANONICAL);
    const r2 = await runSuite('SUITE 2 — Biến thể mới (NLP hoặc Gemini)',               SUITE2_VARIANTS);
    const r3 = await runSuite('SUITE 3 — Guard in-viewport (mustCache=NLP, no regression)', SUITE3_GUARD);
    const r4 = await runSuite('SUITE 4 — Edge Cases: polite + off-topic "cuối trang"',  SUITE4_EDGES);

    sep(70, '═');
    log(`${B}${Y}=== TỔNG KẾT ===${RST}`);
    const total  = r1.total + r2.total + r3.total + r4.total;
    const passed = r1.pass  + r2.pass  + r3.pass  + r4.pass;
    const failed = r1.fail  + r2.fail  + r3.fail  + r4.fail;
    log(`  Suite 1 — Canonical  : ${r1.pass}/${r1.total}`);
    log(`  Suite 2 — Biến thể   : ${r2.pass}/${r2.total}`);
    log(`  Suite 3 — Guard      : ${r3.pass}/${r3.total}`);
    log(`  Suite 4 — Edge Cases : ${r4.pass}/${r4.total}`);
    sep(70);
    const color = failed === 0 ? G : R;
    log(`${color}${B}OVERALL: ${passed}/${total} PASS${RST}`);
    sep(70, '═');

    process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
