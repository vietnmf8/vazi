const path = require('path');
const { execSync } = require('child_process');

async function runTest() {
  console.log("1. Tạo phiên chat mới...");
  const joinRes = await fetch("http://localhost:5000/api/v1/chat/join", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_name: "E2E Node Test" })
  });
  const joinData = await joinRes.json();
  if (!joinData.success) {
    throw new Error("Không thể tạo phiên chat: " + JSON.stringify(joinData.error));
  }
  
  const sessionId = joinData.data.session_id;
  console.log(`=> Tạo thành công Session ID: ${sessionId}`);
  
  console.log("2. Client gọi API đóng phiên...");
  const closeRes = await fetch("http://localhost:5000/api/v1/chat/close-by-client", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId })
  });
  const closeData = await closeRes.json();
  if (!closeData.success) {
    throw new Error("Lỗi khi đóng phiên: " + JSON.stringify(closeData.error));
  }
  console.log("=> Gọi API đóng thành công");
  
  console.log("3. Test hoàn tất. Cả 2 API đã chạy đúng.");
}

runTest().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
