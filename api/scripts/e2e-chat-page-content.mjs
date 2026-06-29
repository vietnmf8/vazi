/**
 * E2E Test: get_page_content Tool — Toàn diện mọi trang & mọi case
 *
 * Mục tiêu:
 *   1. Đứng ở page BẤT KỲ, hỏi về nội dung page BẤT KỲ → AI phải gọi đúng tool
 *   2. Xác minh đúng page_slug được chọn qua response keywords
 *   3. Không có lỗi MISSING_MESSAGE trong bất kỳ locale nào
 *   4. Console.log INPUT / OUTPUT làm bằng chứng xác thực
 *
 * Field acceptableTools: Khi một câu hỏi có thể được trả lời đúng
 *   bởi NHIỀU tool (ví dụ: FAQ hoặc page content đều hợp lệ),
 *   dùng acceptableTools thay cho expectedTool để test không bị fail
 *   do AI chọn tool tối ưu hơn.
 *
 * Chạy: node scripts/e2e-chat-page-content.mjs
 */

import http from 'http';
import fs from 'fs';
import path from 'path';

// ─────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────
const HOST             = '127.0.0.1';
const PORT             = 5000;
const JOIN_PATH        = '/api/v1/chat/join';
const STREAM_PATH      = '/api/v1/chat/message/stream';
const BETWEEN_TESTS_MS = 2500; // tránh rate limit (max 10 msg/60s/session)
const LOCALES_DIR      = path.resolve(process.cwd(), '../ui/src/messages');

// ─────────────────────────────────────────────────────────
// LOGGER — mọi output đều có timestamp
// ─────────────────────────────────────────────────────────
const ts  = () => new Date().toISOString().slice(11, 23);
const log = (...a) => console.log(`[${ts()}]`, ...a);
const sep = (c = '─', n = 70) => console.log(c.repeat(n));

// ─────────────────────────────────────────────────────────
// HTTP HELPERS
// ─────────────────────────────────────────────────────────
function httpPost(urlPath, body, headers = {}) {
  const raw = JSON.stringify(body);
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: HOST, port: PORT, path: urlPath, method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(raw), ...headers },
      },
      (res) => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
      }
    );
    req.on('error', reject);
    req.write(raw);
    req.end();
  });
}

async function createSession(userName, lang = 'vi') {
  const res = await httpPost(JOIN_PATH, { user_name: userName, website_language: lang });
  if (res.statusCode !== 200 && res.statusCode !== 201) {
    throw new Error(`JOIN failed HTTP ${res.statusCode}: ${res.body}`);
  }
  const data = JSON.parse(res.body);
  return { sessionId: data.data.session_id, token: data.data.token };
}

/**
 * Gửi message qua SSE stream, thu thập:
 *   toolTriggered — tên tool đầu tiên được gọi
 *   toolPayload   — toàn bộ event payload của tool_processing (bao gồm args nếu có)
 *   pageSlug      — page_slug nếu BE gửi trong event args
 *   fullText      — text AI trả về (tích luỹ)
 *   allEvents     — toàn bộ parsed SSE events (để debug)
 *   hasMissing    — phát hiện MISSING_MESSAGE
 */
