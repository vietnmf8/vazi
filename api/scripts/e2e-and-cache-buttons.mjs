/**
 * e2e-and-cache-buttons.mjs
 *
 * Bước 1: Chạy 17 button tests + 4 edge cases (21 assertions)
 * Bước 2: Nếu TẤT CẢ pass → insert NlpIntent + NlpUtterance → retrain model
 *
 * Chạy: node scripts/e2e-and-cache-buttons.mjs
 */

import 'dotenv/config';
import http from 'http';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// ─── Colors ──────────────────────────────────────────────────────
const G='\x1b[32m',R='\x1b[31m',Y='\x1b[33m',C='\x1b[36m',M='\x1b[35m',D='\x1b[2m',RST='\x1b[0m',B='\x1b[1m';
const ts=()=>new Date().toISOString().slice(11,23);
const log=(...a)=>console.log(`[${ts()}]`,...a);
const sep=(n=70,c='─')=>console.log(c.repeat(n));

// ─── HTTP helpers ─────────────────────────────────────────────────
const HOST='127.0.0.1', PORT=5000;

function httpPost(path, body) {
    const raw = JSON.stringify(body);
    return new Promise((resolve, reject) => {
        const req = http.request(
            { hostname: HOST, port: PORT, path, method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(raw) } },
            (res) => { let d=''; res.on('data',c=>d+=c); res.on('end',()=>resolve(JSON.parse(d))); }
        );
        req.on('error', reject); req.write(raw); req.end();
    });
}

async function createSession() {
    const r = await httpPost('/api/v1/chat/join', { user_name: 'E2ECacheBot' });
    return r.data.session_id;
}

function streamMessage(sid, msg, url='/', lang='vi') {
    const body = JSON.stringify({ session_id:sid, message:msg, sender:'USER', message_type:'TEXT',
        current_url:url, page_content:'', page_context:'[]', website_language:lang });
    return new Promise((resolve, reject) => {
        const req = http.request(
            { hostname: HOST, port: PORT, path: '/api/v1/chat/message/stream', method: 'POST',
              headers: { 'Content-Type':'application/json', 'Content-Length':Buffer.byteLength(body), Accept:'text/event-stream' } },
            (res) => {
                const events=[]; let buf='', fullText='';
                res.on('data', c => {
                    buf += c; const lines=buf.split('\n'); buf=lines.pop()??'';
                    for (const l of lines) {
                        if (!l.startsWith('data: ')) continue;
                        try { const d=JSON.parse(l.slice(6)); events.push(d);
                            if(d.chunk) fullText+=d.chunk;
                            if(d.action) log(`  ${M}[ACTION] ${JSON.stringify(d)}${RST}`);
                        } catch {}
                    }
                });
                res.on('end', () => resolve({ events, fullText }));
                res.on('error', reject);
            }
        );
        req.on('error', reject); req.write(body); req.end();
    });
}

// ─── Test data ────────────────────────────────────────────────────

