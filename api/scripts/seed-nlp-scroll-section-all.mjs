/**
 * seed-nlp-scroll-section-all.mjs — Seed NLP Cache cho TOÀN BỘ 30 target trong SECTION_PAGE_MAP
 * (Universal Section Scroll, 2026-06-23).
 *
 * Mở rộng từ seed-nlp-scroll-section-combo.mjs (6 target ban đầu) — giờ phủ đủ 30/30, loại bỏ
 * phụ thuộc vào Gemini (giảm latency từ ~1-2s xuống <10ms, zero token, zero non-determinism).
 *
 * NGUYÊN TẮC CHỌN TỪ KHÓA — quan trọng để tránh classifier nhầm lẫn (xem bài học từ
 * chat.service.ts _staleIntentGuards):
 *   - 3 target FAQ khác nhau (faq / faqs_list / check_status_faqs) PHẢI có từ khóa phân biệt:
 *     faq = generic ngắn, faqs_list = có "danh sách"/"toàn bộ", check_status_faqs = luôn kèm
 *     "tra cứu"/"trạng thái".
 *   - blog_preview (cẩm nang du lịch) vs guide_links (bài hướng dẫn) — khác hẳn ngữ cảnh.
 *   - pricing (chung, KHÔNG kèm "voa"/"e-visa") vs pricing_evisa/pricing_voa (LUÔN kèm rõ loại).
 *   - how_it_works (chung) vs how_to_apply_timeline (LUÔN kèm "5 bước"/"các bước cụ thể").
 *
 * actionPayload chỉ cần đúng target — destination thật được resolveScrollTarget() tính lại
 * runtime dựa trên current_url (xem chat.service.ts resolver + scroll-page.tool.ts).
 *
 * Chạy: node scripts/seed-nlp-scroll-section-all.mjs
 */

import 'dotenv/config';
import http from 'http';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const G='\x1b[32m',R='\x1b[31m',Y='\x1b[33m',C='\x1b[36m',D='\x1b[2m',RST='\x1b[0m',B='\x1b[1m';
const ts=()=>new Date().toISOString().slice(11,23);
const log=(...a)=>console.log(`[${ts()}]`,...a);
const sep=(n=70,c='─')=>console.log(c.repeat(n));

const HOST='127.0.0.1', PORT=5000;
const ADMIN_EMAIL = process.env.ALLOWED_ADMIN_EMAIL ?? 'vietnmf8@fullstack.edu.vn';
const ADMIN_PASS  = process.env.ADMIN_SEED_PASSWORD ?? 'Viet251001';

function httpJson(method, path, body, token) {
    const raw = body ? JSON.stringify(body) : undefined;
    const headers = { 'Content-Type': 'application/json' };
    if (raw) headers['Content-Length'] = Buffer.byteLength(raw);
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return new Promise((resolve, reject) => {
        const req = http.request({ hostname: HOST, port: PORT, path, method, headers },
            (res) => { let d=''; res.on('data',c=>d+=c); res.on('end',()=>resolve({status:res.statusCode, body:JSON.parse(d||'{}')})); }
        );
        req.on('error', reject);
        if (raw) req.write(raw);
        req.end();
    });
}

