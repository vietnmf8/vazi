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
    const streamResult = await chat.sendMessageStream("Vui lòng kiểm tra mã VN-12345 giúp tôi");
    
    for await (const chunk of streamResult.stream) {
        // consume
    }
    await streamResult.response;
    await new Promise(r => setTimeout(r, 1000));
    
    console.log("HISTORY:", await chat.getHistory());
}
test();
