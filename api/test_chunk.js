require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const { aiToolRegistry } = require('./dist/services/chatbot/tools');

async function test() {
    const model = genAI.getGenerativeModel({
        model: "gemini-flash-lite-latest",
        tools: [{ functionDeclarations: aiToolRegistry.getDeclarations() }]
    });
    
    const streamResult = await model.generateContentStream({
        contents: [{ role: "user", parts: [{ text: "Vui lòng kiểm tra mã VN-12345 giúp tôi" }] }]
    });
    
    for await (const chunk of streamResult.stream) {
        console.log("CHUNK PARTS:", JSON.stringify(chunk.candidates?.[0]?.content?.parts, null, 2));
    }
}
test();
