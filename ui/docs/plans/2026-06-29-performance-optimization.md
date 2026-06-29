# Tối ưu hóa Hiệu năng Dự án FASTVISA UI Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

## 1. Checklist Theo Dõi Tiến Độ
- [ ] Phân tích User Flow & Kết quả kỳ vọng
- [ ] Task 1: Non-blocking SSR tại RootLayout
- [ ] Task 2: Loại bỏ re-render toàn trang trong Stinger
- [ ] Task 3: Chuyển FloatingTOC scroll spy sang IntersectionObserver
- [ ] Task 4: Loại bỏ ResizeObserver thủ công tại FeaturedNationalities
- [ ] Task 5: Tách static markdownComponents tại ChatMessage
- [ ] Task 6: Tối ưu hoá so sánh ngày trong ChatMessageList
- [ ] Verification: Log Analysis (app.log)
- [ ] Verification: Build & Lint Pass

## 2. User Flow & Kết Quả Kỳ Vọng
- **User Flow:**
  - Người dùng truy cập trang chủ hoặc tải lại trang (F5): Màn hình Splash Screen xuất hiện ngay lập tức tại T0, không còn bị màn đen nữa.
  - Người dùng cuộn trang chủ: Cuộn mượt mà 60fps, CPU ổn định, không giật lag.
  - Người dùng nhấp vào liên kết chuyển trang (StingerLink): Hoạt ảnh stinger bay ra lập tức, không bị đơ/đứng hình 150-300ms ban đầu.
  - Người dùng mở khung chat và nhận tin nhắn stream từ AI: Bong bóng chat hiển thị và cập nhật mượt mà, không bị mất DOM hay freeze text.
- **Kết Quả Kỳ Vọng:**
  - Màn hình Splash Screen hiện ngay tại T0 (TTFB < 200ms).
  - Tần suất tính toán của scroll handler tại FloatingTOC giảm 100% khi dùng IntersectionObserver.
  - Component ChatMessage render nhanh gấp 3-4 lần khi không còn unmount/remount Markdown DOM động.
  - Code compile sạch, không có lỗi kiểu TypeScript hay lỗi runtime.

**Goal:** Khắc phục triệt để 6 nguyên nhân chính gây giật lag và block luồng xử lý trên trang chủ, trang tĩnh và Chat Widget của dự án FASTVISA UI.

**Architecture:** Sử dụng kiến trúc non-blocking SSR bằng Suspense ở layout, tối ưu hoá React rendering bằng cách di chuyển dynamic components ra ngoài, triệt tiêu Layout Thrashing bằng IntersectionObserver thay vì scroll event listeners, và loại bỏ state trung gian không cần thiết.

**Tech Stack:** React 19, Next.js 16 (App Router), GSAP, Framer Motion, IntersectionObserver, TypeScript

---

### Task 1: Non-blocking SSR tại RootLayout

**Files:**
- Modify: `d:/F8_K15_BTVN/FASTVISA/ui/src/app/layout.tsx`

**Step 1: Write the failing test**
(Kiểm tra bằng cách chạy dev build và F5, theo dõi log xem application-code có bị block trước T0).

**Step 2: Run test to verify it fails**
N/A

**Step 3: Write minimal implementation**
Tách `getFooterSettings()` ra khỏi `RootLayout` và đưa xuống component con `LayoutContent`. Bọc trong `<Suspense>`.

