/**
 * Go-live gate — chạy toàn bộ verify trước/sau deploy.
 *
 * Usage:
 *   npm run verify:go-live              # preflight + postflight
 *   npm run verify:go-live -- preflight # chỉ build/typecheck/smoke (CI)
 *   npm run verify:go-live -- postflight # chỉ runtime checks (cần stack đang chạy)
 *   npm run verify:go-live -- rollback  # in hướng dẫn rollback
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const API_ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const UI_ROOT = path.join(API_ROOT, "..", "ui");
const ADMIN_ROOT = path.join(API_ROOT, "..", "admin");

const mode = (process.argv[2] ?? "all").toLowerCase();
const results = [];

function runStep(name, cwd, command, optional = false) {
    console.log(`\n── ${name} ──`);
    const result = spawnSync(command, {
        cwd,
        shell: true,
        stdio: "inherit",
        env: process.env,
    });
    const pass = result.status === 0;
    results.push({ name, pass, optional });
    console.log(pass ? `✓ ${name}` : optional ? `⚠ ${name} (optional skip)` : `✗ ${name}`);
    return pass || optional;
}

function printSummary() {
    const required = results.filter((r) => !r.optional);
    const optional = results.filter((r) => r.optional);
    const reqFailed = required.filter((r) => !r.pass);
    const optFailed = optional.filter((r) => !r.pass);

    console.log("\n═══════════════════════════════════════");
    console.log("Go-Live Verify Summary");
    console.log("═══════════════════════════════════════");
    for (const r of results) {
        const icon = r.pass ? "✅" : r.optional ? "⚠️" : "❌";
        console.log(`${icon} ${r.name}${r.optional ? " (optional)" : ""}`);
    }
    console.log(
        `\nRequired: ${required.length - reqFailed.length}/${required.length} pass` +
            (optFailed.length ? ` | Optional failed: ${optFailed.length}` : ""),
    );
    return reqFailed.length === 0;
}

function printRollbackGuide() {
    console.log(`
═══════════════════════════════════════
Rollback Plan (FastVisa)
═══════════════════════════════════════

1. API (PM2)
   pm2 stop fastvisa-api fastvisa-worker fastvisa-schedule
   # Deploy previous dist/ artifact hoặc git checkout tag trước
   pm2 start ecosystem.config.cjs

2. UI / Admin (Next.js)
   # Redeploy build artifact trước (NEXT_PUBLIC_* đã bake — phải rebuild)
   pm2 stop fastvisa-ui fastvisa-admin
   pm2 start ecosystem.config.cjs

3. Database
   # KHÔNG rollback migration đã commit trên prod trừ khi có down SQL riêng
   # Restore từ backup MySQL nếu migration gây lỗi nghiêm trọng:
   #   mysql ... < backup-YYYYMMDD.sql

4. Verify sau rollback
   cd api && npm run verify:health
   cd api && HEALTH_URL=<prod> npm run verify:health
   curl <UI_URL>/ && curl <ADMIN_URL>/login

5. DNS / Proxy
   Trỏ lại upstream cũ hoặc revert load balancer target group

Lưu ý: giữ backup DB + .env snapshot trước mỗi go-live.
`);
}

function runPreflight() {
    let ok = true;
    ok = runStep("API build", API_ROOT, "npm run build") && ok;
    ok = runStep("API typecheck", API_ROOT, "npm run typecheck") && ok;
    ok =
        runStep(
            "API smoke tests",
            API_ROOT,
            "npx vitest run tests/smoke/api-health.test.ts",
        ) && ok;
    ok = runStep("DB migrate status", API_ROOT, "npm run db:migrate:status") && ok;
    ok = runStep("UI build", UI_ROOT, "npm run build") && ok;
    ok = runStep("UI verify:build-env", UI_ROOT, "npm run verify:build-env") && ok;
    ok = runStep("Admin build", ADMIN_ROOT, "npm run build") && ok;
    ok =
        runStep("Admin verify:build-env", ADMIN_ROOT, "npm run verify:build-env") &&
        ok;
    return ok;
}

function runPostflight() {
    // Postflight bắt buộc khi chạy riêng; optional khi `all` (CI có thể không có stack)
    const optional = mode === "all";
    runStep("API health", API_ROOT, "npm run verify:health", optional);
    runStep("API prod boot (3 proc)", API_ROOT, "npm run verify:prod-boot", optional);
    runStep("Revalidate E2E", API_ROOT, "npm run verify:revalidate-e2e", optional);
    runStep("UI prod boot", UI_ROOT, "npm run verify:prod-boot", optional);
    runStep("Admin prod boot", ADMIN_ROOT, "npm run verify:prod-boot", optional);
}

function main() {
    if (mode === "rollback") {
        printRollbackGuide();
        return;
    }

    console.log(`[go-live] mode=${mode}`);

    if (mode === "preflight" || mode === "all") {
        runPreflight();
    }
    if (mode === "postflight" || mode === "all") {
        runPostflight();
    }

    const pass = printSummary();
    if (mode === "all" || mode === "postflight") {
        printRollbackGuide();
    }

    if (!pass) process.exit(1);
    console.log("\n[go-live] Production Ready ✅ — sẵn sàng go-live");
}

main();
