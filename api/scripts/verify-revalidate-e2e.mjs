/**
 * E2E verify On-Demand ISR: API admin CRUD → revalidateCache → UI POST /api/revalidate.
 *
 * Yêu cầu: API :5000 + UI :3000 đang chạy; REVALIDATE_SECRET trùng api/.env ↔ ui/.env.local
 *
 * Usage: npm run verify:revalidate-e2e
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const API_ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const UI_ROOT = path.join(API_ROOT, "..", "ui");

dotenv.config({ path: path.join(API_ROOT, ".env") });

function loadUiSecret() {
    for (const name of [".env.local", ".env"]) {
        const file = path.join(UI_ROOT, name);
        if (!fs.existsSync(file)) continue;
        const parsed = dotenv.parse(fs.readFileSync(file));
        if (parsed.REVALIDATE_SECRET) return parsed.REVALIDATE_SECRET;
    }
    return "";
}

const API_BASE = (process.env.API_URL ?? process.env.VERIFY_API_URL ?? "http://127.0.0.1:5000").replace(
    /\/$/,
    "",
);
const UI_BASE = (process.env.UI_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const API_SECRET = (process.env.REVALIDATE_SECRET ?? "").trim();
const UI_SECRET = loadUiSecret().trim();
const ADMIN_EMAIL = (process.env.ALLOWED_ADMIN_EMAIL ?? "vietnmf8@fullstack.edu.vn")
    .trim()
    .toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_SEED_PASSWORD ?? "Viet251001";
const REVALIDATE_WAIT_MS = 2500;

/** ISR tags mà @ui đăng ký — webhook phải accept tất cả */
const ISR_TAGS = [
    "faqs",
    "footer",
    "home-data",
    "about-us",
    "reviews",
    "guidelines",
    "articles",
    "rules_config",
    "nationalities",
    "exemption-countries",
    "emergency-inquiry",
    "guide-fees",
];

const results = [];

function record(name, pass, detail = "") {
    results.push({ name, pass, detail });
    console.log(pass ? `✓ ${name}` : `✗ ${name}${detail ? ` — ${detail}` : ""}`);
}

async function adminFetch(pathname, { method = "GET", token, body } = {}) {
    const headers = { Accept: "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (body !== undefined) headers["Content-Type"] = "application/json";

    const res = await fetch(`${API_BASE}/api/v1${pathname}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    let json = null;
    const text = await res.text();
    try {
        json = text ? JSON.parse(text) : null;
    } catch {
        json = { raw: text };
    }
    return { res, json };
}

function listItems(json) {
    if (!json) return [];
    if (Array.isArray(json.data)) return json.data;
    if (Array.isArray(json.data?.items)) return json.data.items;
    if (Array.isArray(json.data?.rows)) return json.data.rows;
    return [];
}

async function postRevalidate(tag, secret) {
    return fetch(`${UI_BASE}/api/revalidate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag, secret }),
    });
}

async function fetchUiHtml(pathname) {
    const res = await fetch(`${UI_BASE}${pathname}`, { cache: "no-store" });
    return { res, html: await res.text() };
}

async function waitForRevalidate() {
    await new Promise((r) => setTimeout(r, REVALIDATE_WAIT_MS));
}

async function testWebhookContract() {
    const bad = await postRevalidate("faqs", "wrong-secret");
    record("webhook invalid secret → 401", bad.status === 401, `status=${bad.status}`);

    const missing = await postRevalidate("", API_SECRET);
    record("webhook missing tag → 400", missing.status === 400, `status=${missing.status}`);

    if (!API_SECRET) {
        record("webhook valid faqs tag → 200", false, "REVALIDATE_SECRET trống trong api/.env");
        return;
    }

    const ok = await postRevalidate("faqs", API_SECRET);
    const body = await ok.json().catch(() => ({}));
    record(
        "webhook valid faqs tag → 200",
        ok.ok && body.revalidated === true,
        `status=${ok.status}`,
    );
}

async function testAllIsrTags() {
    if (!API_SECRET) {
        record("all ISR tags webhook", false, "thiếu REVALIDATE_SECRET");
        return;
    }

    for (const tag of ISR_TAGS) {
        const res = await postRevalidate(tag, API_SECRET);
        const body = await res.json().catch(() => ({}));
        record(
            `webhook tag "${tag}" → 200`,
            res.ok && body.revalidated === true,
            `status=${res.status}`,
        );
    }
}

async function testSecretAlignment() {
    if (!API_SECRET || !UI_SECRET) {
        record(
            "secrets aligned api ↔ ui",
            false,
            "thiếu REVALIDATE_SECRET (api/.env hoặc ui/.env.local)",
        );
        return;
    }
    record("secrets aligned api ↔ ui", API_SECRET === UI_SECRET);
}

