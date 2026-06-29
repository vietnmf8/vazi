/**
 * e2e-and-cache-ambiguous.mjs
 *
 * Test các case "mơ hồ" (không chỉ định vị trí nút):
 *   "Nhấn vào nút đăng ký ngay" → hero_apply (mặc định)
 *   "Nhấn check status" → hero_check_status (mặc định)
 *   v.v.
 *
 * Sau khi tất cả pass → thêm utterances vào NLP Cache và retrain.
 *
 * Chạy: node scripts/e2e-and-cache-ambiguous.mjs
 */

import 'dotenv/config';
import http from 'http';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const G='\x1b[32m',R='\x1b[31m',Y='\x1b[33m',C='\x1b[36m',M='\x1b[35m',D='\x1b[2m',RST='\x1b[0m',B='\x1b[1m';
const ts=()=>new Date().toISOString().slice(11,23);
const log=(...a)=>console.log(`[${ts()}]`,...a);
const sep=(n=70,c='─')=>console.log(c.repeat(n));

const HOST='127.0.0.1', PORT=5000;

function httpPost(path, body) {
    const raw = JSON.stringify(body);
    return new Promise((resolve, reject) => {
        const req = http.request(
            { hostname:HOST, port:PORT, path, method:'POST',
              headers:{ 'Content-Type':'application/json', 'Content-Length':Buffer.byteLength(raw) } },
            (res) => { let d=''; res.on('data',c=>d+=c); res.on('end',()=>resolve(JSON.parse(d))); }
        );
        req.on('error',reject); req.write(raw); req.end();
    });
}

async function createSession() {
    const r = await httpPost('/api/v1/chat/join', { user_name:'AmbiguousTestBot' });
    return r.data.session_id;
}

function streamMessage(sid, msg, url='/') {
    const body = JSON.stringify({ session_id:sid, message:msg, sender:'USER', message_type:'TEXT',
        current_url:url, page_content:'', page_context:'[]', website_language:'vi' });
    return new Promise((resolve, reject) => {
        const req = http.request(
            { hostname:HOST, port:PORT, path:'/api/v1/chat/message/stream', method:'POST',
              headers:{ 'Content-Type':'application/json', 'Content-Length':Buffer.byteLength(body), Accept:'text/event-stream' } },
            (res) => {
                const events=[]; let buf='', fullText='';
                res.on('data', chunk => {
                    buf += chunk;
                    const lines = buf.split('\n'); buf = lines.pop() ?? '';
                    for (const l of lines) {
                        if (!l.startsWith('data: ')) continue;
                        try {
                            const d = JSON.parse(l.slice(6)); events.push(d);
                            if (d.chunk) fullText += d.chunk;
                            if (d.action) log(`  ${M}[ACTION] ${JSON.stringify(d)}${RST}`);
                        } catch {}
                    }
                });
                res.on('end', () => resolve({ events, fullText }));
                res.on('error', reject);
            }
        );
        req.on('error',reject); req.write(body); req.end();
    });
}

// ─── Test cases ────────────────────────────────────────────────────
// Mỗi case là câu "mơ hồ" — không chỉ định vị trí nút rõ ràng.
// Sau khi fix tool description, AI phải tự chọn đúng mặc định.

const TESTS = [
    // ── Đăng ký ngay / Apply Now ──
    {
        id:'A01', target:'hero_apply',
        desc:'Không chỉ định vị trí → mặc định hero_apply',
        msg:'Nhấn vào nút đăng ký ngay',
        url:'/',
    },
    {
        id:'A02', target:'hero_apply',
        desc:'Nói "trên màn hình" → vẫn hero_apply (hero là CTA chính nhìn thấy đầu tiên)',
        msg:'Nhấn vào nút đăng ký ngay trên màn hình',
        url:'/',
    },
    {
        id:'A03', target:'hero_apply',
        desc:'Cách nói ngắn "bấm đăng ký ngay" → hero_apply',
        msg:'Bấm đăng ký ngay',
        url:'/',
    },
    {
        id:'A04', target:'hero_apply',
        desc:'Tiếng Việt thuần "nhấn nút đăng ký" → hero_apply',
        msg:'Nhấn nút đăng ký',
        url:'/',
    },
    {
        id:'A05', target:'hero_apply',
        desc:'English ambiguous "click apply now" → hero_apply',
        msg:'Click apply now for me',
        url:'/',
    },

    // ── Check Status ──
    {
        id:'A06', target:'hero_check_status',
        desc:'Không chỉ định vị trí → mặc định hero_check_status',
        msg:'Nhấn vào nút kiểm tra trạng thái',
        url:'/',
    },
    {
        id:'A07', target:'hero_check_status',
        desc:'"Bấm check status" không chỉ định → hero_check_status',
        msg:'Bấm check status',
        url:'/',
    },
];

