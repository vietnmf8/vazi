import http from 'http';
import crypto from 'crypto';

function request(options, body) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve({ statusCode: res.statusCode, data }));
        });
        req.on('error', reject);
        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RESET = "\x1b[0m";

async function createSession() {
    const joinRes = await request({
        hostname: 'localhost', port: 5000, path: '/api/v1/chat/join', method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    }, { user_name: "Tester_Context", website_language: "vi" });
    return JSON.parse(joinRes.data).data.session_id;
}

async function chat(sessionId, message, images = []) {
    const payload = {
        session_id: sessionId,
        message,
        sender: "USER",
        message_type: images.length > 0 ? "IMAGE" : "TEXT",
        images,
        client_id: crypto.randomUUID()
    };

    // Save message
    await request({
        hostname: 'localhost', port: 5000, path: '/api/v1/chat/message', method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    }, payload);

    // Stream response
    const res = await request({
        hostname: 'localhost', port: 5000, path: '/api/v1/chat/message/stream', method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    }, payload);

    // Xử lý chunk stream SSE giả lập để lấy câu trả lời cuối (dựa trên JSON format)
    const lines = res.data.split('\n').filter(l => l.startsWith('data: '));
    let text = "";
    for (const line of lines) {
        try {
            const data = JSON.parse(line.substring(6));
            if (data.chunk) text += data.chunk;
            if (data.done) return text;
        } catch (e) {}
    }
    return text;
}

async function runTest() {
    console.log(`\n${YELLOW}=== BẮT ĐẦU TEST E2E: CONTEXT LIMIT ===${RESET}`);
    const sessionId = await createSession();
    console.log(`Session ID: ${sessionId}`);

    try {
        const imageUrl = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png";
        console.log(`\n[User - Turn 1]: Gửi ảnh Pikachu và hỏi "Con vật trong hình là con gì?"`);
        const reply1 = await chat(sessionId, "Tuy đây là ảnh không liên quan visa, nhưng bạn hãy nhìn thử con vật trong hình là con gì giúp tôi nhé?", [imageUrl]);
        console.log(`[Bot  - Turn 1]: ${reply1}`);

        console.log(`\n[User - Turn 2]: "Xin chào, tôi là Thành"`);
        const reply2 = await chat(sessionId, "Xin chào, tôi là Thành");
        console.log(`[Bot  - Turn 2]: ${reply2}`);

        console.log(`\n[User - Turn 3]: "Hôm nay thời tiết đẹp không?"`);
        const reply3 = await chat(sessionId, "Hôm nay thời tiết đẹp không?");
        console.log(`[Bot  - Turn 3]: ${reply3}`);

        console.log(`\n[User - Turn 4]: Hỏi lại về bức ảnh ở Turn 1`);
        const reply4 = await chat(sessionId, "Bạn còn nhớ bức ảnh con vật tôi gửi ở lúc đầu không? Nó tên là gì vậy?");
        console.log(`[Bot  - Turn 4]: ${reply4}`);

        console.log(`\n${GREEN}=== TEST HOÀN TẤT ===${RESET}`);
    } catch (e) {
        console.error(`${RED}Lỗi trong quá trình test: ${e.message}${RESET}`);
    }
}

runTest();
