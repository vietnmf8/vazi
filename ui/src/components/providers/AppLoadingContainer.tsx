"use client";

import React, { useState, useEffect, useCallback } from "react";
import SplashScreen from "../common/SplashScreen";
import FastVisaLogoIcon from "@/assets/icons/ui/FastVisaLogo.svg";
import { AppLoadingContext } from "./AppLoadingContext";

interface AppLoadingContainerProps {
    children: React.ReactNode;
}

const SPLASH_MIN_DURATION = 650;

// --- DEBUG TIMING (xóa sau khi xác nhận fix) ---
const t0 = typeof performance !== "undefined" ? performance.now() : 0;

/**
 * Component AppLoadingContainer - Cầu nối Client-side để quản lý SplashScreen.
 * TẠI SAO xây dựng component này riêng biệt?
 * 1. Giữ cho root layout.tsx vẫn là một Server Component nguyên bản (RSC),
 *    bảo toàn khả năng tối ưu SEO, tối ưu font, metadata và PPR của Next.js 16.
 * 2. Tránh lỗi Hydration Mismatch bằng cách chỉ khởi tạo trạng thái Splash 
 *    khi component đã mount hoàn toàn tại Client-side (useEffect).
 * 3. Cho phép trang web bên dưới được hydrate ngầm (background hydration) 
 *    trong lúc Splash Screen đang hiển thị, rút ngắn thời gian phản hồi thực tế của trang.
 */
export default function AppLoadingContainer({ children }: AppLoadingContainerProps) {
    const [mounted, setMounted] = useState(false);
    const [isSplashMounted, setIsSplashMounted] = useState(true);
    
    const [holdCount, setHoldCount] = useState(0);
    const [isTimePassed, setIsTimePassed] = useState(false);

    const registerHold = useCallback(() => {
        setHoldCount((prev) => prev + 1);
        return () => {
            setHoldCount((prev) => prev - 1);
        };
    }, []);

    // Chỉ bắt đầu xử lý Splash khi component đã chạy trên trình duyệt (Client-side)
    useEffect(() => {
        // TẠI SAO dùng setTimeout 0ms?
        // Đẩy cập nhật mounted vào macro-task tiếp theo để tránh cascading renders đồng bộ trong phase effect.
        const timer = setTimeout(() => {
            setMounted(true);
        }, 0);
        return () => clearTimeout(timer);
    }, []);

    // Đảm bảo SplashScreen hiển thị tối thiểu 650ms
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsTimePassed(true);
        }, SPLASH_MIN_DURATION);
        return () => clearTimeout(timer);
    }, []);

    const isSplashFinished = isTimePassed && holdCount === 0;



    // SSR Placeholder: Hiển thị khi !mounted (server-side render hoặc trước hydration)
    // TẠI SAO dùng TOÀN BỘ inline styles thay vì Tailwind classes?
    // → Tailwind CSS file tải BẤT ĐỒNG BỘ. Tại T0 (HTML đã parse, CSS chưa áp dụng),
    //   các class như `fixed inset-0 z-9999` KHÔNG CÓ HIỆU LỰC → div vô hình → hở nền.
    // → Inline styles được trình duyệt áp dụng NGAY LẬP TỨC từ byte HTML đầu tiên,
    //   không cần chờ bất kỳ stylesheet nào → SplashScreen che toàn màn hình ngay tại T0.
    if (!mounted) {
        return (
            <AppLoadingContext.Provider value={{ registerHold }}>
                {children}
                {/*
                  Tất cả style là INLINE — đảm bảo hoạt động tại T0 khi Tailwind chưa load.
                  var(--color-bg) được định nghĩa trong critical <style> ở <head> (layout.tsx)
                  nên resolve ngay lập tức, không phụ thuộc globals.css.
                */}
                <div
                    style={{
                        position: "fixed",
                        inset: 0,
                        zIndex: 9999,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        overflow: "hidden",
                        // var(--color-bg) được set bởi critical CSS trong <head>.
                        // Fallback "#0c0b0a" (dark) vì user đang dùng dark mode.
                        backgroundColor: "var(--color-bg, #0c0b0a)",
                    }}
                >
                    {/* Đốm Mesh Glow: inline styles để render ngay tại T0 */}
                    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden", opacity: "var(--splash-mesh-opacity, 0.5)" }}>
                        <div style={{
                            position: "absolute", top: "-10%", left: "-10%",
                            width: "60vw", height: "60vw", borderRadius: "50%",
                            filter: "blur(80px)",
                            background: "radial-gradient(circle, rgba(217, 119, 6, 0.25) 0%, transparent 70%)"
                        }} />
                        <div style={{
                            position: "absolute", bottom: "-10%", right: "-10%",
                            width: "60vw", height: "60vw", borderRadius: "50%",
                            filter: "blur(80px)",
                            background: "radial-gradient(circle, rgba(15, 118, 110, 0.2) 0%, transparent 70%)"
                        }} />
                    </div>

                    {/* Logo FastVisa tĩnh — inline styles */}
                    <div style={{
                        position: "relative", zIndex: 10,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        width: 128, height: 128
                    }}>
                        <div style={{
                            position: "absolute", inset: 0, borderRadius: "50%",
                            filter: "blur(24px)", background: "var(--splash-logo-glow, rgba(245,158,11,0.15))", pointerEvents: "none"
                        }} />
                        <FastVisaLogoIcon id="fastvisa-logo" width="120" height="120" style={{ userSelect: "none" }} />
                    </div>

                    {/* Progress bar tĩnh (w=0% vì chưa có Framer Motion) */}
                    <div style={{
                        position: "absolute", bottom: 80, left: "50%", transform: "translateX(-50%)",
                        width: 160, height: 3, borderRadius: 9999, overflow: "hidden",
                        background: "var(--splash-progress-bg, rgba(28,25,23,0.5))"
                    }}>
                        <div style={{
                            height: "100%", width: "0%",
                            background: "linear-gradient(to right, #f59e0b, #fbbf24, #14b8a6)"
                        }} />
                    </div>
                </div>
            </AppLoadingContext.Provider>
        );
    }

    return (
        <AppLoadingContext.Provider value={{ registerHold }}>
            {children}
            {isSplashMounted && (
                <SplashScreen
                    isFinished={isSplashFinished}
                    onExitComplete={() => {
                        setIsSplashMounted(false);
                    }}
                />
            )}
        </AppLoadingContext.Provider>
    );
}
