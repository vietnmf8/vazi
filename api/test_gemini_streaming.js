require('dotenv').config();
const { generateVisaAssistantReplyStreaming } = require('./dist/services/chatbot/gemini.service');
const { aiToolRegistry } = require('./dist/services/chatbot/tools');

// Mock response object
class MockResponse {
    constructor() {
        this.writableEnded = false;
        this.events = [];
    }
    write(data) {
        this.events.push(data);
    }
}

async function runTest() {
    console.log("=== Starting Gemini Streaming Test ===");
    const res = new MockResponse();
    
    // Yêu cầu bắt buộc gọi tool (dựa theo prompt có sẵn trong file, nếu nhắc VN-12345 nó phải gọi check_visa_status)
    const message = "Vui lòng kiểm tra mã VN-12345 giúp tôi";
    console.log("User Message:", message);
    
    try {
        const result = await generateVisaAssistantReplyStreaming(message, [], res);
        console.log("Final Reply:", result.reply);
        console.log("History length:", result.updatedHistory.length);
        console.log("Events received:", res.events.length);
        console.log("Test OK!");
    } catch (e) {
        console.error("Test Failed with Error:", e);
    }
}

runTest();
