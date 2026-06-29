import http from 'http';

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

async function run() {
  const joinRes = await request({
    hostname: '127.0.0.1', port: 5000, path: '/api/v1/chat/join', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { user_name: "Tester_cURL_Context", website_language: "vi" });
  
  const sessionId = JSON.parse(joinRes.data).data.session_id;
  console.log("Session ID:", sessionId);

  const msgRes = await request({
    hostname: '127.0.0.1', port: 5000, path: '/api/v1/chat/message', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    session_id: sessionId,
    message: "Chọn quốc tịch Việt Nam giúp tôi",
    sender: "USER",
    message_type: "TEXT",
    page_context: JSON.stringify([{"id":"quick-apply-form","desc":"Form biểu giá và đăng ký visa nhanh (Quick Apply Form) cho phép chọn loại visa, quốc tịch, ngày nhập cảnh và tốc độ xử lý (Các trường có thể thao tác: category, nationality, port, arrivalDate, visaOption, count, speed)"}])
  });

  console.log("Response:", JSON.stringify(JSON.parse(msgRes.data), null, 2));
}

run();