async function loginAdmin() {
    const { res, json } = await adminFetch("/auth/login", {
        method: "POST",
        body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    });
    if (!res.ok || !json?.data?.token) {
        throw new Error(`Admin login failed status=${res.status}`);
    }
    return json.data.token;
}

/**
 * Admin PUT → đợi revalidate → kiểm tra marker trong HTML UI → restore.
 */
async function testAdminMutationReflectsUi({
    label,
    mutate,
    restore,
    uiPath,
    marker,
}) {
    try {
        await mutate(marker);
    } catch (err) {
        record(label, false, `mutate failed: ${err.message}`);
        return;
    }

    await waitForRevalidate();

    try {
        const { res, html } = await fetchUiHtml(uiPath);
        if (!res.ok) {
            record(label, false, `UI ${uiPath} status=${res.status}`);
            await restore();
            return;
        }
        const reflected = html.includes(marker);
        record(label, reflected, reflected ? uiPath : `marker không thấy tại ${uiPath}`);
    } catch (err) {
        record(label, false, `UI fetch: ${err.message}`);
    } finally {
        await restore();
    }
}

async function testGlobalSettingRevalidate(token) {
    const settingKey = "SITE_EMAIL";
    const { res: detailRes, json: detailJson } = await adminFetch(
        `/admin/global-settings/${settingKey}`,
        { token },
    );
    const detail = detailJson?.data;
    if (!detailRes.ok || !detail?.key) {
        record("global SITE_EMAIL → homepage", false, "không load được setting");
        return;
    }

    const originalValue = String(detail.value ?? "");

    await testAdminMutationReflectsUi({
        label: "global SITE_EMAIL → homepage",
        uiPath: "/",
        marker: `e2e-footer-${Date.now()}`,
        mutate: async (marker) => {
            const patched = originalValue.includes("@")
                ? originalValue.replace("@", `+${marker}@`)
                : `${originalValue}-${marker}`;
            const { res } = await adminFetch(`/admin/global-settings/${settingKey}`, {
                method: "PUT",
                token,
                body: { value: patched },
            });
            if (!res.ok) throw new Error(`PUT ${res.status}`);
        },
        restore: async () => {
            await adminFetch(`/admin/global-settings/${settingKey}`, {
                method: "PUT",
                token,
                body: { value: originalValue },
            });
            if (API_SECRET) await postRevalidate("footer", API_SECRET);
        },
    });
}

async function testFaqRevalidate(token) {
    const marker = `e2e-faq-${Date.now()}`;
    let createdId = null;

    await testAdminMutationReflectsUi({
        label: "admin FAQ create → /faqs",
        uiPath: "/faqs",
        marker,
        mutate: async () => {
            const { res, json } = await adminFetch("/admin/faqs", {
                method: "POST",
                token,
                body: {
                    category: "general",
                    question: marker,
                    answer: "E2E revalidate test",
                    display_order: 9999,
                    is_active: true,
                },
            });
            if (!res.ok) throw new Error(`POST ${res.status}`);
            createdId = json?.data?.id;
        },
        restore: async () => {
            if (createdId) {
                await adminFetch(`/admin/faqs/${createdId}`, { method: "DELETE", token });
            }
            if (API_SECRET) await postRevalidate("faqs", API_SECRET);
        },
    });
}

async function testTeamRevalidate(token) {
    const { res, json } = await adminFetch("/admin/team-members?page=1&limit=5", { token });
    const member = listItems(json)[0];
    if (!res.ok || !member?.id) {
        record("admin team edit → /about-us", true, "không có team member — bỏ qua");
        return;
    }

    const { res: detailRes, json: detailJson } = await adminFetch(
        `/admin/team-members/${member.id}`,
        { token },
    );
    const detail = detailJson?.data;
    if (!detailRes.ok) {
        record("admin team edit → /about-us", false, `GET detail ${detailRes.status}`);
        return;
    }

    const originalDescription = String(detail.description ?? "");

    await testAdminMutationReflectsUi({
        label: "admin team edit → /about-us",
        uiPath: "/about-us",
        marker: `e2e-team-${Date.now()}`,
        mutate: async (marker) => {
            const { res: putRes } = await adminFetch(`/admin/team-members/${member.id}`, {
                method: "PUT",
                token,
                body: { description: `${originalDescription} ${marker}` },
            });
            if (!putRes.ok) throw new Error(`PUT ${putRes.status}`);
        },
        restore: async () => {
            await adminFetch(`/admin/team-members/${member.id}`, {
                method: "PUT",
                token,
                body: { description: originalDescription },
            });
            if (API_SECRET) await postRevalidate("about-us", API_SECRET);
        },
    });
}

