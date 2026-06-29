/**
 * expand-utterances.mjs
 *
 * Mở rộng utterances cho 22 NLP intents bằng Gemini — đúng quy trình SKILL.md:
 *
 *   TẦNG 1: API E2E Test (17 buttons)           ← guard gate, phải ALL PASS
 *      ↓ (ALL PASS)
 *   PHASE 2: Generate utterances với Gemini     ← offline, tạo paraphrase
 *      ↓
 *   TẦNG 3: Insert DB + Retrain                 ← "đóng dấu" chính thức
 *      ↓
 *   NOTIFY: Restart server + verify HIT         ← hướng dẫn bước cuối
 *
 * Chạy: node scripts/expand-utterances.mjs
 * Dry-run (không insert, chỉ xem preview): node scripts/expand-utterances.mjs --dry-run
 */

import 'dotenv/config';
import http from 'http';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const isDryRun = process.argv.includes('--dry-run');

// ─── Colors ──────────────────────────────────────────────────────────────────
const G='\x1b[32m',R='\x1b[31m',Y='\x1b[33m',C='\x1b[36m',M='\x1b[35m',D='\x1b[2m',RST='\x1b[0m',B='\x1b[1m';
const ts = () => new Date().toISOString().slice(11, 23);
const log = (...a) => console.log(`[${ts()}]`, ...a);
const sep = (n = 70, c = '─') => console.log(c.repeat(n));

// ─── HTTP helpers ─────────────────────────────────────────────────────────────
const HOST = '127.0.0.1', PORT = 5000;

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

async function createSession() {
    const r = await httpPost('/api/v1/chat/join', { user_name: 'ExpandUtterancesBot' });
    return r.data.session_id;
}

function streamMessage(sid, msg, url = '/') {
    const body = JSON.stringify({
        session_id: sid, message: msg, sender: 'USER', message_type: 'TEXT',
        current_url: url, page_content: '', page_context: '[]', website_language: 'vi',
    });
    return new Promise((resolve, reject) => {
        const req = http.request(
            { hostname: HOST, port: PORT, path: '/api/v1/chat/message/stream', method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), Accept: 'text/event-stream' } },
            (res) => {
                const events = []; let buf = '', fullText = '';
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
        req.on('error', reject); req.write(body); req.end();
    });
}

// ─── Tầng 1: 17 Button test cases (giống e2e-virtual-mouse-all-buttons.mjs) ──
// Đây là bộ test chuẩn từ SKILL.md — phải PASS hết trước khi cache
const BUTTON_TESTS = [
    { id:'B01', target:'hero_apply',                    msg:'Bấm nút Apply Now to lớn ở giữa trang chủ cho tôi',           url:'/' },
    { id:'B02', target:'hero_check_status',             msg:'Nhấn nút Check Status ngay trong phần hero ở trang chủ',      url:'/' },
    { id:'B03', target:'btn-apply-header',              msg:'Bấm nút Apply Now trên thanh điều hướng header ở trên cùng',  url:'/' },
    { id:'B04', target:'header_check_status',           msg:'Click vào link Check Status trên thanh header',               url:'/' },
    { id:'B05', target:'lang-selector',                 msg:'Nhấn nút chọn ngôn ngữ trên header để đổi sang tiếng Anh',   url:'/' },
    { id:'B06', target:'chat-toggle',                   msg:'Đóng widget chat này lại',                                    url:'/' },
    { id:'B07', target:'cta_apply',                     msg:'Bấm nút Apply Now ở phần CTA cuối trang chủ',                url:'/' },
    { id:'B08', target:'cta_check_status',              msg:'Nhấn nút Check Status ở phần cuối trang (CTA section)',      url:'/' },
    { id:'B09', target:'continue_to_apply',             msg:'Bấm nút Continue to Apply để tiến vào form đăng ký',         url:'/' },
    { id:'B10', target:'how_to_apply_start',            msg:'Nhấn nút màu cam ở trang hướng dẫn visa',                    url:'/how-to-apply' },
    { id:'B11', target:'check_status_submit',           msg:'Nhấn nút Submit màu xanh trong form check status giúp tôi',  url:'/check-status' },
    { id:'B12', target:'contact_submit',                msg:'Nhấn nút Send để gửi form liên hệ',                          url:'/contact-us' },
    { id:'B13', target:'emergency_submit',              msg:'Bấm Submit để gửi form yêu cầu khẩn cấp',                    url:'/emergency-inquiry' },
    { id:'B14', target:'emergency_correction_whatsapp', msg:'Bấm nút WhatsApp màu xanh lá để sửa thông tin hồ sơ',       url:'/emergency-inquiry' },
    { id:'B15', target:'faqs_submit_question',          msg:'Click nút Submit Question trong trang FAQs để gửi câu hỏi',  url:'/faqs' },
    { id:'B16', target:'next_step2',                    msg:'Nhấn Next để chuyển sang bước 2 trong form nộp đơn',         url:'/apply' },
    { id:'B17', target:'header_mobile_menu',            msg:'Mở menu hamburger trên điện thoại',                           url:'/' },
];

