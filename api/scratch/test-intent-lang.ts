import 'dotenv/config';
import { trainIntentRouter, matchIntent } from '../src/services/chatbot/intent-router.service';

async function test() {
    await trainIntentRouter();
    
    const queries = [
        "Kiểm tra giúp tôi tình trạng hồ sơ mã EVS-12345"
    ];

    for (const q of queries) {
        console.log(`\n--- Test Query: "${q}" ---`);
        const res = await matchIntent(q, "");
        if (res) {
            console.log("Matched:", res.text.substring(0, 50) + "...");
            if (res.actions) console.log("Actions:", res.actions);
        } else {
            console.log("NO MATCH! Will fallback to Gemini.");
        }
    }
}

test().catch(console.error);