```tsx
// Sửa đổi trong d:/F8_K15_BTVN/FASTVISA/ui/src/app/layout.tsx
// Đổi cấu trúc render của RootLayout như thiết kế
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

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    // KHÔNG await getFooterSettings ở đây nữa!
    return (
        <html
            lang="en"
            suppressHydrationWarning
            className={`${cormorant.variable} ${jakartaSans.variable} ${dmSans.variable} ${jetbrainsMono.variable} ${inter.variable}`}
        >
            <head>
                {/* Giữ nguyên các link/meta/ThemeInitScript/LangInitScript/style inline */}
            </head>
            <body
                suppressHydrationWarning
                className="flex min-h-svh flex-col antialiased"
            >
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

**Step 4: Run test to verify it passes**
F5 refresh trang, kiểm tra log xem có render ngay Splash hay không.

---

### Task 2: Loại bỏ re-render toàn trang trong Stinger

**Files:**
- Modify: `d:/F8_K15_BTVN/FASTVISA/ui/src/components/stinger/StingerProvider.tsx`
- Modify: `d:/F8_K15_BTVN/FASTVISA/ui/src/components/stinger/StingerOverlay.tsx`

**Step 1: Write the failing test**
Nhấp link điều hướng và quan sát có độ trễ trước khi hoạt ảnh xuất hiện.

**Step 2: Run test to verify it fails**
N/A

**Step 3: Write minimal implementation**
1. Sửa `StingerProvider.tsx`: Loại bỏ state `isAnimating` và prop `onAnimatingChange` truyền cho `StingerOverlay`. Loại bỏ `isAnimating` khỏi context value.
2. Sửa `StingerOverlay.tsx`: Loại bỏ prop `onAnimatingChange` và việc gọi hàm này. Chỉ sử dụng `isAnimatingRef.current`.

```tsx
// StingerProvider.tsx
export function StingerProvider({
  children,
  duration = 0.5,
  stagger = 0.08,
}: StingerProviderProps) {
  const overlayRef = useRef<StingerOverlayHandle>(null)

  const triggerStinger = useCallback((callback: StingerCallback) => {
    overlayRef.current?.trigger(callback)
  }, [])

  return (
    <StingerContext.Provider value={{ triggerStinger, isAnimating: false }}>
      {children}
      <StingerOverlay
        ref={overlayRef}
        duration={duration}
        stagger={stagger}
      />
    </StingerContext.Provider>
  )
}
```

**Step 4: Run test to verify it passes**
Nhấp chuyển trang, stinger phải xuất hiện tức thì không bị đơ.

---

### Task 3: Chuyển FloatingTOC scroll spy sang IntersectionObserver

**Files:**
- Modify: `d:/F8_K15_BTVN/FASTVISA/ui/src/components/features/FloatingTOC.tsx`

**Step 1: Write the failing test**
Scroll trang chủ và quan sát CPU tăng vọt thông qua Task Manager.

**Step 2: Run test to verify it fails**
N/A

**Step 3: Write minimal implementation**
Thay thế scroll listener tính toán `getBoundingClientRect()` bằng `IntersectionObserver` để nhận biết section active.

```tsx
// FloatingTOC.tsx
// Sửa hai useEffect theo dõi scroll thành một IntersectionObserver duy nhất
useEffect(() => {
    const observerOptions = {
        root: null,
        rootMargin: "-20% 0px -40% 0px", // theo dõi vùng giữa màn hình
        threshold: 0,
    };

    const callback = (entries: IntersectionObserverEntry[]) => {
        if (isScrollingRef.current) return; // đang smooth scroll tự động

        // Lấy section đang có tỉ lệ giao cắt lớn nhất
        let activeId = activeSection;
        let maxRatio = -1;

        entries.forEach((entry) => {
            if (entry.isIntersecting && entry.intersectionRatio > maxRatio) {
                activeId = entry.target.id;
            }
        });

        if (activeId && activeId !== activeSection) {
            setActiveSection(activeId);
        }
    };

    const observer = new IntersectionObserver(callback, observerOptions);

    activeSections.forEach((sec) => {
        const el = document.getElementById(sec.id);
        if (el) observer.observe(el);
    });

    return () => observer.disconnect();
}, [activeSections, activeSection]);
```

**Step 4: Run test to verify it passes**
Cuộn trang chủ, TOC highlight đổi chính xác theo các section và cuộn mượt hơn hẳn.

---

### Task 4: Loại bỏ ResizeObserver thủ công tại FeaturedNationalities

**Files:**
- Modify: `d:/F8_K15_BTVN/FASTVISA/ui/src/components/sections/hooks/useFeaturedNationalities.tsx`
- Modify: `d:/F8_K15_BTVN/FASTVISA/ui/src/components/sections/FeaturedNationalities.tsx`

**Step 1: Write the failing test**
Đổi tab trong mục Nationalities, xem có trễ render.

**Step 2: Run test to verify it fails**
N/A

**Step 3: Write minimal implementation**
1. Trong `useFeaturedNationalities.tsx`: Loại bỏ `setTabContentHeight`, `tabContentHeight` state và `ResizeObserver` trong `useEffect`.
2. Trong `FeaturedNationalities.tsx`: Đổi animate height thành `"auto"`.

```tsx
// FeaturedNationalities.tsx
        <m.div
          ref={extendedSectionRef}
          animate={{
            height: showMore ? "auto" : 0,
            opacity: showMore ? 1 : 0,
          }}
          transition={{
            duration: 0.45,
            ease: [0.25, 1, 0.5, 1],
          }}
          style={{ willChange: "height, opacity" }}
          className="overflow-hidden relative w-full"
        >
```

**Step 4: Run test to verify it passes**
Nhấp "Show more" và đổi các tab, chiều cao co giãn mượt mà.

---

### Task 5: Tách static markdownComponents tại ChatMessage

**Files:**
- Modify: `d:/F8_K15_BTVN/FASTVISA/ui/src/components/features/chat/ChatMessage.tsx`

**Step 1: Write the failing test**
Dựng một test loop hoặc chat tin nhắn dài, text stream bị khựng.

**Step 2: Run test to verify it fails**
N/A

**Step 3: Write minimal implementation**
1. Khai báo `ChatHighlightContext` ở ngoài file `ChatMessage.tsx`.
2. Định nghĩa component tĩnh `HighlightText` và `staticMarkdownComponents` bên ngoài component chính.
3. Bọc `ReactMarkdown` trong `ChatHighlightContext.Provider`.

```tsx
// ChatMessage.tsx
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

function highlightChildren(children: React.ReactNode): React.ReactNode {
    return React.Children.map(children, (child) => {
        if (typeof child === "string") {
            return <HighlightText text={child} />;
        }
        return child;
    });
}

