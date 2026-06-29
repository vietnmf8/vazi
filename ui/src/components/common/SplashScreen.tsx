"use client";

import React, { useEffect } from "react";
import { m, AnimatePresence } from "framer-motion";
import FastVisaLogo from "../ui/FastVisaLogo";

// Táº I SAO cáº¥u hÃ¬nh táº­p trung cÃ¡c thÃ´ng sá»‘ SplashScreen á»Ÿ Ä‘Ã¢y?
// GiÃºp ngÆ°á»i dÃ¹ng dá»… dÃ ng theo dÃµi vÃ  tÃ¹y chá»‰nh toÃ n bá»™ cÃ¡c thÃ´ng sá»‘ tá»‘c Ä‘á»™ cá»§a mÃ n hÃ¬nh chÃ o.
const SPLASH_CONFIG = {
    // Tá»•ng thá»i gian hiá»ƒn thá»‹ SplashScreen trÆ°á»›c khi báº¯t Ä‘áº§u cháº¡y exit animation (ms)
    // Giáº£m tá»« 1300ms xuá»‘ng 650ms (cháº¡y nhanh gáº¥p Ä‘Ã´i!)
    duration: 650, 
    
    // Thá»i gian cháº¡y cá»§a thanh Progress Bar tá»« 0% lÃªn 100% (giÃ¢y)
    // Cáº§n khá»›p hoáº·c nhá» hÆ¡n thá»i gian hiá»ƒn thá»‹ ( duration / 1000 )
    progressDuration: 0.55,
    
    // Thá»i gian cháº¡y cá»§a exit transition (má» dáº§n vÃ  phÃ³ng to logo) (giÃ¢y)
    exitDuration: 0.25,
};

interface SplashScreenProps {
    isFinished: boolean;
    // Callback Ä‘Æ°á»£c gá»i SAU KHI exit animation hoÃ n táº¥t hoÃ n toÃ n,
    // giÃºp AppLoadingContainer unmount component khá»i DOM má»™t cÃ¡ch sáº¡ch sáº½.
    onExitComplete?: () => void;
}

/**
 * Component SplashScreen - MÃ n hÃ¬nh chÃ o má»«ng sang trá»ng hiá»ƒn thá»‹ khi táº£i trang láº§n Ä‘áº§u.
 * Táº I SAO xÃ¢y dá»±ng component nÃ y?
 * 1. Táº¡o áº¥n tÆ°á»£ng ban Ä‘áº§u (First WOW impression) cá»±c ká»³ chuyÃªn nghiá»‡p vÃ  cao cáº¥p cho ngÆ°á»i dÃ¹ng.
 * 2. Che giáº¥u quÃ¡ trÃ¬nh táº£i dá»¯ liá»‡u ban Ä‘áº§u tá»« API hoáº·c khá»Ÿi táº¡o cÃ¡c thÃ nh pháº§n giao diá»‡n phá»©c táº¡p.
 * 3. Äá»“ng bá»™ hoÃ n háº£o cáº£ hai giao diá»‡n Light vÃ  Dark Mode dá»±a trÃªn CSS Variables cá»§a Tailwind v4.
 */
