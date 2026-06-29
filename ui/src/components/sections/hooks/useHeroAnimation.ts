import { useState, useEffect } from "react";

export function useHeroAnimation() {
    // Track whether the homepage header has revealed (after scroll > 80px)
    const [headerVisible, setHeaderVisible] = useState(false);

    useEffect(() => {
        let timer: NodeJS.Timeout | null = null;
        // [QUAN TRỌNG] Next.js App Router có cơ chế Client-side Router Cache (như <Offscreen>).
        // Khi quay lại trang từ trang khác, component không thực sự unmount hoàn toàn mà được "resume",
        // khiến `useState` giữ nguyên giá trị `true` cũ.
        // Do đó, ta phải chủ động reset lại state `false` ngay khi mount nếu đang ở đầu trang
        // để tạo lại "Ấn tượng đầu" hoàn hảo theo yêu cầu.
        if (typeof window !== "undefined" && window.scrollY <= 80) {
            timer = setTimeout(() => setHeaderVisible(false), 0);
        }

        const handleScroll = () => {
            if (window.scrollY > 80) {
                setHeaderVisible(true);
            }
        };
        
        window.addEventListener("scroll", handleScroll, { passive: true });
        
        return () => {
            if (timer) clearTimeout(timer);
            window.removeEventListener("scroll", handleScroll);
        };
    }, []);

    // Content animation variants — slide in from left
    const contentVariants = {
        hidden: { opacity: 0, x: -60, y: 20 },
        visible: {
            opacity: 1,
            x: 0,
            y: 0,
            transition: {
                type: "spring" as const,
                stiffness: 80,
                damping: 20,
                mass: 0.8,
                delay: 0.15,
            },
        },
    };

    // Eyebrow + sub-elements stagger
    const eyebrowVariants = {
        hidden: { opacity: 0, y: -16 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                type: "spring" as const,
                stiffness: 120,
                damping: 18,
                delay: 0.05,
            },
        },
    };

    const headlineVariants = {
        hidden: { opacity: 0, x: -40 },
        visible: {
            opacity: 1,
            x: 0,
            transition: {
                type: "spring" as const,
                stiffness: 90,
                damping: 22,
                delay: 0.2,
            },
        },
    };

    const subVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                type: "spring" as const,
                stiffness: 100,
                damping: 20,
                delay: 0.35,
            },
        },
    };

    const ctaVariants = {
        hidden: { opacity: 0, y: 24 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                type: "spring" as const,
                stiffness: 100,
                damping: 20,
                delay: 0.5,
            },
        },
    };

    const statsVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                type: "spring" as const,
                stiffness: 80,
                damping: 20,
                delay: 0.65,
            },
        },
    };

    // Form animation variants — slide in from right
    const formVariants = {
        hidden: { opacity: 0, x: 80, scale: 0.96 },
        visible: {
            opacity: 1,
            x: 0,
            scale: 1,
            transition: {
                type: "spring" as const,
                stiffness: 70,
                damping: 18,
                mass: 0.9,
                delay: 0.3,
            },
        },
    };

    return {
        headerVisible,
        contentVariants,
        eyebrowVariants,
        headlineVariants,
        subVariants,
        ctaVariants,
        statsVariants,
        formVariants,
    };
}
