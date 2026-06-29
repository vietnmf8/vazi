/**
 * seed-nlp-scroll-section-combo.mjs — TẦNG 3 mở rộng: Train NLP Cache cho các target SCROLL
 * section mới (Universal Section Scroll, 2026-06-22) cần ĐỘ TIN CẬY CAO (zero-token, <10ms,
 * không phụ thuộc Gemini non-deterministic).
 *
 * Khác với seed-nlp-scroll-page.mjs (7 target gốc trên Home), các intent ở đây đại diện cho
 * những câu hỏi mà việc Gemini chọn đúng tool (scroll_page vs trả lời trực tiếp bằng văn bản)
 * không ổn định 100% giữa các lượt gọi — nên cần NLP Cache "chốt cứng" kết quả.
 *
 * resolvedActionPayload thật (SCROLL_PAGE / NAVIGATE_AND_SCROLL / NAVIGATION) được tính LẠI tại
 * runtime bởi `resolveScrollTarget()` trong scroll-page.tool.ts dựa trên current_url — actionPayload
 * tĩnh ở đây CHỈ cần đúng `target`, KHÔNG cần đúng destination (xem chat.service.ts resolver).
 *
 * Chạy: node scripts/seed-nlp-scroll-section-combo.mjs
 */

import 'dotenv/config';
import http from 'http';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const G='\x1b[32m',R='\x1b[31m',Y='\x1b[33m',C='\x1b[36m',D='\x1b[2m',RST='\x1b[0m',B='\x1b[1m';
const ts=()=>new Date().toISOString().slice(11,23);
const log=(...a)=>console.log(`[${ts()}]`,...a);
const sep=(n=70,c='─')=>console.log(c.repeat(n));

const HOST='127.0.0.1', PORT=5000;
const ADMIN_EMAIL = process.env.ALLOWED_ADMIN_EMAIL ?? 'vietnmf8@fullstack.edu.vn';
const ADMIN_PASS  = process.env.ADMIN_SEED_PASSWORD ?? 'Viet251001';

function httpJson(method, path, body, token) {
    const raw = body ? JSON.stringify(body) : undefined;
    const headers = { 'Content-Type': 'application/json' };
    if (raw) headers['Content-Length'] = Buffer.byteLength(raw);
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return new Promise((resolve, reject) => {
        const req = http.request({ hostname: HOST, port: PORT, path, method, headers },
            (res) => { let d=''; res.on('data',c=>d+=c); res.on('end',()=>resolve({status:res.statusCode, body:JSON.parse(d||'{}')})); }
        );
        req.on('error', reject);
        if (raw) req.write(raw);
        req.end();
    });
}

// actionPayload chỉ cần target đúng — destination thật được resolveScrollTarget() tính lại runtime.
const NLP_INTENTS = [
    { name:'scroll.element.pricing_evisa', payload:{ action:'SCROLL_PAGE', mode:'element', target:'pricing_evisa' },
      utterances:[
        { text:'tôi muốn xem bảng giá e-visa',                        lang:'vi' },
        { text:'cho tôi xem bảng giá e-visa',                         lang:'vi' },
        { text:'cho tôi xem bảng giá evisa',                          lang:'vi' },
        { text:'show me the e-visa pricing table',                   lang:'en' },
      ]},
    { name:'scroll.element.pricing_voa', payload:{ action:'SCROLL_PAGE', mode:'element', target:'pricing_voa' },
      utterances:[
        { text:'cho tôi xem bảng giá voa',                            lang:'vi' },
        { text:'tôi muốn xem bảng giá voa',                           lang:'vi' },
        { text:'cho tôi xem bảng giá visa on arrival',                lang:'vi' },
        { text:'show me the voa pricing table',                      lang:'en' },
      ]},
    { name:'scroll.element.about_team', payload:{ action:'SCROLL_PAGE', mode:'element', target:'about_team' },
      utterances:[
        { text:'cho tôi xem đội ngũ của fastvisa',                    lang:'vi' },
        { text:'cho tôi xem đội ngũ của các bạn',                     lang:'vi' },
        { text:'tôi muốn xem đội ngũ nhân viên',                      lang:'vi' },
        { text:'show me your team',                                   lang:'en' },
      ]},
    { name:'scroll.element.emergency_pricing', payload:{ action:'SCROLL_PAGE', mode:'element', target:'emergency_pricing' },
      utterances:[
        { text:'cho tôi xem bảng giá làm visa khẩn cấp',              lang:'vi' },
        { text:'cho tôi xem bảng giá khẩn cấp',                       lang:'vi' },
        { text:'tôi muốn xem giá làm gấp visa',                       lang:'vi' },
        { text:'show me the emergency visa pricing',                  lang:'en' },
      ]},
    { name:'scroll.element.how_to_apply_documents', payload:{ action:'SCROLL_PAGE', mode:'element', target:'how_to_apply_documents' },
      utterances:[
        { text:'tôi cần xem danh sách tài liệu bắt buộc khi nộp hồ sơ', lang:'vi' },
        { text:'cho tôi xem tài liệu cần chuẩn bị',                   lang:'vi' },
        { text:'tôi muốn xem giấy tờ cần thiết khi nộp đơn',          lang:'vi' },
        { text:'show me the required documents',                     lang:'en' },
      ]},
    { name:'scroll.element.how_it_works', payload:{ action:'SCROLL_PAGE', mode:'element', target:'how_it_works' },
      utterances:[
        { text:'tôi muốn xem quy trình thực hiện',                    lang:'vi' },
        { text:'cho tôi xem quy trình thực hiện',                     lang:'vi' },
        { text:'cho tôi xem quy trình nộp hồ sơ',                     lang:'vi' },
        { text:'show me how it works',                                lang:'en' },
      ]},
];