const BUTTON_TESTS = [
    // ══ TRANG CHỦ ══
    { id:'B01', target:'hero_apply',           msg:'Bấm nút Apply Now to lớn ở giữa trang chủ cho tôi',         url:'/' },
    { id:'B02', target:'hero_check_status',    msg:'Nhấn nút Check Status ngay trong phần hero ở trang chủ',    url:'/' },
    { id:'B03', target:'btn-apply-header',     msg:'Bấm nút Apply Now trên thanh điều hướng header ở trên cùng',url:'/' },
    { id:'B04', target:'header_check_status',  msg:'Click vào link Check Status trên thanh header',              url:'/' },
    { id:'B05', target:'lang-selector',        msg:'Nhấn nút chọn ngôn ngữ trên header để đổi sang tiếng Anh',  url:'/' },
    { id:'B06', target:'chat-toggle',          msg:'Đóng widget chat này lại',                                   url:'/' },
    { id:'B07', target:'cta_apply',            msg:'Bấm nút Apply Now ở phần CTA cuối trang chủ',               url:'/' },
    { id:'B08', target:'cta_check_status',     msg:'Nhấn nút Check Status ở phần cuối trang (CTA section)',     url:'/' },
    { id:'B09', target:'continue_to_apply',    msg:'Bấm nút Continue to Apply để tiến vào form đăng ký',        url:'/' },
    // ══ HOW TO APPLY ══
    { id:'B10', target:'how_to_apply_start',   msg:'Nhấn nút màu cam ở trang hướng dẫn visa',                   url:'/how-to-apply' },
    // ══ CHECK STATUS ══
    { id:'B11', target:'check_status_submit',  msg:'Nhấn nút Submit màu xanh trong form check status giúp tôi', url:'/check-status' },
    // ══ CONTACT US ══
    { id:'B12', target:'contact_submit',       msg:'Nhấn nút Send để gửi form liên hệ',                         url:'/contact-us' },
    // ══ EMERGENCY ══
    { id:'B13', target:'emergency_submit',     msg:'Bấm Submit để gửi form yêu cầu khẩn cấp',                   url:'/emergency-inquiry' },
    { id:'B14', target:'emergency_correction_whatsapp', msg:'Bấm nút WhatsApp màu xanh lá để sửa thông tin hồ sơ', url:'/emergency-inquiry' },
    // ══ FAQS ══
    { id:'B15', target:'faqs_submit_question', msg:'Click nút Submit Question trong trang FAQs để gửi câu hỏi', url:'/faqs' },
    // ══ APPLY FLOW ══
    { id:'B16', target:'next_step2',           msg:'Nhấn Next để chuyển sang bước 2 trong form nộp đơn',         url:'/apply' },
    // ══ MOBILE ══
    { id:'B17', target:'header_mobile_menu',   msg:'Mở menu hamburger trên điện thoại',                          url:'/' },
];

const EDGE_TESTS = [
    {
        id:'E1', desc:'Câu chào hỏi → text only, không có action',
        msg:'Xin chào bạn, bạn là ai vậy?', url:'/',
        checks:[
            { label:'Không có VIRTUAL_CLICK', fn:({events})=>!events.some(e=>e.action==='VIRTUAL_CLICK') },
            { label:'Không có NAVIGATION',    fn:({events})=>!events.some(e=>e.action==='NAVIGATION') },
            { label:'AI có trả lời text',     fn:({fullText})=>fullText.trim().length>10 },
        ],
    },
    {
        id:'E2', desc:'Hỏi giá visa → text only, không có cursor',
        msg:'Visa e-visa Việt Nam giá bao nhiêu?', url:'/',
        checks:[
            { label:'Không có VIRTUAL_CLICK', fn:({events})=>!events.some(e=>e.action==='VIRTUAL_CLICK') },
            { label:'Không có NAVIGATION',    fn:({events})=>!events.some(e=>e.action==='NAVIGATION') },
            { label:'AI trả lời thông tin giá',fn:({fullText})=>fullText.trim().length>20 },
        ],
    },
    {
        id:'E3', desc:'"Cho tôi đến trang liên hệ" → NAVIGATION /contact-us, không có cursor',
        msg:'Cho tôi đến trang liên hệ', url:'/',
        checks:[
            { label:'Có NAVIGATION đến /contact-us',       fn:({events})=>events.some(e=>e.action==='NAVIGATION'&&e.destination==='/contact-us') },
            { label:'Không có VIRTUAL_CLICK',               fn:({events})=>!events.some(e=>e.action==='VIRTUAL_CLICK') },
        ],
    },
    {
        id:'E4', desc:'"Kiểm tra trạng thái hồ sơ VN123456" → KHÔNG có cursor (navigate hoặc text)',
        msg:'Kiểm tra trạng thái hồ sơ VN123456', url:'/',
        checks:[
            { label:'Không có VIRTUAL_CLICK',               fn:({events})=>!events.some(e=>e.action==='VIRTUAL_CLICK') },
            { label:'AI hoặc NLP có xử lý (text hoặc NAVIGATION)',
              fn:({events,fullText})=>fullText.trim().length>5||events.some(e=>e.action==='NAVIGATION') },
        ],
    },
];

// ─── Assertion helpers ────────────────────────────────────────────

let passed=0, failed=0;
const failures=[];

function assertVirtualClick(events, expectedTarget, id) {
    const vc=events.find(e=>e.action==='VIRTUAL_CLICK');
    const ok=vc?.target===expectedTarget;
    if(ok){ log(`${G}  ✅ PASS${RST} — VIRTUAL_CLICK target="${expectedTarget}"`); passed++; }
    else {
        const got=vc?`VIRTUAL_CLICK target="${vc.target}"`:(events.find(e=>e.action)?JSON.stringify(events.filter(e=>e.action)):'NO ACTION');
        log(`${R}  ❌ FAIL${RST} — expected="${expectedTarget}" | got: ${got}`);
        failed++; failures.push({id, expected:expectedTarget, got});
    }
}

