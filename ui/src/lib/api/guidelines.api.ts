import { getLocale } from "next-intl/server";
import { API_V1_URL } from "@/lib/api-base-url";

const API_BASE_URL = API_V1_URL;

export interface HowToApplyData {
  steps: Array<{
    step: number;
    title: string;
    description: string;
  }>;
  documents: Array<{
    id: string;
    title: string;
    description: string;
    imageUrl?: string | null;
  }>;
  tips: Array<{
    question: string;
    answer: string;
  }>;
}

/**
 * Fetch cấu hình quy trình nộp hồ sơ, tài liệu bắt buộc và tips từ DB.
 * Sử dụng cơ chế fetch-cache của Next.js kết hợp i18n locale.
 * 
 * WHY: Tách biệt logic gọi API trên máy chủ, tối ưu hoá bộ nhớ cache với tag và hỗ trợ locale động.
 */
export async function getHowToApplyGuideline(): Promise<HowToApplyData> {
  const locale = await getLocale();
  const url = new URL(`${API_BASE_URL}/guidelines/how-to-apply`);
  url.searchParams.append("locale", locale);

  const res = await fetch(url.toString(), {
    next: { tags: ["guidelines"], revalidate: 3600 },
  });
  if (!res.ok) {
    console.error(`Failed to fetch guidelines: ${res.status} ${res.statusText}`);
    throw new Error("Failed to fetch guidelines");
  }
  const data = await res.json();
  return data.data;
}