// vi/en mỗi target — actionPayload chỉ cần target đúng (destination tính lại runtime)
const NLP_INTENTS = [
    // ── 6 intent ĐÃ TỒN TẠI — chỉ bổ sung thêm utterance "Tôi muốn xem phần X" để tăng coverage ──
    { name:'scroll.element.how_it_works', payload:{ action:'SCROLL_PAGE', mode:'element', target:'how_it_works' },
      utterances:[ { text:'tôi muốn xem phần quy trình thực hiện', lang:'vi' } ] },
    { name:'scroll.element.about_team', payload:{ action:'SCROLL_PAGE', mode:'element', target:'about_team' },
      utterances:[ { text:'tôi muốn xem phần đội ngũ nòng cốt', lang:'vi' } ] },
    { name:'scroll.element.emergency_pricing', payload:{ action:'SCROLL_PAGE', mode:'element', target:'emergency_pricing' },
      utterances:[ { text:'tôi muốn xem phần bảng giá làm khẩn cấp', lang:'vi' } ] },
    { name:'scroll.element.how_to_apply_documents', payload:{ action:'SCROLL_PAGE', mode:'element', target:'how_to_apply_documents' },
      utterances:[ { text:'tôi muốn xem phần tài liệu bắt buộc cần chuẩn bị', lang:'vi' } ] },
    { name:'scroll.element.pricing_evisa', payload:{ action:'SCROLL_PAGE', mode:'element', target:'pricing_evisa' },
      utterances:[ { text:'tôi muốn xem phần bảng giá e-visa', lang:'vi' } ] },
    { name:'scroll.element.pricing_voa', payload:{ action:'SCROLL_PAGE', mode:'element', target:'pricing_voa' },
      utterances:[ { text:'tôi muốn xem phần bảng giá voa', lang:'vi' } ] },

    // ── 24 intent MỚI ──
    { name:'scroll.element.pricing', payload:{ action:'SCROLL_PAGE', mode:'element', target:'pricing' },
      utterances:[
        { text:'tôi muốn xem phần bảng giá tổng quan',                       lang:'vi' },
        { text:'cho tôi xem bảng giá visa nói chung',                        lang:'vi' },
        { text:'cho tôi xem mục giá cả trên trang chủ',                      lang:'vi' },
        { text:'show me the general pricing overview',                      lang:'en' },
      ]},
    { name:'scroll.element.trust_signals', payload:{ action:'SCROLL_PAGE', mode:'element', target:'trust_signals' },
      utterances:[
        { text:'tôi muốn xem phần chứng nhận uy tín',                       lang:'vi' },
        { text:'cho tôi xem các chứng nhận của công ty',                    lang:'vi' },
        { text:'cho tôi xem phần đối tác và chứng chỉ uy tín',              lang:'vi' },
        { text:'show me your certifications and trust badges',             lang:'en' },
      ]},
    { name:'scroll.element.faq', payload:{ action:'SCROLL_PAGE', mode:'element', target:'faq' },
      utterances:[
        { text:'tôi muốn xem phần câu hỏi thường gặp',                      lang:'vi' },
        { text:'cho tôi xem vài câu hỏi thường gặp ở trang chủ',            lang:'vi' },
        { text:'cho tôi xem mục faq trên trang chủ',                        lang:'vi' },
        { text:'show me some frequently asked questions',                   lang:'en' },
      ]},
    { name:'scroll.element.comments', payload:{ action:'SCROLL_PAGE', mode:'element', target:'comments' },
      utterances:[
        { text:'tôi muốn xem phần bình luận đánh giá của khách hàng',       lang:'vi' },
        { text:'cho tôi xem nhận xét của khách hàng đã dùng dịch vụ',       lang:'vi' },
        { text:'cho tôi xem phần phản hồi đánh giá dịch vụ',                lang:'vi' },
        { text:'show me customer reviews and comments',                    lang:'en' },
      ]},
    { name:'scroll.element.nationalities', payload:{ action:'SCROLL_PAGE', mode:'element', target:'nationalities' },
      utterances:[
        { text:'tôi muốn xem phần kiểm tra miễn visa theo quốc tịch',       lang:'vi' },
        { text:'cho tôi xem mục kiểm tra quốc tịch có được miễn visa không', lang:'vi' },
        { text:'cho tôi xem phần tra quốc tịch nào được miễn thị thực',     lang:'vi' },
        { text:'show me the nationality visa exemption checker',           lang:'en' },
      ]},
    { name:'scroll.element.quick_apply', payload:{ action:'SCROLL_PAGE', mode:'element', target:'quick_apply' },
      utterances:[
        { text:'tôi muốn xem phần đăng ký nhanh chọn quốc tịch',            lang:'vi' },
        { text:'cho tôi xem form đăng ký nhanh trên trang chủ',             lang:'vi' },
        { text:'cho tôi xem mục quick apply',                               lang:'vi' },
        { text:'show me the quick apply form',                             lang:'en' },
      ]},
    { name:'scroll.element.blog_preview', payload:{ action:'SCROLL_PAGE', mode:'element', target:'blog_preview' },
      utterances:[
        { text:'tôi muốn xem phần bài viết cẩm nang du lịch',               lang:'vi' },
        { text:'cho tôi xem các bài viết cẩm nang mới nhất',                lang:'vi' },
        { text:'cho tôi xem mục blog du lịch trên trang chủ',               lang:'vi' },
        { text:'show me the latest travel blog articles',                  lang:'en' },
      ]},
    { name:'scroll.element.cta_section', payload:{ action:'SCROLL_PAGE', mode:'element', target:'cta_section' },
      utterances:[
        { text:'tôi muốn xem phần kêu gọi hành động ở cuối trang',          lang:'vi' },
        { text:'cho tôi xem phần cuối trang chủ',                          lang:'vi' },
        { text:'cho tôi xem mục cta ở dưới cùng trang chủ',                 lang:'vi' },
        { text:'show me the call to action section at the bottom',         lang:'en' },
      ]},
    { name:'scroll.element.about_mission', payload:{ action:'SCROLL_PAGE', mode:'element', target:'about_mission' },
      utterances:[
        { text:'tôi muốn xem phần sứ mệnh dịch vụ của các bạn',             lang:'vi' },
        { text:'cho tôi xem sứ mệnh của fastvisa',                         lang:'vi' },
        { text:'cho tôi xem cam kết chất lượng dịch vụ của công ty',        lang:'vi' },
        { text:'show me your company mission',                            lang:'en' },
      ]},
    { name:'scroll.element.about_scene_slider', payload:{ action:'SCROLL_PAGE', mode:'element', target:'about_scene_slider' },
      utterances:[
        { text:'tôi muốn xem phần trải nghiệm địa danh việt nam',          lang:'vi' },
        { text:'cho tôi xem các địa điểm du lịch nổi tiếng việt nam',       lang:'vi' },
        { text:'cho tôi xem slide ảnh cảnh đẹp việt nam',                  lang:'vi' },
        { text:'show me the vietnam destinations slider',                  lang:'en' },
      ]},
    { name:'scroll.element.about_features', payload:{ action:'SCROLL_PAGE', mode:'element', target:'about_features' },
      utterances:[
        { text:'tôi muốn xem phần điểm ưu việt của các bạn',                lang:'vi' },
        { text:'cho tôi xem lý do nên chọn fastvisa',                      lang:'vi' },
        { text:'cho tôi xem các tính năng nổi bật của dịch vụ',             lang:'vi' },
        { text:'show me your why-us features',                            lang:'en' },
      ]},
    { name:'scroll.element.check_status_form', payload:{ action:'SCROLL_PAGE', mode:'element', target:'check_status_form' },
      utterances:[
        { text:'tôi muốn xem phần form nhập mã booking để tra cứu',        lang:'vi' },
        { text:'cho tôi xem form tra cứu trạng thái hồ sơ',                lang:'vi' },
        { text:'cho tôi xem ô nhập mã đơn để kiểm tra trạng thái',         lang:'vi' },
        { text:'show me the booking number lookup form',                  lang:'en' },
      ]},
    { name:'scroll.element.check_status_faqs', payload:{ action:'SCROLL_PAGE', mode:'element', target:'check_status_faqs' },
      utterances:[
        { text:'tôi muốn xem phần câu hỏi liên quan tra cứu trạng thái',   lang:'vi' },
        { text:'cho tôi xem câu hỏi thường gặp về tra cứu hồ sơ',          lang:'vi' },
        { text:'cho tôi xem faq về kiểm tra trạng thái đơn',               lang:'vi' },
        { text:'show me faqs about checking application status',          lang:'en' },
      ]},
    { name:'scroll.element.contact_info', payload:{ action:'SCROLL_PAGE', mode:'element', target:'contact_info' },
      utterances:[
        { text:'tôi muốn xem phần thông tin liên hệ hotline email',        lang:'vi' },
        { text:'cho tôi xem địa chỉ và số điện thoại liên hệ',             lang:'vi' },
        { text:'cho tôi xem hotline và email hỗ trợ',                     lang:'vi' },
        { text:'show me your contact information',                        lang:'en' },
      ]},
    { name:'scroll.element.contact_form', payload:{ action:'SCROLL_PAGE', mode:'element', target:'contact_form' },
      utterances:[
        { text:'tôi muốn xem phần form gửi câu hỏi liên hệ',               lang:'vi' },
        { text:'cho tôi xem form liên hệ để gửi tin nhắn',                 lang:'vi' },
        { text:'cho tôi xem mục gửi yêu cầu hỗ trợ qua form',             lang:'vi' },
        { text:'show me the contact form to send a message',              lang:'en' },
      ]},
    { name:'scroll.element.emergency_timeline', payload:{ action:'SCROLL_PAGE', mode:'element', target:'emergency_timeline' },
      utterances:[
        { text:'tôi muốn xem phần lịch trình xử lý khẩn cấp',              lang:'vi' },
        { text:'cho tôi xem quy trình xử lý hồ sơ khẩn cấp',               lang:'vi' },
        { text:'cho tôi xem timeline làm visa gấp',                       lang:'vi' },
        { text:'show me the emergency processing timeline',                lang:'en' },
      ]},
    { name:'scroll.element.emergency_form', payload:{ action:'SCROLL_PAGE', mode:'element', target:'emergency_form' },
      utterances:[
        { text:'tôi muốn xem phần form yêu cầu khẩn cấp',                  lang:'vi' },
        { text:'cho tôi xem form gửi yêu cầu xử lý gấp',                   lang:'vi' },
        { text:'cho tôi xem mục đăng ký dịch vụ khẩn cấp',                 lang:'vi' },
        { text:'show me the emergency request form',                      lang:'en' },
      ]},
    { name:'scroll.element.emergency_correction', payload:{ action:'SCROLL_PAGE', mode:'element', target:'emergency_correction' },
      utterances:[
        { text:'tôi muốn xem phần dịch vụ sửa đổi thông tin visa lỗi',     lang:'vi' },
        { text:'cho tôi xem dịch vụ sửa hồ sơ visa bị sai thông tin',      lang:'vi' },
        { text:'cho tôi xem mục correction service',                      lang:'vi' },
        { text:'show me the visa correction service',                     lang:'en' },
      ]},
    { name:'scroll.element.faqs_list', payload:{ action:'SCROLL_PAGE', mode:'element', target:'faqs_list' },
      utterances:[
        { text:'tôi muốn xem phần danh sách câu hỏi thường gặp',           lang:'vi' },
        { text:'cho tôi xem toàn bộ câu hỏi ở trang hỏi đáp',              lang:'vi' },
        { text:'cho tôi xem đầy đủ danh sách faq trong trang faqs',        lang:'vi' },
        { text:'show me the full list of faqs',                           lang:'en' },
      ]},
    { name:'scroll.element.how_to_apply_timeline', payload:{ action:'SCROLL_PAGE', mode:'element', target:'how_to_apply_timeline' },
      utterances:[
        { text:'tôi muốn xem phần quy trình 5 bước nộp hồ sơ',             lang:'vi' },
        { text:'cho tôi xem các bước cụ thể để nộp đơn xin visa',          lang:'vi' },
        { text:'cho tôi xem timeline 5 bước làm hồ sơ',                    lang:'vi' },
        { text:'show me the 5-step application timeline',                 lang:'en' },
      ]},
    { name:'scroll.element.guide_links', payload:{ action:'SCROLL_PAGE', mode:'element', target:'guide_links' },
      utterances:[
        { text:'tôi muốn xem phần danh sách bài viết hướng dẫn',           lang:'vi' },
        { text:'cho tôi xem các bài hướng dẫn trên trang guide',           lang:'vi' },
        { text:'cho tôi xem hub các trang hướng dẫn',                      lang:'vi' },
        { text:'show me the list of guide articles',                      lang:'en' },
      ]},
    { name:'scroll.element.pax_discount', payload:{ action:'SCROLL_PAGE', mode:'element', target:'pax_discount' },
      utterances:[
        { text:'tôi muốn xem phần ưu đãi giảm giá theo nhóm',              lang:'vi' },
        { text:'cho tôi xem mức giảm giá khi đăng ký nhóm đông người',     lang:'vi' },
        { text:'cho tôi xem ưu đãi pax discount',                         lang:'vi' },
        { text:'show me the group discount pricing',                      lang:'en' },
      ]},
    { name:'scroll.element.extra_services_guide', payload:{ action:'SCROLL_PAGE', mode:'element', target:'extra_services_guide' },
      utterances:[
        { text:'tôi muốn xem phần dịch vụ bổ sung đi kèm',                 lang:'vi' },
        { text:'cho tôi xem các dịch vụ thêm như đưa đón sân bay',         lang:'vi' },
        { text:'cho tôi xem extra services trên trang bảng giá',          lang:'vi' },
        { text:'show me the extra services like airport pickup',          lang:'en' },
      ]},
    { name:'scroll.element.apply_form', payload:{ action:'SCROLL_PAGE', mode:'element', target:'apply_form' },
      utterances:[
        { text:'tôi muốn xem phần form đăng ký nộp đơn',                   lang:'vi' },
        { text:'cho tôi xem form đăng ký visa',                            lang:'vi' },
        { text:'cho tôi xem khung điền đơn xin e-visa',                    lang:'vi' },
        { text:'show me the visa application form',                       lang:'en' },
      ]},
];

