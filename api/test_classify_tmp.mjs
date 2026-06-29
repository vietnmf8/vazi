import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { NlpManager } = require('node-nlp');

const manager = new NlpManager({ languages: ['vi','en'], autoSave: false });
await manager.load('./data/nlp/model-v25.json');

const tests = [
  ['vi', 'tôi muốn chọn quốc tịch ở phần đăng ký nhanh'],
  ['vi', 'cho tôi mở ô chọn quốc tịch trong form đăng ký nhanh'],
  ['vi', 'mở giúp tôi phần chọn quốc tịch để tôi nhập'],
  ['en', 'let me pick my nationality in the quick apply form'],
  ['vi', 'tôi muốn xem phần đăng ký nhanh chọn quốc tịch'],
];

for (const [lang, text] of tests) {
  const r = await manager.process(lang, text);
  console.log(`\n[${lang}] "${text}"`);
  console.log(`  -> intent=${r.intent} score=${r.score}`);
  if (r.classifications) {
    const top = r.classifications.slice(0,3);
    for (const c of top) console.log(`     candidate: ${c.intent} = ${c.score}`);
  }
}
