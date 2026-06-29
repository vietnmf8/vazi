import { cacheTag } from "next/cache";
import { API_V1_URL } from "@/lib/api-base-url";

const API_BASE_URL = API_V1_URL;

// Hàm helper nội bộ — KHÔNG có "use cache" ở đây,
// mỗi hàm export bên dưới sẽ tự định nghĩa tag riêng.
async function fetchHomeEndpoint(endpoint: string, locale: string): Promise<any> {
    const url = new URL(`${API_BASE_URL}/home${endpoint}`);
    url.searchParams.append("locale", locale);
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`Failed to fetch ${endpoint}`);
    const data = await res.json();
    return data.data;
}

export interface Nationality {
    id: string;
    name: string;
    code: string;
    is_eligible_evisa: boolean;
    exemption_days: number;
    group: string;
}

/** Cache tag: "nationalities" — chỉ invalidate khi Admin cập nhật quốc tịch */
export async function getNationalities(locale: string): Promise<any[]> {
    "use cache";
    cacheTag("core-visa", "nationalities");
    const url = new URL(`${API_BASE_URL}/nationalities`);
    url.searchParams.append("locale", locale);


    const res = await fetch(url.toString());
    if (!res.ok) return [];
    const json = await res.json();
    return json.data || json.items || [];
}

/** Cache tag: "how-it-works" — chỉ invalidate khi Admin cập nhật bước hướng dẫn */
export async function getHowItWorks(locale: string): Promise<any[]> {
    "use cache";
    cacheTag("how-it-works");
    return fetchHomeEndpoint("/how-it-works", locale);
}

/** Cache tag: "pricing-preview" — chỉ invalidate khi Admin cập nhật bảng giá */
export async function getPricingPreview(locale: string): Promise<any[]> {
    "use cache";
    cacheTag("pricing-preview");
    return fetchHomeEndpoint("/pricing-preview", locale);
}

/** Cache tag: "testimonials" — chỉ invalidate khi Admin cập nhật đánh giá */
export async function getTestimonials(locale: string): Promise<any[]> {
    "use cache";
    cacheTag("testimonials");
    return fetchHomeEndpoint("/testimonials", locale);
}

/** Cache tag: "home-config" — chỉ invalidate khi Admin cập nhật cấu hình trang chủ */
export async function getHomeConfig(locale: string): Promise<any> {
    "use cache";
    cacheTag("home-config");
    return fetchHomeEndpoint("/config", locale);
}
