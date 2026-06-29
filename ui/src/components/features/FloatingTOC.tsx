"use client";

import { useEffect, useState, useRef } from "react";
import { m, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const DEFAULT_SECTION_IDS = [
    "hero",
    "nationalities",
    "eligibility",
    "how-it-works",
    "pricing",
    "trust",
    "faq",
    "comments",
    "blog",
];

type FloatingTOCProps = {
    // Optional override for sections
    sections?: { id: string; label: string }[];
};

import { useTranslations } from "next-intl";

/**
 * Floating Table of Contents — Component dạng Notion cao cấp nổi ở góc phải màn hình.
 * TẠI SAO tách thành 2 Block A & B riêng biệt:
 * - Để giữ cho các vạch ngang nhỏ luôn nằm cố định mà không bị dịch chuyển hay co giãn giật cục khi mở rộng.
 * - Khi hover, Khối B (card chữ) trượt từ lề phải vào che phủ hoàn hảo vạch ngang cũ, tạo hiệu ứng trượt cực kỳ sang trọng.
 */
export function FloatingTOC({ sections }: FloatingTOCProps) {
    const t = useTranslations("HomePage.TOC");
    const activeSections = sections || DEFAULT_SECTION_IDS.map(id => ({ id, label: t(id as any) }));

    const [activeSection, setActiveSection] = useState(activeSections[0]?.id || "hero");
    const [isHovered, setIsHovered] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // TẠI SAO dùng refs khóa scroll: Khi click chọn mục, ta chủ động set active ngay lập tức 
    // và tạm thời khóa scroll spy trong 1000ms. Điều này tránh hiện tượng scroll spy tính toán sai 
    // làm nhảy lệch/giật ngược highlight sang mục khác khi đang cuộn mượt.
    const isScrollingRef = useRef(false);
    const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const sweepIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Dọn dẹp sweep interval khi component unmount để tránh rò rỉ bộ nhớ
    useEffect(() => {
        return () => {
            if (sweepIntervalRef.current) clearInterval(sweepIntervalRef.current);
        };
    }, []);

    // TẠI SAO theo dõi scroll bằng IntersectionObserver thay vì scroll listener:
    // Tận dụng API tối ưu của trình duyệt để phát hiện khi HeroSection biến mất, 
    // ẩn/hiện TOC mà không gây Layout Thrashing tại T0.
    useEffect(() => {
        const firstSectionId = activeSections[0]?.id;
        const firstSection = firstSectionId ? document.getElementById(firstSectionId) : null;
        if (!firstSection) {
            setIsVisible(true);
            return;
        }

        const observer = new IntersectionObserver(([entry]) => {
            setIsVisible(!entry.isIntersecting);
        }, {
            threshold: 0,
        });

        observer.observe(firstSection);
        return () => observer.disconnect();
    }, [activeSections]);

    // Thuật toán phát hiện section active nằm trong viewport sử dụng IntersectionObserver
    // TẠI SAO dùng rootMargin dải quét 10% ở giữa màn hình:
    // Tạo vùng quét ảo nằm chính giữa viewport. Khi section đi qua dải này,
    // nó tự động được đánh dấu active bất kể kích thước lớn nhỏ, hoàn toàn bất đồng bộ.
    useEffect(() => {
        const observerOptions = {
            root: null,
            rootMargin: "-45% 0px -45% 0px",
            threshold: 0,
        };

        const callback = (entries: IntersectionObserverEntry[]) => {
            if (isScrollingRef.current) return;

            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    setActiveSection(entry.target.id);
                }
            });
        };

        const observer = new IntersectionObserver(callback, observerOptions);

        activeSections.forEach((sec) => {
            const el = document.getElementById(sec.id);
            if (el) observer.observe(el);
        });

        return () => observer.disconnect();
    }, [activeSections]);

    // Hàm cuộn mượt đến phần tử mục tiêu
    const scrollToSection = (id: string) => {
        const el = document.getElementById(id);
        if (!el) return;

        const currentIndex = activeSections.findIndex((s) => s.id === activeSection);
        const targetIndex = activeSections.findIndex((s) => s.id === id);

        if (currentIndex !== -1 && targetIndex !== -1 && currentIndex !== targetIndex) {
            isScrollingRef.current = true;
            if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);

            const step = currentIndex < targetIndex ? 1 : -1;
            const stepsCount = Math.abs(targetIndex - currentIndex);

            let currentStep = 0;
            const intervalTime = Math.max(80, Math.min(150, 800 / stepsCount));
            
            if (sweepIntervalRef.current) clearInterval(sweepIntervalRef.current);
            
            sweepIntervalRef.current = setInterval(() => {
                currentStep++;
                const nextIndex = currentIndex + step * currentStep;
                if (nextIndex >= 0 && nextIndex < activeSections.length) {
                    setActiveSection(activeSections[nextIndex].id);
                }
                if (currentStep >= stepsCount) {
                    if (sweepIntervalRef.current) clearInterval(sweepIntervalRef.current);
                }
            }, intervalTime);
        } else {
            setActiveSection(id);
        }

        const headerOffset = 200;
        const elementPosition = el.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.scrollY - headerOffset;
        
        window.scrollTo({
            top: offsetPosition,
            behavior: "smooth",
        });

        // TẠI SAO dùng timeout 1000ms: Để mở khóa cuộn spy tự động sau khi 
        // trình duyệt kết thúc hoạt ảnh smooth scroll mà không cần lắng nghe sự kiện cuộn.
        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = setTimeout(() => {
            isScrollingRef.current = false;
        }, 1000);
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <m.div
                    ref={containerRef}
                    initial={{ opacity: 0, scale: 0.9, x: 20 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.9, x: 20 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    className="hidden md:flex fixed right-6 top-1/2 -translate-y-1/2 z-50 pointer-events-none items-center justify-end"
                    aria-label="Table of Contents"
                >
                    {/* 
                      TẠI SAO dùng padding lớn pl-16 và py-10:
                      Tạo một "vùng đệm hover" vô hình rộng rãi hơn để người dùng dễ dàng rê chuột 
                      từ cột vạch ngang sang card chi tiết mà không sợ bị mất sự kiện hover giữa chừng.
                    */}
                    <div className="relative pointer-events-auto py-10 pl-16 flex items-center justify-end">
                        
                        {/* ── BLOCK A: Cột vạch ngang nhỏ (Collapsed State) ── */}
                        {/* TẠI SAO mờ dần khi hover: Tránh việc các vạch ngang bị chồng chéo, xuyên thấu dưới card menu chữ. */}
                        <m.div
                            animate={{
                                opacity: isHovered ? 0 : 1,
                                scale: isHovered ? 0.9 : 1,
                            }}
                            transition={{ duration: 0.2 }}
                            className="flex flex-col items-center gap-3.5 w-6 select-none"
                        >
                            {activeSections.map((sec) => {
                                const isActive = activeSection === sec.id;
                                return (
                                    <button
                                        key={sec.id}
                                        onClick={() => scrollToSection(sec.id)}
                                        className="relative p-1 focus:outline-none group "
                                        title={sec.label}
                                    >
                                        <div
                                            className={cn(
                                                "h-[2.5px] rounded-full transition-all duration-300",
                                                isActive
                                                    ? "w-5 bg-amber-600 dark:bg-amber-500 shadow-[0_0_8px_rgba(217,119,6,0.6)]"
                                                    : "w-2.5 bg-stone-400/40 dark:bg-stone-600/40 group-hover:w-4 group-hover:bg-stone-500/80 dark:group-hover:bg-stone-400 transition-all"
                                            )}
                                        />
                                    </button>
                                );
                            })}
                        </m.div>

                        {/* ── BLOCK B: Card TOC chi tiết (Expanded State - Notion Style) ── */}
                        {/* TẠI SAO dùng nền đặc hoàn toàn: Đáp ứng thiết kế cao cấp, che kín khối vạch cũ bên dưới để tập trung thị giác. */}
                        <AnimatePresence>
                            {isHovered && (
                                <m.div
                                    initial={{ opacity: 0, x: "110%", scale: 0.95 }}
                                    animate={{ opacity: 1, x: 0, scale: 1 }}
                                    exit={{ opacity: 0, x: "110%", scale: 0.95 }}
                                    transition={{
                                        type: "spring",
                                        stiffness: 350,
                                        damping: 28,
                                    }}
                                    className={cn(
                                        "absolute right-0 top-1/2 -translate-y-1/2 w-60 p-5 rounded-xl select-none",
                                        "bg-white dark:bg-[#191919] border border-stone-200 dark:border-stone-800/60",
                                        "shadow-[0_20px_50px_rgba(0,0,0,0.12)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
                                    )}
                                    style={{
                                        backdropFilter: "none",
                                        WebkitBackdropFilter: "none",
                                    }}
                                >
                                    <div className="flex flex-col gap-1 max-h-[70vh] overflow-y-auto select-no-scrollbar">
                                        {activeSections.map((sec) => {
                                            const isActive = activeSection === sec.id;
                                            return (
                                                <button
                                                    key={sec.id}
                                                    onClick={() => scrollToSection(sec.id)}
                                                    className={cn(
                                                        "flex items-center gap-3 px-2 py-1.5 rounded-lg text-left text-xs font-semibold focus:outline-none transition-all w-full group",
                                                        isActive
                                                            ? "text-(--color-primary) font-extrabold"
                                                            : "text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-50/70 dark:hover:bg-stone-900/40 hover:translate-x-1 transition-all"
                                                    )}
                                                >
                                                    <div
                                                        className={cn(
                                                            "h-[2px] rounded-full transition-all duration-300 shrink-0",
                                                            isActive
                                                                ? "w-3 bg-amber-600 dark:bg-amber-500"
                                                                : "w-1 bg-stone-400/30 group-hover:w-2 transition-all"
                                                        )}
                                                    />
                                                    <span className="truncate">{sec.label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </m.div>
                            )}
                        </AnimatePresence>
                    </div>
                </m.div>
            )}
        </AnimatePresence>
    );
}
