import 'dotenv/config';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

async function main() {
    const prisma = require('../dist/lib/prisma.js').default;
    const intents = await prisma.nlpIntent.findMany({
        where: { name: { startsWith: 'navigate.' } },
        include: { utterances: true },
    });
    for (const intent of intents) {
        const hitBam = intent.utterances.filter(u => /bấm/i.test(u.text));
        console.log(`${intent.name}: total=${intent.utterances.length} chứa "bấm"=${hitBam.length}`);
        if (hitBam.length) console.log('  ->', hitBam.map(u => u.text).join(' | '));
    }
    await prisma.$disconnect();
}
main();
