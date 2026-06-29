import PusherModule from 'pusher-js';

const PORT = process.env.PORT || 5000;
const API_URL = `http://localhost:${PORT}/api/v1/comments`;

// Kết nối Pusher tới Soketi local
const Pusher = (PusherModule as any).Pusher || PusherModule;
const pusher = new Pusher('MvvnVXsfh5j64mVzxwgvL29N5mmNMNEEGMSMtvc5w', {
  wsHost: '127.0.0.1',
  wsPort: 6001,
  forceTLS: false,
  disableStats: true,
  enabledTransports: ['ws', 'wss'],
  cluster: 'mt1'
});

async function runTest() {
  console.log('🔗 Đang kết nối tới Soketi server trên port 6001...');
  
  return new Promise<void>((resolve, reject) => {
    // Timeout an toàn
    const timeout = setTimeout(() => {
      pusher.disconnect();
      reject(new Error("Timeout khi chờ event Pusher"));
    }, 15000);

    pusher.connection.bind('connected', async () => {
      console.log('✅ Đã kết nối Soketi thành công!');
      
      const channel = pusher.subscribe('public-comments');
      
      channel.bind('comments_updated', async (data: any) => {
        console.log('🎉 NHẬN EVENT REAL-TIME TỪ SOKETI:');
        console.log('-> Kênh: public-comments');
        console.log('-> Sự kiện: comments_updated');
        console.log('-> Payload:', data);
        
        clearTimeout(timeout);
        pusher.disconnect();
        resolve();
      });

      console.log('📝 Gửi API request tạo Comment...');
      try {
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            content: "Test Comment Real-time Soketi " + Date.now(),
            authorName: "Auto Test",
            authorEmail: "test@example.com",
            authorNationality: "VN"
          })
        });
        const responseData = await response.json();
        console.log('✅ API tạo comment thành công, ID:', responseData.data?.id);
        console.log('⏳ Đang chờ event từ Soketi broadcast...');
      } catch (err: any) {
        console.error('❌ Lỗi gọi API:', err.message);
        clearTimeout(timeout);
        pusher.disconnect();
        reject(err);
      }
    });

    pusher.connection.bind('error', (err: any) => {
      console.error('❌ Lỗi kết nối Pusher/Soketi:', err);
      clearTimeout(timeout);
      reject(err);
    });
  });
}

runTest()
  .then(() => {
    console.log('=================================');
    console.log('🎯 KẾT QUẢ: E2E TEST PUSHER/SOKETI PASS 100%!');
    console.log('=================================');
    process.exit(0);
  })
  .catch((err) => {
    console.error('=================================');
    console.error('💥 KẾT QUẢ: TEST FAILED!', err);
    console.error('=================================');
    process.exit(1);
  });
