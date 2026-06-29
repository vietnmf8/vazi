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

const SESSIONS = [
  {
    name: "TOC 4: Both Eligibility & How It Works (Eligibility First)",
    context: JSON.stringify([
      { id: "eligibility-checker", desc: "Phần Kiểm tra Yêu cầu theo Quốc tịch" },
      { id: "how-it-works", desc: "Phần Hướng dẫn quy trình nộp đơn (How it Works), bao gồm 4 bước" }
    ])
  }
];

async function run() {
  for (const session of SESSIONS) {
      console.log(`\n--- Testing ${session.name} ---`);
      const joinRes = await request({
        hostname: '127.0.0.1', port: 5000, path: '/api/v1/chat/join', method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, { user_name: "Tester_TOC", website_language: "vi" });
      
      const sessionId = JSON.parse(joinRes.data).data.session_id;

      const msgRes = await request({
        hostname: '127.0.0.1', port: 5000, path: '/api/v1/chat/message/stream', method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, {
        session_id: sessionId,
        message: "Tôi đang đứng ở phần nào",
        sender: "USER",
        message_type: "TEXT",
        page_context: session.context,
        is_streaming: true
      });

      let output = "";
      const str = msgRes.data;
      const lines = str.split('\n');
      for (const line of lines) {
          if (line.startsWith('data: ')) {
              try {
                  const parsed = JSON.parse(line.substring(6));
                  if (parsed.chunk) output += parsed.chunk;
              } catch(e) {}
          }
      }
      console.log("Output from AI/NLP:\n", output);
  }
}

run();
