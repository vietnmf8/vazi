/**
 * seed-nlp-focus-select-group.mjs — Seed NLP Cache cho 21 intent của focus_ui_field Phase 3
 * (nhóm Select: port/visa_option/processing_speed) (2026-06-24).
 *
 * Khác nationality (Phase 2, KHÔNG cache vì tham số mở) — 3 field này có enum NHỎ và ĐÓNG
 * (5 port + 9 visa_option + 4 processing_speed = 18 giá trị cố định), nên cache an toàn theo
 * cặp (target,value) cụ thể — action payload TĨNH, không cần trích xuất tham số nào.
 *
 * Chạy: node scripts/seed-nlp-focus-select-group.mjs
 */

import 'dotenv/config';
import http from 'http';

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
    // ── Open-only (3) ──────────────────────────────────────────────
    { name:'focus.port', payload:{ action:'VIRTUAL_CLICK', target:'quick_apply_port' },
      utterances:[
        { text:'mở giúp tôi ô chọn cửa khẩu trong form đăng ký nhanh', lang:'vi' },
        { text:'cho tôi mở ô chọn cửa khẩu để tôi tự chọn', lang:'vi' },
      ]},
    { name:'focus.visa_option', payload:{ action:'VIRTUAL_CLICK', target:'quick_apply_visa_option' },
      utterances:[
        { text:'mở giúp tôi ô chọn loại visa trong form đăng ký nhanh', lang:'vi' },
        { text:'cho tôi mở ô chọn loại visa để tôi tự chọn', lang:'vi' },
      ]},
    { name:'focus.processing_speed', payload:{ action:'VIRTUAL_CLICK', target:'quick_apply_processing_speed' },
      utterances:[
        { text:'mở giúp tôi ô chọn tốc độ xử lý trong form đăng ký nhanh', lang:'vi' },
        { text:'cho tôi mở ô chọn tốc độ xử lý để tôi tự chọn', lang:'vi' },
      ]},
    // ── Port — 5 giá trị (5) ───────────────────────────────────────
    { name:'focus.port.han', payload:{ action:'VIRTUAL_SELECT', target:'quick_apply_port', optionCode:'HAN' },
      utterances:[ { text:'chọn giúp tôi cửa khẩu Nội Bài trong form đăng ký nhanh', lang:'vi' } ]},
    { name:'focus.port.sgn', payload:{ action:'VIRTUAL_SELECT', target:'quick_apply_port', optionCode:'SGN' },
      utterances:[ { text:'chọn giúp tôi cửa khẩu Tân Sơn Nhất trong form đăng ký nhanh', lang:'vi' } ]},
    { name:'focus.port.dad', payload:{ action:'VIRTUAL_SELECT', target:'quick_apply_port', optionCode:'DAD' },
      utterances:[ { text:'chọn giúp tôi cửa khẩu Đà Nẵng trong form đăng ký nhanh', lang:'vi' } ]},
    { name:'focus.port.pqc', payload:{ action:'VIRTUAL_SELECT', target:'quick_apply_port', optionCode:'PQC' },
      utterances:[ { text:'chọn giúp tôi cửa khẩu Phú Quốc trong form đăng ký nhanh', lang:'vi' } ]},
    { name:'focus.port.moc_bai', payload:{ action:'VIRTUAL_SELECT', target:'quick_apply_port', optionCode:'MOC_BAI' },
      utterances:[ { text:'chọn giúp tôi cửa khẩu Mộc Bài trong form đăng ký nhanh', lang:'vi' } ]},
    // ── Visa Option — 9 giá trị (9) ────────────────────────────────
    { name:'focus.visa_option.code_fasttrack', payload:{ action:'VIRTUAL_SELECT', target:'quick_apply_visa_option', optionCode:'code-fasttrack' },
      utterances:[ { text:'chọn giúp tôi loại visa mã vạch siêu nhanh trong form đăng ký nhanh', lang:'vi' } ]},
    { name:'focus.visa_option.basic_fasttrack', payload:{ action:'VIRTUAL_SELECT', target:'quick_apply_visa_option', optionCode:'basic-fasttrack' },
      utterances:[ { text:'chọn giúp tôi loại visa mã vạch cơ bản trong form đăng ký nhanh', lang:'vi' } ]},
    { name:'focus.visa_option.evisa_30_single', payload:{ action:'VIRTUAL_SELECT', target:'quick_apply_visa_option', optionCode:'evisa-30-single' },
      utterances:[ { text:'chọn giúp tôi loại visa E-Visa 30 ngày 1 lần trong form đăng ký nhanh', lang:'vi' } ]},
    { name:'focus.visa_option.evisa_90_single', payload:{ action:'VIRTUAL_SELECT', target:'quick_apply_visa_option', optionCode:'evisa-90-single' },
      utterances:[ { text:'chọn giúp tôi loại visa E-Visa 90 ngày 1 lần trong form đăng ký nhanh', lang:'vi' } ]},
    { name:'focus.visa_option.evisa_90_multiple', payload:{ action:'VIRTUAL_SELECT', target:'quick_apply_visa_option', optionCode:'evisa-90-multiple' },
      utterances:[ { text:'chọn giúp tôi loại visa E-Visa 90 ngày nhiều lần trong form đăng ký nhanh', lang:'vi' } ]},
    { name:'focus.visa_option.voa_1m_single', payload:{ action:'VIRTUAL_SELECT', target:'quick_apply_visa_option', optionCode:'voa-1m-single' },
      utterances:[ { text:'chọn giúp tôi loại visa VOA 1 tháng 1 lần trong form đăng ký nhanh', lang:'vi' } ]},
    { name:'focus.visa_option.voa_1m_multiple', payload:{ action:'VIRTUAL_SELECT', target:'quick_apply_visa_option', optionCode:'voa-1m-multiple' },
      utterances:[ { text:'chọn giúp tôi loại visa VOA 1 tháng nhiều lần trong form đăng ký nhanh', lang:'vi' } ]},
    { name:'focus.visa_option.voa_3m_single', payload:{ action:'VIRTUAL_SELECT', target:'quick_apply_visa_option', optionCode:'voa-3m-single' },
      utterances:[ { text:'chọn giúp tôi loại visa VOA 3 tháng 1 lần trong form đăng ký nhanh', lang:'vi' } ]},
    { name:'focus.visa_option.voa_3m_multiple', payload:{ action:'VIRTUAL_SELECT', target:'quick_apply_visa_option', optionCode:'voa-3m-multiple' },
      utterances:[ { text:'chọn giúp tôi loại visa VOA 3 tháng nhiều lần trong form đăng ký nhanh', lang:'vi' } ]},
    // ── Processing Speed — 4 giá trị (4) ────────────────────────────
    { name:'focus.processing_speed.normal', payload:{ action:'VIRTUAL_SELECT', target:'quick_apply_processing_speed', optionCode:'normal' },
      utterances:[ { text:'chọn giúp tôi tốc độ xử lý bình thường 7 ngày trong form đăng ký nhanh', lang:'vi' } ]},
    { name:'focus.processing_speed.urgent_4d', payload:{ action:'VIRTUAL_SELECT', target:'quick_apply_processing_speed', optionCode:'urgent-4d' },
      utterances:[ { text:'chọn giúp tôi tốc độ xử lý khẩn 4 ngày trong form đăng ký nhanh', lang:'vi' } ]},
    { name:'focus.processing_speed.urgent_2d', payload:{ action:'VIRTUAL_SELECT', target:'quick_apply_processing_speed', optionCode:'urgent-2d' },
      utterances:[ { text:'chọn giúp tôi tốc độ xử lý khẩn 2 giờ trong form đăng ký nhanh', lang:'vi' } ]},
    { name:'focus.processing_speed.urgent_1d', payload:{ action:'VIRTUAL_SELECT', target:'quick_apply_processing_speed', optionCode:'urgent-1d' },
      utterances:[ { text:'chọn giúp tôi tốc độ xử lý khẩn 1 ngày trong form đăng ký nhanh', lang:'vi' } ]},
];

async function seedNlpCache() {
    const { createRequire } = await import('module');
    const require = createRequire(import.meta.url);
    const prisma = require('../dist/lib/prisma.js').default;

    log(`\n${B}${Y}=== SEED NLP CACHE — focus_ui_field Phase 3 (21 intent) ===${RST}`);
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
    await seedNlpCache();
    await triggerRetrainViaAdminRoute();
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
