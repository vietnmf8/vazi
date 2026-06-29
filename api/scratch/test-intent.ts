import { trainIntentRouter, matchIntent } from "../src/services/chatbot/intent-router.service";

async function main() {
    console.log("Training Intent Router from DB...");
    await trainIntentRouter();
    console.log("Training complete.");
    
    // Test matchIntent
    console.log("Testing matchIntent...");
    const query = process.argv[2] || "cho hỏi visa nhập cảnh 1 lần tốn bao nhiêu";
    const res = await matchIntent(query, "");
    console.log("Match response:", res);
}

main().catch(console.error);