async function seedNlpCache() {
    const prisma = require('../dist/lib/prisma.js').default;

    log(`\n${B}${Y}=== SEED NLP CACHE — SCROLL SECTION COMBO (Universal Section Scroll) ===${RST}`);
    sep(70,'═');

    let insertedIntents=0, insertedUtterances=0, skippedIntents=0, skippedUtterances=0;

    for (const intent of NLP_INTENTS) {
        const existing = await prisma.nlpIntent.findFirst({ where: { name: intent.name } });
        let intentRecord;
        if (existing) {
            log(`${D}  [SKIP] Intent "${intent.name}" đã tồn tại (id=${existing.id})${RST}`);
            intentRecord = existing;
            skippedIntents++;
        } else {
            intentRecord = await prisma.nlpIntent.create({
                data: { name: intent.name, actionPayload: intent.payload, isActive: true }
            });
            log(`${G}  [+] Intent "${intent.name}" → payload=${JSON.stringify(intent.payload)}${RST}`);
            insertedIntents++;
        }

        for (const utt of intent.utterances) {
            const exists = await prisma.nlpUtterance.findFirst({
                where: { intentId: intentRecord.id, text: utt.text }
            });
            if (!exists) {
                await prisma.nlpUtterance.create({
                    data: { intentId: intentRecord.id, text: utt.text, language: utt.lang,
                            isSeeded: true, usedInTraining: false }
                });
                log(`${C}      + utterance [${utt.lang}] "${utt.text}"${RST}`);
                insertedUtterances++;
            } else {
                log(`${D}      [skip] utterance đã tồn tại: "${utt.text}"${RST}`);
                skippedUtterances++;
            }
        }
    }

    sep(70);
    log(`  ${G}${B}Inserted: ${insertedIntents} intents mới, ${insertedUtterances} utterances mới${RST}`);
    log(`  ${D}Skipped (đã tồn tại): ${skippedIntents} intents, ${skippedUtterances} utterances${RST}`);
    sep(70,'═');

    await prisma.$disconnect();
}

async function triggerRetrainViaAdminRoute() {
    log(`\n${B}${Y}=== RETRAIN + HOT-SWAP (qua admin API đang chạy) ===${RST}`);
    sep(70,'═');

    log(`  ${D}[1/2] Đăng nhập admin (${ADMIN_EMAIL})...${RST}`);
    const loginRes = await httpJson('POST', '/api/v1/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASS });
    const token = loginRes.body?.data?.accessToken ?? loginRes.body?.data?.token;
    if (!token) {
        log(`${R}${B}  ❌ Đăng nhập thất bại: ${JSON.stringify(loginRes.body)}${RST}`);
        throw new Error('Không lấy được JWT admin');
    }
    log(`  ${G}✅ Login OK — đã có JWT${RST}`);

    log(`  ${D}[2/2] Trigger retrain (có thể mất 10-30s)...${RST}`);
    const t0 = Date.now();
    const retrainRes = await httpJson('POST', '/api/v1/admin/nlp-cache/retrain', {}, token);
    const ms = Date.now() - t0;

    if (retrainRes.status >= 400) {
        log(`${R}${B}  ❌ Retrain thất bại (HTTP ${retrainRes.status}): ${JSON.stringify(retrainRes.body)}${RST}`);
        throw new Error('Retrain thất bại');
    }

    const newVersion = retrainRes.body?.data?.newVersion ?? '?';
    log(`  ${G}${B}✅ Retrain hoàn tất trong ${ms}ms — model v${newVersion} đã hot-swap vào API đang chạy${RST}`);
    sep(70,'═');
}

async function main() {
    sep(70,'═');
    log(`${B}${C}SEED NLP CACHE — SCROLL SECTION COMBO${RST}`);
    log(`${D}Intents: ${NLP_INTENTS.length} (${NLP_INTENTS.reduce((s,i)=>s+i.utterances.length,0)} utterances)${RST}`);
    sep(70,'═');

    await seedNlpCache();
    await triggerRetrainViaAdminRoute();

    sep(70,'═');
    log(`${G}${B}🎉 HOÀN TẤT!${RST}`);
    sep(70,'═');
    process.exit(0);
}

main().catch(e => {
    console.error(`${R}${B}Fatal: ${e.message}${RST}`, e);
    process.exit(1);
});
