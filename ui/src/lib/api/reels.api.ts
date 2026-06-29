import { API_BASE_URL } from "@/lib/api-base-url";
import { ReelGroup } from "@/types/reel";

const API_URL = API_BASE_URL;

export async function fetchReels(): Promise<ReelGroup[]> {
    try {
        const res = await fetch(`${API_URL}/api/v1/reels`, {
            cache: "no-store", // Tạm thời dùng no-store, nếu có cache cần revalidate hợp lý
        });
        
        if (!res.ok) {
            console.error("Failed to fetch reels");
            return [];
        }
        
        const json = await res.json();
        return json.data || [];
    } catch (error: any) {
        if (error?.digest === 'HANGING_PROMISE_REJECTION' || error?.digest?.includes('DYNAMIC_SERVER_USAGE') || error?.message?.includes('prerendering')) {
            throw error; // Let Next.js handle its internal PPR/dynamic rendering errors
        }
        if (error.name === "AbortError" || error.message?.includes("abort")) {
            return [];
        }
        console.error("Error fetching reels:", error);
        return [];
    }
}

export async function reactToReel(reelId: string, emoji: string): Promise<boolean> {
    try {
        const guestId = sessionStorage.getItem("fastvisa_guest_id") || "guest_" + Date.now();
        sessionStorage.setItem("fastvisa_guest_id", guestId);

        const res = await fetch(`${API_URL}/api/v1/reels/${reelId}/reactions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ emoji, guestId }),
        });

        return res.ok;
    } catch (error) {
        console.error("Error reacting to reel:", error);
        return false;
    }
}
