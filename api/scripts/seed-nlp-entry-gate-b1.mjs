/**
 * seed-nlp-entry-gate-b1.mjs — Seed NLP Cache cho case showcase Entry Gate (B1), demo cho khách
 * hàng cần ĐỘ TIN CẬY 100% (zero Gemini round-trip, zero token, < 10ms), không phụ thuộc tính
 * non-deterministic của LLM.
 *
 * 4 intent mới:
 *   - entry_gate.open_dialog            → VIRTUAL_CLICK target=hero_apply (Turn 1, mở Entry Gate Modal)
 *   - entry_gate.pick_new_application   → VIRTUAL_CLICK target=entry_gate_new_application (Turn 2)
 *   - entry_gate.pick_fast_track        → VIRTUAL_CLICK target=entry_gate_fast_track_apply (Turn 2)
 *   - entry_gate.pick_existing_urgent   → VIRTUAL_CLICK target=entry_gate_existing_urgent (Turn 2)
 *
 * QUAN TRỌNG — dọn conflict trước khi seed: utterance EN "Please guide me through doing an
 * e-visa from start to finish" đã từng được seed (không rõ từ đâu, isSeeded nhưng CHƯA usedInTraining)
 * dưới intent "navigate.apply" (payload cũ: VIRTUAL_CLICK btn-apply-header, không mở Entry Gate Modal,
 * không hỏi 3 lựa chọn) — nếu giữ nguyên, retrain sẽ dạy Naive Bayes 2 nhãn mâu thuẫn cho CHÍNH XÁC
 * cùng 1 câu. Xóa khỏi navigate.apply trước khi gắn vào intent mới.
 *
 * Chạy: node scripts/seed-nlp-entry-gate-b1.mjs
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

// Câu chữ Turn 1 GIỮ NGUYÊN, không thêm biến thể lan man — đây là demo có SCRIPT cố định, không
// phải coverage rộng. Thêm nhiều biến thể chỉ tăng nguy cơ va chạm vocab với navigate.apply
// (đã có nhiều utterance gần nghĩa: "tôi muốn xin visa", "I want to apply for a visa"...).
const NLP_INTENTS = [
    { name: 'entry_gate.open_dialog', payload: { action: 'VIRTUAL_CLICK', target: 'hero_apply' },
      utterances: [
        { text: 'Hãy hướng dẫn tôi làm e-visa từ đầu đến cuối', lang: 'vi' },
        { text: 'Please guide me through doing an e-visa from start to finish', lang: 'en' },
      ]},
    { name: 'entry_gate.pick_new_application', payload: { action: 'VIRTUAL_CLICK', target: 'entry_gate_new_application' },
      utterances: [
        { text: 'No, I need a new E-Visa', lang: 'en' },
      ]},
    { name: 'entry_gate.pick_fast_track', payload: { action: 'VIRTUAL_CLICK', target: 'entry_gate_fast_track_apply' },
      utterances: [
        { text: 'Yes, I have E-Visa & need Fast-Track', lang: 'en' },
      ]},
    { name: 'entry_gate.pick_existing_urgent', payload: { action: 'VIRTUAL_CLICK', target: 'entry_gate_existing_urgent' },
      utterances: [
        { text: 'Yes, I applied but need urgent help', lang: 'en' },
      ]},
];

// Utterance đụng nghĩa cần xóa khỏi intent CŨ trước khi gắn cho intent MỚI (xem comment đầu file).
const CONFLICTING_UTTERANCES = [
    { intentName: 'navigate.apply', text: 'Please guide me through doing an e-visa from start to finish' },
];

async function cleanupConflicts(prisma) {
    log(`\n${B}${Y}=== DỌN CONFLICT UTTERANCE (trước khi seed) ===${RST}`);
    sep(70, '═');
    for (const c of CONFLICTING_UTTERANCES) {
        const intent = await prisma.nlpIntent.findFirst({ where: { name: c.intentName } });
        if (!intent) { log(`${D}  [skip] intent "${c.intentName}" không tồn tại${RST}`); continue; }
        const utt = await prisma.nlpUtterance.findFirst({ where: { intentId: intent.id, text: c.text } });
        if (!utt) { log(`${D}  [skip] utterance không tồn tại trong "${c.intentName}": "${c.text}"${RST}`); continue; }
        await prisma.nlpUtterance.delete({ where: { id: utt.id } });
        log(`${R}  [-] Đã xóa utterance đụng nghĩa khỏi "${c.intentName}": "${c.text}"${RST}`);
    }
    sep(70, '═');
}

async function seedNlpCache() {
    const prisma = require('../dist/lib/prisma.js').default;

    await cleanupConflicts(prisma);

    log(`\n${B}${Y}=== SEED NLP CACHE — ENTRY GATE B1 (4 intent) ===${RST}`);
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
        log(`${Y}  DB đã seed xong (intents/utterances). Cần 1 trong 2 cách sau để hot-swap model mới vào server đang chạy:${RST}`);
        log(`${Y}    1. Set ADMIN_SEED_PASSWORD trong .env rồi chạy lại script này, HOẶC${RST}`);
        log(`${Y}    2. Vào Admin Panel → NLP Cache → bấm "Force Retrain" thủ công.${RST}`);
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
    log(`${B}${C}SEED NLP CACHE — ENTRY GATE B1 (showcase demo)${RST}`);
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
    console.error(`${R}${B}LỖI:${RST}`, e.message);
    process.exit(1);
});
