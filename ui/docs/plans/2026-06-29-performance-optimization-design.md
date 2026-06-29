# Tài liệu Thiết kế Tối ưu hóa Hiệu năng Dự án FASTVISA UI
**Ngày:** 2026-06-29  
**Tác giả:** Antigravity AI  

---

## 1. Mục tiêu
Giải quyết triệt để tình trạng giật lag, CPU cao và màn hình đen khi tải trang/chuyển trang/chat trong dự án `ui`. Đảm bảo trang web đạt hiệu năng cuộn mượt mà 60fps, thời gian phản hồi nhấp chuột tức thì, Splash Screen hiển thị ngay lập tức tại T0 và hiệu ứng chat hoạt động hiệu quả nhất.

---

## 2. Thiết kế chi tiết các thay đổi

### 2.1. Khắc phục lỗi chặn dòng chảy HTML (Blocking SSR) tại RootLayout
* **Tệp thay đổi:** `src/app/layout.tsx`
* **Vấn đề:** Lệnh `await getFooterSettings()` chặn luồng xử lý của `RootLayout`, khiến trình duyệt không nhận được byte HTML nào trong thời gian chờ API.
* **Giải pháp:**
  * Di chuyển lệnh `await getFooterSettings()` xuống một Server Component con mới có tên là `LayoutContent`.
  * Bọc `LayoutContent` trong một `<Suspense fallback={<div className="h-full w-full min-h-screen" />}>`.
  * `RootLayout` sẽ không còn chứa bất kỳ lệnh `await` nào ở cấp độ cao nhất. Nhờ đó, Next.js sẽ ngay lập tức gửi phần HTML tĩnh ban đầu (chứa critical inline CSS và Splash Screen tĩnh) về trình duyệt tại T0 khi người dùng F5 refresh trang.

```tsx
// src/app/layout.tsx
// Tạo component con đảm nhận fetch dữ liệu bất đồng bộ trên server
async function LayoutContent({ children }: { children: React.ReactNode }) {
    const contact = await getFooterSettings();
    return (
        <EntryGateProvider whatsappUrl={contact.whatsappUrl}>
            <Suspense fallback={<div className="h-15 md:h-18" />}>
                <Header
                    whatsappUrl={contact.whatsappUrl}
                    email={contact.email}
                    hotline={contact.hotline}
                    headerNav={contact.headerNav}
                />
            </Suspense>
            {children}
            <AIGlobalIndicator />
            <VirtualMouseEngine />
            <ScrollPageEngine />
            <ChatWidget whatsappUrl={contact.whatsappUrl} />
            <AiContextTrackerProvider />
        </EntryGateProvider>
    );
}

// RootLayout trở thành non-blocking
export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html>
            <head>...</head>
            <body>
                <MotionProvider>
                    <AppLoadingContainer>
                        <Suspense fallback={<div className="h-full w-full min-h-screen" />}>
                            <I18nProvider>
                                <SystemEventsProvider />
                                <StingerProvider>
                                    <ScrollRevealProvider>
                                        <Suspense fallback={<div className="h-full w-full min-h-screen" />}>
                                            <LayoutContent>{children}</LayoutContent>
                                        </Suspense>
                                    </ScrollRevealProvider>
                                </StingerProvider>
                            </I18nProvider>
                        </Suspense>
                    </AppLoadingContainer>
                </MotionProvider>
            </body>
        </html>
    );
}
```

---

### 2.2. Khắc phục lỗi Render Storm toàn trang khi chuyển route (Stinger)
* **Tệp thay đổi:** `src/components/stinger/StingerProvider.tsx` và `src/components/stinger/StingerOverlay.tsx`
* **Vấn đề:** Việc set state `isAnimating` tại `StingerProvider` khi bắt đầu/kết thúc stinger gây re-render toàn site. Tuy nhiên, state này không được sử dụng ở bất kỳ nơi nào khác.
* **Giải pháp:**
  * Loại bỏ hoàn toàn biến state `isAnimating` khỏi `StingerProvider` và thuộc tính `onAnimatingChange` khỏi `StingerOverlay`.
  * `StingerOverlay` sẽ sử dụng hoàn toàn biến ref nội bộ `isAnimatingRef` để kiểm soát trạng thái hoạt ảnh.
  * Giữ lại hàm `triggerStinger` tĩnh trong Context để các nút nhấp chuyển trang kích hoạt GSAP trực tiếp trên DOM mà không cần re-render React.

---

### 2.3. Khắc phục lỗi Layout Thrashing do cuộn trang tại FloatingTOC
* **Tệp thay đổi:** `src/components/features/FloatingTOC.tsx`
* **Vấn đề:** Hàm scroll spy gọi `getBoundingClientRect()` trên 9 sections ở mỗi sự kiện scroll đồng bộ, gây Layout Thrashing và nghẽn CPU.
* **Giải pháp:**
  * Sử dụng `IntersectionObserver` để theo dõi trạng thái hiển thị của các section.
  * Khi một section thay đổi trạng thái giao cắt trong viewport (ví dụ chiếm >= 40% diện tích màn hình), callback của observer sẽ cập nhật `activeSection`.
  * Loại bỏ scroll event listener chứa `getBoundingClientRect()`, giải phóng hoàn toàn main thread khi cuộn trang.

---

