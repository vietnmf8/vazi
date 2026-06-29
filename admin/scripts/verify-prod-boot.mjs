/**
 * Smoke boot Admin production — `next start` trên cổng probe.
 *
 * Usage: npm run verify:prod-boot
 */
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const PROBE_PORT = process.env.VERIFY_PORT ?? "3021";

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
    if (!fs.existsSync(path.join(ROOT, ".next"))) {
        console.error("[verify] Thiếu .next — chạy npm run build trước");
        process.exit(1);
    }

    const child = await startNext();
    await sleep(5000);

    const routes = ["/login", "/"];
    let allOk = true;
    for (const route of routes) {
        const res = await fetch(`http://127.0.0.1:${PROBE_PORT}${route}`);
        console.log(
            res.ok
                ? `[verify] ${route} → ${res.status}`
                : `[verify] FAIL ${route} → ${res.status}`,
        );
        if (!res.ok) allOk = false;
    }

    await stop(child);

    if (!allOk) process.exit(1);
    console.log(`[verify] Admin prod boot OK :${PROBE_PORT}`);
}

main().catch((err) => {
    console.error("[verify] Fatal:", err);
    process.exit(1);
});
