/**
 * seed-nlp-scroll-page.mjs — TẦNG 3: Train NLP Cache cho lệnh "Cuộn..." thuần (Track B Feature #5)
 *
 * Insert NlpIntent + NlpUtterance cho scroll_page (top/bottom/element) → retrain → hot-swap
 * model đang chạy trong API process (qua admin route, KHÔNG cần restart server).
 *
 * Chạy: node scripts/seed-nlp-scroll-page.mjs
 */

import 'dotenv/config';
import http from 'http';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// ─── Colors & log helper ────────────────────────────────────────────
const G='\x1b[32m',R='\x1b[31m',Y='\x1b[33m',C='\x1b[36m',M='\x1b[35m',D='\x1b[2m',RST='\x1b[0m',B='\x1b[1m';
const ts=()=>new Date().toISOString().slice(11,23);
const log=(...a)=>console.log(`[${ts()}]`,...a);
const sep=(n=70,c='─')=>console.log(c.repeat(n));

// ─── Admin auth (giống trigger-retrain.mjs) ────────────────────────
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

// ─── Định nghĩa intents mới: scroll.top / scroll.bottom / scroll.element.* ──
//
// scroll.top, scroll.bottom: generic, áp dụng MỌI route (không kèm target).
// scroll.element.<target>: tái sử dụng đúng target enum của click_ui_element,
// nhưng action=SCROLL_PAGE mode=element (KHÔNG kèm click).
//
// Lưu ý tránh đụng từ vựng với intent navigate.* / click.* đã train trước đó
// (bài học từ lỗi TB04: "scroll to the top" lẫn vào navigate.pricing).

const NLP_INTENTS = [
    { name:'scroll.top', payload:{ action:'SCROLL_PAGE', mode:'top' },
      utterances:[
        { text:'cuộn lên đầu trang',                              lang:'vi' },
        { text:'cuộn lên đầu trang này',                          lang:'vi' },
        { text:'kéo lên đầu trang giúp tôi',                      lang:'vi' },
        { text:'đưa tôi lên đầu trang',                           lang:'vi' },
        { text:'scroll to the top of the page',                   lang:'en' },
        { text:'scroll up to the top',                            lang:'en' },
        { text:'take me to the top of this page',                 lang:'en' },
      ]},
    { name:'scroll.bottom', payload:{ action:'SCROLL_PAGE', mode:'bottom' },
      utterances:[
        { text:'cuộn xuống cuối trang',                           lang:'vi' },
        { text:'cuộn xuống cuối trang giúp tôi',                  lang:'vi' },
        { text:'kéo xuống cuối trang đi',                         lang:'vi' },
        { text:'xuống cuối trang luôn',                           lang:'vi' },
        { text:'scroll down to the bottom of the page',           lang:'en' },
        { text:'scroll to the bottom',                            lang:'en' },
        { text:'take me to the bottom of this page',              lang:'en' },
      ]},
    { name:'scroll.element.hero_apply', payload:{ action:'SCROLL_PAGE', mode:'element', target:'hero_apply' },
      utterances:[
        { text:'cuộn đến phần nút apply now to ở giữa trang chủ, không cần bấm', lang:'vi' },
        { text:'cuộn đến phần apply now ở hero section',          lang:'vi' },
        { text:'scroll to the apply now section in the hero, just show me', lang:'en' },
      ]},
    { name:'scroll.element.cta_check_status', payload:{ action:'SCROLL_PAGE', mode:'element', target:'cta_check_status' },
      utterances:[
        { text:'cuộn đến phần check status ở cuối trang, mình chỉ muốn xem thôi', lang:'vi' },
        { text:'cuộn đến phần cta check status',                  lang:'vi' },
        { text:'scroll to the check status section at the bottom, just show me', lang:'en' },
      ]},
    { name:'scroll.element.check_status_submit', payload:{ action:'SCROLL_PAGE', mode:'element', target:'check_status_submit' },
      utterances:[
        { text:'cuộn đến phần form tra cứu trạng thái hồ sơ',     lang:'vi' },
        { text:'cuộn xuống form check status để xem thôi',        lang:'vi' },
        { text:'scroll to the check status form, no need to click', lang:'en' },
      ]},
];

// ─── Phase 1: Insert intents + utterances ──────────────────────────

async function seedNlpCache() {
    const prisma = require('../dist/lib/prisma.js').default;

    log(`\n${B}${Y}=== TẦNG 3 — PHASE 1: INSERT NLP CACHE (scroll_page intents) ===${RST}`);
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
    return { insertedIntents, insertedUtterances };
}

// ─── Phase 2: Trigger retrain qua admin route (hot-swap model đang chạy) ──

async function triggerRetrainViaAdminRoute() {
    log(`\n${B}${Y}=== TẦNG 3 — PHASE 2: RETRAIN + HOT-SWAP (qua admin API đang chạy) ===${RST}`);
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

// ─── Main ───────────────────────────────────────────────────────────

async function main() {
    sep(70,'═');
    log(`${B}${C}TẦNG 3 — TRAIN NLP CACHE CHO LỆNH "CUỘN..." (Track B Feature #5)${RST}`);
    log(`${D}Intents: scroll.top, scroll.bottom, scroll.element.* (5 intents, ${NLP_INTENTS.reduce((s,i)=>s+i.utterances.length,0)} utterances)${RST}`);
    sep(70,'═');

    await seedNlpCache();
    await triggerRetrainViaAdminRoute();

    sep(70,'═');
    log(`${G}${B}🎉 TẦNG 3 HOÀN TẤT!${RST}`);
    log(`${G}  NLP Cache đã có scroll.top / scroll.bottom / scroll.element.* — AI sẽ phản hồi NGAY${RST}`);
    log(`${G}  mà không lẫn vào navigate.* / click.* nữa.${RST}`);
    log(`${Y}  Bước tiếp theo: chạy lại "node scripts/e2e-scroll-page-command.mjs" để xác nhận TB04 PASS.${RST}`);
    sep(70,'═');
    process.exit(0);
}

main().catch(e => {
    console.error(`${R}${B}Fatal: ${e.message}${RST}`, e);
    process.exit(1);
});
