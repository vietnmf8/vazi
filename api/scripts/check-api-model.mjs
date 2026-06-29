/**
 * check-api-model.mjs — Kiểm tra model đang chạy trong API
 * Gọi admin stats endpoint để xem version model đang được dùng
 */
import 'dotenv/config';
import http from 'http';

const HOST = '127.0.0.1', PORT = 5000;

function httpPost(path, body, token) {
    const raw = JSON.stringify(body);
    const headers = { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(raw) };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return new Promise((resolve, reject) => {
        const req = http.request(
            { hostname: HOST, port: PORT, path, method: 'POST', headers },
            (res) => { let d = ''; res.on('data', c => d += c); res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(d) }); } catch { resolve({ status: res.statusCode, body: d }); } }); }
        );
        req.on('error', reject); req.write(raw); req.end();
    });
}

function httpGet(path, token) {
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return new Promise((resolve, reject) => {
        const req = http.request(
            { hostname: HOST, port: PORT, path, method: 'GET', headers },
            (res) => { let d = ''; res.on('data', c => d += c); res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(d) }); } catch { resolve({ status: res.statusCode, body: d }); } }); }
        );
        req.on('error', reject); req.end();
    });
}

const loginRes = await httpPost('/api/v1/auth/login', {
    email: process.env.ALLOWED_ADMIN_EMAIL ?? 'vietnmf8@fullstack.edu.vn',
    password: process.env.ADMIN_SEED_PASSWORD ?? 'Viet251001',
});
const token = loginRes.body?.data?.accessToken ?? loginRes.body?.data?.token;
if (!token) { console.error('Login failed'); process.exit(1); }

const statsRes = await httpGet('/api/v1/admin/nlp-cache/stats', token);
const model = statsRes.body?.data?.model;
const intents = statsRes.body?.data?.intents;

console.log('\n=== API NLP Model Stats ===');
console.log(`Model version  : v${model?.version ?? '?'}`);
console.log(`Trained at     : ${model?.trainedAt ?? '?'}`);
console.log(`Utterance count: ${model?.utteranceCount ?? '?'}`);
console.log(`Intent count   : ${model?.intentCount ?? '?'}`);

if (intents) {
    console.log('\n=== Intent Utterance Counts ===');
    for (const i of intents) {
        console.log(`  ${i.name.padEnd(35)} ${i.utteranceCount} utterances`);
    }
}