function assertEdge(tc, result) {
    for (const ch of tc.checks) {
        const ok=ch.fn(result);
        if(ok){ log(`${G}  ✅ PASS${RST} — ${ch.label}`); passed++; }
        else {
            const allA=result.events.filter(e=>e.action);
            log(`${R}  ❌ FAIL${RST} — ${ch.label} | actions: ${JSON.stringify(allA)}`);
            failed++; failures.push({id:tc.id, label:ch.label});
        }
    }
}

// ─── Phase 1: Run all tests ───────────────────────────────────────

async function runAllTests() {
    sep(70,'═');
    log(`${B}${Y}=== PHASE 1: E2E TEST — 17 BUTTONS + 4 EDGE CASES ===${RST}`);
    sep(70,'═');

    // 17 button tests
    log(`\n${C}${B}── BUTTON TESTS (17) ──${RST}`);
    for (const tc of BUTTON_TESTS) {
        sep(55);
        log(`${C}${B}[${tc.id}] target="${tc.target}"${RST}`);
        log(`${D}  msg: "${tc.msg}" | url: ${tc.url}${RST}`);
        try {
            const sid=await createSession();
            const result=await streamMessage(sid, tc.msg, tc.url);
            log(`  AI: "${result.fullText.slice(0,70).replace(/<!--[\s\S]*?-->/g,'').trim()}..."`);
            assertVirtualClick(result.events, tc.target, tc.id);
        } catch(err) {
            log(`${R}  💥 ERROR: ${err.message}${RST}`);
            failed++; failures.push({id:tc.id, expected:tc.target, got:'ERROR:'+err.message});
        }
        await new Promise(r=>setTimeout(r,300));
    }

    // 4 edge cases
    log(`\n${C}${B}── EDGE CASES (4) ──${RST}`);
    for (const tc of EDGE_TESTS) {
        sep(55);
        log(`${C}${B}[${tc.id}] ${tc.desc}${RST}`);
        log(`${D}  msg: "${tc.msg}"${RST}`);
        try {
            const sid=await createSession();
            const result=await streamMessage(sid, tc.msg, tc.url);
            const preview=result.fullText.slice(0,80).replace(/<!--[\s\S]*?-->/g,'').trim();
            if(preview) log(`  AI: "${preview}..."`);
            assertEdge(tc, result);
        } catch(err) {
            log(`${R}  💥 ERROR: ${err.message}${RST}`);
            for(const ch of tc.checks){failed++;failures.push({id:tc.id,label:ch.label,got:'ERROR'});}
        }
        await new Promise(r=>setTimeout(r,300));
    }

    sep(70,'═');
    const total=passed+failed;
    log(`${failed===0?G:R}${B}PHASE 1 KẾT QUẢ: ${passed}/${total} PASS${RST}`);
    if(failures.length>0){
        sep(40);
        log(`${R}${B}THẤT BẠI:${RST}`);
        for(const f of failures) log(`  ${R}[${f.id}]${RST} expected="${f.expected??''}" | got="${f.got??f.label??''}"`);
    }
    sep(70,'═');
    return failed===0;
}

// ─── Phase 2: Insert NLP Cache ────────────────────────────────────

