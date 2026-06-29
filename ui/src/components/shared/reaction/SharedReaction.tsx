"use client";

import React, { useEffect, useRef, useState } from "react";

export const REACTION_ICONS = [
    { id: "👍", emoji: "👍", alt: "Like" },
    { id: "❤️", emoji: "❤️", alt: "Love" },
    { id: "😂", emoji: "😂", alt: "Haha" },
    { id: "😮", emoji: "😮", alt: "Wow" },
    { id: "😢", emoji: "😢", alt: "Sad" },
    { id: "😡", emoji: "😡", alt: "Angry" }
];

export const REACTION_CONFIG = {
    MAX_SCALE: 2.5,
    RANGE: 150,
    BASE_WIDTH: 36,
    GAP: 4,
    PADDING: 6,
};

interface SharedReactionProps {
    onSelect: (emoji: string) => void;
}

const getUniqueId = () => {
    return Date.now().toString() + Math.random().toString(36).substring(2);
};

export function SharedReaction({ onSelect }: SharedReactionProps) {
    const [flyingIcons, setFlyingIcons] = useState<{ id: string, emoji: string, startX: number }[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);
    const bgRef = useRef<HTMLDivElement>(null);
    const iconsRef = useRef<(HTMLButtonElement | null)[]>([]);

    const handleSelect = (e: React.MouseEvent<HTMLButtonElement>, icon: any) => {
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        const containerRect = containerRef.current?.getBoundingClientRect();
        const startX = rect.left - (containerRect?.left || 0) + rect.width / 2;
        
        const newId = getUniqueId();
        setFlyingIcons(prev => [...prev, { id: newId, emoji: icon.emoji, startX }]);
        setTimeout(() => {
            setFlyingIcons(prev => prev.filter(f => f.id !== newId));
        }, 1000);
        
        onSelect(icon.id);
    };

    useEffect(() => {
        const container = containerRef.current;
        const bg = bgRef.current;
        const icons = iconsRef.current.filter(Boolean) as HTMLButtonElement[];

        if (!container || !bg || icons.length === 0) return;

        const { MAX_SCALE, RANGE, BASE_WIDTH, GAP, PADDING } = REACTION_CONFIG;

        const handleMouseMove = (e: MouseEvent) => {
            const rect = container.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;

            const scales: number[] = [];
            const extraWidths: number[] = [];

            icons.forEach((_, i) => {
                const iconCenterX = PADDING + (i * (BASE_WIDTH + GAP)) + (BASE_WIDTH / 2);
                const distance = Math.abs(mouseX - iconCenterX);

                let scale = 1;
                if (distance < RANGE) {
                    const progress = 1 - (distance / RANGE);
                    scale = 1 + (MAX_SCALE - 1) * Math.pow(progress, 2);
                }

                scales.push(scale);
                extraWidths.push(BASE_WIDTH * (scale - 1));
            });

            icons.forEach((icon, i) => {
                let translateX = 0;
                for (let j = 0; j < i; j++) {
                    translateX += extraWidths[j] / 2;
                }
                for (let j = i + 1; j < icons.length; j++) {
                    translateX -= extraWidths[j] / 2;
                }
                icon.style.transform = `translateX(${translateX}px) scale(${scales[i]})`;
            });

            const totalExtraWidth = extraWidths.reduce((sum, width) => sum + width, 0);
            bg.style.inset = `0px -${totalExtraWidth / 2}px`;
        };

        const handleMouseLeave = () => {
            icons.forEach(icon => {
                icon.style.transform = "translateX(0px) scale(1)";
            });
            bg.style.inset = "0px 0px";
        };

        container.addEventListener("mousemove", handleMouseMove);
        container.addEventListener("mouseleave", handleMouseLeave);

        return () => {
            container.removeEventListener("mousemove", handleMouseMove);
            container.removeEventListener("mouseleave", handleMouseLeave);
        };
    }, []);

    return (
        <div ref={containerRef} className="relative inline-block">
            {flyingIcons.map(f => (
                <div 
                    key={f.id} 
                    className="absolute pointer-events-none flex items-center justify-center text-3xl drop-shadow-lg z-50 animate-reaction-fly"
                    style={{ 
                        left: f.startX, 
                        bottom: '20px', 
                    }} 
                >
                    {f.emoji}
                </div>
            ))}
            {/* Background layer */}
            <div
                ref={bgRef}
                className="absolute inset-0 bg-white/90 dark:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-700 backdrop-blur-md rounded-full shadow-lg z-0 transition-[inset] duration-150 ease-out"
            />
            
            {/* Icons layer */}
            <ul className="relative z-10 flex m-0 list-none items-end p-1.5" style={{ gap: `${REACTION_CONFIG.GAP}px` }}>
                {REACTION_ICONS.map((icon, index) => (
                    <li key={icon.id}>
                        <button
                            ref={(el) => {
                                iconsRef.current[index] = el;
                            }}
                            type="button"
                            onClick={(e) => handleSelect(e, icon)}
                            className="flex size-9 items-center justify-center rounded-full bg-transparent border-none outline-none transition-transform duration-150 ease-out origin-bottom will-change-transform hover:z-20"
                            aria-label={`React with ${icon.alt}`}
                        >
                            <span className="text-3xl leading-none drop-shadow-md select-none">{icon.emoji}</span>
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
}
