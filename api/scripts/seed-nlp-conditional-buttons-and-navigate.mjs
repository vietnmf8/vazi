/**
 * seed-nlp-conditional-buttons-and-navigate.mjs — Seed NLP Cache cho 8 click target cần trạng thái
 * đặc biệt + 9 navigate_to_page destination còn thiếu (2026-06-23).
 *
 * 8 click target: check_status_download, contact_send_another, emergency_ask_another,
 * faqs_ask_another, next_step3, apply_step2_back, apply_step3_back, pay_with.
 * Combo navigate+click (vd next_step3 không ở trang hiện tại) đã được xử lý sẵn bởi
 * getClickTargetDestination() trong click-ui-element.tool.ts + resolver trong chat.service.ts —
 * KHÔNG cần thêm code, chỉ cần seed utterance.
 *
 * 9 navigate destination: /about-us, /faqs, /how-to-apply, /guide, /guide/payment-guideline,
 * /guide/extra-services, /guide/visa-extension, /guide/visa-exemptions, /emergency-inquiry.
 *
 * NGUYÊN TẮC TỪ NGỮ — rút ra từ việc debug Playwright trước khi seed (xem
 * virtual-mouse-conditional-buttons.spec.ts):
 *   - contact_send_another: TRÁNH chữ "câu hỏi" (đụng click.faqs_submit_question) — dùng "tin nhắn liên hệ".
 *   - emergency_ask_another: TRÁNH chữ "gửi"+"yêu cầu khẩn cấp" (đụng click.emergency_submit) — dùng "báo thêm".
 *   - Mọi utterance dùng NGÔN NGỮ TỰ NHIÊN người dùng thật sẽ gõ — không có thuật ngữ IT
 *     (header, CTA, submit, form...).
 *
 * Chạy: node scripts/seed-nlp-conditional-buttons-and-navigate.mjs
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
    // ── 8 CLICK TARGET CẦN TRẠNG THÁI ĐẶC BIỆT ──────────────────────────────
    { name:'click.check_status_download', payload:{ action:'VIRTUAL_CLICK', target:'check_status_download' },
      utterances:[
        { text:'tôi muốn tải file visa của tôi xuống',           lang:'vi' },
        { text:'cho tôi lưu giấy visa đã được duyệt về máy',     lang:'vi' },
        { text:'cho tôi tải file visa đã duyệt xuống',           lang:'vi' },
        { text:'download the approved visa file for me',         lang:'en' },
      ]},
    { name:'click.contact_send_another', payload:{ action:'VIRTUAL_CLICK', target:'contact_send_another' },
      utterances:[
        { text:'cho tôi gửi thêm một tin nhắn liên hệ khác nữa', lang:'vi' },
        { text:'tôi muốn liên hệ thêm một lần nữa',              lang:'vi' },
        { text:'cho tôi gửi thêm một tin liên hệ khác',          lang:'vi' },
        { text:'let me send another contact message',           lang:'en' },
      ]},
    { name:'click.emergency_ask_another', payload:{ action:'VIRTUAL_CLICK', target:'emergency_ask_another' },
      utterances:[
        { text:'tôi muốn báo thêm một trường hợp khẩn cấp khác nữa', lang:'vi' },
        { text:'cho tôi báo thêm một ca khẩn cấp khác',          lang:'vi' },
        { text:'tôi cần báo thêm một trường hợp khẩn cấp nữa',  lang:'vi' },
        { text:'let me report another emergency case',          lang:'en' },
      ]},
    { name:'click.faqs_ask_another', payload:{ action:'VIRTUAL_CLICK', target:'faqs_ask_another' },
      utterances:[
        { text:'tôi muốn hỏi thêm một câu nữa',                  lang:'vi' },
        { text:'cho tôi hỏi thêm một câu khác nữa',              lang:'vi' },
        { text:'tôi còn một câu hỏi khác muốn hỏi',              lang:'vi' },
        { text:'let me ask another question',                   lang:'en' },
      ]},
    { name:'click.next_step3', payload:{ action:'VIRTUAL_CLICK', target:'next_step3' },
      utterances:[
        { text:'tôi điền xong rồi, cho tôi qua bước tiếp theo',  lang:'vi' },
        { text:'cho tôi qua bước xem lại và thanh toán',         lang:'vi' },
        { text:'xong rồi, đi tiếp sang bước sau',                lang:'vi' },
        { text:'take me to the next step',                       lang:'en' },
      ]},
    { name:'click.apply_step2_back', payload:{ action:'VIRTUAL_CLICK', target:'apply_step2_back' },
      utterances:[
        { text:'tôi muốn sửa lại thông tin ở bước trước',        lang:'vi' },
        { text:'cho tôi quay lại bước trước để sửa',             lang:'vi' },
        { text:'tôi muốn chỉnh lại thông tin vừa chọn ở bước 1', lang:'vi' },
        { text:'let me go back to edit the previous step',       lang:'en' },
      ]},
    { name:'click.apply_step3_back', payload:{ action:'VIRTUAL_CLICK', target:'apply_step3_back' },
      utterances:[
        { text:'cho tôi quay lại bước điền thông tin người nộp đơn', lang:'vi' },
        { text:'tôi muốn xem lại thông tin đã điền ở bước trước', lang:'vi' },
        { text:'cho tôi sửa lại thông tin người nộp đơn',        lang:'vi' },
        { text:'take me back to the applicant details step',     lang:'en' },
      ]},
    { name:'click.pay_with', payload:{ action:'VIRTUAL_CLICK', target:'pay_with' },
      utterances:[
        { text:'tôi muốn thanh toán luôn bây giờ',               lang:'vi' },
        { text:'cho tôi tiến hành thanh toán',                   lang:'vi' },
        { text:'tôi muốn trả tiền ngay',                         lang:'vi' },
        { text:"let's proceed to payment now",                   lang:'en' },
      ]},

    // ── 9 NAVIGATE DESTINATION CHƯA CÓ NLP CACHE ────────────────────────────
    { name:'navigate.about_us', payload:{ action:'NAVIGATION', destination:'/about-us' },
      utterances:[
        { text:'cho tôi xem trang giới thiệu về công ty của các bạn', lang:'vi' },
        { text:'cho tôi xem trang về chúng tôi',                  lang:'vi' },
        { text:'đưa tôi đến trang giới thiệu công ty',            lang:'vi' },
        { text:'show me the about us page',                       lang:'en' },
      ]},
    { name:'navigate.emergency_inquiry', payload:{ action:'NAVIGATION', destination:'/emergency-inquiry' },
      utterances:[
        { text:'tôi cần hỗ trợ khẩn cấp gấp',                     lang:'vi' },
        { text:'tôi cần giúp đỡ khẩn cấp ngay',                   lang:'vi' },
        { text:'đưa tôi đến trang hỗ trợ khẩn cấp',               lang:'vi' },
        { text:'I need emergency help right now',                 lang:'en' },
      ]},
    { name:'navigate.faqs', payload:{ action:'NAVIGATION', destination:'/faqs' },
      utterances:[
        { text:'cho tôi mở trang hỏi đáp',                        lang:'vi' },
        { text:'đưa tôi đến trang câu hỏi thường gặp',            lang:'vi' },
        { text:'mở trang faqs giúp tôi',                          lang:'vi' },
        { text:'open the faqs page for me',                       lang:'en' },
      ]},
    { name:'navigate.how_to_apply', payload:{ action:'NAVIGATION', destination:'/how-to-apply' },
      utterances:[
        { text:'cho tôi xem trang hướng dẫn cách nộp đơn xin visa', lang:'vi' },
        { text:'đưa tôi đến trang hướng dẫn nộp đơn',             lang:'vi' },
        { text:'mở trang how to apply giúp tôi',                  lang:'vi' },
        { text:'show me the how to apply page',                   lang:'en' },
      ]},
    { name:'navigate.guide', payload:{ action:'NAVIGATION', destination:'/guide' },
      utterances:[
        { text:'cho tôi xem trang có các bài hướng dẫn của các bạn', lang:'vi' },
        { text:'đưa tôi đến trang guide',                         lang:'vi' },
        { text:'mở trang cẩm nang giúp tôi',                      lang:'vi' },
        { text:'show me the guide page',                          lang:'en' },
      ]},
    { name:'navigate.guide_payment', payload:{ action:'NAVIGATION', destination:'/guide/payment-guideline' },
      utterances:[
        { text:'cho tôi xem trang nói về các phương thức thanh toán phí visa', lang:'vi' },
        { text:'đưa tôi đến trang hướng dẫn thanh toán phí',      lang:'vi' },
        { text:'mở trang payment guideline giúp tôi',             lang:'vi' },
        { text:'show me the payment guideline page',              lang:'en' },
      ]},
    { name:'navigate.guide_extra', payload:{ action:'NAVIGATION', destination:'/guide/extra-services' },
      utterances:[
        { text:'cho tôi xem trang có các dịch vụ thêm',           lang:'vi' },
        { text:'đưa tôi đến trang dịch vụ bổ sung',               lang:'vi' },
        { text:'mở trang extra services giúp tôi',                lang:'vi' },
        { text:'show me the extra services page',                 lang:'en' },
      ]},
    { name:'navigate.guide_extension', payload:{ action:'NAVIGATION', destination:'/guide/visa-extension' },
      utterances:[
        { text:'cho tôi xem trang hướng dẫn gia hạn visa',        lang:'vi' },
        { text:'đưa tôi đến trang gia hạn visa',                  lang:'vi' },
        { text:'mở trang visa extension giúp tôi',                lang:'vi' },
        { text:'show me the visa extension page',                 lang:'en' },
      ]},
    { name:'navigate.guide_exemptions', payload:{ action:'NAVIGATION', destination:'/guide/visa-exemptions' },
      utterances:[
        { text:'cho tôi xem trang nói về miễn visa cho các quốc gia', lang:'vi' },
        { text:'đưa tôi đến trang miễn thị thực',                 lang:'vi' },
        { text:'mở trang visa exemptions giúp tôi',               lang:'vi' },
        { text:'show me the visa exemptions page',                 lang:'en' },
      ]},
];

async function seedNlpCache() {
    const prisma = require('../dist/lib/prisma.js').default;

    log(`\n${B}${Y}=== SEED NLP CACHE — 8 CLICK + 9 NAVIGATE ===${RST}`);
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
    log(`${B}${C}SEED NLP CACHE — 8 CLICK + 9 NAVIGATE${RST}`);
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
