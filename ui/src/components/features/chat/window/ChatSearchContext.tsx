"use client";

import { createContext, useContext } from "react";

export interface ChatSearchContextValue {
    currentMatchIndex: number;
    scrollBehavior: "smooth" | "auto";
}

export const ChatSearchContext = createContext<ChatSearchContextValue>({
    currentMatchIndex: -1,
    scrollBehavior: "smooth",
});

export function useChatSearchContext() {
    return useContext(ChatSearchContext);
}
