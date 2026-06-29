/**
 * trigger-retrain.mjs
 * Login as admin, then call POST /api/v1/admin/nlp-cache/retrain
 * to hot-swap the NLP model in the running API (no restart needed).
 */
import 'dotenv/config';
import http from 'http';

const HOST = '127.0.0.1', PORT = 5000;
const G='\x1b[32m',R='\x1b[31m',Y='\x1b[33m',B='\x1b[1m',RST='\x1b[0m';
const log = (...a) => console.log(...a);

function httpPost(path, body, token) {
    const raw = JSON.stringify(body);
    const headers = {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(raw),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return new Promise((resolve, reject) => {
        const req = http.request(
            { hostname: HOST, port: PORT, path, method: 'POST', headers },
            (res) => {
                let d = '';
                res.on('data', c => d += c);
                res.on('end', () => {
                    try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
                    catch { resolve({ status: res.statusCode, body: d }); }
                });
            }
        );
        req.on('error', reject);
        req.write(raw);
        req.end();
    });
}

async function main() {
    const email    = process.env.ALLOWED_ADMIN_EMAIL ?? 'vietnmf8@fullstack.edu.vn';
    const password = process.env.ADMIN_SEED_PASSWORD ?? 'Viet251001';

    // 1. Login
    log(`${Y}[1/2] Logging in as ${email}...${RST}`);
    const loginRes = await httpPost('/api/v1/auth/login', { email, password });
    if (loginRes.status !== 200) {
        console.error(`${R}Login failed (${loginRes.status}):${RST}`, JSON.stringify(loginRes.body));
        process.exit(1);
    }
    const token = loginRes.body?.data?.accessToken ?? loginRes.body?.data?.token;
    if (!token) {
        console.error(`${R}No accessToken in response:${RST}`, JSON.stringify(loginRes.body));
        process.exit(1);
    }
    log(`${G}✅ Login OK — got JWT${RST}`);

    // 2. Trigger retrain
    log(`${Y}[2/2] Triggering retrain (this may take 10-30s)...${RST}`);
    const t0 = Date.now();
    const retrainRes = await httpPost('/api/v1/admin/nlp-cache/retrain', {}, token);
    const ms = Date.now() - t0;
    if (retrainRes.status !== 200) {
        console.error(`${R}Retrain failed (${retrainRes.status}):${RST}`, JSON.stringify(retrainRes.body));
        process.exit(1);
    }
    const newVersion = retrainRes.body?.data?.newVersion;
    log(`${G}${B}✅ Retrain done in ${ms}ms — new model v${newVersion} hot-swapped in running API${RST}`);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
