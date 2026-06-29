"use client";

import { useEffect } from "react";
import { useAppLoading } from "../providers/AppLoadingContext";

export function SplashHold() {
    const { registerHold } = useAppLoading();
    
    useEffect(() => {
        const release = registerHold();
        return () => release();
    }, [registerHold]);
    
    return null;
}
