/**
 * Admin UAT — kiểm tra toàn bộ endpoint admin mà dashboard gọi.
 *
 * Yêu cầu: API :5000 đang chạy; credentials trong api/.env
 * Tùy chọn: UI :3000 để probe trang public
 *
 * Usage: npm run verify:admin-uat
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const API_ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
dotenv.config({ path: path.join(API_ROOT, ".env") });

const API_BASE = (process.env.API_URL ?? process.env.VERIFY_API_URL ?? "http://127.0.0.1:5000").replace(
    /\/$/,
    "",
);
const UI_BASE = (process.env.UI_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const ADMIN_EMAIL = (process.env.ALLOWED_ADMIN_EMAIL ?? "vietnmf8@fullstack.edu.vn")
    .trim()
    .toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_SEED_PASSWORD ?? "Viet251001";

/** @type {{ area: string; name: string; pass: boolean; detail: string; uiPage?: string }[]} */
const results = [];

function record(area, name, pass, detail = "", uiPage = "") {
    results.push({ area, name, pass, detail, uiPage });
    const icon = pass ? "✓" : "✗";
    console.log(`${icon} [${area}] ${name}${detail ? ` — ${detail}` : ""}`);
}

async function apiFetch(pathname, { method = "GET", token, body } = {}) {
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
    return [];
}

function firstId(json) {
    const items = listItems(json);
    const first = items[0];
    return first?.id ?? first?.key ?? null;
}

async function loginAdmin() {
    const { res, json } = await apiFetch("/auth/login", {
        method: "POST",
        body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    });
    if (!res.ok || !json?.data?.token) {
        throw new Error(`login failed status=${res.status}`);
    }
    return json.data.token;
}

/**
 * Probe list + detail cho resource admin.
 * @param {object} cfg
 */
async function probeListDetail(token, cfg) {
    const { area, listPath, detailPath, uiPage, idFromList = true, staticDetailPath } = cfg;

    const list = await apiFetch(listPath, { token });
    const listOk = list.res.ok && list.json?.success !== false;
    record(area, `${cfg.label ?? area} — LIST`, listOk, listOk ? "" : `status=${list.res.status}`);

    if (!listOk) return null;

    let detailUrl = staticDetailPath;
    if (!detailUrl && idFromList) {
        const id = firstId(list.json);
        if (!id) {
            record(area, `${cfg.label ?? area} — DETAIL`, true, "list rỗng — bỏ qua");
            return null;
        }
        detailUrl = typeof detailPath === "function" ? detailPath(id) : `${detailPath}/${id}`;
    }

    if (!detailUrl) return null;

    const detail = await apiFetch(detailUrl, { token });
    const detailOk = detail.res.ok && detail.json?.success !== false;
    record(
        area,
        `${cfg.label ?? area} — DETAIL`,
        detailOk,
        detailOk ? "" : `status=${detail.res.status}`,
        uiPage ?? "",
    );
    return detailOk ? detail.json?.data : null;
}

async function testFaqCrud(token) {
    const marker = `uat-faq-${Date.now()}`;
    const create = await apiFetch("/admin/faqs", {
        method: "POST",
        token,
        body: {
            category: "general",
            question: marker,
            answer: "UAT temp FAQ",
            display_order: 9999,
            is_active: true,
        },
    });

    if (!create.res.ok) {
        record("FAQ", "CRUD create", false, `status=${create.res.status}`);
        return;
    }
    record("FAQ", "CRUD create", true);

    const id = create.json?.data?.id;
    const update = await apiFetch(`/admin/faqs/${id}`, {
        method: "PUT",
        token,
        body: { answer: `${marker}-updated` },
    });
    record("FAQ", "CRUD update", update.res.ok, update.res.ok ? "" : `status=${update.res.status}`);

    const pub = await apiFetch(`/faqs?category=general`);
    const pubItems = listItems(pub.json);
    const onPublic = pubItems.some((f) => f.question === marker || f.id === id);
    record("FAQ", "public API reflects", onPublic, onPublic ? "" : "không thấy FAQ mới");

    const del = await apiFetch(`/admin/faqs/${id}`, { method: "DELETE", token });
    record("FAQ", "CRUD delete", del.res.ok, del.res.ok ? "" : `status=${del.res.status}`);
}

async function testLegacyFaqEdit(token) {
    const list = await apiFetch("/admin/faqs?page=1&limit=50", { token });
    const legacy = listItems(list.json).find((f) => typeof f.id === "string" && f.id.startsWith("faq-"));
    if (!legacy) {
        record("FAQ", "legacy id edit (faq-*)", true, "không có seed legacy — bỏ qua");
        return;
    }

    const get = await apiFetch(`/admin/faqs/${legacy.id}`, { token });
    if (!get.res.ok) {
        record("FAQ", "legacy id edit (faq-*)", false, `GET ${get.res.status}`);
        return;
    }

    const original = String(get.json?.data?.answer ?? "");
    const marker = `uat-legacy-${Date.now()}`;
    const put = await apiFetch(`/admin/faqs/${legacy.id}`, {
        method: "PUT",
        token,
        body: { answer: `${original}\n${marker}` },
    });
    if (!put.res.ok) {
        record("FAQ", "legacy id edit (faq-*)", false, `PUT ${put.res.status}`);
        return;
    }

    await apiFetch(`/admin/faqs/${legacy.id}`, {
        method: "PUT",
        token,
        body: { answer: original },
    });
    record("FAQ", "legacy id edit (faq-*)", true);
}

