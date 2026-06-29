const PORT = process.env.PORT || 5000;
const API_URL = `http://localhost:${PORT}/api/v1`;

const SESSIONS = [
  {
    name: "TOC 1: How It Works",
    context: JSON.stringify([{ id: "how-it-works", desc: "Phần Hướng dẫn quy trình nộp đơn (How it Works), bao gồm 4 bước" }])
  },
  {
    name: "TOC 2: Pricing Table",
    context: JSON.stringify([{ id: "pricing-table", desc: "Bảng giá dịch vụ E-Visa" }])
  },
  {
    name: "TOC 3: Check Status Form",
    context: JSON.stringify([{ id: "check-status-form", desc: "Form kiểm tra trạng thái" }])
  }
];

async function runTests() {
  for (const session of SESSIONS) {
    console.log(`\n--- Testing ${session.name} ---`);
    
    let sessionId;
    try {
      const joinRes = await fetch(`${API_URL}/chat/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_name: "TestUser",
          client_id: `test-client-${Date.now()}`
        })
      });
      const data = await joinRes.json();
      sessionId = data.data.session_id;
    } catch (e) {
      console.error("Failed to join chat:", e.message);
      continue;
    }

    try {
      const msgRes = await fetch(`${API_URL}/chat/message/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          client_id: `test-client-${Date.now()}`,
          message: "Tôi đang đứng ở phần nào",
          page_context: session.context,
          is_streaming: true
        })
      });
      
      console.log("Status:", msgRes.status);
      
      if (!msgRes.body) {
        console.log("No body returned.");
        continue;
      }
      
      let output = "";
      const reader = msgRes.body.getReader();
      const decoder = new TextDecoder("utf-8");
      
      while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          const str = decoder.decode(value);
          const lines = str.split('\n');
          for (const line of lines) {
              if (line.startsWith('data: ')) {
                  try {
                      const parsed = JSON.parse(line.substring(6));
                      if (parsed.chunk) output += parsed.chunk;
                  } catch(e) {}
              }
          }
      }
      
      console.log("Output:", output);
      
    } catch (e) {
      console.error("Message Error:", e.message);
    }
  }
}

runTests();