async function runTang1(label = 'TẦNG 1: API E2E Test') {
    sep(70, '═');
    log(`${B}${Y}=== ${label} (${BUTTON_TESTS.length} buttons) ===${RST}`);
    log(`${D}Kiểm tra Gemini chọn đúng target cho mỗi button${RST}`);
    sep(70, '═');

    let passed = 0, failed = 0;
    const failures = [];

    for (const tc of BUTTON_TESTS) {
        sep(55);
        log(`${C}${B}[${tc.id}]${RST} target="${tc.target}"`);
        log(`${D}  msg: "${tc.msg}"${RST}`);
        try {
            const sid = await createSession();
            const result = await streamMessage(sid, tc.msg, tc.url);
            const preview = result.fullText.slice(0, 60).replace(/<!--[\s\S]*?-->/g, '').trim();
            if (preview) log(`  ${D}AI: "${preview}..."${RST}`);

            const vc = result.events.find(e => e.action === 'VIRTUAL_CLICK');
            if (vc?.target === tc.target) {
                log(`${G}  ✅ PASS${RST} — VIRTUAL_CLICK target="${tc.target}"`);
                passed++;
            } else {
                const got = vc
                    ? `VIRTUAL_CLICK target="${vc.target}"`
                    : (result.events.find(e => e.action) ? JSON.stringify(result.events.filter(e => e.action)) : 'NO ACTION');
                log(`${R}  ❌ FAIL${RST} — expected="${tc.target}" | got: ${got}`);
                failed++;
                failures.push({ id: tc.id, expected: tc.target, got });
            }
        } catch (err) {
            log(`${R}  💥 ERROR: ${err.message}${RST}`);
            failed++;
            failures.push({ id: tc.id, expected: tc.target, got: 'ERROR: ' + err.message });
        }
        await new Promise(r => setTimeout(r, 300));
    }

    sep(70, '═');
    const total = passed + failed;
    log(`${failed === 0 ? G : R}${B}KẾT QUẢ: ${passed}/${total} PASS${RST}`);

    if (failures.length > 0) {
        log(`${R}${B}THẤT BẠI:${RST}`);
        for (const f of failures) log(`  ${R}[${f.id}]${RST} expected="${f.expected}" | got="${f.got}"`);
    }
    sep(70, '═');

    return failed === 0;
}

// ─── Phase 2: Gemini — sinh utterances ───────────────────────────────────────