// ─── Assertions ────────────────────────────────────────────────────

let passed=0, failed=0;
const failures=[];

function assertVirtualClick(events, expectedTarget, id) {
    const vc = events.find(e => e.action === 'VIRTUAL_CLICK');
    const ok = vc?.target === expectedTarget;
    if (ok) {
        log(`${G}  ✅ PASS${RST} — VIRTUAL_CLICK target="${expectedTarget}"`);
        passed++;
    } else {
        const got = vc
            ? `VIRTUAL_CLICK target="${vc.target}"`
            : (events.find(e=>e.action) ? JSON.stringify(events.filter(e=>e.action)) : 'NO ACTION');
        log(`${R}  ❌ FAIL${RST} — expected="${expectedTarget}" | got: ${got}`);
        failed++;
        failures.push({ id, expected: expectedTarget, got });
    }
}

// ─── Phase 1: Run tests ────────────────────────────────────────────

async function runTests() {
    sep(70,'═');
    log(`${B}${Y}=== PHASE 1: E2E TEST — AMBIGUOUS CASES (${TESTS.length} cases) ===${RST}`);
    log(`${D}Kiểm tra AI có tự chọn đúng nút mặc định mà không hỏi lại user không${RST}`);
    sep(70,'═');

    for (const tc of TESTS) {
        sep(55);
        log(`${C}${B}[${tc.id}] ${tc.desc}${RST}`);
        log(`${D}  msg: "${tc.msg}" | expected: ${tc.target}${RST}`);
        try {
            const sid = await createSession();
            const result = await streamMessage(sid, tc.msg, tc.url);
            const preview = result.fullText.slice(0,80).replace(/<!--[\s\S]*?-->/g,'').trim();
            if (preview) log(`  AI: "${preview}"`);
            assertVirtualClick(result.events, tc.target, tc.id);
        } catch (err) {
            log(`${R}  💥 ERROR: ${err.message}${RST}`);
            failed++;
            failures.push({ id: tc.id, expected: tc.target, got: 'ERROR: '+err.message });
        }
        await new Promise(r => setTimeout(r, 300));
    }

    sep(70,'═');
    const total = passed + failed;
    log(`${failed===0?G:R}${B}PHASE 1 KẾT QUẢ: ${passed}/${total} PASS${RST}`);
    if (failures.length > 0) {
        sep(40);
        log(`${R}${B}THẤT BẠI:${RST}`);
        for (const f of failures) log(`  ${R}[${f.id}]${RST} expected="${f.expected}" | got="${f.got}"`);
    }
    sep(70,'═');
    return failed === 0;
}

// ─── Phase 2: Thêm utterances vào NLP Cache ────────────────────────
// Các utterance này được gắn vào intent có sẵn (click.hero_apply, click.hero_check_status)

const NEW_UTTERANCES = [
    // ── hero_apply — các cách nói mơ hồ ──
    { intentName: 'click.hero_apply', utterances: [
        { text: 'nhấn vào nút đăng ký ngay', lang: 'vi' },
        { text: 'nhấn vào nút đăng ký ngay trên màn hình', lang: 'vi' },
        { text: 'bấm đăng ký ngay', lang: 'vi' },
        { text: 'nhấn nút đăng ký', lang: 'vi' },
        { text: 'bấm vào đăng ký', lang: 'vi' },
        { text: 'click apply now for me', lang: 'en' },
        { text: 'nhấn apply now', lang: 'vi' },
        { text: 'bấm apply now', lang: 'vi' },
    ]},
    // ── hero_check_status — các cách nói mơ hồ ──
    { intentName: 'click.hero_check_status', utterances: [
        { text: 'nhấn vào nút kiểm tra trạng thái', lang: 'vi' },
        { text: 'bấm check status', lang: 'vi' },
        { text: 'nhấn check status', lang: 'vi' },
        { text: 'bấm kiểm tra trạng thái', lang: 'vi' },
        { text: 'click check status', lang: 'en' },
    ]},
];

