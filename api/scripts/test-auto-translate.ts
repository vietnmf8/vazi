import { joinChatSession, sendChatMessage } from "../src/services/chat.service";
import prisma from "../src/lib/prisma";

async function runTests() {
    console.log("=== STARTING AUTO-TRANSLATE TESTS ===");
    
    try {
        // 1. Create a session
        const session = await joinChatSession({
            user_name: "Test User",
            nationality: "Vietnam",
            visa_interest: "E-Visa",
        });
        const sid = session.session_id;
        console.log(`[+] Created Session: ${sid}`);

        // 2. Test English message
        console.log("\n[+] Testing English message...");
        const resEn = await sendChatMessage({
            session_id: sid,
            sender: "USER",
            message_type: "TEXT",
            message: "Hello, I need help with my visa application.",
        });
        
        // Fetch the message from DB to verify
        const msgEn = await prisma.chatMessage.findUnique({
            where: { id: resEn.messages[0].id }
        });
        console.log("DB Msg EN:", {
            originalText: msgEn?.originalText,
            translatedText: msgEn?.translatedText,
            originalLanguage: msgEn?.originalLanguage
        });

        // 3. Test Vietnamese message
        console.log("\n[+] Testing Vietnamese message...");
        const resVi = await sendChatMessage({
            session_id: sid,
            sender: "USER",
            message_type: "TEXT",
            message: "Xin chào, tôi cần hỗ trợ visa.",
        });
        
        const msgVi = await prisma.chatMessage.findUnique({
            where: { id: resVi.messages[0].id }
        });
        console.log("DB Msg VI:", {
            originalText: msgVi?.originalText,
            translatedText: msgVi?.translatedText,
            originalLanguage: msgVi?.originalLanguage
        });

        // 4. Test SYSTEM_HIDDEN message (Should not translate)
        console.log("\n[+] Testing SYSTEM_HIDDEN message...");
        const resSys = await sendChatMessage({
            session_id: sid,
            sender: "USER",
            message_type: "TEXT",
            message: "[SYSTEM_HIDDEN] User clicked some button",
        });
        
        const msgSys = await prisma.chatMessage.findUnique({
            where: { id: resSys.messages[0].id }
        });
        console.log("DB Msg SYS:", {
            originalText: msgSys?.originalText,
            translatedText: msgSys?.translatedText,
            originalLanguage: msgSys?.originalLanguage
        });

        // 5. Test Admin Vietnamese message (Should translate back to Vietnamese... wait, since User's last message is Vietnamese, target is 'vi', so it shouldn't translate)
        // Wait, let's make User send English again first to set targetLang = 'en'
        console.log("\n[+] Sending English message to set targetLang to 'en'...");
        await sendChatMessage({
            session_id: sid,
            sender: "USER",
            message_type: "TEXT",
            message: "I need to check my visa status.",
        });

        console.log("\n[+] Testing Admin Vietnamese message...");
        const resAdmin = await sendChatMessage({
            session_id: sid,
            sender: "ADMIN",
            message_type: "TEXT",
            message: "Vui lòng cho tôi biết số hộ chiếu của bạn.",
        });

        const msgAdmin = await prisma.chatMessage.findUnique({
            where: { id: resAdmin.messages[0].id }
        });
        console.log("DB Msg ADMIN:", {
            originalText: msgAdmin?.originalText,
            translatedText: msgAdmin?.translatedText,
            originalLanguage: msgAdmin?.originalLanguage
        });

        console.log("\n=== ALL TESTS COMPLETED ===");
    } catch (e) {
        console.error("Test failed:", e);
    } finally {
        await prisma.$disconnect();
    }
}

runTests();