const INTENT_DESCRIPTIONS = {
    "navigate.apply":
        "Người dùng muốn AI điều hướng đến trang nộp đơn xin visa (/apply). " +
        "Bao gồm cả câu chung chung về việc bắt đầu xin/làm visa.",
    "navigate.contact":
        "Người dùng muốn AI điều hướng đến trang liên hệ (/contact-us) " +
        "để xem số hotline, email, địa chỉ văn phòng.",
    "navigate.check_status":
        "Người dùng muốn AI điều hướng đến trang tra cứu (/check-status). " +
        "Đây là trang điền mã đơn để check — KHÔNG phải click button nào.",
    "navigate.home":
        "Người dùng muốn AI điều hướng về trang chủ (/).",
    "navigate.pricing":
        "Người dùng muốn AI điều hướng đến trang bảng giá (/guide/vietnam-visa-fees).",
    "click.hero_apply":
        "AI click nút 'Apply Now' to lớn ở hero section (trung tâm trang chủ). " +
        "Đây là nút MẶC ĐỊNH khi user nói 'bấm đăng ký' mà không chỉ định vị trí. " +
        "Bao gồm câu ngắn chung chung KHÔNG có từ 'header' hay 'cuối trang'.",
    "click.hero_check_status":
        "AI click nút 'Check Status' ở hero section trang chủ. " +
        "Đây là nút MẶC ĐỊNH khi user nói 'kiểm tra/check status' không chỉ định vị trí. " +
        "Bao gồm câu ngắn như 'nhấn kiểm tra', 'bấm check status'.",
    "click.btn_apply_header":
        "AI click nút 'Apply Now' trên thanh header navigation (góc trên cùng bên phải). " +
        "PHẢI đề cập: 'header' / 'thanh điều hướng' / 'trên cùng' / 'navigation bar'.",
    "click.header_check_status":
        "AI click link 'Check Status' trên thanh header. " +
        "PHẢI đề cập: 'header' / 'trên cùng' / 'thanh menu trên'.",
    "click.lang_selector":
        "AI click nút chọn ngôn ngữ (Language Selector) trên header để đổi ngôn ngữ website.",
    "click.chat_toggle":
        "AI mở hoặc đóng widget chat (cửa sổ chat góc màn hình).",
    "click.cta_apply":
        "AI click nút 'Apply Now' ở phần CTA cuối trang chủ (dưới cùng). " +
        "PHẢI đề cập: 'cuối trang' / 'CTA' / 'phía dưới'.",
    "click.cta_check_status":
        "AI click nút 'Check Status' ở phần CTA cuối trang. " +
        "PHẢI đề cập: 'cuối trang' / 'CTA' / 'dưới cùng'.",
    "click.continue_to_apply":
        "AI click nút 'Continue to Apply' trong Quick Apply Form " +
        "(form chọn quốc tịch nhanh ở trang chủ, không phải trang /apply).",
    "click.how_to_apply_start":
        "AI click nút Start Application (màu cam) ở trang hướng dẫn /how-to-apply.",
    "click.check_status_submit":
        "AI click nút Submit trong form tra cứu trạng thái ở trang /check-status.",
    "click.contact_submit":
        "AI click nút 'Send Message' để gửi form liên hệ ở trang /contact-us.",
    "click.emergency_submit":
        "AI click nút Submit form yêu cầu khẩn cấp ở trang /emergency-inquiry.",
    "click.emergency_whatsapp":
        "AI click nút WhatsApp màu xanh lá để sửa thông tin hồ sơ " +
        "ở trang /emergency-inquiry (phần Correction Service).",
    "click.faqs_submit_question":
        "AI click nút 'Submit Question' để gửi câu hỏi ở trang /faqs.",
    "click.next_step2":
        "AI click nút 'Next' để sang bước 2 trong form nộp đơn đa bước ở trang /apply.",
    "click.header_mobile_menu":
        "AI click nút hamburger menu (3 gạch ngang / ☰) trên mobile để mở menu điều hướng.",
};

const TARGET_VI = 15;
const TARGET_EN = 5;

