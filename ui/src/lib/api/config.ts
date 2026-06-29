import { API_BASE_URL } from "@/lib/api-base-url";

const API_URL = API_BASE_URL;

export interface PortEntry {
    id: string;
    code: string;
    name: string;
    isActive: boolean;
    portType: "AIRPORT" | "BORDER_GATE";
}

export interface EligibilityRuleData {
    status: string;
    stay: string;
    fee: string;
    processing: string;
    requirements: Record<string, any>;
    note: string | null;
}

export async function getPorts(): Promise<PortEntry[]> {
    try {
        const res = await fetch(`${API_URL}/api/v1/config/ports`, {
            next: { tags: ["rules_config"], revalidate: 86400 },
        });
        if (!res.ok) return [];
        const data = await res.json();
        return data.data || [];
    } catch (error) {
        console.error("Error fetching ports:", error);
        return [];
    }
}

export async function getEligibilityRules(locale: string): Promise<Record<string, EligibilityRuleData>> {
    try {
        const res = await fetch(`${API_URL}/api/v1/config/eligibility-rules?locale=${locale}`, {
            next: { tags: ["rules_config"], revalidate: 86400 },
        });
        if (!res.ok) return {};
        const data = await res.json();
        return data.data || {};
    } catch (error) {
        console.error("Error fetching eligibility rules:", error);
        return {};
    }
}
