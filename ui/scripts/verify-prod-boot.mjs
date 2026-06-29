/**
 * Smoke boot UI production — `next start` trên cổng probe, không đụng dev :3000.
 *
 * Usage: npm run verify:prod-boot
 */
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const PROBE_PORT = process.env.VERIFY_PORT ?? "3020";
const API_HEALTH =
    process.env.API_HEALTH_URL ?? "http://127.0.0.1:5000/api/v1/health";

function startNext() {
    return new Promise((resolve, reject) => {
        const child = spawn("npx", ["next", "start", "-p", PROBE_PORT], {
            cwd: ROOT,
            shell: true,
            stdio: ["ignore", "pipe", "pipe"],
            env: { ...process.env, NODE_ENV: "production" },
        });
        child.on("error", reject);
        resolve(child);
    });
}

function stop(child) {
    return new Promise((resolve) => {
        if (!child || child.exitCode !== null) {
            resolve();
            return;
        }
        child.once("exit", () => resolve());
        if (process.platform === "win32" && child.pid) {
            spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
                shell: true,
                stdio: "ignore",
            }).on("exit", () => resolve());
            return;
        }
        child.kill("SIGTERM");
        setTimeout(() => {
            if (child.exitCode === null) child.kill("SIGKILL");
        }, 5000);
    });
}

async function main() {
    if (!path.join(ROOT, ".next")) {
        // existence checked below
    }
    const nextDir = path.join(ROOT, ".next");
    const fs = await import("node:fs");
    if (!fs.existsSync(nextDir)) {
        console.error("[verify] Thiếu .next — chạy npm run build trước");
        process.exit(1);
    }

    let apiOk = false;
    try {
        const res = await fetch(API_HEALTH);
        const json = await res.json();
        apiOk = res.ok && json?.data?.status === "ok";
    } catch {
        apiOk = false;
    }
    console.log(apiOk ? "[verify] API health OK" : "[verify] API health SKIP (dev API không chạy)");

    const child = await startNext();
    await sleep(6000);

    const routes = ["/", "/faqs", "/how-to-apply"];
    const results = [];
    for (const route of routes) {
        try {
            const res = await fetch(`http://127.0.0.1:${PROBE_PORT}${route}`);
            results.push({ route, ok: res.ok, status: res.status });
            console.log(
                res.ok
                    ? `[verify] ${route} → ${res.status}`
                    : `[verify] FAIL ${route} → ${res.status}`,
            );
        } catch (err) {
            results.push({ route, ok: false, status: 0 });
            console.error(`[verify] FAIL ${route}:`, err.message);
        }
    }

    await stop(child);

    const allOk = results.every((r) => r.ok);
    if (!allOk) process.exit(1);
    console.log(`[verify] UI prod boot OK :${PROBE_PORT}`);
}

main().catch((err) => {
    console.error("[verify] Fatal:", err);
    process.exit(1);
});
