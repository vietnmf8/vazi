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
    await chat.sendMessage("Vui lòng kiểm tra mã VN-12345 giúp tôi");
    console.log("HISTORY:", JSON.stringify(await chat.getHistory(), null, 2));
}
test();
