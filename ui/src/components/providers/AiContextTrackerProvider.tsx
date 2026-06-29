"use client";

import { useAiContextTracker } from "@/hooks/useAiContextTracker";

import { useEffect } from "react";
import { API_BASE_URL } from "@/lib/api-base-url";

export function AiContextTrackerProvider() {
    useAiContextTracker();

    useEffect(() => {
        // Ping guest session once per page load to keep it alive
        const guestId = sessionStorage.getItem("fastvisa_guest_id");
        if (guestId) {
            fetch(`${API_BASE_URL}/api/v1/guest/ping`, {
                method: "POST",
                headers: {
                    "x-guest-id": guestId
                }
            }).catch(() => {});
        }
    }, []);

    return null;
}
