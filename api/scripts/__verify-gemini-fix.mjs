import 'dotenv/config';
import http from 'http';
const HOST = '127.0.0.1', PORT = 5000;
function httpPost(path, body) {
    const raw = JSON.stringify(body);
    return new Promise((resolve, reject) => {
        const req = http.request({ hostname: HOST, port: PORT, path, method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(raw) } },
            (res) => { let d=''; res.on('data', c=>d+=c); res.on('end', ()=>resolve(JSON.parse(d))); });
        req.on('error', reject); req.write(raw); req.end();
    });
}
function streamMsg(sid, msg, url) {
    const body = JSON.stringify({ session_id: sid, message: msg, sender: 'USER', message_type: 'TEXT', current_url: url, page_content: '', page_context: '[]', website_language: 'vi' });
    return new Promise((resolve, reject) => {
        const req = http.request({ hostname: HOST, port: PORT, path: '/api/v1/chat/message/stream', method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), Accept: 'text/event-stream' } },
            (res) => {
                const events = []; let buf = '';
                res.on('data', chunk => { buf += chunk; const lines = buf.split('\n'); buf = lines.pop() ?? '';
                    for (const l of lines) { if (!l.startsWith('data: ')) continue; try { events.push(JSON.parse(l.slice(6))); } catch {} } });
                res.on('end', () => resolve(events)); res.on('error', reject);
            });
        req.on('error', reject); req.write(body); req.end();
    });
}
// Câu hỏi cố ý KHÔNG có trong NLP Cache, ép rớt xuống Gemini + buộc Gemini gọi 1 tool DATA_RETRIEVAL
// (check_nationality) để qua flow function-calling thật, lặp lại nhiều lần để bắt race condition.
const MSG = 'Người Đức có cần xin visa trước khi đến Việt Nam không?';
async function main() {
    let ok = 0, fail = 0;
    for (let i = 0; i < 8; i++) {
        const r1 = await httpPost('/api/v1/chat/join', { user_name: `VerifyGeminiFix${i}` });
        const sid = r1.data.session_id;
        try {
            const events = await streamMsg(sid, MSG, '/');
            const hasText = events.some(e => e.chunk);
            const hasDone = events.some(e => e.done);
            if (hasText && hasDone) {
                ok++;
                console.log(`run${i+1}: OK (${events.filter(e=>e.chunk).length} chunks)`);
            } else {
                fail++;
                console.log(`run${i+1}: FAIL — events:`, JSON.stringify(events).slice(0, 200));
            }
        } catch (e) {
            fail++;
            console.log(`run${i+1}: ERROR`, e.message);
        }
    }
    console.log(`\nTỔNG: ${ok} OK / ${fail} fail trong 8 lần gọi (qua tool call thật)`);
}
main().catch(e => console.error('FATAL', e));
