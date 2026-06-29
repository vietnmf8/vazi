/**
 * Health check — GET /api/v1/health, in HEALTH_OK khi status ok.
 *
 * Usage: npm run verify:health
 *        HEALTH_URL=https://api.domain.com/api/v1/health npm run verify:health
 */
const url = process.env.HEALTH_URL ?? "http://127.0.0.1:5000/api/v1/health";

try {
    const res = await fetch(url);
    const json = await res.json();
    if (res.ok && json?.data?.status === "ok") {
        console.log("HEALTH_OK");
        process.exit(0);
    }
    console.error(`HEALTH_FAIL status=${res.status}`);
    process.exit(1);
} catch (err) {
    console.error("HEALTH_FAIL", err instanceof Error ? err.message : err);
    process.exit(1);
}
