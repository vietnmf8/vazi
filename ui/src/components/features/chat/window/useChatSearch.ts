import { useState, useEffect } from "react";
import type { ChatMessage as ChatMessageType } from "@/types/api";

export function useChatSearch(messages: ChatMessageType[]) {
    const [searchQuery, setSearchQuery] = useState("");
    const [showSearch, setShowSearch] = useState(false);
    
    const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);
    const [scrollBehavior, setScrollBehavior] = useState<"smooth" | "auto">("smooth");
    const [totalMatches, setTotalMatches] = useState(0);

    useEffect(() => {
        if (!searchQuery) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setTotalMatches(0);
            return;
        }

        const timer = setTimeout(() => {
            const rawElements = Array.from(document.querySelectorAll('.search-match-span')) as HTMLElement[];
            
            const elements = rawElements.sort((a, b) => {
                return a.getBoundingClientRect().top - b.getBoundingClientRect().top;
            });

            setTotalMatches(elements.length);

            elements.forEach((el, idx) => {
                const isUser = el.getAttribute('data-is-user') === 'true';
                
                if (idx === currentMatchIndex) {
                    el.style.backgroundColor = isUser ? 'white' : '#fde047';
                    el.style.color = isUser ? 'black' : '#1e293b';
                    el.classList.add('z-10', 'relative', 'font-medium', 'shadow-[0_4px_12px_rgba(0,0,0,0.1)]');
                    
                    const container = el.closest('[role="log"]') || el.closest('.overflow-y-auto');
                    if (container) {
                        const elRect = el.getBoundingClientRect();
                        const containerRect = container.getBoundingClientRect();
                        const currentScroll = container.scrollTop;
                        
                        const topLimit = containerRect.top + 60; 
                        const bottomLimit = containerRect.bottom - 10;
                        const isVisible = elRect.top >= topLimit && elRect.bottom <= bottomLimit;
                        
                        if (!isVisible) {
                            const absoluteElTop = currentScroll + (elRect.top - containerRect.top);
                            const targetScroll = absoluteElTop - (containerRect.height / 2) + 30;
                            
                            container.scrollTo({
                                top: targetScroll,
                                behavior: scrollBehavior,
                            });
                        }
                    }
                } else {
                    el.style.backgroundColor = 'transparent';
                    el.style.color = 'inherit';
                    el.classList.remove('z-10', 'relative', 'font-medium', 'shadow-[0_4px_12px_rgba(0,0,0,0.1)]');
                }
            });
        }, 50);

        return () => clearTimeout(timer);
    }, [searchQuery, messages, currentMatchIndex, scrollBehavior]);

    useEffect(() => {
        if (totalMatches > 0) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setCurrentMatchIndex(0);
        } else {
            setCurrentMatchIndex(-1);
        }
    }, [searchQuery, totalMatches]);

    const handleNextMatch = (smooth: boolean) => {
        if (totalMatches === 0) return;
        setScrollBehavior(smooth ? "smooth" : "auto");
        setCurrentMatchIndex((prev) => (prev + 1) % totalMatches);
    };

    const handlePrevMatch = (smooth: boolean) => {
        if (totalMatches === 0) return;
        setScrollBehavior(smooth ? "smooth" : "auto");
        setCurrentMatchIndex((prev) => (prev - 1 + totalMatches) % totalMatches);
    };

    const handleCloseSearch = () => {
        setShowSearch(false);
        setSearchQuery("");
        setCurrentMatchIndex(-1);
    };

    return {
        searchQuery,
        setSearchQuery,
        showSearch,
        setShowSearch,
        currentMatchIndex,
        totalMatches,
        handleNextMatch,
        handlePrevMatch,
        handleCloseSearch,
    };
}
