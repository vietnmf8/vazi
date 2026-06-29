"use client";

import React, { createContext, useContext, useState, useEffect, useTransition } from "react";
import { usePathname } from "next/navigation";
import { m, AnimatePresence } from "framer-motion";

// Định nghĩa kiểu dữ liệu cho context nhằm tuân thủ strict mode
interface RouteTransitionContextProps {
    isTransitioning: boolean;
    startTransition: () => void;
    stopTransition: () => void;
}

const RouteTransitionContext = createContext<RouteTransitionContextProps | undefined>(undefined);

/**
 * Hook tùy chỉnh để sử dụng trạng thái chuyển route ở các component con nếu cần kích hoạt thủ công.
 */
export function useRouteTransition() {
    const context = useContext(RouteTransitionContext);
    if (!context) {
        throw new Error("useRouteTransition phải được sử dụng trong một RouteTransitionProvider");
    }
    return context;
}

/**
 * Component RouteTransitionProvider - Quản lý hiệu ứng chuyển trang toàn cục không xâm lấn.
 * TẠI SAO xây dựng component này?
 * 1. Next.js 16 App Router không còn hỗ trợ các sự kiện chuyển trang (router.events).
 * 2. Cung cấp phản hồi trực quan ngay lập tức khi click link (tránh cảm giác ứng dụng bị đơ trong lúc Next.js tải trang mới).
 * 3. Hỗ trợ thanh Progress Bar gradient Amber-Teal mảnh (2px) ở đỉnh đầu trang cực kỳ cao cấp.
 * 4. Mờ nhẹ giao diện cũ của trang hiện tại giúp tăng cảm giác chiều sâu không gian khi chuyển đổi.
 */
