/**
 * seed-nlp-step1-start-demo.mjs — Seed NLP Cache cho turn mở Step 1 trong case showcase demo
 * ("I want to fill out the visa application"). Trước đây turn này đi qua Gemini — phát hiện race
 * condition thật khi Gemini phản hồi trễ/lặp đúng lúc NLP Cache đã xử lý xong turn kế tiếp, làm
 * cuộc hội thoại hiện lại câu hỏi visa_type lần 2 sau khi user đã chọn xong. Chuyển luôn turn này
 * sang NLP Cache để loại Gemini khỏi TOÀN BỘ critical path của script demo — 100% deterministic.
 *
 * 1 intent mới: apply_step1.start_form → VIRTUAL_CLICK apply_step1_visa_type (mở dropdown,
 * không chọn giá trị — giống pattern "mở field" đã có ở focus_ui_field Phase 2/3).
 *
 * Chạy: node scripts/seed-nlp-step1-start-demo.mjs
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
const ADMIN_EMAIL = process.env.ALLOWED_ADMIN_EMAIL;
const ADMIN_PASS  = process.env.ADMIN_SEED_PASSWORD;

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
    { name: 'apply_step1.start_form', payload: { action: 'VIRTUAL_CLICK', target: 'apply_step1_visa_type' },
      utterances: [
        { text: 'I want to fill out the visa application', lang: 'en' },
      ]},
];

async function seedNlpCache() {
    const prisma = require('../dist/lib/prisma.js').default;

    log(`\n${B}${Y}=== SEED NLP CACHE — STEP 1 START FORM DEMO (1 intent) ===${RST}`);
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

    if (!ADMIN_EMAIL || !ADMIN_PASS) {
        log(`${Y}${B}  ⚠️  Thiếu ALLOWED_ADMIN_EMAIL hoặc ADMIN_SEED_PASSWORD trong .env — KHÔNG tự retrain.${RST}`);
        sep(70,'═');
        return;
    }

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
    log(`${B}${C}SEED NLP CACHE — STEP 1 START FORM DEMO${RST}`);
    sep(70,'═');

    await seedNlpCache();
    await triggerRetrainViaAdminRoute();

    sep(70,'═');
    log(`${G}${B}🎉 HOÀN TẤT!${RST}`);
    sep(70,'═');
    process.exit(0);
}

main().catch(e => {
    console.error(`${R}${B}LỖI:${RST}`, e.message);
    process.exit(1);
});
