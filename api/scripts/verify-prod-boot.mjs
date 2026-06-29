/**
 * Smoke boot production dist — chạy HTTP server tạm trên cổng probe, không đụng dev :5000.
 *
 * Usage: npm run verify:prod-boot
 */
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const PROBE_PORT = process.env.VERIFY_PORT ?? "5020";
const NODE_ARGS = [
    "-r",
    "tsconfig-paths/register",
    "-r",
    "module-alias/register",
];

function spawnProc(label, script) {
    return new Promise((resolve, reject) => {
        const child = spawn("node", [...NODE_ARGS, script], {
            cwd: ROOT,
            env: { ...process.env, PORT: PROBE_PORT, NODE_ENV: "development" },
            stdio: ["ignore", "pipe", "pipe"],
        });

        let stdout = "";
        child.stdout?.on("data", (chunk) => {
            stdout += chunk.toString();
        });
        child.stderr?.on("data", (chunk) => {
            stdout += chunk.toString();
        });

        child.on("error", reject);
        resolve({ label, child, getStdout: () => stdout });
    });
}

function killProc(proc) {
    return new Promise((resolve) => {
        if (proc.child.killed || proc.child.exitCode !== null) {
            resolve();
            return;
        }
        proc.child.once("exit", () => resolve());
        proc.child.kill("SIGTERM");
        setTimeout(() => {
            if (proc.child.exitCode === null) {
                proc.child.kill("SIGKILL");
            }
        }, 3000);
    });
}

async function main() {
    const required = ["dist/server.js", "dist/worker.js", "dist/schedule.js"];
    for (const file of required) {
        const full = path.join(ROOT, file);
        try {
            await import("node:fs/promises").then((fs) => fs.access(full));
        } catch {
            console.error(`[verify] Missing ${file} — chạy npm run build trước`);
            process.exit(1);
        }
    }

    const server = await spawnProc("api", "dist/server.js");
    await sleep(4000);

    let healthOk = false;
    try {
        const res = await fetch(`http://127.0.0.1:${PROBE_PORT}/api/v1/health`);
        const json = await res.json();
        healthOk = res.ok && json?.data?.status === "ok";
        console.log(
            healthOk
                ? `[verify] Health OK :${PROBE_PORT}/api/v1/health`
                : `[verify] Health FAIL status=${res.status}`,
        );
    } catch (err) {
        console.error("[verify] Health request failed:", err);
    }

    await killProc(server);

    const worker = await spawnProc("worker", "dist/worker.js");
    await sleep(2500);
    const workerOk = worker.getStdout().includes("[worker] Abandoned cart worker");
    console.log(workerOk ? "[verify] Worker boot OK" : "[verify] Worker boot FAIL");
    await killProc(worker);

    const schedule = await spawnProc("schedule", "dist/schedule.js");
    await sleep(2000);
    const scheduleOk = schedule.getStdout().includes("[schedule] Tiến trình Schedule");
    console.log(scheduleOk ? "[verify] Schedule boot OK" : "[verify] Schedule boot FAIL");
    await killProc(schedule);

    const pass = healthOk && workerOk && scheduleOk;
    if (!pass) process.exit(1);
    console.log("[verify] Production boot — all 3 processes OK");
}

main().catch((err) => {
    console.error("[verify] Fatal:", err);
    process.exit(1);
});