export default function RouteTransitionProvider({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    
    const [isPending, startReactTransition] = useTransition();
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [progress, setProgress] = useState(0);

    // Kích hoạt trạng thái loading chuyển trang
    const startTransition = () => {
        setIsTransitioning(true);
        setProgress(10); // Bắt đầu ở mức 10% để phản hồi tức thì
    };

    // Kết thúc trạng thái loading chuyển trang
    const stopTransition = () => {
        // TẠI SAO dùng setTimeout 0ms?
        // Đẩy cập nhật progress vào macro-task tiếp theo để tránh cascading renders đồng bộ.
        setTimeout(() => {
            setProgress(100);
        }, 0);
        
        // Trì hoãn nhẹ 200ms trước khi ẩn hẳn thanh Progress Bar để người dùng kịp nhìn thấy tiến trình hoàn tất
        const timer = setTimeout(() => {
            setIsTransitioning(false);
            setProgress(0);
        }, 220);

        return () => clearTimeout(timer);
    };

    // TẠI SAO lắng nghe pathname thay đổi?
    // Khi URL chính thức thay đổi, nghĩa là Next.js đã tải xong và render trang mới thành công.
    // Đây là thời điểm chính xác nhất để dập tắt màn hình loading.
    useEffect(() => {
        // TẠI SAO return stopTransition()?
        // stopTransition trả về hàm cleanup chứa clearTimeout(timer).
        // Phải return hàm này để React tự động xóa timer cũ khi pathname đổi hoặc component unmount,
        // tránh tích lũy timer gây rò rỉ bộ nhớ sau mỗi lần điều hướng trang.
        return stopTransition();
    }, [pathname]);

    // TẠI SAO có cơ chế tự động chạy tiến trình Progress Bar đến 90%?
    // Vì ta không thể biết chính xác thời gian tải trang mới mất bao lâu, 
    // ta cho thanh Progress chạy tự động chậm dần đều (Ease-out) đến tối đa 90% để giữ nhịp tương tác trực quan.
    useEffect(() => {
        if (!isTransitioning) return;

        const interval = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 90) {
                    clearInterval(interval);
                    return 90;
                }
                // Tốc độ chạy chậm dần đều khi tiến gần tới 90%
                const increment = (95 - prev) * 0.12;
                return prev + increment;
            });
        }, 120);

        return () => clearInterval(interval);
    }, [isTransitioning]);

    // TẠI SAO sử dụng Global Click Interceptor?
    // Giúp bắt sự kiện click trên toàn bộ ứng dụng mà không cần sửa đổi hay thay thế
    // hàng chục thẻ <Link> hiện có trong dự án, đảm bảo mã nguồn cực kỳ gọn sạch (Clean Code).
    useEffect(() => {
        const handleAnchorClick = (event: MouseEvent) => {
            const anchor = (event.target as HTMLElement).closest("a");
            
            // TẠI SAO cần kiểm tra các phím Ctrl/Cmd/Shift/Alt và target="_blank"?
            // Vì các thao tác này mở link trong tab mới hoặc cửa sổ mới của trình duyệt,
            // ta KHÔNG được làm mờ trang hiện tại hay hiện loading trên tab này.
            if (
                anchor &&
                anchor.href &&
                !anchor.target &&
                anchor.target !== "_blank" &&
                !event.ctrlKey &&
                !event.metaKey &&
                !event.shiftKey &&
                !event.altKey &&
                event.button === 0 // Chỉ bắt chuột trái
            ) {
                // TẠI SAO bỏ qua các liên kết có data-prevent-transition="true"?
                // Để tránh kích hoạt nhầm thanh Progress Bar chuyển trang khi click vào các thẻ
                // có thuộc tính này (ví dụ: các thẻ quốc gia trong FeaturedNationalities.tsx có href để SEO
                // nhưng thực tế dùng modal lật 3D Card tại chỗ).
                const preventTransition = 
                    anchor.getAttribute("data-prevent-transition") === "true" ||
                    anchor.closest("[data-prevent-transition='true']");
                if (preventTransition) return;

                try {
                    const targetUrl = new URL(anchor.href);
                    const currentUrl = new URL(window.location.href);

                    // Chỉ bắt chuyển route nếu trỏ tới route nội bộ khác trong cùng ứng dụng
                    const isInternalLink = targetUrl.origin === currentUrl.origin;
                    const isDifferentRoute = targetUrl.pathname !== currentUrl.pathname || targetUrl.search !== currentUrl.search;
                    const isNotHash = !targetUrl.hash || targetUrl.pathname !== currentUrl.pathname;

                    if (isInternalLink && isDifferentRoute && isNotHash) {
                        startReactTransition(() => {
                            startTransition();
                        });
                    }
                } catch (e) {
                    // Bỏ qua lỗi định dạng URL
                }
            }
        };

        // Lắng nghe ở giai đoạn capture để bắt sự kiện trước khi các logic định tuyến React chạy
        document.addEventListener("click", handleAnchorClick, { capture: true });
        return () => document.removeEventListener("click", handleAnchorClick, { capture: true });
    }, []);

    // Hỗ trợ Reduced Motion: Tự động tắt bớt hoạt ảnh nặng nếu hệ điều hành yêu cầu
    const [reducedMotion, setReducedMotion] = useState(false);
    useEffect(() => {
        if (typeof window !== "undefined") {
            const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
            
            // TẠI SAO dùng setTimeout 0ms?
            // Để tránh lỗi react-hooks/set-state-in-effect do gọi setState đồng bộ trực tiếp trong effect.
            setTimeout(() => {
                setReducedMotion(mediaQuery.matches);
            }, 0);
            
            const listener = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
            mediaQuery.addEventListener("change", listener);
            return () => mediaQuery.removeEventListener("change", listener);
        }
    }, []);

    return (
        <RouteTransitionContext.Provider value={{ isTransitioning, startTransition, stopTransition }}>
            {/* 
              Thanh Progress Bar gradient Amber-Teal siêu mảnh.
              TẠI SAO bọc trong AnimatePresence?
              Để thanh Progress Bar mờ dần đi (Fade-out) một cách mềm mại khi đạt 100%, 
              thay vì biến mất đột ngột gây cảm giác thô cứng.
            */}
            <AnimatePresence>
                {isTransitioning && (
                    <m.div
                        className="fixed top-0 left-0 right-0 z-99999 h-[2.5px] bg-gradient-to-r from-amber-500 via-amber-400 to-teal-500 shadow-[0_1px_6px_rgba(245,158,11,0.25)] origin-left"
                        style={{ scaleX: progress / 100 }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                    />
                )}
            </AnimatePresence>

            <div className="flex flex-col min-h-svh">
                {children}
            </div>
        </RouteTransitionContext.Provider>
    );
}
