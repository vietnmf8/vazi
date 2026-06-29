import { useCallback, useEffect, useLayoutEffect, useRef, useState, useMemo } from "react";
import type { ChatMessage as ChatMessageType } from "@/types/api";

export interface UseChatLogicProps {
    messages: ChatMessageType[];
    searchQuery: string;
    showAiTyping: boolean;
    isAdminTyping: boolean;
}

export function useChatLogic({
    messages,
    searchQuery,
    showAiTyping,
    isAdminTyping,
}: UseChatLogicProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    // Sync messages
    const messagesRef = useRef<ChatMessageType[]>(messages);
    useEffect(() => {
        messagesRef.current = messages;
    });

    const thumbRef = useRef<HTMLDivElement>(null);
    const [isScrollable, setIsScrollable] = useState(false);
    const [visibleCount, setVisibleCount] = useState(15);
    const [isLoadingOld, setIsLoadingOld] = useState(false);
    const [unreadBadgeCount, setUnreadBadgeCount] = useState(0);
    const [isAtBottom, setIsAtBottom] = useState(true);

    const isLoadingOldRef = useRef(false);
    const isDragging = useRef(false);
    const dragStartY = useRef(0);
    const dragStartScrollTop = useRef(0);
    const dragHandlersRef = useRef<{ onMove: ((ev: MouseEvent) => void) | null, onUp: (() => void) | null }>({ onMove: null, onUp: null });

    const timeoutIdsRef = useRef<Set<NodeJS.Timeout>>(new Set());
    const safeSetTimeout = useCallback((cb: () => void, ms: number) => {
        const id = setTimeout(() => {
            cb();
            timeoutIdsRef.current.delete(id);
        }, ms);
        timeoutIdsRef.current.add(id);
        return id;
    }, []);

    useEffect(() => {
        return () => {
            if (dragHandlersRef.current.onMove) document.removeEventListener("mousemove", dragHandlersRef.current.onMove);
            if (dragHandlersRef.current.onUp) document.removeEventListener("mouseup", dragHandlersRef.current.onUp);
            timeoutIdsRef.current.forEach(clearTimeout);
            timeoutIdsRef.current.clear();
        };
    }, []);

    const isNearBottom = useCallback(() => {
        const el = scrollRef.current;
        if (!el) return true;
        return Math.abs(el.scrollTop) <= 40;
    }, []);

    const userMessageCount = useMemo(() => messages.filter((m) => m.sender === "USER").length, [messages]);
    const hasUserMessages = userMessageCount > 0;

    const visibleMessages = useMemo(() => messages, [messages]);

    const messageMap = useMemo(() => {
        const map = new Map<string, ChatMessageType>();
        for (const m of messages) map.set(m.id, m);
        return map;
    }, [messages]);

    const activeMessagesList = useMemo(() => {
        return visibleMessages.filter((msg) => !msg.isStreaming);
    }, [visibleMessages]);

    const renderedMessages = useMemo(() => {
        if (searchQuery) {
            return [...activeMessagesList].reverse();
        }
        return [...activeMessagesList.slice(-visibleCount)].reverse();
    }, [activeMessagesList, visibleCount, searchQuery]);

    const [knownIds, setKnownIds] = useState(() => new Set(messages.map((m) => m.id)));

    const prevActiveCountRef = useRef(0);
    useEffect(() => {
        const currentCount = activeMessagesList.length;
        const prevCount = prevActiveCountRef.current;
        prevActiveCountRef.current = currentCount;

        if (currentCount <= prevCount) return;

        const el = scrollRef.current;
        if (!el) return;

        const lastMsg = activeMessagesList[activeMessagesList.length - 1];
        if (!lastMsg) return;

        if (lastMsg.sender === "USER") {
            safeSetTimeout(() => {
                const scrollEl = scrollRef.current;
                if (scrollEl) {
                    scrollEl.scrollTo({ top: 0, behavior: "smooth" });
                }
            }, 10);
            safeSetTimeout(() => {
                setUnreadBadgeCount(0);
            }, 0);
        } else if (isNearBottom()) {
            el.scrollTop = 0;
            safeSetTimeout(() => {
                setIsAtBottom(true);
            }, 0);
        } else {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setUnreadBadgeCount((c) => c + 1);
        }
    }, [activeMessagesList, isNearBottom]);

    useEffect(() => {
        if ((showAiTyping || isAdminTyping) && isNearBottom()) {
            const el = scrollRef.current;
            if (el) el.scrollTop = 0;
        }
    }, [showAiTyping, isAdminTyping, isNearBottom]);

    const handleImageLoad = useCallback(() => {
        if (isNearBottom() && scrollRef.current) {
            scrollRef.current.scrollTop = 0;
        }
    }, [isNearBottom]);

    const updateThumb = useCallback(() => {
        const el = scrollRef.current;
        if (!el) return;
        const { scrollTop, scrollHeight, clientHeight } = el;
        const scrollable = scrollHeight > clientHeight;
        setIsScrollable(scrollable);
        if (!scrollable) return;
        const INSET = 4;
        const trackHeight = clientHeight - INSET * 2;
        const h = Math.max(32, (clientHeight / scrollHeight) * trackHeight);
        const maxTravel = trackHeight - h;
        const maxScroll = scrollHeight - clientHeight;
        const normalizedScroll = Math.abs(scrollTop);
        
        if (thumbRef.current) {
            thumbRef.current.style.height = `${h}px`;
            thumbRef.current.style.transform = `translateY(${
                INSET +
                (maxScroll > 0
                    ? ((maxScroll - normalizedScroll) / maxScroll) * maxTravel
                    : maxTravel)
            }px)`;
        }
    }, []);

    const visibleCountRef = useRef(visibleCount);
    const activeListLengthRef = useRef(activeMessagesList.length);
    useLayoutEffect(() => {
        visibleCountRef.current = visibleCount;
        activeListLengthRef.current = activeMessagesList.length;
    });

    const handleScroll = useCallback(() => {
        const el = scrollRef.current;
        if (!el) return;

        if (isNearBottom()) {
            setUnreadBadgeCount((prev) => (prev > 0 ? 0 : prev));
        }

        const normalizedScroll = Math.abs(el.scrollTop);
        const distanceFromTop =
            el.scrollHeight - el.clientHeight - normalizedScroll;

        if (
            distanceFromTop < 20 &&
            visibleCountRef.current < activeListLengthRef.current &&
            !isLoadingOldRef.current
        ) {
            isLoadingOldRef.current = true;
            setIsLoadingOld(true);

            safeSetTimeout(() => {
                setVisibleCount((prev) => prev + 15);
                isLoadingOldRef.current = false;
                setIsLoadingOld(false);
            }, 500);
        }
    }, [isNearBottom]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setKnownIds((prev) => {
            let changed = false;
            const next = new Set(prev);
            for (const msg of renderedMessages) {
                if (!next.has(msg.id)) {
                    next.add(msg.id);
                    changed = true;
                }
            }
            return changed ? next : prev;
        });
    }, [renderedMessages]);

    const prevMessagesCountRef = useRef(messages.length);
    useEffect(() => {
        if (messages.length > prevMessagesCountRef.current) {
            const added = messages.length - prevMessagesCountRef.current;
            setVisibleCount((prev) => prev + added);
        }
        prevMessagesCountRef.current = messages.length;
    }, [messages.length]);

    useEffect(() => {
        const scrollEl = scrollRef.current;
        if (!scrollEl) return;

        let ticking = false;

        const onScrollHandler = () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    updateThumb();
                    handleScroll();
                    setIsAtBottom(isNearBottom());
                    ticking = false;
                });
                ticking = true;
            }
        };
        scrollEl.addEventListener("scroll", onScrollHandler, { passive: true });

        const containerObserver = new ResizeObserver(updateThumb);
        containerObserver.observe(scrollEl);

        updateThumb();

        return () => {
            scrollEl.removeEventListener("scroll", onScrollHandler);
            containerObserver.disconnect();
        };
    }, [updateThumb, handleScroll, isNearBottom]);

    const handleThumbMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        isDragging.current = true;
        dragStartY.current = e.clientY;
        dragStartScrollTop.current = scrollRef.current?.scrollTop ?? 0;

        const onMove = (ev: MouseEvent) => {
            if (!isDragging.current || !scrollRef.current) return;
            const el = scrollRef.current;
            const { scrollHeight, clientHeight } = el;
            const INSET = 4;
            const trackHeight = clientHeight - INSET * 2;
            const h = Math.max(32, (clientHeight / scrollHeight) * trackHeight);
            const maxTravel = trackHeight - h;
            const maxScroll = scrollHeight - clientHeight;
            const ratio = maxTravel > 0 ? maxScroll / maxTravel : 0;

            const dy = ev.clientY - dragStartY.current;
            const dragStartNormalized = Math.abs(dragStartScrollTop.current);
            const newNormalized = dragStartNormalized - (dy * ratio);
            const clampedNormalized = Math.max(0, Math.min(maxScroll, newNormalized));

            el.scrollTop = -clampedNormalized;
        };

        const onUp = () => {
            isDragging.current = false;
            document.removeEventListener("mousemove", onMove);
            document.removeEventListener("mouseup", onUp);
            dragHandlersRef.current.onMove = null;
            dragHandlersRef.current.onUp = null;
        };

        dragHandlersRef.current.onMove = onMove;
        dragHandlersRef.current.onUp = onUp;
        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
    }, []);

    const scrollToBottom = useCallback(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
        }
        setUnreadBadgeCount(0);
    }, []);

    return {
        scrollRef,
        thumbRef,
        isScrollable,
        isLoadingOld,
        unreadBadgeCount,
        isAtBottom,
        hasUserMessages,
        userMessageCount,
        visibleMessages,
        messageMap,
        activeMessagesList,
        renderedMessages,
        knownIds,
        handleImageLoad,
        handleThumbMouseDown,
        scrollToBottom,
        setUnreadBadgeCount,
    };
}
