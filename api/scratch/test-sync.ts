import { syncNlpDataFromDb } from "../src/services/chatbot/nlp-sync.service";
import { trainIntentRouter, matchIntent } from "../src/services/chatbot/intent-router.service";

async function main() {
    console.log("Syncing NLP Data from DB...");
    const count = await syncNlpDataFromDb();
    console.log("Generated new intents:", count);
    
    console.log("Training Intent Router...");
    await trainIntentRouter();
    console.log("Training complete.");
    
    // Test matchIntent
    console.log("Testing matchIntent with: 'bao nhieu tien vay'");
    const res = await matchIntent("bao nhieu tien vay", "");
    console.log("Match response:", res);
}

main().catch(console.error);
