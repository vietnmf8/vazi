import request from "supertest";
import app from "@/app";

describe("Smoke: Health", () => {
    it("GET /api/v1/health returns ok", async () => {
        const res = await request(app).get("/api/v1/health");
        expect(res.status).toBe(200);
        expect(res.body.data?.status).toBe("ok");
    });
});

describe("Smoke: Pricing", () => {
    it("GET /api/v1/pricing/calculator-config returns 200", async () => {
        const res = await request(app).get("/api/v1/pricing/calculator-config");
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty("BASE_FEES");
    });
});

describe("Smoke: FAQs", () => {
    it("GET /api/v1/faqs?locale=vi returns non-empty array", async () => {
        const res = await request(app).get("/api/v1/faqs?locale=vi");
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect((res.body.data as unknown[]).length).toBeGreaterThan(0);
    });

    it("PUT /api/v1/faqs/:id is removed (404)", async () => {
        const res = await request(app)
            .put("/api/v1/faqs/nonexistent-id")
            .send({ question: "test" });
        expect(res.status).toBe(404);
    });
});

describe("Smoke: Guidelines", () => {
    it("GET /api/v1/guidelines/how-to-apply returns 200", async () => {
        const res = await request(app).get("/api/v1/guidelines/how-to-apply");
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    it("PUT /api/v1/guidelines/:id is removed (404)", async () => {
        const res = await request(app)
            .put("/api/v1/guidelines/nonexistent-id")
            .send({ title: "test" });
        expect(res.status).toBe(404);
    });
});

describe("Smoke: Exemptions", () => {
    it("GET /api/v1/exemptions/us returns 200 with country_code field", async () => {
        const res = await request(app).get("/api/v1/exemptions/us");
        expect(res.status).toBe(200);
        expect(res.body.data).toHaveProperty("country_code");
    });
});

describe("Smoke: Articles", () => {
    it("GET /api/v1/articles/extra-services returns 200", async () => {
        const res = await request(app).get("/api/v1/articles/extra-services");
        expect(res.status).toBe(200);
    });

    it("PUT /api/v1/articles/:id is removed (404)", async () => {
        const res = await request(app)
            .put("/api/v1/articles/nonexistent-id")
            .send({ title: "test" });
        expect(res.status).toBe(404);
    });
});

describe("Smoke: Home how-it-works", () => {
    it("GET /api/v1/home/how-it-works returns 200", async () => {
        const res = await request(app).get("/api/v1/home/how-it-works");
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
    });

    it("PUT /api/v1/home/how-it-works/:id is removed (404)", async () => {
        const res = await request(app)
            .put("/api/v1/home/how-it-works/nonexistent-id")
            .send({ icon: "Star" });
        expect(res.status).toBe(404);
    });
});

describe("Smoke: Settings", () => {
    it("GET /api/v1/settings returns 200 with settings map", async () => {
        const res = await request(app).get("/api/v1/settings");
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(typeof res.body.data).toBe("object");
    });

    it("PUT /api/v1/settings/:key is removed (404)", async () => {
        const res = await request(app)
            .put("/api/v1/settings/SITE_HOTLINE")
            .send({ value: "+84 000 000 000" });
        expect(res.status).toBe(404);
    });
});