async function testGlobalSettingPut(token) {
    const key = "SITE_EMAIL";
    const get = await apiFetch(`/admin/global-settings/${key}`, { token });
    if (!get.res.ok) {
        record("Settings", "global PUT round-trip", false, `GET ${get.res.status}`);
        return;
    }
    const original = String(get.json?.data?.value ?? "");
    const marker = `uat-${Date.now()}`;
    const patched = original.includes("@") ? original.replace("@", `+${marker}@`) : `${original}-${marker}`;

    const put = await apiFetch(`/admin/global-settings/${key}`, {
        method: "PUT",
        token,
        body: { value: patched },
    });
    if (!put.res.ok) {
        record("Settings", "global PUT round-trip", false, `PUT ${put.res.status}`);
        return;
    }

    await apiFetch(`/admin/global-settings/${key}`, {
        method: "PUT",
        token,
        body: { value: original },
    });
    record("Settings", "global PUT round-trip", true, "", "/");
}

async function testUnauthorized() {
    const { res } = await apiFetch("/admin/dashboard/stats");
    record("Auth", "no token → 401", res.status === 401, `status=${res.status}`);
}

async function testUploadPresigned() {
    const { res, json } = await apiFetch("/uploads/presigned-url", {
        method: "POST",
        body: { filename: "uat-test.png", file_type: "image/png" },
    });
    const data = json?.data;
    const ok =
        res.ok &&
        data?.upload_endpoint &&
        data?.upload_params?.signature &&
        data?.upload_params?.api_key;
    record("Upload", "presigned-url", ok, ok ? "" : `status=${res.status}`);
}

async function testChatAdmin(token) {
    const noAuth = await apiFetch("/chat/sessions");
    record("Chat", "sessions no token → 401", noAuth.res.status === 401, `status=${noAuth.res.status}`);

    const list = await apiFetch("/chat/sessions", { token });
    const ok = list.res.ok && Array.isArray(list.json?.data?.sessions);
    record("Chat", "sessions LIST (admin)", ok, ok ? "" : `status=${list.res.status}`);

    const guestJoin = await apiFetch("/chat/join", {
        method: "POST",
        body: { user_name: "UAT Guest", website_language: "en" },
    });
    const sessionId = guestJoin.json?.data?.session_id;
    const joinOk = guestJoin.res.ok && sessionId;
    record("Chat", "guest join", joinOk, joinOk ? "" : `status=${guestJoin.res.status}`);

    if (joinOk) {
        const adminJoin = await apiFetch("/chat/admin-join", {
            method: "POST",
            token,
            body: { session_id: sessionId },
        });
        record(
            "Chat",
            "admin join session",
            adminJoin.res.ok,
            adminJoin.res.ok ? "" : `status=${adminJoin.res.status}`,
        );

        const msgs = await apiFetch(`/chat/sessions/${sessionId}/messages`, { token });
        record(
            "Chat",
            "session messages",
            msgs.res.ok,
            msgs.res.ok ? "" : `status=${msgs.res.status}`,
        );
    }
}

async function probeSoketi() {
    const host = process.env.SOKETI_HOST ?? "127.0.0.1";
    const port = process.env.SOKETI_PORT ?? "6001";
    try {
        const res = await fetch(`http://${host}:${port}/`, { signal: AbortSignal.timeout(3000) });
        // Soketi có thể trả 200 hoặc 404 tùy version — chỉ cần TCP/HTTP phản hồi
        record("Chat", "Soketi reachable", res.status < 500, `status=${res.status} :${port}`);
    } catch (err) {
        record(
            "Chat",
            "Soketi reachable",
            false,
            `${err.message} — bật Soketi nếu cần test realtime`,
        );
    }
}

async function probeUiPages() {
    const pages = [
        { path: "/", label: "Homepage" },
        { path: "/faqs", label: "FAQs" },
        { path: "/guide", label: "Guide" },
        { path: "/how-to-apply", label: "How to apply" },
        { path: "/about-us", label: "About us" },
        { path: "/apply", label: "Apply" },
    ];

    for (const page of pages) {
        try {
            const res = await fetch(`${UI_BASE}${page.path}`, { redirect: "follow" });
            record("UI", `${page.label} reachable`, res.ok, `status=${res.status}`, page.path);
        } catch (err) {
            record("UI", `${page.label} reachable`, false, err.message, page.path);
        }
    }
}

