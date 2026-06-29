"use client";

import React, { createContext, useContext } from "react";

interface AppLoadingContextType {
    registerHold: () => () => void;
}

export const AppLoadingContext = createContext<AppLoadingContextType | null>(null);

export function useAppLoading() {
    const context = useContext(AppLoadingContext);
    if (!context) {
        throw new Error("useAppLoading must be used within an AppLoadingContainer");
    }
    return context;
}