const staticMarkdownComponents = {
    p: ({ children, ...props }: any) => <p {...props}>{highlightChildren(children)}</p>,
    span: ({ children, ...props }: any) => <span {...props}>{highlightChildren(children)}</span>,
    strong: ({ children, ...props }: any) => <strong {...props}>{highlightChildren(children)}</strong>,
    em: ({ children, ...props }: any) => <em {...props}>{highlightChildren(children)}</em>,
    del: ({ children, ...props }: any) => <del {...props}>{highlightChildren(children)}</del>,
    a: ({ children, ...props }: any) => <a {...props}>{highlightChildren(children)}</a>,
    ul: ({ children, ...props }: any) => <ul {...props}>{highlightChildren(children)}</ul>,
    ol: ({ children, ...props }: any) => <ol {...props}>{highlightChildren(children)}</ol>,
    li: ({ children, ...props }: any) => <li {...props}>{highlightChildren(children)}</li>,
    h1: ({ children, ...props }: any) => <h1 {...props}>{highlightChildren(children)}</h1>,
    h2: ({ children, ...props }: any) => <h2 {...props}>{highlightChildren(children)}</h2>,
    h3: ({ children, ...props }: any) => <h3 {...props}>{highlightChildren(children)}</h3>,
    h4: ({ children, ...props }: any) => <h4 {...props}>{highlightChildren(children)}</h4>,
    h5: ({ children, ...props }: any) => <h5 {...props}>{highlightChildren(children)}</h5>,
    h6: ({ children, ...props }: any) => <h6 {...props}>{highlightChildren(children)}</h6>,
    td: ({ children, ...props }: any) => <td {...props}>{highlightChildren(children)}</td>,
    th: ({ children, ...props }: any) => <th {...props}>{highlightChildren(children)}</th>,
    blockquote: ({ children, ...props }: any) => <blockquote {...props}>{highlightChildren(children)}</blockquote>,
};
```
Trong render của `ChatMessageInner`, bọc `ReactMarkdown` như sau:
```tsx
                                                    <ChatHighlightContext.Provider value={{ searchQuery, isUser }}>
                                                        <div className="prose prose-sm max-w-none dark:prose-invert [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 font-medium prose-a:text-[var(--color-primary)] prose-a:underline prose-a:decoration-dashed prose-a:underline-offset-4 hover:prose-a:decoration-solid hover:prose-a:text-[var(--color-primary-dark)] prose-a:font-semibold">
                                                            <ReactMarkdown
                                                                remarkPlugins={[remarkGfm]}
                                                                components={staticMarkdownComponents}
                                                            >
                                                                {cleanMessageText}
                                                            </ReactMarkdown>
                                                        </div>
                                                    </ChatHighlightContext.Provider>
```

**Step 4: Run test to verify it passes**
Chat hoạt động bình thường, stream chữ mượt mà, highlight hoạt động chính xác khi search.

---

### Task 6: Tối ưu hoá so sánh ngày trong ChatMessageList

**Files:**
- Modify: `d:/F8_K15_BTVN/FASTVISA/ui/src/components/features/chat/window/ChatMessageList.tsx`

**Step 1: Write the failing test**
Cuộn danh sách 50 tin nhắn cũ và theo dõi CPU.

**Step 2: Run test to verify it fails**
N/A

**Step 3: Write minimal implementation**
Thay thế logic `isSameDay(parseISO(msg.timestamp), parseISO(prevMsg.timestamp))` bằng so sánh chuỗi ngày trực tiếp `msg.timestamp.substring(0, 10) === prevMsg.timestamp.substring(0, 10)`.

```tsx
// ChatMessageList.tsx
                    // Day separator so sánh bằng chuỗi con (substring) thay vì gọi parseISO + isSameDay
                    const showSeparator =
                        !prevMsg ||
                        msg.timestamp.substring(0, 10) !== prevMsg.timestamp.substring(0, 10);
```

**Step 4: Run test to verify it passes**
Danh sách chat hiển thị bình thường, thanh phân tách ngày chính xác.

---

## Verification Plan (Bắt Buộc)

> **CẢNH BÁO:** Bắt buộc áp dụng tiêu chuẩn kiểm chứng nghiêm ngặt tương tự `phase-verification`. Không được tự động kết luận thành công nếu chưa pass toàn bộ các bước dưới đây.

**1. Mô phỏng cURL Http Request Thực Tế (Báo cáo Input/Output):**
- Đảm bảo các route static của trang chủ phản hồi nhanh, SSR HTML chứa splash screen được gửi về tức thì (TTFB < 200ms).
- Thử nghiệm tắt JS trên browser, Splash Screen tĩnh vẫn hiển thị chính xác.

**2. System Log Analysis:**
- Theo dõi `app.log` của dev server Next.js.
- Phải đảm bảo `application-code` giảm xuống dưới 200ms cho các lần tải trang thông thường (không phải compile lần đầu).

**3. Build & Lint Check:**
- Chạy `npm run lint` ở dự án `@ui` (Pass 100%).
- Chạy `npm run build` ở dự án `@ui` (Pass 100%).