async function testStepRevalidate(token) {
    const { res, json } = await adminFetch("/admin/step-guidelines?page=1&limit=5", { token });
    const step = listItems(json)[0];
    if (!res.ok || !step?.id) {
        record("admin step edit → homepage", true, "không có step — bỏ qua");
        return;
    }

    const { res: detailRes, json: detailJson } = await adminFetch(
        `/admin/step-guidelines/${step.id}`,
        { token },
    );
    const detail = detailJson?.data;
    if (!detailRes.ok || !detail?.translations?.length) {
        record("admin step edit → homepage", false, "không load được step translations");
        return;
    }

    const en =
        detail.translations.find((t) => t.language_code === "en") ?? detail.translations[0];
    const originalDescription = String(en.description ?? "");

    await testAdminMutationReflectsUi({
        label: "admin step edit → homepage",
        uiPath: "/",
        marker: `e2e-step-${Date.now()}`,
        mutate: async (marker) => {
            const { res: putRes } = await adminFetch(`/admin/step-guidelines/${step.id}`, {
                method: "PUT",
                token,
                body: {
                    translations: [
                        {
                            language_code: en.language_code,
                            title: en.title,
                            description: `${originalDescription} ${marker}`,
                        },
                    ],
                },
            });
            if (!putRes.ok) throw new Error(`PUT ${putRes.status}`);
        },
        restore: async () => {
            await adminFetch(`/admin/step-guidelines/${step.id}`, {
                method: "PUT",
                token,
                body: {
                    translations: [
                        {
                            language_code: en.language_code,
                            title: en.title,
                            description: originalDescription,
                        },
                    ],
                },
            });
            if (API_SECRET) await postRevalidate("home-data", API_SECRET);
        },
    });
}

async function testReviewRevalidate(token) {
    const marker = `e2e-review-${Date.now()}`;
    let createdId = null;

    await testAdminMutationReflectsUi({
        label: "admin review create → homepage",
        uiPath: "/",
        marker,
        mutate: async () => {
            const { res, json } = await adminFetch("/admin/reviews", {
                method: "POST",
                token,
                body: {
                    author_name: "E2E Tester",
                    country_code: "VN",
                    content: marker,
                    rating: 5,
                    is_featured: true,
                },
            });
            if (!res.ok) throw new Error(`POST ${res.status}`);
            createdId = json?.data?.id;
        },
        restore: async () => {
            if (createdId) {
                await adminFetch(`/admin/reviews/${createdId}`, { method: "DELETE", token });
            }
            if (API_SECRET) await postRevalidate("reviews", API_SECRET);
        },
    });
}

async function testAdminRevalidateChains() {
    if (!API_SECRET || API_SECRET !== UI_SECRET) {
        record("admin revalidate chains", false, "bỏ qua — secret chưa đồng bộ");
        return;
    }

    let token;
    try {
        token = await loginAdmin();
        record("admin login", true);
    } catch (err) {
        record("admin login", false, err.message);
        return;
    }

    await testGlobalSettingRevalidate(token);
    await testFaqRevalidate(token);
    await testTeamRevalidate(token);
    await testStepRevalidate(token);
    await testReviewRevalidate(token);
}

async function main() {
    console.log(`[e2e] API=${API_BASE} UI=${UI_BASE}`);

    try {
        const health = await fetch(`${API_BASE}/api/v1/health`);
        record("API reachable", health.ok, `status=${health.status}`);
    } catch (err) {
        record("API reachable", false, err.message);
    }

    try {
        const uiProbe = await fetch(UI_BASE, { method: "HEAD" }).catch(() => fetch(UI_BASE));
        record("UI reachable", uiProbe.ok, `status=${uiProbe.status}`);
    } catch (err) {
        record("UI reachable", false, err.message);
    }

    await testSecretAlignment();
    await testWebhookContract();
    await testAllIsrTags();
    await testAdminRevalidateChains();

    const failed = results.filter((r) => !r.pass);
    console.log(`\n[e2e] ${results.length - failed.length}/${results.length} passed`);
    if (failed.length > 0) {
        console.log("\n--- Failed ---");
        for (const f of failed) {
            console.log(`  ${f.name}: ${f.detail || "fail"}`);
        }
        process.exit(1);
    }
    console.log("[e2e] Revalidate E2E OK");
}

main().catch((err) => {
    console.error("[e2e] Fatal:", err);
    process.exit(1);
});
