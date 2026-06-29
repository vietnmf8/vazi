import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));

import { NextRequest } from "next/server";
import { POST } from "@/app/api/revalidate/route";
import { calculatePrice } from "@/app/apply/_components/priceCalculator";

function makeRevalidateRequest(body: any): NextRequest {
    const secretStr = body.secret ? `?secret=${body.secret}` : '';
    return new NextRequest(`http://localhost/api/revalidate${secretStr}`, {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
    });
}

describe("Smoke: /api/revalidate", () => {
    beforeEach(() => {
        process.env.REVALIDATE_SECRET = "test-secret";
    });

    it("returns 200 with revalidated:true when secret matches", async () => {
        const req = makeRevalidateRequest({ tag: "faqs", secret: "test-secret" });
        const res = await POST(req);
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.revalidated).toBe(true);
        expect(json.tag).toBe("faqs");
    });

    it("returns 401 when secret is wrong", async () => {
        const req = makeRevalidateRequest({ tag: "faqs", secret: "wrong-secret" });
        const res = await POST(req);
        expect(res.status).toBe(401);
    });

    it("returns 400 when tag is missing", async () => {
        const req = makeRevalidateRequest({ secret: "test-secret" });
        const res = await POST(req);
        expect(res.status).toBe(400);
    });
});

describe("Smoke: calculatePrice with DEFAULT fallback", () => {
    it("returns correct total for single applicant normal processing", () => {
        const result = calculatePrice({
            visa_category: "evisa_30d_single",
            processing_time: "normal_7d",
            applicant_count: 1,
            vip_fast_track: false,
        });
        expect(result.baseFee).toBe(55);
        expect(result.processingSurcharge).toBe(0);
        expect(result.total).toBe(55);
    });

    it("returns correct total for 2 applicants", () => {
        const result = calculatePrice({
            visa_category: "evisa_30d_single",
            processing_time: "normal_7d",
            applicant_count: 2,
            vip_fast_track: false,
        });
        expect(result.total).toBe(110);
        expect(result.applicantCount).toBe(2);
    });

    it("adds processing surcharge for urgent_4d", () => {
        const result = calculatePrice({
            visa_category: "evisa_30d_single",
            processing_time: "urgent_4d",
            applicant_count: 1,
            vip_fast_track: false,
        });
        expect(result.processingSurcharge).toBe(35);
        expect(result.total).toBe(90); // 55 + 35
    });

    it("adds VIP fee when vip_fast_track is true", () => {
        const result = calculatePrice({
            visa_category: "evisa_30d_single",
            processing_time: "normal_7d",
            applicant_count: 1,
            vip_fast_track: true,
        });
        expect(result.vipPerPerson).toBe(55);
        expect(result.total).toBe(110); // 55 base + 55 vip
    });
});
