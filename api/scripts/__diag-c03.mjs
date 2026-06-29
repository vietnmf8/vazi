import 'dotenv/config';
import http from 'http';

const HOST = '127.0.0.1', PORT = 5000;

function httpPost(path, body) {
    const raw = JSON.stringify(body);
    return new Promise((resolve, reject) => {
        const req = http.request(
            { hostname: HOST, port: PORT, path, method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(raw) } },
            (res) => { let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(JSON.parse(d))); }
        );
        req.on('error', reject); req.write(raw); req.end();
    });
}

function streamMsg(sid, msg, url) {
    const body = JSON.stringify({
        session_id: sid, message: msg, sender: 'USER', message_type: 'TEXT',
        current_url: url, page_content: '', page_context: '[]', website_language: 'vi',
    });
    return new Promise((resolve, reject) => {
        const req = http.request(
            { hostname: HOST, port: PORT, path: '/api/v1/chat/message/stream', method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), Accept: 'text/event-stream' } },
            (res) => {
                const events = []; let buf = '';
                res.on('data', chunk => {
                    buf += chunk;
                    const lines = buf.split('\n'); buf = lines.pop() ?? '';
                    for (const l of lines) {
                        if (!l.startsWith('data: ')) continue;
                        try { const d = JSON.parse(l.slice(6)); events.push(d); } catch {}
                    }
                });
                res.on('end', () => resolve(events));
                res.on('error', reject);
            }
        );
        req.on('error', reject); req.write(body); req.end();
    });
}

const CASES = [
    { msg: 'Bấm Submit để gửi form liên hệ giúp tôi', url: '/about-us' },
    { msg: 'Bấm nút Continue to Apply để bắt đầu đăng ký', url: '/about-us' },
    { msg: 'Làm ơn giúp tôi bấm nút tra cứu trạng thái hồ sơ', url: '/faqs' },
];

async function main() {
    for (const c of CASES) {
        const r1 = await httpPost('/api/v1/chat/join', { user_name: 'DiagC03' });
        const sid = r1.data.session_id;
        const events = await streamMsg(sid, c.msg, c.url);
        console.log(`MSG: "${c.msg}" (${c.url})`);
        console.log('EVENTS:', JSON.stringify(events.filter(e => e.action || e.intent || e.error)));
        console.log('---');
    }
}
main().catch(e => console.error('FATAL', e));