const ADMIN_PROBES = [
    { area: "Dashboard", label: "Stats", listPath: "/admin/dashboard/stats", idFromList: false, staticDetailPath: null },
    { area: "Applications", listPath: "/admin/applications?page=1&limit=5", detailPath: "/admin/applications", uiPage: "/apply" },
    { area: "Support", listPath: "/admin/support-tickets?page=1&limit=5", detailPath: "/admin/support-tickets" },
    { area: "Global settings", listPath: "/admin/global-settings", detailPath: "/admin/global-settings", idFromList: false, staticDetailPath: "/admin/global-settings/SITE_EMAIL", uiPage: "/" },
    { area: "Page settings", listPath: "/admin/page-settings", detailPath: "/admin/page-settings", uiPage: "/" },
    { area: "Articles", listPath: "/admin/articles?page=1&limit=5&type=guide", detailPath: "/admin/articles", uiPage: "/guide" },
    { area: "Guidelines", listPath: "/admin/guidelines?page=1&limit=5", detailPath: "/admin/guidelines", uiPage: "/how-to-apply" },
    { area: "FAQ", listPath: "/admin/faqs?page=1&limit=5", detailPath: "/admin/faqs", uiPage: "/faqs" },
    { area: "Steps", listPath: "/admin/step-guidelines?page=1&limit=5", detailPath: "/admin/step-guidelines", uiPage: "/how-to-apply" },
    { area: "Team", listPath: "/admin/team-members?page=1&limit=5", detailPath: "/admin/team-members", uiPage: "/about-us" },
    { area: "Reviews", listPath: "/admin/reviews?page=1&limit=5", detailPath: "/admin/reviews", uiPage: "/" },
    { area: "Comments", listPath: "/admin/comments?page=1&limit=5", detailPath: null, idFromList: false },
    { area: "Nationalities", listPath: "/admin/nationalities?page=1&limit=5", detailPath: "/admin/nationalities", uiPage: "/apply" },
    { area: "Ports", listPath: "/admin/ports?page=1&limit=5", detailPath: "/admin/ports", uiPage: "/apply" },
    { area: "Pricing", listPath: "/admin/pricing-rules?page=1&limit=5", detailPath: "/admin/pricing-rules", uiPage: "/apply" },
    { area: "Exemptions", listPath: "/admin/exemption-countries?page=1&limit=5", detailPath: "/admin/exemption-countries" },
    { area: "Eligibility", listPath: "/admin/eligibility-rules?page=1&limit=5", detailPath: "/admin/eligibility-rules" },
    { area: "Newsletter", listPath: "/admin/newsletter?page=1&limit=5", detailPath: null, idFromList: false },
    { area: "Users", listPath: "/admin/users?page=1&limit=5", detailPath: null, idFromList: false },
];

async function main() {
    console.log(`[admin-uat] API=${API_BASE} UI=${UI_BASE}`);

    try {
        const health = await fetch(`${API_BASE}/api/v1/health`);
        record("Infra", "API health", health.ok, `status=${health.status}`);
    } catch (err) {
        record("Infra", "API health", false, err.message);
        console.error("\n[admin-uat] API không chạy — bật `cd api && npm run dev` rồi chạy lại.");
        process.exit(1);
    }

    await testUnauthorized();

    let token;
    try {
        token = await loginAdmin();
        record("Auth", "admin login", true);
    } catch (err) {
        record("Auth", "admin login", false, err.message);
        process.exit(1);
    }

    for (const probe of ADMIN_PROBES) {
        if (probe.area === "Dashboard") {
            const { res, json } = await apiFetch(probe.listPath, { token });
            const ok = res.ok && json?.data;
            record(probe.area, "Stats", ok, ok ? "" : `status=${res.status}`);
            continue;
        }

        if (probe.idFromList === false && !probe.staticDetailPath) {
            const { res, json } = await apiFetch(probe.listPath, { token });
            const ok = res.ok && (listItems(json).length >= 0 || Array.isArray(json?.data));
            const suffix = probe.area === "Comments" ? " (list-only API)" : "";
            record(probe.area, `LIST${suffix}`, ok, ok ? "" : `status=${res.status}`, probe.uiPage);
            continue;
        }

        await probeListDetail(token, probe);
    }

    await testFaqCrud(token);
    await testLegacyFaqEdit(token);
    await testGlobalSettingPut(token);
    await testUploadPresigned();
    await testChatAdmin(token);
    await probeSoketi();
    await probeUiPages();

    const failed = results.filter((r) => !r.pass);
    const passed = results.length - failed.length;

    console.log(`\n[admin-uat] ${passed}/${results.length} passed`);

    if (failed.length > 0) {
        console.log("\n--- Failed ---");
        for (const f of failed) {
            console.log(`  [${f.area}] ${f.name}: ${f.detail || "fail"}`);
        }
        process.exit(1);
    }

    console.log("[admin-uat] Admin API UAT OK");
}

main().catch((err) => {
    console.error("[admin-uat] Fatal:", err);
    process.exit(1);
});
