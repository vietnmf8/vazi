/**
 * Kiểm tra NEXT_PUBLIC_API_URL đã được bake vào client bundle sau `next build`.
 *
 * Usage: NEXT_PUBLIC_API_URL=http://localhost:5000 npm run verify:build-env
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const NEXT_DIR = path.join(ROOT, ".next");

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";
const needles = [
    apiUrl,
    apiUrl.replace(/^https?:\/\//, ""),
    `${apiUrl}/api/v1`,
];

function walk(dir, files = []) {
    if (!fs.existsSync(dir)) return files;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full, files);
        else if (/\.(js|json|html|rsc)$/i.test(entry.name)) files.push(full);
    }
    return files;
}

function main() {
    if (!fs.existsSync(NEXT_DIR)) {
        console.error("[verify:build-env] Thiếu .next — chạy npm run build trước");
        process.exit(1);
    }

    const files = walk(path.join(NEXT_DIR, "static")).concat(
        walk(path.join(NEXT_DIR, "server")),
    );

    let hit = false;
    for (const file of files) {
        const content = fs.readFileSync(file, "utf8");
        if (needles.some((n) => content.includes(n))) {
            hit = true;
            break;
        }
    }

    if (hit) {
        console.log(`[verify:build-env] OK — found API URL in bundle: ${apiUrl}`);
        return;
    }

    console.error(
        `[verify:build-env] FAIL — không thấy ${apiUrl} trong .next (kiểm tra .env.local trước build)`,
    );
    process.exit(1);
}

main();