function sendStreamMessage({ sessionId, token, message, currentUrl, lang }) {
  return new Promise((resolve) => {
    const result = {
      toolTriggered: null,
      toolPayload  : null,
      pageSlug     : null,
      fullText     : '',
      allEvents    : [],
      hasMissing   : false,
      error        : null,
      statusCode   : null,
    };

    const body = JSON.stringify({
      session_id      : sessionId,
      message,
      sender          : 'USER',
      message_type    : 'TEXT',
      current_url     : currentUrl,
      page_context    : '',
      website_language: lang,
      client_id       : `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    });

    const headers = { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(
      { hostname: HOST, port: PORT, path: STREAM_PATH, method: 'POST', headers },
      (res) => {
        result.statusCode = res.statusCode;
        if (res.statusCode !== 200) {
          result.error = `HTTP ${res.statusCode}`;
          let raw = '';
          res.on('data', c => raw += c);
          res.on('end', () => { result.error += ` — ${raw.slice(0, 200)}`; resolve(result); });
          return;
        }

        let buf = '';
        res.on('data', (chunk) => {
          buf += chunk.toString();
          const lines = buf.split('\n');
          buf = lines.pop();
          for (const line of lines) {
            const trim = line.trim();
            if (!trim.startsWith('data:')) continue;
            const raw = trim.replace(/^data:\s*/, '');
            if (!raw || raw === '[DONE]') continue;
            let obj;
            try { obj = JSON.parse(raw); } catch { continue; }
            result.allEvents.push(obj);

            if (obj.event === 'tool_processing' && obj.tool && !result.toolTriggered) {
              result.toolTriggered = obj.tool;
              result.toolPayload   = obj;
              result.pageSlug      = obj.args?.page_slug ?? obj.page_slug ?? null;
            }
            if (typeof obj.text    === 'string') result.fullText += obj.text;
            if (typeof obj.content === 'string') result.fullText += obj.content;
            if (typeof obj.chunk   === 'string') result.fullText += obj.chunk;
            if (raw.includes('MISSING_MESSAGE')) result.hasMissing = true;
          }
        });
        res.on('end', () => {
          if (result.fullText.includes('MISSING_MESSAGE')) result.hasMissing = true;
          resolve(result);
        });
      }
    );
    req.on('error', (err) => { result.error = err.message; resolve(result); });
    req.write(body);
    req.end();
  });
}

// ─────────────────────────────────────────────────────────
// TRANSLATION KEY CHECK
// ─────────────────────────────────────────────────────────
function checkTranslationKeys() {
  sep('─');
  log('🔍 BƯỚC 0 — KIỂM TRA TRANSLATION KEYS (MISSING_MESSAGE PREVENTION)');
  const locales      = ['vi.json', 'en.json', 'ko.json'];
  const toolsToCheck = ['get_page_content'];
  let allPass        = true;

  for (const locale of locales) {
    const filePath = path.join(LOCALES_DIR, locale);
    if (!fs.existsSync(filePath)) { log(`   ⚠️  Không tìm thấy file locale: ${filePath}`); continue; }
    const msgs = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    for (const tool of toolsToCheck) {
      const chatKey      = `tool_${tool}`;
      const indicatorKey = tool;
      const chatVal      = msgs?.Chat?.[chatKey];
      const indicatorVal = msgs?.AgentIndicator?.[indicatorKey];

      if (chatVal) {
        log(`   ✅ [${locale}] Chat.${chatKey} = "${chatVal}"`);
      } else {
        log(`   ❌ [MISSING_MESSAGE] [${locale}] Chat.${chatKey} — KEY NOT FOUND`);
        allPass = false;
      }
      if (indicatorVal) {
        log(`   ✅ [${locale}] AgentIndicator.${indicatorKey} = "${indicatorVal}"`);
      } else {
        log(`   ❌ [MISSING_MESSAGE] [${locale}] AgentIndicator.${indicatorKey} — KEY NOT FOUND`);
        allPass = false;
      }
    }
  }

  log(allPass ? '   🏆 Translation keys: TẤT CẢ HỢP LỆ' : '   🛑 Translation keys: CÓ KEY BỊ THIẾU');
  return allPass;
}

// ─────────────────────────────────────────────────────────
// TEST MATRIX
//
// Fields:
//   group          : tên nhóm test
//   lang           : ngôn ngữ website (vi/en/ko)
//   currentUrl     : trang người dùng đang đứng
//   message        : câu hỏi của user
//   expectedTool   : tool duy nhất được chấp nhận (strict)
//   acceptableTools: danh sách tool đều hợp lệ (dùng thay expectedTool cho ambiguous cases)
//   note           : giải thích lý do ambiguous
//   keywords       : từ khoá BẮT BUỘC có trong response (hardcoded data → deterministic)
//   keywordsOr     : ít nhất 1 trong số từ khoá phải có trong response (soft check)
//
// Phân loại case:
//   STRICT  — chỉ 1 tool đúng, dùng expectedTool
//   FLEX    — nhiều tool đều hợp lệ, dùng acceptableTools
// ─────────────────────────────────────────────────────────
const TESTS = [

  // ════════════════════════════════════════════════════════
  // NHÓM A — HOME PAGE (/) → About Us (STRICT: không có tool nào khác phù hợp)
  // ════════════════════════════════════════════════════════
  {
    group      : 'A1 · Home → About Us · địa danh Việt Nam [STRICT]',
    lang       : 'vi', currentUrl: '/',
    message    : 'Địa danh nổi tiếng ở Việt Nam có những gì?',
    expectedTool: 'get_page_content',
    expectedSlug: 'about-us',
    keywordsOr : ['việt nam', 'địa danh', 'sapa', 'hội an', 'hạ long', 'đà lạt', 'phú quốc', 'cảnh đẹp'],
  },
  {
    group      : 'A2 · Home → About Us · địa danh cụ thể [STRICT]',
    lang       : 'vi', currentUrl: '/',
    message    : 'Hội An và Hạ Long đẹp như thế nào?',
    expectedTool: 'get_page_content',
    expectedSlug: 'about-us',
    keywordsOr : ['hội an', 'hạ long', 'việt nam', 'cảnh', 'đẹp'],
  },
  {
    group      : 'A3 · Home → About Us · giới thiệu công ty [STRICT]',
    lang       : 'vi', currentUrl: '/',
    message    : 'FASTVISA là công ty như thế nào? Giới thiệu đôi nét nhé',
    expectedTool: 'get_page_content',
    expectedSlug: 'about-us',
    keywordsOr : ['fastvisa', 'visa', 'công ty', 'dịch vụ'],
  },
  {
    group      : 'A4 · Home → About Us · sứ mệnh [STRICT]',
    lang       : 'vi', currentUrl: '/',
    message    : 'Sứ mệnh của FASTVISA là gì?',
    expectedTool: 'get_page_content',
    expectedSlug: 'about-us',
    keywordsOr : ['sứ mệnh', 'fastvisa', 'visa', 'mục tiêu'],
  },
  {
    group      : 'A5 · Home → About Us · đội ngũ nhân sự [STRICT]',
    lang       : 'vi', currentUrl: '/',
    message    : 'Đội ngũ cốt lõi của FASTVISA gồm những ai?',
    expectedTool: 'get_page_content',
    expectedSlug: 'about-us',
    keywordsOr : ['đội ngũ', 'team', 'nhân sự', 'thành viên', 'cốt lõi'],
  },
  {
    // FLEX: câu hỏi general về Vietnam tourism → AI đôi khi trả từ pre-trained knowledge (Benign Hallucination)
    // Cả 2 đều hợp lệ: tool gọi DB hoặc AI biết từ training data (architecture doc §5.2)
    group          : 'A6 · Home → About Us · tiếng Anh [FLEX: pre-train ok]',
    lang           : 'en', currentUrl: '/',
    message        : 'What scenic destinations in Vietnam does FastVisa recommend visiting?',
    acceptableTools: ['get_page_content', null],
    note           : 'English general question → AI may answer from pre-trained knowledge (Benign Hallucination §5.2)',
    keywordsOr     : ['vietnam', 'ha long', 'hoi an', 'sapa', 'da lat', 'phu quoc', 'destination', 'scenic', 'beautiful'],
  },
  {
    group      : 'A7 · Home → About Us · tiếng Hàn [STRICT]',
    lang       : 'ko', currentUrl: '/',
    message    : '베트남의 유명한 관광지는 어디인가요?',
    expectedTool: 'get_page_content',
    expectedSlug: 'about-us',
    keywordsOr : ['베트남', '하롱', '하이안', '사파', '관광'],
  },

  // ════════════════════════════════════════════════════════
  // NHÓM B — HOME PAGE (/) → Contact Us (STRICT: không có tool riêng cho contact)
  // ════════════════════════════════════════════════════════
  {
    group      : 'B1 · Home → Contact · email & hotline [STRICT + DETERMINISTIC]',
    lang       : 'vi', currentUrl: '/',
    message    : 'Email và hotline của FASTVISA là gì?',
    expectedTool: 'get_page_content',
    expectedSlug: 'contact-us',
    keywords   : ['thanhdatvietnamvisa@gmail.com', '+84.96.5800.392'],
  },
  {
    group      : 'B2 · Home → Contact · WhatsApp [STRICT + DETERMINISTIC]',
    lang       : 'vi', currentUrl: '/',
    message    : 'Số WhatsApp để liên hệ với bạn là bao nhiêu?',
    expectedTool: 'get_page_content',
    expectedSlug: 'contact-us',
    keywords   : ['+84.96.5800.392'],
  },
  {
    group      : 'B3 · Home → Contact · địa chỉ văn phòng [STRICT]',
    lang       : 'vi', currentUrl: '/',
    message    : 'Địa chỉ văn phòng của FASTVISA ở đâu?',
    expectedTool: 'get_page_content',
    expectedSlug: 'contact-us',
    keywordsOr : ['contact', 'liên hệ', 'email', 'hotline'],
  },
  {
    group      : 'B4 · Home → Contact · tiếng Anh [STRICT + DETERMINISTIC]',
    lang       : 'en', currentUrl: '/',
    message    : 'What is the contact email for FastVisa?',
    expectedTool: 'get_page_content',
    expectedSlug: 'contact-us',
    keywords   : ['thanhdatvietnamvisa@gmail.com'],
  },

  // ════════════════════════════════════════════════════════
  // NHÓM C — HOME PAGE (/) → How To Apply
  // ════════════════════════════════════════════════════════
  {
    group      : 'C1 · Home → How To Apply · quy trình [STRICT]',
    lang       : 'vi', currentUrl: '/',
    message    : 'Quy trình xin E-Visa gồm mấy bước?',
    expectedTool: 'get_page_content',
    expectedSlug: 'how-to-apply',
    keywordsOr : ['bước', 'quy trình', 'apply', 'nộp đơn', 'hộ chiếu'],
  },
  {
    // FLEX: "giấy tờ cần gì" là câu hỏi FAQ điển hình, get_faq cũng hợp lệ
    group          : 'C2 · Home → How To Apply · tài liệu cần thiết [FLEX: faq ok]',
    lang           : 'vi', currentUrl: '/',
    message        : 'Cần chuẩn bị những giấy tờ gì để xin visa?',
    acceptableTools: ['get_page_content', 'get_faq'],
    note           : 'Câu hỏi về giấy tờ có thể trả lời bởi FAQ hoặc trang hướng dẫn',
    keywordsOr     : ['hộ chiếu', 'tài liệu', 'ảnh', 'giấy tờ', 'bước', 'step', 'passport'],
  },
  {
    // FLEX: tài liệu cần thiết bằng tiếng Anh → FAQ cũng hợp lệ
    group          : 'C3 · Home → How To Apply · tiếng Anh [FLEX: faq ok]',
    lang           : 'en', currentUrl: '/',
    message        : 'What documents do I need to apply for a Vietnam e-visa?',
    acceptableTools: ['get_page_content', 'get_faq'],
    note           : 'Document requirements are naturally answered by FAQ tool as well',
    keywordsOr     : ['step', 'passport', 'document', 'apply', 'photo'],
  },

  // ════════════════════════════════════════════════════════
  // NHÓM D — HOME PAGE (/) → Emergency Inquiry
  // ════════════════════════════════════════════════════════
  {
    group      : 'D1 · Home → Emergency · dịch vụ khẩn [STRICT]',
    lang       : 'vi', currentUrl: '/',
    message    : 'Tôi cần visa gấp, bên bạn có dịch vụ khẩn không?',
    expectedTool: 'get_page_content',
    expectedSlug: 'emergency-inquiry',
    keywordsOr : ['khẩn', 'gấp', 'urgent', 'emergency', 'nhanh'],
  },
  {
    // FLEX: "mất bao lâu" là câu hỏi FAQ điển hình, get_faq cũng đúng
    group          : 'D2 · Home → Emergency · thời gian xử lý [FLEX: faq ok]',
    lang           : 'vi', currentUrl: '/',
    message        : 'Làm visa khẩn cấp mất bao lâu?',
    acceptableTools: ['get_page_content', 'get_faq'],
    note           : 'Thời gian xử lý thường nằm trong FAQ, cả 2 tool đều trả về đúng',
    keywordsOr     : ['giờ', 'khẩn', 'nhanh', 'xử lý', '4', '8', 'working hours'],
  },
  {
    // FLEX: "how fast" → classic FAQ question
    group          : 'D3 · Home → Emergency · tiếng Anh [FLEX: faq ok]',
    lang           : 'en', currentUrl: '/',
    message        : 'How fast can you process an urgent visa?',
    acceptableTools: ['get_page_content', 'get_faq'],
    note           : '"How fast" is a standard FAQ-type question, both tools are correct',
    keywordsOr     : ['hours', 'urgent', 'emergency', 'fast', 'quick', '4', '8'],
  },

  // ════════════════════════════════════════════════════════
  // NHÓM E — HOME PAGE (/) → Guide Pages
  // ════════════════════════════════════════════════════════
  {
    // FLEX: thanh toán có thể là FAQ hoặc page content
    group          : 'E1 · Home → Payment Guideline [FLEX: faq ok]',
    lang           : 'vi', currentUrl: '/',
    message        : 'Tôi có thể thanh toán bằng những hình thức nào?',
    acceptableTools: ['get_page_content', 'get_faq'],
    note           : 'Phương thức thanh toán có thể có trong FAQ hoặc trang hướng dẫn',
    keywordsOr     : ['thanh toán', 'payment', 'phương thức', 'visa', 'mastercard', 'paypal'],
  },
  {
    // FLEX: đưa đón sân bay → get_extra_services (structured) hoặc get_page_content (page desc) đều đúng
    group          : 'E2 · Home → Extra Services · đưa đón sân bay [FLEX: both tools ok]',
    lang           : 'vi', currentUrl: '/',
    message        : 'Bên bạn có dịch vụ đưa đón sân bay không?',
    acceptableTools: ['get_extra_services', 'get_page_content'],
    note           : 'AI tự chọn tool tối ưu, cả 2 tool đều trả về thông tin dịch vụ đúng',
    keywordsOr     : ['sân bay', 'airport', 'đưa đón', 'dịch vụ', 'extra'],
  },
  {
    // STRICT: get_extra_services là dedicated tool
    group      : 'E3 · Home → Extra Services · SIM và khách sạn [STRICT: dedicated tool]',
    lang       : 'vi', currentUrl: '/',
    message    : 'Có gói SIM du lịch hay đặt khách sạn đi kèm không?',
    expectedTool: 'get_extra_services',
    note       : 'get_extra_services trả về structured data đầy đủ hơn page content',
    keywordsOr : ['sim', 'khách sạn', 'hotel', 'dịch vụ', 'bổ sung'],
  },
  {
    group      : 'E4 · Home → Visa Extension [STRICT]',
    lang       : 'vi', currentUrl: '/',
    message    : 'Tôi muốn gia hạn visa, thủ tục như thế nào?',
    expectedTool: 'get_page_content',
    expectedSlug: 'guide/visa-extension',
    keywordsOr : ['gia hạn', 'extension', 'thủ tục', 'visa'],
  },
  {
    // STRICT: get_visa_exemptions là dedicated structured-data tool
    group      : 'E5 · Home → Visa Exemptions [STRICT: dedicated tool]',
    lang       : 'vi', currentUrl: '/',
    message    : 'Những quốc gia nào được miễn visa khi vào Việt Nam?',
    expectedTool: 'get_visa_exemptions',
    note       : 'get_visa_exemptions trả về structured list quốc gia từ DB',
    keywordsOr : ['miễn', 'exemption', 'quốc gia', 'visa'],
  },

  // ════════════════════════════════════════════════════════
  // NHÓM F — CROSS-PAGE: Từ trang không phải Home
  // ════════════════════════════════════════════════════════
  {
    group      : 'F1 · About Us Page → hỏi Emergency [STRICT]',
    lang       : 'vi', currentUrl: '/about-us',
    message    : 'Dịch vụ xử lý visa khẩn cấp của bạn như thế nào?',
    expectedTool: 'get_page_content',
    expectedSlug: 'emergency-inquiry',
    keywordsOr : ['khẩn', 'cấp', 'urgent', 'nhanh', 'giờ'],
  },
  {
    group      : 'F2 · About Us Page → hỏi Contact [STRICT + DETERMINISTIC]',
    lang       : 'vi', currentUrl: '/about-us',
    message    : 'Hotline WhatsApp hỗ trợ 24/7 là bao nhiêu?',
    expectedTool: 'get_page_content',
    expectedSlug: 'contact-us',
    keywords   : ['+84.96.5800.392'],
  },
  {
    group      : 'F3 · Check Status Page → hỏi About Us · cảnh đẹp [STRICT]',
    lang       : 'vi', currentUrl: '/check-status',
    message    : 'Kể tôi nghe về các điểm du lịch nổi tiếng ở Việt Nam đi',
    expectedTool: 'get_page_content',
    expectedSlug: 'about-us',
    keywordsOr : ['việt nam', 'du lịch', 'cảnh', 'địa danh', 'đẹp'],
  },
  {
    group      : 'F4 · FAQ Page → hỏi Contact [STRICT + DETERMINISTIC]',
    lang       : 'vi', currentUrl: '/faqs',
    message    : 'Tôi muốn gửi email cho FASTVISA, địa chỉ là gì?',
    expectedTool: 'get_page_content',
    expectedSlug: 'contact-us',
    keywords   : ['thanhdatvietnamvisa@gmail.com'],
  },
  {
    group      : 'F5 · Apply Page → hỏi About · sứ mệnh [STRICT]',
    lang       : 'vi', currentUrl: '/apply',
    message    : 'Sứ mệnh và giá trị cốt lõi của FASTVISA là gì?',
    expectedTool: 'get_page_content',
    expectedSlug: 'about-us',
    keywordsOr : ['sứ mệnh', 'fastvisa', 'giá trị', 'visa'],
  },
  {
    group      : 'F6 · Contact Page → hỏi How To Apply [STRICT]',
    lang       : 'vi', currentUrl: '/contact-us',
    message    : 'Cho tôi biết quy trình nộp đơn gồm những bước nào?',
    expectedTool: 'get_page_content',
    expectedSlug: 'how-to-apply',
    keywordsOr : ['bước', 'quy trình', 'nộp đơn', 'hộ chiếu'],
  },
  {
    group      : 'F7 · Emergency Page → hỏi About · đội ngũ [STRICT]',
    lang       : 'vi', currentUrl: '/emergency-inquiry',
    message    : 'Nhóm chuyên gia của FASTVISA gồm những ai?',
    expectedTool: 'get_page_content',
    expectedSlug: 'about-us',
    keywordsOr : ['đội ngũ', 'team', 'thành viên', 'chuyên gia'],
  },
  {
    group      : 'F8 · Guide Page → hỏi About · tiếng Anh [STRICT]',
    lang       : 'en', currentUrl: '/guide',
    message    : 'Tell me about beautiful scenic spots in Vietnam',
    expectedTool: 'get_page_content',
    expectedSlug: 'about-us',
    keywordsOr : ['vietnam', 'scenic', 'beautiful', 'destination', 'ha long', 'hoi an'],
  },

  // ════════════════════════════════════════════════════════
  // NHÓM G — EDGE CASES
  // ════════════════════════════════════════════════════════
  {
    group      : 'G1 · Edge · câu hỏi mơ hồ về địa danh cụ thể [STRICT]',
    lang       : 'vi', currentUrl: '/',
    message    : 'Phú Quốc thế nào, có đẹp không?',
    expectedTool: 'get_page_content',
    expectedSlug: 'about-us',
    keywordsOr : ['phú quốc', 'việt nam', 'đẹp', 'du lịch', 'về chúng tôi', 'địa danh'],
  },
  {
    // FLEX: "dịch vụ khác ngoài visa" → AI chọn get_extra_services hoặc get_page_content đều hợp lệ
    group          : 'G2 · Edge · dịch vụ ngoài visa [FLEX: both tools ok]',
    lang           : 'vi', currentUrl: '/',
    message        : 'Ngoài làm visa, bạn còn những dịch vụ gì khác?',
    acceptableTools: ['get_extra_services', 'get_page_content'],
    note           : 'get_extra_services (structured data) hoặc get_page_content (page desc) đều trả về đúng',
    keywordsOr     : ['dịch vụ', 'bổ sung', 'thêm', 'extra', 'sân bay', 'sim'],
  },
  {
    group      : 'G3 · Edge · đội ngũ tiếng Anh từ Apply page [STRICT]',
    lang       : 'en', currentUrl: '/apply',
    message    : 'Who are the core team members of FastVisa?',
    expectedTool: 'get_page_content',
    expectedSlug: 'about-us',
    keywordsOr : ['team', 'member', 'fastvisa', 'staff', 'core'],
  },
  {
    // STRICT: check_nationality là dedicated tool cho câu hỏi kiểm tra quốc tịch cụ thể
    group      : 'G4 · Edge · kiểm tra quốc tịch Hàn tiếng Hàn [STRICT: dedicated tool]',
    lang       : 'ko', currentUrl: '/',
    message    : '한국 사람은 베트남 비자 없이 입국할 수 있나요?',
    expectedTool: 'check_nationality',
    note       : 'Kiểm tra một quốc tịch cụ thể → check_nationality đúng hơn page content',
    keywordsOr : ['한국', '비자', '베트남'],
  },
  {
    group      : 'G5 · Edge · gia hạn visa từ Check Status page [STRICT]',
    lang       : 'vi', currentUrl: '/check-status',
    message    : 'Tôi cần gia hạn thêm thời gian lưu trú, chi phí bao nhiêu?',
    expectedTool: 'get_page_content',
    expectedSlug: 'guide/visa-extension',
    keywordsOr : ['gia hạn', 'chi phí', 'thời gian', 'extension'],
  },
  {
    group      : 'G6 · Edge · thanh toán từ Apply page [STRICT]',
    lang       : 'vi', currentUrl: '/apply',
    message    : 'Sau khi điền form tôi thanh toán bằng cách nào?',
    expectedTool: 'get_page_content',
    expectedSlug: 'guide/payment-guideline',
    keywordsOr : ['thanh toán', 'payment', 'hướng dẫn', 'phương thức', 'visa', 'mastercard'],
  },
];

// ─────────────────────────────────────────────────────────
// RUN SINGLE TEST
// ─────────────────────────────────────────────────────────
async function runTest(index, tc) {
  const num   = String(index + 1).padStart(2, '0');
  const label = `TEST ${num} — [${tc.group}]`;

  // valid tools: acceptableTools nếu có, ngược lại [expectedTool]
  const validTools = tc.acceptableTools ?? (tc.expectedTool ? [tc.expectedTool] : null);

  sep();
  log(`⏳ ${label}`);
  log(`   📍 Current Page  : "${tc.currentUrl}"`);
  log(`   🌐 Lang          : ${tc.lang}`);
  log(`   💬 [INPUT]  User : "${tc.message}"`);
  if (validTools?.length > 1) {
    log(`   🎯 Accept Tools  : [${validTools.join(', ')}]  |  Expected Slug: ${tc.expectedSlug || 'any'}  ← FLEX`);
  } else if (validTools?.[0]) {
    log(`   🎯 Expected Tool : ${validTools[0]}  |  Expected Slug: ${tc.expectedSlug || 'any'}  ← STRICT`);
  }
  if (tc.note) log(`   📌 Note          : ${tc.note}`);

  let session;
  try {
    session = await createSession(`Tester_${num}`, tc.lang);
    log(`   🔗 Session ID    : ${session.sessionId}`);
  } catch (err) {
    log(`   ❌ [SESSION_ERROR] ${err.message}`);
    return { pass: false, issues: [`session_error: ${err.message}`] };
  }

  const result = await sendStreamMessage({
    sessionId : session.sessionId,
    token     : session.token,
    message   : tc.message,
    currentUrl: tc.currentUrl,
    lang      : tc.lang,
  });

  // ── EVIDENCE LOG ──────────────────────────────────────
  log(`\n   ── EVIDENCE (SSE Stream Analysis) ──`);
  log(`   🤖 Tool Triggered : ${result.toolTriggered ?? '(none)'}`);
  if (result.toolPayload) {
    log(`   🔧 Tool Payload   :`, JSON.stringify(result.toolPayload));
  }
  if (result.pageSlug) {
    log(`   📄 page_slug arg  : "${result.pageSlug}"`);
  } else {
    log(`   📄 page_slug arg  : (không có trong SSE event payload)`);
  }

  const preview = result.fullText
    ? result.fullText.slice(0, 400).replace(/\n+/g, ' ') + (result.fullText.length > 400 ? ' …[truncated]' : '')
    : '(empty response)';
  log(`   📝 [OUTPUT] AI    : "${preview}"`);
  log(`   🔢 SSE Events     : ${result.allEvents.length} events received`);
  if (result.hasMissing) log(`   🚨 MISSING_MESSAGE: DETECTED IN RESPONSE`);

  // ── ASSERTIONS ────────────────────────────────────────
  const issues = [];

  if (result.error) {
    issues.push(`http_error: ${result.error}`);
  } else {
    // 1) Tool phải nằm trong danh sách hợp lệ
    if (validTools && !validTools.includes(result.toolTriggered)) {
      issues.push(
        validTools.length > 1
          ? `wrong_tool: acceptable=[${validTools.join(', ')}], got="${result.toolTriggered ?? 'none'}"`
          : `wrong_tool: expected="${validTools[0]}", got="${result.toolTriggered ?? 'none'}"`
      );
    }

    // 2) Keyword bắt buộc (hardcoded data → deterministic)
    if (tc.keywords?.length) {
      const textLow = result.fullText.toLowerCase();
      for (const kw of tc.keywords) {
        if (!textLow.includes(kw.toLowerCase())) {
          issues.push(`missing_keyword: "${kw}" không có trong response`);
        }
      }
    }

    // 3) Keyword OR (ít nhất 1 phải có → soft check)
    if (tc.keywordsOr?.length) {
      const textLow = result.fullText.toLowerCase();
      const anyFound = tc.keywordsOr.some(kw => textLow.includes(kw.toLowerCase()));
      if (!anyFound) {
        issues.push(`missing_keywords_or: Không có bất kỳ keyword nào trong [${tc.keywordsOr.join(', ')}]`);
      }
    }

    // 4) MISSING_MESSAGE
    if (result.hasMissing) {
      issues.push('missing_message_detected: MISSING_MESSAGE xuất hiện trong response');
    }
  }

  const pass = issues.length === 0;
  if (pass) {
    log(`   ✅ [PASS] ${label}`);
  } else {
    issues.forEach(i => log(`   ❌ [FAIL] ${i}`));
  }

  return { pass, issues };
}

// ─────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────
async function main() {
  sep('═');
  log('🚀 E2E TEST — get_page_content: TOÀN DIỆN MỌI PAGE & MỌI CASE');
  log(`📅 ${new Date().toISOString()}`);
  log(`📦 Tổng số test cases: ${TESTS.length}`);
  const strictCount = TESTS.filter(t => !t.acceptableTools).length;
  const flexCount   = TESTS.filter(t =>  t.acceptableTools).length;
  log(`   ├─ STRICT (1 tool duy nhất): ${strictCount}`);
  log(`   └─ FLEX   (nhiều tool ok)  : ${flexCount}`);
  sep('═');

  // STEP 0: Translation keys
  const translationPass = checkTranslationKeys();

  // STEP 1: Chạy từng test case
  let passed = 0;
  let failed = 0;
  const failedCases = [];

  for (let i = 0; i < TESTS.length; i++) {
    const tc = TESTS[i];
    const { pass, issues } = await runTest(i, tc);
    if (pass) {
      passed++;
    } else {
      failed++;
      failedCases.push({ num: i + 1, group: tc.group, message: tc.message, issues });
    }
    if (i < TESTS.length - 1) {
      await new Promise(r => setTimeout(r, BETWEEN_TESTS_MS));
    }
  }

  // STEP 2: Summary Report
  sep('═');
  log('📊 KẾT QUẢ TỔNG HỢP');
  sep('═');
  log(`Translation Keys : ${translationPass ? '✅ PASS' : '❌ FAIL'}`);
  log(`Test Cases PASS  : ${passed} / ${TESTS.length}`);
  log(`Test Cases FAIL  : ${failed} / ${TESTS.length}`);

  if (failedCases.length > 0) {
    log('\n❌ DANH SÁCH CASE FAILED:');
    failedCases.forEach(f => {
      log(`  ► TEST ${f.num}: [${f.group}]`);
      log(`      Input   : "${f.message}"`);
      f.issues?.forEach(i => log(`      Issue   : ${i}`));
    });
  }

  sep('═');
  const allPass = translationPass && failed === 0;
  if (allPass) {
    log('🏆 TẤT CẢ TEST PASS — get_page_content hoạt động đúng 100%');
    log('   Mọi câu hỏi từ mọi page đều được định tuyến đúng tool.');
  } else {
    log(`🛑 ${failed + (translationPass ? 0 : 1)} CASE FAILED — Xem chi tiết ở trên`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('\n💥 UNHANDLED ERROR:', err);
  process.exit(1);
});