async function seedNlpCache() {
    const prisma = require('../dist/lib/prisma.js').default;

    log(`\n${B}${Y}=== SEED NLP CACHE — FULL 30 SECTION TARGET ===${RST}`);
    sep(70,'═');

    let insertedIntents=0, insertedUtterances=0, skippedIntents=0, skippedUtterances=0;

    for (const intent of NLP_INTENTS) {
        const existing = await prisma.nlpIntent.findFirst({ where: { name: intent.name } });
        let intentRecord;
        if (existing) {
            log(`${D}  [SKIP intent] "${intent.name}" đã tồn tại (id=${existing.id}) — chỉ thêm utterance mới${RST}`);
            intentRecord = existing;
            skippedIntents++;
        } else {
            intentRecord = await prisma.nlpIntent.create({
                data: { name: intent.name, actionPayload: intent.payload, isActive: true }
            });
            log(`${G}  [+] Intent "${intent.name}" → payload=${JSON.stringify(intent.payload)}${RST}`);
            insertedIntents++;
        }

        for (const utt of intent.utterances) {
            const exists = await prisma.nlpUtterance.findFirst({
                where: { intentId: intentRecord.id, text: utt.text }
            });
            if (!exists) {
                await prisma.nlpUtterance.create({
                    data: { intentId: intentRecord.id, text: utt.text, language: utt.lang,
                            isSeeded: true, usedInTraining: false }
                });
                log(`${C}      + utterance [${utt.lang}] "${utt.text}"${RST}`);
                insertedUtterances++;
            } else {
                log(`${D}      [skip] utterance đã tồn tại: "${utt.text}"${RST}`);
                skippedUtterances++;
            }
        }
    }

    sep(70);
    log(`  ${G}${B}Inserted: ${insertedIntents} intents mới, ${insertedUtterances} utterances mới${RST}`);
    log(`  ${D}Skipped (đã tồn tại): ${skippedIntents} intents, ${skippedUtterances} utterances${RST}`);
    sep(70,'═');

    await prisma.$disconnect();
}

