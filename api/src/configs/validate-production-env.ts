import type { EnvConfig } from "@/configs/env.config";

const REQUIRED_IN_PRODUCTION: Array<{
    key: keyof EnvConfig;
    label: string;
}> = [
    { key: "DATABASE_URL", label: "MySQL connection string" },
    { key: "JWT_SECRET", label: "JWT signing secret (≥32 random chars)" },
    { key: "REVALIDATE_SECRET", label: "ISR webhook secret (must match ui REVALIDATE_SECRET)" },
    { key: "FRONTEND_URL", label: "Public UI origin (CORS + PayPal redirect)" },
    { key: "ADMIN_URL", label: "Admin dashboard origin (CORS)" },
    { key: "UI_BASE_URL", label: "UI base URL for POST /api/revalidate" },
    { key: "ALLOWED_ADMIN_EMAIL", label: "Single admin login email" },
];

const RECOMMENDED_IN_PRODUCTION: Array<{
    key: keyof EnvConfig;
    label: string;
}> = [
    { key: "CLOUDINARY_CLOUD_NAME", label: "Image uploads (admin content)" },
    { key: "MAIL_FROM_ADDRESS", label: "Transactional email" },
    { key: "SOKETI_APP_KEY", label: "Live chat realtime" },
];

/**
 * Fail fast khi production thiếu biến bắt buộc — tránh deploy “chạy được” nhưng auth/CORS/revalidate hỏng im lặng.
 *
 * @throws {Error} Khi `NODE_ENV=production` và thiếu bất kỳ key required nào
 */
export function assertProductionEnv(env: EnvConfig): void {
    if (env.NODE_ENV !== "production") {
        return;
    }

    const missing = REQUIRED_IN_PRODUCTION.filter(({ key }) => {
        const value = env[key];
        return typeof value !== "string" || value.trim() === "";
    }).map(({ key, label }) => `${key} (${label})`);

    if (missing.length > 0) {
        throw new Error(
            `[env] Production missing required variables:\n  - ${missing.join("\n  - ")}`,
        );
    }

    const weakJwt =
        env.JWT_SECRET.length < 32 ? "JWT_SECRET should be at least 32 characters" : null;
    const revalidateMismatch =
        env.REVALIDATE_SECRET.length < 16
            ? "REVALIDATE_SECRET should be at least 16 random characters"
            : null;

    const warnings = [
        ...RECOMMENDED_IN_PRODUCTION.filter(({ key }) => {
            const value = env[key];
            return typeof value !== "string" || value.trim() === "";
        }).map(({ key, label }) => `${key} (${label})`),
        ...(weakJwt ? [weakJwt] : []),
        ...(revalidateMismatch ? [revalidateMismatch] : []),
    ];

    if (warnings.length > 0) {
        console.warn(
            `[env] Production warnings (optional but recommended):\n  - ${warnings.join("\n  - ")}`,
        );
    }
}
