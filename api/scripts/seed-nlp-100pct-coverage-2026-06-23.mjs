/**
 * seed-nlp-100pct-coverage-2026-06-23.mjs — Seed lại toàn bộ intent cần thiết để đạt 100% NLP
 * Cache cho các case đã làm trong phiên hôm nay (focus_ui_field + các guard-fix collision).
 *
 * BỐI CẢNH: API server bị restart giữa phiên làm việc → model NLP reset về v1 (chỉ còn 5 intent
 * navigate.* gốc). Mọi intent seed trước đó (focus.quick_apply_nationality, click.cta_apply,...)
 * đã mất khỏi DB. Script này seed lại TẤT CẢ, đủ cho bảng input/output đã báo cáo với user.
 *
 * GUARD COLLISION ĐÃ BIẾT (xem chat.service.ts _staleIntentGuards) — utterance dưới đây đều tránh
 * các từ khóa gây đụng đã phát hiện hôm nay:
 *   - navigate.apply: không dùng "tôi muốn" mở đầu generic, không dùng "hướng dẫn nộp đơn" bare,
 *     không dùng "bắt đầu nộp đơn"/"bắt đầu đăng ký" bare.
 *   - navigate.contact: không dùng "tôi cần hỗ trợ" bare (luôn kèm "khẩn cấp"/"gấp" nếu là emergency).
 *   - navigate.pricing: không dùng "phí"/"giá" bare (luôn kèm "thanh toán" hoặc "miễn visa" rõ ràng).
 *
 * Chạy: node scripts/seed-nlp-100pct-coverage-2026-06-23.mjs
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

const NLP_INTENTS = [
    { name:'focus.quick_apply_nationality', payload:{ action:'VIRTUAL_CLICK', target:'quick_apply_nationality' },
      utterances:[
        { text:'tôi muốn chọn quốc tịch ở phần đăng ký nhanh',          lang:'vi' },
        { text:'cho tôi mở ô chọn quốc tịch trong form đăng ký nhanh', lang:'vi' },
        { text:'mở giúp tôi phần chọn quốc tịch để tôi nhập',          lang:'vi' },
        { text:'let me pick my nationality in the quick apply form',   lang:'en' },
      ]},
    { name:'click.cta_apply', payload:{ action:'VIRTUAL_CLICK', target:'cta_apply' },
      utterances:[
        { text:'bấm nút apply now ở phần cta cuối trang chủ',  lang:'vi' },
        { text:'bấm apply ở cuối trang',                        lang:'vi' },
        { text:'cho tôi bấm đăng ký ngay ở cuối trang chủ',     lang:'vi' },
        { text:'click apply now at the bottom of the page',     lang:'en' },
      ]},
    { name:'click.cta_check_status', payload:{ action:'VIRTUAL_CLICK', target:'cta_check_status' },
      utterances:[
        { text:'nhấn nút check status ở phần cuối trang cta section', lang:'vi' },
        { text:'bấm kiểm tra trạng thái ở cuối trang chủ',             lang:'vi' },
        { text:'cho tôi bấm check status ở phần cta cuối trang',        lang:'vi' },
        { text:'click check status at the bottom cta section',          lang:'en' },
      ]},
    { name:'click.contact_submit', payload:{ action:'VIRTUAL_CLICK', target:'contact_submit' },
      utterances:[
        { text:'bấm submit để gửi form liên hệ giúp tôi',     lang:'vi' },
        { text:'gửi giúp tôi form liên hệ này',                lang:'vi' },
        { text:'bấm nút gửi trên form liên hệ',                lang:'vi' },
        { text:'submit the contact form for me please',       lang:'en' },
      ]},
    { name:'click.continue_to_apply', payload:{ action:'VIRTUAL_CLICK', target:'continue_to_apply' },
      utterances:[
        { text:'bấm nút continue to apply để bắt đầu đăng ký', lang:'vi' },
        { text:'cho tôi bấm continue to apply',                lang:'vi' },
        { text:'bấm tiếp tục đến trang đăng ký giúp tôi',      lang:'vi' },
        { text:'click continue to apply for me',               lang:'en' },
      ]},
    { name:'click.apply_step3_back', payload:{ action:'VIRTUAL_CLICK', target:'apply_step3_back' },
      utterances:[
        { text:'cho tôi quay lại bước điền thông tin người nộp đơn', lang:'vi' },
        { text:'tôi muốn sửa lại thông tin người nộp đơn',           lang:'vi' },
        { text:'bấm quay lại bước thông tin người nộp đơn',          lang:'vi' },
        { text:'take me back to the applicant details step',        lang:'en' },
      ]},
    { name:'click.check_status_submit', payload:{ action:'VIRTUAL_CLICK', target:'check_status_submit' },
      utterances:[
        { text:'làm ơn giúp tôi bấm nút tra cứu trạng thái hồ sơ', lang:'vi' },
        { text:'bấm nút tra cứu hồ sơ giúp tôi',                   lang:'vi' },
        { text:'giúp tôi bấm tra cứu trạng thái đơn',              lang:'vi' },
        { text:'please click the check status button for me',     lang:'en' },
      ]},
    { name:'click.faqs_ask_another', payload:{ action:'VIRTUAL_CLICK', target:'faqs_ask_another' },
      utterances:[
        { text:'tôi muốn hỏi thêm một câu nữa',       lang:'vi' },
        { text:'cho tôi hỏi thêm một câu khác nữa',   lang:'vi' },
        { text:'tôi còn một câu hỏi khác muốn hỏi',   lang:'vi' },
        { text:'let me ask another question',         lang:'en' },
      ]},
    { name:'navigate.emergency_inquiry', payload:{ action:'NAVIGATION', destination:'/emergency-inquiry' },
      utterances:[
        { text:'tôi cần hỗ trợ khẩn cấp gấp',          lang:'vi' },
        { text:'tôi cần giúp đỡ khẩn cấp ngay',         lang:'vi' },
        { text:'đưa tôi đến trang hỗ trợ khẩn cấp',     lang:'vi' },
        { text:'I need emergency help right now',       lang:'en' },
      ]},
    { name:'navigate.how_to_apply', payload:{ action:'NAVIGATION', destination:'/how-to-apply' },
      utterances:[
        { text:'cho tôi xem trang hướng dẫn cách nộp đơn xin visa', lang:'vi' },
        { text:'cho tôi xem trang nói về cách nộp đơn xin visa',    lang:'vi' },
        { text:'mở trang hướng dẫn cách apply giúp tôi',            lang:'vi' },
        { text:'show me the how to apply page',                     lang:'en' },
      ]},
    { name:'navigate.guide_payment', payload:{ action:'NAVIGATION', destination:'/guide/payment-guideline' },
      utterances:[
        { text:'cho tôi xem trang nói về các phương thức thanh toán phí visa', lang:'vi' },
        { text:'đưa tôi đến trang hướng dẫn thanh toán phí',                   lang:'vi' },
        { text:'mở trang payment guideline giúp tôi',                          lang:'vi' },
        { text:'show me the payment guideline page',                           lang:'en' },
      ]},
    { name:'navigate.guide_exemptions', payload:{ action:'NAVIGATION', destination:'/guide/visa-exemptions' },
      utterances:[
        { text:'cho tôi xem trang nói về miễn visa cho các quốc gia', lang:'vi' },
        { text:'đưa tôi đến trang miễn thị thực',                     lang:'vi' },
        { text:'mở trang visa exemptions giúp tôi',                   lang:'vi' },
        { text:'show me the visa exemptions page',                    lang:'en' },
      ]},
];

async function seedNlpCache() {
    const prisma = require('../dist/lib/prisma.js').default;

    log(`\n${B}${Y}=== SEED NLP CACHE — 100% coverage cho bảng input/output hôm nay ===${RST}`);
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
    log(`${B}${C}SEED NLP CACHE — 100% coverage 2026-06-23${RST}`);
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