async function generateForIntent(model, intentName, description, existingUtterances) {
    const existingVi = existingUtterances.filter(u => u.language === 'vi').map(u => u.text);
    const existingEn = existingUtterances.filter(u => u.language !== 'vi').map(u => u.text);

    const neededVi = Math.max(0, TARGET_VI - existingVi.length);
    const neededEn = Math.max(0, TARGET_EN - existingEn.length);

    if (neededVi === 0 && neededEn === 0) {
        return { vi: [], en: [], skipped: true };
    }

    const prompt = `Bạn là chuyên gia NLP cho chatbot FastVisa — dịch vụ visa điện tử Việt Nam.

Intent: "${intentName}"
Ý nghĩa: ${description}

CÁC CÂU ĐÃ CÓ (không được tạo lại hoặc câu quá giống):
Tiếng Việt: ${JSON.stringify(existingVi)}
Tiếng Anh: ${JSON.stringify(existingEn)}

Tạo ${neededVi} câu tiếng Việt MỚI và ${neededEn} câu tiếng Anh MỚI.

YÊU CẦU BẮT BUỘC:
1. ĐA DẠNG ĐỘ DÀI:
   - Cực ngắn (2-3 từ): "nhấn kiểm tra", "bấm apply", "check status đi"
   - Trung bình (5-7 từ): "giúp tôi kiểm tra trạng thái đơn"
   - Đầy đủ (>8 từ): "bạn có thể nhấn nút check status giúp tôi không"
2. ĐA DẠNG ĐỘNG TỪ: nhấn / bấm / click / nhấp / ấn / tap / giúp tôi / làm ơn / mở / vào / đưa tôi
3. ĐA DẠNG PHONG CÁCH: lịch sự / bình thường / thân mật / mệnh lệnh ngắn gọn
4. TỰ NHIÊN như người dùng thật gõ vào chat — không văn hoa, không gượng gạo
5. Không viết hoa đầu câu (trừ tên riêng như FastVisa, WhatsApp)
6. Không dùng dấu chấm kết thúc câu

Trả về JSON THUẦN, không markdown, không giải thích:
{"vi":["câu 1","câu 2",...],"en":["sentence 1","sentence 2",...]}`;

    try {
        const result = await model.generateContent(prompt);
        const raw = result.response.text().trim();
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('Không tìm thấy JSON trong response');
        const parsed = JSON.parse(jsonMatch[0]);
        return {
            vi: (parsed.vi ?? []).slice(0, neededVi).map(s => String(s).trim()),
            en: (parsed.en ?? []).slice(0, neededEn).map(s => String(s).trim()),
            skipped: false,
        };
    } catch (err) {
        log(`${R}  [ERROR] Gemini fail cho "${intentName}": ${err.message}${RST}`);
        return { vi: [], en: [], skipped: false };
    }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        log(`${R}${B}❌ GEMINI_API_KEY không có trong .env — dừng lại.${RST}`);
        process.exit(1);
    }

    sep(70, '═');
    log(`${B}${Y}=== EXPAND UTTERANCES — Theo Quy Trình SKILL.md ===${RST}`);
    if (isDryRun) log(`${Y}  MODE: DRY RUN — chỉ preview, không insert vào DB${RST}`);
    log(`${D}  Quy trình: TẦNG 1 (API E2E) → Generate → Insert + Retrain → Notify${RST}`);
    sep(70, '═');

    // ── TẦNG 1: Pre-guard test ────────────────────────────────────────────────
    log(`\n${B}${C}BƯỚC 1/4: TẦNG 1 — Kiểm tra 17 buttons qua Gemini trước khi expand${RST}`);
    log(`${D}Nếu có test nào FAIL → script dừng, không insert gì cả.${RST}\n`);

    const tang1Pass = await runTang1('TẦNG 1: API E2E Pre-flight (17 buttons)');

    if (!tang1Pass) {
        sep(70, '═');
        log(`${R}${B}❌ TẦNG 1 FAIL — Dừng lại. Không insert utterances.${RST}`);
        log(`${Y}  Sửa lỗi trên → restart API server → chạy lại script này.${RST}`);
        sep(70, '═');
        process.exit(1);
    }

    log(`\n${G}${B}✅ TẦNG 1 PASS (17/17) — Baseline ổn định, tiếp tục expand...${RST}\n`);

    // ── Phase 2: Generate với Gemini ──────────────────────────────────────────
    const prisma = require('../dist/lib/prisma.js').default;
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const { NLPClassifierService } = require('../dist/services/chatbot/nlp-classifier.service.js');

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: 'gemini-flash-lite-latest',
        generationConfig: { temperature: 0.9, maxOutputTokens: 2048 },
    });

    sep(70, '─');
    log(`${B}${C}BƯỚC 2/4: Generate paraphrase với Gemini (mỗi intent ~900ms)${RST}`);
    sep(70, '─');

    const intents = await prisma.nlpIntent.findMany({
        where: { isActive: true },
        include: { utterances: true },
        orderBy: { name: 'asc' },
    });

    log(`${C}  Tìm thấy ${intents.length} intents active trong DB${RST}\n`);

    // Collect tất cả utterances mới để insert 1 lần ở Phase 3
    const allNewUtterances = [];
    let skippedIntents = 0;

    for (const intent of intents) {
        const desc = INTENT_DESCRIPTIONS[intent.name]
            ?? `Intent "${intent.name}" — dùng tên intent để suy luận`;

        log(`${C}${B}[${intent.name}]${RST} (${intent.utterances.length} utterances hiện có)`);

        const generated = await generateForIntent(model, intent.name, desc, intent.utterances);

        if (generated.skipped) {
            log(`${D}  → Đã đủ ${TARGET_VI} vi + ${TARGET_EN} en — bỏ qua${RST}`);
            skippedIntents++;
            continue;
        }

        const newRows = [
            ...generated.vi.map(text => ({
                intentId: intent.id, text, language: 'vi',
                isSeeded: true, usedInTraining: false,
            })),
            ...generated.en.map(text => ({
                intentId: intent.id, text, language: 'en',
                isSeeded: true, usedInTraining: false,
            })),
        ];

        if (newRows.length === 0) {
            log(`${Y}  → Gemini trả về rỗng${RST}`);
        } else {
            if (generated.vi.length > 0) {
                log(`${D}  Vi: ${generated.vi.slice(0, 3).map(s => `"${s}"`).join(' | ')}...${RST}`);
            }
            if (generated.en.length > 0) {
                log(`${D}  En: ${generated.en.slice(0, 2).map(s => `"${s}"`).join(' | ')}...${RST}`);
            }
            allNewUtterances.push(...newRows);
        }

        // Rate limiting
        await new Promise(r => setTimeout(r, 900));
    }

    log(`\n${C}  Generated: ${allNewUtterances.length} utterances mới từ ${intents.length - skippedIntents} intents${RST}`);

    if (isDryRun) {
        sep(70, '═');
        log(`${Y}${B}DRY RUN hoàn tất — không insert vào DB.${RST}`);
        log(`${Y}Chạy lại không có --dry-run để thực hiện đầy đủ.${RST}`);
        await prisma.$disconnect();
        process.exit(0);
    }

    if (allNewUtterances.length === 0) {
        log(`${Y}\n  Không có utterance nào mới — bỏ qua insert và retrain.${RST}`);
        await prisma.$disconnect();
        process.exit(0);
    }

    // ── TẦNG 3: Insert DB + Retrain ───────────────────────────────────────────
    sep(70, '─');
    log(`${B}${C}BƯỚC 3/4: TẦNG 3 — Insert vào DB + Retrain NLP model${RST}`);
    sep(70, '─');

    const insertResult = await prisma.nlpUtterance.createMany({
        data: allNewUtterances,
        skipDuplicates: true,
    });

    log(`${G}  ✅ Inserted ${insertResult.count}/${allNewUtterances.length} utterances vào DB${RST}`);

    log(`\n  Đang retrain model với dataset mới (20-60 giây)...`);
    const classifier = NLPClassifierService.getInstance();
    await classifier.train();
    log(`${G}  ✅ Retrain hoàn tất — model mới đã lưu vào api/data/nlp/model-vN.json${RST}`);

    await prisma.$disconnect();

    // ── Bước 4: Hướng dẫn verify ─────────────────────────────────────────────
    sep(70, '═');
    log(`${B}${C}BƯỚC 4/4: Verify NLP Cache sau khi restart server${RST}`);
    sep(70, '═');
    log(`\n${Y}${B}⚠️  MODEL MỚI CHỈ LOAD SAU KHI RESTART API SERVER${RST}`);
    log(`${Y}  Server hiện tại vẫn đang giữ model cũ trong memory.${RST}\n`);
    log(`${B}Hành động cần làm:${RST}`);
    log(`\n  1. Restart API server:`);
    log(`     ${D}(dừng process hiện tại, chạy lại: npm run dev)${RST}`);
    log(`\n  2. Sau khi server ready, chạy Playwright test (TẦNG 2):`);
    log(`     ${C}cd ui && npm run test:e2e -- virtual-mouse-full-flow${RST}`);
    log(`\n  3. Chạy API E2E verification (TẦNG 1 lần cuối):`);
    log(`     ${C}cd api && node scripts/e2e-virtual-mouse-all-buttons.mjs${RST}`);
    log(`\n  4. Kiểm tra log API để thấy NLP Cache HIT:`);
    log(`     ${G}[Intent Cache] ✅ HIT | intent=click.hero_check_status score=1.000${RST}`);
    log(`     ${G}[Intent Cache] ✅ HIT | intent=click.hero_apply score=0.987${RST}`);
    log(`\n  5. Nếu thấy HIT thay vì Gemini 🤖 cho các câu quen thuộc → ✅ HOÀN TẤT`);
    sep(70, '═');
    log(`${G}${B}🎉 Script expand-utterances hoàn tất thành công!${RST}`);
    log(`${D}  Inserted: ${insertResult.count} utterances | Intents covered: ${intents.length - skippedIntents}${RST}`);
    sep(70, '═');

    process.exit(0);
}

main().catch(e => {
    console.error(`${R}${B}Fatal: ${e.message}${RST}`, e);
    process.exit(1);
});
