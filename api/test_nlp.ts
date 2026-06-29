import { matchIntent } from './src/services/chatbot/intent-router.service';

async function test() {
  console.log('\n--- TEST 1: Nhan nut Apply tren header ---');
  let res = await matchIntent('Nhấn vào nút Apply Now trên header', 'btn-apply-header');
  console.log('Result:', JSON.stringify(res, null, 2));

  console.log('\n--- TEST 2: Go chu vao o (Input) ---');
  res = await matchIntent('Gõ chữ vào ô', '');
  console.log('Result:', JSON.stringify(res, null, 2));

  console.log('\n--- TEST 3: Chon muc tu dropdown ---');
  res = await matchIntent('Chọn mục từ dropdown', '');
  console.log('Result:', JSON.stringify(res, null, 2));
}
test().catch(console.error);