### 2.4. Loại bỏ ResizeObserver thủ công tại useFeaturedNationalities
* **Tệp thay đổi:** `src/components/sections/hooks/useFeaturedNationalities.tsx` và `src/components/sections/FeaturedNationalities.tsx`
* **Vấn đề:** Tự cài đặt `ResizeObserver` và state `tabContentHeight` để animate chiều cao gây re-render lặp.
* **Giải pháp:**
  * Loại bỏ `ResizeObserver` và state `tabContentHeight` khỏi hook.
  * Trong component `FeaturedNationalities`, cấu hình thuộc tính animate của Framer Motion sang `height: showMore ? "auto" : 0`. Framer Motion tự động tối ưu hóa việc đo đạc kích thước dưới mức CSS/JS mà không làm trigger re-render React.

---

### 2.5. Khắc phục lỗi Dynamic Component Definition ở ChatMessage
* **Tệp thay đổi:** `src/components/features/chat/ChatMessage.tsx`
* **Vấn đề:** Khai báo hàm `function MarkdownWrapper` bên trong `useMemo` của `ChatMessage` khiến React unmount và remount toàn bộ DOM của Markdown mỗi khi bubble tin nhắn re-render.
* **Giải pháp:**
  * Tạo một React Context `ChatHighlightContext` để truyền các tham số highlight (`searchQuery`, `isUser`) xuống các component Markdown.
  * Di chuyển định nghĩa `markdownComponents` ra bên ngoài component `ChatMessageInner` thành một hằng số tĩnh ở cấp độ file.
  * Định nghĩa component `HighlightText` tĩnh độc lập để xử lý highlight từ khoá tìm kiếm.

```tsx
// src/components/features/chat/ChatMessage.tsx

export const ChatHighlightContext = React.createContext<{
    searchQuery?: string;
    isUser: boolean;
}>({ searchQuery: "", isUser: false });

function HighlightText({ text }: { text: string }) {
    const { searchQuery, isUser } = React.useContext(ChatHighlightContext);
    if (!searchQuery || !searchQuery.trim()) return <>{text}</>;
    const q = searchQuery.toLowerCase();
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escaped})`, "gi");
    const parts = text.split(regex);

    return (
        <>
            {parts.map((part, i) => {
                if (i % 2 === 1) {
                    return (
                        <SearchMatchSpan key={i} isUserMessage={isUser}>
                            {part}
                        </SearchMatchSpan>
                    );
                }
                return part;
            })}
        </>
    );
}

// markdownComponents tĩnh hoàn toàn, khai báo 1 lần duy nhất ngoài file
const staticMarkdownComponents = {
    p: ({ children, ...props }: any) => (
        <p {...props}>{highlightChildren(children)}</p>
    ),
    span: ({ children, ...props }: any) => (
        <span {...props}>{highlightChildren(children)}</span>
    ),
    // ... các thẻ markdown khác
};

function highlightChildren(children: React.ReactNode): React.ReactNode {
    return React.Children.map(children, (child) => {
        if (typeof child === "string") {
            return <HighlightText text={child} />;
        }
        return child;
    });
}
```

---

### 2.6. Khắc phục lỗi parse Date lặp trong ChatMessageList
* **Tệp thay đổi:** `src/components/features/chat/window/ChatMessageList.tsx`
* **Vấn đề:** Hàm `parseISO(msg.timestamp)` được gọi lặp đi lặp lại hàng chục lần trên mỗi chu kỳ render trong vòng lặp `.map` để vẽ thanh phân tách ngày (Separator).
* **Giải pháp:**
  * Vì `timestamp` là chuỗi ISO chuẩn có dạng `YYYY-MM-DDThh:mm:ss...`, ta chỉ cần cắt chuỗi ngày `msg.timestamp.substring(0, 10)` để so sánh trực tiếp bằng chuỗi (string comparison).
  * Việc so sánh chuỗi ngày trực tiếp nhanh hơn hàng trăm lần so với việc parse đối tượng Date qua `parseISO` và chạy `isSameDay()`.

---

## 3. Kế hoạch kiểm thử (Verification Plan)
1. **Kiểm tra biên dịch và kiểu (Build & Typecheck):** Chạy `npm run build` để đảm bảo code biên dịch sạch, không có lỗi TypeScript hay lỗi SSR dynamic render.
2. **Kiểm tra Splash Screen (T0):** Refresh trang (F5) và kiểm tra xem Splash Screen có hiện ngay lập tức không (không còn hiện tượng màn hình đen trước khi Splash hiện).
3. **Kiểm tra cuộn trang chủ:** Sử dụng Chrome DevTools Performance panel, kiểm tra FPS khi cuộn qua lại các phần trên trang chủ để đảm bảo cuộn mượt và không bị Layout Thrashing.
4. **Kiểm tra chuyển trang:** Nhấp chuột vào các liên kết chuyển trang và xác nhận hiệu ứng Stinger bay ra lập tức mà không còn bị đơ một nhịp ban đầu.
5. **Kiểm tra chat:** Mở cửa sổ chat, gõ nội dung và stream tin nhắn của AI. Đảm bảo tin nhắn stream mượt mà, tính năng highlight từ khoá tìm kiếm tin nhắn hoạt động chính xác và không bị lỗi unmount/remount DOM.