async function seedNewUtterances() {
    const prisma = require('../dist/lib/prisma.js').default;

    log(`\n${B}${Y}=== PHASE 2: THÊM UTTERANCES MỚI VÀO NLP CACHE ===${RST}`);
    sep(70,'═');

    let insertedCount = 0, skippedCount = 0;

    for (const group of NEW_UTTERANCES) {
        const intent = await prisma.nlpIntent.findFirst({ where: { name: group.intentName } });
        if (!intent) {
            log(`${R}  ❌ Intent "${group.intentName}" không tồn tại — bỏ qua${RST}`);
            log(`${Y}  → Chạy e2e-and-cache-buttons.mjs trước để tạo 17 intents ban đầu${RST}`);
            continue;
        }
        log(`${C}  Intent "${group.intentName}" (id=${intent.id})${RST}`);

        for (const utt of group.utterances) {
            const exists = await prisma.nlpUtterance.findFirst({
                where: { intentId: intent.id, text: utt.text }
            });
            if (exists) {
                log(`${D}    [SKIP] "${utt.text}"${RST}`);
                skippedCount++;
            } else {
                await prisma.nlpUtterance.create({
                    data: { intentId: intent.id, text: utt.text, language: utt.lang,
                            isSeeded: true, usedInTraining: false }
                });
                log(`${G}    [+] "${utt.text}"${RST}`);
                insertedCount++;
            }
        }
    }

    log(`\n  ${G}Inserted: ${insertedCount} utterances mới${RST}`);
    log(`  ${D}Skipped (đã tồn tại): ${skippedCount}${RST}`);
    await prisma.$disconnect();
}

async function triggerRetrain() {
    const prisma = require('../dist/lib/prisma.js').default;
    const { NLPClassifierService } = require('../dist/services/chatbot/nlp-classifier.service.js');

    log(`\n${B}${Y}=== PHASE 3: RETRAIN NLP MODEL ===${RST}`);
    sep(70,'═');
    log(`  Đang retrain... (có thể mất 20-60 giây)`);

    const classifier = NLPClassifierService.getInstance();
    await classifier.train();

    log(`${G}${B}  ✅ Retrain hoàn tất!${RST}`);
    log(`  Các câu mơ hồ giờ sẽ được phục vụ từ NLP Cache — không cần Gemini AI`);
    await prisma.$disconnect();
}

// ─── Main ──────────────────────────────────────────────────────────

async function main() {
    const allPass = await runTests();

    if (!allPass) {
        sep(70,'═');
        log(`${R}${B}❌ CÓ TEST FAIL — DỪNG LẠI, không insert cache.${RST}`);
        log(`${Y}Kiểm tra tool description trong click-ui-element.tool.ts và restart API server.${RST}`);
        sep(70,'═');
        process.exit(1);
    }

    log(`\n${G}${B}✅ TẤT CẢ ${TESTS.length} CASES PASS — Bắt đầu insert NLP Cache...${RST}`);

    await seedNewUtterances();
    await triggerRetrain();

    sep(70,'═');
    log(`${G}${B}🎉 HOÀN TẤT!${RST}`);
    log(`${G}  Các câu "mơ hồ" nay được NLP Cache — phản hồi NGAY LẬP TỨC${RST}`);
    log(`${G}  Ví dụ: "nhấn đăng ký ngay" → hero_apply (không hỏi lại user)${RST}`);
    sep(70,'═');
    process.exit(0);
}

main().catch(e => {
    console.error(`${R}${B}Fatal: ${e.message}${RST}`, e);
    process.exit(1);
});