async function triggerRetrainViaAdminRoute() {
    log(`\n${B}${Y}=== RETRAIN + HOT-SWAP (qua admin API đang chạy) ===${RST}`);
    sep(70,'═');

    log(`  ${D}[1/2] Đăng nhập admin (${ADMIN_EMAIL})...${RST}`);
    const loginRes = await httpJson('POST', '/api/v1/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASS });
    const token = loginRes.body?.data?.accessToken ?? loginRes.body?.data?.token;
    if (!token) {
        log(`${R}${B}  ❌ Đăng nhập thất bại: ${JSON.stringify(loginRes.body)}${RST}`);
        throw new Error('Không lấy được JWT admin');
    }
    log(`  ${G}✅ Login OK — đã có JWT${RST}`);

    log(`  ${D}[2/2] Trigger retrain (có thể mất 10-30s)...${RST}`);
    const t0 = Date.now();
    const retrainRes = await httpJson('POST', '/api/v1/admin/nlp-cache/retrain', {}, token);
    const ms = Date.now() - t0;

    if (retrainRes.status >= 400) {
        log(`${R}${B}  ❌ Retrain thất bại (HTTP ${retrainRes.status}): ${JSON.stringify(retrainRes.body)}${RST}`);
        throw new Error('Retrain thất bại');
    }

    const newVersion = retrainRes.body?.data?.newVersion ?? '?';
    log(`  ${G}${B}✅ Retrain hoàn tất trong ${ms}ms — model v${newVersion} đã hot-swap vào API đang chạy${RST}`);
    sep(70,'═');
}

async function main() {
    sep(70,'═');
    log(`${B}${C}SEED NLP CACHE — FULL 30 SECTION TARGET${RST}`);
    log(`${D}Intents: ${NLP_INTENTS.length} (${NLP_INTENTS.reduce((s,i)=>s+i.utterances.length,0)} utterances, gồm cả utterance bổ sung cho 6 intent cũ)${RST}`);
    sep(70,'═');

    await seedNlpCache();
    await triggerRetrainViaAdminRoute();

    sep(70,'═');
    log(`${G}${B}🎉 HOÀN TẤT!${RST}`);
    sep(70,'═');
    process.exit(0);
}

main().catch(e => {
    console.error(`${R}${B}Fatal: ${e.message}${RST}`, e);
    process.exit(1);
});
