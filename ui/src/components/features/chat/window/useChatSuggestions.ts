import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { ChatMessage as ChatMessageType, ChatWidgetPhase } from "@/types/api";

interface UseChatSuggestionsProps {
    phase: ChatWidgetPhase;
    messages: ChatMessageType[];
    isAiTyping: boolean;
    isSending: boolean;
    sessionId: string | null;
    searchQuery: string;
    chatInputHeight: number;
}

export function useChatSuggestions({
    phase,
    messages,
    isAiTyping,
    isSending,
    sessionId,
    searchQuery,
    chatInputHeight,
}: UseChatSuggestionsProps) {
    const [isReadyToShowSuggestions, setIsReadyToShowSuggestions] = useState(false);
    const [isSuggestionsTrayDismissed, setIsSuggestionsTrayDismissed] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [hasNewSuggestionsDot, setHasNewSuggestionsDot] = useState(false);
    const [activeSuggestions, setActiveSuggestions] = useState<string[]>([]);
    const t = useTranslations("Chat");

    const prevSuggestionsRef = useRef<string[]>([]);

    // Delay showing suggestions on mount
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsReadyToShowSuggestions(true);
        }, 500);
        return () => clearTimeout(timer);
    }, []);

    const lastAiSuggestions = useMemo(() => {
        if (phase !== "CHATTING") return [];
        let lastAi: ChatMessageType | undefined;
        let aiCount = 0;
        for (let i = messages.length - 1; i >= 0; i--) {
            if (messages[i].sender === "AI") {
                if (!lastAi) lastAi = messages[i];
                aiCount++;
            }
        }
        let suggestions = lastAi?.suggestions ?? [];

        // Trích xuất mảng gợi ý từ nội dung tin nhắn nếu có (do AI stream trả về)
        if (lastAi?.message && suggestions.length === 0) {
            const match = lastAi.message.match(/<!--suggestions:(\[.*?\])-->/);
            if (match && match[1]) {
                try {
                    suggestions = JSON.parse(match[1]);
                } catch (e) {
                    // ignore
                }
            }
        }

        const userCount = messages.filter((m) => m.sender === "USER").length;

        // Nếu là tin nhắn đầu tiên từ AI và USER chưa gửi gì, ta ép kiểu sang đa ngôn ngữ
        // NHƯNG CHỈ KHI AI không trả về suggestions. Nếu AI trả về suggestions (đã được cá nhân hoá theo Nationality), thì ưu tiên AI.
        if (userCount === 0 && suggestions.length === 0) {
            return [t("suggestion_1"), t("suggestion_2"), t("suggestion_3")];
        }

        return suggestions;
    }, [messages, phase, t]);

    useEffect(() => {
        if (isAiTyping || isSending) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setActiveSuggestions([]);
        } else {
            const timer = setTimeout(() => {
                setActiveSuggestions(lastAiSuggestions);
            }, 350);
            return () => clearTimeout(timer);
        }
    }, [lastAiSuggestions, isAiTyping, isSending]);

    useEffect(() => {
        prevSuggestionsRef.current = [];
    }, [sessionId]);

    useEffect(() => {
        const prevSuggestions = prevSuggestionsRef.current;
        const suggestionsChanged =
            activeSuggestions.length !== prevSuggestions.length ||
            activeSuggestions.some((s, i) => s !== prevSuggestions[i]);

        if (!suggestionsChanged) return;

        prevSuggestionsRef.current = activeSuggestions;
        setIsSuggestionsTrayDismissed(false);

        if (typeof window !== "undefined" && sessionId) {
            try {
                const raw = sessionStorage.getItem("fastvisa_chat_auto_opened_suggestions");
                const openedSessions: string[] = raw ? JSON.parse(raw) : [];

                if (!openedSessions.includes(sessionId)) {
                    // eslint-disable-next-line react-hooks/set-state-in-effect
                    setShowSuggestions(activeSuggestions.length > 0);
                    setHasNewSuggestionsDot(false);

                    if (activeSuggestions.length > 0) {
                        openedSessions.push(sessionId);
                        sessionStorage.setItem(
                            "fastvisa_chat_auto_opened_suggestions",
                            JSON.stringify(openedSessions),
                        );
                    }
                } else {
                    setShowSuggestions(false);
                    if (activeSuggestions.length > 0) {
                        setHasNewSuggestionsDot(true);
                    }
                }
            } catch (_) {
                sessionStorage.removeItem("fastvisa_chat_auto_opened_suggestions");
                setShowSuggestions(activeSuggestions.length > 0);
            }
        } else {
            setShowSuggestions(activeSuggestions.length > 0);
        }
    }, [activeSuggestions, sessionId]);

    const isSuggestionsVisible =
        isReadyToShowSuggestions &&
        chatInputHeight > 0 &&
        activeSuggestions.length > 0 &&
        !searchQuery &&
        !isSuggestionsTrayDismissed;

    return {
        activeSuggestions,
        isSuggestionsVisible,
        showSuggestions,
        setShowSuggestions,
        hasNewSuggestionsDot,
        setHasNewSuggestionsDot,
        setIsSuggestionsTrayDismissed,
    };
}
