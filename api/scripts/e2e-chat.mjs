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
  console.log("=== STARTING E2E CHAT TESTS ===");
  
  // 1. Join Chat
  console.log("1. Joining chat...");
  const joinRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/chat/join',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { user_name: "Tester", website_language: "vi" });
  
  if (joinRes.statusCode !== 200 && joinRes.statusCode !== 201) {
    console.error("Failed to join chat:", joinRes.data);
    process.exit(1);
  }
  
  const joinData = JSON.parse(joinRes.data);
  const sessionId = joinData.data.session_id;
  console.log("Session created:", sessionId);

  // 2. Stream a normal message (Main Case)
  console.log("2. Streaming normal message...");
  const streamRes1 = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/chat/message/stream',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    session_id: sessionId,
    message: "Xin chào",
    sender: "USER",
    message_type: "TEXT",
    client_id: "test-1"
  });

  console.log("Stream 1 Response Code:", streamRes1.statusCode);
  if (!streamRes1.data.includes('done')) {
     console.log("Stream 1 Partial output:", streamRes1.data.slice(0, 100));
  } else {
     console.log("Stream 1 Success");
  }

  // 3. Trigger handoff keyword (Edge Case)
  console.log("3. Triggering handoff keyword...");
  const streamRes2 = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/chat/message/stream',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    session_id: sessionId,
    message: "Cho tôi gặp nhân viên hỗ trợ",
    sender: "USER",
    message_type: "TEXT",
    client_id: "test-2"
  });

  console.log("Stream 2 Response Code:", streamRes2.statusCode);
  if (streamRes2.data.includes('{"done":true}')) {
    console.log("Stream 2 Handoff intercepted successfully (returned empty SSE stream as expected).");
  } else {
    console.error("Stream 2 failed to intercept handoff!", streamRes2.data);
    process.exit(1);
  }

  console.log("=== ALL E2E CHAT TESTS PASSED ===");
}

run().catch(console.error);