const NLP_INTENTS = [
    // Mỗi button → 1 NlpIntent + 3 utterances (vi, vi alt, en)
    { name:'click.hero_apply',           payload:{ action:'VIRTUAL_CLICK', target:'hero_apply' },
      utterances:[
        {text:'bấm nút apply now to lớn ở giữa trang chủ cho tôi', lang:'vi'},
        {text:'nhấn nút apply now hero section', lang:'vi'},
        {text:'click the big apply now button on the hero', lang:'en'},
      ]},
    { name:'click.hero_check_status',    payload:{ action:'VIRTUAL_CLICK', target:'hero_check_status' },
      utterances:[
        {text:'nhấn nút check status ngay trong phần hero ở trang chủ', lang:'vi'},
        {text:'bấm check status trong hero banner', lang:'vi'},
        {text:'click check status in the hero section', lang:'en'},
      ]},
    { name:'click.btn_apply_header',     payload:{ action:'VIRTUAL_CLICK', target:'btn-apply-header' },
      utterances:[
        {text:'bấm nút apply now trên thanh điều hướng header ở trên cùng', lang:'vi'},
        {text:'click nút apply now trên header', lang:'vi'},
        {text:'click the apply now button in the header', lang:'en'},
      ]},
    { name:'click.header_check_status',  payload:{ action:'VIRTUAL_CLICK', target:'header_check_status' },
      utterances:[
        {text:'click vào link check status trên thanh header', lang:'vi'},
        {text:'nhấn link check status trên header', lang:'vi'},
        {text:'click the check status link in the header', lang:'en'},
      ]},
    { name:'click.lang_selector',        payload:{ action:'VIRTUAL_CLICK', target:'lang-selector' },
      utterances:[
        {text:'nhấn nút chọn ngôn ngữ trên header để đổi sang tiếng anh', lang:'vi'},
        {text:'bấm nút language selector trên header', lang:'vi'},
        {text:'click the language selector button', lang:'en'},
      ]},
    { name:'click.chat_toggle',          payload:{ action:'VIRTUAL_CLICK', target:'chat-toggle' },
      utterances:[
        {text:'đóng widget chat này lại', lang:'vi'},
        {text:'mở hoặc đóng chat widget', lang:'vi'},
        {text:'toggle the chat widget', lang:'en'},
      ]},
    { name:'click.cta_apply',            payload:{ action:'VIRTUAL_CLICK', target:'cta_apply' },
      utterances:[
        {text:'bấm nút apply now ở phần cta cuối trang chủ', lang:'vi'},
        {text:'nhấn apply now cuối trang', lang:'vi'},
        {text:'click apply now in the cta section', lang:'en'},
      ]},
    { name:'click.cta_check_status',     payload:{ action:'VIRTUAL_CLICK', target:'cta_check_status' },
      utterances:[
        {text:'nhấn nút check status ở phần cuối trang cta section', lang:'vi'},
        {text:'bấm check status ở cta cuối trang', lang:'vi'},
        {text:'click check status in the cta section', lang:'en'},
      ]},
    { name:'click.continue_to_apply',    payload:{ action:'VIRTUAL_CLICK', target:'continue_to_apply' },
      utterances:[
        {text:'bấm nút continue to apply để tiến vào form đăng ký', lang:'vi'},
        {text:'nhấn continue to apply trong quick apply form', lang:'vi'},
        {text:'click continue to apply button', lang:'en'},
      ]},
    { name:'click.how_to_apply_start',   payload:{ action:'VIRTUAL_CLICK', target:'how_to_apply_start' },
      utterances:[
        {text:'nhấn nút màu cam ở trang hướng dẫn visa', lang:'vi'},
        {text:'bấm nút bắt đầu trên trang how to apply', lang:'vi'},
        {text:'click the start button on the how to apply page', lang:'en'},
      ]},
    { name:'click.check_status_submit',  payload:{ action:'VIRTUAL_CLICK', target:'check_status_submit' },
      utterances:[
        {text:'nhấn nút submit màu xanh trong form check status giúp tôi', lang:'vi'},
        {text:'bấm submit trong form kiểm tra trạng thái', lang:'vi'},
        {text:'click submit in the check status form', lang:'en'},
      ]},
    { name:'click.contact_submit',       payload:{ action:'VIRTUAL_CLICK', target:'contact_submit' },
      utterances:[
        {text:'nhấn nút send để gửi form liên hệ', lang:'vi'},
        {text:'bấm nút send trong contact form', lang:'vi'},
        {text:'click send to submit the contact form', lang:'en'},
      ]},
    { name:'click.emergency_submit',     payload:{ action:'VIRTUAL_CLICK', target:'emergency_submit' },
      utterances:[
        {text:'bấm submit để gửi form yêu cầu khẩn cấp', lang:'vi'},
        {text:'nhấn submit trong emergency form', lang:'vi'},
        {text:'click submit on the emergency inquiry form', lang:'en'},
      ]},
    { name:'click.emergency_whatsapp',   payload:{ action:'VIRTUAL_CLICK', target:'emergency_correction_whatsapp' },
      utterances:[
        {text:'bấm nút whatsapp màu xanh lá để sửa thông tin hồ sơ', lang:'vi'},
        {text:'nhấn nút whatsapp trong phần correction service', lang:'vi'},
        {text:'click the whatsapp button for correction service', lang:'en'},
      ]},
    { name:'click.faqs_submit_question', payload:{ action:'VIRTUAL_CLICK', target:'faqs_submit_question' },
      utterances:[
        {text:'click nút submit question trong trang faqs để gửi câu hỏi', lang:'vi'},
        {text:'bấm gửi câu hỏi trong trang faqs', lang:'vi'},
        {text:'click submit question on the faqs page', lang:'en'},
      ]},
    { name:'click.next_step2',           payload:{ action:'VIRTUAL_CLICK', target:'next_step2' },
      utterances:[
        {text:'nhấn next để chuyển sang bước 2 trong form nộp đơn', lang:'vi'},
        {text:'bấm next step 2 trong apply form', lang:'vi'},
        {text:'click next to go to step 2 in the application form', lang:'en'},
      ]},
    { name:'click.header_mobile_menu',   payload:{ action:'VIRTUAL_CLICK', target:'header_mobile_menu' },
      utterances:[
        {text:'mở menu hamburger trên điện thoại', lang:'vi'},
        {text:'nhấn nút menu hamburger mobile', lang:'vi'},
        {text:'open the hamburger menu on mobile', lang:'en'},
      ]},
];

