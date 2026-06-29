/**
 * probe-scores.mjs — Phân tích điểm NLP cho các utterance thất bại
 * Chạy: node scripts/probe-scores.mjs
 */
import 'dotenv/config';
import path from 'path';
import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const G='\x1b[32m',R='\x1b[31m',Y='\x1b[33m',C='\x1b[36m',B='\x1b[1m',D='\x1b[2m',RST='\x1b[0m';

// ─── Load latest model directly from disk ────────────────────────────────────
const modelDir = path.join(process.cwd(), 'data', 'nlp');
const modelFiles = fs.readdirSync(modelDir)
    .filter(f => /^model-v\d+\.json$/.test(f))
    .sort((a, b) => {
        const va = parseInt(a.match(/\d+/)[0]);
        const vb = parseInt(b.match(/\d+/)[0]);
        return vb - va;
    });

const latestFile = modelFiles[0];
const latestPath = path.join(modelDir, latestFile);
console.log(`${Y}Loading ${latestFile} from disk...${RST}`);

const { NlpManager } = require('node-nlp');
const manager = new NlpManager({ languages: ['vi', 'en'], autoSave: false });
await manager.load(latestPath);
console.log(`${G}Model loaded.${RST}\n`);

// ─── Probe texts ─────────────────────────────────────────────────────────────
const probes = [
    { text: 'bấm tiếp tục',               lang: 'vi', expect: 'click.continue_to_apply' },
    { text: 'bấm apply ở cuối trang',     lang: 'vi', expect: 'click.cta_apply' },
    { text: 'nhấn kiểm tra',              lang: 'vi', expect: 'click.hero_check_status' },
    { text: 'bấm submit',                 lang: 'vi', expect: 'click.check_status_submit' },
    { text: 'ấn gửi form khẩn cấp',       lang: 'vi', expect: 'click.emergency_submit' },
];

for (const { text, lang, expect } of probes) {
    const result = await manager.process(lang, text);
    const top4 = (result.classifications ?? [])
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .filter(c => c.score > 0.001)
        .map(c => `${c.intent}:${c.score.toFixed(4)}`);

    const predicted = result.intent === 'None' ? null : result.intent;
    const score = result.score;
    const ok = predicted === expect && score >= 0.95;
    const icon = ok ? `${G}✅${RST}` : `${R}❌${RST}`;
    console.log(`${icon} "${text}"`);
    console.log(`   expect: ${Y}${expect}${RST}`);
    console.log(`   got:    ${ok ? G : R}${predicted ?? 'None'}${RST} (score=${score.toFixed(4)})`);
    console.log(`   top5:   ${D}${top4.join(' | ')}${RST}`);
    console.log();
}
