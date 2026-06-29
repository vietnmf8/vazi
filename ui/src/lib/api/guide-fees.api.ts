import { API_BASE_URL } from "@/lib/api-base-url";

const API_URL = API_BASE_URL;

export async function getGuideFeesSettings() {
    try {
        const res = await fetch(`${API_URL}/api/v1/settings/guide-fees`, {
            next: { tags: ["guide-fees"], revalidate: 3600 },
        });
        if (!res.ok) return null;
        const data = await res.json();
        return data.data;
    } catch (error) {
        console.error("Error fetching guide fees settings:", error);
        return null;
    }
}
