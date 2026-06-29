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
const CASES = [
    { msg: 'Tôi cần hỗ trợ khẩn cấp gấp', url: '/' },
    { msg: 'Cho tôi xem trang hướng dẫn cách nộp đơn xin visa', url: '/' },
    { msg: 'Cho tôi xem trang nói về các phương thức thanh toán phí visa', url: '/' },
    { msg: 'Cho tôi xem trang nói về miễn visa cho các quốc gia', url: '/' },
    { msg: 'Tôi muốn hỏi thêm một câu nữa', url: '/faqs' },
    { msg: 'Cho tôi quay lại bước điền thông tin người nộp đơn', url: '/apply' },
];
async function main() {
    for (const c of CASES) {
        const r1 = await httpPost('/api/v1/chat/join', { user_name: 'Diag2' });
        const sid = r1.data.session_id;
        const events = await streamMsg(sid, c.msg, c.url);
        console.log(`MSG: "${c.msg}" (${c.url})`);
        console.log('EVENTS:', JSON.stringify(events.filter(e => e.action || e.intent || e.error)));
        console.log('---');
    }
}
main().catch(e => console.error('FATAL', e));