export default function SplashScreen({ isFinished, onExitComplete }: SplashScreenProps) {
    
    // Táº I SAO khÃ³a cuá»™n body vÃ  html?
    // Äá»ƒ ngÄƒn cháº·n hÃ nh vi cuá»™n chuá»™t cá»§a ngÆ°á»i dÃ¹ng lÃ m dá»‹ch chuyá»ƒn giao diá»‡n bÃªn dÆ°á»›i 
    // trong khi Splash Screen Ä‘ang hiá»ƒn thá»‹, giá»¯ cho bá»‘ cá»¥c luÃ´n tÄ©nh láº·ng vÃ  cÃ¢n Ä‘á»‘i.
    useEffect(() => {
        document.body.classList.add("no-scroll");
        document.documentElement.classList.add("no-scroll");
        
        return () => {
            document.body.classList.remove("no-scroll");
            document.documentElement.classList.remove("no-scroll");
        };
    }, []);



    return (
        <AnimatePresence onExitComplete={onExitComplete}>
            {!isFinished && (
                <m.div
                    className="fixed inset-0 z-9999 flex flex-col items-center justify-center overflow-hidden transition-all duration-500"
                    style={{
                        // DÃ¹ng --color-bg vá»›i fallback hardcode Ä‘á»ƒ Ä‘áº£m báº£o render ngay láº­p tá»©c
                        // ngay cáº£ khi Tailwind CSS chÆ°a parse xong á»Ÿ T0
                        backgroundColor: "var(--color-bg, #faf8f5)",
                    }}
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: SPLASH_CONFIG.exitDuration, ease: [0.4, 0, 1, 1] }}
                >
                    {/* 
                      Táº I SAO sá»­ dá»¥ng cÃ¡c Mesh Glow Blobs chuyá»ƒn Ä‘á»™ng cháº­m á»Ÿ background?
                      - Kháº¯c phá»¥c sá»± táº» nháº¡t cá»§a ná»n Ä‘Æ¡n sáº¯c thÃ´ng thÆ°á»ng.
                      - Táº¡o chiá»u sÃ¢u khÃ´ng gian (3D depth) vÃ  cáº£m giÃ¡c "sá»‘ng Ä‘á»™ng" (organic vibe) cao cáº¥p.
                      - Tá»± Ä‘á»™ng thay Ä‘á»•i Ä‘á»™ má» (opacity) vÃ  cÆ°á»ng Ä‘á»™ sÃ¡ng giá»¯a Light Mode vÃ  Dark Mode.
                    */}
                    <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30 dark:opacity-50">
                        {/* Äá»‘m Mesh 1: MÃ u vÃ ng Há»• PhÃ¡ch áº¥m Ã¡p (Amber Glow) */}
                        <m.div
                            className="absolute -top-[10%] -left-[10%] w-[60vw] h-[60vw] rounded-full filter blur-[80px] dark:blur-[120px]"
                            style={{
                                background: "radial-gradient(circle, rgba(217, 119, 6, 0.25) 0%, transparent 70%)"
                            }}
                            animate={{
                                x: [0, 50, -30, 0],
                                y: [0, -40, 30, 0],
                            }}
                            transition={{
                                duration: 12,
                                repeat: Infinity,
                                ease: "easeInOut",
                            }}
                        />
                        {/* Äá»‘m Mesh 2: MÃ u xanh Ngá»c nhiá»‡t Ä‘á»›i (Teal Glow) */}
                        <m.div
                            className="absolute -bottom-[10%] -right-[10%] w-[60vw] h-[60vw] rounded-full filter blur-[80px] dark:blur-[120px]"
                            style={{
                                background: "radial-gradient(circle, rgba(15, 118, 110, 0.2) 0%, transparent 70%)"
                            }}
                            animate={{
                                x: [0, -60, 40, 0],
                                y: [0, 50, -40, 0],
                            }}
                            transition={{
                                duration: 14,
                                repeat: Infinity,
                                ease: "easeInOut",
                            }}
                        />
                    </div>

                    {/* 
                      Logo FastVisa á»Ÿ chÃ­nh giá»¯a vá»›i hoáº¡t áº£nh nhá»‹p thá»Ÿ vÃ  exit transition phÃ³ng to.
                      Táº I SAO tÃ¡ch biá»‡t 2 lá»›p m.div?
                      - Lá»›p ngoÃ i: Äiá»u khiá»ƒn hoáº¡t áº£nh xuáº¥t hiá»‡n (initial) vÃ  biáº¿n máº¥t phÃ³ng to (exit).
                        Äáº·c biá»‡t, ta Ä‘áº·t initial={false} Ä‘á»ƒ trÃ¡nh logo Ä‘á»™ng bá»‹ nhÃ¡y giáº­t 
                        khi chuyá»ƒn tiáº¿p tá»« logo tÄ©nh placeholder sáº¯c nÃ©t Ä‘Ã£ Ä‘Æ°á»£c váº½ tá»« Server.
                      - Lá»›p trong: Äiá»u khiá»ƒn hoáº¡t áº£nh nhá»‹p thá»Ÿ (pulse) liÃªn tá»¥c má»™t cÃ¡ch Ä‘á»™c láº­p,
                        ngÄƒn ngá»«a tuyá»‡t Ä‘á»‘i lá»—i xung Ä‘á»™t hoáº¡t áº£nh vÃ  giáº­t khung hÃ¬nh khi chuyá»ƒn giao.
                    */}
                    <m.div
                        className="relative z-10 flex items-center justify-center w-32 h-32"
                        initial={false}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 1.5, opacity: 0 }}
                        transition={{ duration: SPLASH_CONFIG.exitDuration, ease: [0.4, 0, 1, 1] }}
                    >
                        <m.div
                            className="relative flex items-center justify-center w-full h-full"
                            animate={{
                                scale: [1, 1.04, 0.98, 1.02, 1],
                            }}
                            transition={{
                                duration: 3.5,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                        >
                            {/* Radial Glow - Ãnh hÃ o quang nháº¹ sau logo */}
                            <div className="absolute inset-0 rounded-full bg-amber-500/10 dark:bg-amber-500/15 blur-2xl pointer-events-none" />
                            <FastVisaLogo width={120} height={120} />
                        </m.div>
                    </m.div>

                    {/* 
                      Thanh Progress Indicator tinh táº¿.
                      Cháº¡y tá»« 0% lÃªn 100% trong vÃ²ng 1.2s Ä‘áº§u Ä‘á»ƒ bÃ¡o hiá»‡u tiáº¿n Ä‘á»™ má»™t cÃ¡ch trá»±c quan
                      cho ngÆ°á»i dÃ¹ng, táº¡o cáº£m giÃ¡c há»‡ thá»‘ng Ä‘ang tá»± khá»Ÿi táº¡o nhanh chÃ³ng vÃ  uy tÃ­n.
                    */}
                    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-40 h-[3px] bg-stone-200/50 dark:bg-stone-800/50 rounded-full overflow-hidden">
                        <m.div
                            className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-teal-500"
                            initial={{ width: "0%" }}
                            animate={{ width: "100%" }}
                            transition={{ duration: SPLASH_CONFIG.progressDuration, ease: "easeInOut" }}
                        />
                    </div>
                </m.div>
            )}
        </AnimatePresence>
    );
}

