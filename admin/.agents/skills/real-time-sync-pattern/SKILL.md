---
name: real-time-sync-pattern
description: Kiến trúc chuẩn và Best Practice để đồng bộ hóa dữ liệu Real-time (CRUD) giữa Admin UI và Client UI trong dự án FASTVISA bằng Next.js 15, SWR, và Pusher/Soketi. Áp dụng chuẩn xác để tránh lỗi cache ngầm hoặc trễ nhịp.
---

# Chuẩn Kiến Trúc Đồng Bộ Real-time (Real-time Sync Pattern)

File này định nghĩa quy trình chuẩn (Best Practice) BẮT BUỘC phải tuân thủ khi xây dựng hoặc sửa chữa tính năng cần cập nhật theo thời gian thực (ví dụ: Admin thêm/sửa/xoá một Comment, FAQ, hay Quốc gia và yêu cầu Client tự động nhảy data mà không cần F5).

## Kiến Trúc Tổng Quan
Sử dụng mô hình: **Webhook Invalidation + Websocket Trigger (Pusher/Soketi)**

1. **Backend (API):** Khi có thay đổi DB (Create, Update, Delete), tiến hành **đồng thời** gọi Webhook của Next.js UI để xóa cache (Server-side) VÀ đẩy Event qua Websocket (Client-side).
2. **Next.js UI (Webhook):** Route `/api/revalidate` nhận `tag`, gọi hàm `revalidateTag(tag)` để làm mới bộ đệm.
3. **Next.js Client (Component):** Lắng nghe Websocket channel, bắt event, và gọi `router.refresh()` hoặc invalidate queries (React Query) để UI vẽ lại dữ liệu mới nhất.

---

## 5 BƯỚC BẮT BUỘC KHI TRIỂN KHAI REAL-TIME

### Bước 1: Gắn Cache Tag Độc Lập Cho Hàm Fetch UI
Tuyệt đối không dùng tag chung (ví dụ: `"home-data"`) cho nhiều UI sections. Mỗi loại data cần một tag riêng biệt.
```typescript
// ui/src/lib/api/comments.api.ts
export async function getComments() {
    "use cache";
    cacheTag("comments-list"); // <-- Tag ĐỘC LẬP
    const res = await fetch("...");
    return res.json();
}
```

### Bước 2: Bọc component với Suspense (Next.js App Router)
Để Next.js có thể re-render nhẹ nhàng mà không làm treo cả trang khi gọi `router.refresh()`, component chứa tính năng real-time phải nằm trong Suspense.
```tsx
// ui/src/app/page.tsx
<Suspense fallback={<CommentSkeleton />}>
    <CommentSection />
</Suspense>
```

### Bước 3: Backend gọi Webhook và Pusher SONG SONG
Không được gọi tuần tự. Webhook (để xóa Server Cache) và Pusher (để báo Client làm mới) phải chạy cùng lúc qua `Promise.all` hoặc không block lẫn nhau.
```typescript
// api/src/services/comment.service.ts
import { getPusher } from "@/lib/pusher-client";

export async function createComment(data) {
    const comment = await prisma.comment.create({ data });
    
    // Xoá server cache của UI thông qua HTTP Webhook
    const webhookPromise = fetch(`${uiUrl}/api/revalidate?secret=${secret}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag: "comments-list" }),
    }).catch(console.error);

    // Thông báo cho Client UI qua Pusher
    const pusherPromise = getPusher()?.trigger(
        "public-comments", 
        "comments_updated", 
        { timestamp: Date.now() }
    ).catch(console.error);

    // Không cần await để tránh chặn response
    return comment;
}
```

### Bước 4: UI Lắng Nghe và Cập Nhật (Client Component)
Sử dụng `useRouter` của `next/navigation` hoặc `useQueryClient` của `@tanstack/react-query` để refresh khi có tin nhắn từ socket.
```tsx
// ui/src/components/providers/SystemEventsProvider.tsx hoặc trong một Hook riêng
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Pusher from "pusher-js";

export function useRealtimeSync(channelName: string, eventName: string) {
    const router = useRouter();

    useEffect(() => {
        const pusher = new Pusher(process.env.NEXT_PUBLIC_SOKETI_KEY, { /* config */ });
        const channel = pusher.subscribe(channelName);

        channel.bind(eventName, () => {
            // Data đã stale trên server, giờ yêu cầu browser nạp lại
            router.refresh(); 
        });

        return () => {
            channel.unbind_all();
            pusher.disconnect();
        };
    }, [router, channelName, eventName]);
}
```

### Bước 5: Cảnh Giác Với Các Bẫy Ngầm (Checklist An Toàn)
Trước khi báo cáo hoàn thành, hãy đối chiếu:
1. **[ ] Sai tham số API Next.js:** Đảm bảo Route revalidate chỉ gọi `revalidateTag(tag)`. Không được dùng `revalidateTag(tag, "max")` vì Next.js API chỉ cho phép 1 tham số. 
2. **[ ] Tham số filter cứng:** Hàm fetch phía UI không được chứa tham số cứng như `limit=12` hoặc `featured=true` nếu UI mong muốn hiển thị cả list dài. Nếu có limit, khi update phần tử ngoài top limit, UI sẽ không thấy.
3. **[ ] Đừng tự suy diễn:** Real-time delay thường do SWR Cache. Không lấp liếm bằng `setTimeout(router.refresh, 1000)`. Hãy sửa tận gốc ở `cacheTag` và `Promise.all`.
4. **[ ] Memory leak:** Trong `useEffect` của Pusher, LUÔN LUÔN gọi `channel.unbind_all()` và `pusher.disconnect()` ở cleanup return.

---
**Quy ước kiểm thử (Test Protocol):**
Bắt buộc phải chạy E2E Socket Event. Tạo một Node.js script độc lập: Gửi POST Request (Create/Edit/Delete) -> Lắng nghe trực tiếp trên Port 6001 của Soketi. Đảm bảo `< 50ms` nhận được event trả về. Nếu test này pass mà UI vẫn chậm, lỗi ở Next.js Caching, không phải do Socket hay Backend.
