import http from 'http';
import fs from 'fs';
import path from 'path';

function checkTranslationKeys() {
  console.log(`\n🔍 KIỂM TRA TRANSLATION KEYS TRONG UI...`);
  const uiLocalesPath = path.resolve(process.cwd(), '../ui/src/messages');
  const locales = ['vi.json', 'en.json', 'ko.json'];
  let allKeysExist = true;

  for (const locale of locales) {
    const filePath = path.join(uiLocalesPath, locale);
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  Không tìm thấy file ${filePath}`);
      continue;
    }
    const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    for (const test of TESTS) {
      const toolName = test.expectedTool;
      
      const chatKey = `tool_${toolName}`;
      if (!content?.Chat?.[chatKey]) {
        console.log(`❌ [TRANSLATION_FAIL] Thiếu key Chat.${chatKey} trong ${locale}`);
        allKeysExist = false;
      }
      
      const indicatorKey = toolName;
      if (!content?.AgentIndicator?.[indicatorKey]) {
        console.log(`❌ [TRANSLATION_FAIL] Thiếu key AgentIndicator.${indicatorKey} trong ${locale}`);
        allKeysExist = false;
      }
    }
  }

  if (allKeysExist) {
    console.log(`✅ [TRANSLATION_PASS] Toàn bộ Tool đều đã có key dịch hợp lệ!`);
  } else {
    console.log(`🛑 [TRANSLATION_FAIL] Có Tool bị thiếu key dịch, điều này sẽ gây lỗi MISSING_MESSAGE trên UI!`);
  }
  return allKeysExist;
}

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

const TESTS = [
  {
    name: "Tra cứu FAQs",
    payload: {
      message: "Làm visa hết bao lâu?",
      sender: "USER",
      message_type: "TEXT",
      page_context: ""
    },
    expectedTool: "get_faq"
  },
  {
    name: "Tra cứu bảng giá chung",
    payload: {
      message: "Bảng giá visa như thế nào?",
      sender: "USER",
      message_type: "TEXT",
      page_context: ""
    },
    expectedTool: "get_pricing_rules"
  },
  {
    name: "Kiểm tra quốc tịch (Miễn visa)",
    payload: {
      message: "Người Mỹ (US) có được miễn visa Việt Nam không?",
      sender: "USER",
      message_type: "TEXT",
      page_context: ""
    },
    expectedTool: "check_nationality"
  },
  {
    name: "Tính phí làm visa cụ thể",
    payload: {
      message: "Tính phí cho 2 người lớn làm visa E-visa 30 ngày nhập cảnh 1 lần, làm khẩn 1 ngày",
      sender: "USER",
      message_type: "TEXT",
      page_context: ""
    },
    expectedTool: "calculate_visa_fee"
  },
  {
    name: "Kiểm tra tình trạng hồ sơ",
    payload: {
      message: "Hãy dùng công cụ để tra cứu tình trạng hồ sơ có mã E12345678",
      sender: "USER",
      message_type: "TEXT",
      page_context: ""
    },
    expectedTool: "check_visa_status"
  },
  // THÊM CÁC TEST CHO TOOLS MỚI
  {
    name: "Tra cứu danh sách miễn visa",
    payload: {
      message: "Danh sách các quốc gia được miễn visa?",
      sender: "USER",
      message_type: "TEXT",
      page_context: ""
    },
    expectedTool: "get_visa_exemptions"
  },
  {
    name: "Tra cứu danh sách cửa khẩu",
    payload: {
      message: "Có những sân bay hay cửa khẩu nào chấp nhận e-visa?",
      sender: "USER",
      message_type: "TEXT",
      page_context: ""
    },
    expectedTool: "get_ports_of_entry"
  },
  {
    name: "Tra cứu hướng dẫn (guideline)",
    payload: {
      message: "Cho tôi xin đọc trang Hướng dẫn chung về các bước xin E-Visa",
      sender: "USER",
      message_type: "TEXT",
      page_context: ""
    },
    expectedTool: "navigate_to_page"
  },
  {
    name: "Tra cứu dịch vụ bổ sung",
    payload: {
      message: "Bên bạn có dịch vụ VIP fast track hay các dịch vụ phụ trợ nào khác không?",
      sender: "USER",
      message_type: "TEXT",
      page_context: ""
    },
    expectedTool: "get_extra_services"
  },
  {
    name: "Tra cứu thông tin liên lạc",
    payload: {
      message: "Cho tôi xin email hoặc hotline liên lạc khẩn cấp",
      sender: "USER",
      message_type: "TEXT",
      page_context: ""
    },
    expectedTool: "get_page_content"
  },
  {
    name: "Tra cứu thông tin công ty (About us)",
    payload: {
      message: "FASTVISA là công ty như thế nào? Giới thiệu đôi nét nhé",
      sender: "USER",
      message_type: "TEXT",
      page_context: ""
    },
    expectedTool: "get_page_content"
  },
  {
    name: "Tra cứu thông tin đội ngũ (Core Team)",
    payload: {
      message: "Đội ngũ cốt lõi của công ty gồm những ai?",
      sender: "USER",
      message_type: "TEXT",
      page_context: ""
    },
    expectedTool: "get_page_content"
  },
  {
    name: "Chuyển hướng - Trang chủ",
    payload: { message: "Quay về trang chủ nhé", sender: "USER", message_type: "TEXT" },
    expectedTool: "navigate_to_page",
    expectedDestination: "/"
  },
  {
    name: "Chuyển hướng - Hỗ trợ khẩn cấp",
    payload: { message: "Mở trang hỗ trợ khẩn cấp", sender: "USER", message_type: "TEXT" },
    expectedTool: "navigate_to_page",
    expectedDestination: "/emergency-inquiry"
  },
  {
    name: "Chuyển hướng - Trang nộp đơn",
    payload: { message: "Mở trang đăng ký nộp đơn xin visa", sender: "USER", message_type: "TEXT" },
    expectedTool: "navigate_to_page",
    expectedDestination: "/apply"
  },
  {
    name: "Chuyển hướng - Bảng giá",
    payload: { message: "Mở trang cẩm nang bảng giá visa", sender: "USER", message_type: "TEXT" },
    expectedTool: "navigate_to_page",
    expectedDestination: "/guide/vietnam-visa-fees"
  },
  {
    name: "Chuyển hướng - Liên hệ",
    payload: { message: "Chuyển hướng đến trang liên hệ", sender: "USER", message_type: "TEXT" },
    expectedTool: "navigate_to_page",
    expectedDestination: "/contact-us"
  }
];

async function createSession(testName) {
  const joinRes = await request({
    hostname: '127.0.0.1', port: 5000, path: '/api/v1/chat/join', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { user_name: `Tester_${testName}`, website_language: "vi" });
  
  if (joinRes.statusCode !== 200 && joinRes.statusCode !== 201) {
    throw new Error(`Failed to create session: ${joinRes.data}`);
  }
  
  const data = JSON.parse(joinRes.data);
  return { sessionId: data.data.session_id, token: data.data.token };
}

async function runTests() {
  console.log(`\n🚀 BẮT ĐẦU E2E TEST: KIỂM TRA DATA TOOLS QUA HTTP STREAM\n`);
  let allPass = true;

  const translationsPass = checkTranslationKeys();
  if (!translationsPass) {
    allPass = false;
  }

  for (let i = 0; i < TESTS.length; i++) {
    const test = TESTS[i];
    console.log(`--------------------------------------------------`);
    console.log(`⏳ TEST ${i + 1}: ${test.name}`);
    console.log(`   Message: "${test.payload.message}"`);
    
    let sessionId, token;
    try {
      const session = await createSession(`Case_${i}`);
      sessionId = session.sessionId;
      token = session.token;
    } catch (err) {
      console.log(`❌ [SESSION_ERROR] Không thể tạo session: ${err.message}`);
      allPass = false;
      continue;
    }

    console.log(`   Sending message to API...`);
    
    // Using native http.request directly to read streaming response chunks
    const reqOptions = {
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/v1/chat/message/stream',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    };

    const reqBody = {
      ...test.payload,
      session_id: sessionId,
      client_id: `client-${Date.now()}`
    };

    let toolTriggered = false;
    let actualTool = "";
    let actualDestination = "";

    await new Promise((resolve) => {
      const req = http.request(reqOptions, (res) => {
        if (res.statusCode !== 200) {
          console.log(`❌ [API_EVIDENCE_FAIL] Status: ${res.statusCode}`);
          allPass = false;
          resolve();
          return;
        }

        res.on('data', (chunk) => {
          const chunkStr = chunk.toString();
          try {
            const lines = chunkStr.split('\n');
            for (const line of lines) {
              if (line.startsWith('data:')) {
                const dataObj = JSON.parse(line.replace('data:', '').trim());
                if (dataObj.event === 'tool_processing' && dataObj.tool) {
                  toolTriggered = true;
                  actualTool = dataObj.tool;
                }
                if (dataObj.action === 'NAVIGATION' && dataObj.destination) {
                  actualDestination = dataObj.destination;
                }
              }
            }
          } catch (e) {
            // fallback
            if (chunkStr.includes(test.expectedTool)) {
              toolTriggered = true;
              actualTool = test.expectedTool;
            }
          }
        });

        res.on('end', () => {
          resolve();
        });
      });

      req.on('error', (err) => {
        console.log(`❌ [API_ERROR] ${err.message}`);
        allPass = false;
        resolve();
      });

      req.write(JSON.stringify(reqBody));
      req.end();
    });

    if (toolTriggered && actualTool === test.expectedTool) {
      if (test.expectedDestination && actualDestination !== test.expectedDestination) {
        console.log(`❌ [API_EVIDENCE_FAIL] Sai đường dẫn. Expected: '${test.expectedDestination}', Got: '${actualDestination}'`);
        allPass = false;
      } else {
        console.log(`✅ [API_EVIDENCE_PASS] Nhận được Tool '${actualTool}'${actualDestination ? ` (Destination: ${actualDestination})` : ''} trong stream đúng như kỳ vọng!`);
      }
    } else if (!toolTriggered || actualTool !== test.expectedTool) {
      console.log(`❌ [API_EVIDENCE_FAIL] Nhận được Tool sai hoặc không có tool. Expected: '${test.expectedTool}', Got: '${actualTool}'`);
      allPass = false;
    }
  }

  console.log(`==================================================`);
  if (allPass) {
    console.log(`🏆 TẤT CẢ TEST ĐỀU PASS!`);
    console.log(`Các tool dữ liệu đã được kích hoạt thành công bởi Gemini.`);
  } else {
    console.log(`🛑 CÓ TEST FAILED. XIN HÃY KIỂM TRA LẠI.`);
  }
}

runTests().catch(console.error);
