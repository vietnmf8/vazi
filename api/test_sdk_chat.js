require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const { aiToolRegistry } = require('./dist/services/chatbot/tools');

async function test() {
    const model = genAI.getGenerativeModel({
        model: "gemini-flash-lite-latest",
        tools: [{ functionDeclarations: aiToolRegistry.getDeclarations() }]
    });
    
    const chat = model.startChat();
    try {
        console.log("Sending first message...");
        const result = await chat.sendMessage("Vui lòng kiểm tra mã VN-12345 giúp tôi");
        console.log("Function Calls:", result.response.functionCalls());
        
        console.log("Sending function response...");
        const result2 = await chat.sendMessage([{
            functionResponse: { name: "check_visa_status", response: { status: "APPROVED" } }
        }]);
        console.log("Reply:", result2.response.text());
        console.log("SUCCESS");
    } catch(e) {
        console.error("ERROR:", e);
    }
}
test();
