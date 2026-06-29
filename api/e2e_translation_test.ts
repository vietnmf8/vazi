import { createComment } from './src/services/comment.service';
import { replyToAdminComment } from './src/services/admin/comments.admin.service';
import prisma from './src/lib/prisma';

async function runTest() {
    console.log("1. Creating User Comment (French)");
    const userComment = await createComment({
        content: "Bonjour, comment puis-je obtenir un visa pour le Vietnam?",
        authorName: "French Guy",
        authorEmail: "french@example.com",
        authorNationality: "FR"
    });
    
    console.log("\n--- User Comment Created ---");
    console.log(`Original Content: Bonjour, comment puis-je obtenir un visa pour le Vietnam?`);
    console.log(`Detected Language: ${userComment.originalLanguage}`);
    console.log(`Translated Content (vi): ${userComment.translatedContent}`);
    console.log(`ID: ${userComment.id}`);

    console.log("\n2. Replying as Admin (Vietnamese)");
    const adminReply = await replyToAdminComment(
        userComment.id,
        "Bạn cần cung cấp hộ chiếu hợp lệ có hạn ít nhất 6 tháng."
    );

    console.log("\n--- Admin Reply Created ---");
    console.log(`Admin Input (vi): Bạn cần cung cấp hộ chiếu hợp lệ có hạn ít nhất 6 tháng.`);
    console.log(`Target Translation Language: ${adminReply.original_language}`);
    console.log(`Translated Content (fr): ${adminReply.translated_content}`);
    console.log("\nE2E Test Completed Successfully!");
}

runTest().catch(console.error).finally(() => prisma.$disconnect());