async function seedNlpCache() {
    const prisma = require('../dist/lib/prisma.js').default;

    log(`\n${B}${Y}=== PHASE 2: INSERT NLP CACHE (17 intents × 3 utterances) ===${RST}`);
    sep(70,'═');

    let insertedIntents=0, insertedUtterances=0, skipped=0;

    for (const intent of NLP_INTENTS) {
        // Upsert intent — không tạo trùng nếu đã có
        const existing = await prisma.nlpIntent.findFirst({ where: { name: intent.name } });
        let intentRecord;
        if (existing) {
            log(`${D}  [SKIP] Intent "${intent.name}" đã tồn tại${RST}`);
            intentRecord = existing;
            skipped++;
        } else {
            intentRecord = await prisma.nlpIntent.create({
                data: { name: intent.name, actionPayload: intent.payload, isActive: true }
            });
            log(`${G}  [+] Intent "${intent.name}"${RST}`);
            insertedIntents++;
        }

        // Insert utterances (bỏ qua nếu text đã tồn tại)
        for (const utt of intent.utterances) {
            const exists = await prisma.nlpUtterance.findFirst({
                where: { intentId: intentRecord.id, text: utt.text }
            });
            if (!exists) {
                await prisma.nlpUtterance.create({
                    data: { intentId: intentRecord.id, text: utt.text, language: utt.lang,
                            isSeeded: true, usedInTraining: false }
                });
                insertedUtterances++;
            }
        }
    }

    log(`\n  ${G}Inserted: ${insertedIntents} intents, ${insertedUtterances} utterances${RST}`);
    log(`  ${D}Skipped (đã tồn tại): ${skipped} intents${RST}`);

    await prisma.$disconnect();
    return { insertedIntents, insertedUtterances };
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
    log(`  NLP Model mới đã load — các tin nhắn tương tự sẽ được phục vụ từ cache`);
    log(`  (không cần gọi Gemini API nữa)`);
}

// ─── Main ─────────────────────────────────────────────────────────

async function main() {
    const allPass = await runAllTests();

    if (!allPass) {
        sep(70,'═');
        log(`${R}${B}❌ CÓ TEST FAIL — DỪNG LẠI, không insert NLP Cache.${RST}`);
        log(`${Y}Sửa các case fail ở trên trước khi cache.${RST}`);
        sep(70,'═');
        process.exit(1);
    }

    log(`\n${G}${B}✅ TẤT CẢ 21 ASSERTIONS PASS — Bắt đầu insert NLP Cache...${RST}`);

    await seedNlpCache();
    await triggerRetrain();

    sep(70,'═');
    log(`${G}${B}🎉 HOÀN TẤT!${RST}`);
    log(`${G}  17 buttons đã được NLP Cache — AI sẽ phản hồi NGAY LẬP TỨC${RST}`);
    log(`${G}  mà không cần gọi Gemini API cho các câu lệnh tương tự.${RST}`);
    sep(70,'═');
    process.exit(0);
}

main().catch(e => {
    console.error(`${R}${B}Fatal: ${e.message}${RST}`, e);
    process.exit(1);
});
